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

  function directoryFromPath(path) {
    const raw = String(path || '');
    const index = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
    return index < 0 ? '' : raw.slice(0, index);
  }

  function resolveChildPath(directory, relativePath) {
    const windowsStyle = directory.includes('\\') && !directory.includes('/');
    const separator = windowsStyle ? '\\' : '/';
    return `${directory.replace(/[\\/]+$/, '')}${separator}${relativePath.replaceAll('/', separator)}`;
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

  /*
    Una carpeta elegida para guardar solo puede recibir rutas descendentes.
    Además de evitar que un ZIP contenga entradas peligrosas, esto impide que
    una referencia como `../comunes/logo.png` escriba fuera de la carpeta que
    el usuario acaba de autorizar.
  */
  function safeCompanionPath(path) {
    const value = String(path || '').replace(/\\/g, '/');
    if (!value || value.startsWith('/') || /^[a-zA-Z]:/.test(value)) return '';
    const segments = value.split('/');
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) return '';
    return segments.join('/');
  }

  function usableCompanionFiles(files) {
    return (Array.isArray(files) ? files : [])
      .map(file => ({
        path: safeCompanionPath(file && (file.relativePath || file.path)),
        contents: file && file.contents,
      }))
      .filter(file => file.path && file.contents != null);
  }

  async function writeDirectoryFile(directory, path, contents) {
    const segments = path.split('/');
    const name = segments.pop();
    let targetDirectory = directory;
    for (const segment of segments) {
      targetDirectory = await targetDirectory.getDirectoryHandle(segment, { create: true });
    }
    const fileHandle = await targetDirectory.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(contents);
      await writable.close();
    } catch (error) {
      if (typeof writable.abort === 'function') await writable.abort().catch(() => {});
      throw error;
    }
  }

  async function saveBrowserDocumentWithAssets(root, {
    suggestedName,
    contents,
    mimeType,
    companionFiles,
    directoryHandle,
  }) {
    const files = usableCompanionFiles(companionFiles);
    let directory = directoryHandle || null;

    if (!directory && typeof root.showDirectoryPicker === 'function') {
      try {
        directory = await root.showDirectoryPicker({ mode: 'readwrite' });
      } catch (error) {
        if (error && error.name === 'AbortError') {
          return { saved: false, path: '', name: suggestedName };
        }
        throw error;
      }
    }

    if (directory) {
      await writeDirectoryFile(directory, suggestedName, contents);
      for (const file of files) {
        await writeDirectoryFile(directory, file.path, file.contents);
      }
      return {
        saved: true,
        path: '',
        name: suggestedName,
        directoryHandle: directory,
        companionCount: files.length,
      };
    }

    /*
      Firefox no ofrece todavía un selector de carpeta con permiso de
      escritura. Varias descargas sueltas perderían `imagenes/…`, porque el
      atributo `download` no puede crear subcarpetas. Un ZIP conserva el `.md`
      y exactamente la misma estructura relativa en todos los navegadores.
    */
    const archiveFiles = new Map([[suggestedName, await toBytes(root, contents)]]);
    for (const file of files) {
      archiveFiles.set(file.path, await toBytes(root, file.contents));
    }
    const { createZip } = await import('./zip-writer.js');
    const archive = await createZip(archiveFiles);
    const archiveName = suggestedName.replace(/\.[^.]+$/, '') + '.zip';
    browserDownload(root, archive, archiveName, 'application/zip');
    return {
      saved: true,
      path: '',
      name: suggestedName,
      archiveName,
      companionCount: files.length,
    };
  }

  function createPlatformApi(root = defaultRoot) {
    const tauri = root && root.__TAURI__;
    const injected = root && root.__EDIMARK_TAURI__;
    const dialog = (injected && injected.dialog) || (tauri && tauri.dialog);
    const fs = (injected && injected.fs) || (tauri && tauri.fs);
    const opener = (injected && injected.opener) || (tauri && tauri.opener);
    const app = injected && injected.app;
    const settingsStore = injected && injected.settings;
    /*
      La última carpeta usada, mientras dure la sesión. Los diálogos nativos
      abren donde el sistema quiera si no se les dice nada, y quien trabaja en
      una carpeta de apuntes acaba navegando hasta ella una y otra vez. No se
      guarda en el disco a propósito: es un atajo de esta sesión, no una
      preferencia que haya que arrastrar de un día para otro.
    */
    let lastDirectory = '';

    function rememberDirectory(path) {
        const directory = directoryFromPath(path);
        if (directory) lastDirectory = directory;
        return path;
    }

    /* Un nombre suelto se abre en la última carpeta; una ruta entera manda. */
    function defaultPathFor(suggestedName = '') {
        if (!lastDirectory) return suggestedName || undefined;
        if (!suggestedName) return lastDirectory;
        return resolveChildPath(lastDirectory, suggestedName);
    }
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

      /*
        Opciones de la aplicación en el disco. En el navegador no hay dónde
        guardarlas, así que devuelve null y manda `localStorage`; en el
        escritorio, el archivo es la copia buena y `localStorage` solo el
        espejo que lee el resto del código sin esperar a nada.
      */
      async readSettingsFile(name = 'settings.json') {
        if (!desktop || !settingsStore || typeof settingsStore.read !== 'function') return null;
        try {
          const contents = await settingsStore.read(name);
          return typeof contents === 'string' ? contents : null;
        } catch (error) {
          console.warn('No se han podido leer las opciones guardadas:', error);
          return null;
        }
      },

      async writeSettingsFile(contents, name = 'settings.json') {
        if (!desktop || !settingsStore || typeof settingsStore.write !== 'function') return false;
        try {
          await settingsStore.write(name, String(contents));
          return true;
        } catch (error) {
          console.warn('No se han podido guardar las opciones en el disco:', error);
          return false;
        }
      },

      /*
        Preguntas y avisos.

        En el escritorio no valen los del navegador: WebKitGTK trae apagados
        los diálogos modales de JavaScript, de modo que `confirm` no enseña
        nada y responde que no, y `alert` se pierde sin que nadie lo lea. Con
        el diálogo del sistema la pregunta se ve y la respuesta es la del
        usuario. En el navegador siguen valiendo los de siempre.
      */
      async confirm(text, { title = 'EdiMarkWeb' } = {}) {
        if (desktop && dialog && typeof dialog.ask === 'function') {
          return Boolean(await dialog.ask(String(text), { title, kind: 'warning' }));
        }
        return Boolean(root.confirm(String(text)));
      },

      async notify(text, { title = 'EdiMarkWeb', kind = 'info' } = {}) {
        if (desktop && dialog && typeof dialog.message === 'function') {
          await dialog.message(String(text), { title, kind });
          return;
        }
        root.alert(String(text));
      },

      async openTextDocument({ extensions = ['md', 'markdown'] } = {}) {
        if (!desktop) return null;
        const selected = await dialog.open({
          multiple: false,
          directory: false,
          defaultPath: defaultPathFor(),
          filters: [{ name: 'Markdown', extensions }],
        });
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (!path) return null;
        rememberDirectory(path);
        return {
          path,
          name: fileNameFromPath(path),
          content: await fs.readTextFile(path),
        };
      },

      async openTextDocumentAtPath(path) {
        if (!desktop || !app || typeof app.readMarkdownDocument !== 'function') return null;
        // Vale para el arrastre y para los archivos con los que arranca la
        // aplicación: la carpeta de trabajo suele ser esa.
        rememberDirectory(path);
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
          defaultPath: defaultPathFor(),
          filters: [{
            name: 'Imágenes',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'],
          }],
        });
        const path = Array.isArray(selected) ? selected[0] : selected;
        if (!path) return null;
        rememberDirectory(path);
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
        companionFiles,
        directoryHandle,
      } = {}) {
        if (!desktop) {
          if (Array.isArray(companionFiles) && companionFiles.length) {
            return saveBrowserDocumentWithAssets(root, {
              suggestedName,
              contents,
              mimeType,
              companionFiles,
              directoryHandle,
            });
          }
          browserDownload(root, contents, suggestedName, mimeType);
          return { saved: true, path: '', name: suggestedName };
        }

        let path = existingPath;
        if (!path) {
          const usableExtensions = Array.isArray(extensions) && extensions.length
            ? extensions
            : [extensionFromName(suggestedName)].filter(Boolean);
          path = await dialog.save({
            defaultPath: defaultPathFor(suggestedName),
            filters: usableExtensions.length
              ? [{ name: usableExtensions.map(ext => ext.toUpperCase()).join('/'), extensions: usableExtensions }]
              : undefined,
          });
        }
        if (!path) return { saved: false, path: '', name: suggestedName };
        rememberDirectory(path);

        /*
          El `.md` se escribe desde Rust cuando se puede. El diálogo autoriza al
          plugin de archivos a tocar la ruta elegida, pero ese permiso caduca
          con la sesión, y la aplicación recuerda los documentos abiertos de un
          arranque a otro: sin esto, volver a guardar uno de ayer moría en un
          error o pedía otra vez la ubicación.
        */
        const markdownTarget = typeof contents === 'string'
          && app
          && typeof app.writeMarkdownDocument === 'function'
          && ['md', 'markdown'].includes(extensionFromName(path));
        if (markdownTarget) {
          await app.writeMarkdownDocument(path, contents);
        } else if (typeof contents === 'string') {
          await fs.writeTextFile(path, contents);
        } else {
          await fs.writeFile(path, await toBytes(root, contents));
        }

        const files = usableCompanionFiles(companionFiles);
        const targetDirectory = directoryFromPath(path);
        for (const file of files) {
          const bytes = await toBytes(root, file.contents);
          if (app && typeof app.writeDocumentAsset === 'function') {
            await app.writeDocumentAsset(path, file.path, bytes);
            continue;
          }
          const targetPath = resolveChildPath(targetDirectory, file.path);
          const parentDirectory = directoryFromPath(targetPath);
          if (parentDirectory && typeof fs.mkdir === 'function') {
            await fs.mkdir(parentDirectory, { recursive: true });
          }
          await fs.writeFile(targetPath, bytes);
        }
        const result = {
          saved: true,
          path,
          name: fileNameFromPath(path) || suggestedName,
        };
        if (Array.isArray(companionFiles)) result.companionCount = files.length;
        return result;
      },
    };
  }

  return { createPlatformApi, fileNameFromPath };
}));
