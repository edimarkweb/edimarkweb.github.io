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

# What the converter writes when it embeds a picture, and the extensions the
# application uses for the files it keeps beside a document.
EMBEDDED_IMAGE = re.compile(r'!\[([^\]]*)\]\(\s*data:image/([A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+?)\s*\)')
IMAGE_EXTENSIONS = {'jpeg': 'jpg', 'svg+xml': 'svg'}


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


def remove_running_text(doc, progress=None):
    """Only repeated text near page edges (and isolated page numbers).

    Match on the entire source document, before selecting pages. Redact text
    only: drawings and images must survive. No fixed strip is cropped.
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
    threshold = max(2, (len(doc) + 1) // 2)
    for number, rect, text, key in candidates:
        if len(occurrences[key]) >= threshold or re.fullmatch(r'\d+|[ivxlcdm]+', text, re.I):
            doc[number].add_redact_annot(rect, fill=False)
    for number, page in enumerate(doc, 1):
        page.apply_redactions(images=0, graphics=0)
        # Applying many redactions can also take a while. This message proves
        # that the worker is alive without restarting the visible page count.
        if progress is not None:
            progress('heartbeat', number, total)


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
        if len(pages) > 200:
            raise ValueError('pdf_page_limit')
        total = len(pages)
        report('analysing', 0, total)
        # Work on an in-memory copy, never on the user's PDF.
        if options.get('removeHeaders', True):
            remove_running_text(source, report)
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
        for number, page in enumerate(source, 1):
            # Before any table lookup, math detection included.
            restore_table_grid(page)
            if keep_images:
                math_regions += preserve_math(page)
            report('analysing', number, total)
        # One page at a time: identical output, and a count to show meanwhile.
        chunks = []
        ocr_pages = []
        folder = str(options.get('assetFolder') or '').strip('/')
        detach = bool(folder) and emit_image is not None
        image_number = 1
        for number in range(total):
            page_markdown = pymupdf4llm.to_markdown(
                source, pages=[number], embed_images=keep_images, image_size_limit=0,
                ignore_images=not keep_images, show_progress=False,
                image_format=page_image_format(source[number]) if keep_images else 'png',
            )
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
            report('converting', number + 1, total)
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


def inspect_json(data):
    return json.dumps(inspect_pdf(bytes(data)))


def convert_json(data, options_json, progress=None, emit_image=None):
    return json.dumps(convert_pdf(bytes(data), json.loads(options_json), progress, emit_image))
