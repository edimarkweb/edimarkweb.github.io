/*
  Repairs the formula references of an ODT before Pandoc reads it.

  An ODT keeps every formula as an embedded object: the body carries only a
  `<draw:frame><draw:object xlink:href="…"/></draw:frame>` reference and the
  maths itself lives as MathML in that object's own `content.xml`.

  Pandoc's ODT *writer* emits that reference with a trailing slash
  (`xlink:href="Formula-0/"`), a form its own ODT *reader* cannot resolve: it
  finds no formula and drops it silently, so the document comes back without the
  maths and without any hole showing where it used to be. Writers such as
  LibreOffice point at `./Object 1` instead, which Pandoc reads without trouble
  — so only the ODT files this app exported are affected on the way back in.

  Dropping the trailing slash is enough for Pandoc to find the MathML and
  convert it natively, exactly as it does for a LibreOffice document.

  Plain string handling on purpose, so it can be unit tested outside a browser.
*/

const OBJECT_HREF_RE = /(<draw:object\b[^>]*?xlink:href\s*=\s*")([^"]+)(")/g;

/*
  Returns the patched XML and whether anything changed, so the caller can leave
  an archive that needs no repair completely untouched.
*/
export function normalizeFormulaHrefs(contentXml) {
  if (typeof contentXml !== 'string' || !contentXml.includes('<draw:object')) {
    return { xml: contentXml || '', changed: false };
  }
  let changed = false;
  const xml = contentXml.replace(OBJECT_HREF_RE, (match, before, href, after) => {
    const normalized = href.replace(/\/+$/, '');
    if (normalized === href || !normalized) return match;
    changed = true;
    return `${before}${normalized}${after}`;
  });
  return { xml, changed };
}
