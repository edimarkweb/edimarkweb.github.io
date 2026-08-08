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

const MD_IMAGE_RE = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^\s<>)]+)>?[^)]*\)/g;
const HTML_IMAGE_RE = /<img\b[^>]*?\ssrc\s*=\s*(["'])(https?:\/\/[^"']+)\1[^>]*>/gi;

// Remote images abort the Pandoc WASM run (it has no network), so callers must
// resolve them before converting to DOCX/ODT/EPUB.
export function collectRemoteImageUrls(markdown) {
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
