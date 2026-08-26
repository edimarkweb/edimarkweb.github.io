(function initPlatformApi(root, factory) {
  const exported = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  } else {
    root.EdiMarkPlatform = exported.createPlatformApi(root);
  }
}(typeof window !== 'undefined' ? window : globalThis, function platformApiFactory(defaultRoot) {
  function fileNameFromPath(path) {
    const raw = String(path || '').replace(/[?#].*$/, '');
    const segments = raw.split(/[\\/]/);
    const encodedName = segments[segments.length - 1] || '';
    try {
      return decodeURIComponent(encodedName);
    } catch (_) {
      return encodedName;
    }
  }

  function extensionFromName(name) {
    const match = String(name || '').match(/\.([^.\\/]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  function browserDownload(root, contents, suggestedName, mimeType) {
    const blob = contents instanceof root.Blob
      ? contents
      : new root.Blob([contents], { type: mimeType || 'application/octet-stream' });
    const url = root.URL.createObjectURL(blob);
    const link = root.document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    root.document.body.appendChild(link);
    link.click();
    root.document.body.removeChild(link);
    root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
  }

  async function toBytes(root, contents) {
    if (contents instanceof Uint8Array) return contents;
    if (contents instanceof ArrayBuffer) return new Uint8Array(contents);
    if (ArrayBuffer.isView(contents)) {
      return new Uint8Array(contents.buffer, contents.byteOffset, contents.byteLength);
    }
    if (root.Blob && contents instanceof root.Blob) {
      return new Uint8Array(await contents.arrayBuffer());
    }
    return new TextEncoder().encode(String(contents ?? ''));
  }

  function createPlatformApi(root = defaultRoot) {
    const tauri = root && root.__TAURI__;
    const injected = root && root.__EDIMARK_TAURI__;
    const dialog = (injected && injected.dialog) || (tauri && tauri.dialog);
    const fs = (injected && injected.fs) || (tauri && tauri.fs);
    const opener = (injected && injected.opener) || (tauri && tauri.opener);
    const app = injected && injected.app;
    const updater = injected && injected.update;
    const clipboard = injected && injected.clipboard;
    const desktop = Boolean(dialog && fs);

    return {
      isDesktop: desktop,
      fileNameFromPath,

      async openExternalUrl(url) {
        const parsed = new URL(String(url));
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Solo se pueden abrir enlaces HTTP o HTTPS.');
        }
        if (desktop && opener && typeof opener.openUrl === 'function') {
          await opener.openUrl(parsed.href);
          return;
        }
        if (root && typeof root.open === 'function') {
          root.open(parsed.href, '_blank', 'noopener');
        }
      },

      async openTextDocument({ extensions = ['md', 'markdown'] } = {}) {
        if (!desktop) return null;
        const selected = await dialog.open({
          multiple: false,
          directory: false,
          filters: [{ name: 'Markdown', extensions }],
        });
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (!path) return null;
        return {
          path,
          name: fileNameFromPath(path),
          content: await fs.readTextFile(path),
        };
      },

      async openTextDocumentAtPath(path) {
        if (!desktop || !app || typeof app.readMarkdownDocument !== 'function') return null;
        return {
          path,
          name: fileNameFromPath(path),
          content: await app.readMarkdownDocument(path),
        };
      },

      /*
        Bytes de una imagen que acompaña al documento abierto, para que la vista
        previa pueda mostrar las rutas relativas del Markdown. Devuelve null en
        el navegador, donde no hay acceso al disco y las imágenes salen de la
        carpeta que el usuario vincule.
      */
      async readDocumentAsset(path) {
        if (!desktop || !app || typeof app.readDocumentAsset !== 'function') return null;
        const data = await app.readDocumentAsset(path);
        if (!data) return null;
        if (data instanceof Uint8Array) return data;
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        if (Array.isArray(data)) return new Uint8Array(data);
        if (ArrayBuffer.isView(data)) {
          return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
        return null;
      },

      /*
        Corrector ortográfico del sistema. En Linux el webview lo trae apagado y
        hay que encenderlo desde Rust indicando el idioma; en el navegador y en
        los demás sistemas basta con el atributo `spellcheck` del editor.
      */
      async setSpellChecking(enabled, lang) {
        if (!desktop || !app || typeof app.setSpellChecking !== 'function') return;
        try {
          await app.setSpellChecking(Boolean(enabled), String(lang || ''));
        } catch (error) {
          console.warn('No se pudo ajustar el corrector ortográfico:', error);
        }
      },

      /* Diálogo nativo para elegir una imagen: devuelve su ruta en el disco,
         que es lo que permite escribirla en el Markdown como ruta relativa. */
      async pickImageFile() {
        if (!desktop) return null;
        const selected = await dialog.open({
          multiple: false,
          directory: false,
          filters: [{
            name: 'Imágenes',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'],
          }],
        });
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (!path) return null;
        return { path, name: fileNameFromPath(path) };
      },

      async initialTextDocumentPaths() {
        if (!desktop || !app || typeof app.initialMarkdownPaths !== 'function') return [];
        const paths = await app.initialMarkdownPaths();
        return Array.isArray(paths) ? paths : [];
      },

      onTextDocumentPaths(callback) {
        if (!desktop || !app || typeof app.onOpenMarkdownPaths !== 'function') return () => {};
        return app.onOpenMarkdownPaths(callback);
      },

      /* Cierra la aplicación de escritorio; en el navegador no hace nada. */
      async quitApplication() {
        if (!desktop || !app || typeof app.quit !== 'function') return false;
        await app.quit();
        return true;
      },

      /* Sistema y arquitectura («linux/x86_64») para elegir el instalador. */
      async updateTarget() {
        if (!desktop || !updater || typeof updater.target !== 'function') return '';
        return updater.target();
      },

      /*
        `fetch` nativo para las actualizaciones: GitHub redirige los adjuntos a
        un servidor que no responde con cabeceras CORS, así que el webview los
        rechazaría. En el navegador no hay actualizaciones y devuelve null.
      */
      updateFetch() {
        if (!desktop || !updater || typeof updater.fetch !== 'function') return null;
        return (input, init) => updater.fetch(input, init);
      },

      /* Entrega al sistema el instalador ya descargado y devuelve su ruta. */
      async installDownloadedUpdate(fileName, bytes) {
        if (!desktop || !updater || typeof updater.installDownloaded !== 'function') {
          throw new Error('Esta versión no puede instalar actualizaciones.');
        }
        // El nombre viaja como cabecera del IPC, que solo admite ASCII.
        const safeName = String(fileName || '').replace(/[^A-Za-z0-9._+~-]/g, '-');
        if (!safeName) throw new Error('El instalador no tiene un nombre válido.');
        return updater.installDownloaded(safeName, bytes);
      },

      async readClipboardImage() {
        if (!desktop || !clipboard || typeof clipboard.readImage !== 'function') return null;
        return clipboard.readImage();
      },

      async saveFile({
        suggestedName = 'documento',
        contents = '',
        mimeType = 'application/octet-stream',
        existingPath = '',
        extensions,
      } = {}) {
        if (!desktop) {
          browserDownload(root, contents, suggestedName, mimeType);
          return { saved: true, path: '', name: suggestedName };
        }

        let path = existingPath;
        if (!path) {
          const usableExtensions = Array.isArray(extensions) && extensions.length
            ? extensions
            : [extensionFromName(suggestedName)].filter(Boolean);
          path = await dialog.save({
            defaultPath: suggestedName,
            filters: usableExtensions.length
              ? [{ name: usableExtensions.map(ext => ext.toUpperCase()).join('/'), extensions: usableExtensions }]
              : undefined,
          });
        }
        if (!path) return { saved: false, path: '', name: suggestedName };

        if (typeof contents === 'string') {
          await fs.writeTextFile(path, contents);
        } else {
          await fs.writeFile(path, await toBytes(root, contents));
        }
        return { saved: true, path, name: fileNameFromPath(path) || suggestedName };
      },
    };
  }

  return { createPlatformApi, fileNameFromPath };
}));
