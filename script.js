/* Única copia de la versión en la aplicación; package.json es la otra fuente. */
const APP_VERSION = '2.20.0';
const DESKTOP_RELEASE_BANNER_PREFIX = 'edimarkweb-hide-desktop-release-';
const DESKTOP_RELEASE_BANNER_KEY = `${DESKTOP_RELEASE_BANNER_PREFIX}${APP_VERSION}`;
const UPDATE_AUTO_CHECK_KEY = 'edimarkweb-update-autocheck';
const UPDATE_LAST_CHECK_KEY = 'edimarkweb-update-last-check';
// Una comprobación diaria basta: publicar una versión y que el aviso tarde unas
// horas en aparecer es preferible a consultar GitHub en cada arranque.
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

// Declaración de variables globales
let turndownService;
let isUpdating = false;
let syncLock = false; // Evita ReferenceError de código legado
let markdownEditor, htmlEditor;
let undoButtonEl = null;
let redoButtonEl = null;
const AUTOSAVE_KEY_PREFIX = 'edimarkweb-autosave';
const DOCS_LIST_KEY = 'edimarkweb-docslist';
const CORRUPT_DOCS_LIST_BACKUP_KEY = 'edimarkweb-docslist-corrupt-backup';
const LAYOUT_KEY = 'edimarkweb-layout';
/*
  Icono de cada disposición. Representa el panel que queda a la vista, no el
  lateral estrecho: con el Markdown maximizado el área ocupada es la izquierda,
  que es justo lo que dibuja `panel-right`.
*/
const LAYOUT_ICONS = { md: 'panel-right', html: 'panel-left', dual: 'columns-2' };
const FS_KEY = 'edimarkweb-fontsize';
const FOCUS_MODE_KEY = 'edimarkweb-focus-mode';
const LATEX_SETTINGS_KEY = 'edimarkweb-latex-settings';
const EDICUATEX_BASE_URL = 'https://edicuatex.github.io/index.html';
const EDICUATEX_DESKTOP_PATH = 'vendor/edicuatex/index.html';
const DESKTOP_PARAM_KEY = 'desktop';
const DESKTOP_SPAWNED_KEY = 'desktop_spawned';
const TABLE_SANITIZE_ATTRS = ['style', 'width', 'height', 'border', 'cellspacing', 'cellpadding', 'align', 'valign', 'bgcolor', 'role', 'class', 'id'];
const WORD_STYLE_REGEX = /(font|color|mso|line-height|letter-spacing|word-spacing|background|text-align)/i;
const TEXT_NODE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;
const BASE64_PLACEHOLDER_PREFIX = '__EDIMARK_B64_';
const BASE64_PLACEHOLDER_REGEX = new RegExp(`${BASE64_PLACEHOLDER_PREFIX}\\d+__`, 'g');
const BASE64_IMAGE_REGEX = /!\[([^\]]*?)\]\(\s*(data:image\/([a-zA-Z0-9.+-]+);base64,)([^)\s]+)([^)]*)\)/g;
const BASE64_TEST_REGEX = /data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const SIMPLE_TEXT_HTML_TAGS = new Set(['p', 'div', 'span', 'br']);

let edicuatexWindow = null;
let edicuatexOrigin = null;
let desktopWindow = null;
let desktopWindowMonitor = null;
const DESKTOP_SIZE_KEY = 'edimarkweb-desktop-size';
const COPY_ACTION_KEY = 'edimarkweb-copy-action';
let base64UiContainer = null;
let base64UiList = null;
let base64UiCountLabel = null;
let base64ModalOverlayEl = null;
let base64ModalTextarea = null;
let base64ModalCopyBtn = null;
let base64ModalCloseBtn = null;
let currentBase64State = { placeholders: new Map(), total: 0 };
let currentBase64ModalPlaceholder = null;
let markdownTextareaEl = null;
let htmlOutputEl = null;
let htmlEditorWrapperEl = null;
let savedHtmlSelection = null;
let forceMarkdownUpdate = false;
let lastMarkdownSelection = { start: null, end: null };
let pendingStorageNotice = null;
let storageNoticeHandler = null;
/*
  El indicador de estado se crea dentro de window.onload, así que las funciones
  de nivel superior no lo alcanzaban: la importación comprobaba si existía,
  concluía que no y se ejecutaba entera en silencio.
*/
let statusReporter = null;

function reportStatus(message) {
    if (typeof statusReporter === 'function') statusReporter(message);
}
const shownStorageNoticeKeys = new Set();

function queueStorageNotice(notice) {
    if (!notice || shownStorageNoticeKeys.has(notice.key)) return;
    pendingStorageNotice = notice;
    if (storageNoticeHandler) {
        storageNoticeHandler(notice);
        shownStorageNoticeKeys.add(notice.key);
        pendingStorageNotice = null;
    }
}

function isStorageQuotaError(error) {
    return Boolean(error && (
        error.name === 'QuotaExceededError'
        || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        || error.code === 22
        || error.code === 1014
    ));
}

function reportStorageFailure(error) {
    const notice = isStorageQuotaError(error)
        ? {
            key: 'storage_quota_exceeded',
            fallback: 'El almacenamiento local está lleno. Guarda el documento en un archivo para no perder los cambios.'
        }
        : {
            key: 'storage_unavailable',
            fallback: 'No se puede usar el almacenamiento local. Los cambios no se conservarán al cerrar la aplicación.'
        };
    const alreadyReported = shownStorageNoticeKeys.has(notice.key)
        || pendingStorageNotice?.key === notice.key;
    if (!alreadyReported) console.warn(notice.fallback, error);
    queueStorageNotice(notice);
}

/*
  La preferencia de ocultar el aviso de escritorio lleva la versión en su
  clave, para que una versión nueva vuelva a anunciarse aunque se marcara «No
  volver a mostrar». Esas claves se quedarían acumuladas una por versión, así
  que al arrancar se descartan todas menos la de la versión en marcha.
*/
function purgeOldReleaseBannerKeys() {
    let storedKeys;
    try {
        storedKeys = Object.keys(window.localStorage);
    } catch (error) {
        console.warn('No se pudo revisar el almacenamiento local:', error);
        return;
    }
    storedKeys
        .filter(key => key.startsWith(DESKTOP_RELEASE_BANNER_PREFIX) && key !== DESKTOP_RELEASE_BANNER_KEY)
        .forEach(key => safeLocalStorageRemove(key));
}

function safeLocalStorageGet(key, fallback = null) {
    try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (error) {
        reportStorageFailure(error);
        return fallback;
    }
}

function safeLocalStorageSet(key, value, { notify = true } = {}) {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch (error) {
        if (notify) reportStorageFailure(error);
        else console.warn(`No se pudo guardar ${key}:`, error);
        return false;
    }
}

function safeLocalStorageRemove(key) {
    try {
        window.localStorage.removeItem(key);
        return true;
    } catch (error) {
        reportStorageFailure(error);
        return false;
    }
}

function cloneSelection(selection) {
    if (!selection || typeof selection.start !== 'number' || typeof selection.end !== 'number') return null;
    return { start: selection.start, end: selection.end };
}

function normalizeNewlines(str) {
    if (typeof str !== 'string' || str.length < 1) return typeof str === 'string' ? str : '';
    return str.replace(/\r\n?/g, '\n');
}

function removeAttributes(node, attrs) {
    if (!node || typeof node.removeAttribute !== 'function' || !Array.isArray(attrs)) return;
    attrs.forEach(attr => node.removeAttribute(attr));
}

function unwrapElement(el) {
    if (!el || !el.parentNode) return;
    const parent = el.parentNode;
    while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
}

function cleanWordTables(container) {
    if (!container || typeof container.querySelectorAll !== 'function') return;
    const tables = container.querySelectorAll('table');
    tables.forEach((table) => {
        removeAttributes(table, TABLE_SANITIZE_ATTRS);
        table.querySelectorAll('colgroup, col').forEach((col) => col.remove());
        table.querySelectorAll('thead').forEach((section) => unwrapElement(section));
        table.querySelectorAll('tr, td, th').forEach((cell) => {
            removeAttributes(cell, TABLE_SANITIZE_ATTRS);
            cell.querySelectorAll('p').forEach((p) => unwrapElement(p));
            cell.querySelectorAll('br').forEach((br) => {
                const className = (br.getAttribute('class') || '').toLowerCase();
                if (!className || className.includes('trailingbreak')) {
                    br.remove();
                }
            });
            cell.querySelectorAll('font').forEach((fontEl) => unwrapElement(fontEl));
            cell.querySelectorAll('span').forEach((spanEl) => {
                const hasStructuralAttr = spanEl.getAttribute('class') || spanEl.getAttribute('id') || (spanEl.dataset && Object.keys(spanEl.dataset).length);
                if (hasStructuralAttr) return;
                const style = spanEl.getAttribute('style') || '';
                if (!style || WORD_STYLE_REGEX.test(style)) {
                    unwrapElement(spanEl);
                }
            });
            cell.childNodes.forEach((node) => {
                if (node.nodeType === TEXT_NODE) {
                    node.textContent = node.textContent.replace(/\u00A0/g, ' ');
                }
            });
        });
        const firstRow = table.querySelector('tr');
        if (firstRow) {
            Array.from(firstRow.children).forEach((cell) => {
                if (cell.nodeName === 'TH') return;
                // Del mismo documento que la celda: el contenedor puede ser inerte.
                const th = (cell.ownerDocument || document).createElement('th');
                removeAttributes(th, TABLE_SANITIZE_ATTRS);
                th.innerHTML = cell.innerHTML;
                cell.replaceWith(th);
            });
        }
    });
}

/*
  Contenedor inerte para examinar HTML de fuera (portapapeles, importaciones).

  Un <div> hecho con document.createElement pertenece al documento de la p\u00E1gina:
  al asignarle innerHTML sus <img> empiezan a cargarse aunque el div no est\u00E9
  insertado, y el `onerror` de un HTML pegado llegar\u00EDa a ejecutarse. En un
  documento de createHTMLDocument no se carga ning\u00FAn recurso.
*/
function createInertContainer(html) {
    const inertDocument = document.implementation.createHTMLDocument('');
    inertDocument.body.innerHTML = typeof html === 'string' ? html : '';
    return inertDocument.body;
}

// Los espacios y caracteres de control parten esquemas como `java\tscript:`.
const UNSAFE_URL_SCHEME = /^(?:javascript:|vbscript:|data:text\/html)/i;
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'action', 'formaction']);

function hasUnsafeUrlScheme(value) {
    return UNSAFE_URL_SCHEME.test(String(value || '').replace(/[\u0000-\u0020]/g, ''));
}

/*
  Quita de un HTML ajeno lo que ejecuta c\u00F3digo: manejadores en l\u00EDnea (`onerror`,
  `onclick`\u2026), esquemas de URL ejecutables y las etiquetas que traen su propio
  contenido activo. No es un saneador general \u2014el Markdown que escribe el propio
  usuario no pasa por aqu\u00ED\u2014, sino la aduana de lo que llega de fuera.
*/
function stripUnsafeHtml(html) {
    if (typeof html !== 'string' || !html.includes('<')) return html;
    const container = createInertContainer(html);
    container.querySelectorAll('script, iframe, object, embed').forEach((node) => node.remove());
    container.querySelectorAll('*').forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            if (name.startsWith('on')) {
                element.removeAttribute(attribute.name);
            } else if (URL_ATTRIBUTES.has(name) && hasUnsafeUrlScheme(attribute.value)) {
                element.removeAttribute(attribute.name);
            }
        });
    });
    return container.innerHTML;
}

function sanitizeHtmlForMarkdown(html) {
    if (typeof html !== 'string' || !html.trim()) return html;
    if (!html.toLowerCase().includes('<table')) {
        return html.replace(/\u00A0/g, ' ');
    }
    const container = createInertContainer(html);
    cleanWordTables(container);
    return container.innerHTML.replace(/\u00A0/g, ' ');
}

const MARKDOWN_ESCAPABLE_CHARS = new Set("!\"#$%&'()*+,./:;<=>?@[\\]^_`{|}~-");
const MATH_PLACEHOLDER_PREFIX = '@@EDIMATH';
const MATH_PLACEHOLDER_SUFFIX = '@@';
const MATH_DELIMITERS = [
    { open: '\\[', close: '\\]' },
    { open: '\\(', close: '\\)' },
    { open: '$$', close: '$$' },
    { open: '$', close: '$' }
];

function preserveMarkdownEscapes(text) {
    if (typeof text !== 'string') return '';
    let result = '';
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '\\') {
            const next = text[i + 1];
            if (next && MARKDOWN_ESCAPABLE_CHARS.has(next)) {
                result += '\\' + next;
                i += 1;
                continue;
            }
        }
        result += char;
    }
    return result;
}

function protectMathSegments(text) {
    if (typeof text !== 'string' || text.length === 0) {
        return { text: '', segments: [] };
    }
    const segments = [];
    const pattern = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?!\s)([^$]+?)\$/g;
    const protectedText = text.replace(pattern, match => {
        const placeholder = `${MATH_PLACEHOLDER_PREFIX}${segments.length}${MATH_PLACEHOLDER_SUFFIX}`;
        segments.push(match);
        return placeholder;
    });
    return { text: protectedText, segments };
}

function restoreMathSegments(content, segments) {
    if (!content || !segments.length) return content;
    const placeholderPattern = new RegExp(`${MATH_PLACEHOLDER_PREFIX}(\\d+)${MATH_PLACEHOLDER_SUFFIX}`, 'g');
    return content.replace(placeholderPattern, (_, index) => segments[Number(index)] ?? '');
}

function parseMathSegmentInfo(segment) {
    if (typeof segment !== 'string' || segment.length === 0) return null;
    for (const { open, close } of MATH_DELIMITERS) {
        if (segment.startsWith(open) && segment.endsWith(close)) {
            return {
                open,
                close,
                type: (open === '$$' || open === '\\[') ? 'display' : 'inline'
            };
        }
    }
    return null;
}

function annotateRenderedMath(container, mathSegments) {
    if (!container || typeof container.querySelectorAll !== 'function') return;
    const displayQueue = [];
    const inlineQueue = [];
    if (Array.isArray(mathSegments) && mathSegments.length) {
        for (const segment of mathSegments) {
            const meta = parseMathSegmentInfo(segment);
            if (!meta) continue;
            const payload = { ...meta, source: segment };
            if (payload.type === 'display') displayQueue.push(payload);
            else inlineQueue.push(payload);
        }
    }
    const applyMeta = (node, meta) => {
        if (!meta) {
            node.removeAttribute('data-edimath-open');
            node.removeAttribute('data-edimath-close');
            node.removeAttribute('data-edimath-source');
            return;
        }
        node.dataset.edimathOpen = meta.open;
        node.dataset.edimathClose = meta.close;
        node.dataset.edimathSource = meta.source;
    };
    const displayNodes = Array.from(container.querySelectorAll('.katex-display'));
    displayNodes.forEach(node => applyMeta(node, displayQueue.shift() || null));
    const inlineNodes = Array.from(container.querySelectorAll('span.katex'))
        .filter(node => !node.closest('.katex-display'));
    inlineNodes.forEach(node => applyMeta(node, inlineQueue.shift() || null));
}

function normalizeMathEscapes(markdown) {
    if (typeof markdown !== 'string' || !markdown.includes('\\')) return markdown;
    const { text: contentWithoutMath, segments } = protectMathSegments(markdown);
    if (!segments.length) return markdown;

    const normalizedSegments = segments.map(segment => {
        let updated = segment.replace(/\\\\([A-Za-z])/g, '\\$1');
        updated = updated.replace(/\\([_^])/g, '$1');
        updated = updated.replace(/\\([-+*/=\\.])/g, '$1');
        updated = updated.replace(/\\(\d)/g, '$1');
        for (const { open, close } of MATH_DELIMITERS) {
            if (updated.startsWith(open) && updated.endsWith(close) && updated.length > open.length + close.length) {
                const body = updated.slice(open.length, updated.length - close.length);
                const chars = Array.from(body);
                let i = 0;
                const result = [];
                while (i < chars.length) {
                    const ch = chars[i];
                    if (ch === '\\' && i + 1 < chars.length && (chars[i + 1] === '[' || chars[i + 1] === ']')) {
                        const prev = chars.slice(Math.max(0, i - 5), i).join('');
                        if (!/(?:\\begin|\\end)$/.test(prev)) {
                            result.push(chars[i + 1]);
                            i += 2;
                            continue;
                        }
                    }
                    result.push(ch);
                    i += 1;
                }
                updated = `${open}${result.join('')}${close}`;
                break;
            }
        }
        return updated;
    });
    return restoreMathSegments(contentWithoutMath, normalizedSegments);
}

function normalizeNumberedListEscapes(markdown) {
    if (typeof markdown !== 'string' || markdown.indexOf('\\.') === -1) return markdown;
    return markdown.replace(/(\d)\\\.(?=\s)/g, '$1.');
}

function estimateBase64Bytes(data) {
    if (typeof data !== 'string' || data.length === 0) return 0;
    const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
}

function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${formatted} ${units[idx]}`;
}

function escapeRegexSpecials(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBase64CollapsedState(text) {
    const placeholders = new Map();
    let counter = 0;
    const collapsedText = (text || '').replace(BASE64_IMAGE_REGEX, (match, alt, prefix, mime, data) => {
        if (!data) return match;
        counter += 1;
        const placeholder = `${BASE64_PLACEHOLDER_PREFIX}${counter}__`;
        const approxBytes = estimateBase64Bytes(data);
        placeholders.set(placeholder, {
            data,
            prefix,
            mime,
            approxBytes,
            fallbackAlt: (alt || '').trim()
                || formatTranslation('base64_image_default_alt', 'Imagen {number}', { number: counter })
        });
        return match.replace(data, placeholder);
    });
    return { collapsedText, placeholders, total: counter };
}

function expandBase64Placeholders(text, placeholders) {
    if (!text || !placeholders || placeholders.size === 0) return text || '';
    return text.replace(BASE64_PLACEHOLDER_REGEX, (placeholder) => {
        const entry = placeholders.get(placeholder);
        return entry ? entry.data : placeholder;
    });
}

function findPlaceholderContext(placeholder) {
    if (!markdownEditor || typeof markdownEditor.getDisplayValue !== 'function') return null;
    const displayValue = markdownEditor.getDisplayValue();
    if (!displayValue || !placeholder) return null;
    const escapedPlaceholder = escapeRegexSpecials(placeholder);
    const contextRegex = new RegExp(`(!\\[[^\\]]*?\\]\\([^)]*${escapedPlaceholder}[^)]*\\))`, 'm');
    const match = contextRegex.exec(displayValue);
    if (!match) return null;
    const snippet = match[1];
    const altMatch = /!\[([^\]]*?)\]/.exec(snippet);
    const alt = altMatch ? altMatch[1] : '';
    return { snippet, alt };
}

function updateBase64Ui(state) {
    currentBase64State = state || { placeholders: new Map(), total: 0 };
    if (!base64UiContainer || !base64UiList || !base64UiCountLabel) return;
    const entries = currentBase64State.placeholders ? Array.from(currentBase64State.placeholders.entries()) : [];
    const hasEntries = entries.length > 0;
    base64UiContainer.classList.toggle('hidden', !hasEntries);
    base64UiCountLabel.textContent = hasEntries
        ? formatTranslation(
            entries.length === 1 ? 'base64_count_singular' : 'base64_count_plural',
            entries.length === 1 ? '{count} imagen' : '{count} imágenes',
            { count: entries.length }
        )
        : getTranslation('base64_count_empty', '0 encontradas');
    base64UiList.innerHTML = '';
    entries.forEach(([placeholder, info], index) => {
        const context = findPlaceholderContext(placeholder);
        const defaultAlt = formatTranslation('base64_image_default_alt', 'Imagen {number}', { number: index + 1 });
        const altText = (context && context.alt) || info.fallbackAlt || defaultAlt;
        const typeLabel = info.mime ? info.mime.toUpperCase() : 'IMG';
        const sizeLabel = formatBytes(info.approxBytes);
        const item = document.createElement('div');
        item.className = 'base64-hidden-item';
        item.setAttribute('role', 'listitem');
        const details = document.createElement('div');
        const titleEl = document.createElement('h4');
        titleEl.textContent = altText || defaultAlt;
        const metaEl = document.createElement('p');
        metaEl.textContent = `${typeLabel} · ${sizeLabel}`;
        details.append(titleEl, metaEl);
        const actions = document.createElement('div');
        actions.className = 'base64-hidden-actions';
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'base64-hidden-btn';
        viewBtn.textContent = getTranslation('base64_view_code_btn', 'Ver código');
        viewBtn.addEventListener('click', () => openBase64Modal(placeholder));
        actions.appendChild(viewBtn);
        item.append(details, actions);
        base64UiList.appendChild(item);
    });
}

window.__updateBase64UiLabels = () => updateBase64Ui(currentBase64State);

function openBase64Modal(placeholder) {
    if (!base64ModalOverlayEl || !base64ModalTextarea || !base64ModalCopyBtn) return;
    const entry = currentBase64State.placeholders ? currentBase64State.placeholders.get(placeholder) : null;
    if (!entry) return;
    const context = findPlaceholderContext(placeholder);
    const snippetWithPlaceholder = context ? context.snippet : `![${entry.fallbackAlt || 'imagen'}](${entry.prefix}${placeholder})`;
    base64ModalTextarea.value = snippetWithPlaceholder.replace(placeholder, entry.data);
    base64ModalOverlayEl.classList.remove('hidden');
    base64ModalOverlayEl.classList.add('flex');
    currentBase64ModalPlaceholder = placeholder;
    setTimeout(() => base64ModalTextarea.focus(), 30);
}

function closeBase64Modal() {
    if (!base64ModalOverlayEl) return;
    base64ModalOverlayEl.classList.add('hidden');
    base64ModalOverlayEl.classList.remove('flex');
    currentBase64ModalPlaceholder = null;
}

function requestForcedMarkdownUpdate() {
    forceMarkdownUpdate = true;
    if (typeof updateMarkdown === 'function') {
        updateMarkdown();
    }
}

function captureMarkdownSelectionFromTextarea() {
    if (!markdownTextareaEl || typeof markdownTextareaEl.selectionStart !== 'number' || typeof markdownTextareaEl.selectionEnd !== 'number') {
        return cloneSelection(lastMarkdownSelection);
    }
    lastMarkdownSelection = {
        start: markdownTextareaEl.selectionStart,
        end: markdownTextareaEl.selectionEnd
    };
    return cloneSelection(lastMarkdownSelection);
}

function getLastMarkdownSelection() {
    return cloneSelection(lastMarkdownSelection);
}

function extractClipboardFragment(html) {
    if (typeof html !== 'string' || html.trim().length === 0) return '';
    const startMarker = '<!--StartFragment-->';
    const endMarker = '<!--EndFragment-->';
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        return html.slice(startIdx + startMarker.length, endIdx).trim();
    }
    return html.trim();
}

function hasMeaningfulHtmlContent(html) {
    if (typeof html !== 'string' || html.trim().length === 0) return false;
    const fragment = extractClipboardFragment(html);
    if (!fragment) return false;
    const cleaned = fragment.replace(/<!DOCTYPE[\s\S]*?>/gi, '').trim();
    return /<([a-z][\w-]*)(\s|>)/i.test(cleaned);
}

function isPlainTextClipboardHtml(fragment) {
    if (typeof fragment !== 'string' || fragment.trim().length === 0) return false;
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
    const container = createInertContainer(fragment);
    const elements = container.querySelectorAll('*');
    if (elements.length === 0) return false;
    for (const element of elements) {
        const tagName = element.tagName ? element.tagName.toLowerCase() : '';
        if (!SIMPLE_TEXT_HTML_TAGS.has(tagName)) {
            return false;
        }
        if (element.attributes && element.attributes.length > 0) {
            return false;
        }
    }
    return true;
}

function classifyClipboardDataPayload(clipboardData) {
    if (!clipboardData || typeof clipboardData.getData !== 'function') return null;
    const plain = clipboardData.getData('text/plain') || '';
    const rawHtml = clipboardData.getData('text/html') || '';
    const htmlFragment = extractClipboardFragment(rawHtml);
    const files = [];
    if (clipboardData.files) {
        files.push(...Array.from(clipboardData.files));
    }
    // Chromium, Firefox y los WebView de escritorio no siempre publican una
    // imagen pegada en `files`; en esos casos sí aparece como un item.
    if (clipboardData.items) {
        Array.from(clipboardData.items).forEach((item) => {
            if (!item || item.kind !== 'file' || typeof item.getAsFile !== 'function') return;
            const file = item.getAsFile();
            if (file && !files.includes(file)) files.push(file);
        });
    }
    const imageFiles = files.filter(file => file && file.size > 0 && String(file.type || '').toLowerCase().startsWith('image/'));
    const hasFiles = imageFiles.length > 0;
    const hasRtf = clipboardData.types && Array.from(clipboardData.types).some(type => String(type).toLowerCase() === 'text/rtf');
    const isRichHtml = hasMeaningfulHtmlContent(rawHtml);
    const htmlLooksPlain = htmlFragment && isPlainTextClipboardHtml(htmlFragment);
    if (hasFiles || hasRtf) {
        return { target: 'html', html: htmlFragment, plain, files: imageFiles };
    }
    if (isRichHtml && (!htmlLooksPlain || !plain)) {
        return { target: 'html', html: htmlFragment, plain, files: imageFiles };
    }
    if (plain) {
        return { target: 'markdown', plain };
    }
    if (htmlFragment) {
        return { target: 'html', html: htmlFragment, plain, files: imageFiles };
    }
    return null;
}

function escapeHtmlEntities(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function convertPlainTextToHtml(text) {
    if (typeof text !== 'string' || !text) return '';
    const escaped = escapeHtmlEntities(text);
    return escaped.replace(/\r\n|\r|\n/g, '<br>');
}

function escapeAttributeValue(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function isPasteTargetWithinEditors(target) {
    if (!target) return false;
    if (markdownTextareaEl && (target === markdownTextareaEl || markdownTextareaEl.contains(target))) {
        return true;
    }
    if (htmlOutputEl && (target === htmlOutputEl || htmlOutputEl.contains(target))) {
        return true;
    }
    if (htmlEditorWrapperEl && htmlEditorWrapperEl.contains(target)) {
        return true;
    }
    return false;
}

function convertHtmlSnippetToMarkdown(html, plain) {
    const plainNormalized = typeof plain === 'string' && plain ? normalizeNewlines(plain) : '';
    const sanitized = typeof html === 'string' ? sanitizeHtmlForMarkdown(html) : '';
    if (turndownService && sanitized && sanitized.trim()) {
        try {
            const mdRaw = turndownService.turndown(sanitized);
            if (mdRaw && mdRaw.trim()) {
                const mathNormalized = normalizeMathEscapes(mdRaw);
                const markdownResult = normalizeNumberedListEscapes(mathNormalized);
                return markdownResult;
            }
        } catch (err) {
            console.warn('No se pudo convertir HTML a Markdown:', err);
        }
    }
    if (plainNormalized) {
        return plainNormalized;
    }
    return '';
}

function insertPlainIntoMarkdownEditor(text, selectionOverride = null) {
    if (!markdownEditor || typeof markdownEditor.replaceSelection !== 'function') return;
    const normalized = normalizeNewlines(text || '');
    const selectionSnapshot = selectionOverride ? cloneSelection(selectionOverride) : captureMarkdownSelectionFromTextarea();
    const fallbackSelection = selectionSnapshot || getLastMarkdownSelection();
    const selectionStart = fallbackSelection && typeof fallbackSelection.start === 'number'
        ? fallbackSelection.start
        : (markdownTextareaEl && typeof markdownTextareaEl.value === 'string' ? markdownTextareaEl.value.length : 0);
    const selectionEnd = fallbackSelection && typeof fallbackSelection.end === 'number'
        ? fallbackSelection.end
        : selectionStart;
    if (typeof markdownEditor.focus === 'function') {
        markdownEditor.focus();
    }
    if (markdownTextareaEl && typeof markdownTextareaEl.setSelectionRange === 'function') {
        try {
            markdownTextareaEl.setSelectionRange(selectionStart, selectionEnd);
        } catch (err) {
            /* ignore */
        }
    }
    markdownEditor.replaceSelection(normalized);
    const hasBase64 = BASE64_TEST_REGEX.test(normalized);
    const caretTarget = hasBase64 ? selectionStart : selectionStart + normalized.length;
    if (markdownTextareaEl && typeof markdownTextareaEl.setSelectionRange === 'function') {
        try {
            markdownTextareaEl.setSelectionRange(caretTarget, caretTarget);
        } catch (_) {
            /* ignore */
        }
    }
    lastMarkdownSelection = { start: caretTarget, end: caretTarget };
    if (hasBase64 && typeof markdownEditor.recollapseBase64 === 'function') {
        const postCollapseTarget = caretTarget;
        requestAnimationFrame(() => {
            markdownEditor.recollapseBase64();
            requestAnimationFrame(() => {
                if (markdownTextareaEl && typeof markdownTextareaEl.setSelectionRange === 'function') {
                    try {
                        markdownTextareaEl.setSelectionRange(postCollapseTarget, postCollapseTarget);
                    } catch (_) {
                        /* ignore */
                    }
                }
                lastMarkdownSelection = { start: postCollapseTarget, end: postCollapseTarget };
            });
        });
    }
}

function isHtmlPreviewVisible() {
    return Boolean(htmlOutputEl && htmlOutputEl.offsetParent !== null && htmlOutputEl.style.display !== 'none');
}

function captureHtmlSelection() {
    if (!htmlOutputEl) return;
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range && htmlOutputEl.contains(range.startContainer) && htmlOutputEl.contains(range.endContainer)) {
        savedHtmlSelection = range.cloneRange();
    }
}

function placeCaretAtEnd(element) {
    if (!element) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = document.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    savedHtmlSelection = range.cloneRange();
}

function restoreHtmlSelection() {
    if (!htmlOutputEl) return;
    const selection = document.getSelection();
    if (!selection) return;
    if (savedHtmlSelection && htmlOutputEl.contains(savedHtmlSelection.startContainer) && htmlOutputEl.contains(savedHtmlSelection.endContainer)) {
        selection.removeAllRanges();
        selection.addRange(savedHtmlSelection.cloneRange());
        return;
    }
    placeCaretAtEnd(htmlOutputEl);
}

function notifyHtmlPreviewChanged() {
    if (!htmlOutputEl) return;
    const evt = typeof InputEvent === 'function'
        ? new InputEvent('input', { bubbles: true })
        : new Event('input', { bubbles: true });
    htmlOutputEl.dispatchEvent(evt);
}

function insertHtmlIntoPreview({ html, plain }, { triggerSync = false } = {}) {
    if (!htmlOutputEl) return;
    // Lo pegado viene de fuera y va a parar al DOM de la aplicación.
    const markup = stripUnsafeHtml((html && html.trim()) ? html : convertPlainTextToHtml(plain));
    if (!markup) return;
    const previouslyFocused = document.activeElement;
    htmlOutputEl.focus({ preventScroll: true });
    restoreHtmlSelection();
    if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
        document.execCommand('insertHTML', false, markup);
    } else {
        const selection = document.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const fragment = range.createContextualFragment(markup);
            range.insertNode(fragment);
            range.collapse(false);
        } else {
            htmlOutputEl.insertAdjacentHTML('beforeend', markup);
            placeCaretAtEnd(htmlOutputEl);
        }
    }
    captureHtmlSelection();
    notifyHtmlPreviewChanged();
    if (previouslyFocused && previouslyFocused !== htmlOutputEl && (!htmlOutputEl.contains(previouslyFocused))) {
        try {
            previouslyFocused.focus({ preventScroll: true });
        } catch (_) {
            previouslyFocused.focus();
        }
    }
    if (triggerSync) {
        requestForcedMarkdownUpdate();
    }
}

function insertHtmlIntoCodeEditor(content, { triggerSync = false } = {}) {
    if (!htmlEditor) return;
    const snippet = typeof content === 'string' ? content : '';
    if (!snippet) return;
    const previouslyFocused = document.activeElement;
    htmlEditor.focus();
    if (typeof htmlEditor.replaceSelection === 'function') {
        htmlEditor.replaceSelection(snippet);
    } else if (typeof htmlEditor.setValue === 'function' && typeof htmlEditor.getValue === 'function') {
        htmlEditor.setValue((htmlEditor.getValue() || '') + snippet);
    }
    if (previouslyFocused) {
        const wrapper = htmlEditorWrapperEl || (htmlEditor.getWrapperElement ? htmlEditor.getWrapperElement() : null);
        const shouldRestore = wrapper ? !wrapper.contains(previouslyFocused) : true;
        if (shouldRestore && previouslyFocused !== document.activeElement) {
            try {
                previouslyFocused.focus({ preventScroll: true });
            } catch (_) {
                previouslyFocused.focus();
            }
        }
    }
    if (triggerSync) {
        requestForcedMarkdownUpdate();
    }
}

function insertHtmlContent({ html, plain }, { mirrorToMarkdown = false, markdownSelection = null, triggerHtmlToMarkdownSync = false } = {}) {
    const preparedHtml = typeof html === 'string' ? html.trim() : '';
    const fallback = preparedHtml || plain || '';
    const shouldTriggerSync = triggerHtmlToMarkdownSync && !mirrorToMarkdown;
    const selectionSnapshot = markdownSelection ? cloneSelection(markdownSelection) : null;
    if (isHtmlPreviewVisible()) {
        insertHtmlIntoPreview({ html: preparedHtml, plain }, { triggerSync: shouldTriggerSync });
    } else if (fallback) {
        insertHtmlIntoCodeEditor(fallback, { triggerSync: shouldTriggerSync });
    }
    if (mirrorToMarkdown) {
        const markdownSnippet = convertHtmlSnippetToMarkdown(preparedHtml || '', plain);
        if (markdownSnippet) {
            insertPlainIntoMarkdownEditor(markdownSnippet, selectionSnapshot);
        }
    }
}

async function insertFilesIntoHtmlTarget(files, { mirrorToMarkdown = false, markdownSelection = null, triggerHtmlToMarkdownSync = false } = {}) {
    if (!files || files.length === 0) return;
    let selectionSnapshot = markdownSelection ? cloneSelection(markdownSelection) : null;
    const shouldTriggerSync = triggerHtmlToMarkdownSync && !mirrorToMarkdown;
    for (const file of files) {
        const dataUrl = await readFileAsDataUrl(file).catch(() => null);
        if (!dataUrl) continue;
        const alt = file && file.name ? file.name : 'imagen';
        const imgTag = `<img src="${dataUrl}" alt="${escapeAttributeValue(alt)}">`;
        if (isHtmlPreviewVisible()) {
            insertHtmlIntoPreview({ html: imgTag }, { triggerSync: shouldTriggerSync });
        } else {
            insertHtmlIntoCodeEditor(imgTag, { triggerSync: shouldTriggerSync });
        }
        if (mirrorToMarkdown) {
            const markdownSnippet = convertHtmlSnippetToMarkdown(imgTag);
            if (markdownSnippet) {
                insertPlainIntoMarkdownEditor(markdownSnippet, selectionSnapshot);
                selectionSnapshot = null;
            }
        }
    }
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No se recibió ningún archivo.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

function handleEditorPaste(event) {
    if (!event || event.defaultPrevented) return;
    if (!isPasteTargetWithinEditors(event.target)) return;
    const payload = classifyClipboardDataPayload(event.clipboardData);
    const markdownHadFocus = document.activeElement === markdownTextareaEl;
    const selectionSnapshot = markdownHadFocus ? cloneSelection(getLastMarkdownSelection()) : null;
    if (!payload) {
        const platform = window.EdiMarkPlatform;
        if (!platform?.isDesktop || typeof platform.readClipboardImage !== 'function') return;
        event.preventDefault();
        readNativeClipboardImageFile()
            .then((file) => {
                if (!file) return;
                return insertFilesIntoHtmlTarget([file], {
                    mirrorToMarkdown: markdownHadFocus,
                    markdownSelection: selectionSnapshot,
                    triggerHtmlToMarkdownSync: !markdownHadFocus
                });
            })
            .catch(err => console.error('Error pegando la imagen del portapapeles nativo:', err));
        return;
    }
    event.preventDefault();
    if (payload.target === 'markdown' && payload.plain) {
        insertPlainIntoMarkdownEditor(payload.plain, selectionSnapshot);
        return;
    }
    if (payload.target === 'html') {
        if (payload.files && payload.files.length) {
            insertFilesIntoHtmlTarget(payload.files, {
                mirrorToMarkdown: markdownHadFocus,
                markdownSelection: selectionSnapshot,
                triggerHtmlToMarkdownSync: !markdownHadFocus
            }).catch(err => console.error('Error insertando archivos desde el portapapeles:', err));
        } else {
            insertHtmlContent({ html: payload.html, plain: payload.plain }, {
                mirrorToMarkdown: markdownHadFocus,
                markdownSelection: selectionSnapshot,
                triggerHtmlToMarkdownSync: !markdownHadFocus
            });
        }
    }
}

function blobToFile(blob, nameFallback) {
    if (!blob) return null;
    const filename = nameFallback || `clipboard-${Date.now()}`;
    if (typeof File === 'function') {
        try {
            return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
        } catch (err) {
            console.warn('No se pudo crear File desde Blob:', err);
        }
    }
    const cloned = blob.slice(0, blob.size, blob.type || 'application/octet-stream');
    cloned.name = filename;
    return cloned;
}

async function readNativeClipboardImageFile() {
    const platform = window.EdiMarkPlatform;
    if (!platform?.isDesktop || typeof platform.readClipboardImage !== 'function') return null;
    const nativeImage = await platform.readClipboardImage();
    const width = Number(nativeImage?.size?.width || 0);
    const height = Number(nativeImage?.size?.height || 0);
    if (!width || !height || !nativeImage?.rgba) return null;
    const rgba = nativeImage.rgba instanceof Uint8Array
        ? nativeImage.rgba
        : new Uint8Array(nativeImage.rgba);
    if (rgba.byteLength !== width * height * 4) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob ? blobToFile(blob, `clipboard-image-${Date.now()}.png`) : null;
}

async function readClipboardForButton() {
    if (navigator.clipboard?.read) {
        try {
            const items = await navigator.clipboard.read();
            let html = '';
            let plain = '';
            const files = [];
            for (const item of items) {
                for (const type of item.types) {
                    let blob;
                    try {
                        blob = await item.getType(type);
                    } catch (err) {
                        console.warn('No se pudo obtener el tipo del portapapeles:', type, err);
                        continue;
                    }
                    const lowerType = String(type).toLowerCase();
                    if (lowerType === 'text/html') {
                        const text = await blob.text();
                        if (!html) html = text;
                    } else if (lowerType === 'text/plain') {
                        const text = await blob.text();
                        if (!plain) plain = text;
                    } else if (lowerType.startsWith('image/')) {
                        const ext = lowerType.split('/')[1] || 'png';
                        const file = blobToFile(blob, `clipboard-image-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
                        if (file) files.push(file);
                    }
                }
            }
            if (html || plain || files.length) {
                return { html, plain, files };
            }
        } catch (err) {
            console.warn('navigator.clipboard.read falló:', err);
        }
    }
    if (navigator.clipboard?.readText) {
        try {
            const plain = await navigator.clipboard.readText();
            if (plain) return { plain };
        } catch (err) {
            console.warn('navigator.clipboard.readText falló:', err);
        }
    }
    try {
        const nativeImage = await readNativeClipboardImageFile();
        if (nativeImage) return { files: [nativeImage] };
    } catch (err) {
        console.warn('No se pudo leer la imagen del portapapeles nativo:', err);
    }
    return null;
}

function classifyManualClipboardPayload(data) {
    if (!data) return null;
    const plain = data.plain || '';
    const html = data.html || '';
    const files = Array.isArray(data.files) ? data.files : [];
    if (!plain && !html && files.length < 1) return null;
    const fauxClipboard = {
        getData(type) {
            if (type === 'text/plain') return plain;
            if (type === 'text/html') return html;
            return '';
        },
        files,
        types: [
            ...(html ? ['text/html'] : []),
            ...(plain ? ['text/plain'] : []),
            ...files.map(file => file?.type || 'application/octet-stream')
        ]
    };
    return classifyClipboardDataPayload(fauxClipboard);
}

async function handlePasteButtonClick(button) {
    if (!button || button.disabled) return;
    const hasNativeClipboard = Boolean(
        window.EdiMarkPlatform?.isDesktop
        && typeof window.EdiMarkPlatform.readClipboardImage === 'function'
    );
    if (!navigator.clipboard && !hasNativeClipboard) {
        alert(getTranslation('clipboard_button_unsupported', 'Tu navegador no permite leer el portapapeles desde un botón. Usa Ctrl+V.'));
        return;
    }
    const previousDisabled = button.disabled;
    button.disabled = true;
    button.classList.add('opacity-70');
    try {
        const clipboardContent = await readClipboardForButton();
        if (!clipboardContent) {
            alert(getTranslation('clipboard_read_error', 'No pude leer el portapapeles. Usa Ctrl+V como alternativa.'));
            return;
        }
        const payload = classifyManualClipboardPayload(clipboardContent);
        if (!payload) {
            alert(getTranslation('clipboard_empty_or_unsupported', 'El portapapeles está vacío o en un formato no soportado.'));
            return;
        }
        const markdownHadFocus = document.activeElement === markdownTextareaEl;
        const selectionSnapshot = markdownHadFocus ? cloneSelection(getLastMarkdownSelection()) : null;
        if (payload.target === 'markdown' && payload.plain) {
            insertPlainIntoMarkdownEditor(payload.plain, selectionSnapshot);
            return;
        }
        if (payload.target === 'html') {
            if (payload.files && payload.files.length) {
                insertFilesIntoHtmlTarget(payload.files, {
                    mirrorToMarkdown: markdownHadFocus,
                    markdownSelection: selectionSnapshot,
                    triggerHtmlToMarkdownSync: !markdownHadFocus
                }).catch(err => console.error('Error insertando archivos desde el botón de pegado:', err));
            } else {
                insertHtmlContent({ html: payload.html, plain: payload.plain }, {
                    mirrorToMarkdown: markdownHadFocus,
                    markdownSelection: selectionSnapshot,
                    triggerHtmlToMarkdownSync: !markdownHadFocus
                });
            }
        }
    } catch (err) {
        console.error('Error al pegar desde el botón:', err);
        alert('No se pudo acceder al portapapeles. Usa Ctrl+V como alternativa.');
    } finally {
        button.classList.remove('opacity-70');
        button.disabled = previousDisabled;
    }
}

let docs = [];
let currentId = null;
// Último contenido escrito en el almacenamiento local, por documento.
const lastAutosavedById = new Map();
let currentLayout;
/*
  Adelanta el repintado pendiente de la vista previa. Lo define el bloque de
  sincronización dentro de window.onload; hasta entonces no hay nada que
  adelantar, de ahí que arranque como una función vacía.
*/
let flushPendingPreviewRepaint = () => {};
let syncEnabled = true;
let skipNextMarkdownSync = false;
let skipNextCursorSync = false;
let htmlEditorSyncScheduled = false;
let markdownCharCounterEl = null;
let skipNextHtmlEditorSync = false;
let markdownControlsDisabled = false;
let markdownControlButtons = [];
let headingOptionsEl = null;
let formulaOptionsEl = null;
let latexImportInProgress = false;
let latexImportModalOverlay = null;
let latexImportTextarea = null;
let latexImportStatusEl = null;
let latexImportConvertBtn = null;
let latexImportCancelBtn = null;
let suppressNextTabClick = false;
const BINARY_IMPORT_FORMATS = new Set(['docx', 'odt', 'epub']);
const IMPORT_EXTENSION_MAP = new Map([
    ['tex', 'latex'],
    ['latex', 'latex'],
    ['ltx', 'latex'],
    ['docx', 'docx'],
    ['odt', 'odt'],
    ['epub', 'epub'],
    ['html', 'html'],
    ['htm', 'html'],
    ['xhtml', 'html'],
]);

/*
  Autoguardado de un documento concreto.

  El temporizador solo alcanza a la pestaña activa, así que cualquier punto en
  el que un documento deje de serlo —cambio de pestaña, cierre de la página—
  tiene que volcarlo antes: si no, lo escrito desde el último tic se pierde sin
  aviso y la pestaña vuelve con el contenido viejo al recargar.

  Escribe solo cuando el texto ha cambiado, que con imágenes base64 incrustadas
  es una diferencia real de coste.
*/
function autosaveDoc(id, content) {
    if (!id || typeof content !== 'string') return;
    if (lastAutosavedById.get(id) === content) return;
    if (safeLocalStorageSet(`${AUTOSAVE_KEY_PREFIX}-${id}`, content)) {
        lastAutosavedById.set(id, content);
    }
}

// Vuelca el documento abierto tal y como está ahora mismo en el editor.
function autosaveCurrentDoc() {
    if (!currentId || !markdownEditor) return;
    const content = markdownEditor.getValue();
    const doc = docs.find(d => d.id === currentId);
    if (doc) doc.md = content;
    autosaveDoc(currentId, content);
}

function getTranslation(key, fallback) {
    const catalog = window.__edimarkTranslations;
    if (catalog && Object.prototype.hasOwnProperty.call(catalog, key)) {
        return catalog[key];
    }
    return fallback;
}

function formatTranslation(key, fallback, values = {}) {
    return Object.entries(values).reduce(
        (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
        getTranslation(key, fallback)
    );
}

function createTextareaEditor(textarea) {
    textarea.value = normalizeNewlines(textarea.value || '');
    textarea.classList.add('markdown-textarea');
    textarea.setAttribute('spellcheck', 'true');
    textarea.setAttribute('wrap', 'soft');

    const parent = textarea.parentNode;
    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-textarea-wrapper';
    if (parent) {
        parent.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);
    }

    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'markdown-textarea-highlights';
    const highlightContent = document.createElement('pre');
    highlightContent.className = 'markdown-textarea-highlights-content';
    highlightContent.setAttribute('aria-hidden', 'true');
    highlightContent.innerHTML = '&#8203;';
    highlightLayer.appendChild(highlightContent);
    wrapper.insertBefore(highlightLayer, textarea);

    const changeHandlers = new Set();
    const cursorHandlers = new Set();
    const INDENT = '  ';
    let highlightMatches = [];
    let highlightCurrent = -1;
    let highlightQuery = null;
    const HISTORY_LIMIT = 200;
    const historyStack = [];
    let historyIndex = -1;
    let suppressHistory = false;

    function syncHighlightMetrics() {
        const scrollbarWidth = Math.max(0, textarea.offsetWidth - textarea.clientWidth);
        highlightLayer.style.right = `${scrollbarWidth}px`;
    }

    function normalizeTextareaContent() {
        const value = textarea.value;
        if (!value.includes('\r')) return value;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;
        const beforeStart = value.slice(0, start);
        const beforeEnd = value.slice(0, end);
        const normalizedValue = normalizeNewlines(value);
        const normalizedBeforeStart = normalizeNewlines(beforeStart);
        const normalizedBeforeEnd = normalizeNewlines(beforeEnd);
        const removedBeforeStart = beforeStart.length - normalizedBeforeStart.length;
        const removedBeforeEnd = beforeEnd.length - normalizedBeforeEnd.length;
        textarea.value = normalizedValue;
        const newStart = Math.max(0, start - removedBeforeStart);
        const newEnd = Math.max(0, end - removedBeforeEnd);
        textarea.setSelectionRange(newStart, newEnd);
        textarea.scrollTop = scrollTop;
        textarea.scrollLeft = scrollLeft;
        return normalizedValue;
    }

    function getValue() {
        return normalizeTextareaContent();
    }

    function clampOffset(offset) {
        return Math.max(0, Math.min(offset, getValue().length));
    }

    function offsetToPos(offset) {
        const text = getValue();
        const safeOffset = clampOffset(offset);
        let line = 0;
        let ch = 0;
        for (let i = 0; i < safeOffset; i += 1) {
            if (text.charCodeAt(i) === 10) {
                line += 1;
                ch = 0;
            } else {
                ch += 1;
            }
        }
        return { line, ch };
    }

    function posToOffset(pos) {
        if (!pos) return 0;
        const text = getValue();
        const { line = 0, ch = 0 } = pos;
        let currentLine = 0;
        let offset = 0;
        for (let i = 0; i < text.length; i += 1) {
            if (currentLine === line) {
                return clampOffset(offset + ch);
            }
            if (text.charCodeAt(i) === 10) {
                currentLine += 1;
                offset = i + 1;
            }
        }
        if (line === currentLine) {
            return clampOffset(offset + ch);
        }
        return clampOffset(offset);
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function buildAccentInsensitiveSource(query) {
        return query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
            .replace(/a/gi, match => match === 'A' ? '[AÀÁÂÄ]' : '[aàáâä]')
            .replace(/e/gi, match => match === 'E' ? '[EÈÉÊË]' : '[eèéêë]')
            .replace(/i/gi, match => match === 'I' ? '[IÌÍÎÏ]' : '[iìíîï]')
            .replace(/o/gi, match => match === 'O' ? '[OÒÓÔÖ]' : '[oòóôö]')
            .replace(/u/gi, match => match === 'U' ? '[UÙÚÛÜ]' : '[uùúûü]')
            .replace(/n/gi, match => match === 'N' ? '[NÑ]' : '[nñ]');
    }

    function cloneRegexWithGlobal(regex) {
        if (!(regex instanceof RegExp)) return null;
        const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
        return new RegExp(regex.source, flags);
    }

    function computeHighlights(queryOrRegex) {
        if (!queryOrRegex) return [];
        const regex = queryOrRegex instanceof RegExp
            ? cloneRegexWithGlobal(queryOrRegex)
            : new RegExp(buildAccentInsensitiveSource(queryOrRegex), 'gi');
        if (!regex) return [];
        const text = textarea.value;
        const matches = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + (match[0]?.length || 0);
            if (end > start) {
                matches.push({ start, end });
            }
            if (regex.lastIndex === match.index) {
                regex.lastIndex += 1;
            }
        }
        return matches;
    }

    function renderHighlights() {
        const text = textarea.value || '';
        if (!highlightMatches.length) {
            highlightContent.innerHTML = text ? escapeHtml(text) : '&#8203;';
            highlightLayer.classList.remove('has-highlights');
            syncScroll();
            return;
        }
        let html = '';
        let last = 0;
        highlightMatches.forEach((match, idx) => {
            const start = Math.max(0, Math.min(match.start, text.length));
            const end = Math.max(start, Math.min(match.end, text.length));
            if (end <= start) return;
            html += escapeHtml(text.slice(last, start));
            const segment = escapeHtml(text.slice(start, end)) || '&#8203;';
            const markClass = idx === highlightCurrent ? ' class="current"' : '';
            html += `<mark${markClass}>${segment}</mark>`;
            last = end;
        });
        html += escapeHtml(text.slice(last));
        highlightContent.innerHTML = html || '&#8203;';
        highlightLayer.classList.toggle('has-highlights', highlightMatches.length > 0);
        syncScroll();
    }

    function captureHistorySnapshot() {
        return {
            value: normalizeNewlines(textarea.value || ''),
            selectionStart: textarea.selectionStart,
            selectionEnd: textarea.selectionEnd,
            scrollTop: textarea.scrollTop,
            scrollLeft: textarea.scrollLeft
        };
    }

    function pushHistorySnapshot(force = false) {
        if (suppressHistory) return;
        const snapshot = captureHistorySnapshot();
        const last = historyStack[historyIndex];
        const valueChanged = !last || last.value !== snapshot.value;
        if (!force && !valueChanged) {
            if (last) {
                last.selectionStart = snapshot.selectionStart;
                last.selectionEnd = snapshot.selectionEnd;
                last.scrollTop = snapshot.scrollTop;
                last.scrollLeft = snapshot.scrollLeft;
            }
            return;
        }
        if (historyIndex < historyStack.length - 1) {
            historyStack.splice(historyIndex + 1);
        }
        historyStack.push(snapshot);
        if (historyStack.length > HISTORY_LIMIT) {
            historyStack.shift();
            historyIndex -= 1;
        }
        historyIndex = historyStack.length - 1;
        updateUndoRedoButtons();
    }

    function applyHistorySnapshot(index) {
        const snapshot = historyStack[index];
        if (!snapshot) return false;
        suppressHistory = true;
        textarea.value = snapshot.value || '';
        textarea.scrollTop = snapshot.scrollTop || 0;
        textarea.scrollLeft = snapshot.scrollLeft || 0;
        const start = typeof snapshot.selectionStart === 'number' ? snapshot.selectionStart : 0;
        const end = typeof snapshot.selectionEnd === 'number' ? snapshot.selectionEnd : start;
        setSelectionRange(start, end);
        triggerChange();
        suppressHistory = false;
        return true;
    }

    function moveHistory(delta) {
        const targetIndex = historyIndex + delta;
        if (targetIndex < 0 || targetIndex >= historyStack.length) return false;
        historyIndex = targetIndex;
        const applied = applyHistorySnapshot(targetIndex);
        if (applied) {
            updateUndoRedoButtons();
        }
        return applied;
    }

    function resetHistoryStack() {
        historyStack.length = 0;
        historyIndex = -1;
        pushHistorySnapshot(true);
        updateUndoRedoButtons();
    }

    function triggerCursorActivity() {
        cursorHandlers.forEach(handler => {
            try {
                handler();
            } catch (err) {
                console.error(err);
            }
        });
    }

    function triggerChange() {
        renderHighlights();
        if (highlightQuery) {
            highlightMatches = computeHighlights(highlightQuery);
            if (highlightMatches.length < 1) {
                highlightCurrent = -1;
            } else if (highlightCurrent >= highlightMatches.length) {
                highlightCurrent = highlightMatches.length - 1;
            }
            renderHighlights();
        }
        changeHandlers.forEach(handler => {
            try {
                handler();
            } catch (err) {
                console.error(err);
            }
        });
        triggerCursorActivity();
        pushHistorySnapshot();
    }

    function syncScroll() {
        highlightContent.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    }

    function setSelectionRange(start, end) {
        const safeStart = clampOffset(start);
        const safeEnd = clampOffset(end);
        textarea.setSelectionRange(safeStart, safeEnd);
        triggerCursorActivity();
    }

    function lineRangeForSelection(start, end) {
        const text = getValue();
        const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;
        return { lineStart, lineEnd };
    }

    function lineStartOffsets(lineStart, lines) {
        const offsets = [];
        let current = lineStart;
        for (let i = 0; i < lines.length; i += 1) {
            offsets.push(current);
            current += lines[i].length + 1;
        }
        return offsets;
    }

    function countAffectedLines(offset, lineStarts) {
        let count = 0;
        for (let i = 0; i < lineStarts.length; i += 1) {
            if (offset >= lineStarts[i]) count += 1;
        }
        return count;
    }

    function replaceOffsets(start, end, text) {
        const insertText = normalizeNewlines(text);
        const value = getValue();
        const before = value.slice(0, start);
        const after = value.slice(end);
        textarea.value = before + insertText + after;
        const caret = start + insertText.length;
        setSelectionRange(caret, caret);
        triggerChange();
    }

    function handleIndent(isShift) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = getValue();
        const { lineStart, lineEnd } = lineRangeForSelection(start, end);
        const block = text.slice(lineStart, lineEnd);
        const lines = block.split('\n');
        const lineStarts = lineStartOffsets(lineStart, lines);

        if (isShift) {
            const removalPerLine = lines.map(line => {
                if (line.startsWith('\t')) return 1;
                let removal = 0;
                for (let i = 0; i < INDENT.length && i < line.length; i += 1) {
                    if (line[i] === ' ') removal += 1;
                    else break;
                }
                return removal;
            });
            if (removalPerLine.every(count => count === 0)) return;
            const adjustedLines = lines.map((line, idx) => line.slice(removalPerLine[idx]));
            const newBlock = adjustedLines.join('\n');
            const before = text.slice(0, lineStart);
            const after = text.slice(lineEnd);
            textarea.value = before + newBlock + after;

            const removalBeforeStart = removalPerLine.slice(0, countAffectedLines(start, lineStarts)).reduce((a, b) => a + b, 0);
            const removalBeforeEnd = removalPerLine.slice(0, countAffectedLines(end, lineStarts)).reduce((a, b) => a + b, 0);
            setSelectionRange(start - removalBeforeStart, end - removalBeforeEnd);
            triggerChange();
            return;
        }

        const indentedLines = lines.map(line => INDENT + line);
        const newBlock = indentedLines.join('\n');
        const before = text.slice(0, lineStart);
        const after = text.slice(lineEnd);
        textarea.value = before + newBlock + after;

        const shiftStart = countAffectedLines(start, lineStarts) * INDENT.length;
        const shiftEnd = countAffectedLines(end, lineStarts) * INDENT.length;
        setSelectionRange(start + shiftStart, end + shiftEnd);
        triggerChange();
    }

    function handleTab(e) {
        if (e.shiftKey) {
            handleIndent(true);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start !== end) {
            handleIndent(false);
            return;
        }

        replaceOffsets(start, end, INDENT);
    }

    function handleEnter() {
        const cursor = textarea.selectionStart;
        const text = getValue();
        const lineStart = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
        let lineEnd = text.indexOf('\n', cursor);
        if (lineEnd === -1) lineEnd = text.length;
        const line = text.slice(lineStart, lineEnd);
        const beforeCursor = text.slice(lineStart, cursor);

        const listMatch = beforeCursor.match(/^(\s*)([*+-]|\d+\.)\s+(.*)$/);
        if (listMatch) {
            const [, indent, marker, rest] = listMatch;
            const cursorAtEnd = cursor === lineStart + line.length;
            if (rest.trim().length === 0 && cursorAtEnd) {
                const before = text.slice(0, lineStart);
                const after = text.slice(lineEnd);
                textarea.value = before + after;
                setSelectionRange(lineStart, lineStart);
                triggerChange();
                return true;
            }

            let nextMarker = marker;
            if (/^\d+\.$/.test(marker)) {
                const nextNumber = parseInt(marker, 10) + 1;
                nextMarker = `${nextNumber}.`;
            }
            const insertion = `\n${indent}${nextMarker} `;
            replaceOffsets(cursor, textarea.selectionEnd, insertion);
            return true;
        }

        const blockquoteMatch = beforeCursor.match(/^(\s*>+\s*)(.*)$/);
        if (blockquoteMatch) {
            const [, prefix, content] = blockquoteMatch;
            const cursorAtEnd = cursor === lineStart + line.length;
            if (content.trim().length === 0 && cursorAtEnd) {
                const before = text.slice(0, lineStart);
                const after = text.slice(lineEnd);
                textarea.value = before + after;
                setSelectionRange(lineStart, lineStart);
                triggerChange();
                return true;
            }
            const insertion = `\n${prefix}`;
            replaceOffsets(cursor, textarea.selectionEnd, insertion);
            return true;
        }

        return false;
    }

    textarea.addEventListener('keydown', (e) => {
        const accel = e.ctrlKey || e.metaKey;
        if (accel && !e.altKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                moveHistory(1);
            } else {
                moveHistory(-1);
            }
            return;
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            handleTab(e);
        } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const handled = handleEnter();
            if (handled) {
                e.preventDefault();
            }
        }
    });

    textarea.addEventListener('input', () => {
        normalizeTextareaContent();
        triggerChange();
    });

    textarea.addEventListener('scroll', syncScroll);
    textarea.addEventListener('scroll', syncHighlightMetrics);

    textarea.addEventListener('mouseup', () => {
        requestAnimationFrame(triggerCursorActivity);
    });

    textarea.addEventListener('keyup', (e) => {
        const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
        if (navKeys.includes(e.key)) {
            requestAnimationFrame(triggerCursorActivity);
        }
    });

    textarea.addEventListener('select', () => {
        requestAnimationFrame(triggerCursorActivity);
    });

    window.addEventListener('resize', syncHighlightMetrics);


    function createSearchCursor(regex) {
        const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
        const pattern = new RegExp(regex.source, flags);
        let lastIndex = 0;
        let currentMatch = null;

        return {
            findNext() {
                const text = getValue();
                pattern.lastIndex = lastIndex;
                const match = pattern.exec(text);
                if (!match) {
                    currentMatch = null;
                    return false;
                }
                const start = match.index;
                const end = start + match[0].length;
                /*
                  El rango es el de la coincidencia real, aunque esté vacía: si
                  se inflaba a un carácter, reemplazar con una expresión como
                  `x*` se comía texto que no formaba parte del resultado. Lo que
                  sí tiene que avanzar es el punto de búsqueda, o el recorrido no
                  terminaría nunca.
                */
                lastIndex = end > start ? end : end + 1;
                currentMatch = {
                    from: offsetToPos(start),
                    to: offsetToPos(end),
                    startOffset: start,
                    endOffset: end,
                    text: match[0]
                };
                return true;
            },
            from() {
                return currentMatch ? { ...currentMatch.from } : null;
            },
            to() {
                return currentMatch ? { ...currentMatch.to } : null;
            },
            // Evita que quien reemplaza tenga que recortar el texto por su
            // cuenta recorriendo el documento entero.
            text() {
                return currentMatch ? currentMatch.text : '';
            },
            replace(replacement) {
                if (!currentMatch) return;
                const value = getValue();
                const before = value.slice(0, currentMatch.startOffset);
                const after = value.slice(currentMatch.endOffset);
                textarea.value = before + replacement + after;
                const delta = replacement.length - currentMatch.text.length;
                const resumeAt = currentMatch.endOffset + delta;
                // Una coincidencia vacía volvería a casar en el mismo punto.
                lastIndex = currentMatch.endOffset > currentMatch.startOffset ? resumeAt : resumeAt + 1;
                currentMatch = null;
                triggerChange();
            }
        };
    }

    syncHighlightMetrics();
    renderHighlights();
    resetHistoryStack();

    return {
        isPlainTextarea: true,
        getValue,
        setValue(value) {
            const normalized = normalizeNewlines(value || '');
            if (getValue() === normalized) return;
            const scrollTop = textarea.scrollTop;
            const scrollLeft = textarea.scrollLeft;
            textarea.value = normalized;
            textarea.scrollTop = scrollTop;
            textarea.scrollLeft = scrollLeft;
            triggerChange();
        },
        focus() {
            textarea.focus();
        },
        hasFocus() {
            return document.activeElement === textarea;
        },
        getCursor() {
            return offsetToPos(textarea.selectionStart);
        },
        setCursor(pos) {
            const offset = posToOffset(pos);
            setSelectionRange(offset, offset);
        },
        getSelection() {
            return getValue().slice(textarea.selectionStart, textarea.selectionEnd);
        },
        replaceSelection(text) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            replaceOffsets(start, end, text);
        },
        replaceRange(text, from, to) {
            const start = posToOffset(from);
            const end = posToOffset(to);
            replaceOffsets(start, end, text);
        },
        lineCount() {
            return getValue().split('\n').length;
        },
        refresh() {
            /* La altura se gestiona mediante CSS */
        },
        setOption(option, value) {
            if (option === 'theme') {
                textarea.dataset.theme = value;
                const isDark = value && value.toLowerCase().includes('darker');
                textarea.classList.toggle('markdown-textarea-dark', Boolean(isDark));
                highlightLayer.classList.toggle('markdown-textarea-dark', Boolean(isDark));
            } else if (option === 'lineWrapping') {
                textarea.wrap = value ? 'soft' : 'off';
            }
        },
        getScrollerElement() {
            return textarea;
        },
        scrollTo(left = 0, top = 0) {
            textarea.scrollLeft = Math.max(0, left);
            textarea.scrollTop = Math.max(0, top);
            syncScroll();
        },
        on(event, handler) {
            if (typeof handler !== 'function') return;
            if (event === 'change') {
                changeHandlers.add(handler);
            } else if (event === 'cursorActivity') {
                cursorHandlers.add(handler);
            }
        },
        off(event, handler) {
            if (typeof handler !== 'function') return;
            if (event === 'change') {
                changeHandlers.delete(handler);
            } else if (event === 'cursorActivity') {
                cursorHandlers.delete(handler);
            }
        },
        addOverlay() {},
        removeOverlay() {
            highlightMatches = [];
            highlightCurrent = -1;
            highlightQuery = null;
            renderHighlights();
        },
        setHighlights(_ranges, currentIndex, query) {
            const usableQuery = query instanceof RegExp
                ? query
                : (typeof query === 'string' ? query.trim() : '');
            if (!usableQuery) {
                highlightMatches = [];
                highlightCurrent = -1;
                highlightQuery = null;
                renderHighlights();
                return;
            }
            highlightQuery = usableQuery;
            highlightMatches = computeHighlights(usableQuery);
            if (highlightMatches.length < 1) {
                highlightCurrent = -1;
                renderHighlights();
                return;
            }
            const idx = typeof currentIndex === 'number' ? currentIndex : 0;
            highlightCurrent = Math.min(Math.max(idx, 0), highlightMatches.length - 1);
            renderHighlights();
        },
        clearHighlights() {
            highlightMatches = [];
            highlightCurrent = -1;
            highlightQuery = null;
            renderHighlights();
        },
        markText(from, to) {
            const start = posToOffset(from);
            const end = posToOffset(to);
            const previousSelection = {
                start: textarea.selectionStart,
                end: textarea.selectionEnd
            };
            const previouslyFocused = document.activeElement;

            setSelectionRange(start, end);

            if (previouslyFocused && previouslyFocused !== textarea && typeof previouslyFocused.focus === 'function') {
                try {
                    previouslyFocused.focus({ preventScroll: true });
                } catch (_) {
                    previouslyFocused.focus();
                }
                if (typeof previouslyFocused.setSelectionRange === 'function' && typeof previouslyFocused.value === 'string') {
                    const endPos = previouslyFocused.value.length;
                    previouslyFocused.setSelectionRange(endPos, endPos);
                }
            }

            return {
                clear() {
                    setSelectionRange(previousSelection.start, previousSelection.end);
                    if (previouslyFocused && previouslyFocused !== textarea && typeof previouslyFocused.focus === 'function') {
                        try {
                            previouslyFocused.focus({ preventScroll: true });
                        } catch (_) {
                            previouslyFocused.focus();
                        }
                        if (typeof previouslyFocused.setSelectionRange === 'function' && typeof previouslyFocused.value === 'string') {
                            const endPos = previouslyFocused.value.length;
                            previouslyFocused.setSelectionRange(endPos, endPos);
                        }
                    }
                }
            };
        },
        scrollIntoView(pos) {
            const offset = posToOffset(pos);
            const previouslyFocused = document.activeElement;
            const hadFocus = previouslyFocused === textarea;
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;
            const hasSelection = selectionStart !== selectionEnd;
            if (hasSelection) {
                setSelectionRange(selectionStart, selectionEnd);
            } else {
                setSelectionRange(offset, offset);
            }
            if (hadFocus) {
                textarea.focus({ preventScroll: false });
        } else if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            try {
                previouslyFocused.focus({ preventScroll: true });
            } catch (_) {
                previouslyFocused.focus();
            }
                if (typeof previouslyFocused.setSelectionRange === 'function' && typeof previouslyFocused.value === 'string') {
                    const endPos = previouslyFocused.value.length;
                    previouslyFocused.setSelectionRange(endPos, endPos);
                }
            }
        },
        getSearchCursor(regex) {
            return createSearchCursor(regex);
        },
        operation(fn) {
            if (typeof fn === 'function') fn();
        },
        undo() {
            return moveHistory(-1);
        },
        redo() {
            return moveHistory(1);
        },
        canUndo() {
            return historyIndex > 0;
        },
        canRedo() {
            return historyIndex >= 0 && historyIndex < historyStack.length - 1;
        },
        clearHistory() {
            resetHistoryStack();
        }
    };
}

function createBase64AwareEditor(editor, textarea) {
    const rawGetValue = editor.getValue.bind(editor);
    const rawSetValue = editor.setValue.bind(editor);
    const rawReplaceSelection = typeof editor.replaceSelection === 'function' ? editor.replaceSelection.bind(editor) : null;
    const rawReplaceRange = typeof editor.replaceRange === 'function' ? editor.replaceRange.bind(editor) : null;
    const enhanced = { ...editor };

    function applyState(state) {
        currentBase64State = state;
        updateBase64Ui(state);
    }

    enhanced.getDisplayValue = rawGetValue;

    enhanced.getValue = () => expandBase64Placeholders(rawGetValue(), currentBase64State.placeholders);

    enhanced.setValue = (value) => {
        const normalized = typeof value === 'string' ? normalizeNewlines(value) : '';
        const state = buildBase64CollapsedState(normalized);
        rawSetValue(state.collapsedText);
        applyState(state);
    };

    enhanced.recollapseBase64 = (preserveCursor = true) => {
        if (!enhanced || typeof enhanced.getValue !== 'function') return;
        const cursor = preserveCursor && typeof enhanced.getCursor === 'function' ? enhanced.getCursor() : null;
        const scroller = preserveCursor && typeof enhanced.getScrollerElement === 'function'
            ? enhanced.getScrollerElement()
            : null;
        const scrollPos = scroller ? { left: scroller.scrollLeft, top: scroller.scrollTop } : null;
        const actual = enhanced.getValue();
        enhanced.setValue(actual);
        if (preserveCursor && cursor && typeof enhanced.setCursor === 'function') {
            enhanced.setCursor(cursor);
        }
        if (preserveCursor && scrollPos && typeof enhanced.scrollTo === 'function') {
            enhanced.scrollTo(scrollPos.left, scrollPos.top);
        }
    };

    if (rawReplaceSelection) {
        enhanced.replaceSelection = (text, ...args) => {
            rawReplaceSelection(text, ...args);
            if (typeof text === 'string' && BASE64_TEST_REGEX.test(text)) {
                requestAnimationFrame(() => enhanced.recollapseBase64());
            }
        };
    }

    if (rawReplaceRange) {
        enhanced.replaceRange = (text, from, to, ...rest) => {
            rawReplaceRange(text, from, to, ...rest);
            if (typeof text === 'string' && BASE64_TEST_REGEX.test(text)) {
                requestAnimationFrame(() => enhanced.recollapseBase64());
            }
        };
    }

    // Estado inicial
    const initialState = buildBase64CollapsedState(rawGetValue());
    rawSetValue(initialState.collapsedText);
    applyState(initialState);

    return enhanced;
}

function updateMarkdownCharCounter(sourceText) {
    if (!markdownCharCounterEl) return;
    const text = typeof sourceText === 'string' ? sourceText : '';
    const count = text.length;
    const singularLabel = getTranslation('char_counter_singular', 'carácter');
    const pluralLabel = getTranslation('char_counter_plural', 'caracteres');
    const unit = count === 1 ? singularLabel : pluralLabel;
    markdownCharCounterEl.textContent = `${count.toLocaleString()} ${unit}`;
}
/*
  Shortcut hints in the Archivo menu are written for Windows/Linux; on macOS the
  same keys are ⌘ and ⇧. Runs after each translation pass, so it works whatever
  wording the active locale uses for Shift.
*/
const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
// Los submenús se abren al pasar el ratón solo donde hay puntero real.
const POINTER_HAS_HOVER = typeof window.matchMedia === 'function'
    && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

window.__localizeShortcutLabels = () => {
  if (!IS_MAC) return;
  document.querySelectorAll('[data-shortcut]').forEach((element) => {
    element.textContent = element.textContent
      .replace(/Ctrl/gi, '\u2318')
      .replace(/Mayús|Maiús|Shift|Maj/gi, '\u21e7')
      .replace(/\+/g, '');
  });
};

function updateVersionLabel() {
    document.querySelectorAll('[data-i18n-key="footer_version"]').forEach((element) => {
        element.textContent = formatTranslation('footer_version', 'Versión {version}.', { version: APP_VERSION });
    });
    document.querySelectorAll('[data-app-version]').forEach((element) => {
        element.textContent = APP_VERSION;
    });
    document.querySelectorAll('[data-i18n-key="desktop_banner_message"]').forEach((element) => {
        element.textContent = formatTranslation(
            'desktop_banner_message',
            'EdiMarkWeb Desktop {version} está disponible para Linux, Windows y macOS.',
            { version: `v${APP_VERSION}` },
        );
    });
}

window.__updateVersionLabel = updateVersionLabel;

window.__updateCharCounterLabel = () => {
    const currentValue = markdownEditor ? markdownEditor.getValue() : '';
    updateMarkdownCharCounter(currentValue);
};

function setMarkdownControlsDisabled(disabled) {
    if (markdownControlsDisabled === disabled) return;
    markdownControlsDisabled = disabled;
    const disabledHint = getTranslation(
        'markdown_controls_disabled_hint',
        'Edita el texto en el panel Markdown para modificar el formato.'
    );
    markdownControlButtons.forEach(btn => {
        if (!btn) return;
        if (disabled) {
            btn.setAttribute('data-controls-disabled', 'true');
        } else {
            btn.removeAttribute('data-controls-disabled');
        }
        if (disabled) {
            btn.setAttribute('aria-disabled', 'true');
        } else {
            btn.removeAttribute('aria-disabled');
        }
        if (disabled) {
            if (typeof btn.dataset.disabledHintOriginalTitle === 'undefined') {
                const originalTitle = btn.getAttribute('title');
                btn.dataset.disabledHintOriginalTitle = originalTitle !== null ? originalTitle : '';
            }
            if (typeof btn.dataset.disabledHintOriginalAria === 'undefined') {
                const originalAria = btn.getAttribute('aria-label');
                btn.dataset.disabledHintOriginalAria = originalAria !== null ? originalAria : '';
            }
            btn.setAttribute('title', disabledHint);
            btn.setAttribute('aria-label', disabledHint);
        } else {
            if (typeof btn.dataset.disabledHintOriginalTitle !== 'undefined') {
                const originalTitle = btn.dataset.disabledHintOriginalTitle;
                if (originalTitle) {
                    btn.setAttribute('title', originalTitle);
                } else {
                    btn.removeAttribute('title');
                }
                delete btn.dataset.disabledHintOriginalTitle;
            }
            if (typeof btn.dataset.disabledHintOriginalAria !== 'undefined') {
                const originalAria = btn.dataset.disabledHintOriginalAria;
                if (originalAria) {
                    btn.setAttribute('aria-label', originalAria);
                } else {
                    btn.removeAttribute('aria-label');
                }
                delete btn.dataset.disabledHintOriginalAria;
            }
        }
    });
    if (disabled) {
        if (headingOptionsEl) headingOptionsEl.classList.add('hidden');
        if (formulaOptionsEl) formulaOptionsEl.classList.add('hidden');
    }
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoAvailable = Boolean(markdownEditor && typeof markdownEditor.canUndo === 'function' && markdownEditor.canUndo());
    const redoAvailable = Boolean(markdownEditor && typeof markdownEditor.canRedo === 'function' && markdownEditor.canRedo());
    if (undoButtonEl) {
        undoButtonEl.toggleAttribute('disabled', !undoAvailable);
        undoButtonEl.setAttribute('aria-disabled', undoAvailable ? 'false' : 'true');
    }
    if (redoButtonEl) {
        redoButtonEl.toggleAttribute('disabled', !redoAvailable);
        redoButtonEl.setAttribute('aria-disabled', redoAvailable ? 'false' : 'true');
    }
}

// --- Funciones de gestión de pestañas y documentos ---
function loadSavedDocsList() {
    const raw = safeLocalStorageGet(DOCS_LIST_KEY, '[]');
    try {
        const parsed = JSON.parse(raw);
        const isValid = Array.isArray(parsed) && parsed.every(doc => (
            doc
            && typeof doc === 'object'
            && typeof doc.id === 'string'
            && doc.id.length > 0
            && typeof doc.name === 'string'
        ));
        if (!isValid) throw new Error('invalid_docs_list');
        return parsed;
    } catch (error) {
        console.warn('La lista de documentos guardada está dañada:', error);
        const backupSaved = safeLocalStorageSet(CORRUPT_DOCS_LIST_BACKUP_KEY, raw);
        queueStorageNotice({
            key: 'storage_corrupt_recovered',
            fallback: backupSaved
                ? 'La lista de documentos guardada estaba dañada. Se inició una sesión nueva y se conservó una copia de respaldo.'
                : 'La lista de documentos guardada estaba dañada. Se inició una sesión nueva.'
        });
        return [];
    }
}

function saveDocsList() {
    // Las rutas autorizadas por el diálogo nativo solo son válidas durante la
    // sesión de la aplicación. El borrador sí persiste, pero al reiniciar se
    // vuelve a pedir una ubicación para no reutilizar permisos caducados.
    const docList = docs.map(d => (d.isManual ? { id: d.id, name: d.name, isManual: true } : { id: d.id, name: d.name }));
    return safeLocalStorageSet(DOCS_LIST_KEY, JSON.stringify(docList));
}

/*
  El manual se reconoce por una marca propia y no por su nombre: renombrar la
  pestaña dejaba de recargarlo al cambiar de idioma. El nombre sigue valiendo
  como respaldo para las sesiones guardadas antes de existir la marca.
*/
function findManualDoc() {
    return docs.find(d => d.isManual) || docs.find(d => d.name === 'Manual');
}

function syncDocsOrderWithTabs(tabBar) {
    if (!tabBar) return;
    const orderedTabs = Array.from(tabBar.querySelectorAll('.tab'));
    if (!orderedTabs.length) return;
    const positions = new Map();
    orderedTabs.forEach((tab, index) => positions.set(tab.dataset.id, index));
    docs.sort((a, b) => {
        const posA = positions.has(a.id) ? positions.get(a.id) : Number.MAX_SAFE_INTEGER;
        const posB = positions.has(b.id) ? positions.get(b.id) : Number.MAX_SAFE_INTEGER;
        return posA - posB;
    });
    saveDocsList();
}

function initializeTabDragAndDrop(tabBar) {
    if (!tabBar || typeof window.PointerEvent === 'undefined') return;
    const state = {
        tab: null,
        pointerId: null,
        startX: 0,
        dragging: false
    };
    const DRAG_THRESHOLD = 6;

    const cleanup = () => {
        if (!state.tab) return;
        try { state.tab.releasePointerCapture(state.pointerId); } catch (_) {}
        state.tab.classList.remove('is-dragging');
        state.tab.removeAttribute('aria-grabbed');
        state.tab.removeEventListener('pointermove', handlePointerMove);
        state.tab.removeEventListener('pointerup', handlePointerUp);
        state.tab.removeEventListener('pointercancel', handlePointerUp);
        state.tab = null;
        state.pointerId = null;
        state.dragging = false;
    };

    const reorderTabsAt = (clientX) => {
        if (!state.tab) return;
        const tabs = Array.from(tabBar.querySelectorAll('.tab'));
        const draggingTab = state.tab;
        let insertBefore = null;
        for (const tab of tabs) {
            if (tab === draggingTab) continue;
            const rect = tab.getBoundingClientRect();
            if (clientX < rect.left + rect.width / 2) {
                insertBefore = tab;
                break;
            }
        }
        if (insertBefore) {
            if (draggingTab !== insertBefore && draggingTab.nextSibling !== insertBefore) {
                tabBar.insertBefore(draggingTab, insertBefore);
            }
        } else if (draggingTab !== tabBar.lastElementChild) {
            tabBar.appendChild(draggingTab);
        }
    };

    const handlePointerMove = (event) => {
        if (!state.tab || event.pointerId !== state.pointerId) return;
        const delta = Math.abs(event.clientX - state.startX);
        if (!state.dragging && delta > DRAG_THRESHOLD) {
            state.dragging = true;
            state.tab.classList.add('is-dragging');
            state.tab.setAttribute('aria-grabbed', 'true');
        }
        if (!state.dragging) return;
        event.preventDefault();
        reorderTabsAt(event.clientX);
    };

    const handlePointerUp = (event) => {
        if (!state.tab || event.pointerId !== state.pointerId) return;
        const wasDragging = state.dragging;
        cleanup();
        if (wasDragging) {
            suppressNextTabClick = true;
            const release = () => { suppressNextTabClick = false; };
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(release);
            } else {
                setTimeout(release, 0);
            }
            syncDocsOrderWithTabs(tabBar);
        }
    };

    const handlePointerDown = (event) => {
        if (tabBar.querySelectorAll('.tab').length < 2) return;
        const tab = event.target.closest('.tab');
        if (!tab || event.target.closest('.tab-close')) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        state.tab = tab;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.dragging = false;
        try { tab.setPointerCapture(event.pointerId); } catch (_) {}
        tab.addEventListener('pointermove', handlePointerMove);
        tab.addEventListener('pointerup', handlePointerUp);
        tab.addEventListener('pointercancel', handlePointerUp);
    };

    tabBar.addEventListener('pointerdown', handlePointerDown);
}

function startRename(tab) {
    const tabNameSpan = tab.querySelector('.tab-name');
    if (!tabNameSpan || tab.querySelector('input')) return;

    const currentName = tabNameSpan.textContent;
    const docId = tab.dataset.id;
    const closeBtn = tab.querySelector('.tab-close');
    const dirtyIndicator = tab.querySelector('.tab-dirty');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-white dark:bg-slate-800 border border-blue-500 rounded px-1 text-sm w-32';
    input.setAttribute('aria-label', getTranslation('rename_document_aria_label', 'Nuevo nombre del documento'));

    tabNameSpan.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    tab.insertBefore(input, dirtyIndicator);
    input.focus();
    input.select();

    const finishRename = () => {
        const newName = input.value.trim();
        
        input.removeEventListener('blur', finishRename);
        input.removeEventListener('keydown', handleKey);
        if (input.parentNode) input.remove();

        tabNameSpan.style.display = '';
        if (closeBtn) closeBtn.style.display = '';

        if (newName && newName !== currentName) {
            const doc = docs.find(d => d.id === docId);
            if (doc) {
                doc.name = newName;
                tabNameSpan.textContent = newName;
                saveDocsList();
            }
        }
        tab.focus();
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishRename();
        } else if (e.key === 'Escape') {
            input.value = currentName;
            finishRename();
        }
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', handleKey);
}

function newDoc(name = '', md = '', { isManual = false, filePath = '' } = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const normalizedMd = normalizeNewlines(md || '');
    const documentName = name || getTranslation('untitled_document', 'Documento sin título');
    const newDoc = { id, name: documentName, md: normalizedMd, lastSaved: normalizedMd, isManual, filePath };
    docs.push(newDoc);
    addTabElement(newDoc);
    switchTo(id);
    saveDocsList();
    return newDoc;
}

function addTabElement({ id, name }) {
    const tabBar = document.getElementById('tab-bar');
    const tab = document.createElement('button');
    tab.className = "tab px-3 py-1 rounded-t-md flex items-center gap-2 text-sm";
    tab.dataset.id = id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    // El nombre viene de un archivo abierto o importado: nunca como HTML.
    const nameEl = document.createElement('span');
    nameEl.className = 'tab-name';
    nameEl.textContent = name;
    const dirtyEl = document.createElement('span');
    dirtyEl.className = 'ml-1 text-red-500 tab-dirty hidden';
    dirtyEl.setAttribute('title', getTranslation('unsaved_changes_title', 'Cambios sin guardar'));
    dirtyEl.textContent = '●';
    const closeEl = document.createElement('i');
    closeEl.setAttribute('data-lucide', 'x');
    closeEl.className = 'tab-close w-4 h-4 opacity-50 hover:opacity-100';
    tab.append(nameEl, dirtyEl, closeEl);
    tabBar.appendChild(tab);
    tab.addEventListener('dblclick', () => startRename(tab));
    if(window.lucide) lucide.createIcons();
}

function switchTo(id) {
    if (currentId && currentId !== id) {
        const previousDoc = docs.find(d => d.id === currentId);
        if (previousDoc) {
            previousDoc.md = markdownEditor.getValue();
            // El temporizador ya no volverá a este documento: se guarda aquí.
            autosaveDoc(previousDoc.id, previousDoc.md);
            updateDirtyIndicator(previousDoc.id, previousDoc.md !== previousDoc.lastSaved);
        }
    }

    currentId = id;
    const doc = docs.find(d => d.id === id);
    if (!doc) return;

    document.querySelectorAll('.tab').forEach(t => {
        const isActive = t.dataset.id === id;
        t.setAttribute('aria-selected', isActive);
        t.classList.toggle('bg-white', isActive);
        t.classList.toggle('dark:bg-slate-900', isActive);
        t.classList.toggle('border-slate-200', isActive);
        t.classList.toggle('dark:border-slate-700', isActive);
        t.classList.toggle('border-transparent', !isActive);
    });

    markdownEditor.setValue(doc.md);
    if (typeof markdownEditor.setCursor === 'function') {
        markdownEditor.setCursor({ line: 0, ch: 0 });
    }
    if (typeof markdownEditor.scrollTo === 'function') {
        markdownEditor.scrollTo(0, 0);
    } else if (typeof markdownEditor.getScrollerElement === 'function') {
        const scroller = markdownEditor.getScrollerElement();
        if (scroller) {
            scroller.scrollTop = 0;
            scroller.scrollLeft = 0;
        }
    }
    if (typeof markdownEditor.clearHistory === 'function') {
        markdownEditor.clearHistory();
    }
    updateUndoRedoButtons();
    doc.md = markdownEditor.getValue();
    doc.lastSaved = normalizeNewlines(doc.lastSaved || doc.md);
    updateHtml();
    const htmlOutputEl = document.getElementById('html-output');
    if (htmlOutputEl) {
        htmlOutputEl.scrollTop = 0;
        htmlOutputEl.scrollLeft = 0;
    }
    if (htmlEditor && typeof htmlEditor.scrollTo === 'function') {
        htmlEditor.scrollTo(0, 0);
    }
    markdownEditor.focus();
    updateDirtyIndicator(id, doc.md !== doc.lastSaved);
}

function closeDoc(id) {
    const docIndex = docs.findIndex(d => d.id === id);
    if (docIndex === -1) return;

    const doc = docs[docIndex];
    const isDirty = doc.md !== doc.lastSaved;

    if (isDirty && !confirm(formatTranslation(
        'close_unsaved_confirm',
        '¿Cerrar "{name}" sin guardar los cambios?',
        { name: doc.name }
    ))) {
        return;
    }

    docs.splice(docIndex, 1);
    document.querySelector(`.tab[data-id="${id}"]`).remove();
    safeLocalStorageRemove(`${AUTOSAVE_KEY_PREFIX}-${id}`);
    lastAutosavedById.delete(id);
    saveDocsList();

    if (currentId === id) {
        if (docs.length > 0) {
            const newIndex = Math.max(0, docIndex - 1);
            switchTo(docs[newIndex].id);
        } else {
            currentId = null;
            markdownEditor.setValue('');
            if (typeof markdownEditor.clearHistory === 'function') {
                markdownEditor.clearHistory();
            }
            updateUndoRedoButtons();
            updateHtml();
        }
    }
}

function updateDirtyIndicator(id, isDirty) {
    const tab = document.querySelector(`.tab[data-id="${id}"] .tab-dirty`);
    if (tab) {
        tab.classList.toggle('hidden', !isDirty);
    }
}

// El manual existe en los cinco idiomas de la interfaz; el castellano hace de
// respaldo si falta el archivo del idioma activo.
function manualFileForLanguage() {
    const lang = window.__edimarkLang || document.documentElement.lang || 'es';
    return lang && lang !== 'es' ? `manual-${lang}.md` : 'manual.md';
}

async function fetchManualMarkdown() {
    // i18n.js publishes this promise before DOMContentLoaded, so the automatic
    // first tab cannot race the asynchronous locale fetch.
    if (window.__edimarkLanguageReady) {
        await window.__edimarkLanguageReady;
    }
    const candidates = [manualFileForLanguage(), 'manual.md'];
    for (const file of candidates) {
        try {
            const response = await fetch(file);
            if (response.ok) return await response.text();
        } catch (error) {
            console.warn(`No se pudo cargar ${file}:`, error);
        }
    }
    return '# Manual\n\nError: No se pudo cargar el manual.';
}

// Al cambiar el idioma, el manual abierto se recarga en el nuevo, salvo que
// tenga cambios sin guardar: en ese caso se respeta lo que haya escrito el usuario.
window.__reloadManualForLanguage = () => {
    const manualDoc = findManualDoc();
    if (!manualDoc) return;
    if (manualDoc.md !== manualDoc.lastSaved) return;
    const wasActive = currentId === manualDoc.id;
    fetchManualMarkdown().then((md) => {
        const normalized = normalizeNewlines(md);
        manualDoc.md = normalized;
        manualDoc.lastSaved = normalized;
        if (wasActive) switchTo(manualDoc.id);
        updateDirtyIndicator(manualDoc.id, false);
    });
};

function openManualDoc(forceReload = false) {
    const manualDoc = findManualDoc();

    if (manualDoc && !forceReload) {
        switchTo(manualDoc.id);
        return;
    }

    fetchManualMarkdown()
        .then(md => {
            const normalized = normalizeNewlines(md);
            if (manualDoc && forceReload) {
                const doc = docs.find(d => d.id === manualDoc.id);
                if (doc) {
                    doc.md = normalized;
                    doc.lastSaved = normalized;
                }
                switchTo(doc.id);
                updateDirtyIndicator(doc.id, false);
            } else {
                newDoc('Manual', normalized, { isManual: true });
            }
        })
        .catch(err => {
            console.error("Error al cargar el manual:", err);
            if (!manualDoc) {
                newDoc('Manual', '# Error\n\nNo se pudo cargar el manual.', { isManual: true });
            }
        });
}


/*
  El bloque de metadatos del documento (`---` … `---`), separado del cuerpo.

  Son datos sobre el documento, no contenido: Pandoc los lee al exportar, pero
  marked no los conoce y los pintaba como una raya horizontal y un encabezado
  falso con el texto crudo dentro. La vista previa muestra solo el cuerpo; el
  editor de Markdown, que es el código fuente, los sigue mostrando.

  Si el módulo del exportador aún no ha cargado, no hay nada que esconder y el
  documento se trata entero, como antes.
*/
function splitDocumentFrontMatter(markdown) {
    const api = window.PandocExporter;
    if (api && typeof api.splitFrontMatter === 'function') {
        return api.splitFrontMatter(markdown);
    }
    return { frontMatter: '', body: typeof markdown === 'string' ? markdown : '', keys: [], lang: '' };
}

// --- Funciones principales ---
function updateHtml() {
    if (isUpdating) return;
    isUpdating = true;
    const fullMarkdown = markdownEditor.getValue();
    const markdownText = splitDocumentFrontMatter(fullMarkdown).body;
    const htmlOutput = document.getElementById('html-output');
    updateMarkdownCharCounter(fullMarkdown);

    const { text: markdownWithoutMath, segments: mathSegments } = protectMathSegments(markdownText);
    const sanitizedText = preserveMarkdownEscapes(markdownWithoutMath);
    
    if (window.marked) {
        const parsedHtml = marked.parse(sanitizedText);
        const restoredHtml = restoreMathSegments(parsedHtml, mathSegments);
        htmlOutput.innerHTML = restoredHtml;

        htmlOutput.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          if (!h.id) {
            h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-áéíóúüñ]/g,'');
          }
        });

        if (htmlEditor && !htmlEditor.hasFocus()) {
            skipNextHtmlEditorSync = true;
            htmlEditor.setValue(restoredHtml);
            const releaseHtmlSync = () => { skipNextHtmlEditorSync = false; };
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(releaseHtmlSync);
            } else {
                setTimeout(releaseHtmlSync, 0);
            }
        }
    }

    try {
        if (window.renderMathInElement) {
            renderMathInElement(htmlOutput, {
                delimiters: [
                    {left: '$$', right: '$$', display: true}, {left: '\\[', right: '\\]', display: true},
                    {left: '$', right: '$', display: false}, {left: '\\(', right: '\\)', display: false}
                ], throwOnError: false
            });
            annotateRenderedMath(htmlOutput, mathSegments);
        }
    } catch (error) { console.warn("KaTeX no está listo.", error); }
    
    if (currentId) {
        const doc = docs.find(d => d.id === currentId);
        if(doc) {
            updateDirtyIndicator(currentId, markdownEditor.getValue() !== doc.lastSaved);
        }
    }
    // El indicador muestra el idioma efectivo del documento activo.
    if (typeof window.__refreshDocLanguageIndicator === 'function') {
        window.__refreshDocLanguageIndicator();
    }
    isUpdating = false;
}

function updateMarkdown() {
    if (isUpdating) return;
    const htmlOutput = document.getElementById('html-output');
    if (!htmlOutput) return;
    isUpdating = true;
    const previewHtml = buildHtmlWithTex();
    if (htmlEditor && !htmlEditor.hasFocus()) {
        const currentHtml = htmlEditor.getValue();
        if (currentHtml !== previewHtml) {
            skipNextHtmlEditorSync = true;
            htmlEditor.setValue(previewHtml);
            const releaseHtmlSync = () => { skipNextHtmlEditorSync = false; };
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(releaseHtmlSync);
            } else {
                setTimeout(releaseHtmlSync, 0);
            }
        }
    }
    const canUpdateMarkdown = !markdownEditor.hasFocus() || forceMarkdownUpdate;
    if (turndownService && canUpdateMarkdown) {
        const sanitizedPreview = sanitizeHtmlForMarkdown(previewHtml);
        const { text: previewWithoutMath, segments: previewMathSegments } = protectMathSegments(sanitizedPreview);
        let markdownFromPreview = turndownService.turndown(previewWithoutMath);
        markdownFromPreview = restoreMathSegments(markdownFromPreview, previewMathSegments);
        markdownFromPreview = normalizeMathEscapes(markdownFromPreview);
        const currentMarkdown = markdownEditor.getValue();
        /*
          La vista previa no muestra los metadatos, así que lo que vuelve de
          ella no los trae: sin reponerlos, escribir una letra en el panel
          derecho borraría el idioma del documento.
        */
        const { frontMatter } = splitDocumentFrontMatter(currentMarkdown);
        if (frontMatter) markdownFromPreview = `${frontMatter}\n\n${markdownFromPreview}`;
        if (currentMarkdown !== markdownFromPreview) {
            skipNextMarkdownSync = true;
            skipNextCursorSync = true;
            markdownEditor.setValue(markdownFromPreview);
            const releaseCursorSync = () => { skipNextCursorSync = false; };
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(releaseCursorSync);
            } else {
                setTimeout(releaseCursorSync, 0);
            }
            updateMarkdownCharCounter(markdownFromPreview);
        }
    }
    if (currentId) {
        const doc = docs.find(d => d.id === currentId);
        if (doc) {
            updateDirtyIndicator(currentId, markdownEditor.getValue() !== doc.lastSaved);
        }
    }
    isUpdating = false;
    forceMarkdownUpdate = false;
}

function applyFormat(format) {
    const cursor = markdownEditor.getCursor();
    const selectedText = markdownEditor.getSelection();
    const hadSelection = !!selectedText;
    let newText = '';

    switch (format) {
        case 'bold': 
          if (hadSelection) markdownEditor.replaceSelection(`**${selectedText}**`, 'around');
          else {
            markdownEditor.replaceSelection('****');
            markdownEditor.setCursor({ line: cursor.line, ch: cursor.ch + 2 });
          }
          break;
        case 'italic':
          if (hadSelection) markdownEditor.replaceSelection(`*${selectedText}*`, 'around');
          else {
            markdownEditor.replaceSelection('**');
            markdownEditor.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
          }
          break;
        case 'code':
          if (hadSelection) markdownEditor.replaceSelection(`\`\`\`\n${selectedText}\n\`\`\`` , 'around');
          else {
            markdownEditor.replaceSelection('\`\`\`\n\n\`\`\`');
            markdownEditor.setCursor({ line: cursor.line + 1, ch: 0 });
          }
          break;
        case 'latex-inline':
        case 'latex-inline-dollar':
          if (hadSelection) markdownEditor.replaceSelection(`$${selectedText}$`, 'around');
          else {
            markdownEditor.replaceSelection('$$');
            markdownEditor.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
          }
          break;
        case 'latex-inline-paren':
          if (hadSelection) markdownEditor.replaceSelection(`\\(${selectedText}\\)`, 'around');
          else {
            markdownEditor.replaceSelection('\\(\\)');
            markdownEditor.setCursor({ line: cursor.line, ch: cursor.ch + 2 });
          }
          break;
        case 'latex-block':
        case 'latex-block-bracket':
          if (hadSelection) markdownEditor.replaceSelection(`\n\\[\n${selectedText}\n\\]\n`, 'around');
          else {
            markdownEditor.replaceSelection('\n\\[\n\n\\]\n');
            markdownEditor.setCursor({ line: cursor.line + 2, ch: 0 });
          }
          break;
        case 'latex-block-dollar':
          if (hadSelection) markdownEditor.replaceSelection(`\n$$\n${selectedText}\n$$\n`, 'around');
          else {
            markdownEditor.replaceSelection('\n$$\n\n$$\n');
            markdownEditor.setCursor({ line: cursor.line + 2, ch: 0 });
          }
          break;
        
        case 'heading-1': newText = `\n# ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 1 })}\n`; break;
        case 'heading-2': newText = `\n## ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 2 })}\n`; break;
        case 'heading-3': newText = `\n### ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 3 })}\n`; break;
        case 'heading-4': newText = `\n#### ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 4 })}\n`; break;
        case 'heading-5': newText = `\n##### ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 5 })}\n`; break;
        case 'heading-6': newText = `\n###### ${selectedText || formatTranslation('heading_placeholder', 'Título {level}', { level: 6 })}\n`; break;
        case 'quote': newText = `\n> ${selectedText || getTranslation('quote_placeholder', 'Cita')}\n`; break;
        case 'list-ul': 
            newText = hadSelection ? selectedText.split('\n').map(l => l.trim() ? `- ${l}` : '').join('\n') : '\n- ';
            break;
        case 'list-ol':
            newText = hadSelection ? selectedText.split('\n').map((l, i) => l.trim() ? `${i + 1}. ${l}` : '').join('\n') : '\n1. ';
            break;
        case 'link': toggleLinkModal(true, selectedText); return;
        case 'image': toggleImageModal(true, selectedText); return;
        case 'table': toggleTableModal(true); return;
    }
    
    if (newText) markdownEditor.replaceSelection(newText, 'around');
    markdownEditor.focus();
}

function toggleTableModal(show) { document.getElementById('table-modal-overlay').style.display = show ? 'flex' : 'none'; }

function toggleLinkModal(show, presetText = '') {
    document.getElementById('link-modal-overlay').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('link-text').value = presetText;
        document.getElementById('link-url').value  = '';
        setTimeout(() => document.getElementById(presetText ? 'link-url' : 'link-text').focus(), 0);
    }
}

function toggleImageModal(show, presetText = '') {
    document.getElementById('image-modal-overlay').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('image-alt-text').value = presetText;
        document.getElementById('image-url').value  = '';
        const fileInput = document.getElementById('image-file-input');
        const fileName = document.getElementById('image-file-name');
        if (fileInput) fileInput.value = '';
        if (fileName) {
            fileName.textContent = getTranslation('image_file_none', 'Ninguna seleccionada');
            fileName.setAttribute('data-i18n-key', 'image_file_none');
        }
        setTimeout(() => document.getElementById(presetText ? 'image-url' : 'image-alt-text').focus(), 0);
    }
}

/*
  Ajustes del documento LaTeX. Viven en el almacenamiento local para que se
  reutilicen de una sesión a otra, y se publican en window para que
  pandoc-exporter.js los recoja sin depender de este archivo.
*/
const LATEX_SETTINGS_DEFAULTS = {
    // 'auto' es el idioma de la interfaz resuelto en cada exportación, no el de
    // hoy congelado: quien cambie de idioma la aplicación no debería seguir
    // exportando en el anterior sin saber por qué.
    documentLanguage: 'auto',
    documentAuthor: '',
    documentToc: false,
    documentNumberSections: false,
    // La portada generada es el valor de partida: un EPUB sin imagen aparece
    // con el icono genérico en la estantería del lector.
    epubCover: 'auto',
    epubCoverImage: '',
    epubCoverName: '',
    documentClass: 'article',
    classOptions: '',
    preamble: '',
};

function readLatexSettings() {
    const raw = safeLocalStorageGet(LATEX_SETTINGS_KEY);
    if (!raw) return { ...LATEX_SETTINGS_DEFAULTS };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { ...LATEX_SETTINGS_DEFAULTS };
        return {
            documentLanguage: typeof parsed.documentLanguage === 'string' && parsed.documentLanguage.trim()
                ? parsed.documentLanguage.trim()
                : LATEX_SETTINGS_DEFAULTS.documentLanguage,
            documentAuthor: typeof parsed.documentAuthor === 'string' ? parsed.documentAuthor : '',
            documentToc: parsed.documentToc === true,
            documentNumberSections: parsed.documentNumberSections === true,
            epubCover: ['none', 'auto', 'custom'].includes(parsed.epubCover) ? parsed.epubCover : LATEX_SETTINGS_DEFAULTS.epubCover,
            epubCoverImage: typeof parsed.epubCoverImage === 'string' ? parsed.epubCoverImage : '',
            epubCoverName: typeof parsed.epubCoverName === 'string' ? parsed.epubCoverName : '',
            documentClass: typeof parsed.documentClass === 'string' ? parsed.documentClass : LATEX_SETTINGS_DEFAULTS.documentClass,
            classOptions: typeof parsed.classOptions === 'string' ? parsed.classOptions : '',
            preamble: typeof parsed.preamble === 'string' ? parsed.preamble : '',
        };
    } catch (error) {
        console.warn('Ajustes del documento ilegibles, se usan los predeterminados:', error);
        return { ...LATEX_SETTINGS_DEFAULTS };
    }
}

function publishLatexSettings(settings) {
    window.__edimarkLatexSettings = { ...settings };
    return window.__edimarkLatexSettings;
}

function storeLatexSettings(settings) {
    publishLatexSettings(settings);
    safeLocalStorageSet(LATEX_SETTINGS_KEY, JSON.stringify(settings));
    // Los documentos sin idioma propio siguen al general: el indicador cambia.
    if (typeof window.__refreshDocLanguageIndicator === 'function') {
        window.__refreshDocLanguageIndicator();
    }
}

function toggleLatexImportModal(show) {
    if (!latexImportModalOverlay) return;
    latexImportModalOverlay.style.display = show ? 'flex' : 'none';
    if (show) {
        if (latexImportTextarea) {
            latexImportTextarea.value = '';
            setTimeout(() => latexImportTextarea.focus(), 0);
        }
        setLatexImportStatus('');
    } else if (!latexImportInProgress) {
        if (latexImportTextarea) latexImportTextarea.value = '';
        setLatexImportStatus('');
    }
}

function setLatexImportStatus(message = '', { isError = false } = {}) {
    if (!latexImportStatusEl) return;
    const text = typeof message === 'string' ? message.trim() : '';
    if (!latexImportStatusEl.dataset.defaultClasses) {
        latexImportStatusEl.dataset.defaultClasses = latexImportStatusEl.className;
    }
    latexImportStatusEl.className = latexImportStatusEl.dataset.defaultClasses;
    latexImportStatusEl.textContent = text;
    if (text && isError) {
        latexImportStatusEl.classList.add('text-red-600', 'dark:text-red-400');
    }
}

function setLatexImportBusy(isBusy) {
    if (!latexImportConvertBtn) return;
    latexImportConvertBtn.disabled = Boolean(isBusy);
    latexImportConvertBtn.classList.toggle('opacity-60', Boolean(isBusy));
    latexImportConvertBtn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    const labelEl = latexImportConvertBtn.querySelector('[data-i18n-key="latex_import_convert_btn"]') || latexImportConvertBtn.querySelector('.latex-import-btn-label');
    if (labelEl) {
        if (!labelEl.dataset.defaultText) {
            labelEl.dataset.defaultText = labelEl.textContent;
        }
        if (isBusy) {
            labelEl.textContent = getTranslation('latex_import_busy_label', 'Un momento, importando…');
        } else {
            const fallback = getTranslation('latex_import_convert_btn', labelEl.dataset.defaultText || 'Convertir a Markdown');
            labelEl.textContent = fallback;
        }
    }
}

async function saveFile(filename, content, type, { existingPath = '', extensions } = {}) {
    const platform = window.EdiMarkPlatform;
    if (platform && typeof platform.saveFile === 'function') {
        return platform.saveFile({
            suggestedName: filename,
            contents: content,
            mimeType: type,
            existingPath,
            extensions,
        });
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revocar en el mismo tic cancela la descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { saved: true, path: '', name: filename };
}

async function saveCurrentDocument({ saveAs = false } = {}) {
    const content = markdownEditor.getValue();
    const doc = docs.find(d => d.id === currentId);
    const rawName = doc && typeof doc.name === 'string' ? doc.name.trim() : '';
    const cleanName = rawName.replace(/\.md$/i, '') || 'documento';
    const filename = `${cleanName}.md`;
    try {
        const result = await saveFile(filename, content, 'text/markdown;charset=utf-8', {
            existingPath: saveAs ? '' : (doc?.filePath || ''),
            extensions: ['md', 'markdown'],
        });
        if (!result || !result.saved) return false;
        if (doc) {
            const savedName = String(result.name || filename).replace(/\.md$/i, '') || cleanName;
            doc.name = savedName;
            doc.filePath = result.path || doc.filePath || '';
            doc.md = content;
            doc.lastSaved = content;
            const tabNameEl = document.querySelector(`.tab[data-id="${currentId}"] .tab-name`);
            if (tabNameEl) tabNameEl.textContent = savedName;
            updateDirtyIndicator(currentId, false);
            saveDocsList();
        }
        reportStatus(getTranslation('save_file_done', 'Documento guardado.'));
        return true;
    } catch (error) {
        console.error('No se pudo guardar el documento:', error);
        reportStatus(getTranslation('save_file_error', 'No se pudo guardar el documento.'));
        return false;
    }
}

function detectImportFormat(file) {
    if (!file) return null;
    const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    const extension = name.includes('.') ? name.split('.').pop() : '';
    if (extension && IMPORT_EXTENSION_MAP.has(extension)) {
        return IMPORT_EXTENSION_MAP.get(extension);
    }
    const mime = (file.type || '').toLowerCase();
    if (mime.includes('wordprocessingml')) return 'docx';
    if (mime.includes('opendocument')) return 'odt';
    if (mime.includes('epub')) return 'epub';
    if (mime.includes('html')) return 'html';
    if (mime.includes('tex')) return 'latex';
    return null;
}

function readFileForImport(file, format) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('file_read_error'));
        reader.onload = () => resolve(reader.result);
        if (BINARY_IMPORT_FORMATS.has(format)) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file, 'utf-8');
        }
    });
}

function getSafeDocumentName(filename, fallback = 'documento') {
    if (typeof filename !== 'string' || !filename.trim()) return fallback;
    return filename.replace(/\.[^.]+$/, '').trim() || fallback;
}

/*
  Convertir un archivo puede tardar bastante: la primera vez hay que cargar el
  módulo de Pandoc, y las imágenes y las fórmulas se procesan después. El aviso
  dice siempre qué archivo se está convirtiendo, en qué paso va y, si son
  varios, por cuál se va, para que la espera no parezca que no pasa nada.
*/
/*
  En serie y no en paralelo: cada conversión levanta su propia instancia de
  Pandoc, así que lanzarlas a la vez multiplicaría la memoria sin ir más rápido.
  Al terminar se resume cuántas salieron bien, porque el aviso del último
  archivo no dice nada de los anteriores.
*/
async function importFilesSequentially(files) {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    let done = 0;
    for (let i = 0; i < list.length; i += 1) {
        try {
            if (await importFileWithPandoc(list[i], { index: i + 1, total: list.length })) done += 1;
        } catch (error) {
            console.error('No se pudo importar el archivo:', error);
        }
    }

    if (list.length > 1) {
        reportStatus(done === list.length
            ? formatTranslation('import_done_all', '{count} archivos importados.', { count: done })
            : formatTranslation('import_done_partial', '{done} de {total} archivos importados.', { done, total: list.length }));
    }
}

function importProgressLabel(file, index, total) {
    const name = file && file.name ? file.name : '';
    return total > 1
        ? formatTranslation('import_progress_multi', 'Importando {index} de {total}: {name}', { index, total, name })
        : formatTranslation('import_progress_single', 'Importando {name}', { name });
}

async function importFileWithPandoc(file, { index = 1, total = 1 } = {}) {
    const label = importProgressLabel(file, index, total);
    // Los puntos suspensivos mantienen el aviso en pantalla mientras se trabaja.
    const reportStep = (step) => reportStatus(step ? `${label} · ${step}` : `${label}…`);

    const format = detectImportFormat(file);
    if (!format) {
        reportStatus(getTranslation('import_file_unsupported', 'Formato no soportado para importar.'));
        return false;
    }
    if (!window.PandocExporter || typeof window.PandocExporter.importToMarkdown !== 'function') {
        reportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        return false;
    }
    reportStep();
    let payload;
    try {
        payload = await readFileForImport(file, format);
    } catch (error) {
        console.error('No se pudo leer el archivo para importar:', error);
        reportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        return false;
    }
    try {
        reportStep(getTranslation('import_file_status_preparing', 'Importando con Pandoc...'));
        const markdown = await window.PandocExporter.importToMarkdown({
            data: payload,
            sourceFormat: format,
            onStatus: reportStep,
        });
        const docName = getSafeDocumentName(file.name);
        const createdDoc = newDoc(docName, markdown);
        if (createdDoc) {
            updateDirtyIndicator(createdDoc.id, false);
        }
        if (total === 1) {
            reportStatus(getTranslation('import_file_success', 'Importación completada.'));
        }
        return true;
    } catch (error) {
        console.error('Error durante la importación con Pandoc:', error);
        reportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        return false;
    }
}

function snapshotDefaultButtonHtml(btn) {
    if (!btn) return;
    btn.dataset.defaultHtml = btn.innerHTML;
}

function restoreDefaultButtonHtml(btn, fallbackHtml) {
    if (!btn) return;
    const defaultHtml = typeof btn.dataset.defaultHtml === 'string' ? btn.dataset.defaultHtml : fallbackHtml;
    if (typeof defaultHtml !== 'string') return;
    btn.innerHTML = defaultHtml;
    if (window.lucide) lucide.createIcons();
}

async function copyPlain(text, btn) {
    if (!btn) return;
    const fallbackHtml = btn.innerHTML;
    if (typeof btn.dataset.defaultHtml !== 'string') {
        snapshotDefaultButtonHtml(btn);
    }
    try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<i data-lucide="check" class="text-green-500"></i>';
    } catch (err) {
        console.error('No se pudo copiar:', err);
        btn.innerHTML = '<i data-lucide="x" class="text-red-500"></i>';
        throw err;
    } finally {
        if (window.lucide) lucide.createIcons();
        setTimeout(() => restoreDefaultButtonHtml(btn, fallbackHtml), 2000);
    }
}

async function copyRich(html, btn) {
    if (!btn) return;
    const fallbackHtml = btn.innerHTML;
    if (typeof btn.dataset.defaultHtml !== 'string') {
        snapshotDefaultButtonHtml(btn);
    }
    try {
        if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': new Blob([html], { type: 'text/html' }),
                    'text/plain': new Blob([html], { type: 'text/plain' })
                })
            ]);
        } else {
            await navigator.clipboard.writeText(html);
        }
        btn.innerHTML = '<i data-lucide="check" class="text-green-500"></i>';
    } catch (err) {
        console.error('No se pudo copiar:', err);
        btn.innerHTML = '<i data-lucide="x" class="text-red-500"></i>';
        throw err;
    } finally {
        if (window.lucide) lucide.createIcons();
        setTimeout(() => restoreDefaultButtonHtml(btn, fallbackHtml), 2000);
    }
}

function showCopyFeedback(btn, success) {
    if (!btn) return;
    const fallbackHtml = btn.innerHTML;
    if (typeof btn.dataset.defaultHtml !== 'string') {
        snapshotDefaultButtonHtml(btn);
    }
    btn.innerHTML = success
        ? '<i data-lucide="check" class="text-green-500"></i>'
        : '<i data-lucide="x" class="text-red-500"></i>';
    if (window.lucide) lucide.createIcons();
    setTimeout(() => restoreDefaultButtonHtml(btn, fallbackHtml), 2000);
}

async function writeTextToClipboard(text) {
  let lastError = null;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      lastError = err;
    }
  }

  const tempTextarea = document.createElement('textarea');
  tempTextarea.value = text;
  tempTextarea.setAttribute('aria-hidden', 'true');
  tempTextarea.style.position = 'fixed';
  tempTextarea.style.opacity = '0';
  tempTextarea.style.pointerEvents = 'none';
  tempTextarea.style.top = '0';
  tempTextarea.style.left = '0';
  document.body.appendChild(tempTextarea);
  try {
    tempTextarea.focus({ preventScroll: true });
  } catch (_) {
    tempTextarea.focus();
  }
  tempTextarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(tempTextarea);
  if (!success) {
    if (lastError) throw lastError;
    throw new Error('document.execCommand("copy") returned false');
  }
}

function buildHtmlWithTex() {
  const htmlOutput = document.getElementById('html-output');
  if (!htmlOutput) return '';
  const clone = htmlOutput.cloneNode(true);
  const inlineFallback = tex => `$${tex}$`;
  const displayFallback = tex => `\n\\[\n${tex}\n\\]\n`;
  const replaceNode = (node, fallbackBuilder) => {
    const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
    const dataset = node.dataset || {};
    let replacement = '';
    if (dataset.edimathSource) {
      replacement = dataset.edimathSource;
    } else if (dataset.edimathOpen && dataset.edimathClose) {
      replacement = `${dataset.edimathOpen}${tex}${dataset.edimathClose}`;
    } else {
      replacement = fallbackBuilder(tex);
    }
    node.replaceWith(document.createTextNode(replacement));
  };
  const displayNodes = Array.from(clone.querySelectorAll('.katex-display'));
  displayNodes.forEach(node => replaceNode(node, displayFallback));
  const inlineNodes = Array.from(clone.querySelectorAll('span.katex'))
    .filter(node => !node.closest('.katex-display'));
  inlineNodes.forEach(node => replaceNode(node, inlineFallback));
  return clone.innerHTML;
}

function applyLayout(layout) {
  currentLayout = layout;
  syncEnabled = (layout === 'dual');
  safeLocalStorageSet(LAYOUT_KEY, layout);

  const mdPanel = document.getElementById('markdown-panel');
  const htmlPanel = document.getElementById('html-panel');
  const gutters = document.querySelectorAll('.gutter');
  const visiblePanelDisplay = document.body.classList.contains('desktop-mode') ? 'flex' : 'block';

  switch (layout) {
    case 'md':
      mdPanel.style.display = visiblePanelDisplay;
      htmlPanel.style.display = 'none';
      gutters.forEach(g => g.style.display = 'none');
      mdPanel.style.width = '100%';
      break;
    case 'html':
      mdPanel.style.display = 'none';
      htmlPanel.style.display = visiblePanelDisplay;
      gutters.forEach(g => g.style.display = 'none');
      htmlPanel.style.width = '100%';
      break;
    default:
      mdPanel.style.display = visiblePanelDisplay;
      htmlPanel.style.display = visiblePanelDisplay;
      gutters.forEach(g => g.style.display = '');
      mdPanel.style.width = '50%';
      htmlPanel.style.width = '50%';
  }

  document.querySelectorAll('#layout-menu [data-layout]').forEach((option) => {
    const selected = option.dataset.layout === layout;
    option.setAttribute('aria-checked', selected ? 'true' : 'false');
    const check = option.querySelector('.layout-check');
    if (check) check.classList.toggle('hidden', !selected);
  });
  // El botón que despliega el menú muestra la disposición activa.
  const layoutIconHost = document.querySelector('#layout-menu-btn .layout-icon');
  if (layoutIconHost) {
    layoutIconHost.innerHTML = `<i data-lucide="${LAYOUT_ICONS[layout] || LAYOUT_ICONS.dual}"></i>`;
  }
  if(window.lucide) lucide.createIcons();

  setTimeout(() => {
    if (layout !== 'html') markdownEditor.refresh();
    if (layout !== 'md') htmlEditor.refresh();
  }, 10);
}

function cycleLayout(step = 1) {
  const layouts = ['dual', 'md', 'html'];
  if (!layouts.includes(currentLayout)) {
    currentLayout = 'dual';
  }
  const idx = layouts.indexOf(currentLayout);
  const nextIdx = (idx + step + layouts.length) % layouts.length;
  applyLayout(layouts[nextIdx]);
}

function applyFontSize(px) {
  document.documentElement.style.setProperty('--fs-base', px + 'px');
  safeLocalStorageSet(FS_KEY, px);
  if (markdownEditor) markdownEditor.refresh();
  if (htmlEditor) htmlEditor.refresh();
}


window.onload = () => {
    // --- Obtención de elementos del DOM ---
    const mainContainer = document.getElementById('main-container');
    const toggleWidthBtn = document.getElementById('toggle-width-btn');
    const desktopWindowBtn = document.getElementById('desktop-window-btn');
    const htmlOutput = document.getElementById('html-output');
    htmlOutputEl = htmlOutput;
    document.addEventListener('selectionchange', captureHtmlSelection);
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const htmlPanelTitle = document.getElementById('html-panel-title');
    const layoutMenuContainer = document.getElementById('layout-menu-container');
    const layoutMenuBtn = document.getElementById('layout-menu-btn');
    const layoutMenu = document.getElementById('layout-menu');
    const layoutOptions = layoutMenu ? Array.from(layoutMenu.querySelectorAll('[data-layout]')) : [];
    const toolbar = document.getElementById('toolbar');
    const focusModeToggleBtn = document.getElementById('focus-mode-toggle');
    const toolbarActionsEl = document.getElementById('toolbar-actions');
    const mobileToolbarControls = document.getElementById('mobile-toolbar-controls');
    const mobileActionsToggle = document.getElementById('mobile-actions-toggle');
    const mobileFormatToggle = document.getElementById('mobile-format-toggle');
    const openFileBtn = document.getElementById('open-file-btn');
    const fileInput = document.getElementById('file-input');
    const saveBtn = document.getElementById('save-btn');
    const saveAsBtn = document.getElementById('save-as-btn');
    const exportMenuContainer = document.getElementById('export-menu-container');
    const exportMenuBtn = document.getElementById('export-menu-btn');
    const exportMenu = document.getElementById('export-menu');
    const exportOptionButtons = exportMenu ? Array.from(exportMenu.querySelectorAll('[data-export-format]')) : [];
    const printBtn = document.getElementById('print-btn');
    const helpBtn = document.getElementById('help-btn');
    const aboutBtn = document.getElementById('about-btn');
    const aboutModalOverlay = document.getElementById('about-modal-overlay');
    const aboutCloseBtn = document.getElementById('about-close-btn');
    const desktopReleaseBanner = document.getElementById('desktop-release-banner');
    const desktopBannerClose = document.getElementById('desktop-banner-close');
    const desktopBannerNeverShow = document.getElementById('desktop-banner-never-show');
    const updateBanner = document.getElementById('update-banner');
    const updateBannerMessage = document.getElementById('update-banner-message');
    const updateInstallBtn = document.getElementById('update-install-btn');
    const updateNotesLink = document.getElementById('update-notes-link');
    const updateAutoCheck = document.getElementById('update-auto-check');
    const updateBannerClose = document.getElementById('update-banner-close');
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    const quitAppBtn = document.getElementById('quit-app-btn');
    const quitAppSeparator = document.getElementById('quit-app-separator');
    const copyMdBtn = document.getElementById('copy-md-btn');
    const copyHtmlBtn = document.getElementById('copy-html-btn');
    const pasteBtn = document.getElementById('paste-btn');
    base64UiContainer = document.getElementById('base64-hidden-container');
    base64UiList = document.getElementById('base64-hidden-list');
    base64UiCountLabel = document.getElementById('base64-hidden-count');
    base64ModalOverlayEl = document.getElementById('base64-modal-overlay');
    base64ModalTextarea = document.getElementById('base64-modal-text');
    base64ModalCopyBtn = document.getElementById('copy-base64-code-btn');
    base64ModalCloseBtn = document.getElementById('close-base64-modal-btn');
    if (copyMdBtn) snapshotDefaultButtonHtml(copyMdBtn);
    if (copyHtmlBtn) snapshotDefaultButtonHtml(copyHtmlBtn);
    let copyHtmlBtnLabel = copyHtmlBtn ? copyHtmlBtn.querySelector('.copy-html-btn-label') : null;
    const previewCopyContainer = document.getElementById('preview-copy-container');
    const previewCopyMenu = document.getElementById('preview-copy-menu');
    const previewCopyToggleBtn = document.getElementById('copy-html-menu-toggle');
    const previewCopyOptionButtons = previewCopyMenu ? Array.from(previewCopyMenu.querySelectorAll('[data-copy-action]')) : [];
    const COPY_ACTIONS = ['html', 'latex-preview', 'latex-full'];
    markdownCharCounterEl = document.getElementById('markdown-char-counter');
    let currentCopyAction = safeLocalStorageGet(COPY_ACTION_KEY);
    if (!COPY_ACTIONS.includes(currentCopyAction)) currentCopyAction = 'html';
    const copyActionLabelKeys = {
        html: 'copy_menu_option_html',
        'latex-preview': 'copy_menu_option_latex_preview',
        'latex-full': 'copy_menu_option_latex_full'
    };
    const copyActionFallbackTexts = {
        html: 'Copy',
        'latex-preview': 'Copy LaTeX',
        'latex-full': 'Copy LaTeX (full document)'
    };
    if (base64ModalCopyBtn) {
        base64ModalCopyBtn.addEventListener('click', () => {
            if (!base64ModalTextarea) return;
            copyPlain(base64ModalTextarea.value, base64ModalCopyBtn).catch(() => {});
        });
    }
    if (base64ModalCloseBtn) {
        base64ModalCloseBtn.addEventListener('click', closeBase64Modal);
    }
    if (base64ModalOverlayEl) {
        base64ModalOverlayEl.addEventListener('click', (e) => {
            if (e.target === base64ModalOverlayEl) {
                closeBase64Modal();
            }
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && base64ModalOverlayEl && !base64ModalOverlayEl.classList.contains('hidden')) {
            closeBase64Modal();
        }
    });
    if (pasteBtn) {
        pasteBtn.addEventListener('click', () => handlePasteButtonClick(pasteBtn));
    }
    updateBase64Ui(currentBase64State);
    updateVersionLabel();

    function getCopyStartMessage(action) {
        if (action === 'latex-preview' || action === 'latex-full') {
            return getTranslation('copy_preparing_latex', 'Generando LaTeX…');
        }
        if (action === 'markdown') {
            return getTranslation('copy_preparing_markdown', 'Preparando Markdown para copiar…');
        }
        return getTranslation('copy_preparing_generic', 'Preparando contenido para copiar…');
    }

    function getCopySuccessMessage(action) {
        if (action === 'markdown') {
            return getTranslation('copy_markdown_done', 'Markdown copiado al portapapeles.');
        }
        if (action === 'html') {
            return getTranslation('copy_html_done', 'HTML copiado al portapapeles.');
        }
        return null;
    }
    function updateCopyButtonLabel(action) {
        if (!copyHtmlBtn) return;
        const labelEl = copyHtmlBtn.querySelector('.copy-html-btn-label');
        if (!labelEl) return;
        copyHtmlBtnLabel = labelEl;
        const labelKey = copyActionLabelKeys[action] || copyActionLabelKeys.html;
        const fallback = copyActionFallbackTexts[action] || copyActionFallbackTexts.html;
        const label = getTranslation(labelKey, fallback);
        copyHtmlBtnLabel.textContent = label;
        const titleText = getTranslation('copy_html_btn_title', 'Copiar HTML');
        copyHtmlBtn.setAttribute('title', titleText);
        copyHtmlBtn.setAttribute('aria-label', titleText);
        copyHtmlBtn.setAttribute('data-current-copy-action', action);
        snapshotDefaultButtonHtml(copyHtmlBtn);
    }

    function updatePreviewCopyOptionStyles(action) {
        if (!previewCopyOptionButtons.length) return;
        previewCopyOptionButtons.forEach(btn => {
            const isActive = btn.getAttribute('data-copy-action') === action;
            btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
            btn.classList.toggle('font-semibold', isActive);
            // Un fondo gris sería idéntico al de hover: la marca es un check.
            const check = btn.querySelector('.copy-check');
            if (check) check.classList.toggle('hidden', !isActive);
        });
    }

    function applyCopyActionState(action, { persist = true } = {}) {
        const usableAction = COPY_ACTIONS.includes(action) ? action : 'html';
        currentCopyAction = usableAction;
        if (persist) {
            safeLocalStorageSet(COPY_ACTION_KEY, usableAction);
        }
        updateCopyButtonLabel(usableAction);
        updatePreviewCopyOptionStyles(usableAction);
    }

    window.__updateCopyButtonLabel = () => {
        updateCopyButtonLabel(currentCopyAction);
        updatePreviewCopyOptionStyles(currentCopyAction);
    };

    applyCopyActionState(currentCopyAction, { persist: false });

    undoButtonEl = document.getElementById('undo-btn');
    redoButtonEl = document.getElementById('redo-btn');
    const headingBtn = document.getElementById('heading-btn');
    const headingOptions = document.getElementById('heading-options');
    const headingDropdownContainer = document.getElementById('heading-dropdown-container');
    const formulaDropdownContainer = document.getElementById('formula-dropdown-container');
    const formulaBtn = document.getElementById('formula-btn');
    const formulaOptions = document.getElementById('formula-options');
    const formulaOptionButtons = formulaOptions ? Array.from(formulaOptions.querySelectorAll('[data-format]')) : [];
    const languageSelectEl = document.getElementById('language-select');
    const languageWrapper = document.getElementById('language-select-wrapper');
    const fontSizeSelect = document.getElementById('font-size-select');
    const fontSizeWrapper = document.getElementById('font-size-select-wrapper');
    const fontSizeLabel = document.getElementById('font-size-select-label');
    const openEdicuatexBtn = document.getElementById('open-edicuatex-btn');
    const edicuatexModalOverlay = document.getElementById('edicuatex-modal-overlay');
    const edicuatexFrame = document.getElementById('edicuatex-frame');
    const edicuatexCloseBtn = document.getElementById('edicuatex-close-btn');
    const importFileBtn = document.getElementById('import-file-btn');
    const importFileInput = document.getElementById('import-file-input');
    const actionsMenuContainer = document.getElementById('actions-menu-container');
    const actionsMenuBtn = document.getElementById('actions-menu-btn');
    const actionsMenu = document.getElementById('actions-menu');
    const settingsMenuContainer = document.getElementById('settings-menu-container');
    const settingsMenuBtn = document.getElementById('settings-menu-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const newTabBtn = document.getElementById('new-tab-btn');
    const tabBar = document.getElementById('tab-bar');
    initializeTabDragAndDrop(tabBar);
    headingOptionsEl = headingOptions;
    formulaOptionsEl = formulaOptions;
    markdownControlButtons = (() => {
        if (!toolbar) return [];
        const buttons = new Set(Array.from(toolbar.querySelectorAll('button[data-format]')));
        if (headingBtn) buttons.add(headingBtn);
        return Array.from(buttons);
    })();
    if (undoButtonEl) {
        undoButtonEl.addEventListener('click', () => {
            if (markdownEditor && typeof markdownEditor.undo === 'function') {
                markdownEditor.undo();
                markdownEditor.focus();
                updateUndoRedoButtons();
            }
        });
    }
    if (redoButtonEl) {
        redoButtonEl.addEventListener('click', () => {
            if (markdownEditor && typeof markdownEditor.redo === 'function') {
                markdownEditor.redo();
                markdownEditor.focus();
                updateUndoRedoButtons();
            }
        });
    }
    setMarkdownControlsDisabled(false);

    const readFocusModePreference = () => {
        return safeLocalStorageGet(FOCUS_MODE_KEY) === '1';
    };

    const persistFocusModePreference = (enabled) => {
        safeLocalStorageSet(FOCUS_MODE_KEY, enabled ? '1' : '0');
    };

    const applyFocusModeState = (enabled) => {
        if (!mainContainer) return;
        mainContainer.classList.toggle('focus-mode', enabled);
        if (focusModeToggleBtn) {
            focusModeToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        }
    };

    applyFocusModeState(readFocusModePreference());

    if (focusModeToggleBtn && mainContainer) {
        focusModeToggleBtn.addEventListener('click', () => {
            const nextState = !mainContainer.classList.contains('focus-mode');
            applyFocusModeState(nextState);
            persistFocusModePreference(nextState);
        });
    }
    
    // --- Elementos de modales ---
    const tableModalOverlay = document.getElementById('table-modal-overlay');
    const createTableBtn = document.getElementById('create-table-btn');
    const cancelTableBtn = document.getElementById('cancel-table-btn');
    const linkModalOverlay = document.getElementById('link-modal-overlay');
    const insertLinkBtn = document.getElementById('insert-link-btn');
    const cancelLinkBtn = document.getElementById('cancel-link-btn');
    const imageModalOverlay = document.getElementById('image-modal-overlay');
    const insertImageBtn = document.getElementById('insert-image-btn');
    const cancelImageBtn = document.getElementById('cancel-image-btn');
    const latexImportBtn = document.getElementById('latex-import-btn');
    latexImportModalOverlay = document.getElementById('latex-import-modal-overlay');
    latexImportTextarea = document.getElementById('latex-import-input');
    latexImportStatusEl = document.getElementById('latex-import-status');
    latexImportConvertBtn = document.getElementById('latex-import-convert-btn');
    latexImportCancelBtn = document.getElementById('latex-import-cancel-btn');
    const latexSettingsBtn = document.getElementById('latex-settings-btn');
    const latexSettingsOverlay = document.getElementById('latex-settings-modal-overlay');
    const docLanguageSelect = document.getElementById('doc-language');
    const docLanguageCodeField = document.getElementById('doc-language-code-field');
    const docLanguageCodeInput = document.getElementById('doc-language-code');
    const docAuthorInput = document.getElementById('doc-author');
    const docTocCheckbox = document.getElementById('doc-toc');
    const docNumberingCheckbox = document.getElementById('doc-number-sections');
    const coverRadios = Array.from(document.querySelectorAll('input[name="epub-cover"]'));
    const coverPicker = document.getElementById('epub-cover-picker');
    const coverBtn = document.getElementById('epub-cover-btn');
    const coverInput = document.getElementById('epub-cover-input');
    const coverPreview = document.getElementById('epub-cover-preview');
    const coverName = document.getElementById('epub-cover-name');
    // La imagen vive en el almacenamiento del navegador, junto a los documentos
    // autoguardados: una portada enorme dejaría sin sitio a lo que de verdad
    // importa. Para la miniatura de una estantería, esto sobra.
    const MAX_COVER_BYTES = 1024 * 1024;
    let pendingCover = { image: '', name: '' };
    const latexClassSelect = document.getElementById('latex-documentclass');
    const latexClassOptionsInput = document.getElementById('latex-classoption');
    const latexPreambleTextarea = document.getElementById('latex-preamble');
    const latexSettingsSaveBtn = document.getElementById('latex-settings-save-btn');
    const latexSettingsCancelBtn = document.getElementById('latex-settings-cancel-btn');
    const latexSettingsResetBtn = document.getElementById('latex-settings-reset-btn');
    const statusToastEl = document.getElementById('status-toast');
    const statusToastMessageEl = document.getElementById('status-toast-message');
    let statusToastTimer = null;

    const updateFontSizeLabel = () => {
        if (!fontSizeSelect || !fontSizeLabel) return;
        const option = fontSizeSelect.options[fontSizeSelect.selectedIndex];
        if (option) fontSizeLabel.textContent = option.textContent.trim();
    };
    window.__updateFontSizeLabel = updateFontSizeLabel;

    /*
      Idioma y tamaño de texto se eligen desde submenús que cuelgan del menú
      Configuración, igual que Exportar cuelga del menú Archivo. El <select>
      original sigue existiendo oculto: es quien guarda el valor y dispara el
      evento que ya escuchaban i18n.js y el resto del código.
    */
    const settingsSubmenus = [];

    function closeSettingsSubmenus(except = null) {
        settingsSubmenus.forEach(({ menu, button }) => {
            if (menu === except) return;
            menu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
        });
    }

    function setupSettingsSubmenu({ containerId, buttonId, menuId, selectId, attribute }) {
        const container = document.getElementById(containerId);
        const button = document.getElementById(buttonId);
        const menu = document.getElementById(menuId);
        const select = document.getElementById(selectId);
        if (!container || !button || !menu || !select) return;

        const options = Array.from(menu.querySelectorAll(`[${attribute}]`));
        settingsSubmenus.push({ menu, button });

        const syncChecks = () => {
            options.forEach((option) => {
                const isActive = option.getAttribute(attribute) === select.value;
                option.setAttribute('aria-checked', isActive ? 'true' : 'false');
                option.classList.toggle('font-semibold', isActive);
                const check = option.querySelector('.submenu-check');
                if (check) check.classList.toggle('hidden', !isActive);
            });
        };

        const open = () => {
            closeSettingsSubmenus(menu);
            syncChecks();
            menu.classList.remove('hidden');
            button.setAttribute('aria-expanded', 'true');
        };
        const close = () => {
            menu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
        };

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (POINTER_HAS_HOVER || menu.classList.contains('hidden')) open();
            else close();
        });

        if (POINTER_HAS_HOVER) {
            let closeTimer;
            container.addEventListener('mouseenter', () => {
                clearTimeout(closeTimer);
                open();
            });
            container.addEventListener('mouseleave', () => {
                clearTimeout(closeTimer);
                closeTimer = setTimeout(close, 250);
            });
        }

        options.forEach((option) => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                select.value = option.getAttribute(attribute);
                select.dispatchEvent(new Event('change', { bubbles: true }));
                syncChecks();
                close();
                closeSettingsMenu();
            });
        });

        select.addEventListener('change', syncChecks);
        syncChecks();
    }

    setupSettingsSubmenu({
        containerId: 'language-menu-container', buttonId: 'language-menu-btn',
        menuId: 'language-menu', selectId: 'language-select', attribute: 'data-lang',
    });
    setupSettingsSubmenu({
        containerId: 'font-size-menu-container', buttonId: 'font-size-menu-btn',
        menuId: 'font-size-menu', selectId: 'font-size-select', attribute: 'data-font-size',
    });
    setupSettingsSubmenu({
        containerId: 'theme-menu-container', buttonId: 'theme-menu-btn',
        menuId: 'theme-menu', selectId: 'theme-select', attribute: 'data-theme',
    });

    if (POINTER_HAS_HOVER) {
        document.querySelectorAll('#settings-menu > [role="menuitem"]').forEach((item) => {
            item.addEventListener('mouseenter', () => closeSettingsSubmenus());
        });
    }

    const attachSelectFocusHandlers = (selectEl, wrapper) => {
        if (!selectEl || !wrapper) return;
        selectEl.addEventListener('focus', () => wrapper.classList.add('select-focus'));
        selectEl.addEventListener('blur', () => wrapper.classList.remove('select-focus'));
    };
    attachSelectFocusHandlers(languageSelectEl, languageWrapper);
    attachSelectFocusHandlers(fontSizeSelect, fontSizeWrapper);

    const closeFormulaOptions = () => {
        if (formulaOptions) formulaOptions.classList.add('hidden');
        if (formulaBtn) formulaBtn.setAttribute('aria-expanded', 'false');
    };
    const openFormulaOptions = () => {
        if (!formulaOptions) return;
        formulaOptions.classList.remove('hidden');
        if (formulaBtn) formulaBtn.setAttribute('aria-expanded', 'true');
        const firstBtn = formulaOptionButtons[0];
        if (firstBtn) firstBtn.focus();
    };

    if (formulaBtn) {
        formulaBtn.setAttribute('aria-expanded', 'false');
        formulaBtn.addEventListener('click', (event) => {
            if (formulaBtn.dataset.controlsDisabled === 'true') {
                event.preventDefault();
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (!formulaOptions) return;
            if (formulaOptions.classList.contains('hidden')) {
                openFormulaOptions();
            } else {
                closeFormulaOptions();
            }
        });
    }

    if (formulaOptionButtons.length) {
        formulaOptionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                closeFormulaOptions();
            });
        });
    }

    document.addEventListener('click', (event) => {
        if (!formulaDropdownContainer) return;
        if (!formulaDropdownContainer.contains(event.target)) {
            closeFormulaOptions();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeFormulaOptions();
        }
    });

    /*
      Idioma de este documento.

      Vive en el bloque de metadatos del propio Markdown, así que viaja con el
      archivo: al guardarlo y volver a abrirlo, aquí o en otro equipo, sigue
      siendo el suyo. Sin declarar, el documento usa el idioma general de
      Configuración, que es lo que ocurre con casi todos.
    */
    const docLangContainer = document.getElementById('doc-lang-container');
    const docLangBtn = document.getElementById('doc-lang-btn');
    const docLangLabel = document.getElementById('doc-lang-label');
    const docLangMenu = document.getElementById('doc-lang-menu');
    const docLangOtherBtn = document.getElementById('doc-lang-other-btn');
    const docLangOptions = docLangMenu ? Array.from(docLangMenu.querySelectorAll('[data-doc-lang]')) : [];

    const closeDocLangMenu = () => {
        if (docLangMenu) docLangMenu.classList.add('hidden');
        if (docLangBtn) docLangBtn.setAttribute('aria-expanded', 'false');
    };

    function generalDocumentLanguage() {
        const settings = window.__edimarkLatexSettings || {};
        const chosen = String(settings.documentLanguage || '').trim();
        if (chosen && chosen !== 'auto') return chosen;
        return window.__edimarkLang || document.documentElement.lang || 'es';
    }

    function refreshDocLanguageIndicator() {
        if (!docLangBtn || !markdownEditor) return;
        const own = splitDocumentFrontMatter(markdownEditor.getValue()).lang;
        const effective = own || generalDocumentLanguage();
        if (markdownTextareaEl) {
            markdownTextareaEl.setAttribute('lang', effective);
            markdownTextareaEl.setAttribute('spellcheck', 'true');
        }
        if (docLangLabel) docLangLabel.textContent = effective.toUpperCase();
        // Sin idioma propio, el botón se ve más apagado: lo hereda.
        docLangBtn.classList.toggle('doc-lang-inherited', !own);
        const languageDescription = formatTranslation(
            own ? 'doc_lang_btn_own' : 'doc_lang_btn_inherited',
            own ? 'Idioma de este documento: {lang}' : 'Idioma general: {lang}',
            { lang: effective },
        );
        const actionDescription = formatTranslation(
            'doc_lang_btn_title',
            'Cambiar idioma y autor de este documento.',
        );
        docLangBtn.setAttribute('aria-label', `${actionDescription} ${languageDescription}`);
        docLangBtn.setAttribute('title', actionDescription);
        docLangOptions.forEach((option) => {
            const selected = (option.dataset.docLang || '') === own;
            option.setAttribute('aria-checked', selected ? 'true' : 'false');
            const check = option.querySelector('.doc-lang-check');
            if (check) check.classList.toggle('hidden', !selected);
        });
    }
    window.__refreshDocLanguageIndicator = refreshDocLanguageIndicator;

    /*
      Escribe (o quita) el idioma del documento sin tocar el resto de sus
      metadatos ni su contenido.
    */
    function setDocumentLanguage(code) {
        if (!markdownEditor) return;
        const api = window.PandocExporter;
        const current = markdownEditor.getValue();
        const { frontMatter, body } = splitDocumentFrontMatter(current);
        const clean = String(code || '').trim();

        let updated;
        if (!clean) {
            // Volver al idioma general: fuera la línea, y fuera el bloque si se
            // queda sin nada dentro.
            if (!frontMatter) return;
            const kept = frontMatter.split('\n').filter(line => !/^lang\s*:/.test(line));
            const hasFields = kept.slice(1).some(line => line.trim() && line.trim() !== '---');
            updated = hasFields ? `${kept.join('\n')}\n\n${body}` : body;
        } else if (frontMatter && /^lang\s*:/m.test(frontMatter)) {
            const replaced = frontMatter.replace(/^lang\s*:.*$/m, `lang: "${clean.replace(/"/g, '\\"')}"`);
            updated = `${replaced}\n\n${body}`;
        } else if (api && typeof api.mergeFrontMatter === 'function') {
            updated = api.mergeFrontMatter(current, [
                { key: 'lang', lines: [`lang: "${clean.replace(/"/g, '\\"')}"`] },
            ]).markdown;
        } else {
            updated = `---\nlang: "${clean.replace(/"/g, '\\"')}"\n---\n\n${current}`;
        }

        if (updated === current) return;
        markdownEditor.setValue(updated);
        updateHtml();
        refreshDocLanguageIndicator();
    }

    if (docLangBtn) {
        docLangBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!docLangMenu) return;
            const hidden = docLangMenu.classList.contains('hidden');
            docLangMenu.classList.toggle('hidden', !hidden);
            docLangBtn.setAttribute('aria-expanded', hidden ? 'true' : 'false');
        });
    }
    docLangOptions.forEach((option) => {
        option.addEventListener('click', () => {
            setDocumentLanguage(option.dataset.docLang || '');
            closeDocLangMenu();
        });
    });
    if (docLangOtherBtn) {
        docLangOtherBtn.addEventListener('click', () => {
            closeDocLangMenu();
            const current = splitDocumentFrontMatter(markdownEditor.getValue()).lang;
            const answer = prompt(
                getTranslation('doc_lang_other_prompt', 'Código del idioma (por ejemplo fr, de o pt-BR):'),
                current,
            );
            if (answer === null) return;
            setDocumentLanguage(answer.trim());
        });
    }

    /*
      Autor de este documento, en el mismo bloque de metadatos que el idioma.
      Vacío significa el autor general de Configuración, o ninguno.
    */
    function currentDocumentAuthor() {
        const { frontMatter } = splitDocumentFrontMatter(markdownEditor.getValue());
        const match = frontMatter ? frontMatter.match(/^author\s*:\s*(.*)$/m) : null;
        return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
    }

    function setDocumentAuthor(name) {
        if (!markdownEditor) return;
        const api = window.PandocExporter;
        const current = markdownEditor.getValue();
        const { frontMatter, body } = splitDocumentFrontMatter(current);
        const clean = String(name || '').trim();

        let updated;
        if (!clean) {
            if (!frontMatter) return;
            const kept = frontMatter.split('\n').filter(line => !/^author\s*:/.test(line));
            const hasFields = kept.slice(1).some(line => line.trim() && line.trim() !== '---');
            updated = hasFields ? `${kept.join('\n')}\n\n${body}` : body;
        } else if (frontMatter && /^author\s*:/m.test(frontMatter)) {
            const replaced = frontMatter.replace(/^author\s*:.*$/m, `author: "${clean.replace(/"/g, '\\"')}"`);
            updated = `${replaced}\n\n${body}`;
        } else if (api && typeof api.mergeFrontMatter === 'function') {
            updated = api.mergeFrontMatter(current, [
                { key: 'author', lines: [`author: "${clean.replace(/"/g, '\\"')}"`] },
            ]).markdown;
        } else {
            updated = `---\nauthor: "${clean.replace(/"/g, '\\"')}"\n---\n\n${current}`;
        }

        if (updated === current) return;
        markdownEditor.setValue(updated);
        updateHtml();
    }

    const docAuthorBtn = document.getElementById('doc-author-btn');
    if (docAuthorBtn) {
        docAuthorBtn.addEventListener('click', () => {
            closeDocLangMenu();
            const answer = prompt(
                getTranslation('doc_author_prompt', 'Autor de este documento (deja vacío para usar el general):'),
                currentDocumentAuthor(),
            );
            if (answer === null) return;
            setDocumentAuthor(answer);
        });
    }
    document.addEventListener('click', (event) => {
        if (docLangContainer && !docLangContainer.contains(event.target)) closeDocLangMenu();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDocLangMenu();
    });

    if (window.lucide) lucide.createIcons();
    const params = new URLSearchParams(window.location.search);
    const browserDesktopMode = params.get(DESKTOP_PARAM_KEY) === '1';
    const nativeMode = Boolean(window.EdiMarkPlatform?.isDesktop);
    if (nativeMode && typeof window.EdiMarkPlatform.openExternalUrl === 'function') {
        document.addEventListener('click', (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const link = target?.closest('a[target="_blank"][href]');
            if (!link || !/^https?:$/i.test(new URL(link.href).protocol)) return;
            event.preventDefault();
            window.EdiMarkPlatform.openExternalUrl(link.href).catch((error) => {
                console.error('No se pudo abrir el enlace externo:', error);
            });
        });
    }
    const nativeIos = nativeMode && (
        /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
        || (/Mac/i.test(navigator.platform || '') && navigator.maxTouchPoints > 1)
    );
    const desktopMode = browserDesktopMode || (nativeMode && !nativeIos);
    const desktopSpawned = params.get(DESKTOP_SPAWNED_KEY) === '1';
    purgeOldReleaseBannerKeys();
    const releaseBannerDismissed = safeLocalStorageGet(DESKTOP_RELEASE_BANNER_KEY) === '1';
    if (desktopReleaseBanner && !nativeMode && !browserDesktopMode && !releaseBannerDismissed) {
        desktopReleaseBanner.hidden = false;
        mainContainer.classList.add('release-banner-visible');
    }
    if (desktopBannerNeverShow) {
        desktopBannerNeverShow.checked = releaseBannerDismissed;
        desktopBannerNeverShow.addEventListener('change', () => {
            if (desktopBannerNeverShow.checked) {
                safeLocalStorageSet(DESKTOP_RELEASE_BANNER_KEY, '1', { notify: false });
            } else {
                safeLocalStorageRemove(DESKTOP_RELEASE_BANNER_KEY);
            }
        });
    }
    if (desktopBannerClose && desktopReleaseBanner) {
        desktopBannerClose.addEventListener('click', () => {
            desktopReleaseBanner.hidden = true;
            mainContainer.classList.remove('release-banner-visible');
        });
    }

    /*
      Actualizaciones de la aplicación de escritorio. La versión publicada se
      consulta en las publicaciones de GitHub; si hay una posterior a la que
      está en marcha, el aviso ofrece descargar el instalador que corresponde a
      este sistema y entregárselo al instalador nativo.
    */
    let lastUpdateCheck = null;
    let updateCheckInProgress = false;
    let updateInstallInProgress = false;

    const autoUpdateCheckEnabled = () => safeLocalStorageGet(UPDATE_AUTO_CHECK_KEY, '1') !== '0';

    function hideUpdateBanner() {
        if (!updateBanner) return;
        updateBanner.hidden = true;
        if (!desktopReleaseBanner || desktopReleaseBanner.hidden) {
            mainContainer.classList.remove('release-banner-visible');
        }
    }

    function renderUpdateBanner() {
        if (!updateBanner || !lastUpdateCheck?.available) return;
        const { version, currentVersion, notesUrl, asset, releasesPageUrl } = lastUpdateCheck;
        if (updateBannerMessage) {
            updateBannerMessage.textContent = asset
                ? formatTranslation(
                    'update_available_message',
                    'EdiMarkWeb {version} ya está disponible; tienes la {current}.',
                    { version, current: currentVersion },
                )
                : formatTranslation(
                    'update_manual_download_message',
                    'EdiMarkWeb {version} ya está disponible, pero no hay ningún instalador para este sistema. Descárgala desde la página de novedades.',
                    { version },
                );
        }
        if (updateNotesLink) updateNotesLink.href = notesUrl || releasesPageUrl;
        if (updateInstallBtn) {
            updateInstallBtn.hidden = !asset;
            updateInstallBtn.disabled = updateInstallInProgress;
        }
        if (updateAutoCheck) updateAutoCheck.checked = autoUpdateCheckEnabled();
        updateBanner.hidden = false;
        mainContainer.classList.add('release-banner-visible');
        if (window.lucide) lucide.createIcons();
    }
    // El texto del aviso se compone con la versión, así que hay que rehacerlo
    // cuando el usuario cambia de idioma con el aviso en pantalla.
    window.__refreshUpdateBanner = () => {
        if (updateBanner && !updateBanner.hidden) renderUpdateBanner();
    };

    async function checkForApplicationUpdate({ manual = false } = {}) {
        const platform = window.EdiMarkPlatform;
        const updater = window.EdiMarkUpdater;
        if (!nativeMode || !updater || !platform || typeof platform.updateTarget !== 'function') return;
        if (updateCheckInProgress) return;
        updateCheckInProgress = true;
        if (manual) reportStatus(getTranslation('update_checking', 'Buscando actualizaciones…'));
        try {
            const target = await platform.updateTarget();
            const fetchImpl = typeof platform.updateFetch === 'function' ? platform.updateFetch() : null;
            const result = await updater.checkForUpdate({
                currentVersion: APP_VERSION,
                target,
                ...(fetchImpl ? { fetchImpl } : {}),
            });
            safeLocalStorageSet(UPDATE_LAST_CHECK_KEY, String(Date.now()), { notify: false });
            lastUpdateCheck = result;
            if (result.available) {
                renderUpdateBanner();
            } else if (manual) {
                reportStatus(formatTranslation(
                    'update_up_to_date',
                    'Ya tienes la última versión ({version}).',
                    { version: result.version },
                ));
            }
        } catch (error) {
            console.error('No se pudo comprobar si hay actualizaciones:', error);
            if (manual) reportStatus(getTranslation('update_check_failed', 'No se pudo comprobar si hay actualizaciones.'));
        } finally {
            updateCheckInProgress = false;
        }
    }

    async function downloadAndInstallUpdate() {
        const platform = window.EdiMarkPlatform;
        const updater = window.EdiMarkUpdater;
        const asset = lastUpdateCheck?.asset;
        if (!asset || updateInstallInProgress || !updater || !platform) return;
        updateInstallInProgress = true;
        if (updateInstallBtn) updateInstallBtn.disabled = true;
        try {
            const fetchImpl = typeof platform.updateFetch === 'function' ? platform.updateFetch() : null;
            const bytes = await updater.downloadAsset(asset, {
                ...(fetchImpl ? { fetchImpl } : {}),
                onProgress: (ratio) => {
                    if (!updateBannerMessage) return;
                    updateBannerMessage.textContent = ratio === null
                        ? getTranslation('update_downloading_unknown', 'Descargando la actualización…')
                        : formatTranslation(
                            'update_downloading',
                            'Descargando la actualización… {percent}%',
                            { percent: Math.round(ratio * 100) },
                        );
                },
            });
            const path = await platform.installDownloadedUpdate(asset.name, bytes);
            const message = /\.appimage$/i.test(asset.name)
                ? formatTranslation(
                    'update_ready_appimage',
                    'Descargado en {path}. Sustituye tu AppImage por este archivo.',
                    { path },
                )
                : getTranslation(
                    'update_ready_installer',
                    'Instalador descargado. Termina la instalación y vuelve a abrir EdiMarkWeb.',
                );
            if (updateBannerMessage) updateBannerMessage.textContent = message;
            reportStatus(message);
            if (updateInstallBtn) updateInstallBtn.hidden = true;
        } catch (error) {
            console.error('No se pudo instalar la actualización:', error);
            reportStatus(getTranslation('update_download_failed', 'No se pudo descargar la actualización.'));
            renderUpdateBanner();
        } finally {
            updateInstallInProgress = false;
            if (updateInstallBtn) updateInstallBtn.disabled = false;
        }
    }

    if (updateAutoCheck) {
        updateAutoCheck.checked = autoUpdateCheckEnabled();
        updateAutoCheck.addEventListener('change', () => {
            safeLocalStorageSet(UPDATE_AUTO_CHECK_KEY, updateAutoCheck.checked ? '1' : '0', { notify: false });
        });
    }
    if (updateBannerClose) updateBannerClose.addEventListener('click', hideUpdateBanner);
    if (updateInstallBtn) updateInstallBtn.addEventListener('click', () => { downloadAndInstallUpdate(); });
    if (quitAppBtn && nativeMode) {
        quitAppBtn.classList.remove('hidden');
        quitAppBtn.classList.add('flex');
        if (quitAppSeparator) quitAppSeparator.classList.remove('hidden');
        quitAppBtn.addEventListener('click', () => {
            closeActionsMenu();
            // Entre dos tics del temporizador caben tres segundos de escritura.
            autosaveCurrentDoc();
            window.EdiMarkPlatform.quitApplication().catch((error) => {
                console.error('No se pudo cerrar la aplicación:', error);
            });
        });
    }
    if (checkUpdatesBtn && nativeMode) {
        checkUpdatesBtn.classList.remove('hidden');
        checkUpdatesBtn.addEventListener('click', () => {
            closeSettingsMenu();
            checkForApplicationUpdate({ manual: true });
        });
    }
    if (nativeMode && autoUpdateCheckEnabled()) {
        const previousCheck = Number(safeLocalStorageGet(UPDATE_LAST_CHECK_KEY, '0')) || 0;
        if (Date.now() - previousCheck >= UPDATE_CHECK_INTERVAL_MS) {
            // Fuera del arranque: la comprobación no debe retrasar la apertura
            // del documento con el que se ha abierto la aplicación.
            setTimeout(() => { checkForApplicationUpdate(); }, 4000);
        }
    }
    if (desktopMode) {
        document.body.classList.add('desktop-mode');
        if (toggleWidthBtn) toggleWidthBtn.classList.add('hidden');
        if (desktopWindowBtn) desktopWindowBtn.classList.add('hidden');
        if (browserDesktopMode && !nativeMode && !desktopSpawned && (!window.opener || window.opener.closed)) {
            const spawned = openDesktopWindow(true);
            if (spawned) {
                try { window.close(); } catch (_) {}
                return;
            }
            if (desktopWindowBtn) desktopWindowBtn.classList.remove('hidden');
        }
    }

    function resolveHostOrigin() {
        const origin = window.location.origin;
        if (!origin || origin === 'null' || origin.startsWith('file:')) {
            return '*';
        }
        return origin;
    }

    function buildEdicuatexUrl(initialLatex = '') {
        const url = new URL(nativeMode ? EDICUATEX_DESKTOP_PATH : EDICUATEX_BASE_URL, window.location.href);
        url.searchParams.set('pm', '1');
        url.searchParams.set('origin', resolveHostOrigin());
        url.searchParams.set('lang', window.__edimarkLang || document.documentElement.lang || 'es');
        if (nativeMode) {
            url.searchParams.set('mode', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        }
        if (initialLatex) {
            url.searchParams.set('sel', initialLatex);
        }
        return url.toString();
    }

    function closeEmbeddedEdicuatex({ restoreFocus = true } = {}) {
        if (!edicuatexModalOverlay || !edicuatexFrame) return;
        edicuatexModalOverlay.style.display = 'none';
        edicuatexModalOverlay.classList.add('hidden');
        edicuatexFrame.src = 'about:blank';
        edicuatexOrigin = null;
        if (restoreFocus) openEdicuatexBtn?.focus();
    }

    function openEdicuatex() {
        const selection = markdownEditor && typeof markdownEditor.getSelection === 'function'
            ? markdownEditor.getSelection().trim()
            : '';
        if (edicuatexWindow && !edicuatexWindow.closed) {
            try { edicuatexWindow.close(); } catch (_) {}
            edicuatexWindow = null;
        }
        const url = buildEdicuatexUrl(selection);
        try {
            edicuatexOrigin = new URL(url).origin;
        } catch (err) {
            edicuatexOrigin = null;
        }
        if (nativeMode && edicuatexModalOverlay && edicuatexFrame) {
            edicuatexFrame.src = url;
            edicuatexModalOverlay.classList.remove('hidden');
            edicuatexModalOverlay.style.display = 'flex';
            edicuatexCloseBtn?.focus();
            return;
        }
        const features = 'width=1100,height=820,resizable=yes,scrollbars=yes';
        const child = window.open(url, 'edicuatex', features);
        if (!child) {
            alert(getTranslation('edicuatex_popup_blocked', 'Activa las ventanas emergentes en tu navegador para usar EdiCuaTeX.'));
            return;
        }
        edicuatexWindow = child;
        child.focus();
    }

    if (openEdicuatexBtn) {
        openEdicuatexBtn.addEventListener('click', (event) => {
            if (openEdicuatexBtn.dataset.controlsDisabled === 'true') {
                event.preventDefault();
                return;
            }
            openEdicuatex(event);
        });
    }

    edicuatexCloseBtn?.addEventListener('click', () => closeEmbeddedEdicuatex());
    edicuatexModalOverlay?.addEventListener('click', (event) => {
        if (event.target === edicuatexModalOverlay) closeEmbeddedEdicuatex();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && edicuatexModalOverlay?.style.display === 'flex') {
            closeEmbeddedEdicuatex();
        }
    });

    if (exportMenuBtn) {
        exportMenuBtn.setAttribute('aria-expanded', 'false');
        exportMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            // Con ratón el submenú ya se abre al pasar por encima; el clic no
            // debe cerrarlo, como en cualquier submenú de escritorio.
            if (POINTER_HAS_HOVER) openExportMenu();
            else toggleExportMenu();
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });
        exportMenuBtn.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!isExportMenuOpen()) openExportMenu();
                exportOptionButtons[0]?.focus();
            }
        });
    }

    if (exportOptionButtons.length) {
        exportOptionButtons.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                const format = btn.getAttribute('data-export-format');
                closeExportMenu();
                if (format) performExport(format);
            });
        });
    }

    if (previewCopyToggleBtn) {
        previewCopyToggleBtn.setAttribute('aria-expanded', 'false');
        previewCopyToggleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            togglePreviewCopyMenu();
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });
        previewCopyToggleBtn.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!isPreviewCopyMenuOpen()) openPreviewCopyMenu();
                previewCopyOptionButtons[0]?.focus();
            }
        });
    }

    if (previewCopyOptionButtons.length) {
        previewCopyOptionButtons.forEach((btn) => {
            btn.addEventListener('click', async (event) => {
                event.preventDefault();
                const action = btn.getAttribute('data-copy-action');
                if (!action) return;
                applyCopyActionState(action);
                closePreviewCopyMenu();
                const startMessage = getCopyStartMessage(action);
                if (startMessage) {
                    updateExportStatus(startMessage);
                }
                try {
                    await handlePreviewCopyAction(action, { announce: false, updateState: false });
                } catch (err) {
                    console.error('No se pudo completar la acción de copiado:', err);
                    if (action === 'html') {
                        updateExportStatus(getTranslation('copy_error_message', 'No se pudo copiar el contenido.'));
                    }
                }
            });
        });
    }

    if (actionsMenuBtn) {
        actionsMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            toggleActionsMenu();
        });
    }

    if (settingsMenuBtn) {
        settingsMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            toggleSettingsMenu();
        });
    }

    if (previewCopyContainer) {
        document.addEventListener('click', (event) => {
            if (!isPreviewCopyMenuOpen()) return;
            if (!previewCopyContainer.contains(event.target)) {
                closePreviewCopyMenu();
            }
        }, { capture: true });
    }

    if (actionsMenuContainer) {
        document.addEventListener('click', (event) => {
            if (!isActionsMenuOpen()) return;
            if (!actionsMenuContainer.contains(event.target)) {
                closeActionsMenu();
            }
        }, { capture: true });
    }

    if (settingsMenuContainer) {
        document.addEventListener('click', (event) => {
            if (!isSettingsMenuOpen()) return;
            if (!settingsMenuContainer.contains(event.target)) {
                closeSettingsMenu();
            }
        }, { capture: true });
    }

    if (exportMenuContainer) {
        document.addEventListener('click', (event) => {
            if (!isExportMenuOpen()) return;
            if (!exportMenuContainer.contains(event.target)) {
                closeExportMenu();
            }
        }, { capture: true });

        if (POINTER_HAS_HOVER) {
            let closeTimer;
            const cancelClose = () => clearTimeout(closeTimer);
            exportMenuContainer.addEventListener('mouseenter', () => {
                cancelClose();
                openExportMenu();
            });
            // Un margen para el recorrido diagonal hasta el submenú.
            exportMenuContainer.addEventListener('mouseleave', () => {
                cancelClose();
                closeTimer = setTimeout(closeExportMenu, 250);
            });

            // Volver a cualquier otra opción del menú cierra el submenú.
            actionsMenu?.querySelectorAll('[role="menuitem"]').forEach((item) => {
                if (exportMenuContainer.contains(item)) return;
                item.addEventListener('mouseenter', () => {
                    cancelClose();
                    closeExportMenu();
                });
            });
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        let handled = false;
        if (isExportMenuOpen()) {
            closeExportMenu();
            if (exportMenuBtn) exportMenuBtn.focus();
            handled = true;
        }
        if (isPreviewCopyMenuOpen()) {
            closePreviewCopyMenu();
            if (previewCopyToggleBtn) previewCopyToggleBtn.focus();
            handled = true;
        }
        if (isActionsMenuOpen()) {
            closeActionsMenu();
            if (actionsMenuBtn) actionsMenuBtn.focus();
            handled = true;
        }
        if (isSettingsMenuOpen()) {
            closeSettingsMenu();
            if (settingsMenuBtn) settingsMenuBtn.focus();
            handled = true;
        }
        if (handled) event.preventDefault();
    });

    function isActionsMenuOpen() {
        return actionsMenu && !actionsMenu.classList.contains('hidden');
    }

    function openActionsMenu() {
        if (!actionsMenu) return;
        closeExportMenu();
        closePreviewCopyMenu();
        closeSettingsMenu();
        actionsMenu.classList.remove('hidden');
        if (actionsMenuBtn) actionsMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeActionsMenu() {
        if (!actionsMenu) return;
        closeExportMenu();
        actionsMenu.classList.add('hidden');
        if (actionsMenuBtn) actionsMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleActionsMenu() {
        if (!actionsMenu) return;
        if (isActionsMenuOpen()) {
            closeActionsMenu();
        } else {
            openActionsMenu();
        }
    }

    function isSettingsMenuOpen() {
        return settingsMenu && !settingsMenu.classList.contains('hidden');
    }

    function openSettingsMenu() {
        if (!settingsMenu) return;
        closeActionsMenu();
        closeExportMenu();
        closePreviewCopyMenu();
        settingsMenu.classList.remove('hidden');
        if (settingsMenuBtn) settingsMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSettingsMenu() {
        closeSettingsSubmenus();
        if (!settingsMenu) return;
        settingsMenu.classList.add('hidden');
        if (settingsMenuBtn) settingsMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleSettingsMenu() {
        if (!settingsMenu) return;
        if (isSettingsMenuOpen()) {
            closeSettingsMenu();
        } else {
            openSettingsMenu();
        }
    }

    function updateExportStatus(message) {
        if (!statusToastEl || !statusToastMessageEl) return;
        const text = typeof message === 'string' ? message.trim() : '';

        if (statusToastTimer) {
            clearTimeout(statusToastTimer);
            statusToastTimer = null;
        }

        if (text) {
            statusToastMessageEl.textContent = text;
            statusToastEl.classList.remove('hidden');
            statusToastEl.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => statusToastEl.classList.add('visible'));

            const trimmed = text.trim();
            const endsWithEllipsis = trimmed.endsWith('…') || trimmed.endsWith('...');
            const shouldAutoHide = !endsWithEllipsis;
            if (shouldAutoHide) {
                statusToastTimer = setTimeout(() => {
                    updateExportStatus('');
                }, 3200);
            }
        } else {
            statusToastEl.classList.remove('visible');
            statusToastEl.setAttribute('aria-hidden', 'true');
            statusToastMessageEl.textContent = '';
            statusToastTimer = setTimeout(() => {
                statusToastEl.classList.add('hidden');
                statusToastTimer = null;
            }, 250);
        }
    }

    statusReporter = updateExportStatus;

    storageNoticeHandler = notice => {
        const showNotice = () => updateExportStatus(getTranslation(notice.key, notice.fallback));
        if (window.__edimarkLanguageReady) {
            window.__edimarkLanguageReady.then(showNotice);
        } else {
            showNotice();
        }
    };
    if (pendingStorageNotice) {
        const initialStorageNotice = pendingStorageNotice;
        pendingStorageNotice = null;
        queueStorageNotice(initialStorageNotice);
    }

    async function handleLatexImportConversion() {
        if (latexImportInProgress) return;
        if (!latexImportTextarea) return;
        const latexSource = normalizeNewlines(latexImportTextarea.value || '');
        if (!latexSource.trim()) {
            setLatexImportStatus(getTranslation('latex_import_empty', 'No hay contenido LaTeX para convertir.'), { isError: true });
            latexImportTextarea.focus();
            return;
        }
        if (!window.PandocExporter || typeof window.PandocExporter.convertLatexToMarkdown !== 'function') {
            setLatexImportStatus(getTranslation('latex_import_error', 'No se pudo convertir el LaTeX.'), { isError: true });
            return;
        }
        latexImportInProgress = true;
        setLatexImportBusy(true);
        setLatexImportStatus(getTranslation('latex_import_preparing', 'Convirtiendo LaTeX a Markdown...'));
        try {
            const markdown = await window.PandocExporter.convertLatexToMarkdown({
                latex: latexSource,
                onStatus: (statusMessage) => {
                    if (typeof statusMessage === 'string' && statusMessage.trim()) {
                        setLatexImportStatus(statusMessage.trim());
                    }
                },
            });
            const normalized = normalizeNewlines(markdown || '');
            markdownEditor.setValue(normalized);
            updateMarkdownCharCounter(normalized);
            toggleLatexImportModal(false);
            markdownEditor.focus();
            updateExportStatus(getTranslation('latex_import_done', 'Conversión a Markdown completada.'));
        } catch (error) {
            console.error('No se pudo convertir LaTeX a Markdown:', error);
            setLatexImportStatus(getTranslation('latex_import_error', 'No se pudo convertir el LaTeX.'), { isError: true });
        } finally {
            latexImportInProgress = false;
            setLatexImportBusy(false);
        }
    }

    function waitForNextUiFrame() {
        return new Promise((resolve) => {
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => resolve());
            } else {
                setTimeout(resolve, 16);
            }
        });
    }

    async function yieldToUiThread() {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await waitForNextUiFrame();
    }

    function isExportMenuOpen() {
        return exportMenu && !exportMenu.classList.contains('hidden');
    }

    function openExportMenu() {
        if (!exportMenu) return;
        closePreviewCopyMenu();
        closeSettingsMenu();
        exportMenu.classList.remove('hidden');
        if (exportMenuBtn) exportMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeExportMenu() {
        if (!exportMenu) return;
        exportMenu.classList.add('hidden');
        if (exportMenuBtn) exportMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleExportMenu() {
        if (!exportMenu) return;
        if (isExportMenuOpen()) {
            closeExportMenu();
        } else {
            openExportMenu();
        }
    }

    function isPreviewCopyMenuOpen() {
        return previewCopyMenu && !previewCopyMenu.classList.contains('hidden');
    }

    function openPreviewCopyMenu() {
        if (!previewCopyMenu) return;
        closeExportMenu();
        closeActionsMenu();
        closeSettingsMenu();
        previewCopyMenu.classList.remove('hidden');
        if (previewCopyToggleBtn) previewCopyToggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closePreviewCopyMenu() {
        if (!previewCopyMenu) return;
        previewCopyMenu.classList.add('hidden');
        if (previewCopyToggleBtn) previewCopyToggleBtn.setAttribute('aria-expanded', 'false');
    }

    function togglePreviewCopyMenu() {
        if (!previewCopyMenu) return;
        if (isPreviewCopyMenuOpen()) {
            closePreviewCopyMenu();
        } else {
            openPreviewCopyMenu();
        }
    }

    async function copyPreviewHtml() {
        if (!copyHtmlBtn) return;
        // Se copia lo que hay escrito, no lo último repintado.
        flushPendingPreviewRepaint();
        const isPreviewVisible = htmlOutput && htmlOutput.style.display !== 'none';
        const html = isPreviewVisible ? buildHtmlWithTex() : (htmlEditor ? htmlEditor.getValue() : '');
        await copyRich(html, copyHtmlBtn);
    }

    async function copyLatexFromPreview(includePreamble) {
        const exporter = window.PandocExporter;
        if (!exporter || typeof exporter.generateLatex !== 'function') {
            alert(getTranslation('export_error', 'Error durante la exportación.'));
            return;
        }
        const rawMarkdown = markdownEditor && typeof markdownEditor.getValue === 'function'
            ? markdownEditor.getValue()
            : '';
        const prepared = typeof exporter.trimInlineMath === 'function'
            ? exporter.trimInlineMath(rawMarkdown)
            : rawMarkdown;
        if (!prepared.trim()) {
            alert(getTranslation('no_content', 'No hay contenido para exportar.'));
            updateExportStatus('');
            return;
        }
        try {
            const latexResult = await exporter.generateLatex({
                markdown: rawMarkdown,
                standalone: Boolean(includePreamble),
                onStatus: updateExportStatus,
            });
            await writeTextToClipboard(latexResult);
            showCopyFeedback(copyHtmlBtn, true);
            updateExportStatus(getTranslation('latex_copy_done', 'LaTeX copiado al portapapeles.'));
        } catch (err) {
            updateExportStatus(getTranslation('latex_export_error', getTranslation('export_error', 'Error durante la exportación.')));
            showCopyFeedback(copyHtmlBtn, false);
            throw err;
        }
    }

    async function handlePreviewCopyAction(action, { announce = true, updateState = true } = {}) {
        const usableAction = COPY_ACTIONS.includes(action) ? action : 'html';
        if (announce) {
            const startMessage = getCopyStartMessage(usableAction);
            if (startMessage) {
                updateExportStatus(startMessage);
            }
        }
        if (updateState) {
            applyCopyActionState(usableAction, { persist: false });
        }
        if (usableAction === 'html') {
            await copyPreviewHtml();
            const successMessage = getCopySuccessMessage('html');
            if (successMessage) updateExportStatus(successMessage);
        } else if (usableAction === 'latex-preview') {
            await copyLatexFromPreview(false);
        } else if (usableAction === 'latex-full') {
            await copyLatexFromPreview(true);
        }
    }

    async function performExport(format) {
        if (!window.PandocExporter || typeof window.PandocExporter.exportDocument !== 'function') {
            console.warn('PandocExporter no disponible');
            updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
            return;
        }

        const exporter = window.PandocExporter;
        const rawMarkdown = (markdownEditor && typeof markdownEditor.getValue === 'function')
            ? markdownEditor.getValue()
            : '';
        const prepared = exporter.trimInlineMath ? exporter.trimInlineMath(rawMarkdown) : rawMarkdown;
        if (!prepared.trim()) {
            alert(getTranslation('no_content', 'No hay contenido para exportar.'));
            updateExportStatus('');
            return;
        }

        const currentDoc = docs.find(d => d.id === currentId);
        const baseName = currentDoc?.name ? String(currentDoc.name).replace(/\.[^.]+$/, '') : 'documento';
        const safeName = baseName || 'documento';
        const disableClasses = ['opacity-70', 'pointer-events-none'];
        if (exportMenuBtn) {
            exportMenuBtn.disabled = true;
            exportMenuBtn.classList.add(...disableClasses);
        }
        closeExportMenu();
        closeActionsMenu();
        updateExportStatus(getTranslation('export_preparing_message', 'Preparando exportación…'));
        await yieldToUiThread();

        try {
            const lowerFormat = String(format || '').toLowerCase();
            if (lowerFormat === 'docx' || lowerFormat === 'odt' || lowerFormat === 'epub') {
                const extension = lowerFormat;
                const outputFilename = `${safeName}.${extension}`;
                await exporter.exportDocument({
                    format: lowerFormat,
                    markdown: rawMarkdown,
                    outputFilename,
                    documentTitle: safeName,
                    onStatus: updateExportStatus,
                    onNotification: (message) => {
                        if (message) alert(message);
                    },
                });
            } else if (lowerFormat === 'html-download') {
                if (typeof exporter.generateHtml !== 'function') {
                    console.warn('Función generateHtml no disponible');
                    updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
                    return;
                }

                let htmlResult;
                try {
                    htmlResult = await exporter.generateHtml({
                        markdown: rawMarkdown,
                        // Si el documento no abre con un encabezado, el nombre
                        // de la pestaña es mejor título que «in».
                        documentTitle: safeName,
                        standalone: true,
                        onStatus: updateExportStatus,
                    });
                } catch (err) {
                    console.error('No se pudo generar HTML:', err);
                    updateExportStatus(getTranslation('html_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    return;
                }

                const htmlFilename = `${safeName}.html`;
                const saveResult = await saveFile(htmlFilename, htmlResult, 'text/html;charset=utf-8', {
                    extensions: ['html'],
                });
                if (saveResult?.saved) {
                    updateExportStatus(getTranslation('html_export_done', 'Exportación HTML completada.'));
                }
            } else if (lowerFormat === 'latex-full-download') {
                if (typeof exporter.generateLatex !== 'function') {
                    console.warn('Función generateLatex no disponible');
                    updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
                    return;
                }

                let latexResult;
                try {
                    latexResult = await exporter.generateLatex({
                        markdown: rawMarkdown,
                        standalone: true,
                        onStatus: updateExportStatus,
                    });
                } catch (err) {
                    console.error('No se pudo generar LaTeX:', err);
                    updateExportStatus(getTranslation('latex_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    return;
                }

                const latexFilename = `${safeName}.tex`;
                const saveResult = await saveFile(latexFilename, latexResult, 'application/x-tex;charset=utf-8', {
                    extensions: ['tex'],
                });
                if (saveResult?.saved) {
                    updateExportStatus(getTranslation('latex_export_done', 'Exportación a LaTeX completada.'));
                }
            } else {
                console.warn('Formato de exportación no soportado:', format);
                updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
            }
        } catch (err) {
            console.error(`No se pudo exportar a ${format}:`, err);
            const lowerFormat = String(format || '').toLowerCase();
            const errorKey = lowerFormat === 'odt'
                ? 'odt_export_error'
                : lowerFormat === 'docx'
                    ? 'docx_export_error'
                    : lowerFormat === 'epub'
                    ? 'epub_export_error'
                    : lowerFormat.startsWith('html')
                        ? 'html_export_error'
                        : lowerFormat.startsWith('latex')
                            ? 'latex_export_error'
                            : 'export_error';
            updateExportStatus(getTranslation(errorKey, getTranslation('export_error', 'Error durante la exportación.')));
        } finally {
            if (exportMenuBtn) {
                exportMenuBtn.disabled = false;
                exportMenuBtn.classList.remove(...disableClasses);
            }
        }
    }

    function openDesktopWindow(autoLaunch = false) {
        const urlObj = new URL(window.location.href);
        urlObj.searchParams.set(DESKTOP_PARAM_KEY, '1');
        urlObj.searchParams.set(DESKTOP_SPAWNED_KEY, '1');

        const storedSize = (() => {
            try {
                const raw = safeLocalStorageGet(DESKTOP_SIZE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.width !== 'number' || typeof parsed.height !== 'number') return null;
                return parsed;
            } catch (err) {
                console.warn('Error reading desktop size from storage', err);
                return null;
            }
        })();

        const availWidth = (window.screen && window.screen.availWidth) ? window.screen.availWidth : (window.outerWidth || 1600);
        const availHeight = (window.screen && window.screen.availHeight) ? window.screen.availHeight : (window.outerHeight || 900);
        const width = storedSize ? storedSize.width : Math.max(Math.round(availWidth * 0.85), 1100);
        const height = storedSize ? storedSize.height : Math.max(Math.round(availHeight * 0.85), 780);
        const leftBase = (() => {
            if (window.screen && typeof window.screen.availLeft === 'number') return window.screen.availLeft;
            if (typeof window.screenX === 'number') return window.screenX;
            if (typeof window.screenLeft === 'number') return window.screenLeft;
            return 0;
        })();
        const topBase = (() => {
            if (window.screen && typeof window.screen.availTop === 'number') return window.screen.availTop;
            if (typeof window.screenY === 'number') return window.screenY;
            if (typeof window.screenTop === 'number') return window.screenTop;
            return 0;
        })();
        const left = Math.max(0, Math.round(leftBase + (availWidth - width) / 2));
        const top = Math.max(0, Math.round(topBase + (availHeight - height) / 2));

        const features = [
            `width=${width}`,
            `height=${height}`,
            `left=${left}`,
            `top=${top}`,
            'resizable=yes',
            'scrollbars=yes',
            'toolbar=no',
            'menubar=no',
            'location=no',
            'status=no'
        ].join(',');
        const url = urlObj.toString();
        if (desktopWindow && !desktopWindow.closed) {
            try { desktopWindow.focus(); return true; } catch (_) {}
        }
        desktopWindow = window.open(url, 'edimarkweb-desktop', features);
        if (!desktopWindow) {
            if (!autoLaunch) {
                alert(getTranslation('desktop_window_popup_blocked', 'Activa las ventanas emergentes en tu navegador para abrir la ventana independiente.'));
            }
            return false;
        }
        desktopWindow.focus();
        if (desktopWindowMonitor) {
            clearInterval(desktopWindowMonitor);
        }
        desktopWindowMonitor = setInterval(() => {
            if (!desktopWindow || desktopWindow.closed) {
                clearInterval(desktopWindowMonitor);
                desktopWindowMonitor = null;
                desktopWindow = null;
            }
            const storageFlag = safeLocalStorageGet(DESKTOP_SIZE_KEY);
            if (!storageFlag && desktopWindow && !desktopWindow.closed) {
                try {
                    const w = desktopWindow.outerWidth || desktopWindow.innerWidth;
                    const h = desktopWindow.outerHeight || desktopWindow.innerHeight;
                    if (w && h) {
                        safeLocalStorageSet(DESKTOP_SIZE_KEY, JSON.stringify({ width: w, height: h }));
                    }
                } catch (err) {
                    console.warn('Error storing desktop size', err);
                }
            }
        }, 1000);

        try {
            const handleResize = () => {
                if (!desktopWindow || desktopWindow.closed) return;
                try {
                    const w = desktopWindow.outerWidth || desktopWindow.innerWidth;
                    const h = desktopWindow.outerHeight || desktopWindow.innerHeight;
                    if (w && h) {
                        safeLocalStorageSet(DESKTOP_SIZE_KEY, JSON.stringify({ width: w, height: h }));
                    }
                } catch (err) {
                    console.warn('Error storing desktop size', err);
                }
            };
            desktopWindow.addEventListener('resize', handleResize);
            desktopWindow.addEventListener('beforeunload', handleResize);
        } catch (err) {
            console.warn('Cannot attach resize listener to desktop window', err);
        }

        return true;
    }

    if (desktopWindowBtn) {
        desktopWindowBtn.addEventListener('click', () => closeSettingsMenu());
        // Sin envolver, el MouseEvent llegaría como `autoLaunch` y silenciaría
        // el aviso de ventana emergente bloqueada.
        desktopWindowBtn.addEventListener('click', () => openDesktopWindow());
    }

    window.addEventListener('beforeunload', () => {
        if (desktopWindow && !desktopWindow.closed) {
            try { desktopWindow.close(); } catch (_) {}
        }
        desktopWindow = null;
        if (desktopWindowMonitor) {
            clearInterval(desktopWindowMonitor);
            desktopWindowMonitor = null;
        }
    });

    window.addEventListener('message', (event) => {
        if (!event || !event.data || event.data.type !== 'edicuatex:result') return;
        if (edicuatexOrigin && event.origin !== edicuatexOrigin) return;
        if (edicuatexWindow && event.source && event.source !== edicuatexWindow) return;
        if (edicuatexModalOverlay?.style.display === 'flex'
            && edicuatexFrame?.contentWindow
            && event.source !== edicuatexFrame.contentWindow) return;
        const insertion = event.data.wrapped || event.data.latex || '';
        if (!insertion) return;
        requestAnimationFrame(() => {
            markdownEditor.replaceSelection(insertion);
            markdownEditor.focus();
            if (edicuatexWindow && !edicuatexWindow.closed) {
                try { edicuatexWindow.close(); } catch (_) {}
            }
            edicuatexWindow = null;
            if (edicuatexModalOverlay?.style.display === 'flex') {
                closeEmbeddedEdicuatex({ restoreFocus: false });
            } else {
                edicuatexOrigin = null;
            }
        });
    });

    // --- Inicialización de librerías ---
    if (window.TurndownService) {
        turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        if (window.turndownPluginGfm) {
            if (typeof window.turndownPluginGfm.gfm === 'function') {
                turndownService.use(window.turndownPluginGfm.gfm);
            } else {
                const gfmExtras = ['tables', 'strikethrough', 'taskListItems'];
                gfmExtras.forEach((pluginName) => {
                    const plugin = window.turndownPluginGfm[pluginName];
                    if (typeof plugin === 'function') {
                        turndownService.use(plugin);
                    }
                });
            }
        }
    }

    const markdownTextarea = document.getElementById('markdown-input');
    markdownTextareaEl = markdownTextarea;
    const baseMarkdownEditor = markdownTextarea ? createTextareaEditor(markdownTextarea) : null;
    markdownEditor = baseMarkdownEditor ? createBase64AwareEditor(baseMarkdownEditor, markdownTextarea) : null;
    if (markdownTextarea) {
        markdownTextarea.focus();
        markdownTextarea.addEventListener('focusin', () => setMarkdownControlsDisabled(false));
        markdownTextarea.addEventListener('paste', (event) => {
            let pastedText = '';
            if (event && event.clipboardData && typeof event.clipboardData.getData === 'function') {
                pastedText = event.clipboardData.getData('text/plain') || '';
            }
            if (BASE64_TEST_REGEX.test(pastedText) && markdownEditor && typeof markdownEditor.recollapseBase64 === 'function') {
                requestAnimationFrame(() => markdownEditor.recollapseBase64());
            }
        });
        ['select', 'keyup', 'mouseup', 'input', 'blur'].forEach(evt => {
            markdownTextarea.addEventListener(evt, captureMarkdownSelectionFromTextarea);
        });
    }
    if (markdownEditor) {
        updateMarkdownCharCounter(markdownEditor.getValue());
    }
    updateUndoRedoButtons();
    captureMarkdownSelectionFromTextarea();
    document.addEventListener('paste', handleEditorPaste, true);

    htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-source-view'), {
        mode: 'htmlmixed', theme: 'eclipse', lineNumbers: true, lineWrapping: true
    });
    const cmWrapper = htmlEditor.getWrapperElement();
    htmlEditorWrapperEl = cmWrapper;
    cmWrapper.style.display = 'none';
    
    // --- INICIO DE LA CORRECCIÓN ---
    toggleWidthBtn.addEventListener('click', () => {
        mainContainer.classList.toggle('is-expanded');
        const isExpanded = mainContainer.classList.contains('is-expanded');
        const iconName = isExpanded ? 'minimize' : 'maximize';
        // Solo el icono: el botón lleva ahora su etiqueta de texto al lado.
        const iconHost = toggleWidthBtn.querySelector('.width-icon');
        if (iconHost) {
            iconHost.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400"></i>`;
        }
        lucide.createIcons();
        closeSettingsMenu();
    });
    // --- FIN DE LA CORRECCIÓN ---

    // --- Gestión del tema (sistema / claro / oscuro) ---
    const THEME_KEY = 'edimarkweb-theme';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const themeSelect = document.getElementById('theme-select');
    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themeLabel = document.getElementById('theme-select-label');

    function storedThemePreference() {
        const saved = safeLocalStorageGet(THEME_KEY);
        return ['system', 'light', 'dark'].includes(saved) ? saved : 'system';
    }

    function currentThemePreference() {
        return themeSelect && ['system', 'light', 'dark'].includes(themeSelect.value)
            ? themeSelect.value
            : 'system';
    }

    function applyTheme(theme) {
      const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
      document.documentElement.style.colorScheme = normalizedTheme;
      const newEditorTheme = normalizedTheme === 'dark' ? 'material-darker' : 'eclipse';
      markdownEditor.setOption('theme', newEditorTheme);
      htmlEditor.setOption('theme', newEditorTheme);
      updateThemeMenuLabel();
    }

    // El icono refleja la preferencia elegida (incluido "Sistema") y el texto
    // de la derecha, su nombre traducido.
    function updateThemeMenuLabel() {
      const preference = currentThemePreference();
      if (themeMenuBtn) {
        const iconHost = themeMenuBtn.querySelector('.theme-icon');
        const iconName = preference === 'system' ? 'monitor' : (preference === 'dark' ? 'moon' : 'sun');
        if (iconHost) {
          iconHost.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400"></i>`;
        }
      }
      if (themeLabel && themeSelect) {
        const option = themeSelect.options[themeSelect.selectedIndex];
        if (option) themeLabel.textContent = option.textContent.trim();
      }
      if (window.lucide) lucide.createIcons();
    }

    window.__updateThemeToggleLabel = () => updateThemeMenuLabel();

    function applyThemePreference(preference) {
      const usable = ['system', 'light', 'dark'].includes(preference) ? preference : 'system';
      safeLocalStorageSet(THEME_KEY, usable);
      applyTheme(usable === 'system' ? (prefersDark.matches ? 'dark' : 'light') : usable);
    }

    if (themeSelect) {
      themeSelect.value = storedThemePreference();
      themeSelect.addEventListener('change', () => applyThemePreference(themeSelect.value));
      themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      applyTheme(prefersDark.matches ? 'dark' : 'light');
    }

    prefersDark.addEventListener('change', (e) => {
      if (currentThemePreference() === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    if (window.PandocExporter && typeof window.PandocExporter.warmUpExporter === 'function') {
      window.setTimeout(() => {
        try {
          window.PandocExporter.warmUpExporter();
        } catch (err) {
          console.warn('No se pudo precargar Pandoc:', err);
        }
      }, 1200);
    }

    // --- Paneles redimensionables y diseño ---
    Split(['#markdown-panel', '#html-panel'], {
        sizes: [50, 50],
        minSize: 280,
        gutterSize: 8,
        onDrag: () => { markdownEditor.refresh(); htmlEditor.refresh(); }
    });
    currentLayout = safeLocalStorageGet(LAYOUT_KEY, 'dual');
    applyLayout(currentLayout);

    // --- Tamaño de fuente ---
    if (fontSizeSelect) {
        const savedFs = safeLocalStorageGet(FS_KEY, 16);
        fontSizeSelect.value = savedFs;
        applyFontSize(savedFs);
        updateFontSizeLabel();
        fontSizeSelect.addEventListener('change', e => {
            applyFontSize(e.target.value);
            updateFontSizeLabel();
        });
    }

    // El exportador los consulta al generar LaTeX, no al arrancar, pero
    // publicarlos aquí evita que la primera exportación salga sin ellos.
    publishLatexSettings(readLatexSettings());

    // --- Carga inicial de documentos y autoguardado ---
    function addOpenedMarkdownDocument(opened) {
        if (!opened) return null;
        const normalized = normalizeNewlines(opened.content || '');
        const doc = newDoc(opened.name, normalized, { filePath: opened.path || '' });
        doc.lastSaved = normalized;
        updateDirtyIndicator(doc.id, false);
        return doc;
    }

    async function openNativeMarkdownPaths(paths) {
        const platform = window.EdiMarkPlatform;
        if (!platform?.isDesktop || typeof platform.openTextDocumentAtPath !== 'function') return 0;
        let openedCount = 0;
        for (const path of Array.from(paths || [])) {
            try {
                const opened = await platform.openTextDocumentAtPath(path);
                if (addOpenedMarkdownDocument(opened)) openedCount += 1;
            } catch (error) {
                console.error('No se pudo abrir el documento asociado:', error);
                reportStatus(getTranslation('open_file_error', 'No se pudo abrir el documento.'));
            }
        }
        return openedCount;
    }

    const platform = window.EdiMarkPlatform;
    if (platform?.isDesktop && typeof platform.onTextDocumentPaths === 'function') {
        platform.onTextDocumentPaths(paths => {
            openNativeMarkdownPaths(paths).catch(error => {
                console.error('No se pudieron abrir los documentos recibidos:', error);
            });
        });
    }

    const savedDocsList = loadSavedDocsList();
    if (savedDocsList.length > 0) {
        savedDocsList.forEach(docInfo => {
            const md = safeLocalStorageGet(`${AUTOSAVE_KEY_PREFIX}-${docInfo.id}`, '');
            const normalized = normalizeNewlines(md);
            docs.push({ ...docInfo, md: normalized, lastSaved: normalized });
            // Lo recién leído ya está guardado: no hay que reescribirlo.
            lastAutosavedById.set(docInfo.id, normalized);
            addTabElement(docInfo);
        });
        switchTo(docs[0].id);
    }
    (async () => {
        let openedAtLaunch = 0;
        if (platform?.isDesktop && typeof platform.initialTextDocumentPaths === 'function') {
            try {
                openedAtLaunch = await openNativeMarkdownPaths(await platform.initialTextDocumentPaths());
            } catch (error) {
                console.error('No se pudo consultar el documento inicial:', error);
            }
        }
        if (savedDocsList.length === 0 && openedAtLaunch === 0) openManualDoc();
    })();
    
    /*
      Solo se escribe cuando el texto ha cambiado desde el último guardado. Antes
      se reescribía el documento entero cada tres segundos aunque nadie tocara
      nada, algo especialmente caro con imágenes base64 incrustadas.
    */
    setInterval(autosaveCurrentDoc, 3000);

    /*
      Volcado final: entre dos tics del temporizador caben tres segundos de
      escritura que se perderían al cerrar la pestaña. Se usa `pagehide` y no
      `beforeunload` porque en móvil una aplicación que pasa a segundo plano
      puede no volver nunca, y `visibilitychange` es el único aviso que llega en
      ese caso. Ambos eventos son idempotentes: autosaveDoc no reescribe nada si
      el contenido no ha cambiado.
    */
    window.addEventListener('pagehide', autosaveCurrentDoc);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') autosaveCurrentDoc();
    });

    // --- Eventos de la barra de herramientas ---
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.controlsDisabled === 'true') {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (button && button.dataset.format) {
            applyFormat(button.dataset.format);
            if (button.dataset.format.startsWith('heading-')) {
                headingOptions.classList.add('hidden');
            }
            if (button.dataset.format.startsWith('latex-')) {
                closeFormulaOptions();
            }
        }
    });
    
    headingBtn.addEventListener('click', (e) => {
        if (headingBtn.dataset.controlsDisabled === 'true') {
            e.preventDefault();
            return;
        }
        e.stopPropagation();
        headingOptions.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!headingDropdownContainer.contains(e.target)) {
            headingOptions.classList.add('hidden');
        }
    });

    // --- Eventos de los botones principales y pestañas ---
    newTabBtn.addEventListener('click', () => newDoc());
    helpBtn.addEventListener('click', (e) => openManualDoc(e.ctrlKey || e.metaKey));
    if (aboutBtn && aboutModalOverlay) {
        const toggleAboutModal = (show) => {
            aboutModalOverlay.style.display = show ? 'flex' : 'none';
            if (show) {
                updateVersionLabel();
                aboutCloseBtn?.focus();
            } else {
                aboutBtn.focus();
            }
        };
        aboutBtn.addEventListener('click', () => toggleAboutModal(true));
        aboutCloseBtn?.addEventListener('click', () => toggleAboutModal(false));
        aboutModalOverlay.addEventListener('click', (event) => {
            if (event.target === aboutModalOverlay) toggleAboutModal(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && aboutModalOverlay.style.display === 'flex') {
                toggleAboutModal(false);
            }
        });
    }
    tabBar.addEventListener('click', (e) => {
        if (suppressNextTabClick) {
            suppressNextTabClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        const tab = e.target.closest('.tab');
        const closeBtn = e.target.closest('.tab-close');
        if (closeBtn && tab) { e.stopPropagation(); closeDoc(tab.dataset.id); } 
        else if (tab) { switchTo(tab.dataset.id); }
    });

    const closeLayoutMenu = () => {
      if (layoutMenu) layoutMenu.classList.add('hidden');
      if (layoutMenuBtn) layoutMenuBtn.setAttribute('aria-expanded', 'false');
    };
    if (layoutMenuBtn && layoutMenu) {
      layoutMenuBtn.addEventListener('click', () => {
        const willOpen = layoutMenu.classList.contains('hidden');
        layoutMenu.classList.toggle('hidden', !willOpen);
        layoutMenuBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
      layoutOptions.forEach((option) => {
        option.addEventListener('click', () => {
          applyLayout(option.dataset.layout || 'dual');
          closeLayoutMenu();
        });
      });
      document.addEventListener('click', (event) => {
        if (!layoutMenuContainer.contains(event.target)) closeLayoutMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeLayoutMenu();
      });
    }

    viewToggleBtn.addEventListener('click', () => {
        const isPreviewVisible = htmlOutput.style.display !== 'none';
        cmWrapper.style.display = isPreviewVisible ? 'block' : 'none';
        htmlOutput.style.display = isPreviewVisible ? 'none' : 'block';
        if (isPreviewVisible) setTimeout(() => htmlEditor.refresh(), 1);
        const panelTitleKey = isPreviewVisible ? 'html_code_panel_title' : 'html_panel_title';
        htmlPanelTitle.setAttribute('data-i18n-key', panelTitleKey);
        htmlPanelTitle.textContent = getTranslation(
            panelTitleKey,
            isPreviewVisible ? 'Código HTML' : 'Previsualización'
        );
        viewToggleBtn.innerHTML = isPreviewVisible ? '<i data-lucide="eye"></i>' : '<i data-lucide="code-2"></i>';
        if (window.lucide) lucide.createIcons();
    });
    
    openFileBtn.addEventListener('click', async () => {
        closeActionsMenu();
        closeSettingsMenu();
        const platform = window.EdiMarkPlatform;
        if (platform?.isDesktop && typeof platform.openTextDocument === 'function') {
            try {
                const opened = await platform.openTextDocument();
                if (!opened) return;
                addOpenedMarkdownDocument(opened);
            } catch (error) {
                console.error('No se pudo abrir el documento:', error);
                reportStatus(getTranslation('open_file_error', 'No se pudo abrir el documento.'));
            }
            return;
        }
        fileInput.click();
    });
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const doc = newDoc(file.name, e.target.result);
            doc.lastSaved = e.target.result;
            updateDirtyIndicator(doc.id, false);
        };
        reader.readAsText(file);
        fileInput.value = '';
    });
    if (importFileBtn && importFileInput) {
        importFileBtn.addEventListener('click', () => {
            closeActionsMenu();
            closeSettingsMenu();
            importFileInput.click();
        });
        importFileInput.addEventListener('change', async (event) => {
            const archivos = Array.from(event.target.files || []);
            importFileInput.value = '';
            if (archivos.length === 0) return;
            await importFilesSequentially(archivos);
        });
    }

    copyMdBtn.addEventListener('click', async () => {
        const startMessage = getCopyStartMessage('markdown');
        if (startMessage) {
            updateExportStatus(startMessage);
        }
        try {
            await copyPlain(markdownEditor.getValue(), copyMdBtn);
            const successMessage = getCopySuccessMessage('markdown');
            if (successMessage) updateExportStatus(successMessage);
        } catch (err) {
            updateExportStatus(getTranslation('copy_error_message', 'No se pudo copiar el contenido.'));
        }
    });
    copyHtmlBtn.addEventListener('click', async () => {
        closePreviewCopyMenu();
        const action = currentCopyAction;
        const startMessage = getCopyStartMessage(action);
        if (startMessage) {
            updateExportStatus(startMessage);
        }
        try {
            await handlePreviewCopyAction(action, { announce: false });
        } catch (err) {
            console.error('No se pudo copiar el contenido:', err);
            if (action === 'html') {
                updateExportStatus(getTranslation('copy_error_message', 'No se pudo copiar el contenido.'));
            }
        }
    });
    
    printBtn.addEventListener('click', () => {
        closeActionsMenu();
        closeSettingsMenu();
        const preview = document.getElementById('html-output');
        if (preview) {
            preview.scrollTop = 0;
            preview.scrollLeft = 0;
        }
        if (typeof window.print === 'function') {
            window.setTimeout(() => window.print(), 50);
        }
    });
    if (htmlOutput) {
        htmlOutput.addEventListener('focusin', () => setMarkdownControlsDisabled(true));
        htmlOutput.addEventListener('keydown', (event) => {
            if (!markdownEditor) return;
            const accel = event.ctrlKey || event.metaKey;
            if (!accel || event.altKey) return;
            if (event.key.toLowerCase() !== 'z') return;
            event.preventDefault();
            if (event.shiftKey) {
                if (typeof markdownEditor.redo === 'function') {
                    markdownEditor.redo();
                }
            } else if (typeof markdownEditor.undo === 'function') {
                markdownEditor.undo();
            }
            updateUndoRedoButtons();
        });
    }

    // --- Controles móviles para despliegue de herramientas ---
    const smallScreenQuery = window.matchMedia('(max-width: 768px)');
    const collapsibleSections = [
        { toggle: mobileActionsToggle, panel: toolbarActionsEl },
        { toggle: mobileFormatToggle, panel: toolbar }
    ];

    function setMobileSectionExpanded(toggle, panel, expanded) {
        if (!toggle || !panel) return;
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        panel.classList.toggle('is-open', expanded);
    }

    function collapseOther(exceptToggle) {
        collapsibleSections.forEach(({ toggle, panel }) => {
            if (!toggle || toggle === exceptToggle) return;
            setMobileSectionExpanded(toggle, panel, false);
        });
    }

    function handleMobileToggle(toggle, panel) {
        if (!toggle || !panel) return;
        const currentlyExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !currentlyExpanded;
        setMobileSectionExpanded(toggle, panel, nextState);
        if (nextState) {
            collapseOther(toggle);
            const focusable = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable && typeof focusable.focus === 'function') {
                setTimeout(() => {
                    focusable.focus();
                }, 0);
            }
        }
    }

    function resetMobileSectionsOnDesktop(e) {
        if (!e.matches) {
            collapsibleSections.forEach(({ toggle, panel }) => setMobileSectionExpanded(toggle, panel, false));
        }
    }

    if (mobileToolbarControls) {
        if (mobileActionsToggle && toolbarActionsEl) {
            mobileActionsToggle.addEventListener('click', () => handleMobileToggle(mobileActionsToggle, toolbarActionsEl));
        }
        if (mobileFormatToggle && toolbar) {
            mobileFormatToggle.addEventListener('click', () => handleMobileToggle(mobileFormatToggle, toolbar));
        }
        if (typeof smallScreenQuery.addEventListener === 'function') {
            smallScreenQuery.addEventListener('change', resetMobileSectionsOnDesktop);
        } else if (typeof smallScreenQuery.addListener === 'function') {
            smallScreenQuery.addListener(resetMobileSectionsOnDesktop);
        }
        resetMobileSectionsOnDesktop(smallScreenQuery);
    }

    // --- Eventos de los modales ---
    if (latexImportBtn) {
    latexImportBtn.addEventListener('click', () => {
        closeActionsMenu();
        closeSettingsMenu();
        toggleLatexImportModal(true);
    });
    }
    if (latexImportCancelBtn) {
        latexImportCancelBtn.addEventListener('click', () => {
            if (latexImportInProgress) return;
            toggleLatexImportModal(false);
        });
    }
    if (latexImportModalOverlay) {
        latexImportModalOverlay.addEventListener('click', (event) => {
            if (event.target === latexImportModalOverlay && !latexImportInProgress) {
                toggleLatexImportModal(false);
            }
        });
    }
    if (latexImportTextarea) {
        latexImportTextarea.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleLatexImportConversion();
            }
        });
    }
    if (latexImportConvertBtn) {
        latexImportConvertBtn.addEventListener('click', handleLatexImportConversion);
    }

    const LISTED_DOC_LANGUAGES = ['auto', 'es', 'en', 'ca', 'gl', 'eu'];

    // El campo del código solo estorba mientras no haga falta.
    function syncDocLanguageCodeField() {
        if (!docLanguageCodeField || !docLanguageSelect) return;
        docLanguageCodeField.classList.toggle('hidden', docLanguageSelect.value !== 'other');
    }

    function readDocLanguageFromForm() {
        if (!docLanguageSelect) return 'auto';
        if (docLanguageSelect.value !== 'other') return docLanguageSelect.value;
        const code = docLanguageCodeInput ? docLanguageCodeInput.value.trim() : '';
        // Un «Otro…» sin código no significa nada: vuelve al automático.
        return code || 'auto';
    }

    function readCoverMode() {
        const chosen = coverRadios.find(radio => radio.checked);
        return chosen ? chosen.value : 'auto';
    }

    function syncCoverPicker() {
        if (!coverPicker) return;
        const custom = readCoverMode() === 'custom';
        coverPicker.classList.toggle('hidden', !custom);
        coverPicker.classList.toggle('flex', custom);
        if (coverPreview) {
            const hasImage = Boolean(pendingCover.image);
            coverPreview.classList.toggle('hidden', !hasImage);
            if (hasImage) coverPreview.src = pendingCover.image;
        }
        if (coverName) coverName.textContent = pendingCover.name || '';
    }

    function fillLatexSettingsForm(settings) {
        const language = settings.documentLanguage || 'auto';
        const listed = LISTED_DOC_LANGUAGES.includes(language);
        if (docLanguageSelect) docLanguageSelect.value = listed ? language : 'other';
        if (docLanguageCodeInput) docLanguageCodeInput.value = listed ? '' : language;
        syncDocLanguageCodeField();
        if (docAuthorInput) docAuthorInput.value = settings.documentAuthor || '';
        pendingCover = { image: settings.epubCoverImage || '', name: settings.epubCoverName || '' };
        const coverMode = settings.epubCover || 'auto';
        coverRadios.forEach((radio) => { radio.checked = radio.value === coverMode; });
        syncCoverPicker();
        if (docTocCheckbox) docTocCheckbox.checked = settings.documentToc === true;
        if (docNumberingCheckbox) docNumberingCheckbox.checked = settings.documentNumberSections === true;
        if (latexClassSelect) latexClassSelect.value = settings.documentClass || 'article';
        if (latexClassOptionsInput) latexClassOptionsInput.value = settings.classOptions || '';
        if (latexPreambleTextarea) latexPreambleTextarea.value = settings.preamble || '';
    }

    coverRadios.forEach(radio => radio.addEventListener('change', syncCoverPicker));
    if (coverBtn && coverInput) {
        coverBtn.addEventListener('click', () => coverInput.click());
        coverInput.addEventListener('change', () => {
            const file = coverInput.files && coverInput.files[0];
            coverInput.value = '';
            if (!file) return;
            if (file.size > MAX_COVER_BYTES) {
                alert(formatTranslation(
                    'doc_settings_cover_too_big',
                    'La imagen ocupa {size} y el máximo es 1 MB. Prueba con una más pequeña.',
                    { size: `${Math.round(file.size / 1024)} KB` },
                ));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                pendingCover = { image: String(reader.result || ''), name: file.name };
                syncCoverPicker();
            };
            reader.onerror = () => alert(getTranslation('doc_settings_cover_error', 'No se pudo leer la imagen.'));
            reader.readAsDataURL(file);
        });
    }

    if (docLanguageSelect) {
        docLanguageSelect.addEventListener('change', () => {
            syncDocLanguageCodeField();
            if (docLanguageSelect.value === 'other' && docLanguageCodeInput) docLanguageCodeInput.focus();
        });
    }

    function toggleLatexSettingsModal(show) {
        if (!latexSettingsOverlay) return;
        latexSettingsOverlay.style.display = show ? 'flex' : 'none';
        if (show) {
            // Siempre desde lo guardado: cancelar tiene que descartar de verdad.
            fillLatexSettingsForm(readLatexSettings());
            setTimeout(() => latexClassSelect && latexClassSelect.focus(), 0);
        }
    }

    if (latexSettingsBtn) {
        latexSettingsBtn.addEventListener('click', () => {
            closeActionsMenu();
            closeSettingsMenu();
            toggleLatexSettingsModal(true);
        });
    }
    if (latexSettingsCancelBtn) {
        latexSettingsCancelBtn.addEventListener('click', () => toggleLatexSettingsModal(false));
    }
    if (latexSettingsOverlay) {
        latexSettingsOverlay.addEventListener('click', (event) => {
            if (event.target === latexSettingsOverlay) toggleLatexSettingsModal(false);
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !latexSettingsOverlay) return;
        if (latexSettingsOverlay.style.display === 'flex') toggleLatexSettingsModal(false);
    });
    if (latexSettingsResetBtn) {
        // Deja el formulario en los valores de fábrica; hasta guardar no se aplica.
        latexSettingsResetBtn.addEventListener('click', () => fillLatexSettingsForm(LATEX_SETTINGS_DEFAULTS));
    }
    if (latexSettingsSaveBtn) {
        latexSettingsSaveBtn.addEventListener('click', () => {
            storeLatexSettings({
                documentLanguage: readDocLanguageFromForm(),
                documentAuthor: docAuthorInput ? docAuthorInput.value.trim() : '',
                epubCover: readCoverMode(),
                epubCoverImage: readCoverMode() === 'custom' ? pendingCover.image : '',
                epubCoverName: readCoverMode() === 'custom' ? pendingCover.name : '',
                documentToc: docTocCheckbox ? docTocCheckbox.checked : false,
                documentNumberSections: docNumberingCheckbox ? docNumberingCheckbox.checked : false,
                documentClass: latexClassSelect ? latexClassSelect.value : 'article',
                classOptions: latexClassOptionsInput ? latexClassOptionsInput.value.trim() : '',
                preamble: latexPreambleTextarea ? latexPreambleTextarea.value : '',
            });
            toggleLatexSettingsModal(false);
            updateExportStatus(getTranslation('doc_settings_saved', 'Ajustes del documento guardados.'));
        });
    }

    createTableBtn.addEventListener('click', () => {
        const cols = parseInt(document.getElementById('table-cols').value, 10) || 2;
        const rows = parseInt(document.getElementById('table-rows').value, 10) || 1;
        const headerLabel = getTranslation('table_header_placeholder', 'Cabecera');
        const cellLabel = getTranslation('table_cell_placeholder', 'Celda');
        let tableMd = '\n|';
        for (let i = 1; i <= cols; i++) tableMd += ` ${headerLabel} ${i} |`;
        tableMd += '\n|';
        for (let i = 0; i < cols; i++) tableMd += '------------|';
        tableMd += '\n';
        for (let r = 0; r < rows; r++) {
            tableMd += '|';
            for (let c = 0; c < cols; c++) tableMd += ` ${cellLabel}      |`;
            tableMd += '\n';
        }
        markdownEditor.replaceSelection(tableMd);
        toggleTableModal(false);
        markdownEditor.focus();
    });
    cancelTableBtn.addEventListener('click', () => toggleTableModal(false));
    tableModalOverlay.addEventListener('click', (e) => { if (e.target === tableModalOverlay) toggleTableModal(false); });
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            closeActionsMenu();
            closeSettingsMenu();
            await saveCurrentDocument();
        });
    }
    if (saveAsBtn) {
        saveAsBtn.addEventListener('click', async () => {
            closeActionsMenu();
            closeSettingsMenu();
            await saveCurrentDocument({ saveAs: true });
        });
    }

    insertLinkBtn.addEventListener('click', () => {
      const text = document.getElementById('link-text').value.trim() || 'enlace';
      const url  = document.getElementById('link-url').value.trim()  || '#';
      markdownEditor.replaceSelection(`[${text}](${url})`);
      toggleLinkModal(false);
      markdownEditor.focus();
    });
    cancelLinkBtn.addEventListener('click', () => toggleLinkModal(false));
    linkModalOverlay.addEventListener('click', e => { if (e.target === linkModalOverlay) toggleLinkModal(false); });
    
    const imageFileInput = document.getElementById('image-file-input');
    const imageFileName = document.getElementById('image-file-name');
    if (imageFileInput && imageFileName) {
      imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files && imageFileInput.files[0];
        imageFileName.textContent = file ? file.name : getTranslation('image_file_none', 'Ninguna seleccionada');
        if (file) imageFileName.removeAttribute('data-i18n-key');
        else imageFileName.setAttribute('data-i18n-key', 'image_file_none');
      });
    }
    insertImageBtn.addEventListener('click', async () => {
      const selectedFile = imageFileInput?.files?.[0] || null;
      let url = document.getElementById('image-url').value.trim();
      if (selectedFile) {
        try {
          url = await readFileAsDataUrl(selectedFile);
        } catch (error) {
          console.error('No se pudo leer la imagen seleccionada:', error);
          alert(getTranslation('image_file_error', 'No se pudo leer la imagen seleccionada.'));
          return;
        }
      }
      const defaultAlt = selectedFile?.name || getTranslation('base64_image_default_alt', 'imagen');
      const alt = document.getElementById('image-alt-text').value.trim() || defaultAlt;
      markdownEditor.replaceSelection(`![${alt}](${url || '#'})`);
      toggleImageModal(false);
      markdownEditor.focus();
    });
    cancelImageBtn.addEventListener('click', () => toggleImageModal(false));
    imageModalOverlay.addEventListener('click', e => { if (e.target === imageModalOverlay) toggleImageModal(false); });

    // --- Atajos de teclado y otros ---
    window.addEventListener('beforeunload', (e) => {
        const hasUnsaved = docs.some(d => d.md !== d.lastSaved);
        if (hasUnsaved) { e.preventDefault(); e.returnValue = 'Hay documentos con cambios sin guardar. ¿Seguro que quieres salir?'; }
    });

    const isMac = navigator.platform.includes('Mac');
    let ctrlPressed = false;
    let currentHoveredLink = null;
    
    const shortcutMap = {
        'b': 'bold',
        'i': 'italic',
        '`': 'code',
        'k': 'link',
        'm': 'latex-inline-dollar',
        'M': 'latex-block-bracket',
        'Q': 'quote',
        'L': 'list-ul',
        'O': 'list-ol',
        'T': 'table',
        'I': 'image',
        '1': 'heading-1',
        '2': 'heading-2',
        '3': 'heading-3',
        '4': 'heading-4',
        '5': 'heading-5',
        '6': 'heading-6',
    };

    document.addEventListener('keydown', e => {
        const accel = isMac ? e.metaKey : e.ctrlKey;
        if (accel) ctrlPressed = true;

        if (e.key === 'F1') {
            e.preventDefault();
            openManualDoc(e.shiftKey);
            return;
        }

        if (document.getElementById('search-wrapper').classList.contains('hidden')) {
            if (accel && e.key.toLowerCase() === 't') { e.preventDefault(); newTabBtn.click(); }
            if (accel && e.key.toLowerCase() === 'w') { e.preventDefault(); if (currentId) closeDoc(currentId); }
            if (accel && e.key === 'Tab') {
                e.preventDefault();
                if(docs.length < 2) return;
                const currentIndex = docs.findIndex(d => d.id === currentId);
                const nextIndex = (e.shiftKey ? currentIndex - 1 + docs.length : currentIndex + 1) % docs.length;
                switchTo(docs[nextIndex].id);
            }

            if (!accel) return;
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'o': e.preventDefault(); importFileBtn?.click(); return;
                    case 'e': e.preventDefault(); openActionsMenu(); openExportMenu(); return;
                    case 'm': e.preventDefault(); openEdicuatexBtn?.click(); return;
                    case 'v': e.preventDefault(); pasteBtn?.click(); return;
                }
            }
            if (e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveAsBtn?.click();
                return;
            }
            if (e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                focusModeToggleBtn?.click();
                return;
            }
            if (!e.shiftKey && e.key === ',') {
                e.preventDefault();
                toggleSettingsMenu();
                return;
            }
            /*
              Los atajos sin Shift se comprueban aparte: con Shift pulsado esas
              mismas letras pertenecen a shortcutMap (Ctrl+Shift+L es la lista con
              viñetas y Ctrl+Shift+O la numerada), y atenderlas también aquí
              ejecutaría las dos acciones a la vez.
            */
            switch (e.shiftKey ? null : e.key.toLowerCase()) {
                case 'o': e.preventDefault(); openFileBtn.click(); break;
                case 's': e.preventDefault(); saveBtn.click(); break;
                case 'p': e.preventDefault(); printBtn.click(); break;
                case 'l': e.preventDefault(); cycleLayout(); break;
            }
            switch (e.key.toLowerCase()) {
                case 'h': e.preventDefault(); openManualDoc(e.shiftKey); break;
                case 'v':
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (latexImportBtn) {
                            latexImportBtn.click();
                        } else {
                            closeActionsMenu();
                            closeSettingsMenu();
                            toggleLatexImportModal(true);
                        }
                    }
                    break;
            }
            if (fontSizeSelect && ['=', '+', '-'].includes(e.key)) {
                e.preventDefault();
                const sizes = [14, 16, 18, 20];
                let idx = sizes.indexOf(Number(fontSizeSelect.value));
                idx = e.key === '-' ? Math.max(0, idx - 1) : Math.min(sizes.length - 1, idx + 1);
                fontSizeSelect.value = sizes[idx];
                applyFontSize(sizes[idx]);
                updateFontSizeLabel();
            }
            const key = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
            if (shortcutMap[key]) { e.preventDefault(); applyFormat(shortcutMap[key]); }
        }
    });

    document.addEventListener('keyup', e => {
        if (!e.metaKey && !e.ctrlKey) {
            ctrlPressed = false;
            if (currentHoveredLink) { currentHoveredLink.classList.remove('ctrl-hover'); currentHoveredLink.title = ''; currentHoveredLink = null; }
        }
    });

    window.addEventListener('blur', () => {
        ctrlPressed = false;
        if (currentHoveredLink) { currentHoveredLink.classList.remove('ctrl-hover'); currentHoveredLink.title = ''; currentHoveredLink = null; }
    });

    htmlOutput.addEventListener('mousemove', e => {
        const targetLink = e.target.closest('a');
        const accelPressed = e.ctrlKey || e.metaKey || ctrlPressed;
        if (accelPressed && targetLink) {
            if (currentHoveredLink !== targetLink) {
                if (currentHoveredLink) currentHoveredLink.classList.remove('ctrl-hover');
                targetLink.classList.add('ctrl-hover');
                targetLink.title = 'Ctrl + clic para abrir enlace';
                currentHoveredLink = targetLink;
            }
        } else if (currentHoveredLink) {
            currentHoveredLink.classList.remove('ctrl-hover');
            currentHoveredLink.title = '';
            currentHoveredLink = null;
        }
    });
    
    if (window.lucide) lucide.createIcons();
    document.querySelectorAll('button[title]').forEach(btn => {
        if (!btn.hasAttribute('aria-label')) { btn.setAttribute('aria-label', btn.title.replace(/\s*\(.+\)$/, '')); }
    });

    // --- Sincronización ---
    function scrollMarkdownToRatio(r) {
      if (!syncEnabled) return;
      const scroller = markdownEditor.getScrollerElement();
      scroller.scrollTop = r * (scroller.scrollHeight - scroller.clientHeight);
    }
    function syncFromMarkdown() {
      if (!syncEnabled) return;
      const lineRatio = markdownEditor.getCursor().line / Math.max(1, markdownEditor.lineCount() - 1);
      htmlOutput.scrollTop = lineRatio * (htmlOutput.scrollHeight - htmlOutput.clientHeight);
    }
    /*
      Repintar la vista previa no es barato: reanaliza el documento entero,
      sustituye todo el HTML del panel, reescribe el editor HTML y vuelve a
      renderizar todas las fórmulas. Hacerlo una vez por tecla se nota en
      documentos largos, así que las pulsaciones seguidas se agrupan.

      Es una limitación de frecuencia, no un aplazamiento: la primera tecla tras
      una pausa se atiende enseguida y al escribir sin parar la vista se
      actualiza cada MS_ENTRE_REPINTADOS, en lugar de dejar de refrescarse
      mientras dure la escritura.
    */
    const MS_ENTRE_REPINTADOS = 150;
    let repaintTimer = null;
    let lastRepaintAt = 0;
    function repaintPreview() {
      repaintTimer = null;
      lastRepaintAt = Date.now();
      updateHtml();
      syncFromMarkdown();
    }
    function schedulePreviewRepaint() {
      if (repaintTimer !== null) return;
      const waited = Date.now() - lastRepaintAt;
      repaintTimer = setTimeout(repaintPreview, Math.max(0, MS_ENTRE_REPINTADOS - waited));
    }
    /*
      Quien vaya a leer el HTML ya generado (copiar, exportar) no puede
      encontrarse con un repintado pendiente: adelanta el que hubiera.
    */
    flushPendingPreviewRepaint = () => {
      if (repaintTimer === null) return;
      clearTimeout(repaintTimer);
      repaintPreview();
    };

    markdownEditor.on('change', () => {
      updateUndoRedoButtons();
      if (skipNextMarkdownSync) {
        skipNextMarkdownSync = false;
        return;
      }
      schedulePreviewRepaint();
    });
    markdownEditor.on('cursorActivity', () => {
      if (skipNextCursorSync) return;
      captureMarkdownSelectionFromTextarea();
      requestAnimationFrame(syncFromMarkdown);
    });
    let previewSyncScheduled = false;
    function schedulePreviewSync() {
      if (previewSyncScheduled) return;
      previewSyncScheduled = true;
      requestAnimationFrame(() => {
        previewSyncScheduled = false;
        updateMarkdown();
      });
    }
    htmlOutput.addEventListener('input', schedulePreviewSync);
    htmlOutput.addEventListener('paste', schedulePreviewSync);
    function scheduleHtmlEditorSync({ force = false } = {}) {
      if (htmlEditorSyncScheduled || skipNextHtmlEditorSync) return;
      // Only mirror back to Markdown when the HTML editor is actively driving changes;
      // this avoids jumping the Markdown view while the user is typing on the left panel.
      const shouldSyncMarkdown = force || (htmlEditor && typeof htmlEditor.hasFocus === 'function' && htmlEditor.hasFocus());
      htmlEditorSyncScheduled = true;
      requestAnimationFrame(() => {
        htmlEditorSyncScheduled = false;
        const htmlOutputEl = document.getElementById('html-output');
        if (!htmlOutputEl) return;
        const editorHtml = htmlEditor.getValue();
        if (htmlOutputEl.innerHTML !== editorHtml) {
          htmlOutputEl.innerHTML = editorHtml;
        }
        if (!shouldSyncMarkdown) return;
        updateMarkdown();
        const totalLines = Math.max(1, htmlEditor.lineCount() - 1);
        const lineRatio = totalLines > 0 ? htmlEditor.getCursor().line / totalLines : 0;
        scrollMarkdownToRatio(lineRatio);
      });
    }
    htmlEditor.on('change', () => scheduleHtmlEditorSync());
    htmlOutput.addEventListener('click', e => {
      const accelPressed = e.ctrlKey || e.metaKey || ctrlPressed;
      const linkEl = e.target.closest('a');
      if (accelPressed && linkEl) {
          const hrefAttr = linkEl.getAttribute('href') || '';
          e.preventDefault(); e.stopPropagation();
          if (hrefAttr.startsWith('#')) {
              let targetId = hrefAttr.slice(1);
              try { targetId = decodeURIComponent(targetId); } catch (_) { /* ignore malformed URI */ }
              const manualEscape = targetId.replace(/([ !"#$%&'()*+,./:;<=>?@\[\\\]^`{|}~])/g, '\\$1');
              const selectorSafeId = (window.CSS && typeof CSS.escape === 'function') ? CSS.escape(targetId) : manualEscape;
              let target = htmlOutput.querySelector(`#${selectorSafeId}`);
              if (!target) target = document.getElementById(targetId);
              if (target) {
                  const containerRect = htmlOutput.getBoundingClientRect();
                  const targetRect = target.getBoundingClientRect();
                  const offset = targetRect.top - containerRect.top + htmlOutput.scrollTop;
                  htmlOutput.scrollTo({ top: Math.max(0, offset - 16), behavior: 'smooth' });
              }
          } else if (linkEl.href) {
              window.open(linkEl.href, '_blank', 'noopener');
          }
          return;
      }
      const clickY = e.clientY - htmlOutput.getBoundingClientRect().top + htmlOutput.scrollTop;
      const ratio  = clickY / Math.max(1, htmlOutput.scrollHeight);
      scrollMarkdownToRatio(ratio);
    });
    htmlEditor.getWrapperElement().addEventListener('mouseup', () => scheduleHtmlEditorSync({ force: true }));

    if (typeof initSearch === 'function') {
        initSearch(markdownEditor, htmlEditor, () => currentLayout);
    }

    /*
      Última línea del arranque: los atajos de teclado y la búsqueda se
      registran aquí abajo, mucho después de que aparezca la primera pestaña.
      Las pruebas esperan esta marca para no pulsar teclas que todavía no
      escucha nadie.
    */
    window.__edimarkReady = true;
};

/* =========================================================
   Arrastrar .md con "fondo por detrás" para soltar en toda la app
   ========================================================= */
(function () {
  // Limpia posibles versiones anteriores
  for (const id of ['drop-backdrop']) {
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Backdrop: capa que no captura eventos (pointer-events:none)
  const backdrop = document.createElement('div');
  backdrop.id = 'drop-backdrop';
  backdrop.className = [
    'fixed inset-0 hidden z-[45] bg-black/50',
    'flex items-center justify-center'
  ].join(' ');

  // Marco interior (no bloquea clics, solo visual)
  const frame = document.createElement('div');
  frame.className = [
    'pointer-events-none absolute inset-4',
    'rounded-lg border-2 border-dashed border-white/50'
  ].join(' ');

  // Mensaje central con icono
  const center = document.createElement('div');
  center.className = 'absolute inset-0 grid place-content-center text-center';
  // Mismo lenguaje visual que los modales de la aplicación.
  center.innerHTML = `
    <div class="pointer-events-none bg-white p-6 rounded-lg shadow-xl max-w-md mx-4 dark:bg-slate-800">
      <div class="flex flex-col items-center gap-3 text-center">
        <i data-lucide="upload" class="w-10 h-10 text-indigo-600 dark:text-indigo-400"></i>
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-100" data-i18n-key="drop_title">Suelta aquí para abrir en una pestaña nueva</h3>
        <p class="text-sm text-slate-700 dark:text-slate-300" data-i18n-key="drop_subtitle">Markdown (.md, .markdown) o documentos DOCX, ODT, EPUB, HTML y TEX. También puedes soltar varios archivos o carpetas enteras.</p>
      </div>
    </div>
  `;

  backdrop.appendChild(frame);
  backdrop.appendChild(center);
  document.body.prepend(backdrop); // "por detrás" del resto al insertarlo primero, aunque se ve encima visualmente

  // Render de iconos lucide si están cargados
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons(backdrop);
  }

  // Utilidad: ¿hay archivos en el DataTransfer?
  function hasFiles(e) {
    const dt = e.dataTransfer;
    if (!dt) return false;
    return Array.from(dt.types || []).includes('Files') || (dt.files && dt.files.length > 0);
  }

  let dragDepth = 0;
  const tabBar = document.getElementById('tab-bar');
  const newTabBtn = document.getElementById('new-tab-btn');

  // Resaltado estático: el mismo anillo que usan los controles al recibir foco.
  function addHalo() {
    tabBar && tabBar.classList.add('ring-2','ring-blue-500','ring-offset-2','ring-offset-transparent');
    newTabBtn && newTabBtn.classList.add('ring-2','ring-blue-500','rounded-md');
  }
  function removeHalo() {
    tabBar && tabBar.classList.remove('ring-2','ring-blue-500','ring-offset-2','ring-offset-transparent');
    newTabBtn && newTabBtn.classList.remove('ring-2','ring-blue-500','rounded-md');
  }

  // Eventos de arrastre globales
  document.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    backdrop.classList.remove('hidden');
    addHalo();
  });

  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  });

  document.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      backdrop.classList.add('hidden');
      removeHalo();
    }
  });

  /*
    Las tandas que devuelve readEntries no agotan el directorio: hay que seguir
    pidiendo hasta que llegue una vacía.
  */
  function readAllDirectoryEntries(reader) {
    const collected = [];
    return new Promise((resolve) => {
      const readBatch = () => reader.readEntries((batch) => {
        if (!batch.length) { resolve(collected); return; }
        collected.push(...batch);
        readBatch();
      }, () => resolve(collected));
      readBatch();
    });
  }

  function filesFromEntry(entry) {
    if (!entry) return Promise.resolve([]);
    if (entry.isFile) {
      return new Promise((resolve) => entry.file((file) => resolve([file]), () => resolve([])));
    }
    if (entry.isDirectory) {
      return readAllDirectoryEntries(entry.createReader())
        .then((children) => Promise.all(children.map(filesFromEntry)))
        .then((lists) => lists.flat());
    }
    return Promise.resolve([]);
  }

  /*
    Con carpetas de por medio, dataTransfer.files solo trae una entrada inútil
    por directorio; hay que recorrerlo con la API de entradas. Los entries se
    piden de forma síncrona porque el DataTransfer se vacía en cuanto termina
    el manejador del evento.
  */
  function collectDroppedFiles(dataTransfer) {
    const entries = Array.from(dataTransfer?.items || [])
      .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
      .filter(Boolean);
    const plainFiles = Array.from(dataTransfer?.files || []);
    if (!entries.length) return Promise.resolve(plainFiles);
    return Promise.all(entries.map(filesFromEntry))
      .then((lists) => lists.flat())
      // Las tandas de un directorio no llegan ordenadas: sin esto las pestañas
      // aparecerían en un orden distinto en cada navegador.
      .then((files) => files.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
      .catch((err) => {
        console.error('No se pudieron leer las carpetas arrastradas:', err);
        return plainFiles;
      });
  }

  function handleDrop(e) {
    e.preventDefault();
    backdrop.classList.add('hidden');
    removeHalo();
    dragDepth = 0;

    collectDroppedFiles(e.dataTransfer).then(openDroppedFiles);
  }

  function openDroppedFiles(files) {
    if (!files.length) return;

    const isMarkdown = (f) => {
      const name = (f.name || '').toLowerCase();
      return /\.md$|\.markdown$/.test(name) || (f.type && f.type === 'text/markdown');
    };

    const mdFiles = files.filter(isMarkdown);
    // Lo que no es Markdown puede seguir siendo convertible con Pandoc.
    const importable = files.filter(f => !isMarkdown(f) && detectImportFormat(f));

    if (!mdFiles.length && !importable.length) {
      alert(getTranslation(
        'drop_unsupported',
        'Solo se pueden soltar archivos Markdown (.md, .markdown) o documentos DOCX, ODT, EPUB, HTML y TEX.',
      ));
      return;
    }

    // Secuencial: cada importación levanta su propia instancia de Pandoc.
    importFilesSequentially(importable);

    mdFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result || '';
          const doc = (typeof newDoc === 'function')
            ? newDoc(file.name || getTranslation('untitled_document', 'Documento sin título'), content)
            : null;

          if (doc && typeof updateDirtyIndicator === 'function') {
            doc.lastSaved = content;
            updateDirtyIndicator(doc.id, false);
          }
        } catch (err) {
          console.error('No se pudo abrir el archivo arrastrado:', err);
        }
      };
      reader.readAsText(file);
    });
  }

  document.addEventListener('drop', handleDrop);
  backdrop.addEventListener('drop', handleDrop);
})();
