import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';

// El resto de la aplicación sigue siendo JavaScript clásico y compartido con
// GitHub Pages. Este pequeño punto de entrada es el único que empaqueta las API
// nativas y las deja listas antes de crear EdiMarkPlatform.
if (window.__TAURI_INTERNALS__) {
  window.__EDIMARK_TAURI__ = {
    dialog: { open, save },
    fs: { readTextFile, writeFile, writeTextFile },
    opener: { openUrl },
  };
}
