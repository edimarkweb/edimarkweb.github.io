/* Única copia de la versión en la aplicación; package.json es la otra fuente. */
const APP_VERSION = '2.44.0';
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
/*
  La pestaña abierta al salir. Sin ella, recargar la página o cerrar y volver a
  abrir la aplicación devolvía siempre a la primera, que casi nunca es en la
  que se estaba trabajando. Vive con la lista de documentos y no en las
  preferencias: es estado de la sesión de trabajo, no un ajuste que el
  escritorio tenga que llevarse al archivo del perfil.
*/
const ACTIVE_DOC_KEY = 'edimarkweb-active-doc';
const CORRUPT_DOCS_LIST_BACKUP_KEY = 'edimarkweb-docslist-corrupt-backup';
const LAYOUT_KEY = 'edimarkweb-layout';
/*
  Icono de cada disposición. Representa el panel que queda a la vista, no el
  lateral estrecho: con el Markdown maximizado el área ocupada es la izquierda,
  que es justo lo que dibuja `panel-right`.
*/
const LAYOUT_ICONS = { md: 'panel-right', html: 'panel-left', dual: 'columns-2' };
const PREVIEW_ZOOM_KEY = 'edimarkweb-preview-zoom';
const MARKDOWN_ZOOM_KEY = 'edimarkweb-markdown-zoom';
const FOCUS_MODE_KEY = 'edimarkweb-focus-mode';
/*
  El ancho de la aplicación: expandida ocupa casi toda la ventana y contraída
  se queda en la columna centrada de siempre. Arranca expandida —es donde caben
  el editor y una hoja A4 a tamaño real sin estrecharse—, y quien prefiera la
  columna lo dice una vez y se recuerda.
*/
const EXPANDED_WIDTH_KEY = 'edimarkweb-expanded-width';
/*
  El ancho del panel de la vista previa y su lupa, atados: el interruptor de la
  barra de estado. La clave vive aquí arriba con las demás porque
  `PREFERENCE_KEYS` se arma antes de que el resto del archivo se lea.
*/
const PANEL_ATADO_KEY = 'edimarkweb-panel-atado';
const LATEX_SETTINGS_KEY = 'edimarkweb-latex-settings';
const SPELLCHECK_KEY = 'edimarkweb-spellcheck';
const THEME_KEY = 'edimarkweb-theme';
/*
  La lista de imágenes del documento vive plegada salvo que se pida: con muchas
  imágenes le comería al editor la mitad de la pantalla justo cuando más texto
  hay que escribir.
*/
const BASE64_PANEL_KEY = 'edimarkweb-base64-panel';
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
const EXPORT_FORMAT_KEY = 'edimarkweb-export-format';
let base64UiContainer = null;
let base64UiList = null;
let base64UiCountLabel = null;
let base64UiToggle = null;
let base64PreviewOverlay = null;
let base64PreviewImage = null;
let base64PreviewTitle = null;
let base64PreviewMeta = null;
let base64ExtractBtn = null;
let base64ModalOverlayEl = null;
let base64ModalTextarea = null;
let base64ModalCopyBtn = null;
let base64ModalCloseBtn = null;
let currentBase64State = { placeholders: new Map(), total: 0 };
let currentLinkedImages = new Map();
let currentBase64ModalPlaceholder = null;
let imageModalReplacement = null;
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

/*
  Los desplegables se anclan al botón que los abre. En pantallas estrechas eso
  deja media lista fuera de la pantalla, así que tras abrirlos se recolocan:
  se limita su anchura al viewport y se desplazan en horizontal lo justo para
  que quepan. La altura solo se acota en móvil, donde los submenús se abren
  dentro del panel; en escritorio salen por el lateral y un recorte los cortaría.
*/
const MENU_VIEWPORT_MARGIN = 8;
const MENU_NARROW_VIEWPORT = 640;
const openViewportMenus = new Set();

function fitMenuInViewport(menu) {
    if (!menu || menu.classList.contains('hidden')) return;
    menu.style.transform = '';
    menu.style.maxWidth = '';
    menu.style.maxHeight = '';
    menu.style.overflowY = '';
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const margin = MENU_VIEWPORT_MARGIN;
    menu.style.maxWidth = `${Math.max(160, viewportWidth - margin * 2)}px`;
    let rect = menu.getBoundingClientRect();
    let shift = 0;
    if (rect.right > viewportWidth - margin) shift = viewportWidth - margin - rect.right;
    if (rect.left + shift < margin) shift = margin - rect.left;
    if (shift) {
        menu.style.transform = `translateX(${Math.round(shift)}px)`;
        rect = menu.getBoundingClientRect();
    }
    if (viewportWidth < MENU_NARROW_VIEWPORT && rect.bottom > viewportHeight - margin) {
        const available = viewportHeight - rect.top - margin;
        if (available > 120) {
            menu.style.maxHeight = `${Math.round(available)}px`;
            menu.style.overflowY = 'auto';
        }
    }
    openViewportMenus.add(menu);
}

function refitOpenMenus() {
    openViewportMenus.forEach((menu) => {
        if (!menu.isConnected || menu.classList.contains('hidden')) {
            openViewportMenus.delete(menu);
            return;
        }
        fitMenuInViewport(menu);
    });
}

window.addEventListener('resize', refitOpenMenus);
window.addEventListener('orientationchange', refitOpenMenus);
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
        if (PREFERENCE_KEYS.includes(key)) persistPreferencesToDisk();
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
        if (PREFERENCE_KEYS.includes(key)) persistPreferencesToDisk();
        return true;
    } catch (error) {
        reportStorageFailure(error);
        return false;
    }
}

/*
  Preferencias que deben sobrevivir a una reinstalación.

  En el escritorio, `localStorage` es el almacén del webview: el sistema lo
  trata como caché y una versión nueva puede encontrárselo vacío, con lo que el
  tema, el idioma, el tamaño de letra o la disposición volverían a sus valores
  de fábrica sin que nadie haya tocado nada. Por eso se guardan además en un
  archivo del perfil del usuario, que es el que manda al arrancar.

  Las opciones del documento (idioma, autor, formato LaTeX) no están aquí
  porque ya tienen su propio archivo, `settings.json`, con este mismo trato.
*/
const PREFERENCES_FILE = 'preferences.json';
const PREFERENCE_KEYS = [
    'language',
    THEME_KEY,
    LAYOUT_KEY,
    PREVIEW_ZOOM_KEY,
    MARKDOWN_ZOOM_KEY,
    FOCUS_MODE_KEY,
    EXPANDED_WIDTH_KEY,
    PANEL_ATADO_KEY,
    BASE64_PANEL_KEY,
    COPY_ACTION_KEY,
    EXPORT_FORMAT_KEY,
    SPELLCHECK_KEY,
    UPDATE_AUTO_CHECK_KEY,
    DESKTOP_SIZE_KEY,
];

// Mientras se vuelca el archivo en `localStorage` no hay que devolvérselo.
let hydratingPreferences = false;
let preferencesWriteTimer = null;

function collectPreferences() {
    const stored = {};
    PREFERENCE_KEYS.forEach(key => {
        const value = safeLocalStorageGet(key);
        if (typeof value === 'string') stored[key] = value;
    });
    return stored;
}

/*
  Se escribe con un pequeño retraso: mover el deslizador del tamaño de letra
  dispara un cambio por paso, y no hace falta un viaje al disco por cada uno.
*/
function persistPreferencesToDisk() {
    const platform = window.EdiMarkPlatform;
    if (hydratingPreferences || !platform?.isDesktop || typeof platform.writeSettingsFile !== 'function') return;
    if (preferencesWriteTimer) clearTimeout(preferencesWriteTimer);
    preferencesWriteTimer = setTimeout(() => {
        preferencesWriteTimer = null;
        platform.writeSettingsFile(JSON.stringify(collectPreferences(), null, 2), PREFERENCES_FILE)
            .catch(error => console.warn('No se han podido guardar las preferencias en el disco:', error));
    }, 300);
}
window.__edimarkPersistPreferences = persistPreferencesToDisk;

/*
  Lo guardado en el archivo sustituye a lo del webview antes de que la interfaz
  lea nada. `window.onload` e i18n.js esperan a esta promesa, así que el tema y
  el idioma se pintan ya con lo que había, sin parpadeo ni valores de fábrica.
*/
async function hydratePreferencesFromDisk() {
    const platform = window.EdiMarkPlatform;
    if (!platform?.isDesktop || typeof platform.readSettingsFile !== 'function') return;
    let contents = null;
    try {
        contents = await platform.readSettingsFile(PREFERENCES_FILE);
    } catch (error) {
        console.warn('No se han podido leer las preferencias del disco:', error);
        return;
    }
    if (!contents) {
        // Primera vez con esta versión: lo que hubiera en el webview pasa al
        // archivo y desde aquí ya manda él.
        persistPreferencesToDisk();
        return;
    }
    try {
        const parsed = JSON.parse(contents);
        if (!parsed || typeof parsed !== 'object') return;
        hydratingPreferences = true;
        PREFERENCE_KEYS.forEach(key => {
            const value = parsed[key];
            if (typeof value === 'string') safeLocalStorageSet(key, value, { notify: false });
        });
    } catch (error) {
        console.warn('Las preferencias guardadas están dañadas:', error);
    } finally {
        hydratingPreferences = false;
    }
}

const preferencesReady = hydratePreferencesFromDisk();
// i18n.js arranca en DOMContentLoaded, antes que el resto: sin esperar aquí
// leería el idioma del webview en vez del guardado.
window.__edimarkPreferencesReady = preferencesReady;

/*
  Preguntas y avisos de la aplicación. En el navegador son `confirm` y `alert`
  de siempre; en el escritorio, el diálogo del sistema, porque los modales de
  JavaScript llegan apagados y una pregunta que no se ve se responde sola que
  no. Ambos devuelven una promesa: quien pregunte tiene que esperar.
*/
function confirmAction(message) {
    const platform = window.EdiMarkPlatform;
    if (platform && typeof platform.confirm === 'function') return platform.confirm(message);
    return Promise.resolve(Boolean(window.confirm(message)));
}

function notifyUser(message) {
    const platform = window.EdiMarkPlatform;
    if (platform && typeof platform.notify === 'function') {
        return platform.notify(message).catch(error => console.warn('No se pudo mostrar el aviso:', error));
    }
    window.alert(message);
    return Promise.resolve();
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

function base64PanelExpanded() {
    return safeLocalStorageGet(BASE64_PANEL_KEY, '0') === '1';
}

function base64DataUri(info) {
    return `${info.prefix}${info.data}`;
}

function base64EntryLabels(placeholder, info, index) {
    const context = findPlaceholderContext(placeholder);
    const defaultAlt = formatTranslation('base64_image_default_alt', 'Imagen {number}', { number: index + 1 });
    return {
        title: (context && context.alt) || info.fallbackAlt || defaultAlt,
        meta: `${info.mime ? info.mime.toUpperCase() : 'IMG'} · ${formatBytes(info.approxBytes)}`,
    };
}

function collectLinkedImageEntries(sourceText, doc) {
    const entries = new Map();
    if (
        !doc
        || !assetPathUtils
        || !String(sourceText || '').includes('![')
        || !window.marked
        || typeof marked.lexer !== 'function'
        || typeof marked.walkTokens !== 'function'
    ) return entries;
    let tokens;
    try {
        tokens = marked.lexer(splitDocumentFrontMatter(String(sourceText || '')).body);
    } catch (error) {
        console.debug('No se pudo preparar la lista de imágenes del documento:', error);
        return entries;
    }
    let index = 0;
    marked.walkTokens(tokens, token => {
        if (!token || token.type !== 'image') return;
        const source = String(token.href || '').trim();
        const remote = /^(?:https?:)?\/\//i.test(source);
        const file = assetPathUtils.isRelativeAssetPath(source) && assetPathUtils.isImagePath(source);
        if (!remote && !file) return;
        index += 1;
        const snippet = String(token.raw || '');
        if (!snippet) return;
        const key = `linked-${index}`;
        const alt = String(token.text || '').trim();
        entries.set(key, {
            key,
            docId: doc.id,
            kind: remote ? 'remote' : 'file',
            source,
            snippet,
            alt,
            title: alt
                || source.split('/').pop()
                || formatTranslation('base64_image_default_alt', 'Imagen {number}', { number: index }),
        });
    });
    return entries;
}

function refreshLinkedImagesUi(sourceText, doc) {
    currentLinkedImages = collectLinkedImageEntries(sourceText, doc);
    updateBase64Ui(currentBase64State);
}

function linkedImageLabels(info) {
    return {
        title: info.title,
        meta: `${getTranslation(
            info.kind === 'remote' ? 'linked_image_online_label' : 'linked_image_file_label',
            info.kind === 'remote' ? 'En línea' : 'Archivo',
        )} · ${info.source}`,
    };
}

function repeatedImageSnippetOccurrence(entries, targetKey, snippetForEntry) {
    let occurrence = 0;
    for (const [key, info] of entries) {
        const snippet = snippetForEntry(key, info);
        if (key === targetKey) return { snippet, occurrence };
        if (snippet && snippet === snippetForEntry(targetKey, entries.get(targetKey))) occurrence += 1;
    }
    return null;
}

function base64ReplacementTarget(placeholder) {
    const entries = currentBase64State?.placeholders;
    const targetInfo = entries?.get(placeholder);
    if (!targetInfo) return null;
    const snippetForEntry = (key, info) => {
        const context = findPlaceholderContext(key);
        return context ? context.snippet.replace(key, info.data) : '';
    };
    const located = repeatedImageSnippetOccurrence(entries, placeholder, snippetForEntry);
    const context = findPlaceholderContext(placeholder);
    if (!located?.snippet || !context) return null;
    return {
        docId: currentId,
        snippet: located.snippet,
        occurrence: located.occurrence,
        alt: context.alt || '',
    };
}

function linkedReplacementTarget(key) {
    const info = currentLinkedImages.get(key);
    if (!info) return null;
    const located = repeatedImageSnippetOccurrence(currentLinkedImages, key, (_key, entry) => entry.snippet);
    if (!located?.snippet) return null;
    return {
        docId: info.docId,
        snippet: located.snippet,
        occurrence: located.occurrence,
        alt: info.alt || '',
    };
}

function openImageReplacement(target) {
    if (!target) {
        notifyUser(getTranslation('document_image_replace_error', 'No se pudo localizar la imagen que se quería reemplazar.'));
        return;
    }
    toggleImageModal(true, target.alt, target);
}

async function linkedImageUrl(info) {
    const doc = docs.find(candidate => candidate.id === info?.docId);
    if (!doc || !info) return null;
    if (info.kind === 'remote') return info.source;
    const url = await assetUrlFor(doc, info.source);
    if (url) return url;
    return window.EdiMarkPlatform?.isDesktop ? null : info.source;
}

function appendDocumentImageItem({ title, meta, thumbnailUrl = '', loadThumbnail, onPreview, actions }) {
    const item = document.createElement('div');
    item.className = 'base64-hidden-item';
    item.setAttribute('role', 'listitem');

    const thumbBtn = document.createElement('button');
    thumbBtn.type = 'button';
    thumbBtn.className = 'base64-hidden-thumb';
    thumbBtn.title = getTranslation('base64_preview_btn', 'Ver la imagen');
    thumbBtn.setAttribute('aria-label', getTranslation('base64_preview_btn', 'Ver la imagen'));
    const thumb = document.createElement('img');
    thumb.alt = '';
    thumb.loading = 'lazy';
    if (thumbnailUrl) thumb.src = thumbnailUrl;
    thumbBtn.appendChild(thumb);
    thumbBtn.addEventListener('click', onPreview);

    if (!thumbnailUrl && typeof loadThumbnail === 'function') {
        loadThumbnail().then(url => {
            if (url && item.isConnected) thumb.src = url;
        }).catch(() => {});
    }

    const details = document.createElement('div');
    details.className = 'base64-hidden-details';
    const titleEl = document.createElement('h4');
    titleEl.textContent = title;
    titleEl.title = title;
    const metaEl = document.createElement('p');
    metaEl.textContent = meta;
    metaEl.title = meta;
    details.append(titleEl, metaEl);

    const actionContainer = document.createElement('div');
    actionContainer.className = 'base64-hidden-actions';
    actions.forEach(action => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `base64-hidden-btn${action.danger ? ' base64-hidden-btn-danger' : ''}`;
        button.textContent = action.label;
        if (action.title) button.title = action.title;
        button.addEventListener('click', () => action.run(button));
        actionContainer.appendChild(button);
    });

    item.append(thumbBtn, details, actionContainer);
    base64UiList.appendChild(item);
}

function updateBase64Ui(state) {
    currentBase64State = state || { placeholders: new Map(), total: 0 };
    if (!base64UiContainer || !base64UiList || !base64UiCountLabel) return;
    const entries = currentBase64State.placeholders ? Array.from(currentBase64State.placeholders.entries()) : [];
    const linkedEntries = Array.from(currentLinkedImages.entries());
    const totalEntries = entries.length + linkedEntries.length;
    const hasEntries = totalEntries > 0;
    base64UiContainer.classList.toggle('hidden', !hasEntries);
    base64UiCountLabel.textContent = hasEntries
        ? formatTranslation(
            totalEntries === 1 ? 'base64_count_singular' : 'base64_count_plural',
            totalEntries === 1 ? '{count} imagen' : '{count} imágenes',
            { count: totalEntries }
        )
        : getTranslation('base64_count_empty', '0 encontradas');
    const expanded = base64PanelExpanded();
    /*
      La acción de pasar las incrustadas a la carpeta viaja con la lista: si
      asomara con el panel plegado, la cabecera dejaría de ser una línea y le
      comería al editor el alto que se le acaba de devolver.
    */
    if (base64ExtractBtn) {
        const showExtract = expanded && entries.length > 0;
        base64ExtractBtn.toggleAttribute('hidden', !showExtract);
        const actions = base64ExtractBtn.parentElement;
        if (actions) actions.toggleAttribute('hidden', !showExtract);
    }

    if (base64UiToggle) {
        base64UiToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const chevron = base64UiToggle.querySelector('.base64-hidden-chevron');
        if (chevron) chevron.classList.toggle('base64-hidden-chevron-open', expanded);
    }
    base64UiList.classList.toggle('hidden', !expanded || !hasEntries);
    base64UiList.innerHTML = '';
    // Plegada no se dibuja nada: cada miniatura obliga al navegador a
    // descodificar su imagen, y son justo las que pesan.
    if (!expanded || !hasEntries) return;

    entries.forEach(([placeholder, info], index) => {
        const { title, meta } = base64EntryLabels(placeholder, info, index);
        appendDocumentImageItem({
            title,
            meta,
            thumbnailUrl: base64DataUri(info),
            onPreview: () => openBase64Preview(placeholder),
            actions: [{
                label: getTranslation('document_image_replace_btn', 'Reemplazar'),
                title: getTranslation('document_image_replace_btn_title', 'Elegir otra imagen del portapapeles, del disco o de internet'),
                run: () => openImageReplacement(base64ReplacementTarget(placeholder)),
            }, {
                label: getTranslation('base64_view_code_btn', 'Ver código'),
                title: getTranslation('base64_view_code_hint', 'Copiar el código de la imagen para pegarla en otro documento.'),
                run: () => openBase64Modal(placeholder),
            }, {
                label: getTranslation('base64_delete_btn', 'Eliminar'),
                danger: true,
                run: () => removeBase64Entry(placeholder, title),
            }],
        });
    });

    linkedEntries.forEach(([key, info]) => {
        const { title, meta } = linkedImageLabels(info);
        appendDocumentImageItem({
            title,
            meta,
            loadThumbnail: () => linkedImageUrl(info),
            onPreview: () => openLinkedImagePreview(key),
            actions: [{
                label: getTranslation('document_image_replace_btn', 'Reemplazar'),
                title: getTranslation('document_image_replace_btn_title', 'Elegir otra imagen del portapapeles, del disco o de internet'),
                run: () => openImageReplacement(linkedReplacementTarget(key)),
            }, {
                label: getTranslation('linked_image_embed_btn', 'Incrustar'),
                title: getTranslation('linked_image_embed_btn_title', 'Convertir la imagen a Base64 dentro del documento'),
                run: button => convertLinkedImageToBase64(key, button),
            }, {
                label: getTranslation('base64_delete_btn', 'Eliminar'),
                danger: true,
                run: () => removeLinkedImageEntry(key),
            }],
        });
    });
    if (window.lucide) lucide.createIcons();
}

/*
  Quita del documento la imagen entera, no solo su código: lo que se ve en el
  editor es un marcador, y borrarlo a mano deja un `![alt]()` vacío. Si la
  imagen ocupaba su propia línea, se lleva también la línea.
*/
async function removeBase64Entry(placeholder, title) {
    const info = currentBase64State?.placeholders?.get(placeholder);
    const context = findPlaceholderContext(placeholder);
    if (!info || !context || !markdownEditor) return;
    const message = formatTranslation(
        'base64_delete_confirm',
        '¿Quitar «{name}» del documento? No se puede deshacer.',
        { name: title },
    );
    if (!await confirmAction(message)) return;

    const value = markdownEditor.getValue();
    const snippet = context.snippet.replace(placeholder, info.data);
    removeImageSnippetFromMarkdown(value, snippet);
}

function removeImageSnippetFromMarkdown(value, snippet) {
    if (!markdownEditor || !snippet) return false;
    const index = value.indexOf(snippet);
    if (index < 0) return false;
    let start = index;
    let end = index + snippet.length;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineBreak = value.indexOf('\n', end);
    const lineEnd = lineBreak < 0 ? value.length : lineBreak;
    const soloEnSuLinea = !value.slice(lineStart, start).trim() && !value.slice(end, lineEnd).trim();
    if (soloEnSuLinea) {
        start = lineStart;
        end = lineBreak < 0 ? value.length : lineBreak + 1;
        // Entre dos líneas en blanco, la línea que se va deja tres saltos
        // seguidos y un hueco en el texto: se queda uno de los dos.
        if (value[start - 1] === '\n' && value[end] === '\n') end += 1;
    } else if (value[start - 1] === ' ' && value[end] === ' ') {
        // Y en mitad de un párrafo, sus dos espacios se quedan en uno.
        end += 1;
    }
    markdownEditor.setValue(value.slice(0, start) + value.slice(end));
    return true;
}

function replaceImageSnippetInMarkdown(target, replacement) {
    if (!markdownEditor || !target?.snippet || target.docId !== currentId) return false;
    const value = markdownEditor.getValue();
    let index = -1;
    let from = 0;
    const occurrence = Math.max(0, Number(target.occurrence) || 0);
    for (let current = 0; current <= occurrence; current += 1) {
        index = value.indexOf(target.snippet, from);
        if (index < 0) return false;
        from = index + target.snippet.length;
    }
    markdownEditor.setValue(
        value.slice(0, index) + replacement + value.slice(index + target.snippet.length),
    );
    return true;
}

async function removeLinkedImageEntry(key) {
    const info = currentLinkedImages.get(key);
    if (!info || !markdownEditor) return;
    const message = formatTranslation(
        'base64_delete_confirm',
        '¿Quitar «{name}» del documento? No se puede deshacer.',
        { name: info.title },
    );
    if (!await confirmAction(message)) return;
    removeImageSnippetFromMarkdown(markdownEditor.getValue(), info.snippet);
}

async function linkedImageAsDataUrl(info) {
    const doc = docs.find(candidate => candidate.id === info?.docId);
    if (!doc || !info || !assetPathUtils) throw new Error('No se encontró la imagen.');
    if (info.kind === 'remote') {
        const response = await fetch(info.source);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!String(blob.type || '').toLowerCase().startsWith('image/')) {
            throw new Error('La dirección no devolvió una imagen.');
        }
        return readFileAsDataUrl(blob);
    }

    const indexedFile = lookupAssetFile(doc, info.source);
    if (indexedFile) return readFileAsDataUrl(indexedFile);

    const platform = window.EdiMarkPlatform;
    if (platform?.isDesktop && doc.filePath && typeof platform.readDocumentAsset === 'function') {
        const baseDir = assetPathUtils.directoryOf(doc.filePath);
        const absolutePath = assetPathUtils.resolveAgainstDirectory(baseDir, info.source);
        const bytes = await platform.readDocumentAsset(absolutePath);
        if (!bytes || !bytes.length) throw new Error('No se encontró la imagen.');
        return readFileAsDataUrl(new Blob([bytes], { type: assetPathUtils.mimeTypeFor(info.source) }));
    }

    const url = await linkedImageUrl(info);
    if (!url) throw new Error('No se encontró la imagen.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return readFileAsDataUrl(await response.blob());
}

async function convertLinkedImageToBase64(key, button) {
    const info = currentLinkedImages.get(key);
    if (!info || !markdownEditor) return;
    if (button) button.disabled = true;
    try {
        const dataUrl = await linkedImageAsDataUrl(info);
        const replacement = info.snippet.replace(
            /(!\[[^\]]*?\]\(\s*)([^)\s]+)([^)]*\))$/,
            (_match, opening, _source, closing) => `${opening}${dataUrl}${closing}`,
        );
        if (replacement === info.snippet) throw new Error('No se pudo localizar la referencia.');
        const value = markdownEditor.getValue();
        const index = value.indexOf(info.snippet);
        if (index < 0) throw new Error('No se pudo localizar la referencia.');
        markdownEditor.setValue(value.slice(0, index) + replacement + value.slice(index + info.snippet.length));
        reportStatus(formatTranslation(
            'linked_image_embed_done',
            '«{name}» se ha incrustado dentro del documento.',
            { name: info.title },
        ));
    } catch (error) {
        console.error('No se pudo incrustar la imagen enlazada:', error);
        notifyUser(getTranslation('linked_image_embed_error', 'No se pudo incrustar la imagen dentro del documento.'));
    } finally {
        if (button && button.isConnected) button.disabled = false;
    }
}

function openBase64Preview(placeholder) {
    const info = currentBase64State?.placeholders?.get(placeholder);
    if (!info || !base64PreviewOverlay || !base64PreviewImage) return;
    const index = Array.from(currentBase64State.placeholders.keys()).indexOf(placeholder);
    const { title, meta } = base64EntryLabels(placeholder, info, index < 0 ? 0 : index);
    base64PreviewImage.src = base64DataUri(info);
    base64PreviewImage.alt = title;
    if (base64PreviewTitle) base64PreviewTitle.textContent = title;
    if (base64PreviewMeta) base64PreviewMeta.textContent = meta;
    base64PreviewOverlay.classList.remove('hidden');
    base64PreviewOverlay.classList.add('flex');
}

function closeBase64Preview() {
    if (!base64PreviewOverlay) return;
    base64PreviewOverlay.classList.add('hidden');
    base64PreviewOverlay.classList.remove('flex');
    // Sin la fuente, el navegador suelta la imagen descodificada.
    if (base64PreviewImage) base64PreviewImage.removeAttribute('src');
}

async function openLinkedImagePreview(key) {
    const info = currentLinkedImages.get(key);
    if (!info || !base64PreviewOverlay || !base64PreviewImage) return;
    const url = await linkedImageUrl(info);
    if (!url) {
        notifyUser(getTranslation('linked_image_read_error', 'No se pudo leer la imagen enlazada.'));
        return;
    }
    const { title, meta } = linkedImageLabels(info);
    base64PreviewImage.src = url;
    base64PreviewImage.alt = title;
    if (base64PreviewTitle) base64PreviewTitle.textContent = title;
    if (base64PreviewMeta) base64PreviewMeta.textContent = meta;
    base64PreviewOverlay.classList.remove('hidden');
    base64PreviewOverlay.classList.add('flex');
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
    /*
      La misma imagen suele venir publicada a la vez en `files` y como item, y
      `getAsFile()` construye un objeto nuevo en cada llamada: comparados por
      identidad parecían dos imágenes distintas y se pegaban por duplicado. Se
      comparan por sus datos, que es lo único que tienen en común.
    */
    const seenFiles = new Set();
    const addClipboardFile = (file) => {
        if (!file) return;
        const key = `${file.name || ''}|${file.size}|${file.type || ''}`;
        if (seenFiles.has(key)) return;
        seenFiles.add(key);
        files.push(file);
    };
    if (clipboardData.files) {
        Array.from(clipboardData.files).forEach(addClipboardFile);
    }
    // Chromium, Firefox y los WebView de escritorio no siempre publican una
    // imagen pegada en `files`; en esos casos sí aparece como un item.
    if (clipboardData.items) {
        Array.from(clipboardData.items).forEach((item) => {
            if (!item || item.kind !== 'file' || typeof item.getAsFile !== 'function') return;
            addClipboardFile(item.getAsFile());
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

/*
  Igual que `readFileAsDataUrl`, pero partiendo de una ruta del disco: es lo que
  hace falta para incrustar una imagen elegida con el diálogo nativo, que
  devuelve la ruta y no el archivo.
*/
async function readDesktopImageAsDataUrl(path) {
    const platform = window.EdiMarkPlatform;
    if (!platform?.isDesktop || typeof platform.readDocumentAsset !== 'function') {
        throw new Error('No hay acceso al archivo.');
    }
    const bytes = await platform.readDocumentAsset(path);
    if (!bytes || !bytes.length) throw new Error('No se pudo leer la imagen.');
    const mimeType = window.EdiMarkAssetPaths
        ? window.EdiMarkAssetPaths.mimeTypeFor(path)
        : 'application/octet-stream';
    return readFileAsDataUrl(new Blob([bytes], { type: mimeType }));
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
        notifyUser(getTranslation('clipboard_button_unsupported', 'Tu navegador no permite leer el portapapeles desde un botón. Usa Ctrl+V.'));
        return;
    }
    const previousDisabled = button.disabled;
    button.disabled = true;
    button.classList.add('opacity-70');
    try {
        const clipboardContent = await readClipboardForButton();
        if (!clipboardContent) {
            notifyUser(getTranslation('clipboard_read_error', 'No pude leer el portapapeles. Usa Ctrl+V como alternativa.'));
            return;
        }
        const payload = classifyManualClipboardPayload(clipboardContent);
        if (!payload) {
            notifyUser(getTranslation('clipboard_empty_or_unsupported', 'El portapapeles está vacío o en un formato no soportado.'));
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
        notifyUser('No se pudo acceder al portapapeles. Usa Ctrl+V como alternativa.');
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

/*
  El corrector ortográfico es el del sistema: el navegador (o el webview de la
  aplicación de escritorio) subraya las faltas con los diccionarios instalados.
  Viene encendido y se apaga desde Configuración.
*/
function spellCheckEnabled() {
    return safeLocalStorageGet(SPELLCHECK_KEY, '1') !== '0';
}

/*
  Aplica la preferencia al editor Markdown. En Linux no basta con el atributo:
  WebKitGTK trae su corrector apagado y hay que encenderlo desde Rust indicando
  el idioma; en el navegador y en los demás sistemas esa llamada no hace nada.
*/
function applySpellChecking(lang) {
    const enabled = spellCheckEnabled();
    const language = String(lang || '').trim()
        || window.__edimarkLang
        || document.documentElement.lang
        || 'es';
    if (markdownTextareaEl) {
        markdownTextareaEl.setAttribute('spellcheck', enabled ? 'true' : 'false');
    }
    const platform = window.EdiMarkPlatform;
    if (platform && typeof platform.setSpellChecking === 'function') {
        platform.setSpellChecking(enabled, language);
    }
}

function createTextareaEditor(textarea) {
    textarea.value = normalizeNewlines(textarea.value || '');
    textarea.classList.add('markdown-textarea');
    textarea.setAttribute('spellcheck', spellCheckEnabled() ? 'true' : 'false');
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

    /*
      Sincronizar de verdad con la vista previa exige saber a qué altura queda
      una línea concreta, y con el ajuste de línea activo eso solo lo sabe el
      navegador: una línea lógica puede ocupar cuatro visuales. Esta capa
      gemela repite la geometría del textarea —mismo ancho, misma tipografía,
      mismo padding— con cada línea envuelta en su propio span, así que medirla
      es preguntar por un `offsetTop`. Se mantiene oculta y solo se reescribe
      cuando cambia el texto; el navegador se encarga de rehacer su reparto al
      cambiar el ancho o la lupa.
    */
    const measureLayer = document.createElement('div');
    measureLayer.className = 'markdown-textarea-highlights markdown-textarea-measure';
    measureLayer.setAttribute('aria-hidden', 'true');
    const measureContent = document.createElement('pre');
    measureContent.className = 'markdown-textarea-highlights-content';
    measureLayer.appendChild(measureContent);
    wrapper.insertBefore(measureLayer, textarea);
    let measuredText = null;

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
        measureLayer.style.right = `${scrollbarWidth}px`;
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

    /*
      La línea de lista donde está el cursor, con sus piezas: sangría,
      marcador, separación y texto.
    */
    function currentListLine() {
        const text = getValue();
        const cursor = textarea.selectionStart;
        const lineStart = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
        let lineEnd = text.indexOf('\n', cursor);
        if (lineEnd === -1) lineEnd = text.length;
        const line = text.slice(lineStart, lineEnd);
        const match = line.match(/^(\s*)([*+-]|\d+\.)(\s+)(.*)$/);
        if (!match) return null;
        return { text, lineStart, lineEnd, line, indent: match[1], marker: match[2], gap: match[3], rest: match[4] };
    }

    /*
      El punto anterior del mismo nivel, que es bajo el que se anida. Si no
      hay ninguno —se está en el primero— no hay dónde anidar, ni en Markdown.
    */
    function previousSiblingListLine(lineStart, indentLength) {
        const text = getValue();
        const lines = text.slice(0, Math.max(0, lineStart - 1)).split('\n');
        for (let i = lines.length - 1; i >= 0; i -= 1) {
            const match = lines[i].match(/^(\s*)([*+-]|\d+\.)\s+/);
            if (!match) {
                // Una línea en blanco entre puntos no rompe la lista.
                if (lines[i].trim() === '') continue;
                return null;
            }
            const indent = match[1];
            if (indent.length < indentLength) return null;
            if (indent.length === indentLength) return { indent, marker: match[2] };
        }
        return null;
    }

    /*
      Reescribe la línea con otra sangría y otro marcador, dejando el cursor
      donde estaba dentro del texto del punto.
    */
    function rewriteListLine(info, indent, marker) {
        const offsetInLine = textarea.selectionStart - info.lineStart;
        const rewritten = `${indent}${marker}${info.gap}${info.rest}`;
        textarea.value = info.text.slice(0, info.lineStart) + rewritten + info.text.slice(info.lineEnd);
        const delta = rewritten.length - info.line.length;
        const caret = Math.max(info.lineStart, info.lineStart + offsetInLine + delta);
        setSelectionRange(caret, caret);
        triggerChange();
    }

    function lineAtCursorIsListItem() {
        const text = getValue();
        const cursor = textarea.selectionStart;
        const lineStart = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
        let lineEnd = text.indexOf('\n', cursor);
        if (lineEnd === -1) lineEnd = text.length;
        return /^\s*([*+-]|\d+\.)\s+/.test(text.slice(lineStart, lineEnd));
    }

    function handleTab(e) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const listLine = start === end ? currentListLine() : null;

        if (e.shiftKey) {
            if (listLine) {
                /*
                  Sacar el punto un nivel es devolverlo a la sangría de aquel
                  bajo el que colgaba, con el marcador que le toque allí.
                */
                const parent = listLine.indent ? parentListLine(listLine.lineStart, listLine.indent.length) : null;
                if (parent) rewriteListLine(listLine, parent.indent, parent.marker);
                return;
            }
            handleIndent(true);
            return;
        }

        if (start !== end) {
            handleIndent(false);
            return;
        }

        /*
          Dentro de una lista el tabulador anida el punto —que es para lo que
          se pulsa ahí— en lugar de meter dos espacios donde esté el cursor,
          que dejaba el guion donde estaba y partía el texto.

          La sangría no son dos espacios fijos: es lo que ocupa el marcador de
          arriba, y `1. ` ocupa tres. Con dos, una lista numerada no anidaba
          nada; se quedaba en el mismo nivel con el número cambiado.
        */
        if (listLine) {
            const sibling = previousSiblingListLine(listLine.lineStart, listLine.indent.length);
            if (!sibling) return;
            const indent = ' '.repeat(sibling.indent.length + sibling.marker.length + 1);
            // Al anidarse estrena lista, así que la numeración empieza de nuevo.
            const marker = /^\d+\.$/.test(listLine.marker) ? '1.' : listLine.marker;
            rewriteListLine(listLine, indent, marker);
            return;
        }

        replaceOffsets(start, end, INDENT);
    }

    /*
      El punto de lista que contiene a este: se busca hacia atrás el primero
      con menos sangría. De él salen la sangría y la clase de marcador con los
      que continuar, que no tienen por qué ser los de aquí —una lista numerada
      sangra tres espacios y una de viñetas, dos—.
    */
    function parentListLine(lineStart, indentLength) {
        const text = getValue();
        const before = text.slice(0, Math.max(0, lineStart - 1));
        const lines = before.split('\n');
        for (let i = lines.length - 1; i >= 0; i -= 1) {
            const match = lines[i].match(/^(\s*)([*+-]|\d+\.)\s+/);
            if (!match) continue;
            const [, indent, marker] = match;
            if (indent.length >= indentLength) continue;
            const next = /^\d+\.$/.test(marker) ? `${parseInt(marker, 10) + 1}.` : marker;
            return { indent, marker: next };
        }
        return null;
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
                /*
                  Un punto vacío cierra la lista, pero solo la del primer
                  nivel: estando dentro de una anidada, lo que se espera es
                  salir un nivel y seguir escribiendo ahí, no acabar con todo.
                */
                const parent = indent ? parentListLine(lineStart, indent.length) : null;
                if (parent) {
                    const before = text.slice(0, lineStart);
                    const after = text.slice(lineEnd);
                    const replacement = `${parent.indent}${parent.marker} `;
                    textarea.value = before + replacement + after;
                    const caret = lineStart + replacement.length;
                    setSelectionRange(caret, caret);
                    triggerChange();
                    return true;
                }
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

    /*
      Cada línea lógica, un span; el salto entre ellos lo pone el `\n` del
      `pre`, igual que en la capa de resaltado, así que el reparto de líneas es
      exactamente el del textarea.
    */
    function refreshLineMetrics() {
        const text = textarea.value || '';
        if (measuredText === text) return;
        measuredText = text;
        measureContent.innerHTML = text
            .split('\n')
            .map(line => `<span>${line ? escapeHtml(line) : '&#8203;'}</span>`)
            .join('\n');
    }

    function lineMetrics(line) {
        refreshLineMetrics();
        const spans = measureContent.children;
        if (!spans.length) return null;
        const index = Math.max(0, Math.min(Math.round(line) || 0, spans.length - 1));
        const span = spans[index];
        if (!span) return null;
        return { top: span.offsetTop, height: span.offsetHeight || 0 };
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
        lineMetrics,
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

    function applyState(state, sourceText) {
        currentBase64State = state;
        currentLinkedImages = collectLinkedImageEntries(
            sourceText,
            docs.find(doc => doc.id === currentId),
        );
        updateBase64Ui(state);
    }

    enhanced.getDisplayValue = rawGetValue;

    enhanced.getValue = () => expandBase64Placeholders(rawGetValue(), currentBase64State.placeholders);

    enhanced.setValue = (value) => {
        const normalized = typeof value === 'string' ? normalizeNewlines(value) : '';
        const state = buildBase64CollapsedState(normalized);
        rawSetValue(state.collapsedText);
        applyState(state, normalized);
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
    applyState(initialState, expandBase64Placeholders(rawGetValue(), initialState.placeholders));

    return enhanced;
}

function countMarkdownWords(sourceText) {
    const text = typeof sourceText === 'string' ? sourceText : '';
    if (!text.trim()) return 0;
    const locale = window.__edimarkLang || document.documentElement.lang || 'es';
    if (typeof Intl.Segmenter === 'function') {
        const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
        let count = 0;
        for (const segment of segmenter.segment(text)) {
            if (segment.isWordLike) count += 1;
        }
        return count;
    }
    // Motores antiguos: letras y números forman palabras; la puntuación no.
    return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
}

function updateMarkdownCharCounter(sourceText) {
    if (!markdownCharCounterEl) return;
    const text = typeof sourceText === 'string' ? sourceText : '';
    const charCount = text.length;
    const wordCount = countMarkdownWords(text);
    const charUnit = charCount === 1
        ? getTranslation('char_counter_singular', 'carácter')
        : getTranslation('char_counter_plural', 'caracteres');
    const wordUnit = wordCount === 1
        ? getTranslation('word_counter_singular', 'palabra')
        : getTranslation('word_counter_plural', 'palabras');
    const charAbbreviation = getTranslation('char_counter_abbreviation', 'c');
    const wordAbbreviation = getTranslation('word_counter_abbreviation', 'p');
    const compact = `${charCount.toLocaleString()} ${charAbbreviation} · ${wordCount.toLocaleString()} ${wordAbbreviation}`;
    const full = `${charCount.toLocaleString()} ${charUnit} · ${wordCount.toLocaleString()} ${wordUnit}`;
    markdownCharCounterEl.textContent = compact;
    markdownCharCounterEl.title = full;
    markdownCharCounterEl.setAttribute('aria-label', full);
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

/*
  En la aplicación de escritorio la ruta del documento se guarda con la lista:
  al volver, guardar escribe donde estaba en vez de comportarse como si fuera
  un documento nuevo, y las imágenes con ruta relativa se siguen resolviendo
  desde su carpeta. Escribir en esa ruta no depende del permiso que concede el
  diálogo nativo, que caduca con la sesión, sino del comando propio de Rust.

  En el navegador no se guarda: allí una ruta no abre nada, y los permisos de
  la API de archivos sí mueren con la pestaña.
*/
function saveDocsList() {
    const keepPaths = Boolean(window.EdiMarkPlatform?.isDesktop);
    const docList = docs.map(d => {
        const entry = d.isManual ? { id: d.id, name: d.name, isManual: true } : { id: d.id, name: d.name };
        if (keepPaths && d.filePath) entry.filePath = d.filePath;
        return entry;
    });
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
        document.documentElement.classList.remove('is-tab-dragging');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
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
        let moved = false;
        if (insertBefore) {
            if (draggingTab !== insertBefore && draggingTab.nextSibling !== insertBefore) {
                tabBar.insertBefore(draggingTab, insertBefore);
                moved = true;
            }
        } else if (draggingTab !== tabBar.lastElementChild) {
            tabBar.appendChild(draggingTab);
            moved = true;
        }
        if (moved) {
            // Reinsertar un nodo puede soltar su captura en algunos motores.
            // Renovarla permite atravesar más pestañas sin perder el arrastre.
            try { draggingTab.setPointerCapture(state.pointerId); } catch (_) {}
        }
    };

    const handlePointerMove = (event) => {
        if (!state.tab || event.pointerId !== state.pointerId) return;
        const delta = Math.abs(event.clientX - state.startX);
        if (!state.dragging && delta > DRAG_THRESHOLD) {
            state.dragging = true;
            state.tab.classList.add('is-dragging');
            state.tab.setAttribute('aria-grabbed', 'true');
            document.documentElement.classList.add('is-tab-dragging');
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
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
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

function newDoc(name = '', md = '', { isManual = false, filePath = '', activate = true } = {}) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const normalizedMd = normalizeNewlines(md || '');
    const documentName = name || getTranslation('untitled_document', 'Documento sin título');
    const newDoc = { id, name: documentName, md: normalizedMd, lastSaved: normalizedMd, isManual, filePath };
    docs.push(newDoc);
    addTabElement(newDoc);
    // `activate` en falso es para el documento que llega tarde y ya no manda:
    // el manual, cuando el usuario ha abierto un archivo mientras se cargaba.
    if (activate) switchTo(id);
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

/*
  Dónde se había quedado cada pestaña. Cambiar de documento devolvía las dos
  vistas al principio, así que volver a un texto largo obligaba a buscar otra
  vez por dónde se iba; se guarda al salir y se repone al entrar, como haría
  cualquier editor con pestañas.
*/
function captureDocView() {
    if (!markdownEditor) return null;
    const scroller = typeof markdownEditor.getScrollerElement === 'function'
        ? markdownEditor.getScrollerElement()
        : null;
    const preview = getPreviewScroller();
    return {
        cursor: typeof markdownEditor.getCursor === 'function' ? markdownEditor.getCursor() : null,
        markdown: scroller ? { top: scroller.scrollTop, left: scroller.scrollLeft } : null,
        preview: preview ? { top: preview.scrollTop, left: preview.scrollLeft } : null,
    };
}

function applyScroll(element, position) {
    if (!element) return;
    element.scrollTop = position ? position.top : 0;
    element.scrollLeft = position ? position.left : 0;
}

function restoreDocView(view) {
    if (!markdownEditor) return;
    /*
      El orden importa: enfocar lleva la vista al cursor, así que el
      desplazamiento se repone después. Y se repite en el fotograma siguiente
      porque la hoja crece al renderizarse las fórmulas y las imágenes.
    */
    if (view && view.cursor && typeof markdownEditor.setCursor === 'function') {
        skipNextCursorSync = true;
        markdownEditor.setCursor(view.cursor);
        const liberar = () => { skipNextCursorSync = false; };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(liberar);
        else setTimeout(liberar, 0);
    } else if (typeof markdownEditor.setCursor === 'function') {
        markdownEditor.setCursor({ line: 0, ch: 0 });
    }
    const scroller = typeof markdownEditor.getScrollerElement === 'function'
        ? markdownEditor.getScrollerElement()
        : null;
    const preview = getPreviewScroller();
    const reponer = () => {
        applyScroll(scroller, view && view.markdown);
        applyScroll(preview, view && view.preview);
        if (htmlEditor && typeof htmlEditor.scrollTo === 'function') htmlEditor.scrollTo(0, 0);
    };
    reponer();
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(reponer);
    else setTimeout(reponer, 0);
}

function switchTo(id) {
    if (currentId && currentId !== id) {
        const previousDoc = docs.find(d => d.id === currentId);
        if (previousDoc) {
            previousDoc.md = markdownEditor.getValue();
            previousDoc.view = captureDocView();
            // El temporizador ya no volverá a este documento: se guarda aquí.
            autosaveDoc(previousDoc.id, previousDoc.md);
            updateDirtyIndicator(previousDoc.id, previousDoc.md !== previousDoc.lastSaved);
        }
    }

    currentId = id;
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    // Para volver aquí en el próximo arranque.
    safeLocalStorageSet(ACTIVE_DOC_KEY, id);

    document.querySelectorAll('.tab').forEach(t => {
        const isActive = t.dataset.id === id;
        t.setAttribute('aria-selected', isActive);
        t.classList.toggle('bg-white', isActive);
        t.classList.toggle('dark:bg-slate-900', isActive);
        t.classList.toggle('border-slate-200', isActive);
        t.classList.toggle('dark:border-slate-700', isActive);
        t.classList.toggle('border-transparent', !isActive);
    });

    /*
      El texto del documento entra de una vez: repintar la hoja poco a poco,
      como si se estuviera escribiendo, movería las dos vistas antes de haber
      repuesto dónde estaban.
    */
    skipNextMarkdownSync = true;
    markdownEditor.setValue(doc.md);
    skipNextMarkdownSync = false;
    if (typeof markdownEditor.clearHistory === 'function') {
        markdownEditor.clearHistory();
    }
    updateUndoRedoButtons();
    doc.md = markdownEditor.getValue();
    doc.lastSaved = normalizeNewlines(doc.lastSaved || doc.md);
    publishLatexSettings(effectiveLatexSettings(doc));
    updateHtml();
    if (!doc.bibliographyHydrationStarted && window.EdiMarkPlatform?.isDesktop && doc.filePath) {
        doc.bibliographyHydrationStarted = true;
        hydrateDocumentBibliography(doc).catch(error => {
            console.debug('No se pudo cargar la bibliografía del documento:', error);
        });
    }
    markdownEditor.focus();
    restoreDocView(doc.view);
    updateDirtyIndicator(id, doc.md !== doc.lastSaved);
}

/*
  Si el documento tiene cambios sin guardar.

  `doc.md` solo se pone al día cuando salta el autoguardado o al cambiar de
  pestaña, así que lo escrito en los últimos segundos todavía no está ahí: hay
  que mirar el editor cuando el documento es el que está abierto. Preguntarle a
  `doc.md` a secas dejaba cerrar sin avisar justo lo recién escrito, que es
  cuando más duele.
*/
function documentIsDirty(doc) {
    if (!doc) return false;
    const contents = (doc.id === currentId && markdownEditor) ? markdownEditor.getValue() : doc.md;
    return contents !== doc.lastSaved;
}

async function closeDoc(id) {
    const docIndex = docs.findIndex(d => d.id === id);
    if (docIndex === -1) return;

    const doc = docs[docIndex];
    const isDirty = documentIsDirty(doc);

    if (isDirty && !await confirmAction(formatTranslation(
        'close_unsaved_confirm',
        '¿Cerrar "{name}" sin guardar los cambios?',
        { name: doc.name }
    ))) {
        return;
    }

    /*
      La pregunta es asíncrona, así que entre medias la pestaña ha podido
      cerrarse por otro camino o cambiar de sitio: se busca de nuevo.
    */
    const indiceActual = docs.findIndex(d => d.id === id);
    if (indiceActual === -1) return;

    releaseDocumentAssets(id);
    deletePersistedDocumentAssets(id).catch(error => {
        console.warn('No se pudieron borrar las imágenes guardadas del documento:', error);
    });
    docs.splice(indiceActual, 1);
    document.querySelector(`.tab[data-id="${id}"]`)?.remove();
    safeLocalStorageRemove(`${AUTOSAVE_KEY_PREFIX}-${id}`);
    lastAutosavedById.delete(id);
    saveDocsList();

    if (currentId === id) {
        if (docs.length > 0) {
            const newIndex = Math.max(0, indiceActual - 1);
            switchTo(docs[newIndex].id);
        } else {
            currentId = null;
            safeLocalStorageRemove(ACTIVE_DOC_KEY);
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
    // Guardar vive ahora en la barra, donde no hay nombre de documento que
    // marcar: el punto del botón dice si al documento abierto le falta guardar.
    if (id === currentId) updateSaveButtonState(isDirty);
}

function updateSaveButtonState(isDirty) {
    const dot = document.getElementById('save-dirty-dot');
    if (dot) dot.classList.toggle('hidden', !isDirty);
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

    /*
      El manual se pide por red y tarda. En el escritorio, un documento abierto
      con doble clic puede llegar mientras tanto: si al terminar la descarga el
      manual se pusiera delante, el archivo que el usuario acaba de abrir se
      quedaría en su pestaña y el foco saltaría a la primera, que es el manual.
      Por eso solo se activa si nadie ha abierto nada por el camino; pedirlo a
      mano (F1, o recargarlo) es otra cosa y ahí manda quien lo pide.
    */
    const activoAlEmpezar = currentId;

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
                newDoc('Manual', normalized, {
                    isManual: true,
                    activate: currentId === activoAlEmpezar,
                });
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

function unquoteYamlScalar(value) {
    const text = String(value || '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        return text.slice(1, -1).replace(text[0] === '"' ? /\\"/g : /''/g, text[0]);
    }
    return text.replace(/\s+#.*$/, '').trim();
}

function bibliographyPathFromMarkdown(markdown) {
    const { frontMatter } = splitDocumentFrontMatter(markdown);
    const match = frontMatter && frontMatter.match(/^bibliography\s*:\s*(.+)$/mi);
    if (!match) return '';
    const value = unquoteYamlScalar(match[1]).replace(/\\/g, '/');
    if (!/\.(?:bib|json)$/i.test(value) || value.startsWith('/') || /^[a-zA-Z]:/.test(value)) return '';
    const segments = value.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) return '';
    return segments.join('/');
}

function setBibliographyPathInMarkdown(markdown, path = '') {
    const source = String(markdown || '');
    const { frontMatter, body } = splitDocumentFrontMatter(source);
    const cleanPath = String(path || '').trim();
    const lines = frontMatter ? frontMatter.split('\n').slice(1, -1) : [];
    const kept = lines.filter(line => !/^bibliography\s*:/i.test(line));
    if (cleanPath) kept.push(`bibliography: "${cleanPath.replace(/"/g, '\\"')}"`);
    if (!kept.length) return body || (frontMatter ? '' : source);
    return `---\n${kept.join('\n')}\n---\n\n${body || (frontMatter ? '' : source)}`;
}

/*
  ---------------------------------------------------------------------------
  Imágenes con ruta relativa
  ---------------------------------------------------------------------------

  Un `.md` normal guarda las imágenes fuera del texto y las referencia con una
  ruta relativa a su carpeta (`imagenes/01.png`). El navegador no puede leer
  esas rutas por su cuenta —la vista previa vive en una página, no en el disco—,
  así que aquí se traducen a algo que sí sabe cargar:

  - en la aplicación de escritorio, leyendo el archivo que hay junto al
    documento abierto y convirtiéndolo en un blob;
  - en el navegador, buscándolo entre los archivos de la carpeta que el usuario
    haya vinculado o arrastrado, que es lo único a lo que se tiene acceso.

  El Markdown no se toca nunca: la ruta original se guarda en `data-edimark-src`
  y se restaura antes de copiar, exportar o volcar la vista previa al Markdown.
*/
const assetPathUtils = (typeof window !== 'undefined' && window.EdiMarkAssetPaths) || null;
const documentAssetCache = new Map();
const droppedAssetIndexes = [];
let previewAssetToken = 0;
const ASSET_DB_NAME = 'edimarkweb-assets';
const ASSET_DB_STORE = 'document-assets';
let assetDatabasePromise = null;

function openAssetDatabase() {
    const platform = window.EdiMarkPlatform;
    if (platform?.isDesktop || typeof window.indexedDB === 'undefined') return Promise.resolve(null);
    if (assetDatabasePromise) return assetDatabasePromise;
    assetDatabasePromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(ASSET_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (database.objectStoreNames.contains(ASSET_DB_STORE)) return;
            const store = database.createObjectStore(ASSET_DB_STORE, { keyPath: 'key' });
            store.createIndex('docId', 'docId', { unique: false });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('asset_database_open_failed'));
        request.onblocked = () => reject(new Error('asset_database_blocked'));
    }).catch(error => {
        assetDatabasePromise = null;
        reportStorageFailure(error);
        return null;
    });
    return assetDatabasePromise;
}

function assetTransactionFinished(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('asset_database_write_failed'));
        transaction.onabort = () => reject(transaction.error || new Error('asset_database_write_aborted'));
    });
}

async function replacePersistedDocumentAssets(docId, assets) {
    const database = await openAssetDatabase();
    if (!database || !docId) return false;
    const transaction = database.transaction(ASSET_DB_STORE, 'readwrite');
    const store = transaction.objectStore(ASSET_DB_STORE);
    const keysRequest = store.index('docId').getAllKeys(docId);
    keysRequest.onsuccess = () => {
        keysRequest.result.forEach(key => store.delete(key));
        assets.forEach(asset => {
            store.put({
                key: `${docId}\u0000${asset.relativePath}`,
                docId,
                relativePath: asset.relativePath,
                file: asset.contents,
            });
        });
    };
    try {
        await assetTransactionFinished(transaction);
        return true;
    } catch (error) {
        reportStorageFailure(error);
        return false;
    }
}

async function readPersistedDocumentAssets(docId) {
    const database = await openAssetDatabase();
    if (!database || !docId) return [];
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(ASSET_DB_STORE, 'readonly');
        const request = transaction.objectStore(ASSET_DB_STORE).index('docId').getAll(docId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('asset_database_read_failed'));
    }).catch(error => {
        reportStorageFailure(error);
        return [];
    });
}

async function deletePersistedDocumentAssets(docId) {
    const database = await openAssetDatabase();
    if (!database || !docId) return;
    const transaction = database.transaction(ASSET_DB_STORE, 'readwrite');
    const store = transaction.objectStore(ASSET_DB_STORE);
    const keysRequest = store.index('docId').getAllKeys(docId);
    keysRequest.onsuccess = () => keysRequest.result.forEach(key => store.delete(key));
    await assetTransactionFinished(transaction);
}

function documentAssetEntry(docId) {
    if (!documentAssetCache.has(docId)) {
        documentAssetCache.set(docId, { urls: new Map(), pending: new Map(), assetIndex: null, folderName: '' });
    }
    return documentAssetCache.get(docId);
}

/* Los blobs ocupan memoria hasta que se revocan: al cerrar la pestaña, fuera. */
function releaseDocumentAssets(docId) {
    const entry = documentAssetCache.get(docId);
    if (!entry) return;
    entry.urls.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
    documentAssetCache.delete(docId);
}

/*
  Olvida las imágenes que no se encontraron para que vuelvan a intentarse: se
  llama al vincular una carpeta nueva, cuando lo que antes faltaba puede estar.
*/
function forgetMissingAssets(docId) {
    const entry = documentAssetCache.get(docId);
    if (entry) entry.pending.clear();
}

function registerAssetFolder(files, { docId = null, folderName = '' } = {}) {
    if (!assetPathUtils || !files || !files.length) return 0;
    const entries = Array.from(files)
        .map(file => ({ path: file.__edimarkPath || file.webkitRelativePath || file.name, file }))
        .filter(item => assetPathUtils.isImagePath(item.path));
    if (!entries.length) return 0;
    const assetIndex = assetPathUtils.buildAssetIndex(entries);
    if (docId) {
        const entry = documentAssetEntry(docId);
        entry.assetIndex = assetIndex;
        entry.folderName = folderName;
    } else {
        droppedAssetIndexes.push(assetIndex);
    }
    docs.forEach(doc => forgetMissingAssets(doc.id));
    return entries.length;
}

/*
  ---------------------------------------------------------------------------
  Sacar del texto las imágenes incrustadas
  ---------------------------------------------------------------------------

  Una imagen pegada entra en el documento como `data:image/png;base64,…`: viaja
  con el texto y no se pierde, pero engorda el `.md` un tercio más que el
  archivo original y lo vuelve incómodo de leer y de versionar. Este es el
  camino de vuelta: cada imagen pasa a `images/` dentro de la carpeta propia de
  recursos del documento, y en el
  texto queda su ruta, que es como guarda las imágenes cualquier `.md`.

  Los archivos no se escriben aquí, sino al guardar el documento, por el mismo
  camino que ya usan las imágenes de ruta relativa —el escritorio las escribe
  junto al `.md`, el navegador en la carpeta que se elija y, donde no hay
  selector de carpeta, dentro del ZIP—. Mientras tanto quedan registradas en
  memoria para que la vista previa las siga enseñando.
*/
/*
  La carpeta se llama como el documento: `mi-archivo.md` saca sus imágenes a
  `mi-archivo/images/`. Antes todos los documentos usaban la misma `imagenes/`, y dos
  `.md` guardados uno al lado del otro se pisaban las imágenes sin avisar: los
  archivos se numeran desde `01` en cada documento, así que el segundo escribía
  su `01.png` encima del primero. Con el nombre delante también se sabe de quién
  es cada carpeta al mirar el disco.

  El nombre se recorta a lo que un sistema de archivos acepta, y los espacios se
  vuelven guiones: la ruta va dentro de un `![](...)` de Markdown, donde un
  espacio cortaría el enlace. Un documento sin nombre utilizable se queda con la
  carpeta de siempre.
*/
const EXTRACTED_ASSETS_FALLBACK_FOLDER = 'imagenes';

function extractedAssetsFolder(doc) {
    return extractedAssetsFolderName(doc && typeof doc.name === 'string' ? doc.name : '');
}

function extractedAssetsFolderName(name) {
    const rawName = String(name || '').trim();
    const folder = rawName
        .replace(/\.md$/i, '')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[.\-]+|[.\-]+$/g, '');
    return folder || EXTRACTED_ASSETS_FALLBACK_FOLDER;
}
const EXTRACTED_IMAGE_EXTENSIONS = new Map([
    ['jpeg', 'jpg'],
    ['svg+xml', 'svg'],
]);

function extensionForImageMime(mime) {
    const clean = String(mime || '').toLowerCase().replace(/[^a-z0-9.+-]/g, '');
    if (!clean) return 'png';
    return EXTRACTED_IMAGE_EXTENSIONS.get(clean) || clean;
}

function base64ToBytes(data) {
    const binary = atob(String(data || '').replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// Las rutas que el documento ya usa, para no escribir encima de ninguna.
function relativeImagePathsInMarkdown(markdown) {
    const paths = new Set();
    if (!assetPathUtils) return paths;
    const pattern = /!\[[^\]]*?\]\(\s*([^)\s]+)/g;
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
        const candidate = match[1];
        if (!assetPathUtils.isRelativeAssetPath(candidate)) continue;
        const normalized = assetPathUtils.normalizeRelativePath(candidate);
        if (normalized) paths.add(normalized);
    }
    return paths;
}

/*
  El índice de imágenes del documento se amplía, no se sustituye: quien tenga
  una carpeta vinculada no debe perderla por sacar una imagen del texto.
*/
function registerExtractedAssets(doc, files) {
    if (!assetPathUtils || !doc || !files.length) return;
    const entry = documentAssetEntry(doc.id);
    const added = assetPathUtils.buildAssetIndex(files.map(file => ({ path: file.relativePath, file: file.blob })));
    if (!entry.assetIndex) {
        entry.assetIndex = added;
    } else {
        added.index.forEach((value, key) => entry.assetIndex.index.set(key, value));
        added.ambiguous.forEach(key => entry.assetIndex.ambiguous.add(key));
    }
    forgetMissingAssets(doc.id);
}

async function extractBase64Images() {
    const doc = docs.find(d => d.id === currentId);
    if (!doc || !markdownEditor) return 0;
    const markdown = markdownEditor.getValue();
    if (!BASE64_TEST_REGEX.test(markdown)) {
        reportStatus(getTranslation('base64_extract_empty', 'No hay imágenes incrustadas en este documento.'));
        return 0;
    }
    const used = relativeImagePathsInMarkdown(markdown);
    const folder = extractedAssetsFolder(doc);
    const extracted = [];
    let counter = 0;
    const rewritten = markdown.replace(BASE64_IMAGE_REGEX, (match, alt, prefix, mime, data, tail) => {
        let bytes;
        try {
            bytes = base64ToBytes(data);
        } catch (error) {
            // Un base64 que no se entiende se queda como está, sin tocar nada.
            console.warn('No se pudo leer una imagen incrustada:', error);
            return match;
        }
        const extension = extensionForImageMime(mime);
        let relativePath = '';
        do {
            counter += 1;
            relativePath = `${folder}/images/${String(counter).padStart(2, '0')}.${extension}`;
        } while (used.has(relativePath));
        used.add(relativePath);
        extracted.push({
            relativePath,
            blob: new File([bytes], relativePath.split('/').pop(), { type: `image/${mime}` }),
        });
        return `![${alt}](${relativePath}${tail || ''})`;
    });

    if (!extracted.length) {
        reportStatus(getTranslation('base64_extract_empty', 'No hay imágenes incrustadas en este documento.'));
        return 0;
    }

    registerExtractedAssets(doc, extracted);
    markdownEditor.setValue(rewritten);
    doc.md = rewritten;
    updateHtml();
    await persistLinkedDocumentAssets(doc, rewritten);
    reportStatus(formatTranslation(
        extracted.length === 1 ? 'base64_extract_done_one' : 'base64_extract_done_many',
        '{count} imágenes pasadas a «{folder}». Se escribirán al guardar el documento.',
        { count: extracted.length, folder: `${folder}/images/` },
    ));
    return extracted.length;
}

async function persistLinkedDocumentAssets(doc, content) {
    const platform = window.EdiMarkPlatform;
    if (platform?.isDesktop || !doc) return false;
    const assets = await collectLinkedDocumentAssets(doc, content);
    return replacePersistedDocumentAssets(doc.id, assets);
}

async function restorePersistedDocumentAssets(doc) {
    const records = await readPersistedDocumentAssets(doc?.id);
    const entries = records
        .filter(record => record && record.relativePath && record.file)
        .map(record => ({ path: record.relativePath, file: record.file }));
    if (!entries.length || !assetPathUtils) return 0;
    const entry = documentAssetEntry(doc.id);
    entry.assetIndex = assetPathUtils.buildAssetIndex(entries);
    entry.folderName = '';
    forgetMissingAssets(doc.id);
    if (currentId === doc.id) updateHtml();
    return entries.length;
}

function lookupAssetFile(doc, relativePath) {
    if (!assetPathUtils) return null;
    const entry = documentAssetEntry(doc.id);
    const found = assetPathUtils.lookupAsset(entry.assetIndex, relativePath);
    if (found) return found;
    for (let i = droppedAssetIndexes.length - 1; i >= 0; i -= 1) {
        const candidate = assetPathUtils.lookupAsset(droppedAssetIndexes[i], relativePath);
        if (candidate) return candidate;
    }
    return null;
}

async function loadAssetUrl(doc, relativePath) {
    const file = lookupAssetFile(doc, relativePath);
    if (file) return URL.createObjectURL(file);

    const platform = window.EdiMarkPlatform;
    if (platform?.isDesktop && doc.filePath && typeof platform.readDocumentAsset === 'function') {
        const baseDir = assetPathUtils.directoryOf(doc.filePath);
        const absolutePath = assetPathUtils.resolveAgainstDirectory(baseDir, relativePath);
        try {
            const bytes = await platform.readDocumentAsset(absolutePath);
            if (bytes && bytes.length) {
                return URL.createObjectURL(new Blob([bytes], { type: assetPathUtils.mimeTypeFor(relativePath) }));
            }
        } catch (error) {
            // Que falte una imagen es corriente mientras se escribe: no se
            // interrumpe la vista previa por ello.
            console.debug('No se pudo leer la imagen del documento:', absolutePath, error);
        }
    }
    return null;
}

function assetUrlFor(doc, relativePath) {
    const entry = documentAssetEntry(doc.id);
    const key = assetPathUtils.normalizeRelativePath(relativePath);
    if (!key) return Promise.resolve(null);
    if (entry.urls.has(key)) return Promise.resolve(entry.urls.get(key));
    if (entry.pending.has(key)) return entry.pending.get(key);
    const request = loadAssetUrl(doc, key)
        .then(url => {
            if (url) entry.urls.set(key, url);
            return url;
        })
        .catch(() => null);
    entry.pending.set(key, request);
    return request;
}

/* ¿Ha conseguido el navegador cargar la imagen por su cuenta? */
function whenImageSettles(img) {
    if (img.complete) return Promise.resolve(img.naturalWidth > 0);
    return new Promise(resolve => {
        const finish = loaded => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
            resolve(loaded);
        };
        const onLoad = () => finish(true);
        const onError = () => finish(false);
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
    });
}

/*
  Sustituye en la vista previa las rutas que el navegador no ha sabido cargar
  por URL que sí entiende. Lo que ya está en la caché se aplica de inmediato,
  sin esperar a nada, para que el documento no parpadee con cada tecla.

  Se espera a ver si la imagen carga sola antes de tocarla: en la versión web,
  una ruta relativa se resuelve contra la dirección de la página, así que las
  imágenes publicadas junto al sitio —el logotipo del manual, sin ir más lejos—
  ya se ven y no hay nada que arreglar. Solo se interviene cuando fallan, que es
  lo que ocurre siempre en la aplicación de escritorio y con los documentos
  abiertos desde el disco.
*/
function applyRelativeImageSources(container, doc) {
    if (!assetPathUtils || !container || !doc) return;
    const token = ++previewAssetToken;
    const entry = documentAssetEntry(doc.id);
    const candidates = [];

    container.querySelectorAll('img[src]').forEach(img => {
        const original = img.getAttribute('src') || '';
        if (!assetPathUtils.isRelativeAssetPath(original)) return;
        img.dataset.edimarkSrc = original;
        const key = assetPathUtils.normalizeRelativePath(original);
        const cached = entry.urls.get(key);
        if (cached) {
            img.setAttribute('src', cached);
            return;
        }
        candidates.push({ img, original });
    });

    if (!candidates.length) {
        updateMissingAssetsNotice(container, doc);
        return;
    }

    Promise.all(candidates.map(({ img, original }) => whenImageSettles(img)
        .then(loaded => {
            if (loaded || token !== previewAssetToken || !img.isConnected) return null;
            return assetUrlFor(doc, original).then(url => {
                if (token !== previewAssetToken || !img.isConnected) return null;
                if (url) img.setAttribute('src', url);
                else img.classList.add('edimark-missing-asset');
                return null;
            });
        })))
        .then(() => {
            if (token !== previewAssetToken) return;
            updateMissingAssetsNotice(container, doc);
        });
}

/*
  El Markdown es la fuente: cualquier cosa que salga de la vista previa —la
  conversión a Markdown, el HTML copiado, lo que se exporta— tiene que llevar la
  ruta que escribió el usuario, no el blob temporal de esta sesión.
*/
function restoreOriginalImageSources(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return root;
    root.querySelectorAll('img[data-edimark-src]').forEach(img => {
        img.setAttribute('src', img.dataset.edimarkSrc);
        delete img.dataset.edimarkSrc;
        img.classList.remove('edimark-missing-asset');
        if (!img.getAttribute('class')) img.removeAttribute('class');
    });
    return root;
}

/*
  Aviso de las imágenes que no se han podido encontrar, con el botón para
  vincular la carpeta del documento. En el navegador es el único camino posible:
  ninguna página puede leer una carpeta del disco sin que el usuario la elija.
*/
function updateMissingAssetsNotice(container, doc) {
    const notice = document.getElementById('missing-assets-notice');
    if (!notice) return;
    const missing = container
        ? container.querySelectorAll('img.edimark-missing-asset').length
        : 0;
    const messageEl = document.getElementById('missing-assets-message');
    if (!missing) {
        notice.classList.add('hidden');
        return;
    }
    if (messageEl) {
        const template = missing === 1
            ? getTranslation('missing_assets_one', 'No se encuentra 1 imagen del documento.')
            : getTranslation('missing_assets_many', 'No se encuentran {count} imágenes del documento.');
        messageEl.textContent = template.replace('{count}', String(missing));
    }
    notice.classList.remove('hidden');
    notice.dataset.docId = doc ? doc.id : '';
}

/*
  ---------------------------------------------------------------------------
  Correspondencia entre las líneas del Markdown y la vista previa
  ---------------------------------------------------------------------------

  Los dos paneles se seguían por proporción: si el cursor iba por el 30 % de
  las líneas, la vista previa se ponía al 30 % de su altura. En un documento
  donde una línea es una tabla, la siguiente una imagen y la de más allá un
  párrafo suelto, ese 30 % cae donde sea —a menudo fuera de la pantalla—,
  porque las líneas del Markdown y los milímetros de la hoja no se parecen en
  nada.

  Lo que se hace aquí es anotar la correspondencia real. Al analizar el
  Markdown, el lexer de marked entrega los bloques de nivel superior en el
  mismo orden en que la vista previa los pinta, y cada uno trae su texto
  original: contando sus saltos de línea se sabe en qué línea empieza cada
  bloque, y ese número se guarda junto al elemento que le corresponde en la
  hoja. Las listas y las tablas se desglosan un nivel más, por elemento y por
  fila, que es donde más se notaba el desajuste.

  La línea se guarda como propiedad del elemento, no como atributo: el HTML de
  la vista previa se copia, se exporta y se vuelca al editor de código, y no
  debe llevar marcas nuestras.
*/
const PREVIEW_LINE_KEY = '__edimarkLine';
const PREVIEW_LINE_END_KEY = '__edimarkEndLine';
let previewLineBlocks = [];

function countNewlines(text) {
    if (typeof text !== 'string' || !text) return 0;
    let total = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (text.charCodeAt(i) === 10) total += 1;
    }
    return total;
}

/*
  Las fórmulas viajan al analizador convertidas en un marcador de una sola
  línea, así que un `$$...$$` de cinco líneas encoge el texto y descoloca la
  cuenta. Aquí se anota cuántas líneas se comió cada marcador para poder
  devolver siempre líneas del documento que el usuario está viendo.
*/
function buildMathLineShifts(protectedText, segments) {
    if (!Array.isArray(segments) || !segments.length) return [];
    const shifts = [];
    const pattern = new RegExp(`${MATH_PLACEHOLDER_PREFIX}(\\d+)${MATH_PLACEHOLDER_SUFFIX}`, 'g');
    let match;
    while ((match = pattern.exec(protectedText)) !== null) {
        const extra = countNewlines(segments[Number(match[1])] || '');
        if (!extra) continue;
        shifts.push({ line: countNewlines(protectedText.slice(0, match.index)), extra });
    }
    return shifts;
}

function mathShiftAt(shifts, line) {
    let total = 0;
    for (const shift of shifts) {
        if (shift.line < line) total += shift.extra;
    }
    return total;
}

/*
  Casi todos los bloques dan un elemento; el HTML incrustado puede dar varios o
  ninguno y hay que contarlos para no perder el paso.
*/
function elementsProducedBy(token) {
    if (!token || token.type !== 'html') return 1;
    const probe = document.createElement('div');
    probe.innerHTML = token.raw || '';
    return probe.children.length;
}

function indexInnerBlocks(token, element, startLine, toSource, register) {
    if (token.type === 'list' && Array.isArray(token.items)) {
        const items = Array.from(element.children).filter(child => child.tagName === 'LI');
        let line = startLine;
        token.items.forEach((item, index) => {
            if (items[index]) register(items[index], toSource(line));
            line += countNewlines(item && item.raw ? item.raw : '');
        });
        return;
    }
    if (token.type === 'table') {
        // La primera fila es la cabecera; la línea de guiones que va debajo no
        // pinta nada, de ahí el salto extra a partir de la segunda.
        Array.from(element.querySelectorAll('tr')).forEach((row, index) => {
            register(row, toSource(startLine + (index === 0 ? 0 : index + 1)));
        });
    }
}

function indexPreviewLines(container, protectedText, segments, lineOffset) {
    previewLineBlocks = [];
    if (!container || !window.marked || typeof marked.lexer !== 'function') return;
    let tokens;
    try {
        tokens = marked.lexer(protectedText);
    } catch (error) {
        console.warn('No se ha podido indexar la vista previa.', error);
        return;
    }
    const shifts = buildMathLineShifts(protectedText, segments);
    const toSource = line => lineOffset + line + mathShiftAt(shifts, line);
    const elements = Array.from(container.children);
    const register = (element, line) => {
        if (!element || element[PREVIEW_LINE_KEY] !== undefined) return;
        element[PREVIEW_LINE_KEY] = line;
        previewLineBlocks.push({ el: element, line });
    };
    let elementIndex = 0;
    let protectedLine = 0;
    for (const token of tokens) {
        const startLine = protectedLine;
        protectedLine += countNewlines(token && token.raw ? token.raw : '');
        if (!token || token.type === 'space' || token.type === 'def') continue;
        const element = elements[elementIndex];
        elementIndex += elementsProducedBy(token);
        if (!element) continue;
        register(element, toSource(startLine));
        indexInnerBlocks(token, element, startLine, toSource, register);
    }
    previewLineBlocks.sort((a, b) => a.line - b.line);
    const lastLine = lineOffset + protectedLine + mathShiftAt(shifts, protectedLine);
    previewLineBlocks.forEach((block, index) => {
        const next = previewLineBlocks[index + 1];
        block.endLine = Math.max(block.line + 1, next ? next.line : lastLine);
        block.el[PREVIEW_LINE_END_KEY] = block.endLine;
    });
}

// El último bloque que empieza en la línea pedida o antes.
function previewBlockForLine(line) {
    if (!previewLineBlocks.length) return null;
    let low = 0;
    let high = previewLineBlocks.length - 1;
    let found = null;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (previewLineBlocks[mid].line <= line) {
            found = previewLineBlocks[mid];
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return found || previewLineBlocks[0];
}

/*
  Deja el punto pedido dentro de la zona visible. Si ya se está viendo con
  holgura no se mueve nada —escribir no debe hacer bailar el otro panel—; si
  no, se coloca a la altura que ocupa en el panel desde el que se pide, de modo
  que los dos paneles enseñen lo mismo a la misma altura.
*/
function alignScrollerTo(scroller, top, anchor) {
    if (!scroller) return;
    const view = scroller.clientHeight;
    if (!view) return;
    const margin = Math.min(96, view * 0.15);
    const current = scroller.scrollTop;
    if (top >= current + margin && top <= current + view - margin) return;
    const place = Math.min(0.85, Math.max(0.15, typeof anchor === 'number' ? anchor : 0.35));
    const limit = Math.max(0, scroller.scrollHeight - view);
    scroller.scrollTop = Math.max(0, Math.min(top - view * place, limit));
}

function markdownCursorAnchor(line) {
    if (!markdownEditor || typeof markdownEditor.lineMetrics !== 'function') return 0.35;
    const scroller = markdownEditor.getScrollerElement();
    const metrics = markdownEditor.lineMetrics(line);
    if (!scroller || !scroller.clientHeight || !metrics) return 0.35;
    return (metrics.top - scroller.scrollTop) / scroller.clientHeight;
}

function scrollPreviewToLine(line, anchor) {
    const block = previewBlockForLine(line);
    const scroller = getPreviewScroller();
    if (!block || !scroller || !block.el.isConnected) return false;
    const span = Math.max(1, block.endLine - block.line);
    const fraction = Math.min(1, Math.max(0, (line - block.line) / span));
    const rect = block.el.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const top = rect.top - scrollerRect.top + scroller.scrollTop + rect.height * fraction;
    alignScrollerTo(scroller, top, anchor);
    return true;
}

function scrollMarkdownToLine(line, fraction = 0, anchor) {
    if (!markdownEditor || typeof markdownEditor.lineMetrics !== 'function') return false;
    const scroller = markdownEditor.getScrollerElement();
    const metrics = markdownEditor.lineMetrics(line);
    if (!scroller || !metrics) return false;
    const top = metrics.top + metrics.height * Math.min(1, Math.max(0, fraction));
    alignScrollerTo(scroller, top, anchor);
    return true;
}

/*
  Un punto de la vista previa se traduce buscando el bloque anotado más
  cercano —la fila de la tabla antes que la tabla, el elemento de lista antes
  que la lista— y mirando por dónde se ha pinchado dentro de él.
*/
function markdownLineFromPreviewNode(node, clientY) {
    const container = document.getElementById('html-output');
    let element = node && node.nodeType === 3 ? node.parentNode : node;
    while (element && element !== container && element[PREVIEW_LINE_KEY] === undefined) {
        element = element.parentElement;
    }
    if (!element || element === container || element[PREVIEW_LINE_KEY] === undefined) return null;
    const line = element[PREVIEW_LINE_KEY];
    const endLine = element[PREVIEW_LINE_END_KEY] || line + 1;
    const rect = element.getBoundingClientRect();
    let within = 0;
    if (typeof clientY === 'number' && rect.height > 0) {
        within = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    }
    const scroller = getPreviewScroller();
    const anchor = scroller && scroller.clientHeight && typeof clientY === 'number'
        ? (clientY - scroller.getBoundingClientRect().top) / scroller.clientHeight
        : undefined;
    return { line: line + within * (endLine - line - 1), anchor };
}

/*
  Al escribir en la vista previa el Markdown se rehace entero, así que las
  líneas que se anotaron antes ya no valen. Lo que sí se mantiene es el orden:
  el bloque número N de la hoja sigue siendo el bloque número N del texto, y
  con eso se recupera su línea sin volver a pintar nada.
*/
function markdownLineForBlockIndex(index) {
    if (index < 0 || !window.marked || typeof marked.lexer !== 'function') return null;
    const full = markdownEditor.getValue();
    const body = splitDocumentFrontMatter(full).body;
    const lineOffset = countNewlines(full.slice(0, Math.max(0, full.length - body.length)));
    const { text, segments } = protectMathSegments(body);
    let tokens;
    try {
        tokens = marked.lexer(preserveMarkdownEscapes(text));
    } catch (error) {
        return null;
    }
    const shifts = buildMathLineShifts(text, segments);
    let blockIndex = 0;
    let protectedLine = 0;
    for (const token of tokens) {
        const startLine = protectedLine;
        protectedLine += countNewlines(token && token.raw ? token.raw : '');
        if (!token || token.type === 'space' || token.type === 'def') continue;
        if (blockIndex === index) {
            return lineOffset + startLine + mathShiftAt(shifts, startLine);
        }
        blockIndex += elementsProducedBy(token);
    }
    return null;
}

/*
  Los bloques preformateados no pueden partir líneas sin deshacer diagramas,
  tablas ASCII o código alineado. Si el bloque completo cabe reduciendo la
  letra hasta un 60 %, se ajusta a la hoja; por debajo de eso conserva su
  tamaño mínimo y la barra horizontal que aporta la hoja tipográfica.

  La escala vive en una variable de presentación. Turndown ignora este detalle
  al devolver el bloque a Markdown, de modo que el texto original no cambia.
*/
function fitWidePreformattedBlocks(container) {
    if (!container) return;
    container.querySelectorAll('pre').forEach((block) => {
        block.style.removeProperty('--edimark-pre-fit');
        const computed = getComputedStyle(block);
        const horizontalPadding = (Number.parseFloat(computed.paddingLeft) || 0)
            + (Number.parseFloat(computed.paddingRight) || 0);
        const available = Math.max(0, block.clientWidth - horizontalPadding);
        const required = Math.max(0, block.scrollWidth - horizontalPadding);
        if (!available || required <= available + 1) return;
        block.style.setProperty('--edimark-pre-fit', String(Math.max(0.6, available / required)));
    });
}

function previewCitationEntries() {
    const api = window.EdiMarkBibliography;
    if (!api || typeof api.parseBibliography !== 'function') return [];
    const settings = effectiveLatexSettings();
    return api.parseBibliography(settings.bibliographyContent || '', settings.bibliographyName || '');
}

function previewCitationLabel(source, entries = previewCitationEntries()) {
    const api = window.EdiMarkBibliography;
    if (!api || typeof api.formatPreviewCitation !== 'function') return '';
    return api.formatPreviewCitation(source, entries);
}

/*
  La hoja enseña una cita humana en lugar de la sintaxis de Pandoc, pero la
  conserva en data-edimark-citation. Es una ficha indivisible: al editar desde
  la hoja se sustituye completa y Turndown recupera después el Markdown exacto.
*/
function renderPreviewCitations(container) {
    if (!container || typeof document.createTreeWalker !== 'function') return;
    const entries = previewCitationEntries();
    if (!entries.length) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const citationPattern = /\[[^\]\n]*@[^\]\n]+\]|@[A-Za-z0-9_](?:[A-Za-z0-9_.:+\/#$%&?<>~-]*[A-Za-z0-9_])?(?:\s+\[[^\]\n]+\])?/g;

    textNodes.forEach((textNode) => {
        const parent = textNode.parentElement;
        if (!parent || parent.closest('code, pre, a, script, style, textarea, .edimark-preview-citation')) return;
        const text = textNode.data;
        citationPattern.lastIndex = 0;
        let match;
        let cursor = 0;
        let changed = false;
        const fragment = document.createDocumentFragment();
        while ((match = citationPattern.exec(text))) {
            const label = previewCitationLabel(match[0], entries);
            if (!label) continue;
            fragment.append(document.createTextNode(text.slice(cursor, match.index)));
            const citation = document.createElement('span');
            citation.className = 'edimark-preview-citation';
            citation.dataset.edimarkCitation = match[0];
            citation.textContent = label;
            citation.contentEditable = 'false';
            citation.tabIndex = 0;
            citation.setAttribute('role', 'button');
            const hint = getTranslation('citation_preview_edit', 'Cita bibliográfica. Pulsa para editarla.');
            citation.title = hint;
            citation.setAttribute('aria-label', `${label}. ${hint}`);
            fragment.append(citation);
            cursor = match.index + match[0].length;
            changed = true;
        }
        if (!changed) return;
        fragment.append(document.createTextNode(text.slice(cursor)));
        textNode.replaceWith(fragment);
    });
}

let previewBibliographyTimer = null;
let previewBibliographyGeneration = 0;
let previewBibliographyCache = { signature: '', rendered: null };

function effectiveBibliographyTitle(settings = effectiveLatexSettings()) {
    const custom = String(settings.bibliographyTitle || '').trim();
    return custom || getTranslation('bibliography_default_title', 'Referencias');
}

function applyCiteprocPreview(container, sources, rendered) {
    if (!container || !container.isConnected) return;
    const citations = Array.from(container.querySelectorAll('.edimark-preview-citation'));
    if (citations.length !== sources.length
        || citations.some((node, index) => node.dataset.edimarkCitation !== sources[index])) return;
    rendered.labels.forEach((label, index) => {
        if (!label || !citations[index]) return;
        citations[index].textContent = label;
        const hint = getTranslation('citation_preview_edit', 'Cita bibliográfica. Pulsa para editarla.');
        citations[index].setAttribute('aria-label', `${label}. ${hint}`);
    });
    container.querySelectorAll('[data-edimark-bibliography]').forEach(node => node.remove());
    if (rendered.referencesHtml) {
        const settings = effectiveLatexSettings();
        const section = document.createElement('section');
        section.className = 'edimark-preview-bibliography';
        section.dataset.edimarkBibliography = '';
        section.contentEditable = 'false';
        const level = Math.min(6, Math.max(1, Number(settings.bibliographyHeadingLevel) || 2));
        const heading = document.createElement(`h${level}`);
        heading.textContent = effectiveBibliographyTitle(settings);
        section.append(heading);
        const references = document.createElement('div');
        references.className = 'edimark-preview-references';
        references.innerHTML = rendered.referencesHtml;
        section.append(references);
        container.append(section);
    }
    if (typeof window.__schedulePageBreaks === 'function') window.__schedulePageBreaks();
}

/*
  citeproc es la única fuente fiable para APA, Chicago, MLA o IEEE. Se ejecuta
  con demora y solo cuando cambian las citas o sus ajustes; mientras tanto se
  mantiene la etiqueta rápida local. El bloque final es una proyección de la
  bibliografía y buildHtmlWithTex lo retira antes de sincronizar o exportar.
*/
function schedulePreviewBibliography(container) {
    if (!container) return;
    const sources = Array.from(container.querySelectorAll('.edimark-preview-citation'))
        .map(node => node.dataset.edimarkCitation || '');
    container.querySelectorAll('[data-edimark-bibliography]').forEach(node => node.remove());
    clearTimeout(previewBibliographyTimer);
    previewBibliographyGeneration += 1;
    const generation = previewBibliographyGeneration;
    const settings = effectiveLatexSettings();
    if (!sources.length || !settings.bibliographyContent) return;
    const exporter = window.PandocExporter;
    if (!exporter || typeof exporter.generateHtml !== 'function') return;
    const signature = JSON.stringify({
        sources,
        bibliographyContent: settings.bibliographyContent,
        bibliographyName: settings.bibliographyName,
        citationStyle: settings.citationStyle,
        cslContent: settings.cslContent,
        documentLanguage: settings.documentLanguage,
        interfaceLanguage: document.documentElement.lang,
    });
    const cached = previewBibliographyCache.signature === signature
        ? previewBibliographyCache.rendered
        : null;
    if (cached) {
        applyCiteprocPreview(container, sources, cached);
        return;
    }
    previewBibliographyTimer = setTimeout(async () => {
        try {
            const html = await exporter.generateHtml({ markdown: sources.join('\n\n'), standalone: false });
            if (generation !== previewBibliographyGeneration) return;
            const template = document.createElement('template');
            template.innerHTML = html;
            const labels = Array.from(template.content.querySelectorAll('.citation'))
                .map(node => node.textContent.replace(/\s+/g, ' ').trim());
            const refs = template.content.querySelector('#refs');
            const rendered = { labels, referencesHtml: refs ? refs.outerHTML : '' };
            previewBibliographyCache = { signature, rendered };
            applyCiteprocPreview(container, sources, rendered);
        } catch (error) {
            console.warn('No se pudo componer la bibliografía de la vista previa:', error);
        }
    }, 300);
}

// --- Funciones principales ---
function updateHtml() {
    if (isUpdating) return;
    isUpdating = true;
    const fullMarkdown = markdownEditor.getValue();
    const markdownText = splitDocumentFrontMatter(fullMarkdown).body;
    const htmlOutput = document.getElementById('html-output');
    updateMarkdownCharCounter(fullMarkdown);
    refreshLinkedImagesUi(fullMarkdown, docs.find(d => d.id === currentId));

    const { text: markdownWithoutMath, segments: mathSegments } = protectMathSegments(markdownText);
    const sanitizedText = preserveMarkdownEscapes(markdownWithoutMath);
    
    if (window.marked) {
        const parsedHtml = marked.parse(sanitizedText);
        const restoredHtml = restoreMathSegments(parsedHtml, mathSegments);
        htmlOutput.innerHTML = restoredHtml;
        fitWidePreformattedBlocks(htmlOutput);

        // Las rutas relativas se resuelven sobre el DOM ya montado; el HTML
        // que acaba de recibir el editor conserva las originales.
        applyRelativeImageSources(htmlOutput, docs.find(d => d.id === currentId));

        htmlOutput.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          if (!h.id) {
            h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-áéíóúüñ]/g,'');
          }
        });

        /*
          El índice se rehace con cada repintado: los elementos son nuevos y la
          línea en la que empieza cada uno acaba de cambiar. Los metadatos no
          llegan a la hoja, así que sus líneas se suman aparte.
        */
        const bodyLineOffset = countNewlines(fullMarkdown.slice(0, Math.max(0, fullMarkdown.length - markdownText.length)));
        indexPreviewLines(htmlOutput, sanitizedText, mathSegments, bodyLineOffset);

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
        renderPreviewCitations(htmlOutput);
        schedulePreviewBibliography(htmlOutput);
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
    /*
      El índice se pinta después del documento, porque se hace con sus
      encabezados, y se repone en cada repintado: la hoja se rehace entera
      desde el Markdown y se lo lleva por delante.
    */
    if (typeof window.__refreshDocumentToc === 'function') {
        window.__refreshDocumentToc();
    }
    isUpdating = false;
}
window.__refreshBibliographyPreview = updateHtml;

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

/*
  ---------------------------------------------------------------------------
  Formato desde la vista previa
  ---------------------------------------------------------------------------

  La barra de formato escribía siempre en el Markdown, así que con el cursor
  en la hoja no había nada que hacer: los botones se apagaban y había que
  volver al panel izquierdo para poner una negrita.

  No hace falta traducir nada a mano. La hoja es editable y lo que se toque en
  ella ya vuelve al Markdown por el mismo camino que usa escribir en el panel
  derecho: Turndown lee el HTML y devuelve el texto. Basta, pues, con que los
  botones cambien el HTML en vez del texto —envolver en `<strong>`, convertir
  el párrafo en `<h2>`, agrupar en `<ul>`— y el Markdown se escribe solo.

  Los formatos de letra y de bloque se dejan en manos del propio navegador
  (`execCommand`): resuelve por su cuenta la selección partida entre varios
  nodos, quitar lo ya puesto y rehacer las listas, y con `styleWithCSS`
  apagado escribe etiquetas —`<b>`, `<i>`— y no estilos, que es lo único que
  Turndown sabe traducir. Está marcado como obsoleto desde hace años pero
  sigue siendo lo que sostiene la edición enriquecida en los tres motores, y
  aquí su resultado dura poco: el siguiente repintado lo rehace desde el
  Markdown, con `<strong>` y `<em>` como manda marked.

  Lo que no tiene `execCommand` —código en línea, fórmulas, tablas, enlaces e
  imágenes— se inserta como nodos, generando el HTML del fragmento con el
  mismo marked que pinta la vista previa.
*/
const PREVIEW_BLOCK_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,blockquote,li,pre,td,th';
let previewFormatRange = null;
let formatTarget = 'markdown';

function setFormatTarget(target) {
    formatTarget = target === 'preview' ? 'preview' : 'markdown';
    refreshFormulaButtonAffordance();
}

/*
  El botón de fórmulas hace dos cosas distintas según dónde se esté
  trabajando: en el Markdown despliega los cuatro pares de delimitadores, y
  sobre la hoja abre la ventana donde se escribe la fórmula. La flecha y el
  `aria-haspopup` cuentan cuál de las dos toca.
*/
function refreshFormulaButtonAffordance() {
    const button = document.getElementById('formula-btn');
    const caret = document.getElementById('formula-btn-caret');
    if (!button) return;
    const dialog = isPreviewFormatTarget();
    if (caret) caret.classList.toggle('hidden', dialog);
    button.setAttribute('aria-haspopup', dialog ? 'dialog' : 'true');
    if (dialog) button.setAttribute('aria-expanded', 'false');
}

// La hoja manda solo si además se está viendo: en modo código o con el panel
// escondido, el formato vuelve al Markdown aunque el último foco fuera suyo.
function isPreviewFormatTarget() {
    return formatTarget === 'preview' && isPreviewVisible();
}

/*
  Pulsar un botón de la barra le lleva el foco, y con él se va la selección de
  la hoja. Por eso se guarda cada vez que cambia, igual que se hace con la del
  textarea del Markdown.
*/
function capturePreviewSelection() {
    const container = document.getElementById('html-output');
    const selection = window.getSelection();
    if (!container || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    previewFormatRange = range.cloneRange();
}

function restorePreviewSelection() {
    const container = document.getElementById('html-output');
    const selection = window.getSelection();
    if (!container || !selection) return false;
    if (selection.rangeCount) {
        const current = selection.getRangeAt(0);
        if (container.contains(current.commonAncestorContainer)) {
            container.focus();
            return true;
        }
    }
    if (!previewFormatRange || !container.contains(previewFormatRange.commonAncestorContainer)) return false;
    container.focus();
    selection.removeAllRanges();
    selection.addRange(previewFormatRange);
    return true;
}

function previewSelectedText() {
    const container = document.getElementById('html-output');
    const selection = window.getSelection();
    if (!container || !selection || !selection.rangeCount) return '';
    if (!container.contains(selection.getRangeAt(0).commonAncestorContainer)) return '';
    return selection.toString().trim();
}

function previewBlockOfSelection() {
    const container = document.getElementById('html-output');
    const selection = window.getSelection();
    if (!container || !selection || !selection.rangeCount) return null;
    let node = selection.getRangeAt(0).startContainer;
    if (node && node.nodeType === 3) node = node.parentNode;
    const block = node && node.closest ? node.closest(PREVIEW_BLOCK_SELECTOR) : null;
    return block && container.contains(block) ? block : null;
}

function topLevelPreviewBlock(node) {
    const container = document.getElementById('html-output');
    let element = node && node.nodeType === 3 ? node.parentElement : node;
    while (element && element.parentElement && element.parentElement !== container) {
        element = element.parentElement;
    }
    return element && element.parentElement === container ? element : null;
}

/*
  Avisar de que la hoja ha cambiado. Lo normal es dejar que siga el mismo
  camino que escribir a mano —el evento `input`, que rehace el Markdown sin
  tocar la hoja—; `repaint` es para lo que necesita volver a pintarse para
  verse bien, como una fórmula, que sale del Markdown convertida en KaTeX.
*/
function notifyPreviewEdited({ repaint = false } = {}) {
    const container = document.getElementById('html-output');
    if (!container) return;
    if (!repaint) {
        container.dispatchEvent(new Event('input', { bubbles: true }));
        return;
    }
    updateMarkdown();
    updateHtml();
}

function fragmentFromHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html || '';
    return template.content;
}

function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    parent.removeChild(element);
}

/*
  Anidar una lista en el navegador deja el `<ul>` colgando de otro `<ul>`, que
  ni es HTML válido ni Turndown sabe leer: el punto anidado volvía al Markdown
  como una lista suelta. Su sitio es dentro del elemento anterior.
*/
function normalizeNestedLists(container) {
    if (!container) return;
    container.querySelectorAll('ul > ul, ul > ol, ol > ul, ol > ol').forEach((list) => {
        const previous = list.previousElementSibling;
        if (previous && previous.tagName === 'LI') previous.appendChild(list);
    });
}

/*
  Anidar y desanidar a mano. `execCommand` los tiene, pero cada motor entiende
  una cosa: el `outdent` de Firefox deshacía el punto en vez de subirlo de
  nivel. Mover el elemento es media docena de líneas y hace lo mismo en los
  tres.
*/
function indentPreviewListItem(item) {
    const previous = item.previousElementSibling;
    // El primero de una lista no tiene bajo qué anidarse, ni en Markdown.
    if (!previous || previous.tagName !== 'LI') return false;
    let sublist = previous.querySelector(':scope > ul, :scope > ol');
    if (!sublist) {
        sublist = document.createElement(item.parentElement.tagName);
        previous.appendChild(sublist);
    }
    sublist.appendChild(item);
    return true;
}

function outdentPreviewListItem(item) {
    const list = item.parentElement;
    const parentItem = list && list.parentElement;
    // Solo sube lo que está anidado; un punto de primer nivel se queda.
    if (!parentItem || parentItem.tagName !== 'LI') return false;
    const outerList = parentItem.parentElement;
    if (!outerList) return false;
    // Lo que venía detrás sigue colgando de él, un nivel más adentro.
    const following = [];
    let sibling = item.nextElementSibling;
    while (sibling) { following.push(sibling); sibling = sibling.nextElementSibling; }
    if (following.length) {
        const sublist = document.createElement(list.tagName);
        following.forEach(node => sublist.appendChild(node));
        item.appendChild(sublist);
    }
    outerList.insertBefore(item, parentItem.nextSibling);
    if (!list.children.length) list.remove();
    return true;
}

// El punto acaba de quedarse vacío: el cursor va dentro, listo para escribir.
function placeCaretInPreviewItem(item) {
    const selection = window.getSelection();
    if (!item || !selection) return;
    const range = document.createRange();
    range.setStart(item, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

/*
  Anidar o desanidar deja el cursor a la deriva: el navegador lo suelta en el
  `<ul>` y de ahí saltaba al punto siguiente. Como el texto donde se estaba
  escribiendo es el mismo nodo —solo ha cambiado de padre—, basta con apuntarlo
  antes y volver a él después.
*/
function preservePreviewCaret(action) {
    const container = document.getElementById('html-output');
    const selection = window.getSelection();
    const before = selection ? selection.anchorNode : null;
    const offset = selection ? selection.anchorOffset : 0;
    const text = before && before.nodeType === 3 ? before.data : null;
    action();
    if (!selection || !container) return;
    let node = before && container.contains(before) ? before : null;
    /*
      Anidar puede rehacer el elemento en vez de moverlo, y entonces el nodo de
      antes ya no está en la hoja: se busca el texto donde se estaba
      escribiendo, que es lo que el usuario reconoce como «donde iba».
    */
    if (!node && text) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            if (walker.currentNode.data === text) { node = walker.currentNode; break; }
        }
    }
    if (!node) return;
    const limit = node.nodeType === 3 ? node.data.length : node.childNodes.length;
    const range = document.createRange();
    range.setStart(node, Math.min(offset, limit));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function applyInlineCodeToPreview() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    if (selection.isCollapsed) {
        return insertMarkdownIntoPreview('```\n\n```', { repaint: true });
    }
    const range = selection.getRangeAt(0);
    let node = range.startContainer;
    if (node && node.nodeType === 3) node = node.parentNode;
    const existing = node && node.closest ? node.closest('code') : null;
    if (existing && !existing.closest('pre')) {
        unwrapElement(existing);
        return true;
    }
    const code = document.createElement('code');
    try {
        range.surroundContents(code);
    } catch (_) {
        // La selección cruza varios nodos: se extrae y se vuelve a meter.
        code.appendChild(range.extractContents());
        range.insertNode(code);
    }
    const after = document.createRange();
    after.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(after);
    return true;
}

/*
  Las dos familias de delimitadores del menú, cada una con su forma en línea y
  su forma en bloque: cambiar de presentación dentro de la ventana no cambia de
  familia, que es lo que el usuario eligió al abrirla.
*/
function mathDelimiters(family, block) {
    if (family === 'bracket') {
        return block ? { open: '\\[', close: '\\]' } : { open: '\\(', close: '\\)' };
    }
    return block ? { open: '$$', close: '$$' } : { open: '$', close: '$' };
}

function mathDelimitersForFormat(format) {
    switch (format) {
        case 'latex-inline':
        case 'latex-inline-dollar': return { family: 'dollar', block: false };
        case 'latex-block-dollar': return { family: 'dollar', block: true };
        case 'latex-inline-paren': return { family: 'bracket', block: false };
        case 'latex-block':
        case 'latex-block-bracket': return { family: 'bracket', block: true };
        default: return null;
    }
}

/*
  Una fórmula entra en la hoja como lo que es en el Markdown: texto entre
  delimitadores, tal cual, sin pasar por marked —que leería `\(` como un
  paréntesis escapado y se comería las barras—. Quien la convierte en fórmula
  es el repintado, con KaTeX, así que se escribe y se vuelve a pintar.
*/
function insertPlainTextIntoPreview(text, { block = false } = {}) {
    const container = document.getElementById('html-output');
    if (!container) return false;
    if (!restorePreviewSelection()) return false;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    if (block) {
        const anchor = topLevelPreviewBlock(range.startContainer);
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        range.deleteContents();
        if (anchor) anchor.after(paragraph);
        else container.appendChild(paragraph);
    } else {
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
    }
    notifyPreviewEdited({ repaint: true });
    return true;
}

/*
  Lo que ya viene escrito en Markdown —una fórmula de EdiCuaTeX— se inserta
  como texto en la hoja y como texto en el editor: nadie lo reinterpreta.
*/
function insertRawContent(text, { block = false } = {}) {
    if (isPreviewFormatTarget() && insertPlainTextIntoPreview(text, { block })) return;
    markdownEditor.replaceSelection(block ? `\n${text}\n` : text);
    markdownEditor.focus();
}

/*
  Enlaces, imágenes y tablas llegan aquí en Markdown, que es como los escriben
  sus ventanas: se convierten con marked —el mismo que pinta la hoja— y se
  meten como nodos. En línea, dentro del texto; en bloque, detrás del bloque
  donde esté el cursor.
*/
function insertMarkdownIntoPreview(markdown, { inline = false, repaint = false } = {}) {
    const container = document.getElementById('html-output');
    if (!container || !window.marked) return false;
    if (!restorePreviewSelection()) return false;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    if (inline) {
        const parseInline = typeof marked.parseInline === 'function' ? marked.parseInline : marked.parse;
        const fragment = fragmentFromHtml(parseInline.call(marked, markdown));
        const last = fragment.lastChild;
        range.insertNode(fragment);
        if (last) {
            const after = document.createRange();
            after.setStartAfter(last);
            after.collapse(true);
            selection.removeAllRanges();
            selection.addRange(after);
        }
    } else {
        const fragment = fragmentFromHtml(marked.parse(markdown));
        const anchor = topLevelPreviewBlock(range.startContainer);
        if (anchor) anchor.after(fragment);
        else container.appendChild(fragment);
    }
    applyRelativeImageSources(container, docs.find(d => d.id === currentId));
    notifyPreviewEdited({ repaint: repaint || !inline });
    return true;
}

/*
  Punto único de inserción: lo que antes escribía siempre en el Markdown ahora
  pregunta primero dónde está trabajando el usuario.
*/
function insertMarkdownContent(markdown, { inline = false, repaint = false } = {}) {
    if (isPreviewFormatTarget() && insertMarkdownIntoPreview(markdown, { inline, repaint })) return;
    markdownEditor.replaceSelection(markdown);
    markdownEditor.focus();
}

function applyFormatToPreview(format) {
    if (!isPreviewFormatTarget()) return false;
    if (!restorePreviewSelection()) return false;
    try { document.execCommand('styleWithCSS', false, false); } catch (_) { /* da igual si no está */ }
    const run = (command, value) => {
        try { return document.execCommand(command, false, value); } catch (_) { return false; }
    };
    switch (format) {
        case 'bold': run('bold'); break;
        case 'italic': run('italic'); break;
        case 'code':
            if (!applyInlineCodeToPreview()) return false;
            break;
        case 'quote': {
            const block = previewBlockOfSelection();
            if (block && block.closest('blockquote')) run('outdent');
            else run('formatBlock', 'blockquote');
            break;
        }
        case 'list-ul':
        case 'list-ol':
            preservePreviewCaret(() => {
                run(format === 'list-ul' ? 'insertUnorderedList' : 'insertOrderedList');
                normalizeNestedLists(document.getElementById('html-output'));
            });
            break;
        /*
          Sus ventanas piden los datos y vuelven por insertMarkdownContent. El
          texto seleccionado en la hoja se lleva ya escrito, igual que cuando
          se pide desde el Markdown: así solo queda poner la dirección.
        */
        case 'link':
            toggleLinkModal(true, previewSelectedText());
            return true;
        case 'image':
            toggleImageModal(true, previewSelectedText());
            return true;
        // La tabla no se hace con lo que haya seleccionado.
        case 'table': return false;
        default: {
            const heading = /^heading-([1-6])$/.exec(format);
            if (heading) {
                const block = previewBlockOfSelection();
                const already = block && block.tagName === `H${heading[1]}`;
                run('formatBlock', already ? 'p' : `h${heading[1]}`);
                break;
            }
            const math = mathDelimitersForFormat(format);
            if (math) {
                toggleMathModal(true, { ...math, tex: previewSelectedText() });
                return true;
            }
            return false;
        }
    }
    notifyPreviewEdited();
    capturePreviewSelection();
    return true;
}

function applyFormat(format) {
    if (applyFormatToPreview(format)) return;
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

/*
  El cursor de escritura en el campo de una ventana. Enfocar y ya está no
  basta cuando se viene de la vista previa: el editable se queda con la
  selección del documento y el navegador no pinta el caret del campo, que
  aparece enmarcado pero muerto. Se le quita la selección al editable —el
  punto donde insertar está guardado aparte, así que no se pierde nada—, se
  espera al dibujado y se enfoca; seleccionar el contenido de paso deja listo
  para escribir encima lo que llegara escrito.
*/
function focusModalField(field, { select = false } = {}) {
    if (!field) return;
    const preview = document.getElementById('html-output');
    const active = document.activeElement;
    if (preview && active && (active === preview || preview.contains(active))) {
        preview.blur();
    }
    const selection = window.getSelection();
    if (preview && selection && selection.rangeCount
        && preview.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        selection.removeAllRanges();
    }
    /*
      Enfocar en el acto, no en el fotograma siguiente: quien escribe nada más
      abrir la ventana perdía la primera letra, y encima iba a parar al
      documento. La segunda pasada es por si algo se lleva el foco al cerrar el
      menú de donde vino, y respeta lo que ya se haya escrito.
    */
    field.focus();
    if (select && typeof field.select === 'function') field.select();
    const reintentar = () => {
        if (document.activeElement !== field) field.focus();
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(reintentar);
    else setTimeout(reintentar, 0);
}

function toggleTableModal(show) {
    document.getElementById('table-modal-overlay').style.display = show ? 'flex' : 'none';
    if (show) focusModalField(document.getElementById('table-cols'), { select: true });
}

function toggleLinkModal(show, presetText = '') {
    document.getElementById('link-modal-overlay').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('link-text').value = presetText;
        document.getElementById('link-url').value  = '';
        focusModalField(document.getElementById(presetText ? 'link-url' : 'link-text'), { select: true });
    }
}

/*
  La ventana de fórmula. En el panel Markdown los delimitadores se escriben en
  el texto y quedan a la vista para escribir dentro; sobre la hoja no hay
  dónde: en cuanto se repinta, KaTeX convierte el hueco en fórmula. Así que el
  código se escribe aquí, se ve el resultado antes de aceptar, y lo que entra
  en el documento es la fórmula ya montada.
*/
let mathModalContext = null;

function mathModalPlacement() {
    const checked = document.querySelector('input[name="math-placement"]:checked');
    return checked ? checked.value === 'block' : false;
}

function mathModalFamily() {
    const checked = document.querySelector('input[name="math-delimiter"]:checked');
    return checked ? checked.value : 'bracket';
}

// Los pares que se ofrecen son los de la presentación elegida.
function refreshMathDelimiterLabels() {
    const block = mathModalPlacement();
    const bracket = document.getElementById('math-delimiter-bracket-label');
    const dollar = document.getElementById('math-delimiter-dollar-label');
    if (bracket) bracket.textContent = block ? '\\[...\\]' : '\\(...\\)';
    if (dollar) dollar.textContent = block ? '$$...$$' : '$...$';
}

function renderMathModalPreview() {
    const codeEl = document.getElementById('math-code');
    const previewEl = document.getElementById('math-preview');
    const errorEl = document.getElementById('math-error');
    if (!codeEl || !previewEl) return;
    const tex = codeEl.value.trim();
    const displayMode = mathModalPlacement();
    refreshMathDelimiterLabels();
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }
    if (!tex) {
        previewEl.textContent = getTranslation('math_preview_empty', 'Escribe la fórmula para verla aquí.');
        return;
    }
    if (!window.katex || typeof window.katex.render !== 'function') {
        previewEl.textContent = tex;
        return;
    }
    try {
        window.katex.render(tex, previewEl, { displayMode, throwOnError: true });
    } catch (error) {
        // KaTeX sabe señalar en rojo lo que no entiende; el motivo va debajo.
        try {
            window.katex.render(tex, previewEl, { displayMode, throwOnError: false });
        } catch (_) {
            previewEl.textContent = tex;
        }
        if (errorEl) {
            errorEl.textContent = error && error.message ? error.message : String(error);
            errorEl.classList.remove('hidden');
        }
    }
}

function toggleMathModal(show, context = null) {
    const overlay = document.getElementById('math-modal-overlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
    if (!show) {
        mathModalContext = null;
        return;
    }
    mathModalContext = context || { family: 'bracket', block: false };
    const codeEl = document.getElementById('math-code');
    if (codeEl) codeEl.value = (context && context.tex) || '';
    const placement = document.querySelector(`input[name="math-placement"][value="${mathModalContext.block ? 'block' : 'inline'}"]`);
    if (placement) placement.checked = true;
    const delimiter = document.querySelector(`input[name="math-delimiter"][value="${mathModalContext.family === 'dollar' ? 'dollar' : 'bracket'}"]`);
    if (delimiter) delimiter.checked = true;
    renderMathModalPreview();
    focusModalField(codeEl, { select: true });
}

function insertMathFromModal() {
    const codeEl = document.getElementById('math-code');
    const tex = codeEl ? codeEl.value.trim() : '';
    if (!tex) return;
    const block = mathModalPlacement();
    const { open, close } = mathDelimiters(mathModalFamily(), block);
    toggleMathModal(false);
    insertRawContent(`${open}${tex}${close}`, { block });
}

function toggleImageModal(show, presetText = '', replacement = null) {
    const overlay = document.getElementById('image-modal-overlay');
    const title = document.getElementById('image-modal-title');
    const submit = document.getElementById('insert-image-btn');
    overlay.style.display = show ? 'flex' : 'none';
    if (!show) {
        imageModalReplacement = null;
        return;
    }
    imageModalReplacement = replacement;
    const replacing = Boolean(replacement);
    if (title) {
        title.textContent = getTranslation(
            replacing ? 'replace_image_modal_title' : 'insert_image_modal_title',
            replacing ? 'Reemplazar imagen' : 'Insertar imagen',
        );
        title.setAttribute('data-i18n-key', replacing ? 'replace_image_modal_title' : 'insert_image_modal_title');
    }
    if (submit) {
        submit.textContent = getTranslation(replacing ? 'replace_btn' : 'insert_btn', replacing ? 'Reemplazar' : 'Insertar');
        submit.setAttribute('data-i18n-key', replacing ? 'replace_btn' : 'insert_btn');
    }
    if (show) {
        document.getElementById('image-alt-text').value = presetText;
        const fileInput = document.getElementById('image-file-input');
        if (fileInput) fileInput.value = '';
        const defaultMode = document.querySelector('input[name="image-insert-mode"][value="relative"]');
        if (defaultMode) defaultMode.checked = true;
        if (typeof window.__edimarkResetImageSource === 'function') window.__edimarkResetImageSource();
        focusModalField(document.getElementById(presetText ? 'image-file-input' : 'image-alt-text'), { select: true });
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
    documentTocDepth: 3,
    documentNumberSections: false,
    bibliographyContent: '',
    bibliographyName: '',
    bibliographyTitle: '',
    bibliographyHeadingLevel: 2,
    citationStyle: 'apa',
    cslContent: '',
    cslName: '',
    // La portada generada es el valor de partida: un EPUB sin imagen aparece
    // con el icono genérico en la estantería del lector.
    epubCover: 'auto',
    epubCoverImage: '',
    epubCoverName: '',
    documentClass: 'article',
    classOptions: '',
    preamble: '',
    /*
      Alineación, letra, interlineado, márgenes, sangría y partición: los
      valores de partida que hereda cualquier documento que no fije los suyos.

      Traen número los tres que deciden cómo se lee un documento —cuerpo, letra
      e interlineado—, por la misma razón: la vista previa no puede enseñar la
      verdad sobre lo que no está declarado. Sin ellos se quedaba con lo que le
      diera la hoja de estilos —la tipografía de la interfaz y un interlineado
      de lectura en pantalla—, mientras que el DOCX salía con la letra de la
      plantilla de Word y el `.tex` con la de `article`: tres resultados
      distintos para el mismo documento. Declarándolos, lo que se ve es lo que
      sale en los cinco formatos.

      Doce puntos y Times/Georgia son lo que ya escriben DOCX y ODT, así que
      hacerlos explícitos no cambia lo que sale por ahí; en LaTeX sustituyen a
      los diez de `article`. El interlineado de uno y medio no lo trae ningún
      formato: es una elección, la del documento cómodo de leer y de corregir a
      mano, y quien quiera otro lo escribe aquí una vez.

      Los márgenes se quedan fuera a propósito: son cosa del papel, cada
      plantilla trae los suyos y ninguno se ve en la vista previa, que es una
      columna de texto y no una hoja paginada.
    */
    documentFormat: {
        fontSize: '12', font: 'serif', lineHeight: '1.5', paperSize: 'a4',
        orientation: 'portrait', pageBreakBeforeH1: 'no',
    },
};

// `documentFormat` es un objeto: sin copiarlo también, los tres retornos
// compartirían el mismo y una edición se llevaría por delante los valores de
// partida de toda la sesión.
function defaultLatexSettings() {
    return { ...LATEX_SETTINGS_DEFAULTS, documentFormat: { ...LATEX_SETTINGS_DEFAULTS.documentFormat } };
}

/*
  Los valores de partida solo cuando no hay bloque de formato guardado: quien
  tenía ajustes de antes de existir la opción no fijó ningún tamaño, y su vista
  previa se quedaría sin número igual que si fuera nueva.

  En cambio, un bloque guardado manda entero, campos vacíos incluidos. Antes se
  rellenaba hueco por hueco en cada lectura, y eso convertía «quitar el tamaño»
  en «volver a 12 pt» en cuanto se recargaba la página: la letra, el cuerpo, el
  interlineado y el papel eran los cuatro únicos ajustes imposibles de dejar
  sin fijar, que es justo lo que hace el botón «Restablecer» con los demás.
*/
function withDefaultDocumentFormat(stored) {
    const api = window.EdiMarkDocumentFormat;
    const normalized = api ? api.normalizeDocumentFormat(stored) : {};
    const format = { ...normalized };
    if (stored && typeof stored === 'object') {
        // Estos campos no existían en los ajustes guardados anteriores. Solo
        // se migran si falta la propiedad; una cadena vacía guardada después
        // sigue significando «sin fijar».
        if (!Object.prototype.hasOwnProperty.call(stored, 'orientation')) format.orientation = 'portrait';
        if (!Object.prototype.hasOwnProperty.call(stored, 'pageBreakBeforeH1')) format.pageBreakBeforeH1 = 'no';
        return format;
    }
    Object.entries(LATEX_SETTINGS_DEFAULTS.documentFormat).forEach(([key, value]) => {
        if (!String(format[key] ?? '').trim()) format[key] = value;
    });
    return format;
}

function readLatexSettings() {
    const raw = safeLocalStorageGet(LATEX_SETTINGS_KEY);
    if (!raw) return defaultLatexSettings();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return defaultLatexSettings();
        return {
            documentLanguage: typeof parsed.documentLanguage === 'string' && parsed.documentLanguage.trim()
                ? parsed.documentLanguage.trim()
                : LATEX_SETTINGS_DEFAULTS.documentLanguage,
            documentAuthor: typeof parsed.documentAuthor === 'string' ? parsed.documentAuthor : '',
            documentToc: parsed.documentToc === true,
            documentTocDepth: [1, 2, 3].includes(Number(parsed.documentTocDepth))
                ? Number(parsed.documentTocDepth)
                : LATEX_SETTINGS_DEFAULTS.documentTocDepth,
            documentNumberSections: parsed.documentNumberSections === true,
            bibliographyContent: typeof parsed.bibliographyContent === 'string' ? parsed.bibliographyContent : '',
            bibliographyName: typeof parsed.bibliographyName === 'string' ? parsed.bibliographyName : '',
            bibliographyTitle: typeof parsed.bibliographyTitle === 'string' ? parsed.bibliographyTitle : '',
            bibliographyHeadingLevel: [1, 2, 3, 4, 5, 6].includes(Number(parsed.bibliographyHeadingLevel))
                ? Number(parsed.bibliographyHeadingLevel)
                : 2,
            citationStyle: ['apa', 'chicago-author-date', 'modern-language-association', 'ieee', 'custom'].includes(parsed.citationStyle)
                ? parsed.citationStyle
                : (parsed.cslContent ? 'custom' : 'apa'),
            cslContent: typeof parsed.cslContent === 'string' ? parsed.cslContent : '',
            cslName: typeof parsed.cslName === 'string' ? parsed.cslName : '',
            epubCover: ['none', 'auto', 'custom'].includes(parsed.epubCover) ? parsed.epubCover : LATEX_SETTINGS_DEFAULTS.epubCover,
            epubCoverImage: typeof parsed.epubCoverImage === 'string' ? parsed.epubCoverImage : '',
            epubCoverName: typeof parsed.epubCoverName === 'string' ? parsed.epubCoverName : '',
            documentClass: typeof parsed.documentClass === 'string' ? parsed.documentClass : LATEX_SETTINGS_DEFAULTS.documentClass,
            classOptions: typeof parsed.classOptions === 'string' ? parsed.classOptions : '',
            preamble: typeof parsed.preamble === 'string' ? parsed.preamble : '',
            documentFormat: withDefaultDocumentFormat(parsed.documentFormat),
        };
    } catch (error) {
        console.warn('Ajustes del documento ilegibles, se usan los predeterminados:', error);
        return defaultLatexSettings();
    }
}

function portableBibliographyFilename(name = '', content = '') {
    const json = /\.json$/i.test(String(name || '')) || /^\s*[\[{]/.test(String(content || ''));
    return json ? 'references.json' : 'references.bib';
}

function defaultPortableBibliographyPath(doc, name = '', content = '') {
    return `${extractedAssetsFolder(doc)}/${portableBibliographyFilename(name, content)}`;
}

function effectiveLatexSettings(doc = docs.find(candidate => candidate.id === currentId)) {
    const settings = readLatexSettings();
    if (!doc || (!doc.bibliographyPath && !doc.bibliographyContent)) return settings;
    return {
        ...settings,
        bibliographyContent: doc.bibliographyContent || '',
        bibliographyName: doc.bibliographyPath || doc.bibliographyName || '',
    };
}

function bibliographyIsValid(content, name = '') {
    const api = window.EdiMarkBibliography;
    return Boolean(api && typeof api.parseBibliography === 'function'
        && api.parseBibliography(content || '', name || '').length);
}

function attachBibliographyToDocument(doc, {
    content = '',
    name = '',
    path = '',
    writeMetadata = true,
} = {}) {
    if (!doc) return false;
    const valid = Boolean(content) && bibliographyIsValid(content, name || path);
    const currentMarkdown = doc.id === currentId && markdownEditor ? markdownEditor.getValue() : doc.md;
    const existingPath = bibliographyPathFromMarkdown(currentMarkdown);
    const chosenPath = valid
        ? (path || existingPath || defaultPortableBibliographyPath(doc, name, content))
        : '';
    doc.bibliographyContent = valid ? String(content) : '';
    doc.bibliographyName = valid ? (name || chosenPath.split('/').pop()) : '';
    doc.bibliographyPath = chosenPath;

    if (writeMetadata) {
        const rewritten = setBibliographyPathInMarkdown(currentMarkdown, chosenPath);
        doc.md = rewritten;
        if (doc.id === currentId && markdownEditor && markdownEditor.getValue() !== rewritten) {
            markdownEditor.setValue(rewritten);
        }
    }
    if (doc.id === currentId) {
        publishLatexSettings(effectiveLatexSettings(doc));
        updateHtml();
    }
    return valid;
}

async function hydrateDocumentBibliography(doc, files = null) {
    if (!doc) return false;
    const declaredPath = bibliographyPathFromMarkdown(doc.md);
    const expectedPath = declaredPath || defaultPortableBibliographyPath(doc);
    let content = '';
    let name = expectedPath.split('/').pop();

    if (Array.isArray(files) && files.length) {
        const normalizedExpected = expectedPath.replace(/\\/g, '/').toLowerCase();
        const match = files.find(file => {
            const candidate = String(file.__edimarkPath || file.webkitRelativePath || file.name || '')
                .replace(/\\/g, '/').toLowerCase();
            return candidate === normalizedExpected || candidate.endsWith(`/${normalizedExpected}`);
        });
        if (!match || match.size > 2 * 1024 * 1024) return false;
        content = await match.text();
        name = match.name || name;
    } else {
        const platform = window.EdiMarkPlatform;
        if (!platform?.isDesktop || !doc.filePath || typeof platform.readDocumentResource !== 'function') return false;
        try {
            content = await platform.readDocumentResource(doc.filePath, expectedPath) || '';
        } catch (_) {
            return false;
        }
    }
    if (!bibliographyIsValid(content, name)) return false;
    return attachBibliographyToDocument(doc, {
        content,
        name,
        path: expectedPath,
        // La detección por convención no ensucia el documento al abrirlo; la
        // ruta estándar se escribirá la próxima vez que se guarde.
        writeMetadata: Boolean(declaredPath),
    });
}

function publishLatexSettings(settings) {
    window.__edimarkLatexSettings = { ...settings };
    return window.__edimarkLatexSettings;
}

const LATEX_SETTINGS_FILE = 'settings.json';

/*
  En el escritorio, las opciones viven además en un archivo del perfil del
  usuario. `localStorage` allí es el almacén del webview, que el sistema trata
  como caché y puede vaciar por su cuenta: el archivo es el que sobrevive a una
  limpieza, a una reinstalación o a un cambio de motor.
*/
function persistLatexSettingsToDisk(settings) {
    const platform = window.EdiMarkPlatform;
    if (!platform || !platform.isDesktop || typeof platform.writeSettingsFile !== 'function') return;
    platform.writeSettingsFile(JSON.stringify(settings, null, 2), LATEX_SETTINGS_FILE)
        .catch(error => console.warn('No se han podido guardar las opciones en el disco:', error));
}

/*
  Al arrancar manda el archivo, si lo hay: `localStorage` es solo su espejo,
  para que el resto del código siga leyendo las opciones sin esperar al disco.
*/
async function loadLatexSettingsFromDisk() {
    const platform = window.EdiMarkPlatform;
    if (!platform || !platform.isDesktop || typeof platform.readSettingsFile !== 'function') return null;
    const contents = await platform.readSettingsFile(LATEX_SETTINGS_FILE);
    if (!contents) {
        // Primera vez con esta versión: lo que hubiera en el webview pasa al
        // archivo y desde aquí ya manda él.
        persistLatexSettingsToDisk(readLatexSettings());
        return null;
    }
    safeLocalStorageSet(LATEX_SETTINGS_KEY, contents);
    const settings = readLatexSettings();
    publishLatexSettings(settings);
    return settings;
}

function storeLatexSettings(settings) {
    safeLocalStorageSet(LATEX_SETTINGS_KEY, JSON.stringify(settings));
    persistLatexSettingsToDisk(settings);
    publishLatexSettings(effectiveLatexSettings());
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
            focusModalField(latexImportTextarea);
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

async function saveFile(filename, content, type, {
    existingPath = '',
    extensions,
    companionFiles,
    directoryHandle,
    fileHandle,
    prepareForSave,
} = {}) {
    const platform = window.EdiMarkPlatform;
    if (platform && typeof platform.saveFile === 'function') {
        return platform.saveFile({
            suggestedName: filename,
            contents: content,
            mimeType: type,
            existingPath,
            extensions,
            companionFiles,
            directoryHandle,
            fileHandle,
            prepareForSave,
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

/*
  Reúne solo las imágenes relativas que aparecen de verdad en el Markdown y
  que el navegador recuperó de una carpeta vinculada o arrastrada. `marked`
  evita confundir con imágenes los ejemplos escritos dentro de bloques de
  código. Las rutas que suben con `../` no pueden copiarse de forma segura a la
  carpeta de destino y se dejan como estaban.
*/
/*
  Las imágenes que trae la propia aplicación —el logotipo del manual, por
  ejemplo— no están en el disco del usuario ni en ninguna carpeta vinculada: se
  cargan desde donde vive el programa. Se piden ahí para que viajen junto al
  `.md` al guardarlo; si no, el archivo guardado enseñaría un hueco.
*/
async function readApplicationAsset(relativePath) {
    try {
        const response = await fetch(relativePath);
        if (!response.ok) return null;
        const type = String(response.headers.get('content-type') || '').toLowerCase();
        // Sin esto, un servidor que responda con su página de inicio a lo que no
        // encuentra guardaría un HTML disfrazado de imagen.
        if (!type.startsWith('image/')) return null;
        const buffer = await response.arrayBuffer();
        return buffer.byteLength ? new Uint8Array(buffer) : null;
    } catch (error) {
        console.debug('No se pudo leer la imagen de la aplicación:', relativePath, error);
        return null;
    }
}

async function collectLinkedDocumentAssets(doc, content) {
    const platform = window.EdiMarkPlatform;
    if (!doc || !assetPathUtils || !window.marked) return [];
    const container = document.createElement('div');
    container.innerHTML = marked.parse(splitDocumentFrontMatter(content).body);
    const relativePaths = new Set();
    container.querySelectorAll('img[src]').forEach(img => {
        const original = img.getAttribute('src') || '';
        if (!assetPathUtils.isRelativeAssetPath(original)) return;
        const relativePath = assetPathUtils.normalizeRelativePath(original);
        if (!relativePath || relativePath === '..' || relativePath.startsWith('../')) return;
        relativePaths.add(relativePath);
    });

    const assets = [];
    for (const relativePath of relativePaths) {
        const file = lookupAssetFile(doc, relativePath);
        if (file) {
            assets.push({ relativePath, contents: file });
            continue;
        }
        // Un documento que todavía no está en el disco solo puede tener imágenes
        // de la propia aplicación: las del usuario pasan por `lookupAssetFile`.
        if (!doc.filePath) {
            const appAsset = await readApplicationAsset(relativePath);
            if (appAsset) {
                assets.push({ relativePath, contents: appAsset });
                continue;
            }
        }
        if (platform?.isDesktop && doc.filePath && typeof platform.readDocumentAsset === 'function') {
            const baseDir = assetPathUtils.directoryOf(doc.filePath);
            const sourcePath = assetPathUtils.resolveAgainstDirectory(baseDir, relativePath);
            try {
                const bytes = await platform.readDocumentAsset(sourcePath);
                if (bytes && bytes.length) assets.push({ relativePath, contents: bytes });
            } catch (error) {
                console.debug('No se pudo preparar la imagen para guardarla:', sourcePath, error);
            }
        }
    }
    return assets;
}

function preparePortableBibliographyForSave(doc, content) {
    const settings = effectiveLatexSettings(doc);
    const hasCitations = /\[[^\]\n]*@[^\]\n]+\]/.test(content);
    const declaredPath = bibliographyPathFromMarkdown(content);
    if (!settings.bibliographyContent || (!declaredPath && !hasCitations && !doc?.bibliographyPath)) {
        return { contents: content, companionFiles: [] };
    }
    const path = declaredPath
        || doc?.bibliographyPath
        || defaultPortableBibliographyPath(doc, settings.bibliographyName, settings.bibliographyContent);
    return {
        contents: setBibliographyPathInMarkdown(content, path),
        companionFiles: [{ relativePath: path, contents: settings.bibliographyContent }],
        path,
        name: path.split('/').pop(),
        bibliographyContent: settings.bibliographyContent,
    };
}

/*
  Las imágenes extraídas de base64 viven en una carpeta que lleva el nombre
  del documento. «Guardar como» cambia también esa carpeta y las referencias
  del Markdown, pero deja intactas las carpetas ajenas (`imagenes/`,
  `../comunes/`, etc.). El callback se ejecuta cuando el diálogo nativo ya ha
  devuelto el nombre realmente elegido.
*/
function renameOwnAssetFolderForSave(doc, content, companionFiles, savedName) {
    const oldFolder = extractedAssetsFolder(doc);
    const newFolder = extractedAssetsFolderName(savedName);
    if (!oldFolder || !newFolder || oldFolder === newFolder) {
        return { contents: content, companionFiles };
    }

    const prefix = `${oldFolder}/`;
    let hasOwnAssets = false;
    const renamedFiles = (Array.isArray(companionFiles) ? companionFiles : []).map(file => {
        const relativePath = assetPathUtils?.normalizeRelativePath(file?.relativePath || '') || '';
        if (!relativePath.startsWith(prefix)) return file;
        const renamedPath = `${newFolder}/${relativePath.slice(prefix.length)}`;
        hasOwnAssets = true;
        return { ...file, relativePath: renamedPath };
    });
    if (!hasOwnAssets) return { contents: content, companionFiles };

    let rewritten = String(content);
    const bibliographyPath = bibliographyPathFromMarkdown(rewritten);
    if (bibliographyPath.startsWith(prefix)) {
        rewritten = setBibliographyPathInMarkdown(
            rewritten,
            `${newFolder}/${bibliographyPath.slice(prefix.length)}`,
        );
    }
    rewritten = rewritten.replace(
        /(!\[[^\]]*?\]\(\s*)([^)\s]+)/g,
        (match, opening, source) => {
            const normalized = assetPathUtils?.normalizeRelativePath(source) || '';
            if (!normalized.startsWith(prefix)) return match;
            const renamed = `${newFolder}/${normalized.slice(prefix.length)}`;
            const suffix = source.slice(source.replace(/[?#].*$/, '').length);
            return `${opening}${renamed}${suffix}`;
        },
    );
    return { contents: rewritten, companionFiles: renamedFiles };
}

async function saveCurrentDocument({ saveAs = false } = {}) {
    let content = markdownEditor.getValue();
    const doc = docs.find(d => d.id === currentId);
    const portableBibliography = preparePortableBibliographyForSave(doc, content);
    content = portableBibliography.contents;
    let savedContent = content;
    const rawName = doc && typeof doc.name === 'string' ? doc.name.trim() : '';
    const cleanName = rawName.replace(/\.md$/i, '') || 'documento';
    const filename = `${cleanName}.md`;
    const assetEntry = doc ? documentAssetEntry(doc.id) : null;
    try {
        const companionFiles = [
            ...(await collectLinkedDocumentAssets(doc, content)),
            ...portableBibliography.companionFiles,
        ];
        const existingPath = saveAs ? '' : (doc?.filePath || '');
        const options = {
            existingPath,
            extensions: ['md', 'markdown'],
            companionFiles,
            directoryHandle: saveAs ? null : (assetEntry?.saveDirectoryHandle || null),
            fileHandle: saveAs ? null : (assetEntry?.saveFileHandle || null),
            /*
              Siempre que el nombre pueda cambiar, no solo en «Guardar como»:
              un documento nuevo llega al diálogo llamándose «Documento sin
              nombre» y sale con el que elija el usuario, y su carpeta de
              imágenes y bibliografía tiene que seguirle. Antes esto solo
              ocurría al reguardar en el escritorio, así que el primer guardado
              —justo el caso en el que el nombre siempre cambia— dejaba la
              carpeta con el nombre provisional.
            */
            prepareForSave: saveAs || !existingPath
                ? ({ name }) => {
                    const prepared = renameOwnAssetFolderForSave(doc, content, companionFiles, name);
                    savedContent = prepared.contents;
                    return prepared;
                }
                : null,
        };
        let result;
        try {
            result = await saveFile(filename, content, 'text/markdown;charset=utf-8', options);
        } catch (error) {
            if (!existingPath) throw error;
            /*
              La ruta recordada puede haber dejado de servir: el documento se
              movió, la carpeta ya no está o el disco no está conectado. Se
              pide una ubicación nueva antes que dejar el trabajo sin guardar.
            */
            console.warn('No se pudo guardar en la ruta recordada:', existingPath, error);
            if (doc) doc.filePath = '';
            result = await saveFile(filename, content, 'text/markdown;charset=utf-8', { ...options, existingPath: '' });
        }
        if (!result || !result.saved) return false;
        if (doc) {
            const savedName = String(result.name || filename).replace(/\.md$/i, '') || cleanName;
            if (typeof result.contents === 'string') savedContent = result.contents;
            if (savedContent !== content) {
                markdownEditor.setValue(savedContent);
            }
            doc.name = savedName;
            doc.filePath = result.path || doc.filePath || '';
            doc.md = savedContent;
            doc.lastSaved = savedContent;
            const savedBibliographyPath = bibliographyPathFromMarkdown(savedContent);
            if (savedBibliographyPath && portableBibliography.bibliographyContent) {
                doc.bibliographyPath = savedBibliographyPath;
                doc.bibliographyName = savedBibliographyPath.split('/').pop();
                doc.bibliographyContent = portableBibliography.bibliographyContent;
            }
            const tabNameEl = document.querySelector(`.tab[data-id="${currentId}"] .tab-name`);
            if (tabNameEl) tabNameEl.textContent = savedName;
            updateDirtyIndicator(currentId, false);
            saveDocsList();
            if (assetEntry && result.directoryHandle) {
                assetEntry.saveDirectoryHandle = result.directoryHandle;
            }
            /*
              El archivo que el usuario eligió en el navegador, para que el
              siguiente `Ctrl+S` escriba en él sin volver a preguntar. Si esta
              vez no hubo ninguno —se descargó, o el documento fue a una
              carpeta con sus imágenes—, el anterior ya no sirve.
            */
            if (assetEntry) assetEntry.saveFileHandle = result.fileHandle || null;
        }
        if (result.archiveName) {
            reportStatus(getTranslation(
                'save_file_bundle_done',
                'Documento y recursos guardados en {name}; descomprímelo para mantener sus carpetas.'
            ).replace('{name}', result.archiveName));
        } else {
            reportStatus(getTranslation('save_file_done', 'Documento guardado.'));
        }
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

/*
  La marca de «copiado» ocupa el botón entero durante dos segundos, así que
  mientras dura no se puede fotografiar su contenido: copiar dos veces seguidas
  guardaba la propia marca como estado de reposo y el botón se quedaba con ella
  para siempre, sin su icono ni su rótulo.
*/
function snapshotDefaultButtonHtml(btn) {
    if (!btn || btn.dataset.copyFeedback === 'true') return;
    btn.dataset.defaultHtml = btn.innerHTML;
}

function startButtonFeedback(btn, html) {
    if (!btn) return;
    btn.dataset.copyFeedback = 'true';
    btn.innerHTML = html;
}

function restoreDefaultButtonHtml(btn, fallbackHtml) {
    if (!btn) return;
    delete btn.dataset.copyFeedback;
    const defaultHtml = typeof btn.dataset.defaultHtml === 'string' ? btn.dataset.defaultHtml : fallbackHtml;
    if (typeof defaultHtml !== 'string') return;
    btn.innerHTML = defaultHtml;
    if (window.lucide) lucide.createIcons();
    // El formato pudo cambiar mientras se veía la marca: el rótulo se repinta.
    if (typeof window.__updateCopyButtonLabel === 'function') window.__updateCopyButtonLabel();
}

async function copyPlain(text, btn) {
    if (!btn) return;
    const fallbackHtml = btn.innerHTML;
    if (typeof btn.dataset.defaultHtml !== 'string') {
        snapshotDefaultButtonHtml(btn);
    }
    try {
        // Con el respaldo de execCommand: sin contexto seguro —http:// que no
        // sea localhost, o un archivo abierto directamente— no hay
        // navigator.clipboard y la copia moría con un TypeError.
        await writeTextToClipboard(text);
        startButtonFeedback(btn, '<i data-lucide="check" class="text-green-500"></i>');
    } catch (err) {
        console.error('No se pudo copiar:', err);
        startButtonFeedback(btn, '<i data-lucide="x" class="text-red-500"></i>');
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
        let rico = false;
        if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([html], { type: 'text/html' }),
                        'text/plain': new Blob([html], { type: 'text/plain' })
                    })
                ]);
                rico = true;
            } catch (err) {
                // El permiso denegado o un tipo que el navegador no acepta no
                // pueden costar la copia: queda el HTML como texto.
                console.warn('No se pudo copiar con formato:', err);
            }
        }
        if (!rico) await writeTextToClipboard(html);
        startButtonFeedback(btn, '<i data-lucide="check" class="text-green-500"></i>');
    } catch (err) {
        console.error('No se pudo copiar:', err);
        startButtonFeedback(btn, '<i data-lucide="x" class="text-red-500"></i>');
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
    startButtonFeedback(btn, success
        ? '<i data-lucide="check" class="text-green-500"></i>'
        : '<i data-lucide="x" class="text-red-500"></i>');
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

/*
  La vista previa se dibuja como una hoja sobre una mesa, y quien se desplaza
  es la mesa, no el texto. Todo lo que mide o mueve el scroll de la vista
  previa pregunta aquí por el elemento correcto; el editable sigue siendo
  `#html-output`.
*/
function getPreviewScroller() {
  return document.getElementById('preview-desk') || document.getElementById('html-output');
}

/*
  Lo que se enseña y se esconde al cambiar entre la vista previa y el código no
  es el editable, sino la mesa entera: ocultando solo el editable quedaba la
  mesa vacía —un rectángulo gris— encima del código.
*/
function getPreviewShell() {
  return document.getElementById('preview-desk') || document.getElementById('html-output');
}

function isPreviewVisible() {
  const shell = getPreviewShell();
  return !!shell && shell.style.display !== 'none';
}

/*
  Las lupas de los dos paneles. Son lupas y no formatos: agrandan lo que se ve
  —el editor a la izquierda, la hoja o el código a la derecha— y no tocan ni el
  Markdown ni lo que se exporta. El tamaño de letra del documento sigue estando
  en las opciones de formato, que es lo que viaja al archivo.

  Cada panel guarda la suya y la recupera al arrancar, y las dos comparten los
  mismos pasos para que el 100 % signifique lo mismo en los dos lados.
*/
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

const PREVIEW_ZOOM = {
  variable: '--preview-zoom',
  storageKey: PREVIEW_ZOOM_KEY,
  labelId: 'preview-zoom-value',
};
const MARKDOWN_ZOOM = {
  variable: '--markdown-zoom',
  storageKey: MARKDOWN_ZOOM_KEY,
  labelId: 'markdown-zoom-value',
};

/*
  El panel atado a la lupa: las dos cosas que deciden si la página se ve entera
  —cuánto ancho tiene el panel y a qué aumento se dibuja la hoja— dejan de ir
  cada una por su lado y se mueven juntas en los dos sentidos. Se mueve el
  separador y la lupa se recalcula; se toca la lupa y el separador se aparta
  para que la hoja siga cabiendo.

  Nace de que la hoja mide el papel de verdad —una A4 son 794 px—, así que con
  los dos paneles a la vista y una pantalla que no sea grande no cabía y
  aparecía la barra de desplazamiento horizontal. Estrechar la hoja habría
  reordenado el texto y perdido el reparto en páginas; encogerla entera, que es
  lo que hace un procesador de textos, lo deja todo en su sitio.

  Al mover el separador la lupa solo achica: con ancho de sobra la hoja se
  queda a tamaño real y centrada, que es lo que se espera de una página. Por
  encima del 100 % se sube a mano, y entonces es el separador el que se aparta.
*/
let panelAtadoALaLupa = true;
/*
  El ancho de mesa que ha pedido la propia lupa al apartar el separador. Sin
  esta nota, el observador del ancho leería ese movimiento como uno más del
  usuario y volvería a calcular la lupa desde él, deshaciendo el aumento que se
  acababa de pedir.
*/
let anchoDeMesaPedidoPorLaLupa = null;

function normalizeZoom(value) {
  const zoom = Number(value);
  if (!Number.isFinite(zoom)) return 1;
  return ZOOM_STEPS.reduce(
    (closest, step) => (Math.abs(step - zoom) < Math.abs(closest - zoom) ? step : closest),
    ZOOM_STEPS[0],
  );
}

/*
  Las medidas del papel llegan en las unidades en que las escribe cada quien:
  el formato del documento en centímetros y la hoja de estilos en `rem`.
*/
function medidaCssEnPx(medida) {
  const texto = String(medida || '').trim();
  const valor = parseFloat(texto);
  if (!Number.isFinite(valor)) return 0;
  if (texto.endsWith('cm')) return valor * (96 / 2.54);
  if (texto.endsWith('mm')) return valor * (96 / 25.4);
  if (texto.endsWith('in')) return valor * 96;
  if (texto.endsWith('rem')) {
    return valor * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
  }
  return valor;
}

/*
  Lo que mediría la hoja sin lupa. Se pregunta a la propia hoja, que es donde
  el formato del documento deja `--paper-width`; mientras no haya formato
  aplicado manda el ancho de partida de la hoja.
*/
function anchoDelPapelSinLupa() {
  const sheet = document.getElementById('html-output');
  if (!sheet) return 0;
  const estilos = getComputedStyle(sheet);
  const declarado = estilos.getPropertyValue('--paper-width').trim()
    || estilos.getPropertyValue('--preview-sheet-width').trim();
  return medidaCssEnPx(declarado);
}

/*
  El ancho que la mesa deja libre: el suyo menos sus márgenes. `clientWidth` ya
  descuenta la barra de desplazamiento vertical, que es justo el hueco que se
  colaba en la cuenta y dejaba la hoja unos píxeles fuera.
*/
function anchoUtilDeLaMesa() {
  const desk = document.getElementById('preview-desk');
  if (!desk) return 0;
  const estilos = getComputedStyle(desk);
  const util = desk.clientWidth
    - (parseFloat(estilos.paddingLeft) || 0)
    - (parseFloat(estilos.paddingRight) || 0);
  return util > 0 ? util : 0;
}

/*
  El aumento al que la hoja llena el panel. Llena, no «cabe como mucho»: quien
  le hace sitio al editor visual —apartando el separador o dejándolo solo— lo
  hace para ver la página más grande, y dejarla al 100 % con el gris a los
  lados sería no hacerle caso. Así que la cuenta pasa del 100 % con la misma
  naturalidad con que se queda por debajo cuando el sitio es poco.

  Arriba llega hasta donde llega la lupa de mano. Abajo no se le pone ese
  suelo: en un panel muy estrecho su paso más pequeño todavía es más ancho que
  la mesa, y volvería a asomar la barra que todo esto viene a quitar.

  El tamaño real del papel sigue estando a un clic —el 100 % del centro—, y
  quien lo quiera fijo suelta el interruptor de al lado.
*/
function zoomQueCabe() {
  const papel = anchoDelPapelSinLupa();
  const mesa = anchoUtilDeLaMesa();
  // Sin mesa a la vista no hay nada que medir: con la vista previa escondida
  // se queda la lupa como estaba y la cuenta se rehace al volver.
  if (!papel || !mesa) return null;
  // Truncado a la centésima por lo bajo: con el cociente exacto, medio píxel
  // de sobra basta para que vuelva a asomar la barra.
  const cabe = Math.floor((mesa / papel) * 100) / 100;
  return Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], Math.max(0.1, cabe));
}

/*
  Lo que la mesa se lleva además de la hoja: sus dos márgenes, el hueco de la
  barra de desplazamiento vertical —medido, que hay sistemas donde flota y no
  ocupa nada— y el separador entre los dos paneles.
*/
function gastosDeLaMesa() {
  const desk = document.getElementById('preview-desk');
  const estilos = desk ? getComputedStyle(desk) : null;
  const relleno = estilos
    ? (parseFloat(estilos.paddingLeft) || 0) + (parseFloat(estilos.paddingRight) || 0)
    : 32;
  const barra = desk && desk.offsetWidth
    ? Math.max(0, desk.offsetWidth - desk.clientWidth)
    : 16;
  return relleno + barra + GUTTER_DE_PANELES;
}

/*
  El aumento más grande al que la hoja todavía cabe entera, contando con que el
  separador se aparte todo lo que puede: hasta dejar al editor de Markdown en
  su ancho mínimo. Con un solo panel a la vista no hay separador que mover y el
  tope es lo que mida la mesa.
*/
function zoomMaximoQueCabe() {
  const papel = anchoDelPapelSinLupa();
  // Sin dos paneles que repartir no hay tope: la lupa va donde le pidan.
  if (!papel || !hayDosPanelesALaVez()) return null;
  const contenedor = document.getElementById('editor-container');
  const total = contenedor ? contenedor.clientWidth : 0;
  if (!total) return null;
  const libre = total - ANCHO_MINIMO_DE_PANEL - gastosDeLaMesa();
  return libre > 0 ? libre / papel : null;
}

/*
  El aumento pedido, recortado a lo que cabe. Con el panel atado la promesa es
  que la página se ve entera, así que la lupa se para donde el separador ya no
  puede apartarse más; para ir más allá se suelta el interruptor o se deja la
  vista previa sola, que da todo el ancho.
*/
function zoomQueCabeEnElPanel(zoom) {
  if (!panelAtadoALaLupa) return zoom;
  const tope = zoomMaximoQueCabe();
  if (tope === null || zoom <= tope + 0.001) return zoom;
  let cabe = ZOOM_STEPS[0];
  ZOOM_STEPS.forEach((step) => { if (step <= tope + 0.001) cabe = step; });
  return cabe;
}

/*
  Aparta el separador lo justo para que la hoja quepa con este aumento, y lo
  devuelve cuando se baja. Nunca por debajo de la mitad —el editor visual es lo
  que se viene a mirar— ni tanto como para dejar al de Markdown sin su ancho
  mínimo. Con un solo panel a la vista no hay nada que mover.
*/
function apartarSeparadorParaLaLupa(zoom) {
  if (!splitDePaneles || !hayDosPanelesALaVez()) return;
  const contenedor = document.getElementById('editor-container');
  const total = contenedor ? contenedor.clientWidth : 0;
  const papel = anchoDelPapelSinLupa();
  if (!total || !papel) return;
  const pedido = papel * zoom + gastosDeLaMesa();
  const derecha = Math.max(total / 2, Math.min(pedido, total - ANCHO_MINIMO_DE_PANEL));
  const porcentaje = Math.min(95, Math.max(5, Math.ceil((derecha / total) * 100)));
  repartoDeLosPaneles = [100 - porcentaje, porcentaje];
  splitDePaneles.setSizes(repartoDeLosPaneles);
  // Medido y no calculado: el reparto va en tantos por ciento enteros, así que
  // el ancho que sale de ellos no es exactamente el que se pidió, y esta nota
  // tiene que ser el ancho de verdad para que el observador la reconozca.
  anchoDeMesaPedidoPorLaLupa = anchoUtilDeLaMesa();
}

function zoomEfectivo(panel) {
  const declarado = Number(document.documentElement.style.getPropertyValue(panel.variable));
  return Number.isFinite(declarado) && declarado > 0 ? declarado : 1;
}

/*
  La etiqueta de la lupa dice siempre el aumento real, también el que sale de
  la cuenta —un 86 %, pongamos—. Y cuando ese número lo ha puesto el ajuste y
  no la mano, se marca: es un tanto por ciento que se mueve solo al mover el
  separador, y sin la marca parecía que la lupa se desajustaba sola.
*/
function pintarEtiquetaDeZoom(panel, zoom, { calculado = false } = {}) {
  const label = document.getElementById(panel.labelId);
  if (label) label.textContent = `${Math.round(zoom * 100)} %`;
  if (panel !== PREVIEW_ZOOM) return;
  const boton = document.getElementById('preview-zoom-reset');
  if (boton) boton.dataset.ajuste = calculado ? 'true' : 'false';
  refrescarTopeDeLaLupa();
}

/*
  El `+` de la vista previa se apaga cuando el panel atado ya no puede dar más
  ancho: sin eso queda un botón que se pulsa y no hace nada, que es peor que uno
  apagado. Dice en su título por qué, y se enciende solo en cuanto hay sitio: al
  soltar el interruptor, al ensanchar la ventana o al dejar la hoja sola.
*/
function refrescarTopeDeLaLupa() {
  const mas = document.getElementById('preview-zoom-in');
  if (!mas) return;
  const siguiente = ZOOM_STEPS.find(step => step > zoomEfectivo(PREVIEW_ZOOM) + 0.001);
  const tope = panelAtadoALaLupa && hayDosPanelesALaVez() ? zoomMaximoQueCabe() : null;
  const sinSitio = siguiente !== undefined && tope !== null && siguiente > tope + 0.001;
  mas.setAttribute('aria-disabled', sinSitio ? 'true' : 'false');
  const clave = sinSitio ? 'preview_zoom_in_capped_title' : 'preview_zoom_in_title';
  const rotulo = sinSitio
    ? 'La hoja ya ocupa el panel entero; suelta el interruptor de al lado o deja la vista previa sola para ampliarla más'
    : 'Ver la hoja más grande (Ctrl++); no cambia el documento';
  mas.setAttribute('data-i18n-key', clave);
  mas.setAttribute('title', getTranslation(clave, rotulo));
}

/*
  El interruptor de la barra de estado. Enciende y apaga la atadura entera, y
  al encenderla ajusta ya mismo lo que haya en pantalla.
*/
function pintarInterruptorDelPanelAtado() {
  const boton = document.getElementById('preview-link-toggle');
  if (!boton) return;
  // Fuera de los dos paneles no ata nada, así que no se enseña.
  boton.classList.toggle('hidden', !hayDosPanelesALaVez());
  boton.setAttribute('aria-pressed', panelAtadoALaLupa ? 'true' : 'false');
  const iconHost = boton.querySelector('.link-icon');
  if (iconHost) {
    iconHost.innerHTML = `<i data-lucide="${panelAtadoALaLupa ? 'link' : 'unlink'}" class="w-4 h-4"></i>`;
    if (window.lucide) lucide.createIcons();
  }
}

function atarPanelALaLupa(atado, { persist = true } = {}) {
  panelAtadoALaLupa = !!atado;
  if (persist) safeLocalStorageSet(PANEL_ATADO_KEY, panelAtadoALaLupa ? '1' : '0');
  pintarInterruptorDelPanelAtado();
  refrescarTopeDeLaLupa();
  if (panelAtadoALaLupa) {
    anchoDeMesaPedidoPorLaLupa = null;
    aplicarAjusteAlAncho();
  } else {
    pintarEtiquetaDeZoom(PREVIEW_ZOOM, zoomEfectivo(PREVIEW_ZOOM));
  }
}

/*
  Rehace la cuenta de la lupa desde el ancho del panel. Se llama cada vez que
  cambia algo de lo que entra en ella: el ancho de la mesa al mover el
  separador, al cambiar de disposición o al redimensionar la ventana, y el
  ancho del papel al cambiar el formato del documento. Con el panel suelto no
  hace nada.
*/
/*
  La atadura es cosa de los dos paneles uno al lado del otro: es ahí donde el
  ancho de uno se lo quita al otro y hay algo que repartir. Con un solo panel a
  la vista la lupa es libre —nadie le disputa el ancho—, y en el móvil, donde
  los paneles van uno encima del otro, no hay separador ni reparto que valga.
  Los 769 px son el mismo corte que usa la hoja de estilos para apilarlos.
*/
function hayDosPanelesALaVez() {
  return currentLayout === 'dual' && window.matchMedia('(min-width: 769px)').matches;
}

function aplicarAjusteAlAncho() {
  if (!panelAtadoALaLupa || !hayDosPanelesALaVez()) return null;
  const mesa = anchoUtilDeLaMesa();
  if (!mesa) return null;
  /*
    Este ancho lo pidió la propia lupa al apartar el separador: recalcular
    desde él bajaría al 100 % el aumento que se acaba de subir a mano.
  */
  if (anchoDeMesaPedidoPorLaLupa !== null && Math.abs(mesa - anchoDeMesaPedidoPorLaLupa) <= 2) {
    return zoomEfectivo(PREVIEW_ZOOM);
  }
  anchoDeMesaPedidoPorLaLupa = null;
  const zoom = zoomQueCabe();
  if (zoom === null) return null;
  if (Math.abs(zoom - zoomEfectivo(PREVIEW_ZOOM)) < 0.0001) return zoom;
  document.documentElement.style.setProperty(PREVIEW_ZOOM.variable, String(zoom));
  pintarEtiquetaDeZoom(PREVIEW_ZOOM, zoom, { calculado: true });
  // CodeMirror mide su tipografía al pintarse, y la vista de código comparte
  // esta lupa.
  if (htmlEditor) htmlEditor.refresh();
  return zoom;
}

/*
  `aMano` distingue quién pide el aumento. Pedido a mano y con el panel atado,
  el separador se aparta para que la hoja quepa; puesto al arrancar o venido de
  otro sitio, la lupa se limita a obedecer y del ancho ya se ocupa el ajuste.
*/
function applyZoom(panel, value, { persist = true, aMano = false } = {}) {
  let zoom = normalizeZoom(value);
  if (panel === PREVIEW_ZOOM && aMano) zoom = zoomQueCabeEnElPanel(zoom);
  document.documentElement.style.setProperty(panel.variable, String(zoom));
  pintarEtiquetaDeZoom(panel, zoom);
  if (persist) safeLocalStorageSet(panel.storageKey, zoom);
  // CodeMirror mide su tipografía al pintarse: sin esto, el cursor y el
  // resaltado se quedan en la posición del tamaño anterior.
  if (panel === MARKDOWN_ZOOM && markdownEditor) markdownEditor.refresh();
  if (panel === PREVIEW_ZOOM && htmlEditor) htmlEditor.refresh();
  if (panel === PREVIEW_ZOOM && aMano && panelAtadoALaLupa && hayDosPanelesALaVez()) {
    apartarSeparadorParaLaLupa(zoom);
    /*
      Y el ancho que queda es el que la lupa da por bueno. Sin esta nota, el
      observador del ancho leía el cambio de la hoja como uno del panel y
      volvía a llenarlo, de modo que la lupa no se movía de donde estaba: con
      un solo panel a la vista, donde no hay separador que apartar, era
      imposible reducir la hoja. Vuelve a mandar el ajuste en cuanto el ancho
      cambie de verdad —al mover el separador, la ventana o la disposición—.
    */
    anchoDeMesaPedidoPorLaLupa = anchoUtilDeLaMesa();
  }
  return zoom;
}

function stepZoom(panel, direction) {
  /*
    El paso siguiente se busca por el valor y no por la posición: desde el
    ajuste automático la lupa cae entre dos pasos, y partiendo del más cercano
    el primer toque se saltaba uno.
  */
  const actual = zoomEfectivo(panel);
  let siguiente = null;
  if (direction > 0) {
    siguiente = ZOOM_STEPS.find(step => step > actual + 0.001);
    if (siguiente === undefined) siguiente = ZOOM_STEPS[ZOOM_STEPS.length - 1];
  } else {
    for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
      if (ZOOM_STEPS[i] < actual - 0.001) { siguiente = ZOOM_STEPS[i]; break; }
    }
    if (siguiente === null) siguiente = ZOOM_STEPS[0];
  }
  applyZoom(panel, siguiente, { aMano: true });
}

/*
  Cuál es el panel en el que se trabaja no lo puede decir el foco a secas: los
  controles que gobiernan un panel viven ahora en la barra de estado, fuera de
  los dos, y al pulsar una lupa el foco se iba al botón y el panel activo daba
  un salto al del Markdown en mitad de la faena. Se recuerda el último panel que
  tuvo el foco de verdad; el del Markdown mientras no lo tenga ninguno, que es
  donde se escribe.
*/
let panelDeTrabajo = 'markdown';

function recordarPanelDeTrabajo(destino) {
  if (!destino) return false;
  const panelDerecho = document.getElementById('html-panel');
  const panelIzquierdo = document.getElementById('markdown-panel');
  if (panelDerecho && panelDerecho.contains(destino)) panelDeTrabajo = 'preview';
  else if (panelIzquierdo && panelIzquierdo.contains(destino)) panelDeTrabajo = 'markdown';
  else return false;
  return true;
}

/*
  Ctrl y las teclas de más y menos mueven la lupa del panel en el que se está
  trabajando: con un solo panel a la vista, el suyo; con los dos, el último que
  tuvo el foco.
*/
function panelDeZoomActivo() {
  if (currentLayout === 'html') return 'preview';
  if (currentLayout === 'md') return 'markdown';
  return panelDeTrabajo;
}

function zoomDelPanelActivo() {
  return panelDeZoomActivo() === 'preview' ? PREVIEW_ZOOM : MARKDOWN_ZOOM;
}

/*
  En la barra de estado las dos lupas comparten sitio y solo se enseña la del
  panel activo: cada una escala una cosa distinta —el texto que se escribe o la
  hoja que se verá— y juntas invitaban a confundirlas.

  Y el panel activo se marca en el propio panel, no solo por el foco: un clic en
  cualquier sitio de fuera —un botón de la barra, el menú— apaga el foco, pero
  la barra de herramientas sigue trabajando sobre el último panel, y sin marca
  no había manera de saber sobre cuál.
*/
function refrescarPanelActivo() {
  const activo = panelDeZoomActivo();
  const host = document.getElementById('status-bar-zoom');
  if (host) host.dataset.zoomPanel = activo;
  const editorContainer = document.getElementById('editor-container');
  if (editorContainer) editorContainer.dataset.panelActivo = activo;
  // La barra de estado enciende el rótulo del panel activo y esconde lo que
  // sea del panel que no está a la vista.
  const statusBar = document.getElementById('status-bar');
  if (statusBar) {
    statusBar.dataset.panelActivo = activo;
    statusBar.dataset.layout = currentLayout || 'dual';
  }
}

document.addEventListener('focusin', (event) => {
  if (recordarPanelDeTrabajo(event.target)) refrescarPanelActivo();
});

/*
  Pulsar en la mesa que rodea la hoja, o en el hueco bajo el texto, no da el
  foco a nada; pero para quien mira es entrar en ese panel, y así se cuenta.
*/
document.addEventListener('pointerdown', (event) => {
  if (recordarPanelDeTrabajo(event.target)) refrescarPanelActivo();
});

function buildHtmlWithTex() {
  const htmlOutput = document.getElementById('html-output');
  if (!htmlOutput) return '';
  const clone = restoreOriginalImageSources(htmlOutput.cloneNode(true));
  /*
    El índice de la hoja es una ayuda para mirar, no contenido: se retira antes
    de que la hoja se convierta en Markdown, en HTML o en lo que sea que salga
    de ella. El índice de verdad lo pone Pandoc al exportar.
  */
  clone.querySelectorAll('[data-edimark-toc], [data-edimark-bibliography]').forEach(nodo => nodo.remove());
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

let layoutTransitionTimer = null;
let panelSlideTimer = null;

/*
  Los paneles no aparecen ni desaparecen de golpe: el que entra crece desde
  cero y el que se va se encoge hasta cero, los dos a la vez. Como van en fila,
  eso les da a los dos su lado —el editor visual entra por la derecha y el
  Markdown por la izquierda—, y el que se queda no da ningún salto. Solo cabe
  en horizontal: apilados (móvil) el ancho no reparte nada y el que llega se
  funde, y con las animaciones desactivadas el cambio es seco.
*/
function anchoRepartido() {
  return window.matchMedia('(min-width: 769px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function limpiarTransicionDePaneles() {
  clearTimeout(panelSlideTimer);
  panelSlideTimer = null;
  document.querySelectorAll('#editor-container .panel.panel-sliding, #editor-container .panel.panel-fade-in')
    .forEach(panel => panel.classList.remove('panel-sliding', 'panel-fade-in'));
}

function estaOculto(panel) {
  return window.getComputedStyle(panel).display === 'none';
}

/*
  El cero de partida tiene que quedar puesto sin transición; si no, el panel
  entrante animaría desde el ancho que tuviera la última vez. De ahí la lectura
  de `offsetWidth`: obliga al navegador a recalcular ahí mismo, antes de que la
  transición entre en juego con el ancho final.
*/
function prepararEntrada(panel, deslizando) {
  if (!panel) return;
  const llegaba = estaOculto(panel);
  /*
    `flex` y no `block`: el panel de Markdown tiene que repartir su alto entre
    el editor y la lista de imágenes incrustadas, y en bloque esa lista se salía
    por debajo del panel, donde `overflow: hidden` la dejaba invisible.
  */
  panel.style.display = 'flex';
  if (!llegaba) return;
  if (!deslizando) {
    panel.classList.add('panel-fade-in');
    return;
  }
  panel.classList.add('panel-sliding');
  panel.style.width = '0%';
  void panel.offsetWidth;
}

function prepararSalida(panel, deslizando, salientes) {
  if (!panel) return;
  if (!deslizando || estaOculto(panel)) {
    panel.style.display = 'none';
    return;
  }
  panel.classList.add('panel-sliding');
  panel.style.width = '0%';
  salientes.push(panel);
}

/*
  El reparto de partida de los dos paneles. Con un 50 % fijo, en una pantalla de
  1366 al de la derecha le tocaban 683 px y una hoja A4 mide 794: la vista
  previa arrancaba siempre encogida por el ajuste al ancho. Se le da de salida
  lo justo que necesita la hoja a tamaño real, y solo mientras al de la
  izquierda le quede sitio de sobra; si no cabe, se reparten a medias y del
  resto se ocupa el ajuste.
*/
const ANCHO_MINIMO_DE_PANEL = 280;
const GUTTER_DE_PANELES = 8;
let splitDePaneles = null;
// El reparto que dejó el usuario al arrastrar el separador. Mientras no toque
// nada manda el calculado, que se rehace si cambia el papel del documento.
let repartoDeLosPaneles = null;

function repartoDePanelesPorDefecto() {
  const contenedor = document.getElementById('editor-container');
  const total = contenedor ? contenedor.clientWidth : 0;
  const papel = anchoDelPapelSinLupa();
  if (!total || !papel) return [50, 50];
  const derecha = papel + gastosDeLaMesa();
  if (total - derecha < ANCHO_MINIMO_DE_PANEL) return [50, 50];
  /*
    Al alza —quedarse un píxel corto es justo lo que se quería evitar—, y nunca
    por debajo de la mitad: en una pantalla ancha la hoja pide menos del 50 % y
    dárselo dejaba al editor de Markdown una columna enorme para un texto que
    se lee en líneas cortas. La hoja es lo que se viene a mirar.
  */
  const porcentaje = Math.min(75, Math.max(50, Math.ceil((derecha / total) * 100)));
  return [100 - porcentaje, porcentaje];
}

function repartoDePanelesVigente() {
  return repartoDeLosPaneles || repartoDePanelesPorDefecto();
}

/*
  Vuelve a repartir cuando cambia el papel —de A4 a Carta, o al apaisado—, que
  es lo que decide cuánto ancho pide la hoja. Si el usuario ya movió el
  separador, manda él.
*/
function ajustarRepartoDePaneles() {
  if (!splitDePaneles || repartoDeLosPaneles || currentLayout !== 'dual') return;
  splitDePaneles.setSizes(repartoDePanelesPorDefecto());
}

function applyLayout(layout) {
  const layoutAnterior = currentLayout;
  currentLayout = layout;
  syncEnabled = (layout === 'dual');
  // Esconder la vista previa devuelve el formato al Markdown, y con él el menú.
  refreshFormulaButtonAffordance();
  safeLocalStorageSet(LAYOUT_KEY, layout);

  const mdPanel = document.getElementById('markdown-panel');
  const htmlPanel = document.getElementById('html-panel');
  const gutters = document.querySelectorAll('.gutter');
  // Un cambio de disposición cancela el anterior si quedaba a medias.
  limpiarTransicionDePaneles();
  const deslizando = layoutAnterior && layoutAnterior !== layout && anchoRepartido();
  const reparto = repartoDePanelesVigente();
  const anchos = layout === 'md'
    ? [[mdPanel, '100%'], [htmlPanel, '']]
    : layout === 'html'
      ? [[mdPanel, ''], [htmlPanel, '100%']]
      : [[mdPanel, `${reparto[0]}%`], [htmlPanel, `${reparto[1]}%`]];

  gutters.forEach(g => g.style.display = layout === 'dual' ? '' : 'none');
  // Primero los que llegan, para que el que se va los encuentre ya en su sitio
  // y los dos anchos se muevan en la misma transición.
  anchos.forEach(([panel, ancho]) => { if (ancho) prepararEntrada(panel, deslizando); });
  const salientes = [];
  anchos.forEach(([panel, ancho]) => {
    if (ancho) panel.style.width = ancho;
    else prepararSalida(panel, deslizando, salientes);
  });
  panelSlideTimer = setTimeout(() => {
    document.querySelectorAll('#editor-container .panel.panel-sliding, #editor-container .panel.panel-fade-in')
      .forEach(panel => panel.classList.remove('panel-sliding', 'panel-fade-in'));
    salientes.forEach(panel => { panel.style.display = 'none'; });
    panelSlideTimer = null;
  }, 200);

  document.querySelectorAll('#layout-menu [data-layout]').forEach((option) => {
    const selected = option.dataset.layout === layout;
    option.setAttribute('aria-checked', selected ? 'true' : 'false');
    const check = option.querySelector('.layout-check');
    if (check) check.classList.toggle('hidden', !selected);
  });
  /*
    Con un solo panel a la vista nadie le da el alto al que queda: en la web el
    alto sale del panel de la vista previa, que es el único que lo mide, así que
    al esconderlo el editor de Markdown se quedaba en una rendija de 36 px. La
    marca deja que el CSS le dé un alto propio solo mientras está solo.
  */
  const editorContainer = document.getElementById('editor-container');
  if (editorContainer) editorContainer.classList.toggle('single-panel', layout !== 'dual');
  refrescarPanelActivo();
  // La atadura solo vive con los dos paneles: su interruptor va y viene con ellos.
  pintarInterruptorDelPanelAtado();
  refrescarTopeDeLaLupa();

  // La transición del ancho, solo mientras dura el cambio.
  if (editorContainer) {
    editorContainer.classList.add('layout-changing');
    clearTimeout(layoutTransitionTimer);
    layoutTransitionTimer = setTimeout(() => {
      editorContainer.classList.remove('layout-changing');
    }, 220);
  }

  // Los tres botones dicen lo mismo que el menú: cuál está puesta.
  document.querySelectorAll('#layout-switch [data-layout]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.layout === layout ? 'true' : 'false');
  });
  // El botón que despliega el menú muestra la disposición activa.
  const layoutIconHost = document.querySelector('#layout-menu-btn .layout-icon');
  if (layoutIconHost) {
    layoutIconHost.innerHTML = `<i data-lucide="${LAYOUT_ICONS[layout] || LAYOUT_ICONS.dual}"></i>`;
  }
  if(window.lucide) lucide.createIcons();

  /*
    CodeMirror mide su envoltorio al repintarse: hacerlo a los 10 ms lo dejaba
    midiendo el ancho de partida, a mitad de la transición. Se repinta al
    empezar, para que no se vea vacío, y otra vez al terminar.
  */
  setTimeout(() => {
    if (layout !== 'html') markdownEditor.refresh();
    if (layout !== 'md') htmlEditor.refresh();
  }, 10);
  setTimeout(() => {
    if (layout !== 'html') markdownEditor.refresh();
    if (layout !== 'md') htmlEditor.refresh();
  }, 220);
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

window.onload = async () => {
    // Antes de pintar nada: en el escritorio las preferencias buenas están en
    // el archivo del perfil, no en el almacén del webview.
    await preferencesReady;
    // --- Obtención de elementos del DOM ---
    const mainContainer = document.getElementById('main-container');
    const toggleWidthBtn = document.getElementById('toggle-width-btn');
    const desktopWindowBtn = document.getElementById('desktop-window-btn');
    // El mismo «Ventana independiente» en dos sitios: el botón de la fila de
    // la vista, que es la vía rápida, y la entrada de Configuración, donde se
    // lee lo que hace.
    const desktopWindowToolbarBtn = document.getElementById('desktop-window-toolbar-btn');
    const desktopWindowSeparator = document.getElementById('desktop-window-separator');
    const htmlOutput = document.getElementById('html-output');
    htmlOutputEl = htmlOutput;
    document.addEventListener('selectionchange', captureHtmlSelection);
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const previewZoomOutBtn = document.getElementById('preview-zoom-out');
    const previewZoomInBtn = document.getElementById('preview-zoom-in');
    const previewZoomResetBtn = document.getElementById('preview-zoom-reset');
    const markdownZoomOutBtn = document.getElementById('markdown-zoom-out');
    const markdownZoomInBtn = document.getElementById('markdown-zoom-in');
    const markdownZoomResetBtn = document.getElementById('markdown-zoom-reset');
    const layoutMenuContainer = document.getElementById('layout-menu-container');
    const layoutMenuBtn = document.getElementById('layout-menu-btn');
    const layoutMenu = document.getElementById('layout-menu');
    const layoutOptions = layoutMenu ? Array.from(layoutMenu.querySelectorAll('[data-layout]')) : [];
    const layoutSwitchButtons = Array.from(document.querySelectorAll('#layout-switch [data-layout]'));
    const toolbar = document.getElementById('toolbar');
    const focusModeToggleBtn = document.getElementById('focus-mode-toggle');
    const toolbarActionsEl = document.getElementById('toolbar-actions');
    const mobileToolbarControls = document.getElementById('mobile-toolbar-controls');
    const mobileActionsToggle = document.getElementById('mobile-actions-toggle');
    const mobileFormatToggle = document.getElementById('mobile-format-toggle');
    const openFileBtn = document.getElementById('open-file-btn');
    const fileInput = document.getElementById('file-input');
    const saveBtn = document.getElementById('save-btn');
    // El mismo Guardar en dos sitios: el icono de la cabecera, que es la vía
    // rápida, y la entrada del menú Archivo, donde se lee su atajo.
    const saveMenuBtn = document.getElementById('save-menu-btn');
    const saveAsBtn = document.getElementById('save-as-btn');
    const exportMenuContainer = document.getElementById('export-menu-container');
    const exportMenuBtn = document.getElementById('export-menu-btn');
    const exportMenu = document.getElementById('export-menu');
    const exportQuickContainer = document.getElementById('export-quick-container');
    const exportQuickBtn = document.getElementById('export-quick-btn');
    const exportQuickToggleBtn = document.getElementById('export-quick-menu-toggle');
    /*
      La lista de la flecha es la misma de la cabecera, clonada: dos listas en
      el HTML acabarían diciendo cosas distintas en cuanto una de las dos se
      tocara. El clon vive en el DOM desde el arranque, así que el traductor lo
      alcanza igual que al original. Se le añade la marca del formato activo,
      que en la cabecera no hace falta.
    */
    const exportQuickMenu = (exportMenu && exportQuickContainer)
        ? exportMenu.cloneNode(true)
        : null;
    if (exportQuickMenu) {
        exportQuickMenu.id = 'export-quick-menu';
        // Alineado a la derecha y colgando del contenedor, como el de copiar:
        // en una fila de botones centrados, un absoluto sin `top-full` se
        // coloca a la altura del centro y el menú sale por encima de la barra.
        exportQuickMenu.classList.remove('left-0');
        exportQuickMenu.classList.add('right-0', 'top-full');
        exportQuickMenu.setAttribute('aria-labelledby', 'export-quick-menu-toggle');
        exportQuickMenu.querySelectorAll('[data-export-format]').forEach((option) => {
            option.setAttribute('role', 'menuitemradio');
            option.setAttribute('aria-checked', 'false');
            const fila = option.querySelector('span');
            if (!fila) return;
            const marca = document.createElement('i');
            marca.dataset.lucide = 'check';
            // Invisible y no oculta: así las filas no bailan al cambiar de formato.
            marca.className = 'export-check invisible ml-auto w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400';
            fila.appendChild(marca);
        });
        exportQuickContainer.appendChild(exportQuickMenu);
    }
    const exportOptionButtons = Array.from(document.querySelectorAll('[data-export-format]'));
    const printBtn = document.getElementById('print-btn');
    const helpBtn = document.getElementById('help-btn');
    const aboutBtn = document.getElementById('about-btn');
    const helpMenuContainer = document.getElementById('help-menu-container');
    const helpMenuBtn = document.getElementById('help-menu-btn');
    const helpMenu = document.getElementById('help-menu');
    const aboutModalOverlay = document.getElementById('about-modal-overlay');
    const aboutCloseBtn = document.getElementById('about-close-btn');
    const desktopReleaseBanner = document.getElementById('desktop-release-banner');
    const desktopBannerClose = document.getElementById('desktop-banner-close');
    const desktopBannerNeverShow = document.getElementById('desktop-banner-never-show');
    const updateBanner = document.getElementById('update-banner');
    const updateBannerMessage = document.getElementById('update-banner-message');
    const updateInstallBtn = document.getElementById('update-install-btn');
    const updateQuitBtn = document.getElementById('update-quit-btn');
    const updateNotesLink = document.getElementById('update-notes-link');
    const updateAutoCheck = document.getElementById('update-auto-check');
    const updateBannerClose = document.getElementById('update-banner-close');
    const checkUpdatesBtn = document.getElementById('check-updates-btn');
    const spellcheckToggleBtn = document.getElementById('spellcheck-toggle-btn');
    const quitAppBtn = document.getElementById('quit-app-btn');
    const quitAppSeparator = document.getElementById('quit-app-separator');
    const copyHtmlBtn = document.getElementById('copy-html-btn');
    const pasteBtn = document.getElementById('paste-btn');
    base64UiContainer = document.getElementById('base64-hidden-container');
    base64UiList = document.getElementById('base64-hidden-list');
    base64UiCountLabel = document.getElementById('base64-hidden-count');
    base64UiToggle = document.getElementById('base64-hidden-toggle');
    base64PreviewOverlay = document.getElementById('base64-preview-overlay');
    base64PreviewImage = document.getElementById('base64-preview-image');
    base64PreviewTitle = document.getElementById('base64-preview-title');
    base64PreviewMeta = document.getElementById('base64-preview-meta');
    if (base64UiToggle) {
        base64UiToggle.addEventListener('click', () => {
            safeLocalStorageSet(BASE64_PANEL_KEY, base64PanelExpanded() ? '0' : '1', { notify: false });
            updateBase64Ui(currentBase64State);
        });
    }
    base64ExtractBtn = document.getElementById('base64-extract-btn');
    if (base64ExtractBtn) {
        base64ExtractBtn.addEventListener('click', async () => {
            // Un documento con muchas imágenes tarda un momento en pasarlas.
            base64ExtractBtn.disabled = true;
            try {
                await extractBase64Images();
            } catch (error) {
                console.error('No se pudieron pasar las imágenes a la carpeta:', error);
                notifyUser(getTranslation('base64_extract_error', 'No se pudieron pasar las imágenes a la carpeta.'));
            } finally {
                base64ExtractBtn.disabled = false;
            }
        });
    }
    const base64PreviewCloseBtn = document.getElementById('base64-preview-close-btn');
    if (base64PreviewCloseBtn) base64PreviewCloseBtn.addEventListener('click', closeBase64Preview);
    if (base64PreviewOverlay) {
        base64PreviewOverlay.addEventListener('click', (event) => {
            if (event.target === base64PreviewOverlay) closeBase64Preview();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !base64PreviewOverlay) return;
        if (!base64PreviewOverlay.classList.contains('hidden')) closeBase64Preview();
    });
    base64ModalOverlayEl = document.getElementById('base64-modal-overlay');
    base64ModalTextarea = document.getElementById('base64-modal-text');
    base64ModalCopyBtn = document.getElementById('copy-base64-code-btn');
    base64ModalCloseBtn = document.getElementById('close-base64-modal-btn');
    if (copyHtmlBtn) snapshotDefaultButtonHtml(copyHtmlBtn);
    const previewCopyContainer = document.getElementById('preview-copy-container');
    const previewCopyMenu = document.getElementById('preview-copy-menu');
    const previewCopyToggleBtn = document.getElementById('copy-html-menu-toggle');
    const previewCopyOptionButtons = previewCopyMenu ? Array.from(previewCopyMenu.querySelectorAll('[data-copy-action]')) : [];
    /*
      Copiar dejó de ser cosa de cada panel: el botón de la cabecera copia el
      documento en el formato elegido, igual que Exportar lo escribe en un
      archivo, y el Markdown es un formato más de la lista.
    */
    const COPY_ACTIONS = ['markdown', 'html', 'latex-preview', 'latex-full'];
    markdownCharCounterEl = document.getElementById('markdown-char-counter');
    let currentCopyAction = safeLocalStorageGet(COPY_ACTION_KEY);
    if (!COPY_ACTIONS.includes(currentCopyAction)) currentCopyAction = 'html';
    const copyActionLabelKeys = {
        markdown: 'copy_menu_option_markdown',
        html: 'copy_menu_option_html',
        'latex-preview': 'copy_menu_option_latex_preview',
        'latex-full': 'copy_menu_option_latex_full'
    };
    const copyActionFallbackTexts = {
        markdown: 'Copy Markdown',
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
    /*
      El botón copia de un clic el último formato elegido, así que tiene que
      decir cuál es: un rótulo corto —Markdown, HTML, LaTeX— junto al icono, en
      gris y pequeño, que informa sin pesar como un botón con nombre.
    */
    const copyFormatShortKeys = {
        markdown: ['copy_format_markdown', 'Markdown'],
        html: ['copy_format_html', 'HTML'],
        'latex-preview': ['copy_format_latex', 'LaTeX'],
        'latex-full': ['copy_format_latex_full', 'LaTeX completo'],
    };

    function updateCopyButtonLabel(action) {
        if (!copyHtmlBtn) return;
        const [clave, respaldo] = copyFormatShortKeys[action] || copyFormatShortKeys.html;
        const formato = getTranslation(clave, respaldo);
        // «Todo el documento» y no solo lo seleccionado: es la duda que tiene
        // cualquiera ante un botón de copiar con el cursor dentro del texto.
        const titleText = formatTranslation(
            'copy_btn_title_format',
            'Copiar todo el documento como {format}',
            { format: formato },
        );
        copyHtmlBtn.setAttribute('title', titleText);
        copyHtmlBtn.setAttribute('aria-label', titleText);
        copyHtmlBtn.setAttribute('data-current-copy-action', action);
        const labelEl = copyHtmlBtn.querySelector('.copy-html-btn-label');
        if (labelEl) labelEl.textContent = formato;
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
            // Con «invisible» y no «hidden» sigue ocupando su hueco: los atajos
            // de las cuatro filas quedan alineados con el de la marcada.
            if (check) check.classList.toggle('invisible', !isActive);
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

    /*
      Exportar, igual que copiar: el botón repite de un clic el último formato
      —que es lo que se hace casi siempre, entregar el mismo documento en el
      mismo formato— y lo dice en un rótulo pequeño, para que nadie tenga que
      abrir la lista solo para comprobar cuál saldría. De partida, DOCX: es el
      primero de la lista y el único que casi todo el mundo puede abrir.
    */
    const EXPORT_FORMATS = ['docx', 'odt', 'epub', 'html-download', 'latex-full-download', 'pdf'];
    const exportFormatShortKeys = {
        docx: ['export_menu_option_docx', 'DOCX'],
        odt: ['export_menu_option_odt', 'ODT'],
        epub: ['export_menu_option_epub', 'EPUB'],
        'html-download': ['export_menu_option_html_download', 'HTML'],
        'latex-full-download': ['export_menu_option_latex_full_download', 'TEX'],
        pdf: ['export_menu_option_pdf', 'PDF'],
    };
    let currentExportFormat = safeLocalStorageGet(EXPORT_FORMAT_KEY);
    if (!EXPORT_FORMATS.includes(currentExportFormat)) currentExportFormat = 'docx';

    function updateExportButtonLabel(format) {
        if (!exportQuickBtn) return;
        const [clave, respaldo] = exportFormatShortKeys[format] || exportFormatShortKeys.docx;
        const formato = getTranslation(clave, respaldo);
        const titleText = formatTranslation(
            'export_btn_title_format',
            'Exportar el documento a {format} (Ctrl+Alt+E para la lista)',
            { format: formato },
        );
        exportQuickBtn.setAttribute('title', titleText);
        exportQuickBtn.setAttribute('aria-label', titleText);
        exportQuickBtn.setAttribute('data-current-export-format', format);
        const labelEl = exportQuickBtn.querySelector('.export-quick-btn-label');
        if (labelEl) labelEl.textContent = formato;
    }

    function updateExportOptionStyles(format) {
        if (!exportQuickMenu) return;
        exportQuickMenu.querySelectorAll('[data-export-format]').forEach((option) => {
            const activa = option.getAttribute('data-export-format') === format;
            option.setAttribute('aria-checked', activa ? 'true' : 'false');
            option.classList.toggle('font-semibold', activa);
            const marca = option.querySelector('.export-check');
            if (marca) marca.classList.toggle('invisible', !activa);
        });
    }

    function applyExportFormatState(format, { persist = true } = {}) {
        const usable = EXPORT_FORMATS.includes(format) ? format : 'docx';
        currentExportFormat = usable;
        if (persist) safeLocalStorageSet(EXPORT_FORMAT_KEY, usable);
        updateExportButtonLabel(usable);
        updateExportOptionStyles(usable);
    }

    window.__updateExportButtonLabel = () => {
        updateExportButtonLabel(currentExportFormat);
        updateExportOptionStyles(currentExportFormat);
    };

    applyExportFormatState(currentExportFormat, { persist: false });

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
    const exportFormatFields = document.getElementById('export-format-fields');
    const docFormatFields = document.getElementById('doc-format-fields');
    const docOwnLanguage = document.getElementById('doc-own-language');
    const docOwnLanguageCode = document.getElementById('doc-own-language-code');
    const docOwnLanguageRow = document.getElementById('doc-own-language-code-row');
    const docOwnAuthor = document.getElementById('doc-own-author');
    const docOwnToc = document.getElementById('doc-own-toc');
    const docOwnTocDepth = document.getElementById('doc-own-toc-depth');
    const docOwnNumberSections = document.getElementById('doc-own-numbersections');
    const docFormatOverlay = document.getElementById('doc-format-modal-overlay');
    const docFormatToolbarBtn = document.getElementById('doc-format-toolbar-btn');
    const docFormatSaveBtn = document.getElementById('doc-format-save-btn');
    const docFormatCancelBtn = document.getElementById('doc-format-cancel-btn');
    const docFormatResetBtn = document.getElementById('doc-format-reset-btn');
    const docFormatProfileSelect = document.getElementById('doc-format-profile');
    const docFormatProfileApplyBtn = document.getElementById('doc-format-profile-apply');
    const docFormatProfileSaveBtn = document.getElementById('doc-format-profile-save');
    const docFormatProfileDeleteBtn = document.getElementById('doc-format-profile-delete');
    const docFormatProfileForm = document.getElementById('doc-format-profile-form');
    const docFormatProfileName = document.getElementById('doc-format-profile-name');
    const docFormatProfileError = document.getElementById('doc-format-profile-error');
    const docFormatProfileCancelBtn = document.getElementById('doc-format-profile-cancel');
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
    const docTocDepthSelect = document.getElementById('doc-toc-depth');
    const docNumberingCheckbox = document.getElementById('doc-number-sections');
    const bibliographyChooseBtn = document.getElementById('bibliography-choose-btn');
    const bibliographyExampleBtn = document.getElementById('bibliography-example-btn');
    const bibliographyAddArticleBtn = document.getElementById('bibliography-add-article-btn');
    const bibliographyRemoveBtn = document.getElementById('bibliography-remove-btn');
    const bibliographyInput = document.getElementById('bibliography-input');
    const bibliographySummary = document.getElementById('bibliography-summary');
    const bibliographyArticleForm = document.getElementById('bibliography-article-form');
    const bibliographyArticleCancelBtn = document.getElementById('bibliography-article-cancel-btn');
    const bibliographyArticleError = document.getElementById('bibliography-article-error');
    const bibliographyReferenceType = document.getElementById('bibliography-reference-type');
    const bibliographyReferenceContainerLabel = document.getElementById('bibliography-reference-container-label');
    const bibliographyReferencePublisherLabel = document.getElementById('bibliography-reference-publisher-label');
    const bibliographyReferenceUrlLabel = document.getElementById('bibliography-reference-url-label');
    const bibliographyArticleKey = document.getElementById('bibliography-article-key');
    const bibliographyArticleAuthor = document.getElementById('bibliography-article-author');
    const bibliographyArticleTitle = document.getElementById('bibliography-article-title');
    const bibliographyArticleJournal = document.getElementById('bibliography-article-journal');
    const bibliographyArticleYear = document.getElementById('bibliography-article-year');
    const bibliographyArticleDoi = document.getElementById('bibliography-article-doi');
    const bibliographyArticleUrl = document.getElementById('bibliography-article-url');
    const bibliographyReferenceEditor = document.getElementById('bibliography-reference-editor');
    const bibliographyReferencePublisher = document.getElementById('bibliography-reference-publisher');
    const bibliographyReferenceInstitution = document.getElementById('bibliography-reference-institution');
    const bibliographyReferenceVolume = document.getElementById('bibliography-reference-volume');
    const bibliographyReferenceNumber = document.getElementById('bibliography-reference-number');
    const bibliographyReferencePages = document.getElementById('bibliography-reference-pages');
    const bibliographyReferenceEdition = document.getElementById('bibliography-reference-edition');
    const bibliographyReferencePlace = document.getElementById('bibliography-reference-place');
    const bibliographyReferenceIsbn = document.getElementById('bibliography-reference-isbn');
    const bibliographyReferenceAccessed = document.getElementById('bibliography-reference-accessed');
    const bibliographyTitleInput = document.getElementById('bibliography-title');
    const bibliographyHeadingLevelSelect = document.getElementById('bibliography-heading-level');
    const cslChooseBtn = document.getElementById('csl-choose-btn');
    const cslRemoveBtn = document.getElementById('csl-remove-btn');
    const cslInput = document.getElementById('csl-input');
    const cslSummary = document.getElementById('csl-summary');
    const citationStyleSelect = document.getElementById('citation-style-select');
    const cslCustomPicker = document.getElementById('csl-custom-picker');
    const citationBtn = document.getElementById('citation-btn');
    const citationOverlay = document.getElementById('citation-modal-overlay');
    const citationModalTitle = document.getElementById('citation-modal-title');
    const citationSearch = document.getElementById('citation-search');
    const citationResults = document.getElementById('citation-results');
    const citationResultCount = document.getElementById('citation-result-count');
    const citationMode = document.getElementById('citation-mode');
    const citationLocator = document.getElementById('citation-locator');
    const citationLibraryReady = document.getElementById('citation-library-ready');
    const citationLibraryEmpty = document.getElementById('citation-library-empty');
    const citationLoadExampleBtn = document.getElementById('citation-load-example-btn');
    const citationOpenSettingsBtn = document.getElementById('citation-open-settings-btn');
    const citationAddReferenceBtn = document.getElementById('citation-add-reference-btn');
    const citationStyleSummary = document.getElementById('citation-style-summary');
    const citationOpenStyleBtn = document.getElementById('citation-open-style-btn');
    const citationReferenceSlot = document.getElementById('citation-reference-slot');
    const citationInsertBtn = document.getElementById('citation-insert-btn');
    const citationCancelBtn = document.getElementById('citation-cancel-btn');
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
    const MAX_BIBLIOGRAPHY_BYTES = 2 * 1024 * 1024;
    const MAX_CSL_BYTES = 1024 * 1024;
    let pendingBibliography = { content: '', name: '', entries: [] };
    let pendingCsl = { content: '', name: '' };
    let citationEntries = [];
    let selectedCitationIds = new Set();
    let editingCitationElement = null;
    let editingCitationRange = null;
    const latexClassSelect = document.getElementById('latex-documentclass');
    const latexClassOptionsInput = document.getElementById('latex-classoption');
    const latexPreambleTextarea = document.getElementById('latex-preamble');
    const latexSettingsSaveBtn = document.getElementById('latex-settings-save-btn');
    const latexSettingsCancelBtn = document.getElementById('latex-settings-cancel-btn');
    const latexSettingsResetBtn = document.getElementById('latex-settings-reset-btn');
    const statusToastEl = document.getElementById('status-toast');
    const statusToastMessageEl = document.getElementById('status-toast-message');
    let statusToastTimer = null;


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
            fitMenuInViewport(menu);
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

    const closeFormulaOptions = () => {
        if (formulaOptions) formulaOptions.classList.add('hidden');
        if (formulaBtn) formulaBtn.setAttribute('aria-expanded', 'false');
    };
    const openFormulaOptions = () => {
        if (!formulaOptions) return;
        formulaOptions.classList.remove('hidden');
        fitMenuInViewport(formulaOptions);
        if (formulaBtn) formulaBtn.setAttribute('aria-expanded', 'true');
        const firstBtn = formulaOptionButtons[0];
        if (firstBtn) firstBtn.focus();
    };

    if (formulaBtn) {
        formulaBtn.setAttribute('aria-expanded', 'false');
        formulaBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            /*
              Sobre la hoja no hay nada que elegir antes de escribir: la
              ventana trae los delimitadores como una opción más, en línea y
              con `\(...\)` de partida.
            */
            if (isPreviewFormatTarget()) {
                closeFormulaOptions();
                toggleMathModal(true, { family: 'bracket', block: false, tex: previewSelectedText() });
                return;
            }
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
    function generalDocumentLanguage() {
        const settings = window.__edimarkLatexSettings || {};
        const chosen = String(settings.documentLanguage || '').trim();
        if (chosen && chosen !== 'auto') return chosen;
        return window.__edimarkLang || document.documentElement.lang || 'es';
    }

    /*
      El idioma efectivo, en la barra de estado y siempre: es el que se va a
      declarar en los cinco formatos, y hasta ahora había que abrir el cuadro
      para saberlo. Apagado cuando lo hereda de las opciones generales.
    */
    function updateDocLanguageStatus(effective, own) {
        const button = document.getElementById('doc-language-status');
        const code = document.getElementById('doc-language-status-code');
        if (!button || !code) return;
        // El código, siempre igual escrito: la píldora lo enseña en mayúsculas
        // y el rótulo emergente diría `es` donde se lee `ES`.
        const shown = effective.toUpperCase();
        code.textContent = shown;
        button.classList.toggle('is-inherited', !own);
        button.title = own
            ? getTranslation(
                'doc_language_status_own',
                'Idioma de este documento: {code}. Pulsa para cambiarlo.',
            ).replace('{code}', shown)
            : getTranslation(
                'doc_language_status_inherited',
                'Idioma heredado de las opciones generales: {code}. Pulsa para darle uno propio.',
            ).replace('{code}', shown);
    }

    function refreshDocLanguageIndicator() {
        if (!markdownEditor) return;
        const own = splitDocumentFrontMatter(markdownEditor.getValue()).lang;
        const effective = own || generalDocumentLanguage();
        if (markdownTextareaEl) markdownTextareaEl.setAttribute('lang', effective);
        updateDocLanguageStatus(effective, own);
        applySpellChecking(effective);
        // El bloque de metadatos también lleva el formato, y se edita a mano.
        if (typeof window.__applyDocumentFormatToPreview === 'function') {
            window.__applyDocumentFormatToPreview();
        }
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

    // El cuadro del documento necesita leer y escribir estos dos.
    window.__documentOwnSettings = {
        language: () => splitDocumentFrontMatter(markdownEditor.getValue()).lang,
        author: currentDocumentAuthor,
        setLanguage: setDocumentLanguage,
        setAuthor: setDocumentAuthor,
    };

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
    if (nativeMode) {
        /*
          En el navegador la página cuenta visitas agregadas; la aplicación de
          escritorio no envía nada. El aviso de privacidad tiene que decir lo
          que de verdad ocurre donde se está leyendo, así que aquí cambia de
          texto (y de clave, para que siga traduciéndose al cambiar de idioma).
        */
        const privacyNotice = document.getElementById('about-privacy-notice');
        if (privacyNotice) {
            privacyNotice.setAttribute('data-i18n-key', 'footer_privacy_notice_desktop');
            privacyNotice.textContent = getTranslation(
                'footer_privacy_notice_desktop',
                'Los archivos se procesan localmente en tu equipo. La aplicación no recoge estadísticas de uso ni envía archivos o datos a terceros.',
            );
        }
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
        // El de cerrar solo tiene sentido con un instalador ya lanzado.
        if (updateQuitBtn) updateQuitBtn.hidden = true;
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
                    'Descargado en {path}. Cierra EdiMarkWeb y sustituye tu AppImage por este archivo.',
                    { path },
                )
                : getTranslation(
                    'update_ready_installer',
                    'El instalador ya está abierto. Cierra EdiMarkWeb para que pueda sustituir los archivos y vuelve a abrirlo al terminar.',
                );
            if (updateBannerMessage) updateBannerMessage.textContent = message;
            reportStatus(message);
            if (updateInstallBtn) updateInstallBtn.hidden = true;
            /*
              Y un botón para cerrar aquí mismo: el instalador no puede
              sustituir los archivos de una aplicación que sigue abierta, y
              hasta ahora el aviso lo contaba pero había que ir a buscar Salir
              en el menú. Reiniciar sola no puede: el instalador es otro
              proceso, tarda lo que tarde y puede pedir contraseña.
            */
            if (updateQuitBtn) updateQuitBtn.hidden = false;
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
    if (updateQuitBtn) {
        updateQuitBtn.addEventListener('click', () => {
            // Lo que se esté escribiendo se guarda antes de cerrar, igual que
            // en Salir: entre dos tics del temporizador caben tres segundos.
            autosaveCurrentDoc();
            const platform = window.EdiMarkPlatform;
            if (!platform || typeof platform.quitApplication !== 'function') return;
            platform.quitApplication().catch((error) => {
                console.error('No se pudo cerrar la aplicación:', error);
            });
        });
    }
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
    if (spellcheckToggleBtn) {
        /*
          El icono se busca cada vez y no se guarda en una variable: el SVG que
          escribe Lucide conserva su `data-lucide`, así que la siguiente llamada
          a `createIcons()` lo sustituye por otro y la referencia guardada se
          queda apuntando a un nodo que ya no está en la página. Con ella, el
          corrector se apagaba de verdad pero la marca no se movía.
        */
        const syncSpellcheckToggle = () => {
            const enabled = spellCheckEnabled();
            spellcheckToggleBtn.setAttribute('aria-checked', enabled ? 'true' : 'false');
            const check = spellcheckToggleBtn.querySelector('.submenu-check');
            if (check) check.classList.toggle('hidden', !enabled);
        };
        syncSpellcheckToggle();
        spellcheckToggleBtn.addEventListener('click', () => {
            safeLocalStorageSet(SPELLCHECK_KEY, spellCheckEnabled() ? '0' : '1', { notify: false });
            syncSpellcheckToggle();
            applySpellChecking(markdownTextareaEl ? markdownTextareaEl.getAttribute('lang') : '');
            closeSettingsMenu();
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
        const hideDesktopWindowControls = (hidden) => {
            [desktopWindowBtn, desktopWindowToolbarBtn, desktopWindowSeparator].forEach((element) => {
                if (element) element.classList.toggle('hidden', hidden);
            });
        };
        hideDesktopWindowControls(true);
        if (browserDesktopMode && !nativeMode && !desktopSpawned && (!window.opener || window.opener.closed)) {
            const spawned = openDesktopWindow(true);
            if (spawned) {
                try { window.close(); } catch (_) {}
                return;
            }
            hideDesktopWindowControls(false);
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
            notifyUser(getTranslation('edicuatex_popup_blocked', 'Activa las ventanas emergentes en tu navegador para usar EdiCuaTeX.'));
            return;
        }
        edicuatexWindow = child;
        child.focus();
    }

    if (openEdicuatexBtn) {
        openEdicuatexBtn.addEventListener('click', (event) => openEdicuatex(event));
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
            toggleExportMenu();
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
                closeExportQuickMenu();
                // Elegir en la lista es también decir cuál repetirá el botón.
                if (format) applyExportFormatState(format);
                // El PDF sale del diálogo de impresión, no de Pandoc.
                if (format === 'pdf') {
                    printPreview();
                    return;
                }
                if (format) performExport(format);
            });
        });
    }

    if (exportQuickBtn) {
        // Un clic: el formato de siempre, sin abrir nada.
        exportQuickBtn.addEventListener('click', (event) => {
            event.preventDefault();
            closeExportQuickMenu();
            if (currentExportFormat === 'pdf') {
                printPreview();
                return;
            }
            performExport(currentExportFormat);
        });
    }

    if (exportQuickToggleBtn) {
        exportQuickToggleBtn.setAttribute('aria-expanded', 'false');
        exportQuickToggleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleExportQuickMenu();
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });
        exportQuickToggleBtn.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!isExportQuickMenuOpen()) openExportQuickMenu();
                exportQuickMenu?.querySelector('[data-export-format]')?.focus();
            }
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
    }

    if (exportQuickContainer) {
        document.addEventListener('click', (event) => {
            if (!isExportQuickMenuOpen()) return;
            if (!exportQuickContainer.contains(event.target)) {
                closeExportQuickMenu();
            }
        }, { capture: true });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        let handled = false;
        if (isExportMenuOpen()) {
            closeExportMenu();
            if (exportMenuBtn) exportMenuBtn.focus();
            handled = true;
        }
        if (isExportQuickMenuOpen()) {
            closeExportQuickMenu();
            if (exportQuickToggleBtn) exportQuickToggleBtn.focus();
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
        if (isHelpMenuOpen()) {
            closeHelpMenu();
            if (helpMenuBtn) helpMenuBtn.focus();
            handled = true;
        }
        if (isSettingsMenuOpen()) {
            closeSettingsMenu();
            if (settingsMenuBtn) settingsMenuBtn.focus();
            handled = true;
        }
        if (handled) event.preventDefault();
    });

    /*
      Manual, «Acerca de» y las actualizaciones bajo un solo botón: eran dos
      circulitos idénticos —una interrogación y una i— pegados en la barra, que
      sin rótulo no se distinguían, y su contenido es el mismo asunto.
    */
    function isHelpMenuOpen() {
        return helpMenu && !helpMenu.classList.contains('hidden');
    }

    function openHelpMenu() {
        if (!helpMenu) return;
        closeActionsMenu();
        closeSettingsMenu();
        closeExportMenu();
        closeExportQuickMenu();
        closePreviewCopyMenu();
        helpMenu.classList.remove('hidden');
        fitMenuInViewport(helpMenu);
        if (helpMenuBtn) helpMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeHelpMenu() {
        if (!helpMenu) return;
        helpMenu.classList.add('hidden');
        if (helpMenuBtn) helpMenuBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleHelpMenu() {
        if (isHelpMenuOpen()) closeHelpMenu();
        else openHelpMenu();
    }

    if (helpMenuBtn) {
        helpMenuBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleHelpMenu();
        });
    }
    if (helpMenu) {
        helpMenu.querySelectorAll('[role="menuitem"]').forEach((item) => {
            item.addEventListener('click', () => closeHelpMenu());
        });
    }
    if (helpMenuContainer) {
        document.addEventListener('click', (event) => {
            if (!isHelpMenuOpen()) return;
            if (!helpMenuContainer.contains(event.target)) closeHelpMenu();
        }, { capture: true });
    }

    function isActionsMenuOpen() {
        return actionsMenu && !actionsMenu.classList.contains('hidden');
    }

    function openActionsMenu() {
        if (!actionsMenu) return;
        closeExportMenu();
        closeExportQuickMenu();
        closeHelpMenu();
        closePreviewCopyMenu();
        closeSettingsMenu();
        actionsMenu.classList.remove('hidden');
        fitMenuInViewport(actionsMenu);
        if (actionsMenuBtn) actionsMenuBtn.setAttribute('aria-expanded', 'true');
    }

    function closeActionsMenu() {
        if (!actionsMenu) return;
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
        closeExportQuickMenu();
        closeHelpMenu();
        closeExportMenu();
        closePreviewCopyMenu();
        settingsMenu.classList.remove('hidden');
        fitMenuInViewport(settingsMenu);
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
        closeExportQuickMenu();
        closeSettingsMenu();
        closeActionsMenu();
        closeHelpMenu();
        exportMenu.classList.remove('hidden');
        fitMenuInViewport(exportMenu);
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

    function isExportQuickMenuOpen() {
        return exportQuickMenu && !exportQuickMenu.classList.contains('hidden');
    }

    function openExportQuickMenu() {
        if (!exportQuickMenu) return;
        closeExportMenu();
        closePreviewCopyMenu();
        closeSettingsMenu();
        closeActionsMenu();
        closeHelpMenu();
        exportQuickMenu.classList.remove('hidden');
        fitMenuInViewport(exportQuickMenu);
        if (exportQuickToggleBtn) exportQuickToggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeExportQuickMenu() {
        if (!exportQuickMenu) return;
        exportQuickMenu.classList.add('hidden');
        if (exportQuickToggleBtn) exportQuickToggleBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleExportQuickMenu() {
        if (!exportQuickMenu) return;
        if (isExportQuickMenuOpen()) {
            closeExportQuickMenu();
        } else {
            openExportQuickMenu();
        }
    }

    function isPreviewCopyMenuOpen() {
        return previewCopyMenu && !previewCopyMenu.classList.contains('hidden');
    }

    function openPreviewCopyMenu() {
        if (!previewCopyMenu) return;
        closeExportMenu();
        closeExportQuickMenu();
        closeActionsMenu();
        closeSettingsMenu();
        previewCopyMenu.classList.remove('hidden');
        fitMenuInViewport(previewCopyMenu);
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
        const html = isPreviewVisible() ? buildHtmlWithTex() : (htmlEditor ? htmlEditor.getValue() : '');
        await copyRich(html, copyHtmlBtn);
    }

    async function copyLatexFromPreview(includePreamble) {
        const exporter = window.PandocExporter;
        if (!exporter || typeof exporter.generateLatex !== 'function') {
            notifyUser(getTranslation('export_error', 'Error durante la exportación.'));
            return;
        }
        const rawMarkdown = markdownEditor && typeof markdownEditor.getValue === 'function'
            ? markdownEditor.getValue()
            : '';
        const prepared = typeof exporter.trimInlineMath === 'function'
            ? exporter.trimInlineMath(rawMarkdown)
            : rawMarkdown;
        if (!prepared.trim()) {
            notifyUser(getTranslation('no_content', 'No hay contenido para exportar.'));
            updateExportStatus('');
            return;
        }
        try {
            const latexResult = await exporter.generateLatex({
                markdown: rawMarkdown,
                standalone: Boolean(includePreamble),
                onStatus: updateExportStatus,
                onNotification: (message) => {
                    if (message) notifyUser(message);
                },
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
        if (usableAction === 'markdown') {
            await copyPlain(markdownEditor.getValue(), copyHtmlBtn);
            const successMessage = getCopySuccessMessage('markdown');
            if (successMessage) updateExportStatus(successMessage);
        } else if (usableAction === 'html') {
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
            notifyUser(getTranslation('no_content', 'No hay contenido para exportar.'));
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
                        if (message) notifyUser(message);
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
                        onNotification: (message) => {
                            if (message) notifyUser(message);
                        },
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
                notifyUser(getTranslation('desktop_window_popup_blocked', 'Activa las ventanas emergentes en tu navegador para abrir la ventana independiente.'));
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
    if (desktopWindowToolbarBtn) {
        desktopWindowToolbarBtn.addEventListener('click', () => openDesktopWindow());
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
        /*
          EdiCuaTeX manda la fórmula ya envuelta cuando allí se ha elegido un
          delimitador; si no, llega el LaTeX pelado y hay que ponerle uno o
          entraría en el documento como texto corriente.
        */
        const insertion = event.data.wrapped || (event.data.latex ? `\\(${event.data.latex}\\)` : '');
        if (!insertion) return;
        requestAnimationFrame(() => {
            insertRawContent(insertion);
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
        /*
          Los delimitadores son los mismos que escribe la barra en el panel
          Markdown: sin esto, tocar una palabra en la hoja reescribía de paso
          todas las listas del documento con `*` y la cursiva con `_`, y el
          archivo cambiaba entero por poner una negrita.
        */
        turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '*',
        });
        turndownService.addRule('edimarkCitation', {
            filter: node => node.nodeName === 'SPAN' && node.hasAttribute('data-edimark-citation'),
            replacement: (content, node) => node.getAttribute('data-edimark-citation') || content,
        });
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
            /*
              La casilla de una tarea solo la reconocía Turndown colgando
              directamente del elemento de lista, y en una lista con línea en
              blanco entre puntos marked la mete dentro de un párrafo: la
              casilla se perdía y `- [ ] tarea` volvía convertida en `- tarea`.
              Antes hacía falta escribir en la hoja para toparse con ello;
              ahora basta con poner una negrita desde allí.
            */
            turndownService.addRule('edimarkTaskCheckbox', {
                filter: node => node.nodeName === 'INPUT'
                    && node.type === 'checkbox'
                    && typeof node.closest === 'function'
                    && !!node.closest('li'),
                replacement: (content, node) => (node.checked ? '[x] ' : '[ ] '),
            });
        }
        /*
          Y la sangría: Turndown separa el guion del texto con tres espacios,
          mientras que la barra escribe `- uno`. La continuación se sangra con
          lo que ocupe el prefijo, que es lo que mantiene anidado lo que iba
          anidado.
        */
        turndownService.addRule('edimarkListItem', {
            filter: 'li',
            replacement: (content, node, options) => {
                const parent = node.parentNode;
                let prefix = `${options.bulletListMarker} `;
                if (parent && parent.nodeName === 'OL') {
                    const start = parent.getAttribute('start');
                    const index = Array.prototype.indexOf.call(parent.children, node);
                    prefix = `${start ? Number(start) + index : index + 1}. `;
                }
                const cuerpo = content
                    .replace(/^\n+/, '')
                    .replace(/\n+$/, '\n')
                    .replace(/\n/gm, `\n${' '.repeat(prefix.length)}`)
                    // Una línea con solo sangría es una línea en blanco.
                    .replace(/\n[ \t]+(?=\n)/g, '\n')
                    // La casilla ya trae su espacio; el texto, el suyo.
                    .replace(/^(\[[ x]\])\s+/, '$1 ');
                return prefix + cuerpo + (node.nextSibling && !/\n$/.test(cuerpo) ? '\n' : '');
            },
        });
    }

    const markdownTextarea = document.getElementById('markdown-input');
    markdownTextareaEl = markdownTextarea;
    const baseMarkdownEditor = markdownTextarea ? createTextareaEditor(markdownTextarea) : null;
    markdownEditor = baseMarkdownEditor ? createBase64AwareEditor(baseMarkdownEditor, markdownTextarea) : null;
    if (markdownTextarea) {
        markdownTextarea.focus();
        markdownTextarea.addEventListener('focusin', () => setFormatTarget('markdown'));
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
    
    /*
      El ancho de la aplicación. El HTML ya arranca expandido, que es lo que
      quiere casi todo el mundo y lo único donde una hoja A4 cabe a tamaño real
      junto al editor; aquí solo se deshace si el usuario dijo lo contrario. La
      transición del ancho se retira mientras se aplica lo guardado, o la
      página abriría encogiéndose a la vista.
    */
    const applyExpandedWidth = (expanded) => {
        mainContainer.classList.toggle('is-expanded', expanded);
        const iconHost = toggleWidthBtn.querySelector('.width-icon');
        if (iconHost) {
            const iconName = expanded ? 'minimize' : 'maximize';
            iconHost.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400"></i>`;
        }
        if (window.lucide) lucide.createIcons();
    };

    if (safeLocalStorageGet(EXPANDED_WIDTH_KEY, '1') !== '1') {
        mainContainer.style.transition = 'none';
        applyExpandedWidth(false);
        // Devuelta en el fotograma siguiente, ya con el ancho puesto.
        requestAnimationFrame(() => { mainContainer.style.removeProperty('transition'); });
    }

    toggleWidthBtn.addEventListener('click', () => {
        const expanded = !mainContainer.classList.contains('is-expanded');
        applyExpandedWidth(expanded);
        safeLocalStorageSet(EXPANDED_WIDTH_KEY, expanded ? '1' : '0');
        closeSettingsMenu();
    });

    /*
      Y el reparto de los paneles se rehace cuando el ancho nuevo ha llegado
      del todo: la transición dura medio segundo, y con una medida de en medio
      saldría un reparto que no corresponde a ninguno de los dos anchos.
    */
    mainContainer.addEventListener('transitionend', (evento) => {
        if (evento.target !== mainContainer || evento.propertyName !== 'max-width') return;
        ajustarRepartoDePaneles();
    });

    // --- Gestión del tema (sistema / claro / oscuro) ---
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
    splitDePaneles = Split(['#markdown-panel', '#html-panel'], {
        sizes: repartoDePanelesPorDefecto(),
        minSize: ANCHO_MINIMO_DE_PANEL,
        gutterSize: GUTTER_DE_PANELES,
        onDrag: () => { markdownEditor.refresh(); htmlEditor.refresh(); },
        /*
          Lo que deja el usuario al soltar manda desde ese momento: sin
          guardarlo, ir a un solo panel y volver a los dos devolvía el reparto
          de partida y se perdía el suyo.
        */
        onDragEnd: () => { repartoDeLosPaneles = splitDePaneles.getSizes(); }
    });
    currentLayout = safeLocalStorageGet(LAYOUT_KEY, 'dual');
    applyLayout(currentLayout);

    // --- Las lupas de los dos paneles ---
    [
      [PREVIEW_ZOOM, previewZoomOutBtn, previewZoomResetBtn, previewZoomInBtn],
      [MARKDOWN_ZOOM, markdownZoomOutBtn, markdownZoomResetBtn, markdownZoomInBtn],
    ].forEach(([panel, menos, cien, mas]) => {
        applyZoom(panel, safeLocalStorageGet(panel.storageKey, 1), { persist: false });
        if (menos) menos.addEventListener('click', () => stepZoom(panel, -1));
        // A mano: con el panel atado, tocar la lupa aparta el separador.
        if (cien) cien.addEventListener('click', () => applyZoom(panel, 1, { aMano: true }));
        if (mas) mas.addEventListener('click', () => stepZoom(panel, 1));
    });

    /*
      El interruptor que ata el panel a la lupa. Encendido mientras nadie diga
      lo contrario: es lo que hace que la página se vea entera sin tener que
      pensar en ello.
    */
    const previewLinkToggle = document.getElementById('preview-link-toggle');
    atarPanelALaLupa(safeLocalStorageGet(PANEL_ATADO_KEY, '1') === '1', { persist: false });
    if (previewLinkToggle) {
        previewLinkToggle.addEventListener('click', () => atarPanelALaLupa(!panelAtadoALaLupa));
    }

    // El exportador los consulta al generar LaTeX, no al arrancar, pero
    // publicarlos aquí evita que la primera exportación salga sin ellos.
    publishLatexSettings(readLatexSettings());
    // Y en el escritorio, lo guardado en el disco sustituye a lo del webview en
    // cuanto se ha leído: lo que dependa de ello se vuelve a pintar.
    loadLatexSettingsFromDisk().then((settings) => {
        if (!settings) return;
        publishLatexSettings(effectiveLatexSettings());
        if (typeof window.__refreshDocLanguageIndicator === 'function') {
            window.__refreshDocLanguageIndicator();
        }
        if (typeof window.__applyDocumentFormatToPreview === 'function') {
            window.__applyDocumentFormatToPreview();
        }
    }).catch(error => console.warn('No se han podido leer las opciones del disco:', error));

    // --- Carga inicial de documentos y autoguardado ---
    /*
      Un archivo que ya está abierto no se abre otra vez: se va a su pestaña.
      Abrirlo dos veces dejaba dos pestañas del mismo documento, cada una con su
      copia, y guardar en una pisaba lo escrito en la otra.

      Si el disco trae algo distinto y la pestaña no tiene nada sin guardar, se
      refresca: quien abre un documento quiere ver lo que hay en él. Con cambios
      sin guardar no se toca —perderlos por un doble clic sería el peor de los
      resultados—; solo se activa y se avisa en la barra de estado.
    */
    function reuseOpenedMarkdownDocument(opened) {
        const path = opened?.path || '';
        if (!path) return null;
        const existente = docs.find(doc => doc.filePath === path);
        if (!existente) return null;
        const enDisco = normalizeNewlines(opened.content || '');
        const enEdicion = existente.id === currentId && markdownEditor
            ? markdownEditor.getValue()
            : existente.md;
        const sinGuardar = enEdicion !== existente.lastSaved;
        if (sinGuardar) {
            reportStatus(getTranslation(
                'open_file_already_open_dirty',
                'Ese documento ya está abierto y tiene cambios sin guardar: se deja como está.',
            ));
        } else if (enDisco !== existente.lastSaved) {
            existente.md = enDisco;
            existente.lastSaved = enDisco;
            lastAutosavedById.set(existente.id, enDisco);
            autosaveDoc(existente.id, enDisco);
        }
        switchTo(existente.id);
        updateDirtyIndicator(existente.id, sinGuardar);
        return existente;
    }

    function addOpenedMarkdownDocument(opened) {
        if (!opened) return null;
        const yaAbierto = reuseOpenedMarkdownDocument(opened);
        if (yaAbierto) return yaAbierto;
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

    // El arrastre del escritorio abre por el mismo camino que el doble clic.
    window.__edimarkOpenNativePaths = openNativeMarkdownPaths;

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
            const filePath = platform?.isDesktop && typeof docInfo.filePath === 'string' ? docInfo.filePath : '';
            docs.push({ ...docInfo, filePath, md: normalized, lastSaved: normalized });
            // Lo recién leído ya está guardado: no hay que reescribirlo.
            lastAutosavedById.set(docInfo.id, normalized);
            addTabElement(docInfo);
        });
        /*
          A la pestaña donde se estaba, si sigue existiendo: cerrarla en la
          sesión anterior, o abrir la aplicación en otro navegador, deja un
          identificador que ya no está en la lista, y entonces vale la primera.
        */
        const guardada = safeLocalStorageGet(ACTIVE_DOC_KEY, '');
        const inicial = docs.some(d => d.id === guardada) ? guardada : docs[0].id;
        switchTo(inicial);
        if (!platform?.isDesktop) {
            docs.forEach(doc => {
                restorePersistedDocumentAssets(doc).catch(error => {
                    console.warn('No se pudieron recuperar las imágenes guardadas:', error);
                });
            });
        }
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
        e.stopPropagation();
        headingOptions.classList.toggle('hidden');
        fitMenuInViewport(headingOptions);
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

    layoutSwitchButtons.forEach((button) => {
      button.addEventListener('click', () => applyLayout(button.dataset.layout || 'dual'));
    });

    const closeLayoutMenu = () => {
      if (layoutMenu) layoutMenu.classList.add('hidden');
      if (layoutMenuBtn) layoutMenuBtn.setAttribute('aria-expanded', 'false');
    };
    if (layoutMenuBtn && layoutMenu) {
      layoutMenuBtn.addEventListener('click', () => {
        const willOpen = layoutMenu.classList.contains('hidden');
        layoutMenu.classList.toggle('hidden', !willOpen);
        if (willOpen) fitMenuInViewport(layoutMenu);
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
        const showingPreview = isPreviewVisible();
        const previewShell = getPreviewShell();
        cmWrapper.style.display = showingPreview ? 'block' : 'none';
        if (previewShell) previewShell.style.display = showingPreview ? 'none' : '';
        if (showingPreview) setTimeout(() => htmlEditor.refresh(), 1);
        // El rótulo del panel derecho dice lo que se está mirando.
        const panelTitleKey = showingPreview ? 'html_code_panel_title' : 'html_panel_title';
        const htmlPanelTitle = document.getElementById('html-panel-title');
        if (htmlPanelTitle) {
            htmlPanelTitle.setAttribute('data-i18n-key', panelTitleKey);
            htmlPanelTitle.textContent = getTranslation(
                panelTitleKey,
                showingPreview ? 'Código HTML' : 'Previsualización'
            );
        }
        viewToggleBtn.innerHTML = showingPreview ? '<i data-lucide="eye"></i>' : '<i data-lucide="code-2"></i>';
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
    
    /*
      Imprimir es también la manera de sacar un PDF: el diálogo del sistema lo
      ofrece como destino, y lo que se imprime es la vista previa tal cual, con
      sus fórmulas compuestas y su hoja de estilos de papel. Por eso el menú de
      exportación lleva aquí su entrada de PDF en vez de a Pandoc, que sin un
      motor LaTeX no sabe hacer PDF.
    */
    async function prepareCitationsForPrint() {
        const settings = effectiveLatexSettings();
        const markdown = markdownEditor.getValue();
        const hasCitation = /\[[^\]\n]*@[^\]\n]+\]|(?:^|[\s(])@[A-Za-z0-9][\w:./#$%&?+<>-]*/m.test(markdown);
        if (!settings.bibliographyContent || !hasCitation) return false;
        const exporter = window.PandocExporter;
        if (!exporter || typeof exporter.generateHtml !== 'function') return false;

        let previewChanged = false;
        try {
            updateExportStatus(getTranslation('citation_print_preparing', 'Resolviendo citas para el PDF, espera...'));
            const currentDoc = docs.find(doc => doc.id === currentId);
            const documentTitle = String(currentDoc?.name || 'documento').replace(/\.[^.]+$/, '');
            const citedHtml = await exporter.generateHtml({
                markdown,
                documentTitle,
                standalone: false,
                onStatus: updateExportStatus,
                onNotification: notifyUser,
            });
            const htmlOutput = document.getElementById('html-output');
            htmlOutput.innerHTML = citedHtml;
            previewChanged = true;
            fitWidePreformattedBlocks(htmlOutput);
            applyRelativeImageSources(htmlOutput, docs.find(doc => doc.id === currentId));
            if (window.renderMathInElement) {
                renderMathInElement(htmlOutput, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                    ],
                    throwOnError: false,
                });
            }
            refreshDocumentToc();
            schedulePageBreaks();
            await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
            return true;
        } catch (error) {
            console.warn('No se pudieron resolver las citas para imprimir:', error);
            if (previewChanged) updateHtml();
            notifyUser(getTranslation('citation_print_error', 'No se pudieron resolver las citas; se imprimirá la vista previa sin procesarlas.'));
            return false;
        }
    }

    async function printPreview() {
        closeActionsMenu();
        closeSettingsMenu();
        closeExportMenu();
        const citedPreview = await prepareCitationsForPrint();
        const preview = getPreviewScroller();
        if (preview) {
            preview.scrollTop = 0;
            preview.scrollLeft = 0;
        }
        // La espera deja que se cierren los menús antes de congelar la página.
        window.setTimeout(async () => {
            const platform = window.EdiMarkPlatform;
            try {
                if (platform && typeof platform.print === 'function') {
                    await platform.print(paginaParaImprimir());
                } else if (typeof window.print === 'function') {
                    window.print();
                }
            } catch (error) {
                console.warn('No se pudo imprimir:', error);
            } finally {
                if (citedPreview) updateHtml();
                updateExportStatus('');
            }
        }, 50);
    }
    printBtn.addEventListener('click', printPreview);
    if (htmlOutput) {
        htmlOutput.addEventListener('focusin', () => setFormatTarget('preview'));
        /*
          La selección de la hoja se guarda mientras se tiene: al pulsar un
          botón de la barra el foco se va con él y ya no habría nada que
          formatear.
        */
        document.addEventListener('selectionchange', capturePreviewSelection);
        /*
          Y sobre la hoja, lo mismo: dentro de un elemento de lista el
          tabulador lo mete un nivel y `Mayús`+`Tab` lo saca. Fuera de una
          lista se deja pasar, que es como se salta al siguiente control.
        */
        /*
          Y el punto vacío de una lista anidada sube un nivel en vez de acabar
          con la lista entera, igual que en el panel Markdown. En el primer
          nivel se deja al navegador, que cierra la lista, que es lo suyo.
        */
        htmlOutput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const block = previewBlockOfSelection();
            const item = block && block.closest('li');
            if (!item || item.textContent.trim() !== '') return;
            const list = item.parentElement;
            if (!list || !list.parentElement || list.parentElement.tagName !== 'LI') return;
            event.preventDefault();
            preservePreviewCaret(() => { outdentPreviewListItem(item); });
            placeCaretInPreviewItem(item);
            notifyPreviewEdited();
            capturePreviewSelection();
        });
        htmlOutput.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return;
            const block = previewBlockOfSelection();
            const item = block && block.closest('li');
            if (!item) return;
            event.preventDefault();
            let moved = false;
            preservePreviewCaret(() => {
                moved = event.shiftKey ? outdentPreviewListItem(item) : indentPreviewListItem(item);
            });
            if (!moved) return;
            notifyPreviewEdited();
            capturePreviewSelection();
        });
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

    function bibliographyApi() {
        return window.EdiMarkBibliography || null;
    }

    function bibliographyEntries(content, name) {
        const api = bibliographyApi();
        if (!api || typeof api.parseBibliography !== 'function') return [];
        return api.parseBibliography(content, name);
    }

    function exampleBibliography() {
        const api = bibliographyApi();
        if (!api || !api.EXAMPLE_BIBLIOGRAPHY) return null;
        const content = api.EXAMPLE_BIBLIOGRAPHY;
        const name = api.EXAMPLE_BIBLIOGRAPHY_NAME || 'bibliografia-ejemplo.bib';
        return { content, name, entries: bibliographyEntries(content, name) };
    }

    // El ejemplo se suma a lo que ya hubiera: nunca sustituye las referencias
    // que el usuario haya cargado o escrito.
    function bibliographyWithExample(content, name) {
        const example = exampleBibliography();
        if (!example) return null;
        const api = bibliographyApi();
        const merged = api && typeof api.mergeBibliography === 'function'
            ? api.mergeBibliography(content, name, example.content, example.name)
            : null;
        if (!merged || !merged.ok) return example;
        return { content: merged.content, name: merged.name, entries: merged.entries };
    }

    function loadExampleIntoSettings() {
        const merged = bibliographyWithExample(pendingBibliography.content, pendingBibliography.name);
        if (!merged) return false;
        pendingBibliography = merged;
        syncBibliographyFields();
        return true;
    }

    function syncBibliographyReferenceFields() {
        const type = bibliographyReferenceType?.value || 'article';
        bibliographyArticleForm?.querySelectorAll('[data-reference-types]').forEach((field) => {
            const visible = String(field.dataset.referenceTypes || '').split(/\s+/).includes(type);
            field.classList.toggle('hidden', !visible);
            field.querySelectorAll('input, select').forEach((input) => { input.disabled = !visible; });
        });
        const requirements = {
            article: [bibliographyArticleJournal],
            book: [bibliographyReferencePublisher],
            chapter: [bibliographyArticleJournal, bibliographyReferencePublisher],
            report: [bibliographyReferenceInstitution],
            web: [bibliographyArticleUrl],
            thesis: [bibliographyReferenceInstitution],
            conference: [bibliographyArticleJournal],
        };
        [bibliographyArticleJournal, bibliographyReferencePublisher,
            bibliographyReferenceInstitution, bibliographyArticleUrl].forEach((input) => {
            if (input) input.required = false;
        });
        (requirements[type] || []).forEach((input) => { if (input) input.required = true; });
        const containerLabels = {
            article: ['bibliography_reference_journal', 'Revista *'],
            chapter: ['bibliography_reference_book_title', 'Título del libro *'],
            web: ['bibliography_reference_website', 'Sitio web'],
            conference: ['bibliography_reference_proceedings', 'Congreso o actas *'],
        };
        const [containerKey, containerFallback] = containerLabels[type] || containerLabels.article;
        if (bibliographyReferenceContainerLabel) {
            bibliographyReferenceContainerLabel.dataset.i18nKey = containerKey;
            bibliographyReferenceContainerLabel.textContent = getTranslation(containerKey, containerFallback);
        }
        if (bibliographyReferencePublisherLabel) {
            const required = ['book', 'chapter'].includes(type);
            const key = required ? 'bibliography_reference_publisher_required' : 'bibliography_reference_publisher';
            bibliographyReferencePublisherLabel.dataset.i18nKey = key;
            bibliographyReferencePublisherLabel.textContent = getTranslation(key, required ? 'Editorial *' : 'Editorial');
        }
        if (bibliographyReferenceUrlLabel) {
            const key = type === 'web' ? 'bibliography_reference_url_required' : 'bibliography_article_url';
            bibliographyReferenceUrlLabel.dataset.i18nKey = key;
            bibliographyReferenceUrlLabel.textContent = getTranslation(key, type === 'web' ? 'URL *' : 'URL');
        }
    }

    // El formulario de referencia vive en las opciones del documento, pero se
    // presta al diálogo de citas para poder crear una referencia sin salir de él.
    let bibliographyFormHost = 'settings';
    const bibliographyArticleFormAnchor = bibliographyArticleForm
        ? bibliographyArticleForm.parentNode.insertBefore(document.createComment('bibliography-article-form'), bibliographyArticleForm)
        : null;

    function moveBibliographyArticleForm(host) {
        if (!bibliographyArticleForm) return;
        bibliographyFormHost = host === 'citation' && citationReferenceSlot ? 'citation' : 'settings';
        if (bibliographyFormHost === 'citation') citationReferenceSlot.appendChild(bibliographyArticleForm);
        else if (bibliographyArticleFormAnchor) {
            bibliographyArticleFormAnchor.parentNode.insertBefore(bibliographyArticleForm, bibliographyArticleFormAnchor.nextSibling);
        }
    }

    function toggleBibliographyArticleForm(show) {
        if (!bibliographyArticleForm) return;
        bibliographyArticleForm.classList.toggle('hidden', !show);
        const owner = bibliographyFormHost === 'citation' ? citationAddReferenceBtn : bibliographyAddArticleBtn;
        bibliographyAddArticleBtn?.setAttribute('aria-expanded', 'false');
        citationAddReferenceBtn?.setAttribute('aria-expanded', 'false');
        owner?.setAttribute('aria-expanded', String(show));
        if (bibliographyArticleError) {
            bibliographyArticleError.classList.add('hidden');
            bibliographyArticleError.textContent = '';
        }
        if (!show) bibliographyArticleForm.reset();
        syncBibliographyReferenceFields();
        if (show) bibliographyArticleKey?.focus();
    }

    function showBibliographyArticleError(key, fallback) {
        if (!bibliographyArticleError) return;
        bibliographyArticleError.textContent = getTranslation(key, fallback);
        bibliographyArticleError.classList.remove('hidden');
    }

    function syncBibliographyFields() {
        const hasBibliography = Boolean(pendingBibliography.content);
        if (bibliographyRemoveBtn) bibliographyRemoveBtn.classList.toggle('hidden', !hasBibliography);
        if (bibliographySummary) {
            if (hasBibliography) {
                bibliographySummary.removeAttribute('data-i18n-key');
                bibliographySummary.textContent = formatTranslation(
                    'bibliography_loaded',
                    '{name} · {count} referencias',
                    { name: pendingBibliography.name, count: pendingBibliography.entries.length },
                );
            } else {
                bibliographySummary.setAttribute('data-i18n-key', 'bibliography_none');
                bibliographySummary.textContent = getTranslation('bibliography_none', 'Ninguna bibliografía cargada.');
            }
        }

        const hasCsl = Boolean(pendingCsl.content);
        const customStyle = citationStyleSelect?.value === 'custom';
        if (cslCustomPicker) cslCustomPicker.classList.toggle('hidden', !customStyle);
        if (cslRemoveBtn) cslRemoveBtn.classList.toggle('hidden', !hasCsl);
        if (cslSummary) {
            if (hasCsl) {
                cslSummary.removeAttribute('data-i18n-key');
                cslSummary.textContent = formatTranslation('csl_loaded', 'Estilo: {name}', { name: pendingCsl.name });
            } else {
                cslSummary.setAttribute('data-i18n-key', 'csl_none');
                cslSummary.textContent = getTranslation('csl_none', 'Ningún archivo CSL cargado.');
            }
        }
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
        if (docTocDepthSelect) docTocDepthSelect.value = String(settings.documentTocDepth || 3);
        if (docNumberingCheckbox) docNumberingCheckbox.checked = settings.documentNumberSections === true;
        pendingBibliography = {
            content: settings.bibliographyContent || '',
            name: settings.bibliographyName || '',
            entries: bibliographyEntries(settings.bibliographyContent || '', settings.bibliographyName || ''),
        };
        pendingCsl = { content: settings.cslContent || '', name: settings.cslName || '' };
        moveBibliographyArticleForm('settings');
        toggleBibliographyArticleForm(false);
        if (bibliographyTitleInput) bibliographyTitleInput.value = settings.bibliographyTitle || '';
        if (bibliographyHeadingLevelSelect) bibliographyHeadingLevelSelect.value = String(settings.bibliographyHeadingLevel || 2);
        if (citationStyleSelect) citationStyleSelect.value = settings.citationStyle || 'apa';
        syncBibliographyFields();
        if (latexClassSelect) latexClassSelect.value = settings.documentClass || 'article';
        if (latexClassOptionsInput) latexClassOptionsInput.value = settings.classOptions || '';
        if (latexPreambleTextarea) latexPreambleTextarea.value = settings.preamble || '';
        renderDocumentFormatFields(exportFormatFields, { inherit: false });
        fillDocumentFormatFields('export-format-fields', settings.documentFormat || {});
    }

    coverRadios.forEach(radio => radio.addEventListener('change', syncCoverPicker));

    async function readSettingsTextFile(file, maxBytes, tooBigKey, invalidKey, validate) {
        if (!file) return null;
        if (file.size > maxBytes) {
            notifyUser(formatTranslation(
                tooBigKey,
                'El archivo ocupa {size} y es demasiado grande.',
                { size: formatBytes(file.size) },
            ));
            return null;
        }
        try {
            const content = await file.text();
            if (!content.trim() || (typeof validate === 'function' && !validate(content))) {
                notifyUser(getTranslation(invalidKey, 'El archivo no tiene un formato válido.'));
                return null;
            }
            return content;
        } catch (error) {
            console.warn('No se pudo leer el archivo bibliográfico:', error);
            notifyUser(getTranslation(invalidKey, 'El archivo no tiene un formato válido.'));
            return null;
        }
    }

    if (bibliographyChooseBtn && bibliographyInput) {
        bibliographyChooseBtn.addEventListener('click', () => bibliographyInput.click());
        bibliographyInput.addEventListener('change', async () => {
            const file = bibliographyInput.files && bibliographyInput.files[0];
            bibliographyInput.value = '';
            const content = await readSettingsTextFile(
                file,
                MAX_BIBLIOGRAPHY_BYTES,
                'bibliography_too_big',
                'bibliography_invalid',
                text => bibliographyEntries(text, file?.name).length > 0,
            );
            if (content === null) return;
            const entries = bibliographyEntries(content, file.name);
            pendingBibliography = { content, name: file.name, entries };
            syncBibliographyFields();
        });
    }
    if (bibliographyExampleBtn) {
        bibliographyExampleBtn.addEventListener('click', loadExampleIntoSettings);
    }
    if (bibliographyAddArticleBtn) {
        bibliographyAddArticleBtn.setAttribute('aria-controls', 'bibliography-article-form');
        bibliographyAddArticleBtn.setAttribute('aria-expanded', 'false');
        bibliographyAddArticleBtn.addEventListener('click', () => {
            const show = bibliographyArticleForm?.classList.contains('hidden') || bibliographyFormHost !== 'settings';
            moveBibliographyArticleForm('settings');
            toggleBibliographyArticleForm(show);
        });
    }
    if (bibliographyReferenceType) {
        bibliographyReferenceType.addEventListener('change', syncBibliographyReferenceFields);
        syncBibliographyReferenceFields();
    }
    if (bibliographyArticleCancelBtn) {
        bibliographyArticleCancelBtn.addEventListener('click', () => toggleBibliographyArticleForm(false));
    }
    if (bibliographyArticleForm) {
        bibliographyArticleForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const api = bibliographyApi();
            if (!api || typeof api.appendReference !== 'function') return;
            const fieldValue = input => (input && !input.disabled ? input.value : '');
            const fromCitation = bibliographyFormHost === 'citation';
            const settings = fromCitation ? effectiveLatexSettings() : null;
            const base = fromCitation
                ? { content: settings.bibliographyContent || '', name: settings.bibliographyName || '' }
                : pendingBibliography;
            const result = api.appendReference(base.content, base.name, {
                type: bibliographyReferenceType?.value,
                id: bibliographyArticleKey?.value,
                author: bibliographyArticleAuthor?.value,
                editor: fieldValue(bibliographyReferenceEditor),
                title: bibliographyArticleTitle?.value,
                container: fieldValue(bibliographyArticleJournal),
                year: bibliographyArticleYear?.value,
                publisher: fieldValue(bibliographyReferencePublisher),
                institution: fieldValue(bibliographyReferenceInstitution),
                volume: fieldValue(bibliographyReferenceVolume),
                number: fieldValue(bibliographyReferenceNumber),
                pages: fieldValue(bibliographyReferencePages),
                edition: fieldValue(bibliographyReferenceEdition),
                place: fieldValue(bibliographyReferencePlace),
                isbn: fieldValue(bibliographyReferenceIsbn),
                accessed: fieldValue(bibliographyReferenceAccessed),
                doi: fieldValue(bibliographyArticleDoi),
                url: fieldValue(bibliographyArticleUrl),
            });
            if (!result.ok) {
                const errors = {
                    'required-fields': ['bibliography_article_required', 'Completa todos los campos obligatorios.'],
                    'invalid-key': ['bibliography_article_invalid_key', 'La clave debe empezar por una letra o un número y no puede contener espacios.'],
                    'invalid-year': ['bibliography_article_invalid_year', 'Escribe el año con cuatro cifras.'],
                    'duplicate-key': ['bibliography_article_duplicate_key', 'Ya existe una referencia con esa clave.'],
                    'invalid-library': ['bibliography_article_invalid_library', 'No se puede ampliar esta biblioteca.'],
                };
                showBibliographyArticleError(...(errors[result.error] || errors['invalid-library']));
                return;
            }
            if (fromCitation) {
                storeLatexSettings({
                    ...settings,
                    bibliographyContent: result.content,
                    bibliographyName: result.name,
                });
                attachBibliographyToDocument(docs.find(doc => doc.id === currentId), {
                    content: result.content,
                    name: result.name,
                });
                toggleBibliographyArticleForm(false);
                refreshCitationLibrary(result.entries);
            } else {
                pendingBibliography = result;
                syncBibliographyFields();
                toggleBibliographyArticleForm(false);
            }
            notifyUser(getTranslation('bibliography_reference_added', 'Referencia añadida a la bibliografía.'));
        });
    }
    if (bibliographyRemoveBtn) {
        bibliographyRemoveBtn.addEventListener('click', () => {
            pendingBibliography = { content: '', name: '', entries: [] };
            syncBibliographyFields();
        });
    }
    if (cslChooseBtn && cslInput) {
        cslChooseBtn.addEventListener('click', () => cslInput.click());
        cslInput.addEventListener('change', async () => {
            const file = cslInput.files && cslInput.files[0];
            cslInput.value = '';
            const api = bibliographyApi();
            const content = await readSettingsTextFile(
                file,
                MAX_CSL_BYTES,
                'csl_too_big',
                'csl_invalid',
                text => api && typeof api.isCslStyle === 'function' && api.isCslStyle(text),
            );
            if (content === null) return;
            pendingCsl = { content, name: file.name };
            if (citationStyleSelect) citationStyleSelect.value = 'custom';
            syncBibliographyFields();
        });
    }
    if (citationStyleSelect) citationStyleSelect.addEventListener('change', syncBibliographyFields);
    if (cslRemoveBtn) {
        cslRemoveBtn.addEventListener('click', () => {
            pendingCsl = { content: '', name: '' };
            if (citationStyleSelect) citationStyleSelect.value = 'apa';
            syncBibliographyFields();
        });
    }

    function updateCitationInsertButton() {
        if (citationInsertBtn) citationInsertBtn.disabled = selectedCitationIds.size === 0;
    }

    function syncCitationOptions() {
        const single = selectedCitationIds.size === 1;
        citationMode?.querySelectorAll('option:not([value="parenthetical"])').forEach((option) => {
            option.disabled = !single;
        });
        if (!single && citationMode) citationMode.value = 'parenthetical';
        if (citationLocator) {
            citationLocator.disabled = !single;
            if (!single) citationLocator.value = '';
        }
    }

    /*
      El apellido delante, que es por donde está ordenada la lista: con el
      nombre de pila primero, un listado alfabético por apellido parece
      desordenado. Los demás autores se quedan como se leen.
    */
    function citationResultLabel(entry) {
        const authors = String(entry.author || '').split(';').map(name => name.trim()).filter(Boolean);
        const first = authors[0] || '';
        // Solo el primero, que es el que ordena; una institución se queda entera.
        if (entry.family && first !== entry.family && first.endsWith(entry.family)) {
            authors[0] = `${entry.family}, ${first.slice(0, -entry.family.length).trim()}`;
        }
        const parts = [authors.join('; '), entry.year, entry.id].filter(Boolean);
        return parts.join(' · ');
    }

    function renderCitationResults() {
        if (!citationResults) return;
        const api = bibliographyApi();
        const query = citationSearch ? citationSearch.value : '';
        const matches = api && typeof api.searchBibliography === 'function'
            ? api.searchBibliography(citationEntries, query)
            : citationEntries;
        const visible = matches.slice(0, 100);
        citationResults.replaceChildren();

        if (citationResultCount) {
            const key = matches.length === 1 ? 'citation_result_count_one' : 'citation_result_count_many';
            const fallback = matches.length === 1 ? '1 referencia' : '{count} referencias';
            citationResultCount.textContent = formatTranslation(key, fallback, { count: matches.length });
        }
        if (!visible.length) {
            const empty = document.createElement('p');
            empty.className = 'p-4 text-sm text-slate-500 dark:text-slate-400';
            empty.textContent = getTranslation('citation_no_results', 'No hay referencias que coincidan.');
            citationResults.appendChild(empty);
            updateCitationInsertButton();
            return;
        }

        visible.forEach((entry) => {
            const label = document.createElement('label');
            label.className = 'flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/60';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = entry.id;
            checkbox.checked = selectedCitationIds.has(entry.id);
            checkbox.className = 'mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700';
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedCitationIds.add(entry.id);
                else selectedCitationIds.delete(entry.id);
                syncCitationOptions();
                updateCitationInsertButton();
            });
            const text = document.createElement('span');
            text.className = 'min-w-0';
            const title = document.createElement('span');
            title.className = 'block text-sm font-medium text-slate-800 dark:text-slate-100';
            title.textContent = entry.title || entry.id;
            const meta = document.createElement('span');
            meta.className = 'block text-xs text-slate-500 dark:text-slate-400';
            meta.textContent = citationResultLabel(entry);
            text.append(title, meta);
            label.append(checkbox, text);
            citationResults.appendChild(label);
        });
        updateCitationInsertButton();
    }

    function markdownCitationAtSelection() {
        if (!markdownTextareaEl || isPreviewFormatTarget()) return null;
        const markdown = markdownEditor.getValue();
        const selectionStart = markdownTextareaEl.selectionStart;
        const selectionEnd = markdownTextareaEl.selectionEnd;
        const bracketed = /\[[^\]\n]*@[^\]\n]+\]/g;
        const ranges = [];
        let match;
        while ((match = bracketed.exec(markdown))) {
            ranges.push({ source: match[0], start: match.index, end: match.index + match[0].length });
        }
        const narrative = /@[A-Za-z0-9_](?:[A-Za-z0-9_.:+\/#$%&?<>~-]*[A-Za-z0-9_])?(?:\s+\[[^\]\n]+\])?/g;
        while ((match = narrative.exec(markdown))) {
            if (ranges.some(range => match.index >= range.start && match.index < range.end)) continue;
            ranges.push({ source: match[0], start: match.index, end: match.index + match[0].length });
        }
        for (const range of ranges) {
            const { start, end } = range;
            const touches = selectionStart === selectionEnd
                ? selectionStart >= start && selectionStart <= end
                : selectionStart < end && selectionEnd > start;
            if (touches) return range;
        }
        return null;
    }

    function toggleCitationModal(show, { editElement = null, markdownRange = null } = {}) {
        if (!citationOverlay) return;
        citationOverlay.style.display = show ? 'flex' : 'none';
        moveBibliographyArticleForm(show ? 'citation' : 'settings');
        toggleBibliographyArticleForm(false);
        if (!show) {
            editingCitationElement = null;
            editingCitationRange = null;
            return;
        }
        editingCitationElement = editElement && editElement.isConnected ? editElement : null;
        editingCitationRange = markdownRange || null;
        const settings = effectiveLatexSettings();
        citationEntries = bibliographyEntries(settings.bibliographyContent || '', settings.bibliographyName || '');
        const api = bibliographyApi();
        const editingSource = editingCitationElement
            ? editingCitationElement.dataset.edimarkCitation || ''
            : editingCitationRange?.source || '';
        const details = editingSource && api && typeof api.citationDetails === 'function'
            ? api.citationDetails(editingSource)
            : { ids: [], mode: 'parenthetical', locator: '' };
        selectedCitationIds = new Set(details.ids);
        if (citationMode) citationMode.value = details.mode || 'parenthetical';
        if (citationLocator) citationLocator.value = details.locator || '';
        syncCitationOptions();
        if (citationSearch) citationSearch.value = '';
        const editing = Boolean(editingCitationElement || editingCitationRange);
        if (citationModalTitle) {
            const key = editing ? 'citation_modal_edit_title' : 'citation_modal_title';
            citationModalTitle.setAttribute('data-i18n-key', key);
            citationModalTitle.textContent = getTranslation(key, editing ? 'Editar cita bibliográfica' : 'Insertar cita bibliográfica');
        }
        if (citationInsertBtn) {
            const key = editing ? 'citation_apply_btn' : 'citation_insert_btn';
            citationInsertBtn.setAttribute('data-i18n-key', key);
            citationInsertBtn.textContent = getTranslation(key, editing ? 'Aplicar cambios' : 'Insertar cita');
        }
        if (refreshCitationLibrary(citationEntries)) focusModalField(citationSearch);
        else focusModalField(citationOpenSettingsBtn || citationLoadExampleBtn || citationAddReferenceBtn);
    }

    /*
      El estilo con el que se van a componer las citas es del documento, no de
      esta cita: se dice aquí para no tener que ir a mirarlo a otro cuadro.
    */
    const CITATION_STYLE_KEYS = {
        apa: ['citation_style_apa', 'APA 7.ª edición'],
        'chicago-author-date': ['citation_style_chicago', 'Chicago, autor-fecha'],
        'modern-language-association': ['citation_style_mla', 'MLA 9.ª edición'],
        ieee: ['citation_style_ieee', 'IEEE'],
    };

    function syncCitationStyleSummary() {
        if (!citationStyleSummary) return;
        const settings = effectiveLatexSettings();
        const style = settings.citationStyle || 'apa';
        const named = CITATION_STYLE_KEYS[style];
        const name = named
            ? getTranslation(named[0], named[1])
            : (settings.cslName || getTranslation('citation_style_custom', 'Archivo CSL propio'));
        citationStyleSummary.textContent = `${formatTranslation(
            'citation_style_summary',
            'Las citas se compondrán con el estilo {style}.',
            { style: name },
        )} `;
    }

    // A qué cita hay que volver cuando se cierren las opciones generales.
    let citationModalReturn = null;

    // Deja el diálogo al día tras cargar o crear referencias sin cerrarlo.
    function refreshCitationLibrary(entries = null) {
        syncCitationStyleSummary();
        if (Array.isArray(entries)) {
            citationEntries = entries;
        } else {
            const settings = effectiveLatexSettings();
            citationEntries = bibliographyEntries(settings.bibliographyContent || '', settings.bibliographyName || '');
        }
        const ready = citationEntries.length > 0;
        if (citationLibraryReady) citationLibraryReady.classList.toggle('hidden', !ready);
        if (citationLibraryEmpty) citationLibraryEmpty.classList.toggle('hidden', ready);
        if (ready) renderCitationResults();
        else updateCitationInsertButton();
        return ready;
    }

    if (citationSearch) citationSearch.addEventListener('input', renderCitationResults);
    if (citationBtn) {
        citationBtn.addEventListener('click', () => {
            toggleCitationModal(true, { markdownRange: markdownCitationAtSelection() });
        });
    }
    if (citationCancelBtn) citationCancelBtn.addEventListener('click', () => toggleCitationModal(false));
    if (citationInsertBtn) {
        citationInsertBtn.addEventListener('click', () => {
            const api = bibliographyApi();
            const citation = api && typeof api.buildCitation === 'function'
                ? api.buildCitation(Array.from(selectedCitationIds), {
                    mode: citationMode?.value,
                    locator: citationLocator?.value,
                })
                : '';
            if (!citation) return;
            if (editingCitationElement && editingCitationElement.isConnected) {
                editingCitationElement.dataset.edimarkCitation = citation;
                editingCitationElement.textContent = previewCitationLabel(citation, citationEntries) || citation;
                notifyPreviewEdited({ repaint: true });
            } else if (editingCitationRange && markdownTextareaEl) {
                markdownTextareaEl.setSelectionRange(editingCitationRange.start, editingCitationRange.end);
                markdownEditor.replaceSelection(citation);
            } else {
                insertMarkdownContent(citation, { inline: true });
            }
            toggleCitationModal(false);
        });
    }
    /*
      Las opciones de la bibliografía se abren desde el cuadro de la cita, así
      que al cerrarlas —guardando o no— se vuelve a él: quien fue a elegir el
      estilo o a cargar la biblioteca seguía a medias de insertar una cita, y
      dejarlo en el editor le obligaría a empezar otra vez.
    */
    function openBibliographySettingsFromCitation() {
        citationModalReturn = {
            editElement: editingCitationElement,
            hadRange: Boolean(editingCitationRange),
        };
        toggleCitationModal(false);
        toggleLatexSettingsModal(true, { tab: 'bibliography' });
    }

    if (citationOpenSettingsBtn) {
        citationOpenSettingsBtn.addEventListener('click', openBibliographySettingsFromCitation);
    }
    if (citationOpenStyleBtn) {
        citationOpenStyleBtn.addEventListener('click', openBibliographySettingsFromCitation);
    }
    if (citationAddReferenceBtn) {
        citationAddReferenceBtn.setAttribute('aria-controls', 'bibliography-article-form');
        citationAddReferenceBtn.setAttribute('aria-expanded', 'false');
        citationAddReferenceBtn.addEventListener('click', () => {
            const show = bibliographyArticleForm?.classList.contains('hidden') || bibliographyFormHost !== 'citation';
            moveBibliographyArticleForm('citation');
            toggleBibliographyArticleForm(show);
        });
    }
    if (citationLoadExampleBtn) {
        citationLoadExampleBtn.addEventListener('click', () => {
            const settings = effectiveLatexSettings();
            const merged = bibliographyWithExample(settings.bibliographyContent || '', settings.bibliographyName || '');
            if (!merged) return;
            storeLatexSettings({
                ...settings,
                bibliographyContent: merged.content,
                bibliographyName: merged.name,
            });
            attachBibliographyToDocument(docs.find(doc => doc.id === currentId), {
                content: merged.content,
                name: merged.name,
            });
            refreshCitationLibrary(merged.entries);
            focusModalField(citationSearch);
        });
    }
    if (htmlOutput) {
        const openPreviewCitation = (event) => {
            const citation = event.target.closest?.('.edimark-preview-citation');
            if (!citation) return false;
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleCitationModal(true, { editElement: citation });
            return true;
        };
        htmlOutput.addEventListener('click', openPreviewCitation);
        htmlOutput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            openPreviewCitation(event);
        });
    }
    if (citationOverlay) {
        citationOverlay.addEventListener('click', (event) => {
            if (event.target === citationOverlay) toggleCitationModal(false);
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !citationOverlay) return;
        if (citationOverlay.style.display === 'flex') toggleCitationModal(false);
    });

    if (coverBtn && coverInput) {
        coverBtn.addEventListener('click', () => coverInput.click());
        coverInput.addEventListener('change', () => {
            const file = coverInput.files && coverInput.files[0];
            coverInput.value = '';
            if (!file) return;
            if (file.size > MAX_COVER_BYTES) {
                notifyUser(formatTranslation(
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
            reader.onerror = () => notifyUser(getTranslation('doc_settings_cover_error', 'No se pudo leer la imagen.'));
            reader.readAsDataURL(file);
        });
    }

    if (docLanguageSelect) {
        docLanguageSelect.addEventListener('change', () => {
            syncDocLanguageCodeField();
            if (docLanguageSelect.value === 'other' && docLanguageCodeInput) docLanguageCodeInput.focus();
        });
    }

    /*
      Campos de formato del documento. El mismo formulario sirve para los
      valores generales y para los de un documento concreto: lo único que
      cambia es qué significa dejar un campo vacío —«sin fijar» en los
      generales, «igual que los generales» en el documento—, así que se
      construye una sola vez desde aquí en vez de repetirlo en el HTML.
    */
    /*
      Con borde de verdad: sin él, `shadow-sm` deja una sola línea bajo el campo
      y una fila de listas y casillas se lee como un montón de subrayados.
      Los numéricos, además, van cortos: un margen de dos cifras en un campo de
      ancho completo no parece un número, parece un renglón para escribir.
    */
    const DOC_FORMAT_SELECTS = 'mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200';
    // Escritas enteras y no derivadas de la anterior: Tailwind busca las clases
    // leyendo el archivo, y una construida en marcha no llega a la hoja.
    const DOC_FORMAT_NUMBERS = 'mt-1 block w-full sm:w-28 rounded-md border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200';
    const DOC_FORMAT_MARGINS = 'mt-1 block w-full sm:w-24 rounded-md border border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200';
    const DOC_FORMAT_LABELS = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

    function documentFormatApi() {
        return window.EdiMarkDocumentFormat || null;
    }

    function buildFormatField(labelKey, labelText, control) {
        const wrapper = document.createElement('div');
        const label = document.createElement('label');
        label.className = DOC_FORMAT_LABELS;
        label.setAttribute('data-i18n-key', labelKey);
        label.textContent = getTranslation(labelKey, labelText);
        if (control.id) label.setAttribute('for', control.id);
        wrapper.appendChild(label);
        wrapper.appendChild(control);
        return wrapper;
    }

    function buildFormatSelect(id, options) {
        const select = document.createElement('select');
        select.id = id;
        select.className = DOC_FORMAT_SELECTS;
        options.forEach(([value, key, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.setAttribute('data-i18n-key', key);
            option.textContent = getTranslation(key, text);
            select.appendChild(option);
        });
        return select;
    }

    /*
      Texto y no `number`: un campo numérico rechaza la coma decimal, que es
      justo lo que teclea quien escribe en español. El valor se normaliza
      luego, donde 2,5 y 2.5 valen lo mismo y lo que se sale del rango se
      descarta.
    */
    function buildFormatNumber(id, { min, max, step, placeholderKey, placeholderText, className = DOC_FORMAT_NUMBERS }) {
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.id = id;
        input.dataset.min = String(min);
        input.dataset.max = String(max);
        input.dataset.step = String(step);
        input.className = className;
        input.setAttribute('data-i18n-key', placeholderKey);
        input.placeholder = getTranslation(placeholderKey, placeholderText);
        return input;
    }

    /*
      Sugerencias de tipografía. No hay forma de pedirle al sistema su lista sin
      permiso, así que se prueban unas cuantas conocidas midiendo texto en un
      lienzo: si el ancho con la tipografía pedida difiere del de la genérica de
      reserva, es que existe y el navegador la ha usado. Sale gratis y no
      pregunta nada.

      Donde hay `queryLocalFonts` —Chromium sobre HTTPS— se puede pedir la lista
      completa de verdad, pero eso abre un diálogo de permiso, así que solo se
      hace si la persona pulsa el botón.
    */
    const FONT_CANDIDATES = [
        'Arial', 'Arial Narrow', 'Bookman Old Style', 'Cambria', 'Candara', 'Cantarell',
        'Century Gothic', 'Century Schoolbook', 'Comic Sans MS', 'Consolas', 'Courier New',
        'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'EB Garamond', 'Fira Code',
        'Fira Sans', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Helvetica',
        'Impact', 'Inter', 'Lato', 'Liberation Mono', 'Liberation Sans', 'Liberation Serif',
        'Linux Biolinum', 'Linux Libertine', 'Lucida Console', 'Lucida Sans Unicode',
        'Merriweather', 'Montserrat', 'Nimbus Roman', 'Nimbus Sans', 'Noto Sans',
        'Noto Serif', 'Open Sans', 'Palatino Linotype', 'PT Sans', 'PT Serif',
        'Roboto', 'Roboto Mono', 'Segoe UI', 'Source Code Pro', 'Source Sans Pro',
        'Source Serif Pro', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Ubuntu',
        'Ubuntu Mono', 'Verdana',
    ];

    let detectedFonts = null;

    function detectAvailableFonts() {
        if (detectedFonts) return detectedFonts;
        const context = document.createElement('canvas').getContext('2d');
        if (!context) {
            detectedFonts = [];
            return detectedFonts;
        }
        // Letras de anchos muy distintos: cuanto más desigual la muestra, más
        // difícil es que dos tipografías la midan igual por casualidad.
        const sample = 'mmmmmmmmmmlliWQ@';
        const fallbacks = ['monospace', 'serif', 'sans-serif'];
        const widths = fallbacks.map((fallback) => {
            context.font = `72px ${fallback}`;
            return context.measureText(sample).width;
        });
        detectedFonts = FONT_CANDIDATES.filter(name => fallbacks.some((fallback, index) => {
            context.font = `72px "${name}", ${fallback}`;
            return context.measureText(sample).width !== widths[index];
        }));
        return detectedFonts;
    }

    function fillFontDatalist(list, names) {
        list.textContent = '';
        names.forEach((name) => {
            const option = document.createElement('option');
            option.value = name;
            list.appendChild(option);
        });
    }

    function syncFontMissingWarning(prefix) {
        const input = document.getElementById(`${prefix}-font-custom`);
        const warning = document.getElementById(`${prefix}-font-missing`);
        if (!input || !warning) return;
        const name = input.value.trim();
        const available = detectAvailableFonts();
        // La detección es aproximada, de ahí el «no parece»: mejor quedarse
        // corto que acusar de ausente a una tipografía que sí está.
        const known = !name || available.some(font => font.toLowerCase() === name.toLowerCase());
        warning.textContent = known ? '' : getTranslation(
            'doc_format_font_missing',
            '«{font}» no parece estar instalada aquí: el documento la guarda igual y en un equipo que la tenga se verá bien; aquí sale con una tipografía de reserva.',
        ).replace('{font}', name);
        warning.classList.toggle('hidden', known);
    }

    function buildFontCustomRow(prefix) {
        const row = document.createElement('div');
        row.id = `${prefix}-font-custom-row`;
        row.className = 'mt-3 hidden';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `${prefix}-font-custom`;
        input.className = DOC_FORMAT_SELECTS;
        input.setAttribute('list', `${prefix}-font-list`);
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('data-i18n-key', 'doc_format_font_custom_placeholder');
        input.placeholder = getTranslation('doc_format_font_custom_placeholder', 'Garamond, Calibri…');
        row.appendChild(buildFormatField('doc_format_field_font_custom', 'Nombre de la tipografía', input));

        const list = document.createElement('datalist');
        list.id = `${prefix}-font-list`;
        fillFontDatalist(list, detectAvailableFonts());
        row.appendChild(list);

        const hint = document.createElement('p');
        hint.className = 'mt-1 text-xs text-slate-500 dark:text-slate-400';
        hint.setAttribute('data-i18n-key', 'doc_format_font_custom_hint');
        hint.textContent = getTranslation(
            'doc_format_font_custom_hint',
            'Se sugieren las tipografías instaladas que se han podido reconocer.',
        );
        row.appendChild(hint);

        /*
          Una tipografía que aquí no está no se toca: el documento la lleva
          escrita y en el equipo de al lado puede existir perfectamente, así que
          borrarla sería perder lo que su autor decidió. Solo se avisa, y la
          vista previa la sustituye por la genérica de reserva.
        */
        const missing = document.createElement('p');
        missing.id = `${prefix}-font-missing`;
        missing.className = 'mt-1 hidden text-xs text-amber-700 dark:text-amber-300';
        row.appendChild(missing);
        input.addEventListener('input', () => syncFontMissingWarning(prefix));

        if (typeof window.queryLocalFonts === 'function') {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400';
            button.setAttribute('data-i18n-key', 'doc_format_font_system_btn');
            button.textContent = getTranslation('doc_format_font_system_btn', 'Ver todas las del sistema…');
            button.addEventListener('click', async () => {
                try {
                    const fonts = await window.queryLocalFonts();
                    const families = [...new Set(fonts.map(font => font.family))].sort((a, b) => a.localeCompare(b));
                    fillFontDatalist(list, families);
                    button.remove();
                    hint.textContent = getTranslation(
                        'doc_format_font_system_ready',
                        'Ya se sugieren todas las tipografías del sistema.',
                    );
                    hint.setAttribute('data-i18n-key', 'doc_format_font_system_ready');
                    input.focus();
                } catch (error) {
                    // Permiso denegado o navegador que no lo permite aquí: se
                    // sigue pudiendo escribir el nombre a mano.
                    console.warn('No se ha podido leer la lista de tipografías del sistema:', error);
                    hint.textContent = getTranslation(
                        'doc_format_font_system_denied',
                        'No se ha podido leer la lista del sistema; escribe el nombre a mano.',
                    );
                    hint.setAttribute('data-i18n-key', 'doc_format_font_system_denied');
                }
            });
            row.appendChild(button);
        }
        return row;
    }

    function renderDocumentFormatFields(container, { inherit }) {
        if (!container || container.dataset.rendered === 'true') return;
        const blankKey = inherit ? 'doc_format_inherit' : 'doc_format_unset';
        const blankText = inherit ? 'Igual que las opciones generales' : 'Sin fijar';
        const prefix = container.id;
        const blank = [['', blankKey, blankText]];

        const buildGroup = (key, text) => {
            const section = document.createElement('section');
            section.className = 'document-format-group';
            const title = document.createElement('h4');
            title.className = 'document-format-group-title';
            title.setAttribute('data-i18n-key', key);
            title.textContent = getTranslation(key, text);
            section.appendChild(title);
            return section;
        };

        /*
          Primero lo que da forma al texto, en el orden habitual de cualquier
          procesador: familia y tamaño, ritmo de línea y alineación, sangría y
          partición. Antes la alineación abría la lista y el papel aparecía a
          mitad del mismo bloque, así que no se podía recorrer de una mirada.
        */
        const textGroup = buildGroup('doc_format_text_group', 'Texto');
        const textGrid = document.createElement('div');
        textGrid.className = 'grid gap-4 sm:grid-cols-2';
        // La tipografía escrita a mano solo la respetan los formatos que sepan
        // resolverla, así que vive escondida hasta que se elige «Otra…», y va
        // dentro de la misma celda que la lista: es su continuación, no un
        // campo suelto en medio del tamaño y el interlineado.
        const fontField = buildFormatField('doc_format_field_font', 'Tipo de letra', buildFormatSelect(`${prefix}-font`, [
            ...blank,
            ['serif', 'doc_format_font_serif', 'Con remates (serif)'],
            ['sans', 'doc_format_font_sans', 'Sin remates (sans)'],
            ['mono', 'doc_format_font_mono', 'Monoespaciada'],
            ['other', 'doc_format_font_other', 'Otra…'],
        ]));
        fontField.appendChild(buildFontCustomRow(prefix));
        textGrid.appendChild(fontField);
        textGrid.appendChild(buildFormatField('doc_format_field_fontsize', 'Tamaño (pt)', buildFormatNumber(`${prefix}-fontsize`, {
            min: 5, max: 72, step: 0.5,
            placeholderKey: 'doc_format_placeholder_blank', placeholderText: '—',
        })));
        textGrid.appendChild(buildFormatField('doc_format_field_lineheight', 'Interlineado', buildFormatNumber(`${prefix}-lineheight`, {
            min: 0.8, max: 4, step: 0.05,
            placeholderKey: 'doc_format_placeholder_blank', placeholderText: '—',
        })));
        textGrid.appendChild(buildFormatField('doc_format_field_align', 'Alineación', buildFormatSelect(`${prefix}-align`, [
            ...blank,
            ['left', 'doc_format_align_left', 'Izquierda'],
            ['justify', 'doc_format_align_justify', 'Justificada'],
            ['right', 'doc_format_align_right', 'Derecha'],
        ])));
        textGrid.appendChild(buildFormatField('doc_format_field_indent', 'Sangría de primera línea', buildFormatSelect(`${prefix}-indent`, [
            ...blank,
            ['yes', 'doc_format_yes', 'Sí'],
            ['no', 'doc_format_no', 'No'],
        ])));
        textGrid.appendChild(buildFormatField('doc_format_field_hyphenate', 'Partir palabras con guion', buildFormatSelect(`${prefix}-hyphenate`, [
            ...blank,
            ['yes', 'doc_format_yes', 'Sí'],
            ['no', 'doc_format_no', 'No'],
        ])));
        textGroup.appendChild(textGrid);

        const hint = document.createElement('p');
        hint.className = 'mt-3 text-xs text-slate-500 dark:text-slate-400';
        hint.setAttribute('data-i18n-key', 'doc_format_hyphenate_hint');
        hint.textContent = getTranslation(
            'doc_format_hyphenate_hint',
            'La partición usa los diccionarios de guiones del sistema: en Linux, LibreOffice necesita el paquete del idioma (por ejemplo, hyphen-es).',
        );
        textGroup.appendChild(hint);
        container.appendChild(textGroup);

        /* Papel, orientación y márgenes forman una sola caja física. */
        const pageGroup = buildGroup('doc_format_page_group', 'Página');
        const pageGrid = document.createElement('div');
        pageGrid.className = 'grid gap-4 sm:grid-cols-3';
        pageGrid.appendChild(buildFormatField('doc_format_field_paper', 'Tamaño de papel', buildFormatSelect(`${prefix}-paper`, [
            ...blank,
            ['a4', 'doc_format_paper_a4', 'A4 (21 × 29,7 cm)'],
            ['letter', 'doc_format_paper_letter', 'Carta (21,6 × 27,9 cm)'],
        ])));
        pageGrid.appendChild(buildFormatField('doc_format_field_orientation', 'Orientación', buildFormatSelect(`${prefix}-orientation`, [
            ...blank,
            ['portrait', 'doc_format_orientation_portrait', 'Vertical'],
            ['landscape', 'doc_format_orientation_landscape', 'Horizontal'],
        ])));
        pageGrid.appendChild(buildFormatField('doc_format_field_pagebreak_h1', 'Cada H1 empieza en página nueva', buildFormatSelect(`${prefix}-pagebreak-h1`, [
            ...blank,
            ['yes', 'doc_format_yes', 'Sí'],
            ['no', 'doc_format_no', 'No'],
        ])));
        pageGroup.appendChild(pageGrid);

        const marginsBlock = document.createElement('div');
        marginsBlock.className = 'mt-4';
        const marginsLabel = document.createElement('p');
        marginsLabel.className = DOC_FORMAT_LABELS;
        marginsLabel.setAttribute('data-i18n-key', 'doc_format_field_margins');
        marginsLabel.textContent = getTranslation('doc_format_field_margins', 'Márgenes de página (cm)');
        marginsBlock.appendChild(marginsLabel);
        const marginsGrid = document.createElement('div');
        marginsGrid.className = 'mt-1 flex flex-wrap gap-x-4 gap-y-2';
        [
            ['top', 'doc_format_margin_top', 'Superior'],
            ['right', 'doc_format_margin_right', 'Derecho'],
            ['bottom', 'doc_format_margin_bottom', 'Inferior'],
            ['left', 'doc_format_margin_left', 'Izquierdo'],
        ].forEach(([side, key, text]) => {
            marginsGrid.appendChild(buildFormatField(key, text, buildFormatNumber(`${prefix}-margin-${side}`, {
                min: 0, max: 15, step: 0.1,
                placeholderKey: 'doc_format_placeholder_blank', placeholderText: '—',
                className: DOC_FORMAT_MARGINS,
            })));
        });
        marginsBlock.appendChild(marginsGrid);
        pageGroup.appendChild(marginsBlock);
        container.appendChild(pageGroup);

        const fontSelect = document.getElementById(`${prefix}-font`);
        const custom = document.getElementById(`${prefix}-font-custom-row`);
        if (fontSelect && custom) {
            fontSelect.addEventListener('change', () => {
                custom.classList.toggle('hidden', fontSelect.value !== 'other');
                const customInput = document.getElementById(`${prefix}-font-custom`);
                if (fontSelect.value === 'other' && customInput) customInput.focus();
            });
        }
        container.dataset.rendered = 'true';
    }

    function fillDocumentFormatFields(prefix, format) {
        const api = documentFormatApi();
        const values = api ? api.normalizeDocumentFormat(format) : {};
        const setValue = (id, value) => {
            const field = document.getElementById(`${prefix}-${id}`);
            if (field) field.value = value ?? '';
        };
        setValue('align', values.align);
        const known = api && api.FONT_KINDS.includes(values.font);
        setValue('font', values.font ? (known ? values.font : 'other') : '');
        setValue('font-custom', known ? '' : values.font);
        const customRow = document.getElementById(`${prefix}-font-custom-row`);
        if (customRow) customRow.classList.toggle('hidden', known || !values.font);
        syncFontMissingWarning(prefix);
        setValue('fontsize', values.fontSize);
        setValue('lineheight', values.lineHeight);
        setValue('paper', values.paperSize);
        setValue('orientation', values.orientation);
        setValue('margin-top', values.marginTop);
        setValue('margin-right', values.marginRight);
        setValue('margin-bottom', values.marginBottom);
        setValue('margin-left', values.marginLeft);
        setValue('indent', values.indent);
        setValue('hyphenate', values.hyphenate);
        setValue('pagebreak-h1', values.pageBreakBeforeH1);
    }

    /*
      «Igual que las opciones generales» no dice cuál es ese valor, y quien abre
      este diálogo lo que quiere saber es qué va a heredar el documento si deja
      un campo en blanco. Así que el valor general se escribe al lado: entre
      paréntesis en las listas y como marcador en los campos numéricos, que si
      no se quedan en un guion suelto que no informa de nada.
    */
    const DOC_FORMAT_VALUE_LABELS = {
        align: {
            left: ['doc_format_align_left', 'Izquierda'],
            justify: ['doc_format_align_justify', 'Justificada'],
            right: ['doc_format_align_right', 'Derecha'],
        },
        font: {
            serif: ['doc_format_font_serif', 'Con remates (serif)'],
            sans: ['doc_format_font_sans', 'Sin remates (sans)'],
            mono: ['doc_format_font_mono', 'Monoespaciada'],
        },
        paperSize: {
            a4: ['doc_format_paper_a4', 'A4 (21 × 29,7 cm)'],
            letter: ['doc_format_paper_letter', 'Carta (21,6 × 27,9 cm)'],
        },
        orientation: {
            portrait: ['doc_format_orientation_portrait', 'Vertical'],
            landscape: ['doc_format_orientation_landscape', 'Horizontal'],
        },
        indent: {
            yes: ['doc_format_yes', 'Sí'],
            no: ['doc_format_no', 'No'],
        },
        hyphenate: {
            yes: ['doc_format_yes', 'Sí'],
            no: ['doc_format_no', 'No'],
        },
        pageBreakBeforeH1: {
            yes: ['doc_format_yes', 'Sí'],
            no: ['doc_format_no', 'No'],
        },
    };

    const DOC_FORMAT_INHERITED_SELECTS = [
        ['align', 'align'],
        ['font', 'font'],
        ['paper', 'paperSize'],
        ['orientation', 'orientation'],
        ['indent', 'indent'],
        ['hyphenate', 'hyphenate'],
        ['pagebreak-h1', 'pageBreakBeforeH1'],
    ];

    const DOC_FORMAT_INHERITED_NUMBERS = [
        ['fontsize', 'fontSize'],
        ['lineheight', 'lineHeight'],
        ['margin-top', 'marginTop'],
        ['margin-right', 'marginRight'],
        ['margin-bottom', 'marginBottom'],
        ['margin-left', 'marginLeft'],
    ];

    function generalDocumentFormat() {
        const api = documentFormatApi();
        const raw = (window.__edimarkLatexSettings || {}).documentFormat || {};
        return api ? api.normalizeDocumentFormat(raw) : raw;
    }

    /* El nombre de una tipografía escrita a mano se muestra tal cual. */
    function inheritedValueLabel(field, value) {
        if (!value) return '';
        const entry = (DOC_FORMAT_VALUE_LABELS[field] || {})[value];
        return entry ? getTranslation(entry[0], entry[1]) : String(value);
    }

    /* Los interruptores generales son booleanos, no las claves de tres estados. */
    function inheritedSwitchLabel(value) {
        return value === true
            ? getTranslation('doc_format_yes', 'Sí')
            : getTranslation('doc_format_no', 'No');
    }

    function inheritedLanguageLabel() {
        const code = String((window.__edimarkLatexSettings || {}).documentLanguage || '').trim();
        if (!code || code === 'auto') return getTranslation('doc_settings_language_auto', 'Igual que la interfaz');
        const general = document.getElementById('doc-language');
        const option = general ? Array.from(general.options).find(item => item.value === code) : null;
        return option ? option.textContent.trim() : code;
    }

    /*
      El valor heredado se escribe debajo del campo, no dentro de la lista: en
      dos columnas, una opción con el valor añadido se corta a media palabra.
      Y solo mientras el campo sigue en blanco, que es cuando ese valor manda.
    */
    function inheritedHintFor(field) {
        let hint = field.parentElement.querySelector('[data-inherited-hint]');
        if (!hint) {
            hint = document.createElement('p');
            hint.dataset.inheritedHint = 'true';
            hint.className = 'mt-1 text-xs text-slate-500 dark:text-slate-400';
            // Pegado al campo, no al final de la celda: bajo «Tipo de letra»
            // vive además el nombre de la tipografía escrita a mano.
            field.insertAdjacentElement('afterend', hint);
            const event = field.tagName === 'SELECT' ? 'change' : 'input';
            field.addEventListener(event, () => {
                hint.classList.toggle('hidden', !hint.textContent || field.value !== '');
            });
        }
        return hint;
    }

    /*
      `vacio` es lo que se dice cuando tampoco lo general fija nada: callar ahí
      dejaba el campo sin una línea que sus vecinos sí tenían, y no había manera
      de saber si es que no heredaba nada o es que la pista se había perdido.
    */
    function setInheritedHint(field, label, vacio = '') {
        if (!field) return;
        const hint = inheritedHintFor(field);
        const texto = label
            ? `${getTranslation('doc_format_inherited_now', 'Hereda')}: ${label}`
            : vacio;
        hint.textContent = texto;
        hint.classList.toggle('hidden', !texto || field.value !== '');
    }

    /* Lo que no fija ni el documento ni lo general: lo pone el destino. */
    function unsetInheritedLabel() {
        return getTranslation(
            'doc_format_inherited_none',
            'Sin fijar: lo decide el programa que abra el documento.',
        );
    }

    function refreshInheritedDocumentHints() {
        const settings = window.__edimarkLatexSettings || {};
        setInheritedHint(docOwnLanguage, inheritedLanguageLabel());
        setInheritedHint(docOwnAuthor, String(settings.documentAuthor || '').trim());
        setInheritedHint(docOwnToc, inheritedSwitchLabel(settings.documentToc));
        setInheritedHint(docOwnTocDepth, String(settings.documentTocDepth || 3));
        setInheritedHint(docOwnNumberSections, inheritedSwitchLabel(settings.documentNumberSections));

        if (!docFormatFields || docFormatFields.dataset.rendered !== 'true') return;
        const prefix = docFormatFields.id;
        const general = generalDocumentFormat();
        DOC_FORMAT_INHERITED_SELECTS.forEach(([id, field]) => {
            setInheritedHint(
                document.getElementById(`${prefix}-${id}`),
                inheritedValueLabel(field, general[field]),
                unsetInheritedLabel(),
            );
        });
        // Los numéricos ya tienen dónde decirlo: el marcador del campo vacío,
        // que así deja de ser un guion suelto que no informa de nada.
        DOC_FORMAT_INHERITED_NUMBERS.forEach(([id, field]) => {
            const input = document.getElementById(`${prefix}-${id}`);
            if (!input) return;
            const value = general[field];
            input.placeholder = value || getTranslation('doc_format_placeholder_blank', '—');
            // El rótulo es prosa y escribe el decimal como el idioma; el
            // marcador se queda con el valor crudo, que es lo que se teclea.
            input.title = value
                ? `${getTranslation('doc_format_inherited_now', 'Hereda')}: ${documentFormatStatusNumber(value)}`
                : unsetInheritedLabel();
        });
    }
    window.__refreshInheritedDocumentHints = refreshInheritedDocumentHints;

    function readDocumentFormatFields(prefix) {
        const api = documentFormatApi();
        const value = (id) => {
            const field = document.getElementById(`${prefix}-${id}`);
            return field ? field.value.trim() : '';
        };
        const font = value('font');
        const raw = {
            align: value('align'),
            font: font === 'other' ? value('font-custom') : font,
            fontSize: value('fontsize'),
            lineHeight: value('lineheight'),
            paperSize: value('paper'),
            orientation: value('orientation'),
            marginTop: value('margin-top'),
            marginRight: value('margin-right'),
            marginBottom: value('margin-bottom'),
            marginLeft: value('margin-left'),
            indent: value('indent'),
            hyphenate: value('hyphenate'),
            pageBreakBeforeH1: value('pagebreak-h1'),
        };
        return api ? api.normalizeDocumentFormat(raw) : raw;
    }

    /*
      El formato de un documento vive en su propio bloque de metadatos, igual
      que el idioma y el autor: así viaja con el archivo y no depende de este
      navegador. Lo que el documento no diga lo pone el ajuste general.
    */
    function currentDocumentFormat() {
        const api = documentFormatApi();
        if (!api || !markdownEditor) return {};
        const { frontMatter } = splitDocumentFrontMatter(markdownEditor.getValue());
        return api.readFromFrontMatter(frontMatter);
    }

    function effectiveDocumentFormat() {
        const api = documentFormatApi();
        if (!api) return {};
        const general = (window.__edimarkLatexSettings || {}).documentFormat || {};
        return api.resolveDocumentFormat(general, currentDocumentFormat());
    }

    /*
      El resumen de la barra de estado. Enseña el formato ya resuelto —el que
      va a salir impreso—, no lo que guarda el documento: quien lo mira quiere
      saber cómo queda la página, y de dónde viene cada valor ya lo cuenta el
      cuadro de diálogo. Caben tres datos y el resto se va al título, que sí
      puede ser una lista.
    */
    const DOC_FORMAT_STATUS_LABELS = {
        align: {
            left: ['doc_format_status_align_left', 'Izq.'],
            justify: ['doc_format_status_align_justify', 'Just.'],
            right: ['doc_format_status_align_right', 'Der.'],
        },
        font: {
            serif: ['doc_format_status_font_serif', 'Serif'],
            sans: ['doc_format_status_font_sans', 'Sans'],
            mono: ['doc_format_status_font_mono', 'Mono'],
        },
        indent: {
            yes: ['doc_format_status_indent_yes', 'Sangría'],
            no: ['doc_format_status_indent_no', 'Sin sangría'],
        },
        hyphenate: {
            yes: ['doc_format_status_hyphenate_yes', 'Guiones'],
            no: ['doc_format_status_hyphenate_no', 'Sin guiones'],
        },
    };

    /*
      Por orden de mano —el de cualquier procesador de textos: tipo de letra y
      tamaño primero—, y se enseñan los tres primeros que este documento tenga
      decididos. Con una lista corta y fija, un documento que solo fija la
      tipografía y los guiones —que los hay— se quedaba sin nada que enseñar.
      Los márgenes no entran: un «2 cm» al lado de un «12 pt» se lee como otro
      tamaño, y en el título caben de sobra.
    */
    /*
      Los tres que decide cualquiera al empezar un documento, y en este orden:
      el tamaño va primero porque es el que se consulta a diario y el único que
      queda cuando la fila se estrecha. Lo demás —alineación, sangría, partición
      y márgenes— se lee en el rótulo emergente.
    */
    const DOC_FORMAT_STATUS_ORDER = ['fontSize', 'font', 'lineHeight'];
    // Un ajuste que no fija ni el documento ni las opciones generales.
    const DOC_FORMAT_STATUS_UNSET = '—';

    /* El nombre de una tipografía escrita a mano se enseña tal cual. */
    function documentFormatStatusPart(field, value) {
        if (!value) return '';
        if (field === 'fontSize') return `${documentFormatStatusNumber(value)} pt`;
        if (field === 'lineHeight') return documentFormatStatusNumber(value);
        const entry = (DOC_FORMAT_STATUS_LABELS[field] || {})[value];
        return entry ? getTranslation(entry[0], entry[1]) : String(value);
    }

    /* Los decimales se escriben como los escribe el idioma de la interfaz. */
    function documentFormatStatusNumber(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return String(value);
        return number.toLocaleString(window.__edimarkLang || 'es');
    }

    /*
      Todos los ajustes, también los que nadie ha fijado: la lista es la única
      respuesta completa a «cómo va a salir esto», y un campo que desaparece de
      ella no se distingue de uno que no existe.
    */
    function documentFormatStatusTitle(format) {
        const lines = [];
        const add = (labelKey, labelText, value) => {
            lines.push(`${getTranslation(labelKey, labelText)}: ${value || DOC_FORMAT_STATUS_UNSET}`);
        };
        add('doc_format_field_align', 'Alineación', inheritedValueLabel('align', format.align));
        add('doc_format_field_font', 'Tipo de letra', inheritedValueLabel('font', format.font));
        add('doc_format_field_fontsize', 'Tamaño (pt)', format.fontSize
            ? documentFormatStatusNumber(format.fontSize)
            : '');
        add('doc_format_field_lineheight', 'Interlineado', format.lineHeight
            ? documentFormatStatusNumber(format.lineHeight)
            : '');
        add('doc_format_field_paper', 'Tamaño de papel', inheritedValueLabel('paperSize', format.paperSize));
        add('doc_format_field_orientation', 'Orientación', inheritedValueLabel('orientation', format.orientation));
        // Los cuatro juntos y en el orden del cuadro de diálogo: decir tres
        // márgenes de cuatro sin avisar se lee mal.
        const sides = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
        add('doc_format_field_margins', 'Márgenes de página (cm)', sides
            .map(side => (format[side] ? documentFormatStatusNumber(format[side]) : DOC_FORMAT_STATUS_UNSET))
            .join(' / '));
        add('doc_format_field_indent', 'Sangría de primera línea', inheritedValueLabel('indent', format.indent));
        add('doc_format_field_hyphenate', 'Partir palabras con guion', inheritedValueLabel('hyphenate', format.hyphenate));
        add('doc_format_field_pagebreak_h1', 'Cada H1 empieza en página nueva', inheritedValueLabel('pageBreakBeforeH1', format.pageBreakBeforeH1));
        // Y qué quiere decir un guion, que si no se lee como un fallo.
        if (lines.some(line => line.endsWith(DOC_FORMAT_STATUS_UNSET))) {
            lines.push(getTranslation(
                'doc_format_status_unset_hint',
                '— : sin fijar, lo decide el programa que abra el documento.',
            ));
        }
        lines.push(getTranslation(
            'doc_format_status_hint',
            'Así saldrá al exportar o imprimir. Pulsa para cambiarlo.',
        ));
        return lines.join('\n');
    }

    function updateDocumentFormatStatus() {
        const button = document.getElementById('doc-format-status');
        const main = document.getElementById('doc-format-status-main');
        const rest = document.getElementById('doc-format-status-rest');
        if (!button || !main || !rest) return;
        const format = effectiveDocumentFormat();
        /*
          Los tres, siempre: media píldora que aparece y desaparece según lo que
          haya fijado obliga a abrir el cuadro para saber si un ajuste está sin
          poner o es que no cabía. El guion lo dice sin gastar sitio.
        */
        const parts = DOC_FORMAT_STATUS_ORDER
            .map(field => documentFormatStatusPart(field, format[field]) || DOC_FORMAT_STATUS_UNSET);
        button.classList.remove('hidden');
        main.textContent = parts[0];
        rest.textContent = `· ${parts.slice(1).join(' · ')}`;
        button.title = documentFormatStatusTitle(format);
    }
    window.__updateDocumentFormatStatus = updateDocumentFormatStatus;

    /*
      Los márgenes del documento, en el papel. La hoja los enseña como relleno
      —es una columna de texto, no una página—, pero al imprimir ese relleno se
      quita y quien manda es `@page`, que no se puede escribir en el `style` de
      un elemento: hace falta una regla de verdad, y de ahí esta hoja propia.
      Lo que el documento no fija se queda con el margen de partida del CSS de
      impresión, que va antes que esta.
    */
    /*
      Lo que hay que decirle al cuadro de impresión del sistema: los márgenes
      del documento y su papel, ya resueltos —lo que dice el documento y, donde
      calla, las opciones generales—. En Linux es la única vía, porque allí
      `@page` no llega; en los demás sistemas viaja igual y no estorba.
    */
    // Los mismos 18 mm que pone la hoja de impresión donde el documento calla:
    // sin esto, el lado sin fijar se quedaba con el del cuadro del sistema y el
    // papel salía distinto según dónde se imprimiera.
    const MARGEN_DE_PARTIDA_CM = 1.8;

    function paginaParaImprimir() {
        const format = effectiveDocumentFormat();
        const numero = (valor) => {
            if (valor === '' || valor === null || valor === undefined) return MARGEN_DE_PARTIDA_CM;
            const n = Number(valor);
            return Number.isFinite(n) ? n : MARGEN_DE_PARTIDA_CM;
        };
        return {
            marginTop: numero(format.marginTop),
            marginRight: numero(format.marginRight),
            marginBottom: numero(format.marginBottom),
            marginLeft: numero(format.marginLeft),
            paperSize: format.paperSize || null,
            orientation: format.orientation || null,
        };
    }
    window.__paginaParaImprimir = paginaParaImprimir;

    /*
      La página impresa, dicha en `@page`: el papel del documento y sus
      márgenes. El papel faltaba, así que un documento en Carta salía en A4 —o
      al revés— según lo que tuviera puesto la impresora, y el reparto en
      páginas que se ve en pantalla no era el del papel.

      Esto es lo que entienden el navegador y el webview de Windows y macOS. El
      de Linux no hace caso a `@page`, y allí los márgenes se los pone Rust al
      cuadro del sistema antes de abrirlo.
    */
    function applyDocumentMarginsToPrint(format) {
        let sheet = document.getElementById('doc-print-page-style');
        if (!sheet) {
            sheet = document.createElement('style');
            sheet.id = 'doc-print-page-style';
            document.head.appendChild(sheet);
        }
        const api = documentFormatApi();
        const paper = api && api.PAPER_SIZES ? api.PAPER_SIZES[format.paperSize] : null;
        const lados = [
            ['top', 'marginTop'],
            ['right', 'marginRight'],
            ['bottom', 'marginBottom'],
            ['left', 'marginLeft'],
        ].filter(([, key]) => format[key]);

        const pagina = lados.map(([side, key]) => `margin-${side}: ${format[key]}cm;`);
        if (paper) pagina.unshift(`size: ${paper.css}${format.orientation ? ` ${format.orientation}` : ''};`);

        const saltoH1 = format.pageBreakBeforeH1 === 'yes'
            ? '#html-output > h1:not(:first-of-type) { break-before: page; page-break-before: always; }'
            : '';
        const reglas = [pagina.length ? `@page { ${pagina.join(' ')} }` : '', saltoH1].filter(Boolean);
        sheet.textContent = reglas.length ? `@media print { ${reglas.join(' ')} }` : '';
    }

    /*
      El índice del editor visual.

      Marcar «Índice automático» no cambiaba nada hasta exportar, así que era un
      ajuste fácil de olvidar en las dos direcciones: entregar un DOCX sin
      índice creyendo que lo lleva, o con uno que no se quería. Aquí se enseña
      el que va a salir, con los mismos apartados y, ahora que la hoja está
      repartida en páginas, con sus números.

      Va dentro de la hoja porque tiene que ocupar su sitio en la primera
      página, pero no es contenido: no se puede editar y se retira antes de
      convertir la hoja en Markdown, en HTML o en lo que sea que salga de ella.
      El índice de verdad lo sigue poniendo Pandoc al exportar.
    */
    function documentLanguageCode() {
        if (!markdownEditor) return '';
        return splitDocumentFrontMatter(markdownEditor.getValue()).lang || generalDocumentLanguage();
    }

    function documentTocTitle() {
        const api = window.PandocExporter;
        if (!api || typeof api.resolveOutlineOptions !== 'function') return '';
        const { toc } = effectiveDocumentOutline();
        if (!toc) return '';
        const markdown = markdownEditor ? markdownEditor.getValue() : '';
        const propio = typeof api.tocTitleFor === 'function'
            ? api.tocTitleFor(documentLanguageCode(), markdown)
            : '';
        // En un idioma que la aplicación no habla, el rótulo de la interfaz: en
        // la hoja hace falta uno, aunque al exportar Pandoc ponga el suyo.
        return propio || getTranslation('preview_toc_title', 'Índice');
    }

    function effectiveDocumentOutline() {
        const api = window.PandocExporter;
        const general = window.__edimarkLatexSettings || {};
        if (!api || typeof api.resolveOutlineOptions !== 'function') {
            return { toc: false, tocDepth: 3, numberSections: false };
        }
        return api.resolveOutlineOptions(
            {
                toc: general.documentToc === true,
                tocDepth: general.documentTocDepth,
                numberSections: general.documentNumberSections === true,
            },
            currentDocumentOutline(),
        );
    }

    function previewTocHeadings(sheet) {
        const depth = effectiveDocumentOutline().tocDepth || 3;
        return Array.from(sheet.querySelectorAll(
            Array.from({ length: depth }, (_, index) => `:scope > h${index + 1}`).join(', '),
        ));
    }

    function refreshDocumentToc() {
        const sheet = document.getElementById('html-output');
        if (!sheet) return;
        const anterior = sheet.querySelector(':scope > [data-edimark-toc]');
        const titulo = documentTocTitle();
        if (!titulo) {
            if (anterior) anterior.remove();
            return;
        }
        const encabezados = previewTocHeadings(sheet);
        if (!encabezados.length) {
            if (anterior) anterior.remove();
            return;
        }

        const nav = document.createElement('nav');
        nav.dataset.edimarkToc = 'true';
        nav.className = 'doc-toc';
        nav.setAttribute('contenteditable', 'false');
        const rotulo = document.createElement('p');
        rotulo.className = 'doc-toc-title';
        rotulo.textContent = titulo;
        nav.appendChild(rotulo);

        encabezados.forEach((encabezado, indice) => {
            const linea = document.createElement('a');
            linea.className = `doc-toc-entry doc-toc-${encabezado.tagName.toLowerCase()}`;
            linea.href = '#';
            linea.dataset.tocTarget = String(indice);
            const texto = document.createElement('span');
            texto.className = 'doc-toc-text';
            texto.textContent = encabezado.textContent.trim();
            const pagina = document.createElement('span');
            pagina.className = 'doc-toc-page';
            linea.append(texto, pagina);
            nav.appendChild(linea);
        });

        if (anterior) {
            anterior.replaceWith(nav);
        } else {
            sheet.insertBefore(nav, sheet.firstChild);
        }
    }
    window.__refreshDocumentToc = refreshDocumentToc;

    /*
      Y sirve para moverse: un índice que no lleva a ninguna parte invita a
      pulsarlo igualmente. El `href` es de mentira —el apartado no tiene ancla—,
      así que hay que quedarse con el clic antes de que el navegador lo siga.
    */
    document.addEventListener('click', (event) => {
        const entrada = event.target.closest?.('#html-output [data-edimark-toc] .doc-toc-entry');
        if (!entrada) return;
        event.preventDefault();
        const sheet = document.getElementById('html-output');
        const encabezados = previewTocHeadings(sheet);
        const destino = encabezados[Number(entrada.dataset.tocTarget)];
        if (destino) destino.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    /*
      Los números, cuando ya se sabe por dónde parte cada página. Se escriben
      después del reparto y no antes, porque el índice ocupa sitio en la primera
      página y mueve todo lo demás.
    */
    function updateTocPageNumbers(alturaPagina) {
        const sheet = document.getElementById('html-output');
        const nav = sheet ? sheet.querySelector(':scope > [data-edimark-toc]') : null;
        if (!nav) return;
        const encabezados = previewTocHeadings(sheet);
        const origen = sheet.getBoundingClientRect().top - sheet.offsetTop;
        nav.querySelectorAll('.doc-toc-entry').forEach((entrada) => {
            const encabezado = encabezados[Number(entrada.dataset.tocTarget)];
            const hueco = entrada.querySelector('.doc-toc-page');
            if (!encabezado || !hueco) return;
            if (!alturaPagina) {
                hueco.textContent = '';
                return;
            }
            const arriba = encabezado.getBoundingClientRect().top - origen - sheet.offsetTop;
            hueco.textContent = String(Math.floor(arriba / alturaPagina) + 1);
        });
    }

    const PX_POR_CM = 96 / 2.54;
    // Los mismos 18 mm que usa la impresión cuando el documento no dice otra cosa.
    const MARGEN_POR_DEFECTO_CM = 1.8;
    // El hueco entre dos hojas, como el que deja cualquier procesador de textos.
    const HUECO_ENTRE_PAGINAS = 24;

    function limpiarPaginacion(sheet, layer) {
        layer.replaceChildren();
        sheet.classList.remove('is-paginated');
        sheet.querySelectorAll(':scope > [data-page-start]').forEach((bloque) => {
            bloque.removeAttribute('data-page-start');
            bloque.style.removeProperty('--page-jump');
        });
    }

    /*
      Reparte el documento en páginas.

      No se trocea nada: el texto sigue en un solo bloque editable y lo que se
      hace es empujar hacia abajo el primer bloque de cada página, tanto como
      mide el hueco entre hojas más los dos márgenes que se saltan. Así el corte
      cae siempre entre dos bloques —nunca a media línea— y el cursor no cambia
      de contenedor al escribir.

      Un bloque más alto que la página entera no cabe en ninguna parte: se deja
      pasar y lo atraviesa el hueco, que es lo que hace también un procesador de
      textos con una tabla enorme.
    */
    function refreshPageBreaks() {
        const desk = document.getElementById('preview-desk');
        const sheet = document.getElementById('html-output');
        const layer = document.getElementById('page-sheets');
        if (!desk || !sheet || !layer) return;

        const api = documentFormatApi();
        const format = effectiveDocumentFormat();
        const paper = api && api.PAPER_SIZES ? api.PAPER_SIZES[format.paperSize] : null;
        const landscape = format.orientation === 'landscape';
        const zoom = Number(getComputedStyle(document.documentElement)
            .getPropertyValue('--preview-zoom')) || 1;
        const anchoPapel = paper ? (landscape ? paper.heightCm : paper.widthCm) * PX_POR_CM * zoom : 0;

        /*
          Sin papel, o con la hoja estrechada para que quepa en la ventana, las
          páginas mentirían: el texto no rompe donde rompería en la página.
        */
        if (!paper || !isPreviewVisible() || sheet.getBoundingClientRect().width < anchoPapel - 1) {
            limpiarPaginacion(sheet, layer);
            // Sin páginas no hay números que enseñar: un índice con los de la
            // última vez sería peor que uno sin ellos.
            updateTocPageNumbers(0);
            return;
        }

        const numero = valor => (valor === '' || valor === null || typeof valor === 'undefined'
            ? MARGEN_POR_DEFECTO_CM
            : Number(valor));
        const margenSuperior = numero(format.marginTop) * PX_POR_CM * zoom;
        const margenInferior = numero(format.marginBottom) * PX_POR_CM * zoom;
        const altoPagina = (landscape ? paper.widthCm : paper.heightCm) * PX_POR_CM * zoom;
        const altoUtil = altoPagina - margenSuperior - margenInferior;
        if (!(altoUtil > 40)) {
            limpiarPaginacion(sheet, layer);
            updateTocPageNumbers(0);
            return;
        }

        // El salto que hay que meter para pasar de una caja de texto a la
        // siguiente: lo que queda de página, el hueco y el margen de la nueva.
        const salto = margenInferior + HUECO_ENTRE_PAGINAS + margenSuperior;

        // Desde cero: con los saltos de la vuelta anterior puestos, las alturas
        // que se midieran serían las de la página anterior, no las de esta.
        sheet.classList.add('is-paginated');
        const bloques = Array.from(sheet.children);
        bloques.forEach((bloque) => {
            bloque.removeAttribute('data-page-start');
            bloque.style.removeProperty('--page-jump');
        });

        /*
          Las alturas se miden sin ningún salto puesto, así que son las de un
          documento seguido; el reparto se lleva aparte. `inicioPagina` es dónde
          empieza la caja de texto de la página en curso, en esas mismas
          coordenadas de documento seguido: por eso al abrir una página nueva
          pasa a valer la posición natural del bloque que la estrena.
        */
        const medidas = bloques.map(bloque => ({
            bloque,
            alto: bloque.getBoundingClientRect().height,
            desde: bloque.offsetTop,
        }));

        let inicioPagina = margenSuperior;
        let paginas = 1;
        let vistoPrimerH1 = false;
        // Qué bloque estrenó la página en curso: un encabezado no se puede
        // arrastrar a la página siguiente si es él quien la abre.
        let indiceInicioPagina = 0;
        // Qué página estrena cada bloque, para poder afinarlo después: con un
        // bloque más alto que la hoja, el orden ya no coincide con la página.
        const inicios = [];
        const esEncabezado = bloque => /^H[1-6]$/.test(bloque.tagName);
        medidas.forEach(({ bloque, alto, desde }, indice) => {
            let relativo = desde - inicioPagina;
            const esH1 = bloque.tagName === 'H1';
            const saltoForzado = format.pageBreakBeforeH1 === 'yes'
                && esH1 && vistoPrimerH1 && relativo > 0.5;
            if (esH1) vistoPrimerH1 = true;
            if (indice > 0 && (saltoForzado || relativo + alto > altoUtil)) {
                /*
                  Un título no se queda solo al pie de la página. Si lo que baja
                  a la hoja siguiente venía justo detrás de un encabezado, el
                  salto se adelanta hasta el encabezado y bajan juntos, que es lo
                  que hace cualquier procesador de textos. Se recorren varios
                  seguidos —un título y su subtítulo— y solo mientras quepan: si
                  arrastrarlos no ahorra el hueco, no se toca nada. El salto
                  forzado del H1 queda fuera: ahí la página la estrena el H1 y no
                  lo que hubiera antes.
                */
                let arranque = indice;
                if (!saltoForzado) {
                    while (arranque - 1 > indiceInicioPagina
                        && esEncabezado(medidas[arranque - 1].bloque)
                        && desde + alto - medidas[arranque - 1].desde <= altoUtil) {
                        arranque -= 1;
                    }
                }
                const primero = medidas[arranque];
                primero.bloque.setAttribute('data-page-start', '');
                primero.bloque.style.setProperty(
                    '--page-jump',
                    `${altoUtil + salto - (primero.desde - inicioPagina)}px`,
                );
                inicioPagina = primero.desde;
                relativo = desde - inicioPagina;
                paginas += 1;
                indiceInicioPagina = arranque;
                inicios.push({ bloque: primero.bloque, pagina: paginas });
            }
            /*
              Un bloque más alto que la caja de texto no cabe en ninguna página
              —una tabla larga, una imagen enorme—: no se le puede hacer sitio,
              así que se cuentan las páginas que ocupa y se sigue por la
              siguiente. Es lo que hace también un procesador de textos.
            */
            const extra = Math.floor((relativo + alto) / altoUtil);
            if (extra > 0) {
                paginas += extra;
                inicioPagina += extra * altoUtil;
            }
        });

        /*
          Y el ajuste fino, midiendo lo que ha quedado. Entre el reparto y la
          pantalla se cuelan los márgenes que colapsan entre bloques y el
          redondeo de cada salto, unos pocos píxeles que se van sumando página
          tras página. Corregirlos con la medida en la mano sale más barato que
          intentar predecirlos, y cada corrección se ve ya en la siguiente.
        */
        // Con `getBoundingClientRect` y no `offsetTop`: este redondea al píxel,
        // y medio píxel por página se acumula hasta descuadrar la última.
        const origen = sheet.getBoundingClientRect().top - sheet.offsetTop;
        inicios.forEach(({ bloque, pagina }) => {
            const objetivo = sheet.offsetTop
                + (pagina - 1) * (altoPagina + HUECO_ENTRE_PAGINAS)
                + margenSuperior;
            const actual = bloque.getBoundingClientRect().top - origen;
            const desvio = objetivo - actual;
            if (Math.abs(desvio) < 0.5) return;
            const puesto = Number.parseFloat(bloque.style.getPropertyValue('--page-jump')) || 0;
            bloque.style.setProperty('--page-jump', `${Math.max(0, puesto + desvio)}px`);
        });

        // Y las hojas, una por página, debajo del texto.
        const izquierda = sheet.offsetLeft;
        const ancho = sheet.offsetWidth;
        /*
          El hueco que le queda a la derecha con la hoja centrada, y el que
          decide si el número de página cabe fuera. Se saca del ancho libre de
          la mesa y no de dónde está ahora la hoja: el envoltorio se ensancha
          con la propia etiqueta, así que preguntarle su posición era medir la
          decisión con su propio resultado, y las dos respuestas se alternaban
          dejando la mesa desplazada a lo ancho por unos pocos píxeles. Con la
          hoja desbordada la resta sale negativa, que es lo que se quería
          decir: a la derecha no hay sitio.
        */
        const estrecho = (anchoUtilDeLaMesa() - ancho) / 2 < 56;
        layer.classList.toggle('tight', estrecho);
        const hojas = [];
        for (let i = 0; i < paginas; i += 1) {
            const hoja = document.createElement('div');
            hoja.className = 'page-sheet';
            // Sin redondear: la hoja y el texto tienen que medirse igual, o el
            // desfase se ve al final de un documento largo.
            hoja.style.top = `${sheet.offsetTop + i * (altoPagina + HUECO_ENTRE_PAGINAS)}px`;
            hoja.style.left = `${izquierda}px`;
            hoja.style.width = `${ancho}px`;
            hoja.style.height = `${altoPagina}px`;
            const etiqueta = document.createElement('span');
            etiqueta.className = 'page-sheet-label';
            etiqueta.textContent = formatTranslation(
                'page_break_label',
                'Página {page}',
                { page: String(i + 1) },
            );
            hoja.appendChild(etiqueta);
            hojas.push(hoja);
        }
        layer.replaceChildren(...hojas);
        updateTocPageNumbers(altoPagina + HUECO_ENTRE_PAGINAS);
    }
    window.__refreshPageBreaks = refreshPageBreaks;

    /*
      La altura de la hoja cambia sin avisar: al escribir, al cargar una imagen
      o una fórmula, al mover la lupa. Y la mesa cambia de ancho al repartir los
      paneles, que es lo que decide si el número de página cabe fuera de la
      hoja. Hay que mirar las dos, y una vez por fotograma: un cambio de
      disposición dispara el observador muchas veces seguidas.
    */
    let repintadoDeCortes = null;
    function schedulePageBreaks() {
        if (repintadoDeCortes) return;
        repintadoDeCortes = requestAnimationFrame(() => {
            repintadoDeCortes = null;
            /*
              Primero la lupa y después los cortes: el ajuste al ancho cambia
              lo que mide la hoja, y midiendo antes las páginas saldrían con el
              aumento anterior. Aplicado aquí mismo, la medida que viene
              después ya es la buena.
            */
            aplicarAjusteAlAncho();
            fitWidePreformattedBlocks(document.getElementById('html-output'));
            // El ancho ha cambiado, y con él hasta dónde puede llegar la lupa.
            refrescarTopeDeLaLupa();
            refreshPageBreaks();
        });
    }
    window.__schedulePageBreaks = schedulePageBreaks;
    if (typeof ResizeObserver === 'function') {
        const observador = new ResizeObserver(schedulePageBreaks);
        ['html-output', 'preview-desk'].forEach((id) => {
            const elemento = document.getElementById(id);
            if (elemento) observador.observe(elemento);
        });
    }
    window.addEventListener('resize', () => {
        /*
          Al cambiar de tamaño la ventana se rehace también el reparto de los
          paneles: quien arranca con la ventana pequeña se queda con los dos a
          medias —la hoja no cabía— y al maximizar tenía que mover el separador
          a mano para recuperar el tamaño real. Si ya lo movió, manda él.
        */
        ajustarRepartoDePaneles();
        // Cruzar el ancho donde los paneles se apilan enciende o apaga la atadura.
        pintarInterruptorDelPanelAtado();
        schedulePageBreaks();
    });

    /*
      La vista previa es donde se comprueba el ajuste antes de exportar. Los
      encabezados no se tocan: la hoja de estilos ya los mide en `em` y siguen
      al cuerpo solos.
    */
    function applyDocumentFormatToPreview() {
        const api = documentFormatApi();
        const preview = document.getElementById('html-output');
        // El resumen de la barra no depende de que haya vista previa montada.
        updateDocumentFormatStatus();
        applyDocumentMarginsToPrint(effectiveDocumentFormat());
        // El índice puede acabar de encenderse o apagarse en el mismo cuadro.
        refreshDocumentToc();
        if (!api || !preview) return;
        const styles = api.toPreviewStyles(effectiveDocumentFormat());
        // Un formato con todo puesto nombra todas las propiedades que hay que
        // retirar; si aquí faltara una, la de antes se quedaría pegada.
        Object.keys(api.toPreviewStyles({
            align: 'left', font: 'serif', fontSize: '12', lineHeight: '1', paperSize: 'a4',
            orientation: 'landscape',
            marginTop: '1', marginRight: '1', marginBottom: '1', marginLeft: '1',
            indent: 'no', hyphenate: 'no', pageBreakBeforeH1: 'no',
        })).forEach(property => preview.style.removeProperty(property));
        Object.entries(styles).forEach(([property, value]) => {
            preview.style.setProperty(property, value);
        });
        // El papel acaba de cambiar de ancho: el reparto de los paneles y la
        // lupa ajustada se hacen con esa medida, así que se rehacen aquí.
        ajustarRepartoDePaneles();
        aplicarAjusteAlAncho();
        refreshPageBreaks();
    }
    window.__applyDocumentFormatToPreview = applyDocumentFormatToPreview;

    /*
      Índice y numeración de este documento. Viven en el mismo bloque de
      metadatos que el formato y con la misma regla: sin línea, manda la opción
      general; con ella, manda el documento aunque diga que no.
    */
    function currentDocumentOutline() {
        const api = window.PandocExporter;
        if (!api || typeof api.readOutlineFromFrontMatter !== 'function' || !markdownEditor) {
            return { toc: '', tocDepth: '', numberSections: '' };
        }
        const { frontMatter } = splitDocumentFrontMatter(markdownEditor.getValue());
        return api.readOutlineFromFrontMatter(frontMatter);
    }

    const OUTLINE_YAML_KEYS = ['toc', 'toc-depth', 'numbersections'];

    function outlineEntries(outline) {
        const api = window.PandocExporter;
        return api && typeof api.outlineFrontMatterEntries === 'function'
            ? api.outlineFrontMatterEntries(outline)
            : [];
    }

    /* Escribe en el documento solo los ajustes con valor y borra los demás. */
    function writeDocumentMetadata(entries, managed) {
        if (!markdownEditor) return;
        const wanted = new Map(entries.map(entry => [entry.key, entry.lines[0]]));
        const current = markdownEditor.getValue();
        const { frontMatter, body } = splitDocumentFrontMatter(current);

        const kept = [];
        if (frontMatter) {
            frontMatter.split('\n').slice(1, -1).forEach((line) => {
                const key = (line.match(/^([A-Za-z][\w-]*)\s*:/) || [])[1];
                if (key && managed.includes(key)) {
                    // Una clave que sigue teniendo valor se reescribe en su sitio.
                    if (wanted.has(key)) {
                        kept.push(wanted.get(key));
                        wanted.delete(key);
                    }
                    return;
                }
                kept.push(line);
            });
        }
        wanted.forEach(line => kept.push(line));

        const hasFields = kept.some(line => line.trim());
        const updated = hasFields
            ? `---\n${kept.join('\n')}\n---\n\n${body || (frontMatter ? '' : current)}`
            : (body || (frontMatter ? '' : current));
        if (updated === current) {
            applyDocumentFormatToPreview();
            return;
        }
        markdownEditor.setValue(updated);
        updateHtml();
        applyDocumentFormatToPreview();
    }

    /*
      Formato, índice y numeración se guardan de una sola vez: los tres viven en
      el mismo bloque, y reescribirlo una vez por ajuste movería el cursor tres
      veces y dejaría tres pasos en el historial de deshacer.
    */
    function setDocumentFormat(format, outline) {
        const api = documentFormatApi();
        if (!api) return;
        writeDocumentMetadata(
            [...api.toFrontMatterEntries(format), ...outlineEntries(outline)],
            [...api.YAML_KEYS.map(([, key]) => key), ...OUTLINE_YAML_KEYS],
        );
    }

    /*
      Idioma y autor viven en el mismo bloque de metadatos que el formato, así
      que se editan en el mismo cuadro: todo lo que es de este documento junto.
    */
    const LISTED_OWN_LANGUAGES = ['es', 'en', 'ca', 'gl', 'eu'];

    function syncOwnLanguageCodeField() {
        if (!docOwnLanguageRow || !docOwnLanguage) return;
        docOwnLanguageRow.classList.toggle('hidden', docOwnLanguage.value !== 'other');
    }

    function fillDocumentOwnFields() {
        const own = window.__documentOwnSettings;
        if (!own) return;
        const language = String(own.language() || '').trim();
        const listed = LISTED_OWN_LANGUAGES.includes(language);
        if (docOwnLanguage) docOwnLanguage.value = language ? (listed ? language : 'other') : '';
        if (docOwnLanguageCode) docOwnLanguageCode.value = listed ? '' : language;
        if (docOwnAuthor) docOwnAuthor.value = own.author() || '';
        const outline = currentDocumentOutline();
        if (docOwnToc) docOwnToc.value = outlineFieldValue(outline.toc);
        if (docOwnTocDepth) docOwnTocDepth.value = outline.tocDepth === '' ? '' : String(outline.tocDepth);
        if (docOwnNumberSections) docOwnNumberSections.value = outlineFieldValue(outline.numberSections);
        syncOwnLanguageCodeField();
    }

    /* Los campos hablan en sí/no/vacío y el modelo en true/false/vacío. */
    function outlineFieldValue(value) {
        if (value === true) return 'yes';
        if (value === false) return 'no';
        return '';
    }

    function readOwnOutlineFromFields() {
        const value = (field) => {
            if (!field || !field.value) return '';
            return field.value === 'yes';
        };
        return {
            toc: value(docOwnToc),
            tocDepth: docOwnTocDepth && docOwnTocDepth.value ? Number(docOwnTocDepth.value) : '',
            numberSections: value(docOwnNumberSections),
        };
    }

    function readOwnLanguageFromFields() {
        if (!docOwnLanguage) return '';
        if (docOwnLanguage.value !== 'other') return docOwnLanguage.value;
        return docOwnLanguageCode ? docOwnLanguageCode.value.trim() : '';
    }

    let selectDocFormatTab = null;

    /*
      `tab` dice con cuál de las dos se abre: quien viene de la píldora del
      formato quiere el formato, y hacerle pulsar la pestaña cada vez sobra.
    */
    /*
      ---------------------------------------------------------------------
      Perfiles de formato
      ---------------------------------------------------------------------

      Un perfil es el mismo juego de ajustes con un nombre, para no repetirlo
      documento a documento. Aplicarlo no escribe en el Markdown: rellena los
      campos de este cuadro y deja que sea el botón «Aplicar» de siempre quien
      lo lleve al documento, de modo que cancelar sigue descartando de verdad y
      no hay dos caminos distintos para escribir lo mismo.

      Viven en `localStorage`, como las opciones generales: son de quien usa el
      programa, no del documento, y por eso no viajan con él.
    */
    const FORMAT_PROFILES_KEY = 'edimarkweb-format-profiles';

    function formatProfilesApi() {
        return window.EdiMarkFormatProfiles;
    }

    function readFormatProfiles() {
        const api = formatProfilesApi();
        if (!api) return [];
        const raw = safeLocalStorageGet(FORMAT_PROFILES_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map(entry => api.normalizeProfile(entry))
                .filter(profile => profile.name && !api.isEmptyProfile(profile))
                .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
        } catch (error) {
            console.warn('Perfiles de formato ilegibles, se ignoran:', error);
            return [];
        }
    }

    function storeFormatProfiles(profiles) {
        return safeLocalStorageSet(FORMAT_PROFILES_KEY, JSON.stringify(profiles));
    }

    function findFormatProfile(name) {
        const wanted = String(name || '').trim().toLowerCase();
        return readFormatProfiles().find(profile => profile.name.toLowerCase() === wanted) || null;
    }

    /* Lo que dicen ahora mismo los campos del cuadro, en forma de perfil. */
    function profileFromDocFormatFields(name = '') {
        const api = formatProfilesApi();
        if (!api) return null;
        const outline = readOwnOutlineFromFields();
        return api.profileFromSettings({
            documentFormat: readDocumentFormatFields('doc-format-fields'),
            documentToc: outline.toc,
            documentTocDepth: outline.tocDepth,
            documentNumberSections: outline.numberSections,
        }, name);
    }

    function syncFormatProfileButtons() {
        const chosen = Boolean(docFormatProfileSelect && docFormatProfileSelect.value);
        if (docFormatProfileApplyBtn) docFormatProfileApplyBtn.disabled = !chosen;
        if (docFormatProfileDeleteBtn) docFormatProfileDeleteBtn.disabled = !chosen;
    }

    function renderFormatProfiles(selected = null) {
        if (!docFormatProfileSelect) return;
        const wanted = selected === null ? docFormatProfileSelect.value : selected;
        const profiles = readFormatProfiles();
        docFormatProfileSelect.replaceChildren();
        const none = document.createElement('option');
        none.value = '';
        none.textContent = getTranslation('profile_none', 'Ninguno');
        docFormatProfileSelect.appendChild(none);
        profiles.forEach((profile) => {
            const option = document.createElement('option');
            option.value = profile.name;
            option.textContent = profile.name;
            docFormatProfileSelect.appendChild(option);
        });
        docFormatProfileSelect.value = profiles.some(profile => profile.name === wanted) ? wanted : '';
        syncFormatProfileButtons();
    }

    function showFormatProfileError(key, fallback) {
        if (!docFormatProfileError) return;
        docFormatProfileError.textContent = getTranslation(key, fallback);
        docFormatProfileError.classList.remove('hidden');
    }

    function toggleFormatProfileForm(show) {
        if (!docFormatProfileForm) return;
        docFormatProfileForm.classList.toggle('hidden', !show);
        docFormatProfileSaveBtn?.setAttribute('aria-expanded', String(show));
        if (docFormatProfileError) {
            docFormatProfileError.classList.add('hidden');
            docFormatProfileError.textContent = '';
        }
        if (!show) {
            docFormatProfileForm.reset();
            return;
        }
        // Guardar sobre un perfil elegido es lo más habitual: se propone su
        // nombre para actualizarlo sin tener que escribirlo otra vez.
        if (docFormatProfileName) {
            docFormatProfileName.value = docFormatProfileSelect ? docFormatProfileSelect.value : '';
            docFormatProfileName.focus();
            docFormatProfileName.select();
        }
    }

    /* Lo que el perfil fija sustituye al campo; lo que deja vacío se queda. */
    function applyFormatProfileToFields(profile) {
        const api = formatProfilesApi();
        if (!api || !profile) return;
        const outline = readOwnOutlineFromFields();
        const applied = api.applyProfileToSettings({
            documentFormat: readDocumentFormatFields('doc-format-fields'),
            documentToc: outline.toc,
            documentTocDepth: outline.tocDepth,
            documentNumberSections: outline.numberSections,
        }, profile);
        fillDocumentFormatFields('doc-format-fields', applied.documentFormat);
        if (docOwnToc) docOwnToc.value = outlineFieldValue(applied.documentToc);
        if (docOwnTocDepth) docOwnTocDepth.value = applied.documentTocDepth === '' ? '' : String(applied.documentTocDepth);
        if (docOwnNumberSections) docOwnNumberSections.value = outlineFieldValue(applied.documentNumberSections);
        refreshInheritedDocumentHints();
    }

    function saveFormatProfileFromFields(name) {
        const api = formatProfilesApi();
        if (!api) return false;
        const clean = String(name || '').trim();
        if (!clean) {
            showFormatProfileError('profile_name_required', 'Escribe un nombre para el perfil.');
            return false;
        }
        const profile = profileFromDocFormatFields(clean);
        if (!profile || api.isEmptyProfile(profile)) {
            showFormatProfileError('profile_empty', 'No hay ningún ajuste propio que guardar en un perfil.');
            return false;
        }
        const others = readFormatProfiles().filter(entry => entry.name.toLowerCase() !== clean.toLowerCase());
        const replaced = others.length !== readFormatProfiles().length;
        if (!storeFormatProfiles([...others, profile])) return false;
        renderFormatProfiles(profile.name);
        toggleFormatProfileForm(false);
        notifyUser(formatTranslation(
            replaced ? 'profile_updated' : 'profile_saved',
            replaced ? 'Perfil «{name}» actualizado.' : 'Perfil «{name}» guardado.',
            { name: profile.name },
        ));
        return true;
    }

    function toggleDocFormatModal(show, { tab = 'document' } = {}) {
        if (!docFormatOverlay) return;
        docFormatOverlay.style.display = show ? 'flex' : 'none';
        if (!show) return;
        /*
          Las mismas dos pestañas que el cuadro de opciones, y en el mismo
          orden: lo de este documento y lo general se leen en paralelo, y una
          lista de veinte campos seguidos no se abarca de una mirada.
        */
        const tablist = document.getElementById('doc-format-tablist');
        selectDocFormatTab = setupSettingsTabs(tablist) || selectDocFormatTab;
        const pedida = tablist && document.getElementById(`doc-format-tab-${tab}`);
        const elegida = pedida || (tablist && tablist.querySelector('[role="tab"]'));
        if (selectDocFormatTab && elegida) selectDocFormatTab(elegida);
        renderDocumentFormatFields(docFormatFields, { inherit: true });
        /*
          El aviso del enlace a las opciones generales se pone aquí y no con
          `data-i18n-key`: el traductor, cuando un elemento tiene `title`, deja
          en él la traducción y ya no toca el texto, y este botón necesita las
          dos cosas distintas.
        */
        const general = document.getElementById('doc-format-open-general');
        if (general) {
            general.title = getTranslation(
                'doc_format_open_general_hint',
                'Cierra este cuadro sin aplicar cambios y abre las opciones generales.',
            );
        }
        // Siempre desde el documento: cancelar tiene que descartar de verdad.
        fillDocumentFormatFields('doc-format-fields', currentDocumentFormat());
        fillDocumentOwnFields();
        renderFormatProfiles('');
        toggleFormatProfileForm(false);
        refreshInheritedDocumentHints();
        // El foco, en la pestaña con la que se abre y no en la primera: es la
        // que va a recorrer con las flechas quien acaba de elegirla.
        setTimeout(() => {
            if (elegida) elegida.focus();
        }, 0);
    }
    window.__openDocumentSettings = () => toggleDocFormatModal(true);

    if (docOwnLanguage) {
        docOwnLanguage.addEventListener('change', () => {
            syncOwnLanguageCodeField();
            if (docOwnLanguage.value === 'other' && docOwnLanguageCode) docOwnLanguageCode.focus();
        });
    }
    if (docFormatToolbarBtn) {
        docFormatToolbarBtn.addEventListener('click', () => toggleDocFormatModal(true));
    }
    // El resumen de la barra de estado lleva al mismo sitio: enseña el formato
    // y de paso es el camino más corto para cambiarlo.
    const docFormatStatusBtn = document.getElementById('doc-format-status');
    if (docFormatStatusBtn) {
        docFormatStatusBtn.addEventListener('click', () => toggleDocFormatModal(true, { tab: 'format' }));
    }
    /*
      Del cuadro de este documento al general, por la misma pestaña: quien mira
      de dónde hereda un campo suele querer cambiarlo para todos. Cierra sin
      guardar, como cancelar, y el rótulo emergente lo avisa.
    */
    const docFormatOpenGeneralBtn = document.getElementById('doc-format-open-general');
    if (docFormatOpenGeneralBtn) {
        docFormatOpenGeneralBtn.addEventListener('click', () => {
            const enFormato = document.getElementById('doc-format-tab-format')
                ?.getAttribute('aria-selected') === 'true';
            toggleDocFormatModal(false);
            toggleLatexSettingsModal(true, { tab: enFormato ? 'format' : 'document' });
        });
    }

    // Y la del idioma, al mismo cuadro: el idioma se cambia en su primera fila.
    const docLanguageStatusBtn = document.getElementById('doc-language-status');
    if (docLanguageStatusBtn) {
        docLanguageStatusBtn.addEventListener('click', () => toggleDocFormatModal(true));
    }
    if (docFormatCancelBtn) {
        docFormatCancelBtn.addEventListener('click', () => toggleDocFormatModal(false));
    }
    if (docFormatProfileSelect) {
        docFormatProfileSelect.addEventListener('change', syncFormatProfileButtons);
    }
    if (docFormatProfileApplyBtn) {
        docFormatProfileApplyBtn.addEventListener('click', () => {
            const profile = findFormatProfile(docFormatProfileSelect ? docFormatProfileSelect.value : '');
            if (!profile) return;
            applyFormatProfileToFields(profile);
            toggleFormatProfileForm(false);
        });
    }
    if (docFormatProfileSaveBtn) {
        docFormatProfileSaveBtn.setAttribute('aria-controls', 'doc-format-profile-form');
        docFormatProfileSaveBtn.setAttribute('aria-expanded', 'false');
        docFormatProfileSaveBtn.addEventListener('click', () => {
            toggleFormatProfileForm(docFormatProfileForm?.classList.contains('hidden'));
        });
    }
    if (docFormatProfileCancelBtn) {
        docFormatProfileCancelBtn.addEventListener('click', () => toggleFormatProfileForm(false));
    }
    if (docFormatProfileForm) {
        docFormatProfileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            saveFormatProfileFromFields(docFormatProfileName ? docFormatProfileName.value : '');
        });
    }
    if (docFormatProfileDeleteBtn) {
        docFormatProfileDeleteBtn.addEventListener('click', async () => {
            const profile = findFormatProfile(docFormatProfileSelect ? docFormatProfileSelect.value : '');
            if (!profile) return;
            const confirmed = await confirmAction(formatTranslation(
                'profile_delete_confirm',
                '¿Borrar el perfil «{name}»? Los documentos que lo usaron no cambian.',
                { name: profile.name },
            ));
            if (!confirmed) return;
            const others = readFormatProfiles().filter(entry => entry.name !== profile.name);
            if (!storeFormatProfiles(others)) return;
            renderFormatProfiles('');
            toggleFormatProfileForm(false);
        });
    }
    if (docFormatResetBtn) {
        // Deja el documento sin nada propio: vuelve a seguir a los generales.
        docFormatResetBtn.addEventListener('click', () => {
            fillDocumentFormatFields('doc-format-fields', {});
            if (docOwnLanguage) docOwnLanguage.value = '';
            if (docOwnLanguageCode) docOwnLanguageCode.value = '';
            if (docOwnAuthor) docOwnAuthor.value = '';
            if (docOwnToc) docOwnToc.value = '';
            if (docOwnNumberSections) docOwnNumberSections.value = '';
            syncOwnLanguageCodeField();
        });
    }
    /*
      Intro confirma el cuadro, como en cualquier diálogo.

      Sin esto, quien escribía un número y pulsaba Intro no veía pasar nada: el
      cuadro seguía abierto, el botón de guardar estaba fuera de la vista al
      final de una lista larga de campos, y al cerrar con Escape o pulsando
      fuera el valor se iba con él. Parecía que el ajuste no se guardaba salvo
      que antes se cambiara el foco de campo, que es cuando el botón se busca.

      Quedan fuera el preámbulo de LaTeX —ahí Intro es un salto de línea—, los
      botones y enlaces, que el navegador ya activa por su cuenta, y los campos
      de un formulario propio, como el de las referencias o el del nombre de un
      perfil: allí Intro tiene que enviar ese formulario, no el cuadro entero.
    */
    function confirmarConIntro(overlay, saveButton) {
        if (!overlay || !saveButton) return;
        overlay.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target;
            if (!target || typeof target.closest !== 'function') return;
            if (target.closest('textarea, button, a, [role="tab"], form')) return;
            event.preventDefault();
            saveButton.click();
        });
    }
    confirmarConIntro(docFormatOverlay, docFormatSaveBtn);
    confirmarConIntro(latexSettingsOverlay, latexSettingsSaveBtn);

    if (docFormatSaveBtn) {
        docFormatSaveBtn.addEventListener('click', () => {
            const own = window.__documentOwnSettings;
            // El idioma y el autor van primero: los tres reescriben el mismo
            // bloque, y el formato es el que deja el cursor donde estaba.
            if (own) {
                own.setLanguage(readOwnLanguageFromFields());
                own.setAuthor(docOwnAuthor ? docOwnAuthor.value : '');
            }
            setDocumentFormat(readDocumentFormatFields('doc-format-fields'), readOwnOutlineFromFields());
            toggleDocFormatModal(false);
        });
    }
    if (docFormatOverlay) {
        docFormatOverlay.addEventListener('click', (event) => {
            if (event.target === docFormatOverlay) toggleDocFormatModal(false);
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !docFormatOverlay) return;
        if (docFormatOverlay.style.display === 'flex') toggleDocFormatModal(false);
    });

    /*
      Pestañas del cuadro de opciones. Son cuatro asuntos distintos —el
      documento, el formato del texto, el EPUB y LaTeX— y de una vez no cabían
      en la pantalla sin desplazarse: mejor una cada vez.
    */
    function setupSettingsTabs(tablist) {
        if (!tablist || tablist.dataset.wired === 'true') return;
        const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        const select = (tab) => {
            tabs.forEach((item) => {
                const chosen = item === tab;
                item.setAttribute('aria-selected', chosen ? 'true' : 'false');
                item.tabIndex = chosen ? 0 : -1;
                const panel = document.getElementById(item.getAttribute('aria-controls'));
                if (panel) panel.classList.toggle('hidden', !chosen);
            });
        };
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => select(tab));
            tab.addEventListener('keydown', (event) => {
                const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                const next = tabs[(index + step + tabs.length) % tabs.length];
                select(next);
                next.focus();
            });
        });
        tablist.dataset.wired = 'true';
        return select;
    }

    let selectSettingsTab = null;

    /*
      `tab` dice con cuál abrirlo: quien llega desde el cuadro de este documento
      viene de una pestaña concreta y busca la misma, pero de todos.
    */
    function toggleLatexSettingsModal(show, { tab = 'document' } = {}) {
        if (!latexSettingsOverlay) return;
        latexSettingsOverlay.style.display = show ? 'flex' : 'none';
        if (!show && citationModalReturn) {
            const vuelta = citationModalReturn;
            citationModalReturn = null;
            /*
              El sitio de la cita se busca otra vez en vez de reutilizar el que
              se guardó: al declarar la bibliografía, el bloque de metadatos
              crece y todo lo que hay debajo se desplaza.
            */
            toggleCitationModal(true, {
                editElement: vuelta.editElement,
                markdownRange: vuelta.hadRange ? markdownCitationAtSelection() : null,
            });
            return;
        }
        if (show) {
            const tablist = document.getElementById('doc-settings-tablist');
            selectSettingsTab = setupSettingsTabs(tablist) || selectSettingsTab;
            // Por la pedida o, si no, por la primera: al abrirlo del menú, lo
            // que se busca casi nunca es la pestaña donde se estuvo la última vez.
            const pedida = tablist && document.getElementById(`doc-settings-tab-${tab}`);
            const elegida = pedida || (tablist && tablist.querySelector('[role="tab"]'));
            if (selectSettingsTab && elegida) selectSettingsTab(elegida);
            // Siempre desde lo guardado: cancelar tiene que descartar de verdad.
            fillLatexSettingsForm(effectiveLatexSettings());
            // El foco, en su pestaña: el antiguo primer campo vive ahora en la
            // de LaTeX, y enfocarlo la abriría sin querer.
            setTimeout(() => {
                if (elegida) elegida.focus();
            }, 0);
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
            const settings = {
                documentLanguage: readDocLanguageFromForm(),
                documentAuthor: docAuthorInput ? docAuthorInput.value.trim() : '',
                epubCover: readCoverMode(),
                epubCoverImage: readCoverMode() === 'custom' ? pendingCover.image : '',
                epubCoverName: readCoverMode() === 'custom' ? pendingCover.name : '',
                documentToc: docTocCheckbox ? docTocCheckbox.checked : false,
                documentTocDepth: docTocDepthSelect ? Number(docTocDepthSelect.value) : 3,
                documentNumberSections: docNumberingCheckbox ? docNumberingCheckbox.checked : false,
                bibliographyContent: pendingBibliography.content,
                bibliographyName: pendingBibliography.name,
                bibliographyTitle: bibliographyTitleInput ? bibliographyTitleInput.value.trim() : '',
                bibliographyHeadingLevel: bibliographyHeadingLevelSelect ? Number(bibliographyHeadingLevelSelect.value) : 2,
                citationStyle: citationStyleSelect ? citationStyleSelect.value : 'apa',
                cslContent: pendingCsl.content,
                cslName: pendingCsl.name,
                documentClass: latexClassSelect ? latexClassSelect.value : 'article',
                classOptions: latexClassOptionsInput ? latexClassOptionsInput.value.trim() : '',
                preamble: latexPreambleTextarea ? latexPreambleTextarea.value : '',
                documentFormat: readDocumentFormatFields('export-format-fields'),
            };
            storeLatexSettings(settings);
            attachBibliographyToDocument(docs.find(doc => doc.id === currentId), {
                content: pendingBibliography.content,
                name: pendingBibliography.name,
            });
            applyDocumentFormatToPreview();
            updateHtml();
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
        insertMarkdownContent(tableMd);
        toggleTableModal(false);
    });
    cancelTableBtn.addEventListener('click', () => toggleTableModal(false));
    tableModalOverlay.addEventListener('click', (e) => { if (e.target === tableModalOverlay) toggleTableModal(false); });
    
    [saveBtn, saveMenuBtn].filter(Boolean).forEach((button) => {
        button.addEventListener('click', async () => {
            closeActionsMenu();
            closeSettingsMenu();
            await saveCurrentDocument();
        });
    });
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
      insertMarkdownContent(`[${text}](${url})`, { inline: true });
      toggleLinkModal(false);
    });
    cancelLinkBtn.addEventListener('click', () => toggleLinkModal(false));
    linkModalOverlay.addEventListener('click', e => { if (e.target === linkModalOverlay) toggleLinkModal(false); });

    const mathModalOverlay = document.getElementById('math-modal-overlay');
    const mathCodeInput = document.getElementById('math-code');
    const insertMathBtn = document.getElementById('insert-math-btn');
    const cancelMathBtn = document.getElementById('cancel-math-btn');
    if (mathModalOverlay) {
        mathCodeInput?.addEventListener('input', renderMathModalPreview);
        document.querySelectorAll('input[name="math-placement"], input[name="math-delimiter"]').forEach((radio) => {
            radio.addEventListener('change', renderMathModalPreview);
        });
        // Escribir y aceptar sin soltar el teclado.
        mathCodeInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                insertMathFromModal();
            }
        });
        insertMathBtn?.addEventListener('click', insertMathFromModal);
        cancelMathBtn?.addEventListener('click', () => toggleMathModal(false));
        mathModalOverlay.addEventListener('click', (event) => {
            if (event.target === mathModalOverlay) toggleMathModal(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && mathModalOverlay.style.display === 'flex') toggleMathModal(false);
        });
    }
    
    /*
      Vincular a mano la carpeta del documento. Es el único camino en el
      navegador —ninguna página puede leer el disco sin que el usuario elija—, y
      también sirve en la aplicación de escritorio para un documento que aún no
      se ha guardado y por tanto no tiene carpeta propia.
    */
    const assetsFolderInput = document.getElementById('assets-folder-input');
    if (assetsFolderInput) {
        assetsFolderInput.addEventListener('change', async () => {
            const files = Array.from(assetsFolderInput.files || []);
            assetsFolderInput.value = '';
            const doc = docs.find(d => d.id === currentId);
            if (!doc || !files.length) return;
            const folderName = (files[0].webkitRelativePath || '').split('/')[0] || '';
            const count = registerAssetFolder(files, { docId: doc.id, folderName });
            const bibliographyLoaded = await hydrateDocumentBibliography(doc, files);
            if (!count && !bibliographyLoaded) {
                reportStatus(getTranslation('missing_assets_folder_empty', 'En esa carpeta no hay imágenes ni una bibliografía del documento.'));
                return;
            }
            reportStatus(getTranslation(
                bibliographyLoaded ? 'missing_assets_folder_linked_with_bibliography' : 'missing_assets_folder_linked',
                bibliographyLoaded
                    ? 'Carpeta vinculada: {name} ({count} imágenes y bibliografía).'
                    : 'Carpeta vinculada: {name} ({count} imágenes).',
            )
                .replace('{name}', folderName)
                .replace('{count}', String(count)));
            updateHtml();
            if (count) await persistLinkedDocumentAssets(doc, markdownEditor.getValue());
        });
    }

    const imageFileInput = document.getElementById('image-file-input');
    const imageFileName = document.getElementById('image-file-name');
    const imageModeWarning = document.getElementById('image-insert-mode-warning');
    const imageSourceFile = document.getElementById('image-source-file');
    const imageSourceUrl = document.getElementById('image-source-url');
    const imageUrlInput = document.getElementById('image-url');
    const imagePasteBtn = document.getElementById('image-paste-btn');
    const relativeImageMode = document.querySelector('input[name="image-insert-mode"][value="relative"]');
    const embeddedImageMode = document.querySelector('input[name="image-insert-mode"][value="embedded"]');

    /*
      La imagen elegida del disco. En la aplicación de escritorio se pide con el
      diálogo nativo, que devuelve la ruta completa: sin ella no hay forma de
      escribir una ruta relativa, porque un `<input type="file">` solo entrega
      el nombre del archivo.
    */
    let pickedImage = null;

    function selectedInsertMode() {
      const checked = document.querySelector('input[name="image-insert-mode"]:checked');
      return checked ? checked.value : 'relative';
    }

    function showImageFileName(name) {
      if (!imageFileName) return;
      imageFileName.textContent = name || getTranslation('image_file_none', 'Ninguna seleccionada');
      if (name) imageFileName.removeAttribute('data-i18n-key');
      else imageFileName.setAttribute('data-i18n-key', 'image_file_none');
    }

    function selectPickedImage(image, { clipboard = false } = {}) {
      pickedImage = image ? { ...image, clipboard } : null;
      if (relativeImageMode) relativeImageMode.disabled = Boolean(pickedImage?.clipboard);
      if (pickedImage?.clipboard && embeddedImageMode) embeddedImageMode.checked = true;
      showImageFileName(pickedImage?.clipboard
        ? getTranslation('image_clipboard_selected', 'Imagen pegada')
        : (pickedImage?.name || ''));
      refreshImageSource();
    }

    function selectClipboardImage(file) {
      if (!file || !String(file.type || '').toLowerCase().startsWith('image/')) return false;
      selectPickedImage({ file, name: file.name || 'clipboard-image.png', path: '' }, { clipboard: true });
      return true;
    }

    /*
      Ruta que se escribirá en el Markdown, contada desde la carpeta del
      documento. Devuelve también el aviso que corresponda, porque hay tres
      casos en los que lo que se escribe no es lo que el usuario espera:
      documento sin guardar, navegador (sin rutas) e imagen fuera del árbol.
    */
    function relativeReferenceForImage() {
      const doc = docs.find(d => d.id === currentId);
      const name = pickedImage?.name || '';
      if (!assetPathUtils || !pickedImage) return { path: name, warning: '' };

      if (!pickedImage.path) {
        return {
          path: name,
          warning: getTranslation('image_insert_mode_browser_warning',
            'En el navegador no se conoce la carpeta de la imagen: se escribirá solo su nombre, y el documento la encontrará si está a su lado.'),
        };
      }
      if (!doc || !doc.filePath) {
        return {
          path: name,
          warning: getTranslation('image_insert_mode_unsaved_warning',
            'El documento todavía no se ha guardado, así que no hay ninguna carpeta desde la que contar la ruta: se escribirá solo el nombre del archivo. Guárdalo junto a la imagen o insértala dentro del documento.'),
        };
      }
      const relative = assetPathUtils.relativePathFrom(assetPathUtils.directoryOf(doc.filePath), pickedImage.path);
      if (!relative) return { path: name, warning: '' };
      return {
        path: relative,
        warning: relative.startsWith('../')
          ? getTranslation('image_insert_mode_outside_warning',
            'La imagen está fuera de la carpeta del documento: la ruta sube con «../» y solo funcionará si se mueven las dos juntas.')
          : '',
      };
    }

    function refreshImageModeWarning() {
      if (!imageModeWarning) return;
      const message = (pickedImage && selectedInsertMode() === 'relative')
        ? relativeReferenceForImage().warning
        : '';
      imageModeWarning.textContent = message;
      imageModeWarning.classList.toggle('hidden', !message);
    }

    /*
      Las tres maneras de insertar una imagen son opciones del mismo grupo, así
      que solo una de ellas necesita datos a la vez: las dos que parten de un
      archivo piden el archivo, y la dirección web pide la dirección. Enseñar
      los dos campos siempre invitaba a rellenar el que no se iba a usar.
    */
    function refreshImageSource() {
      const url = selectedInsertMode() === 'url';
      imageSourceFile?.classList.toggle('hidden', url);
      imageSourceUrl?.classList.toggle('hidden', !url);
      refreshImageModeWarning();
    }

    function resetImageSource() {
      pickedImage = null;
      if (relativeImageMode) relativeImageMode.disabled = false;
      showImageFileName('');
      if (imageUrlInput) imageUrlInput.value = '';
      refreshImageSource();
    }
    window.__edimarkResetImageSource = resetImageSource;

    document.querySelectorAll('input[name="image-insert-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        refreshImageSource();
        if (selectedInsertMode() === 'url') imageUrlInput?.focus();
      });
    });

    if (imageFileInput) {
      imageFileInput.addEventListener('change', () => {
        const file = imageFileInput.files && imageFileInput.files[0];
        selectPickedImage(file ? { file, name: file.name, path: '' } : null);
      });
      /*
        En el escritorio se toma el diálogo nativo: el del navegador no da la
        ruta del archivo y dejaría la ruta relativa en un simple nombre.
      */
      imageFileInput.addEventListener('click', event => {
        const platform = window.EdiMarkPlatform;
        if (!platform?.isDesktop || typeof platform.pickImageFile !== 'function') return;
        event.preventDefault();
        platform.pickImageFile().then(chosen => {
          if (!chosen) return;
          selectPickedImage({ file: null, name: chosen.name, path: chosen.path });
        }).catch(error => {
          console.error('No se pudo elegir la imagen:', error);
        });
      });
    }

    if (imagePasteBtn) {
      imagePasteBtn.addEventListener('click', async () => {
        if (imagePasteBtn.disabled) return;
        imagePasteBtn.disabled = true;
        try {
          const clipboard = await readClipboardForButton();
          const file = Array.isArray(clipboard?.files)
            ? clipboard.files.find(candidate => String(candidate?.type || '').toLowerCase().startsWith('image/'))
            : null;
          if (!selectClipboardImage(file)) {
            notifyUser(getTranslation('image_clipboard_empty', 'El portapapeles no contiene ninguna imagen.'));
          }
        } catch (error) {
          console.error('No se pudo pegar la imagen desde el portapapeles:', error);
          notifyUser(getTranslation('clipboard_read_error', 'No pude leer el portapapeles. Usa Ctrl+V como alternativa.'));
        } finally {
          imagePasteBtn.disabled = false;
        }
      });
    }

    imageModalOverlay.addEventListener('paste', event => {
      const payload = classifyClipboardDataPayload(event.clipboardData);
      const file = payload?.files?.find(candidate => String(candidate?.type || '').toLowerCase().startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      selectClipboardImage(file);
    });

    insertImageBtn.addEventListener('click', async () => {
      const mode = selectedInsertMode();
      let reference = mode === 'url' ? (imageUrlInput?.value.trim() || '') : '';

      if (mode !== 'url' && pickedImage) {
        if (mode === 'embedded') {
          try {
            reference = pickedImage.file
              ? await readFileAsDataUrl(pickedImage.file)
              : await readDesktopImageAsDataUrl(pickedImage.path);
          } catch (error) {
            console.error('No se pudo leer la imagen seleccionada:', error);
            notifyUser(getTranslation('image_file_error', 'No se pudo leer la imagen seleccionada.'));
            return;
          }
        } else {
          // Los espacios rompen el `![](…)` de Markdown en muchos visores.
          reference = relativeReferenceForImage().path.replace(/ /g, '%20');
        }
      }

      if (imageModalReplacement && !reference) {
        notifyUser(getTranslation('image_source_required', 'Elige o pega una imagen, o escribe su dirección.'));
        return;
      }

      const defaultAlt = pickedImage?.clipboard
        ? getTranslation('image_clipboard_selected', 'Imagen pegada')
        : (pickedImage?.name || getTranslation('base64_image_default_alt', 'imagen'));
      const enteredAlt = document.getElementById('image-alt-text').value.trim();
      const alt = imageModalReplacement ? enteredAlt : (enteredAlt || defaultAlt);
      const imageMarkdown = `![${alt}](${reference || '#'})`;
      if (imageModalReplacement) {
        if (!replaceImageSnippetInMarkdown(imageModalReplacement, imageMarkdown)) {
          notifyUser(getTranslation('document_image_replace_error', 'No se pudo localizar la imagen que se quería reemplazar.'));
          return;
        }
        reportStatus(getTranslation('document_image_replace_done', 'Imagen reemplazada.'));
      } else {
        insertMarkdownContent(imageMarkdown, { inline: true });
      }
      if (imageFileInput) imageFileInput.value = '';
      resetImageSource();
      toggleImageModal(false);
    });
    cancelImageBtn.addEventListener('click', () => toggleImageModal(false));
    imageModalOverlay.addEventListener('click', e => { if (e.target === imageModalOverlay) toggleImageModal(false); });

    // --- Atajos de teclado y otros ---
    window.addEventListener('beforeunload', (e) => {
        const hasUnsaved = docs.some(documentIsDirty);
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

    /*
      Acordes: una combinación abre la espera y la siguiente tecla, ya sin
      modificadores, elige.

      Cada combinación nueva es una negociación con el navegador y con el
      escritorio —Ctrl+Mayús+J es la consola del navegador y Ctrl+Mayús+M, la
      lupa del sistema, y ninguno de los dos deja que la página se los quede—,
      así que las listas largas gastan una sola: los delimitadores de fórmula
      cuelgan de Ctrl+M y los formatos de copia, de Ctrl+Alt+C. Añadir una
      quinta opción es añadir un 5, no pelearse por otra combinación.
    */
    let chordPendiente = null;

    function startChord(chord) {
        chordPendiente = chord;
        reportStatus(chord.hint());
    }

    function endChord() {
        if (!chordPendiente) return;
        chordPendiente = null;
        reportStatus('');
    }
    window.__chordPending = () => Boolean(chordPendiente);

    /*
      Devuelve true cuando la pulsación pertenecía al acorde, para que el resto
      de atajos no la vean. Los modificadores sueltos no cuentan: pulsar Mayús
      camino del siguiente carácter no puede cancelar la espera.
    */
    function handleChordKey(event) {
        if (!chordPendiente) return false;
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return true;

        const chord = chordPendiente;
        const elegida = chord.options[event.key];
        // Intro y la propia letra del acorde repiten la opción de siempre: el
        // caso común se resuelve con dos pulsaciones cómodas y sin leer nada.
        const repetida = event.key === 'Enter' || event.key.toLowerCase() === chord.repeatKey;
        endChord();
        if (elegida || repetida) {
            event.preventDefault();
            (elegida || chord.fallback)();
            return true;
        }
        // Escape solo cancela; cualquier otra tecla cancela y se escribe.
        if (event.key === 'Escape') {
            event.preventDefault();
            return true;
        }
        return false;
    }

    // Una espera olvidada se comería la siguiente tecla que se pulse: en cuanto
    // la atención se va a otra parte, se cancela sola.
    document.addEventListener('mousedown', endChord);
    window.addEventListener('blur', endChord);

    const FORMULA_CHORD = {
        repeatKey: 'm',
        hint: () => getTranslation(
            'formula_chord_hint',
            'Fórmula: 1 $…$ · 2 $$…$$ · 3 \\(…\\) · 4 \\[…\\] · Esc cancela',
        ),
        options: {
            '1': () => applyFormat('latex-inline-dollar'),
            '2': () => applyFormat('latex-block-dollar'),
            '3': () => applyFormat('latex-inline-paren'),
            '4': () => applyFormat('latex-block-bracket'),
        },
        fallback: () => applyFormat('latex-inline-dollar'),
    };

    // Copiar no espera a nada: la opción de siempre es la última que se usó,
    // la misma que el clic en el botón.
    const copiarComo = (accion) => () => {
        handlePreviewCopyAction(accion).catch((err) => {
            console.error('No se pudo copiar el contenido:', err);
        });
    };

    const COPY_CHORD = {
        repeatKey: 'c',
        hint: () => getTranslation(
            'copy_chord_hint',
            'Copiar: 1 Markdown · 2 HTML · 3 LaTeX · 4 LaTeX completo · Esc cancela',
        ),
        options: {
            '1': copiarComo('markdown'),
            '2': copiarComo('html'),
            '3': copiarComo('latex-preview'),
            '4': copiarComo('latex-full'),
        },
        fallback: () => copiarComo(currentCopyAction)(),
    };

    document.addEventListener('keydown', e => {
        const accel = isMac ? e.metaKey : e.ctrlKey;
        if (accel) ctrlPressed = true;

        if (handleChordKey(e)) return;

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
                    case 'b': e.preventDefault(); citationBtn?.click(); return;
                    case 'o': e.preventDefault(); importFileBtn?.click(); return;
                    case 'e': e.preventDefault(); openExportMenu(); return;
                    case 'm': e.preventDefault(); openEdicuatexBtn?.click(); return;
                    case 'v': e.preventDefault(); pasteBtn?.click(); return;
                    case 'c': e.preventDefault(); startChord(COPY_CHORD); return;
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
                /*
                  Sobre la hoja no hay delimitadores que elegir antes de
                  escribir —la ventana los trae como una opción más—, así que
                  el atajo abre directamente lo mismo que el botón.
                */
                case 'm':
                    e.preventDefault();
                    if (isPreviewFormatTarget()) {
                        document.getElementById('formula-btn')?.click();
                    } else {
                        startChord(FORMULA_CHORD);
                    }
                    break;
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
            if (['=', '+', '-'].includes(e.key)) {
                e.preventDefault();
                stepZoom(zoomDelPanelActivo(), e.key === '-' ? -1 : 1);
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
    /*
      La línea del cursor manda: se busca el bloque de la vista previa que
      nació de esa línea y se le lleva la vista. La proporción antigua queda de
      reserva para cuando no hay índice —sin marked, o con el HTML editado a
      mano en el otro panel—.
    */
    function syncFromMarkdown() {
      if (!syncEnabled) return;
      const line = markdownEditor.getCursor().line;
      if (scrollPreviewToLine(line, markdownCursorAnchor(line))) return;
      const lineRatio = line / Math.max(1, markdownEditor.lineCount() - 1);
      const previewScroller = getPreviewScroller();
      previewScroller.scrollTop = lineRatio * (previewScroller.scrollHeight - previewScroller.clientHeight);
    }
    /*
      Al revés: de un punto de la vista previa al Markdown. Si el bloque no
      está anotado —texto recién escrito en la hoja— se cae en la proporción.
    */
    function syncFromPreviewNode(node, clientY) {
      if (!syncEnabled) return false;
      const target = markdownLineFromPreviewNode(node, clientY);
      if (!target) return false;
      return scrollMarkdownToLine(target.line, 0, target.anchor);
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
        // Dónde está el cursor de la hoja se mira antes de tocar nada: al
        // rehacer el Markdown la selección puede quedarse por el camino.
        const editedIndex = topLevelPreviewIndexOfSelection();
        updateMarkdown();
        if (!syncEnabled || editedIndex < 0) return;
        const line = markdownLineForBlockIndex(editedIndex);
        if (typeof line === 'number') scrollMarkdownToLine(line);
      });
    }
    /*
      Posición del bloque que se está editando dentro de la hoja, contada en
      hijos directos: es lo único que sobrevive a rehacer el Markdown entero.
    */
    function topLevelPreviewIndexOfSelection() {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return -1;
      let node = selection.getRangeAt(0).startContainer;
      if (node && node.nodeType === 3) node = node.parentNode;
      if (!node || !htmlOutput.contains(node)) return -1;
      while (node && node.parentElement && node.parentElement !== htmlOutput) {
        node = node.parentElement;
      }
      if (!node || node.parentElement !== htmlOutput) return -1;
      return Array.prototype.indexOf.call(htmlOutput.children, node);
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
          applyRelativeImageSources(htmlOutputEl, docs.find(d => d.id === currentId));
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
                  const scroller = getPreviewScroller();
                  const containerRect = scroller.getBoundingClientRect();
                  const targetRect = target.getBoundingClientRect();
                  const offset = targetRect.top - containerRect.top + scroller.scrollTop;
                  scroller.scrollTo({ top: Math.max(0, offset - 16), behavior: 'smooth' });
              }
          } else if (linkEl.href) {
              window.open(linkEl.href, '_blank', 'noopener');
          }
          return;
      }
      if (syncFromPreviewNode(e.target, e.clientY)) return;
      const scroller = getPreviewScroller();
      const clickY = e.clientY - scroller.getBoundingClientRect().top + scroller.scrollTop;
      const ratio  = clickY / Math.max(1, scroller.scrollHeight);
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
    /*
      Y el formato del documento, aplicado de salida: hasta aquí la hoja no
      tomaba el ancho del papel hasta el primer cambio del documento, así que
      arrancaba con un ancho de lectura cualquiera, sin el reparto en páginas y
      sin la medida con la que se calculan el reparto de los paneles y el
      ajuste al ancho.
    */
    applyDocumentFormatToPreview();

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
      return new Promise((resolve) => entry.file((file) => {
        // La ruta dentro de lo arrastrado es lo que permite luego emparejar
        // `imagenes/01.png` con el archivo real; el File por sí solo solo sabe
        // su nombre.
        try { file.__edimarkPath = (entry.fullPath || file.name).replace(/^\//, ''); } catch (_) {}
        resolve([file]);
      }, () => resolve([])));
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

    /*
      Una carpeta arrastrada trae también sus imágenes. Se indexan antes de
      abrir nada para que los documentos que la acompañan muestren sus figuras
      desde el primer momento.
    */
    if (typeof registerAssetFolder === 'function') {
      registerAssetFolder(files);
    }

    const isMarkdown = (f) => {
      const name = (f.name || '').toLowerCase();
      return /\.md$|\.markdown$/.test(name) || (f.type && f.type === 'text/markdown');
    };

    const mdFiles = files.filter(isMarkdown);
    // Lo que no es Markdown puede seguir siendo convertible con Pandoc.
    const importable = files.filter(f => !isMarkdown(f) && detectImportFormat(f));

    if (!mdFiles.length && !importable.length) {
      notifyUser(getTranslation(
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
            persistLinkedDocumentAssets(doc, content).catch(err => {
              console.warn('No se pudieron guardar las imágenes arrastradas:', err);
            });
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

  /*
    Y el arrastre de la aplicación de escritorio, que no pasa por el DOM: el
    webview se queda con el arrastre nativo y estos eventos nunca llegarían.
    A cambio, lo que llega son rutas de verdad, así que el Markdown se abre por
    el mismo camino que un doble clic —con su archivo detrás, listo para
    guardar— y el resto se lee en bruto y va a Pandoc como en el navegador.
  */
  const plataforma = window.EdiMarkPlatform;
  if (plataforma?.isDesktop && typeof plataforma.onNativeFileDrop === 'function') {
    const esMarkdownNativo = ruta => /\.(md|markdown)$/i.test(ruta || '');
    const nombreDeRuta = ruta => String(ruta || '').split(/[\\/]/).pop() || '';

    async function abrirRutasSoltadas(rutas) {
      const encontradas = await plataforma.expandDroppedPaths(rutas);
      if (!encontradas.length) {
        notifyUser(getTranslation(
          'drop_unsupported',
          'Solo se pueden soltar archivos Markdown (.md, .markdown) o documentos DOCX, ODT, EPUB, HTML y TEX.',
        ));
        return;
      }
      const markdown = encontradas.filter(esMarkdownNativo);
      const importables = encontradas.filter(ruta => !esMarkdownNativo(ruta));

      // Los importables, en objetos `File` como los del navegador: a partir de
      // ahí es exactamente la misma importación.
      const archivos = [];
      for (const ruta of importables) {
        try {
          const bytes = await plataforma.readDroppedDocumentBytes(ruta);
          if (bytes) archivos.push(new File([bytes], nombreDeRuta(ruta)));
        } catch (error) {
          console.error('No se pudo leer el documento soltado:', error);
        }
      }
      const convertibles = archivos.filter(archivo => detectImportFormat(archivo));
      if (convertibles.length) await importFilesSequentially(convertibles);

      if (markdown.length && typeof window.__edimarkOpenNativePaths === 'function') {
        await window.__edimarkOpenNativePaths(markdown);
      }
    }

    plataforma.onNativeFileDrop((event) => {
      if (event?.type === 'enter') {
        backdrop.classList.remove('hidden');
        addHalo();
        return;
      }
      if (event?.type === 'leave') {
        backdrop.classList.add('hidden');
        removeHalo();
        return;
      }
      if (event?.type !== 'drop') return;
      backdrop.classList.add('hidden');
      removeHalo();
      abrirRutasSoltadas(event.paths || []).catch((error) => {
        console.error('No se pudieron abrir los documentos soltados:', error);
        notifyUser(getTranslation('open_file_error', 'No se pudo abrir el documento.'));
      });
    });
  }
})();
