import assert from 'node:assert/strict';
import test from 'node:test';

import platformModule from '../platform-api.js';

const { createPlatformApi, fileNameFromPath } = platformModule;

test('extrae el nombre de rutas de Linux, Windows y macOS', () => {
  assert.equal(fileNameFromPath('/home/juanjo/Apuntes.md'), 'Apuntes.md');
  assert.equal(fileNameFromPath('C:\\Documentos\\Tema 1.md'), 'Tema 1.md');
  assert.equal(fileNameFromPath('file:///Users/juanjo/Apuntes%20de%20clase.md'), 'Apuntes de clase.md');
});

test('abre un documento de texto mediante los plugins de Tauri', async () => {
  const calls = [];
  const platform = createPlatformApi({
    Blob,
    __EDIMARK_TAURI__: {
      dialog: {
        open: async options => {
          calls.push(['open', options]);
          return '/tmp/tema.md';
        },
      },
      fs: {
        readTextFile: async path => {
          calls.push(['read', path]);
          return '# Tema';
        },
      },
    },
  });

  assert.equal(platform.isDesktop, true);
  assert.deepEqual(await platform.openTextDocument(), {
    path: '/tmp/tema.md',
    name: 'tema.md',
    content: '# Tema',
  });
  assert.equal(calls[0][0], 'open');
  assert.deepEqual(calls[1], ['read', '/tmp/tema.md']);
});

test('guarda texto en la ruta existente sin volver a preguntar', async () => {
  let written;
  const platform = createPlatformApi({
    Blob,
    __TAURI__: {
      dialog: {
        save: async () => assert.fail('no debe abrir el diálogo'),
      },
      fs: {
        writeTextFile: async (path, content) => { written = { path, content }; },
      },
    },
  });

  const result = await platform.saveFile({
    suggestedName: 'tema.md',
    contents: '# Tema nuevo',
    existingPath: '/tmp/tema.md',
  });

  assert.deepEqual(written, { path: '/tmp/tema.md', content: '# Tema nuevo' });
  assert.deepEqual(result, { saved: true, path: '/tmp/tema.md', name: 'tema.md' });
});

test('guarda datos binarios en la ruta escogida', async () => {
  let written;
  const platform = createPlatformApi({
    Blob,
    __TAURI__: {
      dialog: { save: async () => '/tmp/tema.epub' },
      fs: {
        writeFile: async (path, bytes) => { written = { path, bytes: [...bytes] }; },
      },
    },
  });

  const result = await platform.saveFile({
    suggestedName: 'tema.epub',
    contents: new Uint8Array([1, 2, 3]),
    extensions: ['epub'],
  });

  assert.deepEqual(written, { path: '/tmp/tema.epub', bytes: [1, 2, 3] });
  assert.equal(result.saved, true);
});

test('cancelar el diálogo no escribe ni marca el documento como guardado', async () => {
  const platform = createPlatformApi({
    Blob,
    __TAURI__: {
      dialog: { save: async () => null },
      fs: { writeTextFile: async () => assert.fail('no debe escribir') },
    },
  });

  assert.deepEqual(await platform.saveFile({ suggestedName: 'tema.md', contents: 'texto' }), {
    saved: false,
    path: '',
    name: 'tema.md',
  });
});

test('abre los enlaces externos con el navegador del sistema en Tauri', async () => {
  let openedUrl = '';
  const platform = createPlatformApi({
    Blob,
    __EDIMARK_TAURI__: {
      dialog: {},
      fs: {},
      opener: { openUrl: async url => { openedUrl = url; } },
    },
  });

  await platform.openExternalUrl('https://edimarkweb.github.io/');
  assert.equal(openedUrl, 'https://edimarkweb.github.io/');
  await assert.rejects(() => platform.openExternalUrl('file:///etc/passwd'));
});

test('abre las rutas Markdown recibidas al iniciar o desde una segunda instancia', async () => {
  let subscriber;
  const platform = createPlatformApi({
    Blob,
    __EDIMARK_TAURI__: {
      dialog: {},
      fs: {},
      app: {
        initialMarkdownPaths: async () => ['/tmp/inicial.md'],
        readMarkdownDocument: async path => `Contenido de ${path}`,
        onOpenMarkdownPaths: callback => {
          subscriber = callback;
          return () => { subscriber = null; };
        },
      },
    },
  });

  assert.deepEqual(await platform.initialTextDocumentPaths(), ['/tmp/inicial.md']);
  assert.deepEqual(await platform.openTextDocumentAtPath('/tmp/inicial.md'), {
    path: '/tmp/inicial.md',
    name: 'inicial.md',
    content: 'Contenido de /tmp/inicial.md',
  });
  let received;
  const unsubscribe = platform.onTextDocumentPaths(paths => { received = paths; });
  subscriber(['/tmp/segundo.markdown']);
  assert.deepEqual(received, ['/tmp/segundo.markdown']);
  unsubscribe();
  assert.equal(subscriber, null);
});

test('expone la imagen del portapapeles nativo solo en escritorio', async () => {
  const nativeImage = { rgba: new Uint8Array([255, 0, 0, 255]), size: { width: 1, height: 1 } };
  const platform = createPlatformApi({
    Blob,
    __EDIMARK_TAURI__: {
      dialog: {},
      fs: {},
      clipboard: { readImage: async () => nativeImage },
    },
  });
  assert.deepEqual(await platform.readClipboardImage(), nativeImage);

  const webPlatform = createPlatformApi({ Blob, URL, document: {}, setTimeout });
  assert.equal(await webPlatform.readClipboardImage(), null);
});
