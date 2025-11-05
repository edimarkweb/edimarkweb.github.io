// Declaración de variables globales
let turndownService;
let isUpdating = false;
let syncLock = false; // Evita ReferenceError de código legado
let markdownEditor, htmlEditor;
const AUTOSAVE_KEY_PREFIX = 'edimarkweb-autosave';
const DOCS_LIST_KEY = 'edimarkweb-docslist';
const LAYOUT_KEY = 'edimarkweb-layout';
const FS_KEY = 'edimarkweb-fontsize';
const EDICUATEX_BASE_URL = 'https://jjdeharo.github.io/edicuatex/index.html';
const DESKTOP_PARAM_KEY = 'desktop';
const DESKTOP_SPAWNED_KEY = 'desktop_spawned';

let edicuatexWindow = null;
let edicuatexOrigin = null;
let desktopWindow = null;
let desktopWindowMonitor = null;
const DESKTOP_SIZE_KEY = 'edimarkweb-desktop-size';

function normalizeNewlines(str) {
    if (typeof str !== 'string' || str.length < 1) return typeof str === 'string' ? str : '';
    return str.replace(/\r\n?/g, '\n');
}

let docs = [];
let currentId = null;
let currentLayout;
let syncEnabled = true;

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
        }
    };
}

// --- Funciones de gestión de pestañas y documentos ---
function saveDocsList() {
    const docList = docs.map(d => ({id: d.id, name: d.name}));
    localStorage.setItem(DOCS_LIST_KEY, JSON.stringify(docList));
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
    
    const processedText = markdownText;
    
    if (window.marked) {
        const rawHtml = marked.parse(processedText);
        htmlOutput.innerHTML = rawHtml;

        htmlOutput.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          if (!h.id) {
            h.id = h.textContent.trim().toLowerCase().replace(/\\s+/g,'-').replace(/[^\\w\\-áéíóúüñ]/g,'');
          }
        });

        if (htmlEditor && !htmlEditor.hasFocus()) {
            htmlEditor.setValue(rawHtml);
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
    isUpdating = true;
    const htmlOutput = document.getElementById('html-output');
    if (turndownService && !markdownEditor.hasFocus()) {
        markdownEditor.setValue(turndownService.turndown(htmlOutput.innerHTML));
    }
    isUpdating = false;
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

async function copyPlain(text, btn) {
    const originalIcon = btn.innerHTML;
    try {
        await navigator.clipboard.writeText(text);
        btn.innerHTML = '<i data-lucide="check" class="text-green-500"></i>';
    } catch (err) {
        console.error('No se pudo copiar:', err);
        btn.innerHTML = '<i data-lucide="x" class="text-red-500"></i>';
    } finally {
        if (window.lucide) lucide.createIcons();
        setTimeout(() => { btn.innerHTML = originalIcon; if (window.lucide) lucide.createIcons(); }, 2000);
    }
}

async function copyRich(html, btn) {
  const originalIcon = btn.innerHTML;
  try {
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html' : new Blob([html], { type:'text/html'  }),
          'text/plain': new Blob([html], { type:'text/plain' })
        })
      ]);
    } else {
      await navigator.clipboard.writeText(html);
    }
    btn.innerHTML = '<i data-lucide="check" class="text-green-500"></i>';
  } catch (err) {
    console.error('No se pudo copiar:', err);
    btn.innerHTML = '<i data-lucide="x" class="text-red-500"></i>';
  } finally {
    if (window.lucide) lucide.createIcons();
    setTimeout(() => { btn.innerHTML = originalIcon; if (window.lucide) lucide.createIcons(); }, 2000);
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
  const layoutToggleBtn = document.getElementById('layout-toggle-btn');
  
  layoutToggleBtn.setAttribute('aria-pressed', layout !== 'dual');

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
  
  const iconMap = { dual: 'layout', md: 'align-left', html: 'align-right' };
  layoutToggleBtn.innerHTML = `<i data-lucide="${iconMap[layout]}"></i>`;
  if(window.lucide) lucide.createIcons();

  setTimeout(() => {
    if (layout !== 'html') markdownEditor.refresh();
    if (layout !== 'md') htmlEditor.refresh();
  }, 10);
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
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const htmlPanelTitle = document.getElementById('html-panel-title');
    const toolbar = document.getElementById('toolbar');
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
    const headingBtn = document.getElementById('heading-btn');
    const headingOptions = document.getElementById('heading-options');
    const headingDropdownContainer = document.getElementById('heading-dropdown-container');
    const formulaDropdownContainer = document.getElementById('formula-dropdown-container');
    const formulaBtn = document.getElementById('formula-btn');
    const formulaOptions = document.getElementById('formula-options');
    const formulaOptionButtons = formulaOptions ? Array.from(formulaOptions.querySelectorAll('[data-format]')) : [];
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const layoutToggleBtn = document.getElementById('layout-toggle-btn');
    const languageSelectEl = document.getElementById('language-select');
    const languageWrapper = document.getElementById('language-select-wrapper');
    const fontSizeSelect = document.getElementById('font-size-select');
    const fontSizeWrapper = document.getElementById('font-size-select-wrapper');
    const fontSizeLabel = document.getElementById('font-size-select-label');
    const newTabBtn = document.getElementById('new-tab-btn');
    const tabBar = document.getElementById('tab-bar');
    
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
    const openEdicuatexBtn = document.getElementById('open-edicuatex-btn');
    const exportStatusEl = document.getElementById('export-status');

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

    if (exportMenuContainer) {
        document.addEventListener('click', (event) => {
            if (!isExportMenuOpen()) return;
            if (!exportMenuContainer.contains(event.target)) {
                closeExportMenu();
            }
        }, { capture: true });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isExportMenuOpen()) {
            closeExportMenu();
            if (exportMenuBtn) exportMenuBtn.focus();
        }
    });

    function updateExportStatus(message) {
        if (!exportStatusEl) return;
        const text = typeof message === 'string' ? message.trim() : '';
        if (text) {
            exportStatusEl.textContent = text;
            exportStatusEl.classList.remove('hidden');
        } else {
            exportStatusEl.textContent = '';
            exportStatusEl.classList.add('hidden');
        }
    }

    function isExportMenuOpen() {
        return exportMenu && !exportMenu.classList.contains('hidden');
    }

    function openExportMenu() {
        if (!exportMenu) return;
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
            } else if (lowerFormat === 'html-download' || lowerFormat === 'html-copy') {
                if (typeof exporter.generateHtml !== 'function') {
                    console.warn('Función generateHtml no disponible');
                    updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
                    return;
                }

                const standalone = lowerFormat === 'html-download';
                let htmlResult;
                try {
                    htmlResult = await exporter.generateHtml({
                        markdown: rawMarkdown,
                        standalone,
                        onStatus: updateExportStatus,
                    });
                } catch (err) {
                    console.error('No se pudo generar HTML:', err);
                    updateExportStatus(getTranslation('html_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    return;
                }

                if (standalone) {
                    const htmlFilename = `${safeName}.html`;
                    saveFile(htmlFilename, htmlResult, 'text/html;charset=utf-8');
                    updateExportStatus(getTranslation('html_export_done', 'Exportación HTML completada.'));
                } else {
                    try {
                        if (navigator.clipboard && window.ClipboardItem) {
                            const htmlBlob = new Blob([htmlResult], { type: 'text/html' });
                            const plainBlob = new Blob([htmlResult], { type: 'text/plain' });
                            await navigator.clipboard.write([
                                new ClipboardItem({
                                    'text/html': htmlBlob,
                                    'text/plain': plainBlob,
                                }),
                            ]);
                        } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                            await navigator.clipboard.writeText(htmlResult);
                        } else {
                            const tempTextarea = document.createElement('textarea');
                            tempTextarea.value = htmlResult;
                            tempTextarea.style.position = 'fixed';
                            tempTextarea.style.opacity = '0';
                            document.body.appendChild(tempTextarea);
                            try {
                                tempTextarea.focus();
                                tempTextarea.select();
                                const success = document.execCommand('copy');
                                if (!success) {
                                    throw new Error('document.execCommand returned false');
                                }
                            } finally {
                                document.body.removeChild(tempTextarea);
                            }
                        }
                        updateExportStatus(getTranslation('html_copy_done', 'HTML copiado al portapapeles.'));
                    } catch (err) {
                        console.error('No se pudo copiar HTML al portapapeles:', err);
                        updateExportStatus(getTranslation('html_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    }
                }
            } else if (
                lowerFormat === 'latex-download' ||
                lowerFormat === 'latex-full-download' ||
                lowerFormat === 'latex-copy' ||
                lowerFormat === 'latex-full-copy'
            ) {
                if (typeof exporter.generateLatex !== 'function') {
                    console.warn('Función generateLatex no disponible');
                    updateExportStatus(getTranslation('export_error', 'Error durante la exportación.'));
                    return;
                }

                const standalone = lowerFormat === 'latex-full-download' || lowerFormat === 'latex-full-copy';
                let latexResult;
                try {
                    latexResult = await exporter.generateLatex({
                        markdown: rawMarkdown,
                        standalone,
                        onStatus: updateExportStatus,
                    });
                } catch (err) {
                    console.error('No se pudo generar LaTeX:', err);
                    updateExportStatus(getTranslation('latex_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    return;
                }

                if (lowerFormat.endsWith('download')) {
                    const latexFilename = `${safeName}.tex`;
                    saveFile(latexFilename, latexResult, 'application/x-tex;charset=utf-8');
                    updateExportStatus(getTranslation('latex_export_done', 'Exportación a LaTeX completada.'));
                } else {
                    try {
                        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                            await navigator.clipboard.writeText(latexResult);
                        } else {
                            const tempTextarea = document.createElement('textarea');
                            tempTextarea.value = latexResult;
                            tempTextarea.style.position = 'fixed';
                            tempTextarea.style.opacity = '0';
                            document.body.appendChild(tempTextarea);
                            try {
                                tempTextarea.focus();
                                tempTextarea.select();
                                const success = document.execCommand('copy');
                                if (!success) {
                                    throw new Error('document.execCommand returned false');
                                }
                            } finally {
                                document.body.removeChild(tempTextarea);
                            }
                        }
                        updateExportStatus(getTranslation('latex_copy_done', 'LaTeX copiado al portapapeles.'));
                    } catch (err) {
                        console.error('No se pudo copiar LaTeX al portapapeles:', err);
                        updateExportStatus(getTranslation('latex_export_error', getTranslation('export_error', 'Error durante la exportación.')));
                    }
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
    }

    const markdownTextarea = document.getElementById('markdown-input');
    markdownEditor = createTextareaEditor(markdownTextarea);
    markdownTextarea.focus();

    htmlEditor = CodeMirror.fromTextArea(document.getElementById('html-source-view'), {
        mode: 'htmlmixed', theme: 'eclipse', lineNumbers: true, lineWrapping: true
    });
    const cmWrapper = htmlEditor.getWrapperElement();
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
    const storedTheme = localStorage.getItem('theme');

    function applyTheme(theme) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
      localStorage.setItem('theme', theme);
      const newEditorTheme = theme === 'dark' ? 'material-darker' : 'eclipse';
      markdownEditor.setOption('theme', newEditorTheme);
      htmlEditor.setOption('theme', newEditorTheme);
      const icon = theme === 'dark' ? 'moon' : 'sun';
      themeToggleBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
      if (window.lucide) lucide.createIcons();
    }

    if (storedTheme) applyTheme(storedTheme);
    else applyTheme(prefersDark.matches ? 'dark' : 'light');
    prefersDark.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) applyTheme(e.matches ? 'dark' : 'light');
    });
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(newTheme);
    });

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
        const tab = e.target.closest('.tab');
        const closeBtn = e.target.closest('.tab-close');
        if (closeBtn && tab) { e.stopPropagation(); closeDoc(tab.dataset.id); } 
        else if (tab) { switchTo(tab.dataset.id); }
    });

    layoutToggleBtn.addEventListener('click', () => {
      const layouts = ['dual', 'md', 'html'];
      const next = layouts[(layouts.indexOf(currentLayout) + 1) % layouts.length];
      applyLayout(next);
    });

    viewToggleBtn.addEventListener('click', () => {
        const isPreviewVisible = htmlOutput.style.display !== 'none';
        cmWrapper.style.display = isPreviewVisible ? 'block' : 'none';
        htmlOutput.style.display = isPreviewVisible ? 'none' : 'block';
        if (isPreviewVisible) setTimeout(() => htmlEditor.refresh(), 1);
        htmlPanelTitle.textContent = isPreviewVisible ? 'Código HTML' : 'Previsualización';
        viewToggleBtn.innerHTML = isPreviewVisible ? '<i data-lucide="eye"></i>' : '<i data-lucide="code-2"></i>';
        if (window.lucide) lucide.createIcons();
    });
    
    openFileBtn.addEventListener('click', () => fileInput.click());
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

    copyMdBtn.addEventListener('click', () => copyPlain(markdownEditor.getValue(), copyMdBtn));
    copyHtmlBtn.addEventListener('click', () => {
       const isPreview = htmlOutput.style.display !== 'none';
       const html = isPreview ? buildHtmlWithTex() : htmlEditor.getValue();
       copyRich(html, copyHtmlBtn);
    });
    
    printBtn.addEventListener('click', () => {
        const printContent = document.getElementById('html-output').innerHTML;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><title>Imprimir</title><script src="https://cdn.tailwindcss.com?plugins=typography"><\/script><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><style>body { margin: 1.5rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }<\/style></head><body class="prose max-w-none">${printContent}<od></html>`);
        doc.close();
        setTimeout(() => {
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        }, 400);
    });

    // --- Eventos de los modales ---
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
        saveBtn.addEventListener('click', saveCurrentDocument);
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
                case 'l': e.preventDefault(); layoutToggleBtn.click(); break;
                case 'h': e.preventDefault(); openManualDoc(e.shiftKey); break;
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
        if (ctrlPressed && targetLink) {
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
    markdownEditor.on('change', () => { requestAnimationFrame(() => { updateHtml(); syncFromMarkdown(); }); });
    markdownEditor.on('cursorActivity', () => { requestAnimationFrame(syncFromMarkdown); });
    htmlOutput.addEventListener('click', e => {
      if (ctrlPressed && e.target.closest('a')) {
          const a = e.target.closest('a');
          const href = a.getAttribute('href') || '';
          e.preventDefault(); e.stopPropagation();
          if (href.startsWith('#')) {
              const target = htmlOutput.querySelector(href);
              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
              window.open(a.href, '_blank', 'noopener');
          }
          return;
      }
      const clickY = e.clientY - htmlOutput.getBoundingClientRect().top + htmlOutput.scrollTop;
      const ratio  = clickY / Math.max(1, htmlOutput.scrollHeight);
      scrollMarkdownToRatio(ratio);
    });
    htmlEditor.getWrapperElement().addEventListener('mouseup', () => {
      requestAnimationFrame(() => {
        htmlOutput.innerHTML = htmlEditor.getValue();
        updateMarkdown();
        const lineRatio = htmlEditor.getCursor().line / Math.max(1, htmlEditor.lineCount() - 1);
        scrollMarkdownToRatio(lineRatio);
      });
    });

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
