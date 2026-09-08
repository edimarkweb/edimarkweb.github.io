"""Local PDF conversion, shared by Pyodide and the regression tests. No OCR."""
import json
import re
from collections import defaultdict
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


def remove_running_text(doc):
    """Only repeated text near page edges (and isolated page numbers).

    Match on the entire source document, before selecting pages. Redact text
    only: drawings and images must survive. No fixed strip is cropped.
    """
    candidates = []
    occurrences = defaultdict(set)
    for page in doc:
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
    threshold = max(2, (len(doc) + 1) // 2)
    for number, rect, text, key in candidates:
        if len(occurrences[key]) >= threshold or re.fullmatch(r'\d+|[ivxlcdm]+', text, re.I):
            doc[number].add_redact_annot(rect, fill=False)
    for page in doc:
        page.apply_redactions(images=0, graphics=0)


def preserve_math(page):
    """Rasterize detected mathematical text regions, retaining surrounding prose.

    This is intentionally conservative, not equation recognition. Some fonts
    and inline expressions remain undetectable; the UI explains that limitation.
    """
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


def convert_pdf(data, options):
    with pymupdf.open(stream=data, filetype='pdf') as source:
        if source.needs_pass:
            raise ValueError('pdf_password')
        pages = selected_pages(options.get('pages', ''), len(source))
        if len(pages) > 200:
            raise ValueError('pdf_page_limit')
        # Work on an in-memory copy, never on the user's PDF.
        if options.get('removeHeaders', True):
            remove_running_text(source)
        source.select(pages)
        text_pages = sum(bool(p.get_text().strip()) for p in source)
        math_regions = 0
        if options.get('keepImages', True):
            for page in source:
                math_regions += preserve_math(page)
        markdown = pymupdf4llm.to_markdown(
            source, embed_images=options.get('keepImages', True), image_size_limit=0,
            ignore_images=not options.get('keepImages', True),
            show_progress=False,
        )
        return {'markdown': markdown, 'pages': len(pages), 'textPages': text_pages, 'mathRegions': math_regions}


def convert_json(data, options_json):
    return json.dumps(convert_pdf(bytes(data), json.loads(options_json)))
