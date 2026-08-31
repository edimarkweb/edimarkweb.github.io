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

  /*
    `persist` distingue la elección del usuario de la detección automática. Al
    arrancar no se guarda nada: si se guardara el idioma deducido de
    navigator.language, la primera visita lo dejaría fijado y cambiar luego el
    idioma del navegador ya no tendría efecto.
  */
  const setLanguage = async (lang, { persist = true } = {}) => {
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
      // hasOwnProperty y no truthiness: una cadena vacía es una traducción
      // válida y debe aplicarse igual que cualquier otra.
      if (Object.prototype.hasOwnProperty.call(translations, key)) {
        const translation = String(translations[key]);

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
    if (persist) {
      try {
        localStorage.setItem('language', usableLang);
        // Y en el escritorio, también en el archivo del perfil.
        if (typeof window.__edimarkPersistPreferences === 'function') {
          window.__edimarkPersistPreferences();
        }
      } catch (error) {
        console.warn('No se pudo guardar el idioma:', error);
      }
    }
    if (languageSelect) languageSelect.value = usableLang;
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
    if (typeof window.__updateCopyButtonLabel === 'function') {
      window.__updateCopyButtonLabel();
    }
    if (typeof window.__updateExportButtonLabel === 'function') {
      window.__updateExportButtonLabel();
    }
    if (typeof window.__updateCharCounterLabel === 'function') {
      window.__updateCharCounterLabel();
    }
    if (typeof window.__updateBase64UiLabels === 'function') {
      window.__updateBase64UiLabels();
    }
    if (typeof window.__updateVersionLabel === 'function') {
      window.__updateVersionLabel();
    }
    if (typeof window.__refreshUpdateBanner === 'function') {
      window.__refreshUpdateBanner();
    }
    if (typeof window.__refreshInheritedDocumentHints === 'function') {
      window.__refreshInheritedDocumentHints();
    }
    // El resumen del formato en la barra de estado se compone a mano, con
    // etiquetas y decimales del idioma: data-i18n-key no lo alcanza.
    if (typeof window.__updateDocumentFormatStatus === 'function') {
      window.__updateDocumentFormatStatus();
    }
    // Y la píldora del idioma tampoco: el documento que no lleva el suyo sigue
    // al de la interfaz, así que el código cambia con este mismo interruptor.
    if (typeof window.__refreshDocLanguageIndicator === 'function') {
      window.__refreshDocLanguageIndicator();
    }
    if (typeof window.__refreshBibliographyPreview === 'function') {
      window.__refreshBibliographyPreview();
    }
  };

  /*
    Sin la guarda, la falta del selector lanzaría aquí y resolveLanguageReady()
    no llegaría a ejecutarse: la promesa __edimarkLanguageReady se quedaría
    pendiente para siempre y con ella el documento inicial.
  */
  if (languageSelect) {
    languageSelect.addEventListener('change', (event) => {
      setLanguage(event.target.value);
    });
    languageSelect.addEventListener('change', updateLanguageLabel);
  }

  /*
    En el escritorio el idioma elegido vive en un archivo del perfil, porque el
    almacén del webview no sobrevive a una reinstalación. Leerlo es asíncrono,
    así que se espera a que esté volcado antes de decidir: si no, la primera
    pantalla saldría en el idioma del sistema y cambiaría sola después.
  */
  Promise.resolve(window.__edimarkPreferencesReady)
    .catch(() => {})
    .then(() => setLanguage(getPreferredLanguage(), { persist: false }))
    .catch(error => console.error('No se pudo inicializar el idioma:', error))
    .finally(() => {
      resolveLanguageReady();
    });
});
