/*
  Pandoc exporter for EdiMarkWeb.
  Reuses the Pandoc WASM bridge from MDAITex (pandoc-wasm.js).
*/
import { pandoc } from './pandoc-wasm.js';
import {
  MARKDOWN_READER_NO_AUTO_IDS,
  buildExportArgs,
  buildImportArgs,
  stripEpubAnchorPrefixes,
  normalizeNewlines,
  normalizeThematicBreaks,
  trimInlineMath,
  ensureEpubMetadata,
  collectRemoteImageUrls,
  inlineArchiveImages,
  replaceImageUrls,
  dropImagesByUrl,
} from './pandoc-prepare.js';

const FORMATS = {
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    defaultFilename: 'documento.docx',
    preparingKey: 'docx_export_preparing',
    preparingFallback: 'Preparando DOCX, espera...',
    doneKey: 'docx_export_done',
    doneFallback: 'Exportación a DOCX completada.',
    errorKey: 'docx_export_error',
    errorFallback: 'Error durante la exportación a DOCX.',
  },
  odt: {
    mime: 'application/vnd.oasis.opendocument.text',
    defaultFilename: 'documento.odt',
    preparingKey: 'odt_export_preparing',
    preparingFallback: 'Preparando ODT, espera...',
    doneKey: 'odt_export_done',
    doneFallback: 'Exportación a ODT completada.',
    errorKey: 'odt_export_error',
    errorFallback: 'Error durante la exportación a ODT.',
  },
  epub: {
    pandocFormat: 'epub3',
    mime: 'application/epub+zip',
    defaultFilename: 'documento.epub',
    preparingKey: 'epub_export_preparing',
    preparingFallback: 'Preparando EPUB, espera...',
    doneKey: 'epub_export_done',
    doneFallback: 'Exportación a EPUB completada.',
    errorKey: 'epub_export_error',
    errorFallback: 'Error durante la exportación a EPUB.',
  },
};

const PANDOC_WASM_SOURCES = [
  { url: 'pandoc.b64', gzip: false },
  { url: 'pandoc.b64.gz', gzip: true },
  { url: 'https://raw.githubusercontent.com/mdaitex/mdaitex.github.io/main/pandoc.b64', gzip: false },
  { url: 'https://raw.githubusercontent.com/mdaitex/mdaitex.github.io/main/pandoc.b64.gz', gzip: true },
];
const MAX_RETRIES = 3;
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

let base64PandocWasm = null;
let pandocInitialized = false;
let initializationAttempts = 0;


function translate(key, fallback = '') {
  const catalog = window.__edimarkTranslations;
  if (catalog && Object.prototype.hasOwnProperty.call(catalog, key)) {
    return catalog[key];
  }
  return fallback;
}

function escapeHtmlEntities(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractBracedContent(source, command) {
  if (typeof source !== 'string' || !command) return null;
  const regex = new RegExp(`\\\\${command}\\s*\\{`, 'i');
  const match = regex.exec(source);
  if (!match) return null;
  let idx = match.index + match[0].length;
  let depth = 1;
  while (idx < source.length) {
    const char = source[idx];
    if (char === '\\') {
      idx += 2;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(match.index + match[0].length, idx);
      }
    }
    idx += 1;
  }
  return null;
}

function extractLatexMetadata(latex) {
  const normalized = typeof latex === 'string' ? latex : '';
  const title = extractBracedContent(normalized, 'title');
  const hasMakeTitle = /\\maketitle\b/.test(normalized);
  return {
    title: title ? title.trim() : '',
    hasMakeTitle,
  };
}

function ensureMarkdownTitle(markdown, { title, hasMakeTitle }) {
  if (!title || !hasMakeTitle) return markdown;
  const sanitizedTitle = title.replace(/\s+/g, ' ').trim();
  if (!sanitizedTitle) return markdown;
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex(line => line.trim() !== '');
  if (firstContentIndex !== -1) {
    const firstLine = lines[firstContentIndex];
    if (/^#{1,6}\s+/.test(firstLine)) {
      return markdown;
    }
  }
  const insertion = [`# ${sanitizedTitle}`, ''];
  if (firstContentIndex === -1) {
    return insertion.join('\n');
  }
  const updated = [
    ...lines.slice(0, firstContentIndex),
    ...insertion,
    ...lines.slice(firstContentIndex),
  ];
  return updated.join('\n');
}

function currentLanguage() {
  return window.__edimarkLang || document.documentElement.lang || 'es';
}

async function fetchAsDataUri(url) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

/*
  Pandoc runs without network access inside WASM, so a remote image aborts the
  whole conversion and leaves an empty output file. Download the images here,
  where the browser can reach them, and inline them as data URIs. Images that
  cannot be fetched (CORS, 404) are replaced by their alt text so the export
  still produces a valid document.
*/
async function inlineRemoteImages(markdown, { onStatus } = {}) {
  const urls = collectRemoteImageUrls(markdown);
  if (urls.length === 0) {
    return { markdown, skipped: [] };
  }

  triggerStatus(onStatus, 'images_downloading', 'Descargando imágenes...');

  const replacements = new Map();
  const skipped = [];
  const results = await Promise.all(urls.map(async (url) => {
    try {
      return { url, dataUri: await fetchAsDataUri(url) };
    } catch (error) {
      console.warn(`No se pudo incrustar la imagen ${url}:`, error);
      return { url, dataUri: null };
    }
  }));

  for (const { url, dataUri } of results) {
    if (dataUri) {
      replacements.set(url, dataUri);
    } else {
      skipped.push(url);
    }
  }

  let prepared = replaceImageUrls(markdown, replacements);
  if (skipped.length > 0) {
    prepared = dropImagesByUrl(prepared, skipped);
  }
  return { markdown: prepared, skipped };
}

function stripPandocHeadingIds(markdown) {
  if (typeof markdown !== 'string' || !markdown.includes('{#')) {
    return markdown;
  }
  return markdown.replace(/\s*\{#[^}]+\}/g, '');
}

function sanitizeLatexInput(latex) {
  if (typeof latex !== 'string' || latex.length === 0) {
    return latex;
  }
  let sanitized = latex.replace(/\\label\{[^}]*\}/g, '');
  sanitized = sanitized.replace(/\\protect\\hypertarget\{[^}]*\}\{([^}]*)\}/g, '$1');
  sanitized = sanitized.replace(/\\hypertarget\{[^}]*\}\{([^}]*)\}/g, '$1');
  return sanitized;
}

async function readResponseAsText(response, gzip, throttled = false) {
  if (!gzip) {
    if (throttled || isIOS) {
      const reader = response.body?.getReader();
      if (!reader) {
        return (await response.text()).trim();
      }
      let result = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        if (throttled) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      result += decoder.decode();
      return result.trim();
    }
    return (await response.text()).trim();
  }

  if (typeof DecompressionStream === 'function' && response.body) {
    const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const reader = decompressedStream.getReader();
    let result = '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      if (throttled) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    result += decoder.decode();
    return result.trim();
  }

  // Fallback: rely on server-side decompression if available.
  return '';
}

async function loadPandocWasm({ onStatus } = {}, silent = false) {
  if (base64PandocWasm && pandocInitialized) {
    return base64PandocWasm;
  }

  if (initializationAttempts >= MAX_RETRIES) {
    throw new Error('pandoc_init_max_retries');
  }
  initializationAttempts += 1;

  if (!silent && typeof onStatus === 'function') {
    onStatus(translate('initializing_pandoc', 'Inicializando Pandoc...'));
  }

  try {
    for (const source of PANDOC_WASM_SOURCES) {
      try {
        const response = await fetch(source.url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const throttled = isIOS && !source.gzip;
        const text = await readResponseAsText(response, source.gzip, throttled);
        if (text) {
          base64PandocWasm = text;
          break;
        }
      } catch (innerError) {
        console.warn(`Fallo al cargar ${source.url}:`, innerError);
      }
    }

    if (!base64PandocWasm) {
      throw new Error('pandoc_wasm_unavailable');
    }
    if (base64PandocWasm.length < 1000) {
      throw new Error('pandoc_wasm_invalid');
    }

    pandocInitialized = true;
    return base64PandocWasm;
  } catch (error) {
    console.error(`Error en carga WASM (intento ${initializationAttempts}):`, error);
    if (initializationAttempts < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * initializationAttempts));
      return loadPandocWasm({ onStatus }, silent);
    }
    throw error;
  }
}

function triggerStatus(onStatus, key, fallback, extra = '') {
  if (typeof onStatus === 'function') {
    const base = translate(key, fallback);
    onStatus(extra ? `${base} ${extra}`.trim() : base);
  }
}

function triggerNotification(onNotification, key, fallback) {
  if (typeof onNotification === 'function') {
    const message = translate(key, fallback);
    if (message) {
      onNotification(message);
    }
  }
}

function saveBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
  }, 1000);
}

async function exportDocument({
  format = 'docx',
  markdown = '',
  onStatus = () => {},
  onNotification = () => {},
  outputFilename,
  documentTitle = '',
} = {}) {
  const normalizedFormat = typeof format === 'string' ? format.toLowerCase() : 'docx';
  const config = FORMATS[normalizedFormat];
  if (!config) {
    throw new Error(`Unsupported format: ${format}`);
  }

  let normalized = normalizeThematicBreaks(normalizeNewlines(trimInlineMath(markdown || '')));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }
  let titleFromHeading = false;
  if (normalizedFormat === 'epub') {
    const prepared = ensureEpubMetadata(normalized, {
      fallbackTitle: documentTitle,
      untitledLabel: translate('untitled_document', 'Documento sin título'),
      lang: currentLanguage(),
    });
    normalized = prepared.markdown;
    titleFromHeading = prepared.titleFromHeading;
  }

  triggerStatus(onStatus, config.preparingKey, config.preparingFallback);

  const { markdown: withImages, skipped: skippedImages } = await inlineRemoteImages(normalized, { onStatus });
  normalized = withImages;
  if (skippedImages.length > 0) {
    triggerNotification(
      onNotification,
      'images_not_embedded',
      'Algunas imágenes no se han podido descargar y se han omitido en el documento exportado.',
    );
  }

  let iosTimer;
  if (isIOS) {
    const iosAdvice = translate('ios_specific_advice', '');
    if (iosAdvice) {
      iosTimer = setTimeout(() => {
        triggerStatus(onStatus, config.preparingKey, config.preparingFallback, iosAdvice);
      }, 1000);
    }
  }

  try {
    const base64 = await loadPandocWasm({ onStatus });
    const pandocArgs = buildExportArgs(config.pandocFormat || normalizedFormat, {
      mathml: normalizedFormat === 'odt' || normalizedFormat === 'epub',
      titleFromHeading,
    });
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
    if (iosTimer) clearTimeout(iosTimer);

    // Pandoc reports internal failures by leaving the output file empty rather
    // than by throwing, so never hand the user a zero-byte download.
    if (!resultadoBytes || resultadoBytes.length === 0) {
      throw new Error('pandoc_empty_output');
    }

    const blob = new Blob([resultadoBytes], { type: config.mime });
    saveBlob(blob, outputFilename || config.defaultFilename);

    triggerStatus(onStatus, config.doneKey, config.doneFallback);
  } catch (error) {
    if (iosTimer) clearTimeout(iosTimer);
    triggerStatus(onStatus, config.errorKey || 'export_error', config.errorFallback || 'Error durante la exportación.');
    if (isIOS) {
      triggerNotification(onNotification, 'ios_specific_advice', 'En iOS, si el problema persiste, prueba a cerrar y reiniciar el navegador.');
    }
    throw error;
  }
}

async function generateHtml({
  markdown = '',
  standalone = true,
  onStatus = () => {},
  onNotification = () => {},
} = {}) {
  const normalized = normalizeThematicBreaks(normalizeNewlines(trimInlineMath(markdown || '')));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'html_export_preparing', 'Preparando HTML, espera...');

  try {
    const base64 = await loadPandocWasm({ onStatus });
    let pandocArgs = `-f ${MARKDOWN_READER_NO_AUTO_IDS} -t html --mathjax`;
    if (standalone) {
      pandocArgs += ' -s';
    }
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
    if (!resultadoBytes || resultadoBytes.length === 0) {
      throw new Error('pandoc_empty_output');
    }
    let htmlResult = new TextDecoder().decode(resultadoBytes);

    if (standalone) {
      const titleMatch = normalized.match(/^#\s+(.*)/m);
      const title = titleMatch ? titleMatch[1].trim() : translate('untitled_document', 'Documento sin título');
      if (title) {
        htmlResult = htmlResult.replace(/<title>.*?<\/title>/i, `<title>${escapeHtmlEntities(title)}</title>`);
      }
    }

    return htmlResult;
  } catch (error) {
    triggerStatus(onStatus, 'html_export_error', 'Error durante la exportación HTML.');
    throw error;
  }
}

async function generateLatex({
  markdown = '',
  standalone = false,
  onStatus = () => {},
} = {}) {
  const normalized = normalizeThematicBreaks(normalizeNewlines(trimInlineMath(markdown || '')));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'latex_export_preparing', 'Preparando LaTeX, espera...');

  try {
    const base64 = await loadPandocWasm({ onStatus });
    let pandocArgs = `-f ${MARKDOWN_READER_NO_AUTO_IDS} -t latex --no-highlight`;
    if (standalone) {
      pandocArgs = `-s ${pandocArgs}`;
    }
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
    if (!resultadoBytes || resultadoBytes.length === 0) {
      throw new Error('pandoc_empty_output');
    }
    let latexResult = new TextDecoder().decode(resultadoBytes);
    latexResult = latexResult.replace(/^[ \t]*\\tightlist\s*$(\r?\n)?/gm, '');
    return latexResult;
  } catch (error) {
    triggerStatus(onStatus, 'latex_export_error', 'Error durante la exportación a LaTeX.');
    throw error;
  }
}

async function convertLatexToMarkdown({
  latex = '',
  onStatus = () => {},
} = {}) {
  const normalizedLatex = normalizeNewlines(latex || '');
  if (!normalizedLatex.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'latex_import_preparing', 'Convirtiendo LaTeX a Markdown...');

  try {
    const metadata = extractLatexMetadata(normalizedLatex);
    const base64 = await loadPandocWasm({ onStatus });
    const sanitizedLatex = sanitizeLatexInput(normalizedLatex);
    const pandocArgs = `-f latex -t ${MARKDOWN_READER_NO_AUTO_IDS} --wrap=preserve`;
    const resultadoBytes = await pandoc(pandocArgs, sanitizedLatex, base64);
    let markdownResult = new TextDecoder().decode(resultadoBytes);
    markdownResult = ensureMarkdownTitle(markdownResult, metadata);
    markdownResult = stripPandocHeadingIds(markdownResult);
    triggerStatus(onStatus, 'latex_import_done', 'Conversión a Markdown completada.');
    return trimInlineMath(normalizeNewlines(markdownResult));
  } catch (error) {
    triggerStatus(onStatus, 'latex_import_error', 'No se pudo convertir el LaTeX.');
    throw error;
  }
}

const IMPORT_FORMATS = {
  latex: { from: 'latex', binary: false },
  docx: { from: 'docx', binary: true },
  odt: { from: 'odt', binary: true },
  epub: { from: 'epub', binary: true },
  html: { from: 'html', binary: false },
};

function normalizeImportData(data, { binary }) {
  if (binary) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof data === 'string') return new TextEncoder().encode(data);
    return new Uint8Array();
  }
  if (typeof data === 'string') return normalizeNewlines(data);
  if (data instanceof Uint8Array) {
    return normalizeNewlines(new TextDecoder().decode(data));
  }
  if (data instanceof ArrayBuffer) {
    return normalizeNewlines(new TextDecoder().decode(new Uint8Array(data)));
  }
  return '';
}

async function importToMarkdown({
  data,
  sourceFormat = 'latex',
  onStatus = () => {},
} = {}) {
  const config = IMPORT_FORMATS[sourceFormat];
  if (!config) {
    throw new Error(`Unsupported import format: ${sourceFormat}`);
  }
  const normalizedInput = normalizeImportData(data, config);
  let preparedInput = normalizedInput;
  let latexSourceForMetadata = null;
  if (config.from === 'latex') {
    const latexString = typeof normalizedInput === 'string'
      ? normalizedInput
      : new TextDecoder().decode(normalizedInput);
    latexSourceForMetadata = latexString;
    preparedInput = sanitizeLatexInput(latexString);
  }
  if ((typeof normalizedInput === 'string' && !normalizedInput.trim()) ||
      (normalizedInput instanceof Uint8Array && normalizedInput.length === 0)) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'import_file_status_preparing', 'Importando con Pandoc...');

  try {
    const base64 = await loadPandocWasm({ onStatus });
    const pandocArgs = buildImportArgs(config.from);
    const resultadoBytes = await pandoc(pandocArgs, preparedInput, base64);
    if (!resultadoBytes || resultadoBytes.length === 0) {
      throw new Error('pandoc_empty_output');
    }
    let markdownResult = new TextDecoder().decode(resultadoBytes);
    if (sourceFormat === 'latex') {
      const metadata = extractLatexMetadata(latexSourceForMetadata || '');
      markdownResult = ensureMarkdownTitle(markdownResult, metadata);
    }
    if (sourceFormat === 'epub') {
      markdownResult = stripEpubAnchorPrefixes(markdownResult);
    }
    if (config.binary) {
      triggerStatus(onStatus, 'images_extracting', 'Extrayendo imágenes...');
      markdownResult = await inlineArchiveImages(markdownResult, normalizedInput);
    }
    markdownResult = stripPandocHeadingIds(markdownResult);
    triggerStatus(onStatus, 'import_file_success', 'Importación completada.');
    return trimInlineMath(normalizeNewlines(markdownResult));
  } catch (error) {
    triggerStatus(onStatus, 'import_file_error', 'No se pudo importar el archivo.');
    throw error;
  }
}

async function warmUpExporter() {
  try {
    await loadPandocWasm({}, true);
  } catch (error) {
    console.warn('No se pudo precargar Pandoc WASM:', error);
  }
}

window.PandocExporter = {
  exportDocument,
  generateHtml,
  generateLatex,
  convertLatexToMarkdown,
  importToMarkdown,
  trimInlineMath,
  warmUpExporter,
};

export { exportDocument, generateHtml, generateLatex, convertLatexToMarkdown, importToMarkdown, trimInlineMath, warmUpExporter };
