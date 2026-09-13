"""Local PDF conversion, shared by Pyodide and the regression tests."""
import base64
import binascii
import json
import re
from collections import defaultdict
from io import BytesIO
from PIL import Image
import pymupdf
import pymupdf4llm

pymupdf4llm.use_layout(False)

# A scan that was numbered or watermarked afterwards keeps a sliver of real
# text. Below this many characters, on a page that images almost entirely
# cover, the page is still a picture and worth reading with OCR.
SCAN_TEXT_LIMIT = 120
SCAN_IMAGE_RATIO = .5

# How many pages are converted in one go. See `page_batches`: the work the
# converter repeats per call is what makes a long document expensive, and
# amortizing it over a batch is what keeps the cost per page flat.
BATCH_PAGES = 10

# A grid bled off the paper and drawn under the words: page decoration, never
# a table. Fewer parallel rules than this is the filet of a letterhead, and a
# smaller share of crossed text is a table whose contents overflow a cell.
BACKGROUND_GRID_RULES = 4
BACKGROUND_GRID_PITCH = 2
BACKGROUND_GRID_TEXT = .5

# What the converter writes when it embeds a picture, and the extensions the
# application uses for the files it keeps beside a document.
EMBEDDED_IMAGE = re.compile(r'!\[([^\]]*)\]\(\s*data:image/([A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+?)\s*\)')
IMAGE_EXTENSIONS = {'jpeg': 'jpg', 'svg+xml': 'svg'}

# What the converter marks as struck out or underlined.
RULE_EMPHASIS = re.compile(r'~~|</?u>')

# A Markdown table as the converter writes it: the header row, the separator
# below it, and the rows that follow. And the name it invents for a header
# cell it found empty, which is `Col` plus the position of the column.
TABLE_SEPARATOR = re.compile(r'\|(?:\s*:?-+:?\s*\|)+')
INVENTED_NAME = 'Col{}'


def selected_pages(value, count):
    if not value.strip():
        return list(range(count))
    result = set()
    for part in value.split(','):
        match = re.fullmatch(r'\s*(\d+)\s*(?:-\s*(\d+)\s*)?', part)
        if not match:
            raise ValueError('pdf_pages_invalid')
        start, end = int(match[1]), int(match[2] or match[1])
        if start < 1 or end < start or end > count:
            raise ValueError('pdf_pages_invalid')
        result.update(range(start - 1, end))
    return sorted(result)


def remove_running_text(doc, keep, progress=None):
    """Only repeated text near page edges (and isolated page numbers).

    Match on the entire source document, before selecting pages: what repeats
    cannot be told from the three pages somebody asked for. Rewriting is
    another matter, and only `keep` is ever converted — applying redactions to
    the whole document was more than half the cost of importing one page out
    of four hundred. Redact text only: drawings and images must survive. No
    fixed strip is cropped.
    """
    candidates = []
    occurrences = defaultdict(set)
    total = len(doc)
    for number, page in enumerate(doc, 1):
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(s['text'] for s in line['spans']).strip()
                rect = pymupdf.Rect(line['bbox'])
                edge = 'top' if rect.y1 < page.rect.height * .09 else 'bottom' if rect.y0 > page.rect.height * .91 else None
                if not edge or not text:
                    continue
                normalized = re.sub(r'\d+', '#', re.sub(r'\s+', ' ', text)).casefold()
                key = (edge, normalized)
                occurrences[key].add(page.number)
                candidates.append((page.number, rect, text, key))
        if progress is not None:
            progress('headers', number, total)
    # Half the document in a short one, eight pages in a long one: a header
    # that changes with each chapter never reaches half of a four-hundred-page
    # book, and dragging it into every page is worse than the risk of taking
    # out a line that repeats, normalized, along the edge of eight pages.
    threshold = max(2, min((len(doc) + 1) // 2, 8))
    for number, rect, text, key in candidates:
        if number not in keep:
            continue
        if len(occurrences[key]) >= threshold or re.fullmatch(r'\d+|[ivxlcdm]+', text, re.I):
            doc[number].add_redact_annot(rect, fill=False)
    kept = sorted(keep)
    for done, number in enumerate(kept, 1):
        doc[number].apply_redactions(images=0, graphics=0)
        # Applying many redactions can also take a while. This message proves
        # that the worker is alive without restarting the visible page count.
        if progress is not None:
            progress('heartbeat', done, len(kept))


def regular_pitch(offsets):
    """Several parallel rules, all the same distance apart."""
    if len(offsets) < BACKGROUND_GRID_RULES:
        return False
    gaps = [second - first for first, second in zip(offsets, offsets[1:])]
    return max(gaps) - min(gaps) <= BACKGROUND_GRID_PITCH


def crosses(span, rule):
    """A rule running through the middle of a word, not beside it."""
    if rule.width <= 2:
        return span.x0 + 1 < rule.x0 < span.x1 - 1 and rule.y0 < span.y1 and rule.y1 > span.y0
    return span.y0 + 1 < rule.y0 < span.y1 - 1 and rule.x0 < span.x1 and rule.x1 > span.x0


def background_grid(page):
    """Rules bled off the paper that the text runs over: decoration.

    A table lives inside the margins and its text sits between the rules.
    Decoration is the opposite: evenly spaced rules reaching the edge of the
    sheet and passing under the words. PyMuPDF reads such a grid as one table
    covering the page, so every line arrives chopped into cells, and MuPDF
    flags the text those rules cross as struck out. Both conditions are
    required together: a full-bleed table exists, and so does a cell whose
    text overflows a rule, but not the two at once.
    """
    width, height = page.rect.width, page.rect.height
    rules, verticals, horizontals = [], set(), set()
    for path in page.get_drawings():
        rect = path['rect']
        if rect.width <= 2 and rect.y0 <= 1 and rect.y1 >= height - 1:
            rules.append(rect)
            verticals.add(round(rect.x0, 1))
        elif rect.height <= 2 and rect.x0 <= 1 and rect.x1 >= width - 1:
            rules.append(rect)
            horizontals.add(round(rect.y0, 1))
    if not regular_pitch(sorted(verticals)) and not regular_pitch(sorted(horizontals)):
        return False
    spans = [pymupdf.Rect(span['bbox'])
             for block in page.get_text('dict')['blocks']
             for line in block.get('lines', []) for span in line['spans']]
    if not spans:
        return False
    crossed = sum(1 for span in spans if any(crosses(span, rule) for rule in rules))
    return crossed >= len(spans) * BACKGROUND_GRID_TEXT


def drop_rule_emphasis(markdown):
    """Strikeout and underline the decoration painted, not the author.

    On a page whose grid crosses every line, each of these marks comes from a
    rule. Nothing else can tell them apart: the flag MuPDF sets is the same
    one a real strikeout sets.
    """
    return RULE_EMPHASIS.sub('', markdown)


def table_cells(line):
    """The cells of a Markdown table row, or None if the line is not one."""
    if len(line) < 2 or not line.startswith('|') or not line.endswith('|'):
        return None
    return line[1:-1].split('|')


def repair_table_headers(markdown):
    """A first row that looks like the rows below it is not a header.

    Markdown has no table without a header, so the converter promotes the
    first row of every table it finds and, for each cell of that row it finds
    empty, writes a name of its own: `Col2`. On a form — a column of labels
    beside a column of blanks to fill in — that costs the first label its row
    and puts in the document a word that was never there.

    Two repairs, both of them general. An invented name becomes the empty cell
    it stands for, because Markdown allows a header cell to be empty and the
    document never said `Col2`. And when that row's pattern of filled and
    empty cells is the same as every row below, it is not a header at all but
    one more row, so the table is written with an empty header and its first
    row restored.

    Only a table carrying an invented name is considered: a header whose cells
    all hold text is a header, whatever the rows below it look like. That
    leaves alone the ordinary case of a form with real column titles, and the
    cross table whose corner cell is empty on purpose — there the row above
    and the rows below differ, which is what tells them apart.
    """
    lines = markdown.split('\n')
    out, index = [], 0
    while index < len(lines):
        header = table_cells(lines[index])
        if header is None or index + 1 >= len(lines) or not TABLE_SEPARATOR.fullmatch(lines[index + 1]):
            out.append(lines[index])
            index += 1
            continue
        end = index + 2
        while end < len(lines) and table_cells(lines[end]) is not None:
            end += 1
        rows = [table_cells(line) for line in lines[index + 2:end]]
        invented = [n for n, cell in enumerate(header) if cell.strip() == INVENTED_NAME.format(n + 1)]
        if invented:
            header = ['' if n in invented else cell for n, cell in enumerate(header)]
            shape = [bool(cell.strip()) for cell in header]
            if rows and all([bool(cell.strip()) for cell in row] == shape for row in rows):
                rows.insert(0, header)
                header = [''] * len(header)
        out.append('|' + '|'.join(header) + '|')
        out.append(lines[index + 1])
        out.extend('|' + '|'.join(row) + '|' for row in rows)
        index = end
    return '\n'.join(out)


def table_bands(page):
    """Stacked wide rules sharing their extremes: the rows of one table."""
    rules = defaultdict(set)
    for path in page.get_drawings():
        rect = path['rect']
        if rect.height <= 2 and rect.width > 5:
            rules[round(rect.y0)].update((round(rect.x0), round(rect.x1)))
    bands = []
    for y in sorted(rules):
        cuts = tuple(sorted(rules[y]))
        span = (cuts[0], cuts[-1])
        if bands and bands[-1]['span'] == span and y - bands[-1]['ys'][-1] < 300:
            bands[-1]['ys'].append(y)
            bands[-1]['cuts'] |= set(cuts)
        else:
            bands.append({'span': span, 'ys': [y], 'cuts': set(cuts)})
    return [band for band in bands if len(band['ys']) >= 2 and band['span'][1] - band['span'][0] > 60]


def column_gaps(page, band):
    """Where every row leaves a vertical corridor, a column ends.

    Used for tables whose rules run edge to edge (LaTeX booktabs and friends):
    nothing in the drawing says where the columns are, but the text does.
    """
    x0, x1 = band['span']
    top, bottom = band['ys'][0], band['ys'][-1]
    words = [w for w in page.get_text('words')
             if w[1] >= top - 1 and w[3] <= bottom + 1 and w[0] >= x0 - 2 and w[2] <= x1 + 2]
    if len(words) < 4:
        return []
    gaps, edge = [], x0
    for left, right in sorted((w[0], w[2]) for w in words):
        if left - edge >= 8 and edge > x0 + 2 and left < x1 - 2:
            gaps.append(round((edge + left) / 2))
        edge = max(edge, right)
    return gaps


def band_lines(page, band):
    """Text lines lying within the horizontal span of a band."""
    x0, x1 = band['span']
    rects = [pymupdf.Rect(line['bbox'])
             for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])]
    return [rect for rect in rects if rect.x0 >= x0 - 2 and rect.x1 <= x1 + 2]


def text_rows(page, band):
    """Baselines of the text rows inside a band, merged per line."""
    top, bottom = band['ys'][0], band['ys'][-1]
    rows = []
    for rect in sorted(band_lines(page, band), key=lambda rect: rect.y0):
        if rect.y0 >= top - 1 and rect.y1 <= bottom + 1:
            middle = (rect.y0 + rect.y1) / 2
            if not rows or middle - rows[-1] > 6:
                rows.append(middle)
    return rows


def restore_table_grid(page):
    """Redraw the grid that printing engines leave out.

    PyMuPDF needs lines on both axes to recognise a table, and printed tables
    rarely carry them: browsers paint one filled rectangle per cell border and
    most themes only rule the rows, so not a single vertical line survives.
    Without them the rows arrive as loose text while the rules pile up into a
    picture. The columns are still recoverable — each row rule comes cut into
    one segment per cell, and where the rules run edge to edge the text itself
    leaves a corridor between columns. The lines drawn here are invisible, and
    go on the in-memory copy only.
    """
    vertical = [pymupdf.Rect(path['rect']) for path in page.get_drawings()
                if path['rect'].width <= 2 and path['rect'].height > 5]
    restored = 0
    for band in table_bands(page):
        x0, x1 = band['span']
        top, bottom = band['ys'][0], band['ys'][-1]
        edges, rows = sorted(band['cuts']), []
        if len(edges) < 3:
            # Rules without cuts: only worth guessing when nothing else divides
            # the band, or an inferred column would fight the real ones.
            if any(rect.y0 < bottom and rect.y1 > top and x0 <= rect.x0 <= x1 for rect in vertical):
                continue
            gaps = column_gaps(page, band)
            if not gaps:
                continue
            edges = [x0] + gaps + [x1]
            rows = text_rows(page, band)
        # The first row sits above its own rule: reach up to its text, no further.
        spacing = band['ys'][1] - band['ys'][0]
        header = [rect.y0 for rect in band_lines(page, band) if 0 < top - rect.y1 < spacing]
        start = min(header) - 2 if header else top
        for x in edges:
            page.draw_line((x, start), (x, bottom), width=.1, stroke_opacity=0)
        if start < top:
            page.draw_line((x0, start), (x1, start), width=.1, stroke_opacity=0)
        for first, second in zip(rows, rows[1:]):
            # Only where the two rows are not already told apart by a rule.
            if not any(first < y < second for y in band['ys']):
                page.draw_line((x0, (first + second) / 2), (x1, (first + second) / 2), width=.1, stroke_opacity=0)
        restored += 1
    return restored


def preserve_math(page):
    """Rasterize detected mathematical text regions, retaining surrounding prose.

    This is intentionally conservative, not equation recognition. Some fonts
    and inline expressions remain undetectable; the UI explains that limitation.
    Table areas are left untouched: a single symbol inside a cell must never
    turn the whole table into a picture.
    """
    tables = [pymupdf.Rect(table.bbox) for table in page.find_tables().tables]
    blocks = [b for b in page.get_text('dict')['blocks'] if b.get('lines')]
    regions = []
    for block in blocks:
        spans = [s for line in block['lines'] for s in line['spans']]
        text = ''.join(s['text'] for s in spans)
        if any(re.search(r'symbol|math|cmsy|cmex', s['font'], re.I) for s in spans) and re.search(r'[=+−∑∫√⎡⎤]', text):
            rect = pymupdf.Rect(block['bbox'])
            # Include detached superscripts / neighbouring pieces of the same equation.
            for other in blocks:
                other_rect = pymupdf.Rect(other['bbox'])
                if other_rect.intersects(rect + (-4, -4, 4, 4)):
                    rect |= other_rect
            regions.append(rect & page.rect)
    merged = []
    for rect in regions:
        if any(rect.intersects(table) for table in tables):
            continue
        for existing in merged:
            if existing.intersects(rect):
                existing |= rect
                break
        else:
            merged.append(rect)
    images = [(r, page.get_pixmap(clip=r, dpi=150, alpha=False).tobytes('png')) for r in merged]
    for rect, _ in images:
        page.add_redact_annot(rect, fill=(1, 1, 1))
    if images:
        page.apply_redactions(images=0, graphics=2)
    for rect, png in images:
        page.insert_image(rect, stream=png)
    return len(images)


def page_batches(scanned, formats, decorated, size=BATCH_PAGES):
    """Group consecutive pages that can be converted in a single call.

    Converting page by page costs proportionally to the whole document on
    every call, because the converter repeats its document-wide work each
    time: 30 ms a page in a short file became 560 ms in a 600-page one, and
    that quadratic growth, not memory, is what made long imports hopeless.
    A batch pays that once.

    The cuts are what the batch cannot share: pictures are embedded in one
    format per call, a scanned page needs its own text, since it may be
    replaced by what OCR reads there, and a page whose decoration imitates a
    grid is converted without looking for tables at all.
    """
    batch = []
    for number, (is_scan, image_format, grid) in enumerate(zip(scanned, formats, decorated)):
        breaks = is_scan or (batch and (
            scanned[batch[0]] or formats[batch[0]] != image_format or decorated[batch[0]] != grid))
        if batch and (breaks or len(batch) >= size):
            yield batch
            batch = []
        batch.append(number)
    if batch:
        yield batch


def page_image_format(page):
    """The format a page's pictures should be embedded in.

    PyMuPDF4LLM rasterizes each picture, and PNG is the right answer for the
    diagrams, screenshots and formulas that make up most of a document. It is
    the wrong one for a photograph: re-encoding a JPEG as PNG multiplied one
    real report's images by thirty and the conversion ran out of memory. What
    the file itself chose to store is the cheapest signal available, and it is
    the same judgement, made by whoever produced the document.
    """
    doc = page.parent
    for image in page.get_images(full=True):
        # The filter, not the pixels: reading the key never decodes the image.
        marker = str(doc.xref_get_key(image[0], 'Filter'))
        if 'DCT' in marker or 'JPX' in marker:
            return 'jpg'
    return 'png'


def detach_images(markdown, folder, first, emit):
    """Write each embedded picture out and leave only its path in the text.

    Base64 inside the text is what made a large import unaffordable: the
    string crosses into the page, is parsed again, rendered, and every copy
    carries the pictures a third heavier than the files themselves. A 442-page
    report reached a hundred megabytes of Markdown that way and ran the
    browser out of memory. Detaching page by page keeps the peak at one page
    and hands the bytes over untouched.

    Returns the rewritten text and the number the next picture should take.
    """
    number = first

    def replace(match):
        nonlocal number
        alt, kind, data = match.group(1), match.group(2).lower(), match.group(3)
        try:
            raw = base64.b64decode(data)
        except (ValueError, binascii.Error):
            # An unreadable picture stays where it is rather than disappearing.
            return match.group(0)
        path = f'{folder}/images/{number:02}.{IMAGE_EXTENSIONS.get(kind, kind)}'
        emit(path, raw)
        number += 1
        return f'![{alt}]({path})'

    return EMBEDDED_IMAGE.sub(replace, markdown), number


def image_coverage(page):
    """How much of the page its images cover, overlaps counted only once."""
    area = abs(page.rect)
    if not area:
        return 0.
    parts = []
    for block in page.get_text('dict')['blocks']:
        if block.get('type') == 1:
            rect = pymupdf.Rect(block['bbox']) & page.rect
            if not rect.is_empty:
                parts.append(rect)
    if not parts:
        return 0.
    # One image covering the sheet is the usual case; several are added up and
    # capped by their bounding box, so overlapping tiles are not counted twice.
    bounds = parts[0]
    for rect in parts[1:]:
        bounds |= rect
    return min(sum(abs(rect) for rect in parts), abs(bounds)) / area


def batch_markdown(source, batch, keep_images, image_format, tables=True):
    """Convert some pages of a document without the rest weighing on them.

    A page ruled by its own decoration is converted without looking at the
    drawings at all. Not only for the tables they invent: the converter also
    sets aside the text it finds inside a cluster of vector graphics, and on a
    designed page that is every coloured box, which is where the body text of
    this kind of document lives — two fifths of one such guide never reached
    the result.
    """
    chunk = pymupdf.open()
    try:
        chunk.insert_pdf(source, from_page=batch[0], to_page=batch[-1])
        markdown = pymupdf4llm.to_markdown(
            chunk, embed_images=keep_images, image_size_limit=0,
            ignore_images=not keep_images, show_progress=False,
            image_format=image_format, table_strategy='lines_strict' if tables else None,
            ignore_graphics=not tables,
        )
        return repair_table_headers(markdown) if tables else drop_rule_emphasis(markdown)
    finally:
        chunk.close()


def convert_pdf(data, options, progress=None, emit_image=None):
    """Convert a PDF to Markdown, reporting how far along it is.

    The work runs page by page and says so: converting a long document takes
    minutes in the browser runtime, and a dialog that only says "converting"
    for all that time is indistinguishable from one that has crashed.
    """
    def report(stage, done, total):
        if progress is not None:
            progress(stage, done, total)

    with pymupdf.open(stream=data, filetype='pdf') as source:
        if source.needs_pass:
            raise ValueError('pdf_password')
        pages = selected_pages(options.get('pages', ''), len(source))
        total = len(pages)
        report('analysing', 0, total)
        # Work on an in-memory copy, never on the user's PDF.
        if options.get('removeHeaders', True):
            remove_running_text(source, set(pages), report)
        source.select(pages)
        texts = [p.get_text() for p in source]
        text_pages = sum(1 for text in texts if text.strip())
        letters = [sum(1 for c in text if c.isalnum()) for text in texts]
        use_ocr = options.get('ocr', False)
        # Measured before the math regions are rasterized, so that a formula
        # turned into a picture never makes a page look like a scan.
        scanned = [
            use_ocr and (not count or (
                count < SCAN_TEXT_LIMIT and image_coverage(source[number]) >= SCAN_IMAGE_RATIO
            ))
            for number, count in enumerate(letters)
        ]
        math_regions = 0
        keep_images = options.get('keepImages', True)
        decorated = []
        for number, page in enumerate(source, 1):
            # Before any table lookup, math detection included.
            grid = background_grid(page)
            decorated.append(grid)
            if not grid:
                restore_table_grid(page)
            if keep_images:
                math_regions += preserve_math(page)
            report('analysing', number, total)
        formats = [page_image_format(page) if keep_images else 'png' for page in source]
        # In batches, so that the count keeps moving and every call converts
        # a document of its own.
        chunks = []
        ocr_pages = []
        folder = str(options.get('assetFolder') or '').strip('/')
        detach = bool(folder) and emit_image is not None
        image_number = 1
        done = 0
        for batch in page_batches(scanned, formats, decorated):
            page_markdown = batch_markdown(
                source, batch, keep_images, formats[batch[0]], not decorated[batch[0]])
            done += len(batch)
            number = batch[0]
            if scanned[number]:
                original_page = pages[number]
                chunks.append(f'\n\n<!-- edimark-ocr-page:{original_page + 1} -->\n\n')
                # A page covered by an image is not always a scan: it can be a
                # full-page illustration, or a cover with a heading of its own.
                # Keep its ordinary conversion, and how much text it already
                # had, so the caller can drop the reading that says less.
                ocr_pages.append({
                    'index': original_page,
                    'page': original_page + 1,
                    'fallback': page_markdown,
                    'letters': letters[number],
                })
            else:
                # The picture of a scanned page stays embedded: it is only
                # kept if OCR reads nothing there, and a file written for a
                # page that ends up discarded would be an orphan.
                if detach:
                    page_markdown, image_number = detach_images(
                        page_markdown, folder, image_number, emit_image)
                chunks.append(page_markdown)
            report('converting', done, total)
        return {
            'markdown': ''.join(chunks),
            'pages': total,
            'textPages': text_pages,
            'mathRegions': math_regions,
            'ocrPages': ocr_pages,
            'images': image_number - 1,
        }


def render_ocr_page(data, page_index, dpi=200):
    """Render one original page for OCR without retaining the whole document."""
    with pymupdf.open(stream=bytes(data), filetype='pdf') as source:
        if source.needs_pass:
            raise ValueError('pdf_password')
        if page_index < 0 or page_index >= len(source):
            raise ValueError('pdf_pages_invalid')
        pixmap = source[page_index].get_pixmap(
            dpi=dpi,
            colorspace=pymupdf.csGRAY,
            alpha=False,
        )
        # Scanners often encode a pale diagonal watermark in the same image as
        # the text. A conservative black-and-white threshold removes that
        # background noise and leaves the dark glyphs, which markedly improves
        # segmentation without sending the page to an external service.
        image = Image.frombytes('L', (pixmap.width, pixmap.height), pixmap.samples)
        image = image.point(lambda value: 255 if value > 185 else 0, mode='1')
        output = BytesIO()
        image.save(output, format='PNG', optimize=True)
        return output.getvalue()


def inspect_pdf(data):
    """Read only the metadata needed before offering the conversion."""
    with pymupdf.open(stream=data, filetype='pdf') as source:
        if source.needs_pass:
            raise ValueError('pdf_password')
        return {'pages': len(source)}


def count_scanned(data):
    """How many pages would go to OCR, by the same rule the conversion uses.

    Reading the text of every page is far more expensive than opening the
    file — 2.5 s against 27 ms on a 442-page report — so this is asked for
    separately, once the dialog is already up, and never delays it.
    """
    with pymupdf.open(stream=data, filetype='pdf') as source:
        if source.needs_pass:
            raise ValueError('pdf_password')
        scanned = []
        for number, page in enumerate(source, start=1):
            letters = sum(1 for c in page.get_text() if c.isalnum())
            if not letters or (
                letters < SCAN_TEXT_LIMIT and image_coverage(page) >= SCAN_IMAGE_RATIO
            ):
                scanned.append(number)
        # Which pages they are, so the warning can name them: the reader can
        # look at those and decide whether the OCR is worth it.
        return {'scanned': len(scanned), 'scannedPages': scanned, 'pages': len(source)}


def inspect_json(data):
    return json.dumps(inspect_pdf(bytes(data)))


def scanned_json(data):
    return json.dumps(count_scanned(bytes(data)))


def convert_json(data, options_json, progress=None, emit_image=None):
    return json.dumps(convert_pdf(bytes(data), json.loads(options_json), progress, emit_image))
