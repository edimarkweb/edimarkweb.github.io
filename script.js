// Declaración de variables globales
let turndownService;
let isUpdating = false;
let syncLock = false; // Evita ReferenceError de código legado
let markdownEditor, htmlEditor;
let undoButtonEl = null;
let redoButtonEl = null;
const AUTOSAVE_KEY_PREFIX = 'edimarkweb-autosave';
const DOCS_LIST_KEY = 'edimarkweb-docslist';
const LAYOUT_KEY = 'edimarkweb-layout';
const FS_KEY = 'edimarkweb-fontsize';
const FOCUS_MODE_KEY = 'edimarkweb-focus-mode';
const EDICUATEX_BASE_URL = 'https://jjdeharo.github.io/edicuatex/index.html';
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
                const th = document.createElement('th');
                removeAttributes(th, TABLE_SANITIZE_ATTRS);
                th.innerHTML = cell.innerHTML;
                cell.replaceWith(th);
            });
        }
    });
}

function sanitizeHtmlForMarkdown(html) {
    if (typeof html !== 'string' || !html.trim()) return html;
    if (!html.toLowerCase().includes('<table')) {
        return html.replace(/\u00A0/g, ' ');
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    cleanWordTables(container);
    return container.innerHTML.replace(/\u00A0/g, ' ');
}

const MARKDOWN_ESCAPABLE_CHARS = new Set("!\"#$%&'()*+,./:;<=>?@[\\]^_`{|}~-");
const MATH_PLACEHOLDER_PREFIX = '@@EDIMATH';
const MATH_PLACEHOLDER_SUFFIX = '@@';

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

function normalizeMathEscapes(markdown) {
    if (typeof markdown !== 'string' || !markdown.includes('\\')) return markdown;
    const { text: contentWithoutMath, segments } = protectMathSegments(markdown);
    if (!segments.length) return markdown;
    const mathDelimiters = [
        { open: '\\[', close: '\\]' },
        { open: '\\(', close: '\\)' },
        { open: '$$', close: '$$' },
        { open: '$', close: '$' }
    ];

    const normalizedSegments = segments.map(segment => {
        let updated = segment.replace(/\\\\([A-Za-z])/g, '\\$1');
        updated = updated.replace(/\\([_^])/g, '$1');
        updated = updated.replace(/\\([-+*/=\\.])/g, '$1');
        updated = updated.replace(/\\(\d)/g, '$1');
        for (const { open, close } of mathDelimiters) {
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
            fallbackAlt: (alt || '').trim() || `Imagen ${counter}`
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
    const altMatch = /!\[([^\\]]*?)]/.exec(snippet);
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
        ? `${entries.length} ${entries.length === 1 ? 'imagen' : 'imágenes'}`
        : '0 encontradas';
    base64UiList.innerHTML = '';
    entries.forEach(([placeholder, info], index) => {
        const context = findPlaceholderContext(placeholder);
        const altText = (context && context.alt) || info.fallbackAlt || `Imagen ${index + 1}`;
        const typeLabel = info.mime ? info.mime.toUpperCase() : 'IMG';
        const sizeLabel = formatBytes(info.approxBytes);
        const item = document.createElement('div');
        item.className = 'base64-hidden-item';
        item.setAttribute('role', 'listitem');
        const details = document.createElement('div');
        const titleEl = document.createElement('h4');
        titleEl.textContent = altText || `Imagen ${index + 1}`;
        const metaEl = document.createElement('p');
        metaEl.textContent = `${typeLabel} · ${sizeLabel}`;
        details.append(titleEl, metaEl);
        const actions = document.createElement('div');
        actions.className = 'base64-hidden-actions';
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = 'base64-hidden-btn';
        viewBtn.textContent = 'Ver código';
        viewBtn.addEventListener('click', () => openBase64Modal(placeholder));
        actions.appendChild(viewBtn);
        item.append(details, actions);
        base64UiList.appendChild(item);
    });
}

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
    const container = document.createElement('div');
    container.innerHTML = fragment;
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
    const files = clipboardData.files ? Array.from(clipboardData.files).filter(file => file && file.size > 0) : [];
    const hasFiles = files.length > 0;
    const hasRtf = clipboardData.types && Array.from(clipboardData.types).some(type => String(type).toLowerCase() === 'text/rtf');
    const isRichHtml = hasMeaningfulHtmlContent(rawHtml);
    const htmlLooksPlain = htmlFragment && isPlainTextClipboardHtml(htmlFragment);
    if (hasFiles || hasRtf) {
        return { target: 'html', html: htmlFragment, plain, files };
    }
    if (isRichHtml && (!htmlLooksPlain || !plain)) {
        return { target: 'html', html: htmlFragment, plain, files };
    }
    if (plain) {
        return { target: 'markdown', plain };
    }
    if (htmlFragment) {
        return { target: 'html', html: htmlFragment, plain, files };
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
    const markup = (html && html.trim()) ? html : convertPlainTextToHtml(plain);
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
        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
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

function handleEditorPaste(event) {
    if (!event || event.defaultPrevented) return;
    if (!isPasteTargetWithinEditors(event.target)) return;
    const payload = classifyClipboardDataPayload(event.clipboardData);
    if (!payload) return;
    event.preventDefault();
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

async function readClipboardForButton() {
    if (!navigator.clipboard) return null;
    if (navigator.clipboard.read) {
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
    if (navigator.clipboard.readText) {
        try {
            const plain = await navigator.clipboard.readText();
            if (plain) return { plain };
        } catch (err) {
            console.warn('navigator.clipboard.readText falló:', err);
        }
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
    if (!navigator.clipboard) {
        alert('Tu navegador no permite leer el portapapeles desde un botón. Usa Ctrl+V.');
        return;
    }
    const previousDisabled = button.disabled;
    button.disabled = true;
    button.classList.add('opacity-70');
    try {
        const clipboardContent = await readClipboardForButton();
        if (!clipboardContent) {
            alert('No pude leer el portapapeles. Usa Ctrl+V como alternativa.');
            return;
        }
        const payload = classifyManualClipboardPayload(clipboardContent);
        if (!payload) {
            alert('El portapapeles está vacío o en un formato no soportado.');
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
let currentLayout;
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
const BINARY_IMPORT_FORMATS = new Set(['docx', 'odt']);
const IMPORT_EXTENSION_MAP = new Map([
    ['tex', 'latex'],
    ['latex', 'latex'],
    ['ltx', 'latex'],
    ['docx', 'docx'],
    ['odt', 'odt'],
    ['html', 'html'],
    ['htm', 'html'],
    ['xhtml', 'html'],
]);

function getTranslation(key, fallback) {
    const catalog = window.__edimarkTranslations;
    if (catalog && Object.prototype.hasOwnProperty.call(catalog, key)) {
        return catalog[key];
    }
    return fallback;
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
    let highlightQuery = '';
    const HISTORY_LIMIT = 200;
    const historyStack = [];
    let historyIndex = -1;
    let suppressHistory = false;

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

    function computeHighlights(query) {
        if (!query) return [];
        const source = buildAccentInsensitiveSource(query);
        if (!source) return [];
        const regex = new RegExp(source, 'gi');
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
                const end = start + (match[0].length || 1);
                lastIndex = end;
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
            replace(replacement) {
                if (!currentMatch) return;
                const value = getValue();
                const before = value.slice(0, currentMatch.startOffset);
                const after = value.slice(currentMatch.endOffset);
                textarea.value = before + replacement + after;
                const delta = replacement.length - currentMatch.text.length;
                lastIndex = currentMatch.endOffset + delta;
                currentMatch = null;
                triggerChange();
            }
        };
    }

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
            highlightQuery = '';
            renderHighlights();
        },
        setHighlights(_ranges, currentIndex, query) {
            const usableQuery = typeof query === 'string' ? query.trim() : '';
            if (!usableQuery) {
                highlightMatches = [];
                highlightCurrent = -1;
                highlightQuery = '';
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
            highlightQuery = '';
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
            setSelectionRange(offset, offset);
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
window.__updateCharCounterLabel = () => {
    const currentValue = markdownEditor ? markdownEditor.getValue() : '';
    updateMarkdownCharCounter(currentValue);
};

function setMarkdownControlsDisabled(disabled) {
    if (markdownControlsDisabled === disabled) return;
    markdownControlsDisabled = disabled;
    markdownControlButtons.forEach(btn => {
        if (!btn) return;
        btn.toggleAttribute('disabled', disabled);
        btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
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
function saveDocsList() {
    const docList = docs.map(d => ({id: d.id, name: d.name}));
    localStorage.setItem(DOCS_LIST_KEY, JSON.stringify(docList));
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
    input.setAttribute('aria-label', 'Nuevo nombre del documento');

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

function newDoc(name = 'Sin título', md = '') {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const normalizedMd = normalizeNewlines(md || '');
    const newDoc = { id, name, md: normalizedMd, lastSaved: normalizedMd };
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
    tab.innerHTML = `
        <span class="tab-name">${name}</span>
        <span class="ml-1 text-red-500 tab-dirty hidden" title="Cambios sin guardar">●</span>
        <i data-lucide="x" class="tab-close w-4 h-4 opacity-50 hover:opacity-100"></i>
    `;
    tabBar.appendChild(tab);
    tab.addEventListener('dblclick', () => startRename(tab));
    if(window.lucide) lucide.createIcons();
}

function switchTo(id) {
    if (currentId && currentId !== id) {
        const previousDoc = docs.find(d => d.id === currentId);
        if (previousDoc) {
            previousDoc.md = markdownEditor.getValue();
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

    if (isDirty && !confirm(`¿Cerrar "${doc.name}" sin guardar los cambios?`)) {
        return;
    }

    docs.splice(docIndex, 1);
    document.querySelector(`.tab[data-id="${id}"]`).remove();
    localStorage.removeItem(`${AUTOSAVE_KEY_PREFIX}-${id}`);
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

function openManualDoc(forceReload = false) {
    const manualDoc = docs.find(d => d.name === 'Manual');
    
    if (manualDoc && !forceReload) {
        switchTo(manualDoc.id);
        return;
    }

    fetch('manual.md')
        .then(r => r.ok ? r.text() : '# Manual\n\nError: No se pudo cargar el manual.')
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
                newDoc('Manual', normalized);
            }
        })
        .catch(err => {
            console.error("Error al cargar el manual:", err);
            if (!manualDoc) {
                newDoc('Manual', '# Error\n\nNo se pudo cargar el manual.');
            }
        });
}


// --- Funciones principales ---
function updateHtml() {
    if (isUpdating) return;
    isUpdating = true;
    const markdownText = markdownEditor.getValue();
    const htmlOutput = document.getElementById('html-output');
    updateMarkdownCharCounter(markdownText);
    
    const { text: markdownWithoutMath, segments: mathSegments } = protectMathSegments(markdownText);
    const sanitizedText = preserveMarkdownEscapes(markdownWithoutMath);
    
    if (window.marked) {
        const parsedHtml = marked.parse(sanitizedText);
        const restoredHtml = restoreMathSegments(parsedHtml, mathSegments);
        htmlOutput.innerHTML = restoredHtml;

        htmlOutput.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          if (!h.id) {
            h.id = h.textContent.trim().toLowerCase().replace(/\\s+/g,'-').replace(/[^\\w\\-áéíóúüñ]/g,'');
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
        }
    } catch (error) { console.warn("KaTeX no está listo.", error); }
    
    if (currentId) {
        const doc = docs.find(d => d.id === currentId);
        if(doc) {
            updateDirtyIndicator(currentId, markdownEditor.getValue() !== doc.lastSaved);
        }
    }
    isUpdating = false;
}

function updateMarkdown() {
    if (isUpdating) return;
    const htmlOutput = document.getElementById('html-output');
    if (!htmlOutput) return;
    isUpdating = true;
    const previewHtml = htmlOutput.innerHTML;
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
        const normalizedPreview = sanitizeHtmlForMarkdown(previewHtml);
        const markdownFromPreview = turndownService.turndown(normalizedPreview);
        const currentMarkdown = markdownEditor.getValue();
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
        
        case 'heading-1': newText = `\n# ${selectedText || 'Título 1'}\n`; break;
        case 'heading-2': newText = `\n## ${selectedText || 'Título 2'}\n`; break;
        case 'heading-3': newText = `\n### ${selectedText || 'Título 3'}\n`; break;
        case 'heading-4': newText = `\n#### ${selectedText || 'Título 4'}\n`; break;
        case 'heading-5': newText = `\n##### ${selectedText || 'Título 5'}\n`; break;
        case 'heading-6': newText = `\n###### ${selectedText || 'Título 6'}\n`; break;
        case 'quote': newText = `\n> ${selectedText || 'Cita'}\n`; break;
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
function toggleClearModal(show) { document.getElementById('clear-modal-overlay').style.display = show ? 'flex' : 'none'; }

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
        setTimeout(() => document.getElementById(presetText ? 'image-url' : 'image-alt-text').focus(), 0);
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

function saveFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function saveCurrentDocument() {
    const content = markdownEditor.getValue();
    const doc = docs.find(d => d.id === currentId);
    const rawName = doc && typeof doc.name === 'string' ? doc.name.trim() : '';
    const cleanName = rawName.replace(/\.md$/i, '') || 'documento';
    const filename = `${cleanName}.md`;
    saveFile(filename, content, 'text/markdown;charset=utf-8');
    if (doc) {
        doc.name = cleanName;
        doc.md = content;
        doc.lastSaved = content;
        const tabNameEl = document.querySelector(`.tab[data-id="${currentId}"] .tab-name`);
        if (tabNameEl) tabNameEl.textContent = cleanName;
        updateDirtyIndicator(currentId, false);
        saveDocsList();
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

async function importFileWithPandoc(file) {
    const format = detectImportFormat(file);
    const showStatus = typeof updateExportStatus === 'function';
    if (!format) {
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_unsupported', 'Formato no soportado para importar.'));
        }
        return;
    }
    if (!window.PandocExporter || typeof window.PandocExporter.importToMarkdown !== 'function') {
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        }
        return;
    }
    let payload;
    try {
        payload = await readFileForImport(file, format);
    } catch (error) {
        console.error('No se pudo leer el archivo para importar:', error);
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        }
        return;
    }
    try {
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_status_preparing', 'Importando con Pandoc...'));
        }
        const markdown = await window.PandocExporter.importToMarkdown({
            data: payload,
            sourceFormat: format,
            onStatus: showStatus ? updateExportStatus : undefined,
        });
        const docName = getSafeDocumentName(file.name);
        const createdDoc = newDoc(docName, markdown);
        if (createdDoc) {
            updateDirtyIndicator(createdDoc.id, false);
        }
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_success', 'Importación completada.'));
        }
    } catch (error) {
        console.error('Error durante la importación con Pandoc:', error);
        if (showStatus) {
            updateExportStatus(getTranslation('import_file_error', 'No se pudo importar el archivo.'));
        }
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
  const clone = htmlOutput.cloneNode(true);
  clone.querySelectorAll('.katex-display').forEach(div => {
    const tex = div.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
    div.replaceWith(document.createTextNode(`\n\\[\n${tex}\n\\]\n`));
  });
  clone.querySelectorAll('span.katex').forEach(span => {
    if (span.closest('.katex-display')) return;
    const tex = span.querySelector('annotation[encoding="application/x-tex"]')?.textContent || '';
    span.replaceWith(document.createTextNode(`$${tex}$`));
  });
  return clone.innerHTML;
}

function applyLayout(layout) {
  currentLayout = layout;
  syncEnabled = (layout === 'dual');
  localStorage.setItem(LAYOUT_KEY, layout);

  const mdPanel = document.getElementById('markdown-panel');
  const htmlPanel = document.getElementById('html-panel');
  const gutters = document.querySelectorAll('.gutter');
  const markdownLayoutBtn = document.getElementById('markdown-layout-btn');
  const htmlLayoutBtn = document.getElementById('html-layout-btn');

  switch (layout) {
    case 'md':
      mdPanel.style.display = 'block';
      htmlPanel.style.display = 'none';
      gutters.forEach(g => g.style.display = 'none');
      mdPanel.style.width = '100%';
      break;
    case 'html':
      mdPanel.style.display = 'none';
      htmlPanel.style.display = 'block';
      gutters.forEach(g => g.style.display = 'none');
      htmlPanel.style.width = '100%';
      break;
    default:
      mdPanel.style.display = 'block';
      htmlPanel.style.display = 'block';
      gutters.forEach(g => g.style.display = '');
      mdPanel.style.width = '50%';
      htmlPanel.style.width = '50%';
  }

  const mdIsFull = layout === 'md';
  const htmlIsFull = layout === 'html';
  if (markdownLayoutBtn) {
    const mdKey = mdIsFull ? 'markdown_panel_layout_restore' : 'markdown_panel_layout_maximize';
    markdownLayoutBtn.setAttribute('aria-pressed', mdIsFull ? 'true' : 'false');
    markdownLayoutBtn.setAttribute('data-i18n-key', mdKey);
    markdownLayoutBtn.title = getTranslation(mdKey, mdIsFull ? 'Restaurar panel Markdown' : 'Maximizar panel Markdown');
    const mdIcon = mdIsFull ? 'arrow-left-right' : 'arrow-right';
    markdownLayoutBtn.innerHTML = `<i data-lucide="${mdIcon}"></i>`;
  }
  if (htmlLayoutBtn) {
    const htmlKey = htmlIsFull ? 'preview_panel_layout_restore' : 'preview_panel_layout_maximize';
    htmlLayoutBtn.setAttribute('aria-pressed', htmlIsFull ? 'true' : 'false');
    htmlLayoutBtn.setAttribute('data-i18n-key', htmlKey);
    htmlLayoutBtn.title = getTranslation(htmlKey, htmlIsFull ? 'Restaurar panel de previsualización' : 'Maximizar panel de previsualización');
    const htmlIcon = htmlIsFull ? 'arrow-left-right' : 'arrow-left';
    htmlLayoutBtn.innerHTML = `<i data-lucide="${htmlIcon}"></i>`;
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
  localStorage.setItem(FS_KEY, px);
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
    const markdownLayoutBtn = document.getElementById('markdown-layout-btn');
    const htmlLayoutBtn = document.getElementById('html-layout-btn');
    const toolbar = document.getElementById('toolbar');
    const focusModeToggleBtn = document.getElementById('focus-mode-toggle');
    const toolbarActionsEl = document.getElementById('toolbar-actions');
    const mobileToolbarControls = document.getElementById('mobile-toolbar-controls');
    const mobileActionsToggle = document.getElementById('mobile-actions-toggle');
    const mobileFormatToggle = document.getElementById('mobile-format-toggle');
    const openFileBtn = document.getElementById('open-file-btn');
    const fileInput = document.getElementById('file-input');
    const saveBtn = document.getElementById('save-btn');
    const exportMenuContainer = document.getElementById('export-menu-container');
    const exportMenuBtn = document.getElementById('export-menu-btn');
    const exportMenu = document.getElementById('export-menu');
    const exportOptionButtons = exportMenu ? Array.from(exportMenu.querySelectorAll('[data-export-format]')) : [];
    const printBtn = document.getElementById('print-btn');
    const helpBtn = document.getElementById('help-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
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
    let currentCopyAction = localStorage.getItem(COPY_ACTION_KEY);
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
            btn.classList.toggle('bg-slate-100', isActive);
            btn.classList.toggle('dark:bg-slate-700', isActive);
        });
    }

    function applyCopyActionState(action, { persist = true } = {}) {
        const usableAction = COPY_ACTIONS.includes(action) ? action : 'html';
        currentCopyAction = usableAction;
        if (persist) {
            try {
                localStorage.setItem(COPY_ACTION_KEY, usableAction);
            } catch (err) {
                console.warn('No se pudo guardar la acción de copiado por defecto:', err);
            }
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
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const languageSelectEl = document.getElementById('language-select');
    const languageWrapper = document.getElementById('language-select-wrapper');
    const fontSizeSelect = document.getElementById('font-size-select');
    const fontSizeWrapper = document.getElementById('font-size-select-wrapper');
    const fontSizeLabel = document.getElementById('font-size-select-label');
    const openEdicuatexBtn = document.getElementById('open-edicuatex-btn');
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
        if (formulaBtn) buttons.add(formulaBtn);
        if (openEdicuatexBtn) buttons.add(openEdicuatexBtn);
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
        try {
            return localStorage.getItem(FOCUS_MODE_KEY) === '1';
        } catch (err) {
            return false;
        }
    };

    const persistFocusModePreference = (enabled) => {
        try {
            localStorage.setItem(FOCUS_MODE_KEY, enabled ? '1' : '0');
        } catch (err) {
            console.warn('No se pudo guardar el modo foco:', err);
        }
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
    const clearModalOverlay = document.getElementById('clear-modal-overlay');
    const confirmClearBtn = document.getElementById('confirm-clear-btn');
    const cancelClearBtn = document.getElementById('cancel-clear-btn');
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
    const statusToastEl = document.getElementById('status-toast');
    const statusToastMessageEl = document.getElementById('status-toast-message');
    let statusToastTimer = null;

    const updateFontSizeLabel = () => {
        if (!fontSizeSelect || !fontSizeLabel) return;
        const option = fontSizeSelect.options[fontSizeSelect.selectedIndex];
        if (option) fontSizeLabel.textContent = option.textContent.trim();
    };
    window.__updateFontSizeLabel = updateFontSizeLabel;

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

    if (window.lucide) lucide.createIcons();
    const params = new URLSearchParams(window.location.search);
    const desktopMode = params.get(DESKTOP_PARAM_KEY) === '1';
    const desktopSpawned = params.get(DESKTOP_SPAWNED_KEY) === '1';
    if (desktopMode) {
        document.body.classList.add('desktop-mode');
        if (desktopWindowBtn) desktopWindowBtn.classList.add('hidden');
        if (!desktopSpawned && (!window.opener || window.opener.closed)) {
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
        const url = new URL(EDICUATEX_BASE_URL);
        url.searchParams.set('pm', '1');
        url.searchParams.set('origin', resolveHostOrigin());
        if (initialLatex) {
            url.searchParams.set('sel', initialLatex);
        }
        return url.toString();
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
        openEdicuatexBtn.addEventListener('click', openEdicuatex);
    }

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
        closeActionsMenu();
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
        updateExportStatus(getTranslation('export_preparing_message', 'Preparando exportación…'));
        await yieldToUiThread();

        try {
            const lowerFormat = String(format || '').toLowerCase();
            if (lowerFormat === 'docx' || lowerFormat === 'odt') {
                const extension = lowerFormat;
                const outputFilename = `${safeName}.${extension}`;
                await exporter.exportDocument({
                    format: lowerFormat,
                    markdown: rawMarkdown,
                    outputFilename,
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
                        standalone: true,
                        onStatus: updateExportStatus,
                    });
                } catch (err) {
                    console.error('No se pudo generar HTML:', err);
                    updateExportStatus(getTranslation('html_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    return;
                }

                const htmlFilename = `${safeName}.html`;
                saveFile(htmlFilename, htmlResult, 'text/html;charset=utf-8');
                updateExportStatus(getTranslation('html_export_done', 'Exportación HTML completada.'));
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
                saveFile(latexFilename, latexResult, 'application/x-tex;charset=utf-8');
                updateExportStatus(getTranslation('latex_export_done', 'Exportación a LaTeX completada.'));
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
                const raw = localStorage.getItem(DESKTOP_SIZE_KEY);
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
            const storageFlag = localStorage.getItem(DESKTOP_SIZE_KEY);
            if (!storageFlag && desktopWindow && !desktopWindow.closed) {
                try {
                    const w = desktopWindow.outerWidth || desktopWindow.innerWidth;
                    const h = desktopWindow.outerHeight || desktopWindow.innerHeight;
                    if (w && h) {
                        localStorage.setItem(DESKTOP_SIZE_KEY, JSON.stringify({ width: w, height: h }));
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
                        localStorage.setItem(DESKTOP_SIZE_KEY, JSON.stringify({ width: w, height: h }));
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
        desktopWindowBtn.addEventListener('click', openDesktopWindow);
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
        const insertion = event.data.wrapped || event.data.latex || '';
        if (!insertion) return;
        requestAnimationFrame(() => {
            markdownEditor.replaceSelection(insertion);
            markdownEditor.focus();
            if (edicuatexWindow && !edicuatexWindow.closed) {
                try { edicuatexWindow.close(); } catch (_) {}
            }
            edicuatexWindow = null;
            edicuatexOrigin = null;
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
        // Se regenera el contenido del botón para que Lucide lo vuelva a procesar
        toggleWidthBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons();
    });
    // --- FIN DE LA CORRECCIÓN ---

    // --- Gestión del tema (claro/oscuro) ---
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    let manualThemeOverride = null;

    function applyTheme(theme) {
      const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', normalizedTheme === 'dark');
      document.documentElement.style.colorScheme = normalizedTheme;
      const newEditorTheme = normalizedTheme === 'dark' ? 'material-darker' : 'eclipse';
      markdownEditor.setOption('theme', newEditorTheme);
      htmlEditor.setOption('theme', newEditorTheme);
      const icon = normalizedTheme === 'dark' ? 'moon' : 'sun';
      themeToggleBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
      if (window.lucide) lucide.createIcons();
    }

    function syncWithSystemTheme() {
      if (manualThemeOverride) return;
      applyTheme(prefersDark.matches ? 'dark' : 'light');
    }

    applyTheme(prefersDark.matches ? 'dark' : 'light');

    prefersDark.addEventListener('change', (e) => {
      if (!manualThemeOverride) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
    themeToggleBtn.addEventListener('click', (event) => {
      if (event && event.altKey) {
        manualThemeOverride = null;
        syncWithSystemTheme();
        return;
      }
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      const newTheme = isCurrentlyDark ? 'light' : 'dark';
      manualThemeOverride = newTheme;
      applyTheme(newTheme);
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
    currentLayout = localStorage.getItem(LAYOUT_KEY) || 'dual';
    applyLayout(currentLayout);

    // --- Tamaño de fuente ---
    if (fontSizeSelect) {
        const savedFs = localStorage.getItem(FS_KEY) || 16;
        fontSizeSelect.value = savedFs;
        applyFontSize(savedFs);
        updateFontSizeLabel();
        fontSizeSelect.addEventListener('change', e => {
            applyFontSize(e.target.value);
            updateFontSizeLabel();
        });
    }

    // --- Carga inicial de documentos y autoguardado ---
    const savedDocsList = JSON.parse(localStorage.getItem(DOCS_LIST_KEY) || '[]');
    if (savedDocsList.length > 0) {
        savedDocsList.forEach(docInfo => {
            const md = localStorage.getItem(`${AUTOSAVE_KEY_PREFIX}-${docInfo.id}`) || '';
            const normalized = normalizeNewlines(md);
            docs.push({ ...docInfo, md: normalized, lastSaved: normalized });
            addTabElement(docInfo);
        });
        switchTo(docs[0].id);
    } else {
        openManualDoc();
    }
    
    setInterval(() => {
        if (currentId) {
            const content = markdownEditor.getValue();
            const doc = docs.find(d => d.id === currentId);
            if (doc) doc.md = content;
            localStorage.setItem(`${AUTOSAVE_KEY_PREFIX}-${currentId}`, content);
        }
    }, 3000);

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
    });

    document.addEventListener('click', (e) => {
        if (!headingDropdownContainer.contains(e.target)) {
            headingOptions.classList.add('hidden');
        }
    });

    // --- Eventos de los botones principales y pestañas ---
    newTabBtn.addEventListener('click', () => newDoc());
    helpBtn.addEventListener('click', (e) => openManualDoc(e.ctrlKey || e.metaKey));
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

    if (markdownLayoutBtn) {
      markdownLayoutBtn.addEventListener('click', () => {
        applyLayout(currentLayout === 'md' ? 'dual' : 'md');
      });
    }
    if (htmlLayoutBtn) {
      htmlLayoutBtn.addEventListener('click', () => {
        applyLayout(currentLayout === 'html' ? 'dual' : 'html');
      });
    }

    viewToggleBtn.addEventListener('click', () => {
        const isPreviewVisible = htmlOutput.style.display !== 'none';
        cmWrapper.style.display = isPreviewVisible ? 'block' : 'none';
        htmlOutput.style.display = isPreviewVisible ? 'none' : 'block';
        if (isPreviewVisible) setTimeout(() => htmlEditor.refresh(), 1);
        htmlPanelTitle.textContent = isPreviewVisible ? 'Código HTML' : 'Previsualización';
        viewToggleBtn.innerHTML = isPreviewVisible ? '<i data-lucide="eye"></i>' : '<i data-lucide="code-2"></i>';
        if (window.lucide) lucide.createIcons();
    });
    
    openFileBtn.addEventListener('click', () => {
        closeActionsMenu();
        closeSettingsMenu();
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
            const file = event.target.files && event.target.files[0];
            importFileInput.value = '';
            if (!file) return;
            await importFileWithPandoc(file);
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
        htmlOutput.addEventListener('focusout', (event) => {
            const next = event.relatedTarget;
            if (next && htmlOutput.contains(next)) return;
            setMarkdownControlsDisabled(false);
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

    createTableBtn.addEventListener('click', () => {
        const cols = parseInt(document.getElementById('table-cols').value, 10) || 2;
        const rows = parseInt(document.getElementById('table-rows').value, 10) || 1;
        let tableMd = '\n|';
        for (let i = 1; i <= cols; i++) tableMd += ` Cabecera ${i} |`;
        tableMd += '\n|';
        for (let i = 0; i < cols; i++) tableMd += '------------|';
        tableMd += '\n';
        for (let r = 0; r < rows; r++) {
            tableMd += '|';
            for (let c = 0; c < cols; c++) tableMd += ' Celda      |';
            tableMd += '\n';
        }
        markdownEditor.replaceSelection(tableMd);
        toggleTableModal(false);
        markdownEditor.focus();
    });
    cancelTableBtn.addEventListener('click', () => toggleTableModal(false));
    tableModalOverlay.addEventListener('click', (e) => { if (e.target === tableModalOverlay) toggleTableModal(false); });
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            closeActionsMenu();
            closeSettingsMenu();
            saveCurrentDocument();
        });
    }

    clearAllBtn.addEventListener('click', () => toggleClearModal(true));
    confirmClearBtn.addEventListener('click', () => {
      markdownEditor.setValue('');
      htmlEditor.setValue('');
      document.getElementById('html-output').innerHTML = '';
      if(currentId) {
          const doc = docs.find(d => d.id === currentId);
          if(doc) { doc.md = ''; doc.lastSaved = ''; updateDirtyIndicator(currentId, false); }
      }
      toggleClearModal(false);
      markdownEditor.focus();
    });
    cancelClearBtn.addEventListener('click', () => toggleClearModal(false));
    clearModalOverlay.addEventListener('click', (e) => { if (e.target === clearModalOverlay) toggleClearModal(false); });
    
    insertLinkBtn.addEventListener('click', () => {
      const text = document.getElementById('link-text').value.trim() || 'enlace';
      const url  = document.getElementById('link-url').value.trim()  || '#';
      markdownEditor.replaceSelection(`[${text}](${url})`);
      toggleLinkModal(false);
      markdownEditor.focus();
    });
    cancelLinkBtn.addEventListener('click', () => toggleLinkModal(false));
    linkModalOverlay.addEventListener('click', e => { if (e.target === linkModalOverlay) toggleLinkModal(false); });
    
    insertImageBtn.addEventListener('click', () => {
      const alt = document.getElementById('image-alt-text').value.trim() || 'imagen';
      const url = document.getElementById('image-url').value.trim() || '#';
      markdownEditor.replaceSelection(`![${alt}](${url})`);
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
            switch (e.key.toLowerCase()) {
                case 's': e.preventDefault(); saveBtn.click(); break;
                case 'p': e.preventDefault(); printBtn.click(); break;
                case 'l': e.preventDefault(); cycleLayout(); break;
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
    markdownEditor.on('change', () => {
      updateUndoRedoButtons();
      if (skipNextMarkdownSync) {
        skipNextMarkdownSync = false;
        return;
      }
      requestAnimationFrame(() => { updateHtml(); syncFromMarkdown(); });
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
    'fixed inset-0 hidden z-[45] drop-dim',
    'flex items-center justify-center'
  ].join(' ');

  // Marco interior (no bloquea clics, solo visual)
  const frame = document.createElement('div');
  frame.className = [
    'pointer-events-none relative',
    'inset-0 w-[min(95vw,1100px)] h-[min(70vh,520px)]',
    'rounded-2xl border-4 drop-outline border-blue-400/70 dark:border-blue-300/70',
    'shadow-2xl drop-ants'
  ].join(' ');

  // Mensaje central con icono
  const center = document.createElement('div');
  center.className = 'absolute inset-0 grid place-content-center text-center';
  center.innerHTML = `
    <div class="pointer-events-none px-6 py-5 rounded-xl bg-white/85 dark:bg-slate-900/80 ring-1 ring-slate-200 dark:ring-slate-700">
      <div class="flex flex-col items-center gap-2">
        <i data-lucide="arrow-down-to-line" class="w-14 h-14 text-slate-600 dark:text-slate-200"></i>
        <p class="drop-hint text-lg font-semibold text-slate-800 dark:text-slate-100" data-i18n-key="drop_title">Suelta aquí para abrir en una pestaña nueva</p>
        <p class="drop-hint text-sm text-slate-600 dark:text-slate-300" data-i18n-key="drop_subtitle">Archivos Markdown (.md, .markdown). También puedes soltar varios.</p>
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

  function addHalo() {
    tabBar && tabBar.classList.add('ring-2','ring-blue-500','ring-offset-2','ring-offset-transparent','animate-pulse');
    newTabBtn && newTabBtn.classList.add('ring-2','ring-blue-500','rounded-md','animate-pulse');
  }
  function removeHalo() {
    tabBar && tabBar.classList.remove('ring-2','ring-blue-500','ring-offset-2','ring-offset-transparent','animate-pulse');
    newTabBtn && newTabBtn.classList.remove('ring-2','ring-blue-500','rounded-md','animate-pulse');
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

  function handleDrop(e) {
    e.preventDefault();
    backdrop.classList.add('hidden');
    removeHalo();
    dragDepth = 0;

    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;

    const mdFiles = files.filter(f => {
      const name = (f.name || '').toLowerCase();
      return /\\.md$|\\.markdown$/.test(name) || (f.type && f.type === 'text/markdown');
    });

    if (!mdFiles.length) {
      alert('Solo se pueden soltar archivos Markdown (.md/.markdown)');
      return;
    }

    mdFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result || '';
          const doc = (typeof newDoc === 'function')
            ? newDoc(file.name || 'Sin título', content)
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
