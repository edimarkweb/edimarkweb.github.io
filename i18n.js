let resolveLanguageReady;
// The initial document cannot choose its translated manual until this settles.
window.__edimarkLanguageReady = new Promise(resolve => {
  resolveLanguageReady = resolve;
});

document.addEventListener('DOMContentLoaded', () => {
  const languageSelect = document.getElementById('language-select');
  const languageLabel = document.getElementById('language-select-label');
  const supportedLanguages = new Set(['es', 'en', 'ca', 'gl', 'eu']);

  const normalizeLanguage = (lang) => {
    const baseLanguage = String(lang || '').trim().toLowerCase().split('-')[0];
    return supportedLanguages.has(baseLanguage) ? baseLanguage : 'es';
  };

  const getPreferredLanguage = () => {
    let storedLang = null;
    try {
      storedLang = localStorage.getItem('language');
    } catch (error) {
      console.warn('No se pudo leer el idioma guardado:', error);
    }
    if (storedLang) {
      return normalizeLanguage(storedLang);
    }
    return normalizeLanguage(navigator.language);
  };

  const updateLanguageLabel = () => {
    if (!languageSelect || !languageLabel) return;
    const option = languageSelect.options[languageSelect.selectedIndex];
    if (option) {
      languageLabel.textContent = option.textContent.trim();
    }
  };

  const setLanguage = async (lang) => {
    const usableLang = normalizeLanguage(lang);
    const response = await fetch(`locales/${usableLang}.json`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el idioma ${usableLang}: HTTP ${response.status}`);
    }
    const translations = await response.json();

    window.__edimarkTranslations = translations;
    window.__edimarkLang = usableLang;

    document.querySelectorAll('[data-i18n-key]').forEach(element => {
      const key = element.getAttribute('data-i18n-key');
      if (translations[key]) {
        const translation = translations[key];

        let translatedAttribute = false;
        if (element.hasAttribute('placeholder')) {
          element.setAttribute('placeholder', translation);
          translatedAttribute = true;
        }
        if (element.hasAttribute('title')) {
          element.setAttribute('title', translation);
          translatedAttribute = true;
        }
        if (element.hasAttribute('aria-label')) {
          element.setAttribute('aria-label', translation);
          translatedAttribute = true;
        }
        // Preserve icon children; plain text controls can replace their content.
        if (!translatedAttribute && element.children.length === 0) {
          element.textContent = translation;
        }
      }
    });
    document.documentElement.lang = usableLang;
    try {
      localStorage.setItem('language', usableLang);
    } catch (error) {
      console.warn('No se pudo guardar el idioma:', error);
    }
    languageSelect.value = usableLang;
    updateLanguageLabel();
    if (typeof window.__reloadManualForLanguage === 'function') {
      window.__reloadManualForLanguage();
    }
    if (typeof window.__localizeShortcutLabels === 'function') {
      window.__localizeShortcutLabels();
    }
    if (typeof window.__updateThemeToggleLabel === 'function') {
      window.__updateThemeToggleLabel();
    }
    if (typeof window.__updateFontSizeLabel === 'function') {
      window.__updateFontSizeLabel();
    }
    if (typeof window.__updateCopyButtonLabel === 'function') {
      window.__updateCopyButtonLabel();
    }
    if (typeof window.__updateCharCounterLabel === 'function') {
      window.__updateCharCounterLabel();
    }
    if (typeof window.__updateBase64UiLabels === 'function') {
      window.__updateBase64UiLabels();
    }
  };

  languageSelect.addEventListener('change', (event) => {
    setLanguage(event.target.value);
  });
  languageSelect.addEventListener('change', updateLanguageLabel);

  setLanguage(getPreferredLanguage())
    .catch(error => console.error('No se pudo inicializar el idioma:', error))
    .finally(() => {
      resolveLanguageReady();
    });
});
