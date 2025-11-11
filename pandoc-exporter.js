/*
  Pandoc exporter for EdiMarkWeb.
  Reuses the Pandoc WASM bridge from MDAITex (pandoc-wasm.js).
*/
import { pandoc } from './pandoc-wasm.js';

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

const MARKDOWN_MATH_EXTENSIONS = [
  'markdown',
  '+tex_math_dollars',
  '+tex_math_single_backslash',
  '+tex_math_double_backslash',
  '+raw_tex',
].join('');

function translate(key, fallback = '') {
  const catalog = window.__edimarkTranslations;
  if (catalog && Object.prototype.hasOwnProperty.call(catalog, key)) {
    return catalog[key];
  }
  return fallback;
}

function normalizeNewlines(str) {
  return typeof str === 'string' ? str.replace(/\r\n?/g, '\n') : '';
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

// Matches the inline math trim used in MDAITex.
function trimInlineMath(content) {
  if (typeof content !== 'string') return '';
  return content.replace(/\$(\s*)([^$\n]+?)(\s*)\$(?!\$)/g, (_match, _p1, expr) => {
    return `$${expr}$`;
  });
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
} = {}) {
  const normalizedFormat = typeof format === 'string' ? format.toLowerCase() : 'docx';
  const config = FORMATS[normalizedFormat];
  if (!config) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const normalized = normalizeNewlines(trimInlineMath(markdown || ''));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, config.preparingKey, config.preparingFallback);

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
    let pandocArgs = `-f ${MARKDOWN_MATH_EXTENSIONS} -t ${normalizedFormat}`;
    if (normalizedFormat === 'odt') {
      pandocArgs += ' --mathml';
    }
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
    if (iosTimer) clearTimeout(iosTimer);

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
  const normalized = normalizeNewlines(trimInlineMath(markdown || ''));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'html_export_preparing', 'Preparando HTML, espera...');

  try {
    const base64 = await loadPandocWasm({ onStatus });
    let pandocArgs = `-f ${MARKDOWN_MATH_EXTENSIONS} -t html --mathjax`;
    if (standalone) {
      pandocArgs += ' -s';
    }
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
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
  const normalized = normalizeNewlines(trimInlineMath(markdown || ''));
  if (!normalized.trim()) {
    const message = translate('no_content', 'No hay contenido para exportar.');
    throw new Error(message || 'No content');
  }

  triggerStatus(onStatus, 'latex_export_preparing', 'Preparando LaTeX, espera...');

  try {
    const base64 = await loadPandocWasm({ onStatus });
    let pandocArgs = `-f ${MARKDOWN_MATH_EXTENSIONS} -t latex --no-highlight`;
    if (standalone) {
      pandocArgs = `-s ${pandocArgs}`;
    }
    const resultadoBytes = await pandoc(pandocArgs, normalized, base64);
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
    const pandocArgs = `-f latex -t ${MARKDOWN_MATH_EXTENSIONS} --wrap=preserve`;
    const resultadoBytes = await pandoc(pandocArgs, normalizedLatex, base64);
    let markdownResult = new TextDecoder().decode(resultadoBytes);
    markdownResult = ensureMarkdownTitle(markdownResult, metadata);
    triggerStatus(onStatus, 'latex_import_done', 'Conversión a Markdown completada.');
    return trimInlineMath(normalizeNewlines(markdownResult));
  } catch (error) {
    triggerStatus(onStatus, 'latex_import_error', 'No se pudo convertir el LaTeX.');
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
  trimInlineMath,
  warmUpExporter,
};

export { exportDocument, generateHtml, generateLatex, convertLatexToMarkdown, trimInlineMath, warmUpExporter };
