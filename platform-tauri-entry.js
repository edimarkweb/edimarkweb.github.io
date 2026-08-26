import { ask, message as showMessage, open, save } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, mkdir, readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { readImage } from '@tauri-apps/plugin-clipboard-manager';
import { fetch as nativeFetch } from '@tauri-apps/plugin-http';

// El resto de la aplicación sigue siendo JavaScript clásico y compartido con
// GitHub Pages. Este pequeño punto de entrada es el único que empaqueta las API
// nativas y las deja listas antes de crear EdiMarkPlatform.
if (window.__TAURI_INTERNALS__) {
  const pendingOpenPathBatches = [];
  const openPathSubscribers = new Set();

  listen('open-markdown-files', (event) => {
    const paths = Array.isArray(event.payload) ? event.payload : [];
    if (!paths.length) return;
    if (!openPathSubscribers.size) {
      pendingOpenPathBatches.push(paths);
      return;
    }
    openPathSubscribers.forEach(callback => callback(paths));
  }).catch(error => console.error('No se pudo escuchar la apertura de documentos:', error));

  window.__EDIMARK_TAURI__ = {
    /*
      `ask` y `message` acompañan a los diálogos de archivo porque en el
      escritorio no sirven `confirm` ni `alert` del navegador: WebKitGTK trae
      apagados los diálogos modales de JavaScript, así que no se ve nada y la
      respuesta que le llega a la página es siempre «no».
    */
    dialog: { open, save, ask, message: showMessage },
    fs: { readTextFile, writeFile, writeTextFile },
    /*
      Las opciones de la aplicación, en un archivo del perfil del usuario y no
      en el almacén del webview: ese almacén es caché para el sistema y se
      puede vaciar solo, y entonces el idioma, el autor y el formato de partida
      desaparecerían sin que nadie haya tocado nada.
    */
    settings: {
      async read(name) {
        try {
          return await readTextFile(name, { baseDir: BaseDirectory.AppConfig });
        } catch (error) {
          // Todavía no existe: es lo normal la primera vez.
          return null;
        }
      },
      async write(name, contents) {
        await mkdir('', { baseDir: BaseDirectory.AppConfig, recursive: true });
        await writeTextFile(name, contents, { baseDir: BaseDirectory.AppConfig });
      },
    },
    opener: { openUrl },
    clipboard: {
      async readImage() {
        const image = await readImage();
        return {
          rgba: await image.rgba(),
          size: await image.size(),
        };
      },
    },
    update: {
      target: () => invoke('update_target'),
      // Las peticiones salen por Rust: GitHub redirige los instaladores a un
      // servidor sin cabeceras CORS y el webview cancelaría la descarga.
      fetch: (input, init) => nativeFetch(input, init),
      installDownloaded: (fileName, bytes) => invoke('install_downloaded_update', bytes, {
        headers: { 'x-installer-name': fileName },
      }),
    },
    app: {
      // Cerrar la ventana y no `exit`: así el webview cumple su ciclo de
      // cierre y el documento en curso llega a guardarse.
      quit: () => getCurrentWindow().close(),
      initialMarkdownPaths: () => invoke('initial_markdown_paths'),
      readMarkdownDocument: path => invoke('read_markdown_document', { path }),
      writeMarkdownDocument: (path, contents) => invoke('write_markdown_document', { path, contents }),
      printDocument: () => invoke('print_document'),
      readDocumentAsset: path => invoke('read_document_asset', { path }),
      writeDocumentAsset: (documentPath, relativePath, bytes) => invoke('write_document_asset', bytes, {
        headers: {
          'x-document-path': encodeURIComponent(documentPath),
          'x-relative-path': encodeURIComponent(relativePath),
        },
      }),
      // El corrector de WebKitGTK (Linux) solo se enciende desde Rust; en los
      // demás sistemas la orden llega y no hace nada.
      setSpellChecking: (enabled, lang) => invoke('set_spell_checking', { enabled, lang }),
      onOpenMarkdownPaths(callback) {
        openPathSubscribers.add(callback);
        while (pendingOpenPathBatches.length) callback(pendingOpenPathBatches.shift());
        return () => openPathSubscribers.delete(callback);
      },
    },
  };
}
