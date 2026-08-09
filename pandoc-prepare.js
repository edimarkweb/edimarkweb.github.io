import { readZipEntries, mimeForPath, bytesToDataUri } from './zip-reader.js';
import { createZip } from './zip-writer.js';
import { extractOdtTableHeaders, restoreTableHeaders } from './odt-tables.js';
import { normalizeFormulaHrefs } from './odt-formulas.js';

/*
  Pure Markdown preparation helpers used by pandoc-exporter.js.

  This module has no browser dependencies on purpose: every function here is
  plain string handling, so it can be unit tested outside the browser.
*/

export const MARKDOWN_READER = [
  'markdown',
  '+tex_math_dollars',
  '+tex_math_single_backslash',
  '+tex_math_double_backslash',
  '+raw_tex',
].join('');

export const MARKDOWN_READER_NO_AUTO_IDS = `${MARKDOWN_READER}-auto_identifiers`;

/*
  Pandoc's Markdown writer defaults to space-aligned "simple" tables, which the
  preview (and GitHub-flavoured Markdown in general) renders as plain text.
  Every conversion back to Markdown asks for pipe tables instead.
*/
export const MARKDOWN_WRITER = [
  MARKDOWN_READER_NO_AUTO_IDS,
  '-simple_tables',
  '-multiline_tables',
  '-grid_tables',
  '+pipe_tables',
].join('');

// Kept here so tests exercise the same command line the app sends to Pandoc.
export function buildExportArgs(pandocFormat, { mathml = false, titleFromHeading = false } = {}) {
  let args = `-f ${MARKDOWN_READER_NO_AUTO_IDS} -t ${pandocFormat}`;
  if (mathml) args += ' --mathml';
  if (pandocFormat === 'epub3' && titleFromHeading) {
    // The body already opens with the title, so skip Pandoc's title page.
    args += ' --epub-title-page=false';
  }
  return args;
}

/*
  Importing an EPUB with the default writer produces `:::` fenced divs, empty
  `[]{#ch001.xhtml}` anchors and attribute-laden headings — structure that means
  nothing once the text is back in the editor. Turning those extensions off
  yields plain Markdown instead.
*/
const MARKDOWN_WRITER_PLAIN = [
  MARKDOWN_WRITER,
  '-fenced_divs',
  '-native_divs',
  '-bracketed_spans',
  '-native_spans',
  '-header_attributes',
  '-link_attributes',
  '-raw_html',
].join('');

export function buildImportArgs(fromFormat) {
  let writer = MARKDOWN_WRITER;
  if (fromFormat === 'epub') {
    writer = MARKDOWN_WRITER_PLAIN;
  } else if (fromFormat === 'docx' || fromFormat === 'odt') {
    /*
      By default images arrive as `![](x.png){width="8.876cm" ...}` and that
      attribute block shows up as literal text in the preview. Dropping
      link_attributes alone makes Pandoc fall back to a raw <img> tag, so
      raw_html has to go with it to get a plain `![](x.png)`.
    */
    writer += '-link_attributes-raw_html';
  }
  return `-f ${fromFormat} -t ${writer} --wrap=preserve`;
}

// EPUB internal links carry the source file name (#ch001.xhtml_seccion), which
// is meaningless outside the book.
export function stripEpubAnchorPrefixes(markdown) {
  if (typeof markdown !== 'string') return '';
  return markdown.replace(/\(#[^)\s]*?\.x?html_/g, '(#');
}

/*
  Desarma el HTML crudo que puede venir dentro de un documento importado.

  Un `.html` o un `.docx` ajeno puede traer `<img src=x onerror="…">` o un
  enlace `javascript:`. Ese Markdown acaba renderizado en la vista previa, que
  se ejecuta en el origen de la aplicación y con acceso a los documentos
  guardados, así que el manejador se quita en la aduana: al importar, una sola
  vez, sobre contenido que no ha escrito el usuario.

  Se limita a las etiquetas HTML y a los enlaces Markdown para no tocar la
  prosa: un texto que mencione `onclick=` fuera de una etiqueta se queda igual.
  El código, cercado o en línea, tampoco se toca: ahí un `<img onerror>` es
  texto que se muestra —el manual de la aplicación documenta etiquetas así— y
  reescribirlo estropearía el documento sin ganar nada.
*/
/*
  Los valores entrecomillados se consumen enteros, `>` incluido. Con un simple
  `[^>]*` la etiqueta se cortaba en el primer `>` aunque estuviera dentro de una
  comilla, y `<img src="a>" onerror="alert(1)">` se quedaba con su manejador
  mientras el navegador —que sí respeta las comillas— lo ejecutaba.
*/
const HTML_TAG_RE = /<[a-zA-Z][a-zA-Z0-9-]*(?:"[^"]*"|'[^']*'|[^>"'])*>/g;
const EVENT_ATTR_RE = /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g;
const URL_ATTR_RE = /\s+(href|src|xlink:href|action|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// El destino admite paréntesis equilibrados, `javascript:alert(1)` entre ellos.
const MARKDOWN_LINK_RE = /(\]\(\s*)([^()\s]*(?:\([^()]*\)[^()\s]*)*)(\s+[^)]*)?(\))/g;
const INLINE_CODE_RE = /(`+[^`]*`+)/;
const UNSAFE_SCHEME_RE = /^(?:javascript:|vbscript:|data:text\/html)/i;

// Los caracteres de control parten esquemas como `java&#9;script:`.
function isUnsafeUrl(value) {
  const unquoted = String(value || '').replace(/^["']|["']$/g, '');
  return UNSAFE_SCHEME_RE.test(unquoted.replace(/[\u0000-\u0020]/g, ''));
}

function stripUnsafeFragment(text) {
  if (!text.includes('<') && !text.includes('](')) return text;
  return text
    .replace(HTML_TAG_RE, tag => tag
      .replace(EVENT_ATTR_RE, '')
      .replace(URL_ATTR_RE, (match, _name, value) => (isUnsafeUrl(value) ? '' : match)))
    .replace(MARKDOWN_LINK_RE, (match, prefix, url, _title, close) => (
      isUnsafeUrl(url) ? `${prefix}#${close}` : match
    ));
}

// Al partir por un grupo capturador, los índices impares son el código.
function stripUnsafeOutsideInlineCode(line) {
  return line
    .split(INLINE_CODE_RE)
    .map((part, index) => (index % 2 === 1 ? part : stripUnsafeFragment(part)))
    .join('');
}

export function stripUnsafeMarkup(markdown) {
  if (typeof markdown !== 'string' || markdown.length === 0) return markdown || '';
  let fence = null;
  return markdown.split('\n').map((line) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return line;
    }
    return fence === null ? stripUnsafeOutsideInlineCode(line) : line;
  }).join('\n');
}

export function normalizeNewlines(str) {
  return typeof str === 'string' ? str.replace(/\r\n?/g, '\n') : '';
}

// Matches the inline math trim used in MDAITex.
export function trimInlineMath(content) {
  if (typeof content !== 'string') return '';
  return content.replace(/\$(\s*)([^$\n]+?)(\s*)\$(?!\$)/g, (_match, _p1, expr) => {
    return `$${expr}$`;
  });
}

export function escapeYamlValue(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// True only for a real YAML metadata block: an opening `---` with a matching
// `---` or `...` terminator. A lone `---` is a horizontal rule, not metadata.
export function hasYamlFrontMatter(markdown) {
  if (typeof markdown !== 'string') return false;
  const lines = markdown.split('\n');
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;
  if (index >= lines.length || lines[index].trim() !== '---') return false;
  for (let i = index + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === '---' || trimmed === '...') return true;
  }
  return false;
}

// First level-1 heading, skipping fenced code blocks so that a shell comment
// such as `# npm install` cannot be mistaken for the document title.
export function extractMarkdownTitle(markdown) {
  if (typeof markdown !== 'string') return '';
  const lines = markdown.split('\n');
  let fence = null;
  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      continue;
    }
    if (fence !== null) continue;
    const heading = line.match(/^#\s+(.*)$/);
    if (heading) {
      const title = heading[1].trim().replace(/\s+#+\s*$/, '');
      if (title) return title;
    }
  }
  return '';
}

/*
  Pandoc reads a `---` line that follows a blank line as the start of a YAML
  metadata block, anywhere in the document. A Markdown file that uses `---` as
  a thematic break therefore fails to convert with a YAML parse error, and the
  conversion produces no output at all. Rewriting those breaks as `***` (same
  rendering, no ambiguity) keeps such documents exportable.

  Left untouched: `---` inside fenced code, a leading YAML metadata block, and
  a `---` directly under text, which is a level-2 setext heading.
*/
export function normalizeThematicBreaks(markdown) {
  if (typeof markdown !== 'string' || !markdown.includes('---')) return markdown || '';
  const lines = markdown.split('\n');

  let start = 0;
  if (hasYamlFrontMatter(markdown)) {
    while (start < lines.length && lines[start].trim() === '') start += 1;
    start += 1;
    while (start < lines.length && !['---', '...'].includes(lines[start].trim())) start += 1;
    start += 1;
  }

  let fence = null;
  for (let i = start; i < lines.length; i += 1) {
    const fenceMatch = lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    if (lines[i].trim() !== '---') continue;
    // Text immediately above makes it a setext heading, not a break.
    if (i > start && lines[i - 1].trim() !== '') continue;
    lines[i] = lines[i].replace('---', '***');
  }

  return lines.join('\n');
}

/*
  EPUB requires a non-empty title and a language; without them Pandoc falls
  back to the temporary input filename ("in") and to en-US.

  Returns the markdown to convert plus `titleFromHeading`, which tells the
  caller whether the body already displays the title (so that Pandoc's
  generated title page would repeat it).
*/
export function ensureEpubMetadata(markdown, {
  fallbackTitle = '',
  untitledLabel = 'Documento sin título',
  lang = 'es',
} = {}) {
  const source = typeof markdown === 'string' ? markdown : '';
  if (hasYamlFrontMatter(source)) {
    return { markdown: source, titleFromHeading: false, injected: false };
  }
  const headingTitle = extractMarkdownTitle(source);
  const title = headingTitle || String(fallbackTitle || '').trim() || untitledLabel;
  const frontMatter = [
    '---',
    `title: "${escapeYamlValue(title)}"`,
    `lang: "${escapeYamlValue(lang || 'es')}"`,
    '---',
    '',
    '',
  ].join('\n');
  return {
    markdown: frontMatter + source,
    titleFromHeading: Boolean(headingTitle),
    injected: true,
  };
}

/*
  Where each level-1 heading sits, ignoring the ones inside fenced code blocks.
  `firstContentLine` is the first line with something other than blank space or
  a fence, which is what tells a title apart from a heading buried in the text.
*/
function scanTopLevelHeadings(lines) {
  const headings = [];
  let firstContentLine = -1;
  let fence = null;
  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      if (firstContentLine === -1) firstContentLine = index;
      return;
    }
    if (fence !== null) return;
    if (line.trim() === '') return;
    if (firstContentLine === -1) firstContentLine = index;
    const heading = line.match(/^#\s+(.*)$/);
    if (heading) {
      headings.push({ index, text: heading[1].trim().replace(/\s+#+\s*$/, '') });
    }
  });
  return { headings, firstContentLine };
}

export const LATEX_DOCUMENT_CLASSES = ['article', 'report', 'book'];

/*
  A user preamble is arbitrary LaTeX: backslashes, colons, quotes and blank
  lines. Quoting it would mean escaping all of that, so it goes in as a YAML
  literal block, where every indented line is taken verbatim. A `---` of the
  user's own cannot close the metadata block from there, because the terminator
  has to sit at column zero.
*/
function yamlLiteralBlock(key, value) {
  const lines = String(value).replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return [`${key}: |`, ...lines.map(line => (line.trim() === '' ? '' : `  ${line}`))];
}

// "12pt, a4paper" as Pandoc expects it: one entry per option.
function yamlClassOptions(options) {
  const values = String(options)
    .split(',')
    .map(option => option.trim())
    .filter(Boolean);
  if (!values.length) return [];
  return ['classoption:', ...values.map(value => `- "${escapeYamlValue(value)}"`)];
}

/*
  Metadata for a standalone LaTeX document.

  Without `lang` Pandoc loads no babel/polyglossia at all, so a Spanish document
  gets English hyphenation. And a document that opens with a single `# Title`
  means that heading to be the title: promoting it to `\title` (with the rest of
  the headings shifted up a level) produces `\maketitle` instead of a `\section`
  where a title page belongs.

  The promotion is deliberately conservative. With several level-1 headings the
  document is using them as sections, so touching them would break its
  structure; `shiftHeadings` then stays false and only the language is added.
  A document that already carries its own YAML block is left untouched: its
  author has said what the metadata should be, and that includes the settings
  coming from the app.

  `documentClass` and `classOptions` cannot be part of the preamble: the
  template has already emitted \documentclass by the time `header-includes`
  is inserted.
*/
export function prepareLatexStandalone(markdown, {
  lang = 'es',
  documentClass = '',
  classOptions = '',
  preamble = '',
} = {}) {
  const source = typeof markdown === 'string' ? markdown : '';
  if (hasYamlFrontMatter(source)) {
    return { markdown: source, shiftHeadings: false, injected: false };
  }

  const lines = source.split('\n');
  const { headings, firstContentLine } = scanTopLevelHeadings(lines);
  const opensWithTitle = headings.length === 1
    && headings[0].index === firstContentLine
    && Boolean(headings[0].text);

  const meta = ['---'];
  if (opensWithTitle) meta.push(`title: "${escapeYamlValue(headings[0].text)}"`);
  meta.push(`lang: "${escapeYamlValue(lang || 'es')}"`);

  const cls = String(documentClass || '').trim();
  if (LATEX_DOCUMENT_CLASSES.includes(cls)) {
    meta.push(`documentclass: "${escapeYamlValue(cls)}"`);
  }
  meta.push(...yamlClassOptions(classOptions || ''));
  if (String(preamble || '').trim()) {
    meta.push(...yamlLiteralBlock('header-includes', preamble));
  }
  meta.push('---', '', '');

  const body = opensWithTitle
    ? lines.filter((_, index) => index !== headings[0].index).join('\n')
    : source;

  return {
    markdown: meta.join('\n') + body,
    shiftHeadings: opensWithTitle,
    injected: true,
  };
}

const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*<?([^\s<>)]+)>?[^)]*\)/g;
const HTML_IMAGE_RE = /<img\b[^>]*?\ssrc\s*=\s*(["'])([^"']+)\1[^>]*>/gi;

const isRemote = url => /^https?:\/\//i.test(url);
const isEmbedded = url => /^data:/i.test(url);

// Remote images abort the Pandoc WASM run (it has no network), so callers must
// resolve them before converting to DOCX/ODT/EPUB.
export function collectRemoteImageUrls(markdown) {
  return collectImageSources(markdown).filter(isRemote);
}

/*
  Everything the browser has to resolve before handing the Markdown to Pandoc.

  Inside the WASM there is neither network nor file system, so a relative path
  (`imagenes/formulas.gif`, `/assets/logo.png`) fails exactly like a remote URL:
  Pandoc warns "Could not fetch resource" and drops the image, keeping only its
  description. The browser can fetch both against the page URL, so both belong
  here. Only `data:` images are already self-contained.
*/
export function collectFetchableImageUrls(markdown) {
  return collectImageSources(markdown).filter(url => url && !isEmbedded(url));
}

// Images Pandoc points at inside the uploaded archive (Pictures/…, media/…).
export function collectArchiveImagePaths(markdown) {
  return collectImageSources(markdown).filter(url => !isRemote(url) && !isEmbedded(url));
}

function collectImageSources(markdown) {
  if (typeof markdown !== 'string') return [];
  const urls = new Set();
  for (const match of markdown.matchAll(MD_IMAGE_RE)) urls.add(match[1]);
  for (const match of markdown.matchAll(HTML_IMAGE_RE)) urls.add(match[2]);
  return [...urls];
}

// Rewrites image sources only, leaving plain links to the same URL untouched.
export function replaceImageUrls(markdown, replacements) {
  if (typeof markdown !== 'string' || !replacements) return markdown || '';
  const lookup = replacements instanceof Map ? replacements : new Map(Object.entries(replacements));
  if (lookup.size === 0) return markdown;
  return markdown
    .replace(MD_IMAGE_RE, (match, url) => {
      const next = lookup.get(url);
      return next ? match.replace(url, next) : match;
    })
    .replace(HTML_IMAGE_RE, (match, _quote, url) => {
      const next = lookup.get(url);
      return next ? match.replace(url, next) : match;
    });
}

// Fallback when an image cannot be fetched: keep the alt text so the export
// still succeeds instead of producing an empty file.
export function dropImagesByUrl(markdown, urls) {
  if (typeof markdown !== 'string') return '';
  const targets = new Set(urls || []);
  if (targets.size === 0) return markdown;
  return markdown
    .replace(MD_IMAGE_RE, (match, url) => {
      if (!targets.has(url)) return match;
      const alt = match.match(/^!\[([^\]]*)\]/);
      return alt ? alt[1] : '';
    })
    .replace(HTML_IMAGE_RE, (match, _quote, url) => (targets.has(url) ? '' : match));
}

/*
  DOCX, ODT and EPUB are ZIP archives. Pandoc returns only the converted text,
  so its image references point at paths inside the uploaded file
  (`Pictures/…`, `media/…`) that no longer exist. Read those images straight
  out of the archive and inline them as data URIs.
*/
export async function inlineArchiveImages(markdown, archiveBytes) {
  const paths = collectArchiveImagePaths(markdown);
  if (paths.length === 0 || !archiveBytes || archiveBytes.length === 0) {
    return markdown;
  }

  let entries;
  try {
    entries = await readZipEntries(archiveBytes);
  } catch (error) {
    console.warn('No se pudieron leer las imágenes del archivo:', error);
    return markdown;
  }

  const replacements = new Map();
  for (const path of paths) {
    // Pandoc may shorten the path (media/image1.png for word/media/image1.png).
    const key = entries.has(path)
      ? path
      : [...entries.keys()].find(name => name.endsWith(`/${path}`) || name.endsWith(`/${path.split('/').pop()}`));
    if (!key) continue;
    try {
      replacements.set(path, bytesToDataUri(entries.get(key), mimeForPath(key)));
    } catch (error) {
      console.warn(`No se pudo incrustar la imagen ${path}:`, error);
    }
  }

  return replacements.size > 0 ? replaceImageUrls(markdown, replacements) : markdown;
}

/*
  Repairs the formula references of an ODT so Pandoc can read them.

  Pandoc's ODT writer points at each embedded formula with a trailing slash
  (`Formula-0/`) and its own reader cannot resolve that form, so re-importing a
  document this app exported loses every formula. Rewriting the reference is
  enough; Pandoc then converts the MathML itself.

  Returns the untouched bytes when there is nothing to repair, so an ODT written
  by LibreOffice — which Pandoc already reads correctly — never goes through the
  rewrite.
*/
export async function prepareOdtForImport(archiveBytes) {
  if (!archiveBytes || archiveBytes.length === 0) return archiveBytes;

  let entries;
  try {
    entries = await readZipEntries(archiveBytes);
  } catch (error) {
    console.warn('No se pudo leer el ODT para reparar sus fórmulas:', error);
    return archiveBytes;
  }

  const contentXml = entries.get('content.xml');
  if (!contentXml) return archiveBytes;

  const { xml, changed } = normalizeFormulaHrefs(new TextDecoder().decode(contentXml));
  if (!changed) return archiveBytes;

  const rebuilt = new Map();
  // El mimetype tiene que ser la primera entrada de un ODT.
  if (entries.has('mimetype')) rebuilt.set('mimetype', entries.get('mimetype'));
  for (const [name, bytes] of entries) {
    if (name === 'mimetype') continue;
    rebuilt.set(name, name === 'content.xml' ? new TextEncoder().encode(xml) : bytes);
  }
  return createZip(rebuilt);
}

/*
  Pandoc's ODT reader ignores <table:table-header-rows>, so imported tables lose
  their header row. Read it back out of the uploaded file.
*/
export async function restoreOdtTableHeaders(markdown, archiveBytes) {
  if (typeof markdown !== 'string' || !markdown.includes('|') || !archiveBytes || archiveBytes.length === 0) {
    return markdown || '';
  }
  try {
    const entries = await readZipEntries(archiveBytes);
    const contentXml = entries.get('content.xml');
    if (!contentXml) return markdown;
    const headers = extractOdtTableHeaders(new TextDecoder().decode(contentXml));
    return restoreTableHeaders(markdown, headers);
  } catch (error) {
    console.warn('No se pudieron recuperar los encabezados de tabla del ODT:', error);
    return markdown;
  }
}
