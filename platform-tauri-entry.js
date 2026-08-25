import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { readImage } from '@tauri-apps/plugin-clipboard-manager';

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
    dialog: { open, save },
    fs: { readTextFile, writeFile, writeTextFile },
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
      installDownloaded: (fileName, bytes) => invoke('install_downloaded_update', bytes, {
        headers: { 'x-installer-name': fileName },
      }),
    },
    app: {
      initialMarkdownPaths: () => invoke('initial_markdown_paths'),
      readMarkdownDocument: path => invoke('read_markdown_document', { path }),
      onOpenMarkdownPaths(callback) {
        openPathSubscribers.add(callback);
        while (pendingOpenPathBatches.length) callback(pendingOpenPathBatches.shift());
        return () => openPathSubscribers.delete(callback);
      },
    },
  };
}
