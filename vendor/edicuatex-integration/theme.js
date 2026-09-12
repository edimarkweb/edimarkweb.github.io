/* Integración local con EdiMarkdown Desktop. */
(function applyEdiMarkTheme() {
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode !== 'light' && mode !== 'dark') return;
    document.documentElement.dataset.edimarkTheme = mode;
})();
