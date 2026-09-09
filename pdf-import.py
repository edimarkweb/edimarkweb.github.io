"""Local PDF conversion, shared by Pyodide and the regression tests."""
import json
import re
from collections import defaultdict
from io import BytesIO
from PIL import Image
import pymupdf
import pymupdf4llm

pymupdf4llm.use_layout(False)


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


def convert_pdf(data, options, progress=None):
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
        page_has_text = [bool(p.get_text().strip()) for p in source]
        text_pages = sum(page_has_text)
        use_ocr = options.get('ocr', True)
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
        for number in range(total):
            if use_ocr and not page_has_text[number]:
                original_page = pages[number]
                chunks.append(f'\n\n<!-- edimark-ocr-page:{original_page + 1} -->\n\n')
                ocr_pages.append({'index': original_page, 'page': original_page + 1})
            else:
                chunks.append(pymupdf4llm.to_markdown(
                    source, pages=[number], embed_images=keep_images, image_size_limit=0,
                    ignore_images=not keep_images, show_progress=False,
                ))
            report('converting', number + 1, total)
        return {
            'markdown': ''.join(chunks),
            'pages': total,
            'textPages': text_pages,
            'mathRegions': math_regions,
            'ocrPages': ocr_pages,
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


def convert_json(data, options_json, progress=None):
    return json.dumps(convert_pdf(bytes(data), json.loads(options_json), progress))
