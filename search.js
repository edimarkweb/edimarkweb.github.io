// search.js

function initSearch(mdEditor, htmlEditor, getLayout) {
    // Elementos del DOM
    const searchWrapper = document.getElementById('search-wrapper');
    const searchInput = document.getElementById('search-input');
    const replaceInput = document.getElementById('replace-input');
    const closeSearchBtn = document.getElementById('close-search-btn');
    const openSearchBtn = document.getElementById('open-search-btn');
    const regexToggleBtn = document.getElementById('search-regex-toggle-btn');
    const nextBtn = document.getElementById('search-next-btn');
    const prevBtn = document.getElementById('search-prev-btn');
    const matchesInfo = document.getElementById('search-matches-info');
    const toggleReplaceBtn = document.getElementById('toggle-replace-btn');
    const replaceRow = document.getElementById('replace-row');
    const replaceOneBtn = document.getElementById('replace-one-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');

    // Estado de la búsqueda
    let state = {
        matches: [],
        currentIndex: -1,
        activeEditor: null,
        queryRegex: null,
        regexMode: false,
        invalidRegex: false,
        overlay: null,
        currentMatchMarker: null
    };

    /*
      Último editor que tuvo el foco.

      El cuadro de búsqueda se lo quita nada más abrirse, así que a partir de
      ese momento `hasFocus()` es falso en los dos editores. Sin esta memoria,
      el diseño dual resolvía siempre a favor del Markdown y el panel HTML no
      se podía buscar.
    */
    let lastFocusedEditor = null;
    [mdEditor, htmlEditor].forEach(editor => {
        if (editor && typeof editor.on === 'function') {
            editor.on('focus', () => { lastFocusedEditor = editor; });
        }
    });

    function openSearch() {
        searchWrapper.classList.remove('hidden');
        searchInput.value = ''; // Limpia el campo de búsqueda al abrir
        searchInput.focus();
        // Al abrir, también se limpia el estado anterior para empezar de cero
        runSearch();
    }

    function closeSearch() {
        searchWrapper.classList.add('hidden');
        // Se guarda antes de limpiar: clearSearchState deja activeEditor a null.
        const editorToRefocus = state.activeEditor || lastFocusedEditor;
        clearSearchState();
        if (editorToRefocus && typeof editorToRefocus.focus === 'function') {
            editorToRefocus.focus(); // Devuelve el foco al editor
        }
    }
    
    // --- Lógica de la interfaz ---
    openSearchBtn.addEventListener('click', openSearch);
    closeSearchBtn.addEventListener('click', closeSearch);

    toggleReplaceBtn.addEventListener('click', () => {
        const icon = toggleReplaceBtn.querySelector('i');
        const isHidden = replaceRow.classList.contains('hidden');
        replaceRow.classList.toggle('hidden', !isHidden);
        replaceRow.classList.toggle('flex', isHidden);
        icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    });

    regexToggleBtn.addEventListener('click', () => {
        state.regexMode = !state.regexMode;
        updateRegexToggleState();
        runSearch();
        searchInput.focus();
    });
    
    document.addEventListener('keydown', (e) => {
        const accel = e.ctrlKey || e.metaKey;
        if (accel && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            openSearch();
        }
        if (e.key === 'Escape' && !searchWrapper.classList.contains('hidden')) {
            closeSearch();
        }
    });

    // --- Lógica principal ---
    searchInput.addEventListener('keydown', handleSearchNav);
    replaceInput.addEventListener('keydown', handleSearchNav);

    function handleSearchNav(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.shiftKey ? findPrev() : findNext();
        }
    }

    // Envuelto: el InputEvent no debe llegar como opciones de búsqueda.
    searchInput.addEventListener('input', () => runSearch());
    nextBtn.addEventListener('click', findNext);
    prevBtn.addEventListener('click', findPrev);
    replaceOneBtn.addEventListener('click', replaceCurrent);
    replaceAllBtn.addEventListener('click', replaceAll);

    // --- Funciones del motor de búsqueda ---

    function runSearch({ resumeFrom = null } = {}) {
        const editor = determineActiveEditor();
        if (!editor) {
            if (state.activeEditor && typeof state.activeEditor.clearHighlights === 'function') {
                state.activeEditor.clearHighlights();
            }
            return;
        }

        clearSearchState();
        state.activeEditor = editor;
        
        const query = searchInput.value;
        if (!query) {
            state.invalidRegex = false;
            updateMatchesInfo();
            if (typeof editor.clearHighlights === 'function') editor.clearHighlights();
            return;
        }

        state.queryRegex = buildSearchRegex(query, state.regexMode);
        if (!state.queryRegex) {
            state.invalidRegex = true;
            updateMatchesInfo();
            if (typeof editor.clearHighlights === 'function') editor.clearHighlights();
            return;
        }
        state.invalidRegex = false;

        state.overlay = createSearchOverlay(state.queryRegex);
        editor.addOverlay(state.overlay);

        /*
          El índice de líneas se calcula una vez por búsqueda. Antes cada
          coincidencia recorría el documento entero dos veces para traducir sus
          posiciones a desplazamientos, lo que hacía la búsqueda cuadrática y
          congelaba la interfaz en documentos largos con muchos resultados.
        */
        const content = editorContent(editor);
        const lineStarts = buildLineIndex(content);
        const cursor = editor.getSearchCursor(state.queryRegex);
        while (cursor.findNext()) {
            const from = cursor.from();
            const to = cursor.to();
            state.matches.push({
                from,
                to,
                text: content.slice(offsetOfPos(lineStarts, content.length, from), offsetOfPos(lineStarts, content.length, to))
            });
        }

        if (state.matches.length > 0) {
            state.currentIndex = resumeFrom ? firstMatchIndexFrom(state.matches, resumeFrom) : 0;
            highlightCurrentMatch();
        } else if (typeof editor.clearHighlights === 'function') {
            editor.clearHighlights();
        }
        updateMatchesInfo();
    }
    
    function findNext() {
        if (state.matches.length < 1) return;
        state.currentIndex = (state.currentIndex + 1) % state.matches.length;
        highlightCurrentMatch();
    }

    function findPrev() {
        if (state.matches.length < 1) return;
        state.currentIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length;
        highlightCurrentMatch();
    }
    
    function replaceCurrent() {
        if (state.matches.length < 1 || state.currentIndex === -1) return;

        const editor = state.activeEditor;
        const match = state.matches[state.currentIndex];
        const replacement = resolveReplacementText(match.text);
        editor.replaceRange(replacement, match.from, match.to);

        // Se reanuda por detrás del texto insertado: si el reemplazo vuelve a
        // casar con la búsqueda (buscar "gato", reemplazar por "gatos"), volver
        // siempre a la primera coincidencia dejaría el botón atascado en ella.
        runSearch({ resumeFrom: positionAfterInsertion(match.from, replacement) });
    }

    function replaceAll() {
        if (state.matches.length < 1) return;
        const message = getTranslation(
            'replace_all_confirm',
            '¿Reemplazar las {count} coincidencias?'
        ).replaceAll('{count}', String(state.matches.length));
        if (!confirm(message)) return;

        const editor = state.activeEditor;
        
        editor.operation(() => {
            const cursor = editor.getSearchCursor(state.queryRegex);
            while (cursor.findNext()) {
                const from = cursor.from();
                const to = cursor.to();
                const matchText = typeof cursor.text === 'function'
                    ? cursor.text()
                    : textBetween(editor, from, to);
                cursor.replace(resolveReplacementText(matchText));
            }
        });
        
        clearSearchState();
        updateMatchesInfo();
    }

    // --- Funciones auxiliares ---
    
    // Un editor oculto (el panel derecho mostrando la vista previa) no es un
    // destino válido: se buscaría sobre algo que no se ve.
    function isEditorVisible(editor) {
        if (!editor) return false;
        const wrapper = typeof editor.getWrapperElement === 'function' ? editor.getWrapperElement() : null;
        return !wrapper || wrapper.offsetParent !== null;
    }

    function determineActiveEditor() {
        const layout = getLayout();
        if (layout === 'md') return mdEditor;
        if (layout === 'html') return htmlEditor;
        // Diseño dual: manda el foco real si todavía lo tiene alguno, y si no
        // el último que lo tuvo antes de que el cuadro de búsqueda se lo llevara.
        if (htmlEditor && htmlEditor.hasFocus()) return htmlEditor;
        if (mdEditor && mdEditor.hasFocus()) return mdEditor;
        if (lastFocusedEditor && isEditorVisible(lastFocusedEditor)) return lastFocusedEditor;
        return mdEditor;
    }
    
    // Dónde queda el cursor tras insertar `text` en `from`.
    function positionAfterInsertion(from, text) {
        if (!from) return null;
        const lines = String(text || '').split('\n');
        if (lines.length === 1) {
            return { line: from.line, ch: from.ch + lines[0].length };
        }
        return { line: from.line + lines.length - 1, ch: lines[lines.length - 1].length };
    }

    function comparePositions(a, b) {
        if (!a || !b) return 0;
        if (a.line !== b.line) return a.line - b.line;
        return a.ch - b.ch;
    }

    // Primera coincidencia que empieza en `pos` o después; vuelve al principio
    // si ya no queda ninguna por delante.
    function firstMatchIndexFrom(matches, pos) {
        const index = matches.findIndex(match => comparePositions(match.from, pos) >= 0);
        return index === -1 ? 0 : index;
    }

    function clearSearchState() {
        const { activeEditor, overlay, currentMatchMarker } = state;
        if (activeEditor) {
            if (overlay) activeEditor.removeOverlay(overlay);
            if (currentMatchMarker) currentMatchMarker.clear();
            if (typeof activeEditor.clearHighlights === 'function') {
                activeEditor.clearHighlights();
            }
        }
        state = {
            ...state,
            matches: [],
            currentIndex: -1,
            activeEditor: null,
            queryRegex: null,
            invalidRegex: false,
            overlay: null,
            currentMatchMarker: null
        };
    }

    function highlightCurrentMatch() {
        if (state.currentMatchMarker) state.currentMatchMarker.clear();
        if (state.matches.length === 0) return;

        const match = state.matches[state.currentIndex];
        const editor = state.activeEditor;
        if (typeof editor.setHighlights === 'function') {
            editor.setHighlights(state.matches, state.currentIndex, state.queryRegex);
        }
        state.currentMatchMarker = editor.markText(match.from, match.to, { className: 'cm-search-current' });
        editor.scrollIntoView(match.from, 100);
        updateMatchesInfo();
    }

    function updateMatchesInfo() {
        if (state.invalidRegex) {
            matchesInfo.textContent = getTranslation('search_invalid_regex', 'Regex no valida');
            return;
        }
        if (searchInput.value && state.matches.length > 0) {
            matchesInfo.textContent = `${state.currentIndex + 1} / ${state.matches.length}`;
        } else if (searchInput.value) {
            matchesInfo.textContent = "0 / 0";
        } else {
            matchesInfo.textContent = "";
        }
    }

    function updateRegexToggleState() {
        const label = state.regexMode
            ? getTranslation('search_mode_regex_label', 'Regex')
            : getTranslation('search_mode_literal_label', 'Texto');
        regexToggleBtn.setAttribute('aria-pressed', String(state.regexMode));
        regexToggleBtn.textContent = label;
        regexToggleBtn.classList.toggle('bg-slate-200', state.regexMode);
        regexToggleBtn.classList.toggle('text-slate-900', state.regexMode);
        regexToggleBtn.classList.toggle('dark:bg-slate-600', state.regexMode);
        regexToggleBtn.classList.toggle('dark:text-slate-50', state.regexMode);
    }

    function buildCaseAccentInsensitiveRegex(text) {
        if (!text) return null;
        const escapedText = text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const accentInsensitiveSource = escapedText
            .replace(/a/gi, match => match === 'A' ? '[AÀÁÂÄ]' : '[aàáâä]')
            .replace(/e/gi, match => match === 'E' ? '[EÈÉÊË]' : '[eèéêë]')
            .replace(/i/gi, match => match === 'I' ? '[IÌÍÎÏ]' : '[iìíîï]')
            .replace(/o/gi, match => match === 'O' ? '[OÒÓÔÖ]' : '[oòóôö]')
            .replace(/u/gi, match => match === 'U' ? '[UÙÚÛÜ]' : '[uùúûü]')
            .replace(/n/gi, match => match === 'N' ? '[NÑ]' : '[nñ]');
        return new RegExp(accentInsensitiveSource, 'gi');
    }

    function buildSearchRegex(text, regexMode) {
        if (!text) return null;
        if (!regexMode) {
            return buildCaseAccentInsensitiveRegex(text);
        }
        try {
            return new RegExp(text, 'gi');
        } catch (_) {
            return null;
        }
    }

    /*
      El texto sobre el que el cursor calcula sus posiciones. En el panel
      Markdown es el valor visible, con las imágenes base64 plegadas; getValue()
      las expandiría. Hoy ambos dan el mismo resultado, porque el plegado no
      añade ni quita saltos de línea y las posiciones son (línea, columna), pero
      indexar lo que el cursor recorre evita que eso deje de ser cierto.
    */
    function editorContent(editor) {
        if (!editor) return '';
        if (typeof editor.getDisplayValue === 'function') return editor.getDisplayValue();
        return typeof editor.getValue === 'function' ? editor.getValue() : '';
    }

    // Desplazamiento donde empieza cada línea.
    function buildLineIndex(content) {
        const starts = [0];
        for (let i = 0; i < content.length; i += 1) {
            if (content.charCodeAt(i) === 10) starts.push(i + 1);
        }
        return starts;
    }

    // Solo para editores cuyo cursor no expone el texto de la coincidencia.
    function textBetween(editor, from, to) {
        const content = editorContent(editor);
        const lineStarts = buildLineIndex(content);
        return content.slice(
            offsetOfPos(lineStarts, content.length, from),
            offsetOfPos(lineStarts, content.length, to),
        );
    }

    function offsetOfPos(lineStarts, length, pos) {
        if (!pos) return 0;
        const line = Math.max(0, pos.line || 0);
        const base = line < lineStarts.length ? lineStarts[line] : length;
        return Math.min(base + Math.max(0, pos.ch || 0), length);
    }

    function resolveReplacementText(matchText) {
        const replacement = replaceInput.value;
        if (!state.regexMode || !state.queryRegex) {
            return replacement;
        }
        const flags = state.queryRegex.flags.replace(/g/g, '');
        const singleMatchRegex = new RegExp(state.queryRegex.source, flags);
        return String(matchText).replace(singleMatchRegex, replacement);
    }

    function createSearchOverlay(queryRegex) {
        const flags = queryRegex.flags.includes('g') ? queryRegex.flags : `${queryRegex.flags}g`;
        const overlayRegex = new RegExp(queryRegex.source, flags);
        
        return {
            token: function(stream) {
                overlayRegex.lastIndex = stream.pos;
                const match = overlayRegex.exec(stream.string);
                if (match && match.index == stream.pos) {
                    stream.pos += match[0].length || 1;
                    return "search-highlight";
                } else if (match) {
                    stream.pos = match.index;
                } else {
                    stream.skipToEnd();
                }
            }
        };
    }

    updateRegexToggleState();
}
