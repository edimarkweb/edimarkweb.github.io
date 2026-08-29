import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from '@playwright/test';

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = process.env.EDIMARK_STATIC_ROOT
  ? resolve(defaultRepoRoot, process.env.EDIMARK_STATIC_ROOT)
  : defaultRepoRoot;
// PNG de un píxel: sirve para comprobar que la imagen llega a la vista previa
// sin arrastrar un archivo binario al repositorio.
const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/*
  Carpeta de trabajo con una imagen dentro, como la que acompaña a cualquier
  artículo. Playwright exige una carpeta de verdad para los `webkitdirectory`.
*/
async function crearCarpetaConImagen() {
  const raiz = await mkdtemp(join(tmpdir(), 'edimark-imagenes-'));
  await mkdir(join(raiz, 'imagenes'), { recursive: true });
  await writeFile(join(raiz, 'imagenes', '01-grafico.png'), PNG_PIXEL);
  return raiz;
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
]);

let browser;
let server;
let appUrl;

function startStaticServer() {
  return new Promise((resolveServer, reject) => {
    const instance = createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const filePath = resolve(repoRoot, relativePath);
        if (filePath !== repoRoot && !filePath.startsWith(`${repoRoot}${sep}`)) {
          response.writeHead(403).end();
          return;
        }
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error('not_a_file');
        const body = await readFile(filePath);
        response.writeHead(200, {
          'Content-Type': mimeTypes.get(extname(filePath)) || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        response.end(body);
      } catch (_error) {
        response.writeHead(404).end('Not found');
      }
    });
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', () => resolveServer(instance));
  });
}

/*
  Firefox no conoce los permisos del portapapeles y `newContext` aborta con
  «Unknown permission» si se le pasan, así que allí se piden solo los que
  entiende. Lo que de verdad necesite leer o escribir el portapapeles lo decide
  después cada prueba, con `HAY_PORTAPAPELES`.
*/
const PERMISOS_SIN_FIREFOX = new Set(['clipboard-read', 'clipboard-write']);
const HAY_PORTAPAPELES = process.env.BROWSER !== 'firefox';

function permisosDelNavegador(permissions) {
  if (!permissions) return null;
  if (HAY_PORTAPAPELES) return permissions;
  const admitidos = permissions.filter(permiso => !PERMISOS_SIN_FIREFOX.has(permiso));
  return admitidos.length ? admitidos : null;
}

async function openApp({ locale = 'es-ES', initStorage, permissions, userAgent } = {}) {
  const permisos = permisosDelNavegador(permissions);
  const context = await browser.newContext({
    locale,
    ...(permisos ? { permissions: permisos } : {}),
    // Para hacerse pasar por el motor de la aplicación de escritorio, que en
    // Linux es WebKitGTK y no imprime como Chromium.
    ...(userAgent ? { userAgent } : {}),
  });
  if (initStorage) {
    await context.addInitScript(initStorage);
  }
  await context.route(/pandoc\.b64(?:\.gz)?(?:\?.*)?$/, route => (
    route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  ));
  const requests = [];
  const page = await context.newPage();
  page.on('request', request => requests.push(request.url()));
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  // La pestaña aparece antes de que el arranque termine de registrar los
  // atajos de teclado: sin esperar, las pruebas que pulsan teclas fallaban
  // una de cada tres veces.
  await page.waitForFunction(() => window.__edimarkReady === true);
  return { context, page, requests };
}

/*
  Deja la hoja a tamaño real y quieta. Con el panel atado a la lupa la hoja
  llena el ancho que tenga el panel —que es lo que se quiere al escribir—, así
  que comprobar que un 13 pt mide 17,33 px o que la hoja mide una A4 pide fijar
  antes el 100 %, que es cuando la pantalla y el papel miden lo mismo.
*/
async function conLaHojaATamanoReal(page) {
  await page.evaluate(() => {
    atarPanelALaLupa(false);
    applyZoom(PREVIEW_ZOOM, 1);
  });
}

before(async () => {
  server = await startStaticServer();
  const address = server.address();
  appUrl = `http://127.0.0.1:${address.port}/index.html`;
  const browserName = process.env.BROWSER === 'firefox' ? 'firefox' : 'chromium';
  const browserType = browserName === 'firefox' ? firefox : chromium;
  const systemChromium = browserName === 'chromium' && existsSync('/usr/bin/chromium')
    ? '/usr/bin/chromium'
    : undefined;
  browser = await browserType.launch({ executablePath: systemChromium, headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolveServer => server.close(resolveServer));
});

test('un idioma no disponible recurre al español', async (t) => {
  const { context, page, requests } = await openApp({ locale: 'fr-FR' });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'es');
  assert.equal(await page.locator('#html-output h1').textContent(), 'Manual de EdiMarkWeb');
  assert.equal(requests.some(url => url.endsWith('/locales/fr.json')), false);
  assert.equal(await page.locator('.site-footer').count(), 0);
  assert.equal(await page.locator('#desktop-release-banner').isVisible(), true);
  const packageVersion = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8')).version;
  assert.match(await page.locator('#desktop-release-banner').innerText(), new RegExp(`v${packageVersion.replaceAll('.', '\\.')}`));
  assert.equal(
    await page.locator('#desktop-banner-download-link').getAttribute('href'),
    'https://github.com/edimarkweb/edimarkweb.github.io/releases/latest',
  );

  await page.locator('#help-menu-btn').click();
  await page.locator('#about-btn').click();
  await page.locator('#about-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(
    await page.locator('#about-web-link').getAttribute('href'),
    'https://edimarkweb.github.io/',
  );
  assert.equal(
    await page.locator('#about-desktop-link').getAttribute('href'),
    'https://github.com/edimarkweb/edimarkweb.github.io/releases/latest',
  );
  await page.locator('#about-close-btn').click();
  await page.locator('#desktop-banner-never-show').check();
  await page.locator('#desktop-banner-close').click();
  await page.reload();
  await page.waitForFunction(() => document.documentElement.lang === 'es');
  assert.equal(await page.locator('#desktop-release-banner').isVisible(), false);
});

test('la aplicación nativa aprovecha toda la ventana y comparte el cuadro Acerca de', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      try { localStorage.setItem('edimarkweb-theme', 'dark'); } catch (_error) {}
      window.__EDIMARK_TAURI__ = {
        dialog: {},
        fs: {},
        opener: {
          openUrl: async url => {
            window.__openedExternalUrl = url;
          },
        },
      };
    },
  });
  t.after(() => context.close());

  assert.equal(await page.locator('body').evaluate(body => body.classList.contains('desktop-mode')), true);
  const dimensions = await page.locator('#main-container').evaluate((main) => {
    const rect = main.getBoundingClientRect();
    return { left: rect.left, width: rect.width, viewport: window.innerWidth };
  });
  assert.equal(dimensions.left, 0);
  assert.equal(dimensions.width, dimensions.viewport);
  assert.equal(await page.locator('.site-footer').count(), 0);
  assert.equal(await page.locator('#desktop-download-link').count(), 0);
  assert.equal(await page.locator('#desktop-release-banner').isVisible(), false);
  assert.equal(await page.locator('#toggle-width-btn').isVisible(), false);
  /*
    Lo último de la ventana ya no es el editor, sino la barra de estado: es ella
    la que tiene que quedar pegada al borde de abajo para que la aplicación
    aproveche la ventana entera.
  */
  const bottomGap = await page.locator('#status-bar').evaluate((barra) => (
    window.innerHeight - barra.getBoundingClientRect().bottom
  ));
  assert.ok(bottomGap >= 10 && bottomGap <= 17, `margen inferior inesperado: ${bottomGap}px`);

  const packageVersion = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8')).version;
  await page.locator('#help-menu-btn').click();
  await page.locator('#about-btn').click();
  await page.locator('#about-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-app-version]').textContent(), packageVersion);
  assert.match(await page.locator('#about-modal-overlay').innerText(), /Juan José de Haro/);
  assert.match(await page.locator('#about-modal-overlay').innerText(), /GNU AGPL v3/);
  assert.equal(await page.locator('#about-web-link').getAttribute('href'), 'https://edimarkweb.github.io/');
  assert.equal(
    await page.locator('#about-desktop-link').getAttribute('href'),
    'https://github.com/edimarkweb/edimarkweb.github.io/releases/latest',
  );
  await page.locator('#about-web-link').click();
  await page.waitForFunction(() => window.__openedExternalUrl === 'https://edimarkweb.github.io/');
  await page.locator('#about-close-btn').click();
  await page.locator('#about-modal-overlay').waitFor({ state: 'hidden' });

  // El formato se aplica también con el foco en la previsualización: los
  // botones ya no se apagan al pasar a la hoja.
  await page.locator('#html-output').focus();
  assert.equal(await page.locator('#formula-btn').getAttribute('data-controls-disabled'), null);
  assert.equal(await page.locator('#open-edicuatex-btn').getAttribute('data-controls-disabled'), null);

  await page.locator('#markdown-input').focus();
  await page.locator('#open-edicuatex-btn').click();
  await page.locator('#edicuatex-modal-overlay').waitFor({ state: 'visible' });
  const edicuatexUrl = new URL(await page.locator('#edicuatex-frame').getAttribute('src'));
  assert.equal(edicuatexUrl.origin, new URL(appUrl).origin);
  assert.equal(edicuatexUrl.pathname, '/vendor/edicuatex/index.html');
  assert.equal(edicuatexUrl.searchParams.get('lang'), 'es');
  assert.equal(edicuatexUrl.searchParams.get('mode'), 'dark');
  const embeddedEdicuatex = page.frameLocator('#edicuatex-frame');
  await embeddedEdicuatex.getByRole('button', { name: 'Básico', exact: true }).waitFor();
  assert.equal(await embeddedEdicuatex.locator('.tab-btn').count(), 15);
  assert.equal(await embeddedEdicuatex.locator('#toolbar .toolbar-btn').count(), 14);
  assert.equal(await embeddedEdicuatex.locator('html').getAttribute('data-edimark-theme'), 'dark');
  await embeddedEdicuatex.locator('#settings-btn').click();
  assert.equal(await embeddedEdicuatex.locator('#settings-modal').evaluate(modal => modal.classList.contains('active')), true);
  const edicuatexFrame = page.frames().find(frame => frame.url().includes('/vendor/edicuatex/index.html'));
  assert.ok(edicuatexFrame, 'no se cargó el editor EdiCuaTeX incrustado');
  await edicuatexFrame.evaluate(() => {
    const targetOrigin = new URLSearchParams(location.search).get('origin');
    parent.postMessage({
      type: 'edicuatex:result',
      latex: 'x^2',
      delimiter: 'parentheses',
      wrapped: '\\(x^2\\)',
    }, targetOrigin);
  });
  await page.locator('#edicuatex-modal-overlay').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#markdown-input').inputValue(), /\\\(x\^2\\\)/);
});

test('las preferencias del perfil sobreviven a una instalación con el almacén vacío', async (t) => {
  const { context, page } = await openApp({
    locale: 'es-ES',
    initStorage: () => {
      /*
        Una versión recién instalada: el archivo del perfil conserva lo que el
        usuario tenía elegido, pero el almacén del webview llega en blanco.
      */
      const archivos = new Map([['preferences.json', JSON.stringify({
        language: 'en',
        'edimarkweb-theme': 'dark',
        'edimarkweb-markdown-zoom': '1.5',
      })]]);
      window.__edimarkPreferenceFiles = archivos;
      window.__EDIMARK_TAURI__ = {
        dialog: {},
        fs: {},
        settings: {
          read: async name => archivos.get(name) ?? null,
          write: async (name, contents) => { archivos.set(name, contents); },
        },
      };
    },
  });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await page.locator('html').evaluate(html => html.classList.contains('dark')), true);
  assert.equal(
    await page.locator('html').evaluate(html => html.style.getPropertyValue('--markdown-zoom')),
    '1.5',
  );

  // Y lo que se cambia ahora vuelve al archivo, no solo al almacén.
  await page.evaluate(() => {
    const select = document.getElementById('language-select');
    select.value = 'ca';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const guardado = window.__edimarkPreferenceFiles.get('preferences.json');
    return guardado ? JSON.parse(guardado).language === 'ca' : false;
  });
});

test('en el escritorio la pestaña con cambios pregunta antes de cerrarse', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      /*
        WebKitGTK trae apagados los diálogos modales de JavaScript, así que la
        aplicación de escritorio pregunta con el diálogo del sistema. Aquí se
        finge ese diálogo para poder responder que no y que sí.
      */
      window.__edimarkPreguntas = [];
      window.__edimarkRespuesta = false;
      window.__EDIMARK_TAURI__ = {
        dialog: {
          ask: async (texto) => {
            window.__edimarkPreguntas.push(texto);
            return window.__edimarkRespuesta;
          },
        },
        fs: {},
      };
    },
  });
  t.after(() => context.close());

  await page.locator('#markdown-input').focus();
  await page.keyboard.type('Un cambio sin guardar');
  await page.locator('.tab').first().locator('.tab-dirty').waitFor({ state: 'visible' });

  // Con la respuesta en «no», la pestaña se queda donde estaba.
  await page.locator('.tab').first().locator('.tab-close').click();
  await page.waitForFunction(() => window.__edimarkPreguntas.length === 1);
  assert.equal(await page.locator('.tab').count(), 1);

  // Y con la respuesta en «sí», se cierra.
  await page.evaluate(() => { window.__edimarkRespuesta = true; });
  await page.locator('.tab').first().locator('.tab-close').click();
  await page.waitForFunction(() => document.querySelectorAll('.tab').length === 0);
  assert.equal((await page.evaluate(() => window.__edimarkPreguntas.length)), 2);
});

test('el PDF del menú de exportación sale por la impresión, no por Pandoc', async (t) => {
  const { context, page } = await openApp({});
  t.after(() => context.close());

  /*
    Pandoc no sabe hacer PDF sin un motor LaTeX, así que esa entrada lleva al
    diálogo de impresión, donde el sistema ofrece «Guardar como PDF». Aquí se
    sustituye la impresión para que la prueba no abra un diálogo de verdad.
  */
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones += 1; }; });
  await page.locator('#export-menu-btn').click();
  await page.locator('#export-menu').waitFor({ state: 'visible' });
  await page.locator('#export-menu [data-export-format="pdf"]').click();
  await page.waitForFunction(() => window.__impresiones === 1);
  assert.equal(await page.locator('#export-menu').isVisible(), false);
});

/*
  Exportar y copiar son la misma acción con distinto destino, así que el botón
  de exportar funciona igual que el de copiar: repite de un clic el último
  formato, lo dice en su rótulo y guarda la flecha para cambiarlo. Las dos
  listas —la de la cabecera y la de la flecha— alimentan esa memoria.
*/
test('el botón de exportar repite el último formato y lo dice', async (t) => {
  const { context, page } = await openApp({});
  t.after(() => context.close());

  // Se prueba con PDF, que es el único formato que no pasa por Pandoc.
  await page.evaluate(() => { window.__impresiones = 0; window.print = () => { window.__impresiones += 1; }; });

  const rotulo = () => page.locator('#export-quick-btn').innerText();
  assert.equal((await rotulo()).trim(), 'DOCX', 'de partida, el primero de la lista');

  // Elegir en la lista de la cabecera es decir también qué repetirá el botón.
  await page.locator('#export-menu-btn').click();
  await page.locator('#export-menu [data-export-format="pdf"]').click();
  await page.waitForFunction(() => window.__impresiones === 1);
  assert.equal((await rotulo()).trim(), 'PDF');

  // Y el botón lo repite sin abrir nada.
  await page.locator('#export-quick-btn').click();
  await page.waitForFunction(() => window.__impresiones === 2);
  assert.equal(await page.locator('#export-quick-menu').isVisible(), false);

  // La flecha abre la misma lista, con el formato de ahora marcado.
  await page.locator('#export-quick-menu-toggle').click();
  await page.locator('#export-quick-menu').waitFor({ state: 'visible' });
  assert.equal(
    await page.locator('#export-quick-menu [data-export-format="pdf"]').getAttribute('aria-checked'),
    'true',
  );
  assert.equal(
    await page.locator('#export-quick-menu [data-export-format="docx"]').getAttribute('aria-checked'),
    'false',
  );
  // Y se cierra con Escape, como los demás menús.
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#export-quick-menu').isVisible(), false);

  // El formato elegido sobrevive a la recarga.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__edimarkReady === true);
  assert.equal((await rotulo()).trim(), 'PDF');
});

/*
  En el escritorio, un documento llega por su ruta: al abrirlo dos veces —doble
  clic, o soltándolo— no puede acabar en dos pestañas, cada una con su copia,
  porque guardar en una pisaría lo escrito en la otra. Y el arrastre nativo no
  pasa por el DOM: el webview se queda con él, así que la aplicación escucha el
  evento propio de la ventana.
*/
const escritorioConDisco = () => {
  window.__edimarkDisco = { '/docs/tema.md': '# Tema\n\nPrimera versión' };
  window.__EDIMARK_TAURI__ = {
    dialog: {},
    fs: {},
    app: {
      initialMarkdownPaths: async () => ['/docs/tema.md'],
      readMarkdownDocument: async path => window.__edimarkDisco[path] ?? '',
      onOpenMarkdownPaths: (callback) => { window.__abrirRutas = callback; return () => {}; },
      onNativeDrop: (callback) => { window.__soltar = callback; return () => {}; },
      droppedDocumentPaths: async paths => paths,
      readDroppedDocument: async () => new Uint8Array(),
    },
  };
};

test('un documento del sistema abierto dos veces vuelve a su pestaña', async (t) => {
  const { context, page } = await openApp({ initStorage: escritorioConDisco });
  t.after(() => context.close());

  const pestanas = () => page.locator('.tab-name').allTextContents();
  const activa = () => page.locator('.tab[aria-selected="true"] .tab-name').innerText();

  // Al arrancar se abre el documento asociado, y es el que queda delante.
  await page.waitForFunction(() => document.querySelector('.tab[aria-selected="true"] .tab-name')?.textContent === 'tema.md');
  assert.deepEqual(await pestanas(), ['tema.md']);

  // Abrirlo otra vez no lo duplica: vuelve a su pestaña y trae lo que hay en
  // el disco, que puede haber cambiado desde fuera.
  await page.evaluate(() => {
    window.__edimarkDisco['/docs/tema.md'] = '# Tema\n\nSegunda versión';
    window.__abrirRutas(['/docs/tema.md']);
  });
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('Segunda versión'));
  assert.deepEqual(await pestanas(), ['tema.md']);
  assert.equal(await activa(), 'tema.md');
  // Y llega sin marca de cambios: es lo que hay guardado.
  assert.equal(await page.locator('.tab[aria-selected="true"] .tab-dirty').isVisible(), false);

  // Soltarlo sobre la ventana hace lo mismo, por el evento nativo.
  await page.evaluate(() => window.__soltar({ type: 'drop', paths: ['/docs/tema.md'] }));
  await page.waitForTimeout(300);
  assert.deepEqual(await pestanas(), ['tema.md']);

  // Y un documento distinto sí abre su pestaña.
  await page.evaluate(() => {
    window.__edimarkDisco['/docs/otro.md'] = '# Otro';
    window.__soltar({ type: 'drop', paths: ['/docs/otro.md'] });
  });
  await page.waitForFunction(() => document.querySelectorAll('.tab-name').length === 2);
  assert.equal(await activa(), 'otro.md');
});

/*
  El manual se pide por red y tarda. Si mientras tanto llega un documento del
  sistema, el manual no puede ponerse delante: el archivo que el usuario acaba
  de abrir se quedaría en su pestaña y el foco saltaría a la primera.
*/
test('el manual que llega tarde no le quita el sitio al documento abierto', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__edimarkDisco = { '/docs/tema.md': '# Tema' };
      // El manual, con retraso: es lo que provoca la carrera.
      const original = window.fetch;
      window.fetch = (input, init) => {
        const url = String(typeof input === 'string' ? input : input?.url || '');
        if (/manual[^/]*\.md/.test(url)) {
          return new Promise(resolve => setTimeout(() => resolve(original(input, init)), 600));
        }
        return original(input, init);
      };
      window.__EDIMARK_TAURI__ = {
        dialog: {},
        fs: {},
        app: {
          initialMarkdownPaths: async () => [],
          readMarkdownDocument: async path => window.__edimarkDisco[path] ?? '',
          onOpenMarkdownPaths: (callback) => { window.__abrirRutas = callback; return () => {}; },
          onNativeDrop: () => () => {},
          droppedDocumentPaths: async paths => paths,
          readDroppedDocument: async () => new Uint8Array(),
        },
      };
    },
  });
  t.after(() => context.close());

  // En cuanto la aplicación escucha, llega el documento: el manual sigue en el aire.
  await page.waitForFunction(() => typeof window.__abrirRutas === 'function');
  await page.evaluate(() => window.__abrirRutas(['/docs/tema.md']));
  await page.waitForFunction(() => document.querySelectorAll('.tab-name').length === 2);

  // El manual acaba de llegar y se queda en su pestaña, sin robar el foco.
  const nombres = await page.locator('.tab-name').allTextContents();
  assert.ok(nombres.includes('Manual'), `faltó el manual: ${nombres}`);
  assert.equal(await page.locator('.tab[aria-selected="true"] .tab-name').innerText(), 'tema.md');
});

test('una lista local dañada no impide arrancar y conserva una copia', async (t) => {
  const { context, page } = await openApp({
    locale: 'en-US',
    initStorage: () => {
      try {
        localStorage.setItem('edimarkweb-docslist', '{broken');
      } catch (_error) {
        // The script also runs for the initial opaque document.
      }
    },
  });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await page.locator('.tab-name').first().textContent(), 'Manual');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('edimarkweb-docslist-corrupt-backup')),
    '{broken'
  );
  await page.locator('#status-toast-message').getByText('The saved document list was damaged.').waitFor();
});

test('pestañas, sincronización y búsqueda funcionan juntas', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  assert.equal(await page.locator('.tab').count(), 2);

  const markdown = page.locator('#markdown-input');
  await markdown.fill('# Prueba\n\nÁrbol y arbol');
  await page.locator('#html-output h1').getByText('Prueba', { exact: true }).waitFor();

  await page.locator('#open-search-btn').click();
  await page.locator('#search-input').fill('arbol');
  await page.locator('#search-matches-info').getByText('1 / 2', { exact: true }).waitFor();

  await page.evaluate(() => {
    const preview = document.getElementById('html-output');
    preview.focus();
    preview.innerHTML = '<h1>Cambio HTML</h1>';
    preview.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('# Cambio HTML'));
});

/*
  El cuadro de búsqueda roba el foco al abrirse, así que el editor sobre el que
  hay que buscar es el que lo tenía justo antes, no el que lo tiene al buscar.
*/
test('en diseño dual se busca en el panel que se estaba editando', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('# Solo en Markdown\n');
  await page.locator('#html-output h1').getByText('Solo en Markdown', { exact: true }).waitFor();

  // El panel derecho pasa a mostrar el código HTML y se edita allí. El botón que
  // lo alterna es suyo, así que hay que estar en ese panel para llegar a él.
  await page.locator('#html-output').click();
  await page.locator('#view-toggle-btn').click();
  await page.waitForFunction(() => htmlEditor.getValue().includes('<h1'));
  await page.evaluate(() => htmlEditor.focus());

  // `<h1` solo existe en el panel HTML: si la búsqueda cayera en el Markdown,
  // no habría ninguna coincidencia.
  await page.locator('#open-search-btn').click();
  await page.locator('#search-input').fill('<h1');
  await page.locator('#search-matches-info').getByText('1 / 1', { exact: true }).waitFor();
});

test('cerrar la búsqueda devuelve el foco al editor', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('texto cualquiera');
  await page.evaluate(() => markdownEditor.focus());

  await page.locator('#open-search-btn').click();
  await page.locator('#search-input').fill('texto');
  await page.locator('#search-matches-info').getByText('1 / 1', { exact: true }).waitFor();
  await page.locator('#close-search-btn').click();

  assert.ok(
    await page.evaluate(() => markdownEditor.hasFocus()),
    'el foco no volvió al editor al cerrar la búsqueda',
  );
});

/*
  El repintado de la vista previa está limitado en frecuencia, y ese mismo
  repintado es lo que vuelca el Markdown al editor HTML: la escritura seguida no
  puede dejar ningún panel con contenido viejo.
*/
/*
  Una imagen copiada de una página web llega publicada a la vez en `files` y
  como item del portapapeles, y `getAsFile()` devuelve un objeto nuevo cada
  vez: se colaban como dos imágenes distintas y se pegaban por duplicado. El
  portapapeles hay que prepararlo desde la propia página, así que hace falta el
  permiso de escritura, que solo se concede en Chromium.
*/
test('una imagen copiada de la web se pega una sola vez', {
  skip: process.env.BROWSER === 'firefox'
    ? 'preparar un portapapeles con imagen solo funciona en Chromium'
    : false,
}, async (t) => {
  const { context, page } = await openApp({ permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.evaluate(async (pixel) => {
    const bytes = Uint8Array.from(atob(pixel), caracter => caracter.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({
      'image/png': new Blob([bytes], { type: 'image/png' }),
      'text/html': new Blob(['<img src="https://ejemplo.test/foto.png" alt="foto">'], { type: 'text/html' }),
    })]);
  }, PNG_PIXEL.toString('base64'));

  await page.locator('#markdown-input').click();
  await page.keyboard.press('Control+V');
  await page.locator('#html-output img').first().waitFor();

  assert.equal(await page.locator('#html-output img').count(), 1);
  const markdown = await page.locator('#markdown-input').inputValue();
  assert.equal(markdown.match(/!\[/g)?.length ?? 0, 1, `Markdown obtenido: ${markdown.slice(0, 200)}`);
});

test('escribir sin pausas mantiene los dos paneles al día', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').click();
  await page.keyboard.type('# Escritura seguida', { delay: 15 });

  await page.locator('#html-output h1').getByText('Escritura seguida', { exact: true }).waitFor();
  await page.waitForFunction(() => htmlEditor.getValue().includes('Escritura seguida'));
});

/*
  La analítica es JSONP: la respuesta del servidor es código que se ejecuta. Se
  carga dentro de un iframe con sandbox y sin allow-same-origin para que ese
  código no alcance la página ni, con ella, los documentos del usuario.

  La analítica está desactivada en localhost, así que la prueba sirve la
  aplicación desde un host inventado; todo se resuelve contra el servidor local.
*/
test('el JSONP de analítica no alcanza la página que lo carga', {
  skip: Boolean(process.env.EDIMARK_STATIC_ROOT),
}, async (t) => {
  const context = await browser.newContext();
  t.after(() => context.close());

  const host = 'https://edimarkweb.test';
  await context.route(`${host}/**`, async (route) => {
    const ruta = new URL(route.request().url()).pathname;
    const respuesta = await route.fetch({ url: `${appUrl.replace('/index.html', '')}${ruta}` });
    await route.fulfill({ response: respuesta });
  });
  await context.route(/pandoc\.b64(?:\.gz)?(?:\?.*)?$/, route => (
    route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  ));
  await context.route(/\/imagenes\//, route => route.abort());

  // El JSONP intenta escribir en el almacenamiento de la página antes de
  // contestar: si el aislamiento funciona, lanza y no llega a hacerlo.
  await context.route(/track\.php/, route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'try{parent.localStorage.setItem("colado","1");}catch(e){}'
      + 'window.__edimarkAnalytics({"ok":true});',
  }));

  const page = await context.newPage();
  await page.goto(`${host}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();

  // La visita se apunta desde la página, con lo que devuelve el iframe.
  await page.waitForFunction(
    () => localStorage.getItem('analytics:last-visit:edimarkweb') !== null,
    null,
    { timeout: 15000 },
  );

  assert.equal(
    await page.evaluate(() => localStorage.getItem('colado')),
    null,
    'el código de la analítica llegó al almacenamiento de la página',
  );
});

test('los controles base64 y de pegado se traducen', async (t) => {
  const { context, page } = await openApp({ locale: 'en-US' });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await page.locator('#paste-btn').getAttribute('title'), 'Paste from clipboard (Ctrl+Alt+V)');
  await page.locator('#new-tab-btn').click();
  await page.evaluate(() => markdownEditor.setValue('![Demo](data:image/png;base64,iVBORw0KGgo=)'));
  await page.locator('.base64-hidden-title').getByText('Hidden base64 images', { exact: true }).waitFor();
  // La lista viene plegada para no comerle sitio al editor.
  await page.locator('#base64-hidden-toggle').click();
  await page.locator('.base64-hidden-btn').getByText('View code', { exact: true }).click();
  assert.equal(await page.locator('#base64-modal-title').textContent(), 'Image code');
  assert.equal(await page.locator('#copy-base64-code-btn').textContent(), 'Copy code');
  assert.equal(await page.locator('#close-base64-modal-btn').textContent(), 'Close');
  assert.equal(await page.locator('#base64-modal-text').getAttribute('aria-label'), 'Image base64 code');
});

test('los id de encabezado conservan palabras, guiones y dígitos', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.evaluate(() => markdownEditor.setValue('# Mi Título Principal 2\n'));
  await page.locator('#html-output h1').getByText('Mi Título Principal 2', { exact: true }).waitFor();
  assert.equal(await page.locator('#html-output h1').getAttribute('id'), 'mi-título-principal-2');
});

test('un nombre de documento con marcado no se interpreta como HTML', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const hostileName = '<img src=x onerror="window.__injected = true">.md';
  await page.evaluate(name => newDoc(name, 'contenido'), hostileName);

  assert.equal(await page.locator('.tab-name').last().textContent(), hostileName);
  assert.equal(await page.locator('.tab img').count(), 0);
  assert.equal(await page.evaluate(() => window.__injected === true), false);
});

test('el texto alternativo se lee del Markdown que rodea al marcador base64', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.evaluate(() => markdownEditor.setValue('![Mi imagen](data:image/png;base64,iVBORw0KGgo=)'));
  const alt = await page.evaluate(() => {
    const [placeholder] = currentBase64State.placeholders.keys();
    return findPlaceholderContext(placeholder)?.alt;
  });
  assert.equal(alt, 'Mi imagen');
});

test('reemplazar una coincidencia avanza a la siguiente', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('gato gato');

  await page.locator('#open-search-btn').click();
  await page.locator('#toggle-replace-btn').click();
  await page.locator('#search-input').fill('gato');
  await page.locator('#replace-input').fill('gatos');
  await page.locator('#search-matches-info').getByText('1 / 2', { exact: true }).waitFor();

  // El reemplazo vuelve a casar con la búsqueda: sin reanudar por detrás del
  // texto insertado, el botón se quedaría siempre en la primera coincidencia.
  await page.locator('#replace-one-btn').click();
  await page.locator('#search-matches-info').getByText('2 / 2', { exact: true }).waitFor();
  assert.equal(await page.locator('#markdown-input').inputValue(), 'gatos gato');
});

test('avisa cuando el navegador bloquea la ventana independiente', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const dialogs = [];
  page.on('dialog', dialog => {
    dialogs.push(dialog.message());
    dialog.dismiss();
  });

  await page.evaluate(() => {
    window.open = () => null;
    document.getElementById('desktop-window-btn').click();
  });
  await page.waitForFunction(() => true);

  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0], /ventanas emergentes/);
});

/*
  Fórmulas en la vista previa. Son KaTeX en el navegador, no pasan por Pandoc,
  así que necesitan su propia comprobación: que se rendericen sin errores y que
  la vuelta a Markdown conserve el delimitador con el que se escribieron.
*/
test('el manual renderiza sus fórmulas con KaTeX', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#html-output .katex').first().waitFor();
  const render = await page.evaluate(() => {
    // El manual cita `$...$` dentro de código en línea, y KaTeX no toca los
    // <code>: ese texto literal no cuenta como fórmula sin renderizar.
    const copia = document.getElementById('html-output').cloneNode(true);
    copia.querySelectorAll('code, pre').forEach(node => node.remove());
    const texto = copia.textContent;
    return {
      bloque: document.querySelectorAll('#html-output .katex-display').length,
      linea: [...document.querySelectorAll('#html-output span.katex')]
        .filter(node => !node.closest('.katex-display')).length,
      errores: document.querySelectorAll('#html-output .katex-error').length,
      dolaresSueltos: /\$[^$\n]+\$/.test(texto),
      barrasSueltas: /\\[([][^)\]]*\\[)\]]/.test(texto),
    };
  });
  assert.equal(render.errores, 0, 'KaTeX marcó alguna fórmula como errónea');
  assert.ok(render.linea >= 8, `faltan fórmulas en línea: ${JSON.stringify(render)}`);
  assert.ok(render.bloque >= 5, `faltan fórmulas de bloque: ${JSON.stringify(render)}`);
  assert.equal(render.dolaresSueltos, false, 'quedó texto $...$ sin renderizar');
  // Los delimitadores con barra no deben quedarse como texto plano.
  assert.equal(render.barrasSueltas, false, 'quedó texto \\(...\\) sin renderizar');
});

test('los cuatro delimitadores se renderizan y sobreviven a la vuelta a Markdown', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const source = [
    'En línea con dólar $a^2+b^2=c^2$ y con barra \\(E = mc^2\\).',
    '',
    '$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$',
    '',
    '\\[\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\]',
    '',
  ].join('\n');

  await page.locator('#new-tab-btn').click();
  await page.evaluate(md => markdownEditor.setValue(md), source);
  await page.locator('#html-output .katex').first().waitFor();

  const render = await page.evaluate(() => ({
    bloque: document.querySelectorAll('#html-output .katex-display').length,
    linea: [...document.querySelectorAll('#html-output span.katex')]
      .filter(node => !node.closest('.katex-display')).length,
    errores: document.querySelectorAll('#html-output .katex-error').length,
  }));
  assert.equal(render.errores, 0, 'KaTeX marcó alguna fórmula como errónea');
  assert.equal(render.linea, 2, `fórmulas en línea: ${JSON.stringify(render)}`);
  assert.equal(render.bloque, 2, `fórmulas de bloque: ${JSON.stringify(render)}`);

  const vuelta = await page.evaluate(() => {
    document.getElementById('html-output').focus();
    forceMarkdownUpdate = true;
    updateMarkdown();
    return markdownEditor.getValue();
  });
  for (const fragmento of ['$a^2+b^2=c^2$', '\\(E = mc^2\\)', '$$\\int_0^1', '\\[\\sum_']) {
    assert.ok(vuelta.includes(fragmento), `perdido ${fragmento} en:\n${vuelta}`);
  }
});

/*
  Dentro del WASM no hay red ni sistema de archivos: una ruta relativa se pierde
  igual que una URL remota. El exportador tiene que descargarla antes, cosa que
  aquí se comprueba contando las peticiones (la vista previa hace la primera).
*/
test('la exportación descarga las imágenes de rutas relativas', async (t) => {
  const context = await browser.newContext({ locale: 'es-ES' });
  t.after(() => context.close());
  await context.route(/pandoc\.b64(?:\.gz)?(?:\?.*)?$/, route => (
    route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  ));

  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  let peticiones = 0;
  await context.route(/imagen-relativa\.gif$/, (route) => {
    peticiones += 1;
    return route.fulfill({ status: 200, contentType: 'image/gif', body: gif });
  });

  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  await page.locator('#new-tab-btn').click();

  const markdown = '# Con imagen\n\n![Diagrama](imagen-relativa.gif)\n';
  await page.evaluate(md => markdownEditor.setValue(md), markdown);
  await page.locator('#html-output img').waitFor();
  assert.equal(peticiones, 1, 'la vista previa debería haber pedido la imagen una vez');

  // La exportación falla después (pandoc.b64 está vacío en las pruebas), pero
  // la descarga de imágenes ocurre antes de cargar el WASM.
  await page.evaluate(md => window.PandocExporter
    .exportDocument({ format: 'docx', markdown: md })
    .catch(() => {}), markdown);

  assert.equal(peticiones, 2, 'el exportador no descargó la imagen relativa');
});

/*
  El manual existe en los cinco idiomas de la interfaz y las fórmulas son las
  mismas en todos: un fallo de copia en uno solo pasaría inadvertido si solo se
  comprobara el castellano.
*/
for (const [locale, lang] of [['es-ES', 'es'], ['en-US', 'en'], ['ca-ES', 'ca'], ['gl-ES', 'gl'], ['eu-ES', 'eu']]) {
  test(`el manual en ${lang} renderiza todas sus fórmulas`, async (t) => {
    const { context, page } = await openApp({ locale });
    t.after(() => context.close());

    await page.waitForFunction(esperado => document.documentElement.lang === esperado, lang);
    await page.locator('#html-output .katex').first().waitFor();
    const render = await page.evaluate(() => {
      const copia = document.getElementById('html-output').cloneNode(true);
      copia.querySelectorAll('code, pre').forEach(node => node.remove());
      const texto = copia.textContent;
      return {
        bloque: document.querySelectorAll('#html-output .katex-display').length,
        linea: [...document.querySelectorAll('#html-output span.katex')]
          .filter(node => !node.closest('.katex-display')).length,
        errores: document.querySelectorAll('#html-output .katex-error').length,
        sinRenderizar: /\$[^$\n]+\$/.test(texto) || /\\[([][^)\]]*\\[)\]]/.test(texto),
      };
    });
    assert.equal(render.errores, 0, `${lang}: KaTeX marcó alguna fórmula como errónea`);
    assert.equal(render.sinRenderizar, false, `${lang}: quedó una fórmula sin renderizar`);
    assert.ok(render.linea >= 8, `${lang}: faltan fórmulas en línea (${render.linea})`);
    assert.ok(render.bloque >= 5, `${lang}: faltan fórmulas de bloque (${render.bloque})`);
  });
}

test('Acerca de muestra la versión de package.json en cada idioma', async (t) => {
  const packageVersion = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8')).version;
  const { context, page } = await openApp({ locale: 'en-US' });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.locator('#help-menu-btn').click();
  await page.locator('#about-btn').click();
  await page.locator('#about-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-app-version]').textContent(), packageVersion);
  assert.equal(await page.locator('#about-web-link').innerText(), 'Open the web version');
  assert.equal(await page.locator('#about-desktop-link').innerText(), 'Download the desktop version');
});

test('una coincidencia vacía no se come un carácter al reemplazar', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('abc');

  await page.locator('#open-search-btn').click();
  await page.locator('#search-regex-toggle-btn').click();
  await page.locator('#toggle-replace-btn').click();
  await page.locator('#search-input').fill('x*');
  await page.locator('#replace-input').fill('-');
  await page.locator('#search-matches-info').getByText('1 / 4', { exact: true }).waitFor();

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#replace-all-btn').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value !== 'abc');

  // Las letras siguen ahí: solo se inserta en los huecos vacíos.
  assert.equal(await page.locator('#markdown-input').inputValue(), '-a-b-c-');
});

test('el manual sigue recargándose al cambiar de idioma tras renombrar su pestaña', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'es');
  await page.locator('#html-output h1').getByText('Manual de EdiMarkWeb', { exact: true }).waitFor();

  await page.evaluate(() => {
    const doc = docs.find(d => d.isManual);
    doc.name = 'Mis apuntes';
    document.querySelector(`.tab[data-id="${doc.id}"] .tab-name`).textContent = doc.name;
  });

  await page.evaluate(() => {
    const select = document.getElementById('language-select');
    select.value = 'en';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#html-output h1').getByText('EdiMarkWeb manual', { exact: true }).waitFor();
});

test('el autoguardado no reescribe un documento que no ha cambiado', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('contenido estable');

  // Se cuentan las escrituras del autoguardado durante dos ciclos completos.
  await page.evaluate(() => {
    window.__escrituras = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (clave, valor) {
      if (String(clave).startsWith('edimarkweb-autosave')) window.__escrituras += 1;
      return original.call(this, clave, valor);
    };
  });
  await page.waitForTimeout(7000);

  // Una escritura inicial es legítima; a partir de ahí, silencio.
  assert.ok(
    await page.evaluate(() => window.__escrituras <= 1),
    `el autoguardado escribió ${await page.evaluate(() => window.__escrituras)} veces sin cambios`,
  );

  // Y al cambiar el texto vuelve a guardar.
  await page.locator('#markdown-input').fill('contenido nuevo');
  await page.waitForFunction(() => window.__escrituras >= 2, null, { timeout: 8000 });
});

/*
  El temporizador solo guarda la pestaña activa, así que lo escrito entre el
  último tic y el cambio de pestaña solo llega al almacenamiento si switchTo lo
  vuelca. Los dos casos desactivan el temporizador antes de escribir: si no, la
  prueba pasaría igual sin el volcado, guardado por el tic siguiente.
*/
const detenerTemporizadores = page => page.evaluate(() => {
  const ultimo = setTimeout(() => {}, 0);
  for (let id = 0; id <= Number(ultimo); id += 1) clearInterval(id);
});

const autoguardados = page => page.evaluate(() => Object.keys(localStorage)
  .filter(clave => clave.startsWith('edimarkweb-autosave'))
  .map(clave => localStorage.getItem(clave)));

test('cambiar de pestaña guarda lo escrito en la que se abandona', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await detenerTemporizadores(page);
  await page.locator('#markdown-input').fill('texto de la pestaña abandonada');

  await page.locator('#new-tab-btn').click();

  assert.ok(
    (await autoguardados(page)).includes('texto de la pestaña abandonada'),
    'el documento anterior no se guardó al cambiar de pestaña',
  );
});

test('ocultar la página guarda el documento abierto', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await detenerTemporizadores(page);
  await page.locator('#markdown-input').fill('texto sin guardar al cerrar');

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  assert.ok(
    (await autoguardados(page)).includes('texto sin guardar al cerrar'),
    'el documento abierto no se guardó al ocultarse la página',
  );
});

/*
  Buscar y reemplazar conviviendo con el plegado de imágenes base64: el editor
  maneja a la vez el texto visible (con el marcador) y el expandido, y el
  reemplazo tiene que caer en el visible sin tocar la imagen.
*/
test('buscar y reemplazar acierta con una imagen base64 plegada delante', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const imagen = `![img](data:image/png;base64,${'A'.repeat(400)})`;
  await page.evaluate(md => markdownEditor.setValue(md), `${imagen}\n\nhola mundo\n`);
  // El panel avisa de la imagen plegada; la lista en sí viene recogida.
  await page.locator('#base64-hidden-container').waitFor({ state: 'visible' });

  await page.locator('#open-search-btn').click();
  await page.locator('#search-regex-toggle-btn').click();
  await page.locator('#toggle-replace-btn').click();
  await page.locator('#search-input').fill('(mundo)');
  await page.locator('#replace-input').fill('[$1]');
  await page.locator('#search-matches-info').getByText('1 / 1', { exact: true }).waitFor();
  await page.locator('#replace-one-btn').click();

  await page.waitForFunction(() => markdownEditor.getValue().includes('hola [mundo]'));
  // La imagen tiene que seguir entera tras el reemplazo.
  assert.match(await page.evaluate(() => markdownEditor.getValue()), /!\[img\]\(data:image\/png;base64,A{400}\)/);
});

/*
  Presupuesto de imágenes incrustadas. Pandoc paga cada imagen muy caro dentro
  del WASM —un GIF de 3 MB tarda unos 40 s en llegar al ODT— así que exportar el
  manual, con 25 MB de GIF, dejaba el navegador colgado. Por encima del
  presupuesto la imagen se omite y queda su texto alternativo.
*/
async function exportarConImagen(t, { bytes, nombre }) {
  const context = await browser.newContext({ locale: 'es-ES' });
  t.after(() => context.close());
  await context.route(/pandoc\.b64(?:\.gz)?(?:\?.*)?$/, route => (
    route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  ));
  const cuerpo = Buffer.alloc(bytes, 0x41);
  await context.route(new RegExp(`${nombre}$`), route => route.fulfill({
    status: 200,
    contentType: 'image/gif',
    headers: { 'content-length': String(cuerpo.length) },
    body: cuerpo,
  }));

  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();

  // La exportación falla luego (pandoc.b64 está vacío), pero las imágenes se
  // resuelven antes de cargar el módulo.
  return page.evaluate(async (archivo) => {
    const avisos = [];
    await window.PandocExporter.exportDocument({
      format: 'odt',
      markdown: `# T\n\n![Diagrama](${archivo})\n`,
      onNotification: mensaje => avisos.push(mensaje),
    }).catch(() => {});
    return avisos;
  }, nombre);
}

test('una imagen enorme se omite en vez de colgar la exportación', async (t) => {
  const avisos = await exportarConImagen(t, { bytes: 3 * 1024 * 1024, nombre: 'gigante.gif' });
  assert.equal(avisos.length, 1, `avisos inesperados: ${JSON.stringify(avisos)}`);
  assert.match(avisos[0], /demasiado grandes/);
});

test('una imagen normal se incrusta sin avisar de nada', async (t) => {
  const avisos = await exportarConImagen(t, { bytes: 64 * 1024, nombre: 'pequena.gif' });
  assert.deepEqual(avisos, [], 'una imagen dentro del presupuesto no debe avisar');
});


/*
  Importar puede tardar bastante -la primera vez hay que cargar el modulo de
  Pandoc- y antes no se decia nada: el indicador de estado se crea dentro de
  window.onload, asi que la importacion, que es de nivel superior, comprobaba si
  existia, concluia que no y trabajaba en silencio.
*/
test('importar un archivo dice qué archivo y en qué paso va', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const toast = page.locator('#status-toast-message');
  await page.locator('#import-file-input').setInputFiles({
    name: 'apuntes de clase.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('PK contenido que no llega a convertirse'),
  });

  await toast.getByText('apuntes de clase.docx', { exact: false }).waitFor();
  // El paso concreto se añade al nombre, no lo sustituye.
  await page.waitForFunction(() => {
    const texto = document.getElementById('status-toast-message').textContent;
    return texto.includes('apuntes de clase.docx') && texto.includes('Pandoc');
  });
});

test('importar varios archivos indica por cuál va y resume al final', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const archivo = nombre => ({
    name: nombre,
    mimeType: 'application/vnd.oasis.opendocument.text',
    buffer: Buffer.from('PK contenido que no llega a convertirse'),
  });
  const toast = page.locator('#status-toast-message');
  await page.locator('#import-file-input').setInputFiles([archivo('uno.odt'), archivo('dos.odt')]);

  await toast.getByText('1 de 2', { exact: false }).waitFor();
  await toast.getByText('2 de 2', { exact: false }).waitFor();
  // Ninguno se convierte (pandoc.b64 está vacío en las pruebas), así que el
  // resumen tiene que reflejar el fracaso en vez de dar por buena la tanda.
  await toast.getByText('0 de 2 archivos importados.', { exact: true }).waitFor();
});

/*
  Ctrl+O se anunciaba en el menú y en el manual, pero no estaba conectado: la
  combinación se la quedaba el navegador. Ctrl+Mayús+O comparte letra con la
  lista numerada, así que la prueba vigila también que no se disparen las dos.
*/
test('Ctrl+O abre el selector de archivos sin pisar Ctrl+Mayús+O', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  /*
    El manual llega a la primera pestaña después de que la aplicación se
    declare lista, y pulsar mientras tanto perdía la tecla: la prueba se caía
    de tarde en tarde esperando el selector de archivos.
  */
  await page.waitForFunction(() => document.getElementById('markdown-input').value.length > 0);
  const selector = page.waitForEvent('filechooser');
  await page.keyboard.press('Control+o');
  assert.equal(await (await selector).element().getAttribute('id'), 'file-input');

  let seleccionesExtra = 0;
  page.on('filechooser', () => { seleccionesExtra += 1; });
  await page.locator('#new-tab-btn').click();
  const markdown = page.locator('#markdown-input');
  await markdown.fill('Punto');
  await markdown.selectText();
  await page.keyboard.press('Control+Shift+O');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('1. Punto'));
  assert.equal(seleccionesExtra, 0, 'Ctrl+Mayús+O no debe abrir además el selector de archivos');
});

test('los nuevos atajos abren sus acciones y los iconos explican su función', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  assert.equal(await page.locator('#doc-format-toolbar-btn').getAttribute('title'), 'Idioma, autor, índice y formato de este documento.');
  assert.equal(await page.locator('#doc-format-toolbar-btn [data-lucide="sliders-horizontal"]').count(), 1);
  assert.equal(await page.locator('#doc-lang-btn').count(), 0);
  assert.equal(await page.locator('#toggle-replace-btn').getAttribute('title'), 'Mostrar opciones de reemplazo');

  await page.keyboard.press('Control+Alt+e');
  assert.equal(await page.locator('#export-menu').isVisible(), true);
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+,');
  assert.equal(await page.locator('#settings-menu').isVisible(), true);
  await page.keyboard.press('Escape');

  assert.equal(await page.locator('#focus-mode-toggle').getAttribute('aria-pressed'), 'false');
  await page.keyboard.press('Control+Shift+f');
  assert.equal(await page.locator('#focus-mode-toggle').getAttribute('aria-pressed'), 'true');
});

test('los tres botones cambian de disposición y dicen cuál está puesta', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  assert.equal(await page.locator('#new-tab-btn').evaluate(button => button.previousElementSibling?.id), 'tab-bar');
  // Las disposiciones viven en la barra de estado, con las lupas; en la fila de
  // las pestañas se quedan los botones que gobiernan la ventana.
  assert.equal(await page.locator('#layout-switch').evaluate(group => group.closest('#status-bar')?.id), 'status-bar');
  assert.equal(await page.locator('#layout-switch').evaluate(group => group.nextElementSibling?.id), 'layout-menu-container');
  assert.equal(await page.locator('#focus-mode-toggle').evaluate(button => button.nextElementSibling?.id), 'toggle-width-btn');

  // En pantalla ancha manda el grupo de botones; el menú se queda para el móvil.
  assert.equal(await page.locator('#layout-switch').isVisible(), true);
  assert.equal(await page.locator('#layout-menu-container').isVisible(), false);

  const boton = valor => page.locator(`#layout-switch [data-layout="${valor}"]`);
  assert.equal(await boton('dual').getAttribute('aria-pressed'), 'true');

  await boton('md').click();
  // El panel que se va se encoge antes de esconderse, así que la disposición no
  // está puesta del todo hasta que desaparece.
  await page.locator('#html-panel').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#markdown-panel').isVisible(), true);
  assert.equal(await boton('md').getAttribute('aria-pressed'), 'true');
  assert.equal(await boton('dual').getAttribute('aria-pressed'), 'false');
  // El menú, aunque no se vea, dice lo mismo que los botones.
  assert.equal(await page.locator('#layout-menu [data-layout="md"]').getAttribute('aria-checked'), 'true');

  await boton('html').click();
  await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#html-panel').isVisible(), true);
  assert.equal(await boton('html').getAttribute('aria-pressed'), 'true');

  // Ctrl+L rota, y el resaltado lo sigue: es lo que hace visible el atajo.
  await page.keyboard.press('Control+l');
  assert.equal(await boton('dual').getAttribute('aria-pressed'), 'true');
  // El que vuelve crece desde cero: hasta que no tiene ancho no está a la vista.
  await page.locator('#markdown-panel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#html-panel').isVisible(), true);
});

/*
  Cambiar de disposición no es aparecer y desaparecer: el panel que llega crece
  desde cero y el que se va se encoge hasta cero. Como van en fila, el editor
  visual entra siempre por la derecha —su borde derecho no se mueve— y el
  Markdown por la izquierda.
*/
test('los paneles entran creciendo por su lado', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const bordes = () => page.evaluate(() => {
    const caja = id => {
      const el = document.getElementById(id);
      if (getComputedStyle(el).display === 'none') return null;
      const { left, right } = el.getBoundingClientRect();
      return { left: Math.round(left), right: Math.round(right) };
    };
    return { md: caja('markdown-panel'), html: caja('html-panel') };
  });

  // Un clic y una lectura en la misma vuelta: durante el cambio los dos paneles
  // están a la vista, el que se va todavía sin esconder.
  const pulsar = destino => page.evaluate((valor) => {
    document.querySelector(`#layout-switch [data-layout="${valor}"]`).click();
    const md = document.getElementById('markdown-panel');
    const html = document.getElementById('html-panel');
    return {
      mdVisible: getComputedStyle(md).display !== 'none',
      htmlVisible: getComputedStyle(html).display !== 'none',
      encogiendo: [md, html]
        .filter(panel => panel.classList.contains('panel-sliding'))
        .map(panel => panel.id),
    };
  }, destino);

  await page.locator('#layout-switch [data-layout="md"]').click();
  await page.locator('#html-panel').waitFor({ state: 'hidden' });
  const inicio = await bordes();

  // Solo Markdown → solo el editor visual: entra por la derecha.
  const entrando = await pulsar('html');
  assert.equal(entrando.mdVisible, true, 'el Markdown se escondió de golpe');
  assert.equal(entrando.htmlVisible, true, 'el editor visual no había llegado aún');
  assert.deepEqual(entrando.encogiendo.sort(), ['html-panel', 'markdown-panel']);
  await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
  const final = await bordes();
  assert.equal(final.html.right, inicio.md.right, 'el borde derecho se movió: no entró por la derecha');

  // Y de vuelta, el Markdown entra por la izquierda: su borde izquierdo se queda.
  await pulsar('md');
  await page.locator('#html-panel').waitFor({ state: 'hidden' });
  const vuelta = await bordes();
  assert.equal(vuelta.md.left, inicio.md.left, 'el borde izquierdo se movió: no entró por la izquierda');
});

test('en pantalla estrecha las disposiciones vuelven al menú', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 640, height: 900 });
  assert.equal(await page.locator('#layout-switch').isVisible(), false);
  assert.equal(await page.locator('#layout-menu-container').isVisible(), true);

  await page.locator('#layout-menu-btn').click();
  await page.locator('#layout-menu [data-layout="html"]').click();
  assert.equal(await page.locator('#markdown-panel').isVisible(), false);
  assert.equal(await page.locator('#html-panel').isVisible(), true);
  assert.equal(await page.locator('#layout-menu [data-layout="html"]').getAttribute('aria-checked'), 'true');
});

test('el selector de imagen escribe la ruta del archivo, que es lo predeterminado', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('button[data-format="image"]').click();
  await page.locator('#image-file-input').setInputFiles({
    name: 'microscopio.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  assert.equal(await page.locator('#image-file-name').textContent(), 'microscopio.png');
  assert.equal(await page.locator('input[name="image-insert-mode"][value="relative"]').isChecked(), true);
  // En el navegador no se conoce la carpeta del archivo y hay que advertirlo.
  await page.waitForSelector('#image-insert-mode-warning:not(.hidden)');
  await page.locator('#image-alt-text').fill('Microscopio');
  await page.locator('#insert-image-btn').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('microscopio.png'));
  assert.match(await page.locator('#markdown-input').inputValue(), /!\[Microscopio\]\(microscopio\.png\)/);
});

test('el selector de imagen incrusta el archivo cuando se elige dentro del documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('button[data-format="image"]').click();
  await page.locator('#image-file-input').setInputFiles({
    name: 'microscopio.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71]),
  });
  await page.locator('input[name="image-insert-mode"][value="embedded"]').check();
  await page.locator('#image-alt-text').fill('Microscopio');
  await page.locator('#insert-image-btn').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('data:image/png;base64,'));
  assert.match(await page.locator('#markdown-input').inputValue(), /!\[Microscopio\]\(data:image\/png;base64,/);
});

test('al imprimir en modo escritorio el documento no se recorta a una página', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const parrafos = Array.from({ length: 40 }, (_, i) => `## Apartado ${i + 1}\n\n${'Texto de relleno para ocupar varias páginas. '.repeat(6)}`);
  await page.locator('#markdown-input').fill(`# Documento largo\n\n${parrafos.join('\n\n')}`);
  // La ventana independiente y la aplicación de escritorio reparten el alto con
  // flex; si eso sobrevive a la impresión, solo sale la primera página.
  await page.evaluate(() => document.body.classList.add('desktop-mode'));
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);

  const medidas = await page.evaluate(() => {
    const panel = document.getElementById('html-panel');
    const salida = document.getElementById('html-output');
    return {
      altoPanel: panel.getBoundingClientRect().height,
      altoContenido: salida.scrollHeight,
      recorta: getComputedStyle(panel).overflow !== 'visible',
    };
  });

  assert.equal(medidas.recorta, false, 'el panel no debe recortar al imprimir');
  assert.ok(
    medidas.altoPanel >= medidas.altoContenido - 1,
    `el panel (${medidas.altoPanel}px) debe crecer hasta el contenido (${medidas.altoContenido}px)`,
  );
});

test('una imagen relativa que el propio sitio sirve se deja en paz', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  // `logo_100px.png` existe junto a la página: el navegador la carga solo y no
  // hay que avisar de nada ni sustituir su ruta.
  await page.locator('#markdown-input').fill('![Logotipo](logo_100px.png)');
  await page.waitForFunction(() => {
    const img = document.querySelector('#html-output img');
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
  assert.equal(await page.locator('#html-output img').getAttribute('src'), 'logo_100px.png');
  assert.equal(await page.locator('#missing-assets-notice').evaluate(el => el.classList.contains('hidden')), true);
});

test('las imágenes con ruta relativa se ven al vincular su carpeta', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('![Gráfico](imagenes/01-grafico.png)');

  // Sin carpeta vinculada no hay forma de encontrarla: se avisa y se marca.
  await page.waitForSelector('#missing-assets-notice:not(.hidden)');
  assert.equal(await page.locator('#html-output img.edimark-missing-asset').count(), 1);

  const carpeta = await crearCarpetaConImagen();
  t.after(() => rm(carpeta, { recursive: true, force: true }));
  await page.locator('#assets-folder-input').setInputFiles(carpeta);

  // El aviso desaparece en cuanto la imagen se encuentra.
  await page.waitForSelector('#missing-assets-notice.hidden', { state: 'attached' });
  const src = await page.locator('#html-output img').first().getAttribute('src');
  assert.match(src, /^blob:/);
  // El Markdown no se toca: la ruta original sigue siendo la del documento.
  assert.equal(await page.locator('#markdown-input').inputValue(), '![Gráfico](imagenes/01-grafico.png)');
});

test('las imágenes vinculadas reaparecen después de recargar la página', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const docId = await page.evaluate(() => currentId);
  await page.locator('#markdown-input').fill('![Gráfico](imagenes/01-grafico.png)');
  const carpeta = await crearCarpetaConImagen();
  t.after(() => rm(carpeta, { recursive: true, force: true }));
  await page.locator('#assets-folder-input').setInputFiles(carpeta);
  await page.waitForFunction(() => {
    const img = document.querySelector('#html-output img');
    return Boolean(img && img.getAttribute('src').startsWith('blob:'));
  });

  await page.waitForFunction(async (id) => new Promise((resolve) => {
    const request = indexedDB.open('edimarkweb-assets', 1);
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('document-assets', 'readonly');
      const count = transaction.objectStore('document-assets').index('docId').count(id);
      count.onsuccess = () => {
        database.close();
        resolve(count.result === 1);
      };
      count.onerror = () => {
        database.close();
        resolve(false);
      };
    };
  }), docId);
  await page.evaluate(() => autosaveCurrentDoc());

  await page.reload({ waitUntil: 'domcontentloaded' });
  const restoredTab = page.locator(`.tab[data-id="${docId}"]`);
  await restoredTab.waitFor();
  await restoredTab.click();
  await page.waitForFunction(() => {
    const img = document.querySelector('#html-output img');
    return Boolean(img
      && img.getAttribute('src').startsWith('blob:')
      && img.complete
      && img.naturalWidth > 0);
  });

  assert.equal(await page.locator('#markdown-input').inputValue(), '![Gráfico](imagenes/01-grafico.png)');
  assert.equal(
    await page.locator('#missing-assets-notice').evaluate(el => el.classList.contains('hidden')),
    true,
  );
});

test('lo que sale de la vista previa conserva la ruta relativa, no el blob', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('![Gráfico](imagenes/01-grafico.png)');
  const carpeta = await crearCarpetaConImagen();
  t.after(() => rm(carpeta, { recursive: true, force: true }));
  await page.locator('#assets-folder-input').setInputFiles(carpeta);
  await page.waitForFunction(() => {
    const img = document.querySelector('#html-output img');
    return Boolean(img && img.getAttribute('src').startsWith('blob:'));
  });

  const exportedHtml = await page.evaluate(() => window.buildHtmlWithTex());
  assert.match(exportedHtml, /src="imagenes\/01-grafico\.png"/);
  assert.ok(!exportedHtml.includes('blob:'), 'el HTML exportado no debe llevar blobs de esta sesión');
});

test('en web Guardar escribe el Markdown y las imágenes vinculadas en la carpeta elegida', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__webSaveCalls = [];
      const makeDirectory = (prefix = '') => ({
        getDirectoryHandle: async (name) => makeDirectory(`${prefix}${name}/`),
        getFileHandle: async (name) => ({
          createWritable: async () => ({
            write: async (contents) => {
              const value = contents instanceof Blob
                ? [...new Uint8Array(await contents.arrayBuffer())]
                : String(contents);
              window.__webSaveCalls.push(['write', `${prefix}${name}`, value]);
            },
            close: async () => {
              window.__webSaveCalls.push(['close', `${prefix}${name}`]);
            },
          }),
        }),
      });
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: async options => {
          window.__webSaveCalls.push(['picker', options.mode]);
          return makeDirectory();
        },
      });
    },
  });
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('![Gráfico](imagenes/01-grafico.png)');
  const carpeta = await crearCarpetaConImagen();
  t.after(() => rm(carpeta, { recursive: true, force: true }));
  await page.locator('#assets-folder-input').setInputFiles(carpeta);
  await page.waitForSelector('#missing-assets-notice.hidden', { state: 'attached' });

  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__webSaveCalls.filter(call => call[0] === 'close').length === 2);

  const calls = await page.evaluate(() => window.__webSaveCalls);
  assert.deepEqual(calls[0], ['picker', 'readwrite']);
  const markdownWrite = calls.find(call => call[0] === 'write' && call[1].endsWith('.md'));
  assert.equal(markdownWrite[2], '![Gráfico](imagenes/01-grafico.png)');
  const imageWrite = calls.find(call => call[0] === 'write' && call[1] === 'imagenes/01-grafico.png');
  assert.deepEqual(imageWrite[2], [...PNG_PIXEL]);
});

test('en escritorio Guardar como copia las imágenes relativas del documento original', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__desktopAssetSaveCalls = [];
      window.__EDIMARK_TAURI__ = {
        dialog: {
          open: async () => '/origen/tema.md',
          save: async () => '/destino/tema.md',
        },
        fs: {
          readTextFile: async () => '# Tema\n\n![Gráfico](imagenes/grafico.png)',
          writeTextFile: async (path, contents) => {
            window.__desktopAssetSaveCalls.push(['text', path, contents]);
          },
          mkdir: async (path, options) => {
            window.__desktopAssetSaveCalls.push(['mkdir', path, options.recursive]);
          },
          writeFile: async (path, contents) => {
            window.__desktopAssetSaveCalls.push(['bytes', path, [...contents]]);
          },
        },
        app: {
          readDocumentAsset: async path => {
            window.__desktopAssetSaveCalls.push(['read-image', path]);
            return [1, 2, 3, 4];
          },
          writeDocumentAsset: async (documentPath, relativePath, contents) => {
            window.__desktopAssetSaveCalls.push([
              'write-image', documentPath, relativePath, [...contents],
            ]);
          },
        },
      };
    },
  });
  t.after(() => context.close());

  await page.keyboard.press('Control+o');
  await page.locator('.tab-name').getByText('tema.md', { exact: true }).waitFor();
  await page.keyboard.press('Control+Shift+s');
  await page.waitForFunction(() => window.__desktopAssetSaveCalls.some(call => call[0] === 'write-image'));

  const calls = await page.evaluate(() => window.__desktopAssetSaveCalls);
  assert.ok(calls.some(call => call[0] === 'read-image' && call[1] === '/origen/imagenes/grafico.png'));
  assert.ok(calls.some(call => call[0] === 'write-image'
    && call[1] === '/destino/tema.md'
    && call[2] === 'imagenes/grafico.png'
    && JSON.stringify(call[3]) === '[1,2,3,4]'));
});

test('pegar detecta imágenes publicadas solo en clipboardData.items', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').focus();
  await page.evaluate(() => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'clipboard.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: () => '',
        files: [],
        items: [{ kind: 'file', getAsFile: () => file }],
        types: ['image/png'],
      },
    });
    document.getElementById('markdown-input').dispatchEvent(event);
  });
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('data:image/png;base64,'));
  assert.match(await page.locator('#markdown-input').inputValue(), /clipboard\.png/);
});

test('Guardar como siempre pide una ruta nueva y la convierte en la ruta activa', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__platformTestCalls = [];
      window.__EDIMARK_TAURI__ = {
        dialog: {
          open: async () => '/tmp/original.md',
          save: async (options) => {
            window.__platformTestCalls.push(['dialog.save', options.defaultPath]);
            return '/tmp/copia.md';
          },
        },
        fs: {
          readTextFile: async () => '# Original',
          writeTextFile: async (path, content) => {
            window.__platformTestCalls.push(['write', path, content]);
          },
          writeFile: async () => {},
        },
      };
    },
  });
  t.after(() => context.close());

  await page.keyboard.press('Control+o');
  await page.locator('.tab-name').getByText('original.md', { exact: true }).waitFor();
  await page.locator('#markdown-input').fill('# Primera versión');
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__platformTestCalls.some(call => call[0] === 'write'));

  await page.locator('#markdown-input').fill('# Copia nueva');
  await page.keyboard.press('Control+Shift+s');
  await page.waitForFunction(() => window.__platformTestCalls.some(call => call[0] === 'dialog.save'));
  const calls = await page.evaluate(() => window.__platformTestCalls);
  assert.deepEqual(calls[0], ['write', '/tmp/original.md', '# Primera versión']);
  // El nombre propuesto cuelga de la última carpeta usada en la sesión, que es
  // la del documento abierto: así no hay que volver a navegar hasta ella.
  assert.deepEqual(calls[1], ['dialog.save', '/tmp/original.md']);
  assert.deepEqual(calls[2], ['write', '/tmp/copia.md', '# Copia nueva']);
  assert.equal(await page.locator('.tab-name').getByText('copia', { exact: true }).count(), 1);
});

/*
  Al soltar una carpeta, dataTransfer.files solo trae una entrada por directorio
  que no supera el filtro de extensiones: sin recorrer las entradas, la carpeta
  se rechazaba con el aviso de formato no admitido.
*/
test('soltar una carpeta abre los archivos que contiene', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.evaluate(() => {
    const archivo = new File(['# Desde la carpeta'], 'apuntes.md', { type: 'text/markdown' });
    const entradaArchivo = { isFile: true, isDirectory: false, file: (cb) => cb(archivo) };
    let entregado = false;
    const entradaCarpeta = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (cb) => {
          if (entregado) { cb([]); return; }
          entregado = true;
          cb([entradaArchivo]);
        },
      }),
    };
    const evento = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'dataTransfer', {
      value: { items: [{ webkitGetAsEntry: () => entradaCarpeta }], files: [], types: ['Files'] },
    });
    document.dispatchEvent(evento);
  });

  await page.locator('.tab-name').getByText('apuntes.md', { exact: true }).waitFor();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('# Desde la carpeta'));
});

/*
  Los ajustes solo sirven si sobreviven a la sesión: se guardan en el
  almacenamiento local y el exportador los recoge de window.
*/
test('los ajustes del documento se guardan y se recuperan al volver', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  // Las opciones van por pestañas: cada campo vive en la suya.
  await page.locator('#doc-settings-tab-latex').click();
  await page.locator('#latex-documentclass').selectOption('report');
  await page.locator('#latex-classoption').fill('12pt, a4paper');
  await page.locator('#latex-preamble').fill('\\usepackage{amsthm}');
  await page.locator('#latex-settings-save-btn').click();

  assert.deepEqual(
    await page.evaluate(() => window.__edimarkLatexSettings),
    {
      documentLanguage: 'auto',
      documentAuthor: '',
      documentToc: false,
      documentNumberSections: false,
      epubCover: 'auto',
      epubCoverImage: '',
      epubCoverName: '',
      documentClass: 'report',
      classOptions: '12pt, a4paper',
      preamble: '\\usepackage{amsthm}',
      /*
        Sin tocar el formato del texto, quedan sin fijar todos menos los tres
        que la vista previa necesita para enseñar la verdad —cuerpo, letra e
        interlineado—, que traen valor de partida y viajan a los cinco formatos.
      */
      documentFormat: {
        align: '',
        font: 'serif',
        fontSize: '12',
        lineHeight: '1.5',
        paperSize: 'a4',
        marginTop: '',
        marginRight: '',
        marginBottom: '',
        marginLeft: '',
        indent: '',
        hyphenate: '',
      },
    }
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  await page.waitForFunction(() => window.__edimarkReady === true);
  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  // Las opciones van por pestañas: cada campo vive en la suya.
  await page.locator('#doc-settings-tab-latex').click();
  assert.equal(await page.locator('#latex-documentclass').inputValue(), 'report');
  assert.equal(await page.locator('#latex-preamble').inputValue(), '\\usepackage{amsthm}');

  // Cancelar descarta lo tecleado; restablecer solo vacía el formulario.
  await page.locator('#latex-preamble').fill('\\usepackage{tikz}');
  await page.locator('#latex-settings-cancel-btn').click();
  assert.equal(
    await page.evaluate(() => window.__edimarkLatexSettings.preamble),
    '\\usepackage{amsthm}'
  );
});

/*
  El idioma por omisión sigue al de la interfaz en cada exportación: guardarlo
  resuelto dejaría los documentos en un idioma que el usuario ya no usa.
*/
test('el idioma del documento admite un código libre y por omisión sigue a la interfaz', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  // El campo del código solo aparece al elegir «Otro…».
  await assert.doesNotReject(page.locator('#doc-language-code-field.hidden').waitFor({ state: 'attached' }));
  await page.locator('#doc-language').selectOption('other');
  await page.locator('#doc-language-code-field').waitFor({ state: 'visible' });
  await page.locator('#doc-language-code').fill('pt-BR');
  await page.locator('#latex-settings-save-btn').click();
  assert.equal(await page.evaluate(() => window.__edimarkLatexSettings.documentLanguage), 'pt-BR');

  // Al reabrir, un código no listado vuelve a presentarse como «Otro…».
  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  assert.equal(await page.locator('#doc-language').inputValue(), 'other');
  assert.equal(await page.locator('#doc-language-code').inputValue(), 'pt-BR');

  // «Otro…» sin código no significa nada y vuelve al automático.
  await page.locator('#doc-language-code').fill('   ');
  await page.locator('#latex-settings-save-btn').click();
  assert.equal(await page.evaluate(() => window.__edimarkLatexSettings.documentLanguage), 'auto');
});

/*
  Los metadatos son datos sobre el documento, no contenido. marked no los
  conoce y los pintaba como una raya horizontal y un encabezado falso con el
  texto crudo dentro.
*/
test('el bloque de metadatos no se ve en la vista previa y sobrevive a editarla', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('---\nlang: "fr"\ntitle: "Mi documento"\n---\n\n# Encabezado\n\nTexto normal.\n');
  await page.locator('#html-output h1').getByText('Encabezado', { exact: true }).waitFor();

  const preview = page.locator('#html-output');
  assert.equal((await preview.innerText()).includes('lang:'), false, 'los metadatos no deben verse');
  assert.equal(await preview.locator('hr').count(), 0, 'el --- no debe salir como raya horizontal');
  // El editor de Markdown sí los muestra: es el código fuente.
  assert.match(await page.locator('#markdown-input').inputValue(), /^---\nlang: "fr"/);

  // Editar en la vista previa devuelve Markdown sin metadatos: hay que reponerlos.
  await page.evaluate(() => {
    const output = document.getElementById('html-output');
    output.focus();
    output.querySelector('p').textContent = 'Texto editado en la vista previa.';
    output.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('editado en la vista previa'));
  const markdown = await page.locator('#markdown-input').inputValue();
  assert.match(markdown, /^---\nlang: "fr"\ntitle: "Mi documento"\n---\n/, `metadatos perdidos:\n${markdown}`);
});

/*
  El idioma de un documento concreto vive en su propio bloque de metadatos, no
  en los ajustes de la aplicación: así viaja con el archivo.
*/
test('el idioma del documento se elige desde el panel y se guarda en el archivo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('# Notas\n\nTexto.\n');
  await page.locator('#html-output h1').getByText('Notas', { exact: true }).waitFor();

  // Sin idioma propio: hereda el general.
  const boton = page.locator('#doc-format-toolbar-btn');
  assert.equal(await page.locator('#markdown-input').evaluate(editor => editor.spellcheck), true);
  assert.equal(await page.locator('#markdown-input').getAttribute('lang'), 'es');

  await boton.click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#doc-own-language').selectOption('ca');
  await page.locator('#doc-format-save-btn').click();
  assert.equal(await page.locator('#markdown-input').getAttribute('lang'), 'ca');

  // Queda escrito en el documento, y sin ensuciar la vista previa.
  assert.equal(await page.locator('#markdown-input').inputValue(), '---\nlang: "ca"\n---\n\n# Notas\n\nTexto.\n');
  assert.equal((await page.locator('#html-output').innerText()).includes('lang'), false);

  // Volver al idioma general retira la línea y el bloque, que se queda vacío.
  await boton.click();
  await page.locator('#doc-own-language').selectOption('');
  await page.locator('#doc-format-save-btn').click();
  assert.equal(await page.locator('#markdown-input').inputValue(), '# Notas\n\nTexto.\n');
  assert.equal(await page.locator('#markdown-input').getAttribute('lang'), 'es');
});

test('un documento sin idioma propio sigue al ajuste general', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('Texto suelto\n');
  assert.equal(await page.locator('#markdown-input').getAttribute('lang'), 'es');

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  await page.locator('#doc-language').selectOption('eu');
  await page.locator('#latex-settings-save-btn').click();

  assert.equal(await page.locator('#markdown-input').getAttribute('lang'), 'eu');
  // El documento sigue limpio: el idioma general no se escribe en el archivo.
  assert.equal(await page.locator('#markdown-input').inputValue(), 'Texto suelto\n');
});

test('el autor se guarda como ajuste general y por documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  await page.locator('#doc-author').fill('Juan José');
  await page.locator('#latex-settings-save-btn').click();
  assert.equal(await page.evaluate(() => window.__edimarkLatexSettings.documentAuthor), 'Juan José');

  // El autor general no se escribe en el documento: solo el propio.
  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('# Notas\n\nTexto.\n');
  await page.locator('#html-output h1').getByText('Notas', { exact: true }).waitFor();
  assert.equal(await page.locator('#markdown-input').inputValue(), '# Notas\n\nTexto.\n');

  // El autor propio se escribe desde el cuadro del documento.
  await page.locator('#doc-format-toolbar-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#doc-own-author').fill('Ana Ruiz');
  await page.locator('#doc-format-save-btn').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('author:'));
  assert.equal(await page.locator('#markdown-input').inputValue(), '---\nauthor: "Ana Ruiz"\n---\n\n# Notas\n\nTexto.\n');
  // Y sigue sin verse en la vista previa.
  assert.equal((await page.locator('#html-output').innerText()).includes('Ana Ruiz'), false);

  // Al reabrirlo el cuadro trae lo que el documento declara.
  await page.locator('#doc-format-toolbar-btn').click();
  assert.equal(await page.locator('#doc-own-author').inputValue(), 'Ana Ruiz');

  // Vaciarlo retira la línea y el bloque vacío.
  await page.locator('#doc-own-author').fill('   ');
  await page.locator('#doc-format-save-btn').click();
  await page.waitForFunction(() => !document.getElementById('markdown-input').value.includes('author:'));
  assert.equal(await page.locator('#markdown-input').inputValue(), '# Notas\n\nTexto.\n');
});

test('el índice y la numeración se recuerdan como ajuste', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  assert.equal(await page.locator('#doc-toc').isChecked(), false, 'apagados de fábrica');
  assert.equal(await page.locator('#doc-number-sections').isChecked(), false);

  await page.locator('#doc-toc').check();
  await page.locator('#doc-number-sections').check();
  await page.locator('#latex-settings-save-btn').click();
  assert.deepEqual(
    await page.evaluate(() => [window.__edimarkLatexSettings.documentToc, window.__edimarkLatexSettings.documentNumberSections]),
    [true, true],
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  await page.waitForFunction(() => window.__edimarkReady === true);
  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  assert.equal(await page.locator('#doc-toc').isChecked(), true);
  assert.equal(await page.locator('#doc-number-sections').isChecked(), true);
});

/*
  La imagen elegida se guarda en el almacenamiento del navegador, el mismo del
  autoguardado de los documentos: por eso hay un tope de tamaño.
*/
test('la portada del EPUB ofrece los tres modos y limita el peso de la imagen', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  // Las opciones van por pestañas: cada campo vive en la suya.
  await page.locator('#doc-settings-tab-epub').click();

  // De fábrica, la generada; el selector de archivo solo aparece con «una imagen mía».
  assert.equal(await page.locator('input[name="epub-cover"][value="auto"]').isChecked(), true);
  await assert.doesNotReject(page.locator('#epub-cover-picker.hidden').waitFor({ state: 'attached' }));

  await page.locator('input[name="epub-cover"][value="custom"]').check();
  await page.locator('#epub-cover-picker').waitFor({ state: 'visible' });

  // Una imagen de más de 1 MB se rechaza con un aviso y no se guarda.
  const avisos = [];
  page.on('dialog', dialog => { avisos.push(dialog.message()); dialog.accept(); });
  await page.locator('#epub-cover-input').setInputFiles({
    name: 'enorme.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 10, 1),
  });
  await page.waitForFunction(() => document.getElementById('epub-cover-name').textContent === '');
  assert.equal(avisos.length, 1, `se esperaba un aviso: ${JSON.stringify(avisos)}`);
  assert.match(avisos[0], /1 MB/);

  // Una pequeña sí entra y se recuerda tras recargar.
  await page.locator('#epub-cover-input').setInputFiles({
    name: 'portada.png', mimeType: 'image/png', buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await page.locator('#epub-cover-name').getByText('portada.png').waitFor();
  await page.locator('#latex-settings-save-btn').click();
  assert.equal(await page.evaluate(() => window.__edimarkLatexSettings.epubCover), 'custom');
  assert.match(await page.evaluate(() => window.__edimarkLatexSettings.epubCoverImage), /^data:image\/png;base64,/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  await page.waitForFunction(() => window.__edimarkReady === true);
  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  // Las opciones van por pestañas: cada campo vive en la suya.
  await page.locator('#doc-settings-tab-epub').click();
  assert.equal(await page.locator('input[name="epub-cover"][value="custom"]').isChecked(), true);
  assert.equal(await page.locator('#epub-cover-name').textContent(), 'portada.png');

  // Al volver a «sin portada», la imagen deja de ocupar espacio guardado.
  await page.locator('input[name="epub-cover"][value="none"]').check();
  await page.locator('#latex-settings-save-btn').click();
  assert.deepEqual(
    await page.evaluate(() => [window.__edimarkLatexSettings.epubCover, window.__edimarkLatexSettings.epubCoverImage]),
    ['none', ''],
  );
});

test('el aviso de escritorio reaparece con cada versión y no acumula claves', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      // Preferencias de versiones ya descartadas, que deben desaparecer.
      localStorage.setItem('edimarkweb-hide-desktop-release-2.16.0', '1');
      localStorage.setItem('edimarkweb-hide-desktop-release-2.17.0', '1');
    },
  });
  t.after(() => context.close());

  // La versión en marcha no está descartada, así que el aviso sale...
  await page.locator('#desktop-release-banner').waitFor({ state: 'visible' });
  // ...y las claves de las versiones anteriores ya no están.
  const restantes = await page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('edimarkweb-hide-desktop-release-')));
  assert.deepEqual(restantes, []);

  await page.locator('#desktop-banner-never-show').check();
  await page.reload();
  await page.locator('.tab-name').first().waitFor();
  await assert.doesNotReject(
    page.locator('#desktop-release-banner').waitFor({ state: 'hidden' }),
    'el aviso debía seguir oculto para la misma versión',
  );

  // Con una versión nueva publicada, la clave guardada pasa a ser antigua.
  await page.evaluate(() => {
    const stored = Object.keys(localStorage)
      .filter(key => key.startsWith('edimarkweb-hide-desktop-release-'));
    stored.forEach(key => localStorage.removeItem(key));
    localStorage.setItem('edimarkweb-hide-desktop-release-0.0.1', '1');
  });
  await page.reload();
  await page.locator('#desktop-release-banner').waitFor({ state: 'visible' });
  const trasLaPurga = await page.evaluate(() => Object.keys(localStorage)
    .filter(key => key.startsWith('edimarkweb-hide-desktop-release-')));
  assert.deepEqual(trasLaPurga, []);
});

/*
  El formato de un documento se guarda en su propio bloque de metadatos, no en
  este navegador: al abrir el archivo en otro sitio tiene que seguir ahí.
*/
test('el formato del documento se escribe en el archivo y se ve en la vista previa', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());
  await conLaHojaATamanoReal(page);

  await page.locator('#markdown-input').fill('# Prueba\n\nUn párrafo cualquiera.');

  // El botón Aa de la barra abre el mismo cuadro que el menú del documento.
  await page.locator('#doc-format-toolbar-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  // El formato del texto vive en su propia pestaña.
  await page.locator('#doc-format-tab-format').click();
  await page.locator('#doc-format-fields-align').selectOption('justify');
  await page.locator('#doc-format-fields-font').selectOption('serif');
  await page.locator('#doc-format-fields-fontsize').fill('13');
  await page.locator('#doc-format-fields-margin-left').fill('2,5');
  await page.locator('#doc-format-fields-hyphenate').selectOption('yes');
  await page.locator('#doc-format-save-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'hidden' });

  const markdown = await page.locator('#markdown-input').inputValue();
  assert.match(markdown, /^---\n/);
  assert.match(markdown, /align: "justify"/);
  assert.match(markdown, /fontsize: "13pt"/);
  // La coma decimal es la que se teclea en español.
  assert.match(markdown, /margin-left: "2.5cm"/);
  assert.match(markdown, /hyphenate: true/);
  assert.match(markdown, /# Prueba/);

  const styles = await page.locator('#html-output').evaluate(preview => ({
    align: preview.style.textAlign,
    size: preview.style.fontSize,
    padding: preview.style.paddingLeft,
    hyphens: preview.style.hyphens,
  }));
  // El tamaño y el margen llevan dentro la lupa de la vista previa, que vale 1
  // mientras nadie la toque: lo que se comprueba es que llegan los 13 pt.
  assert.deepEqual(styles, {
    align: 'justify',
    size: 'calc(13pt * var(--preview-zoom, 1))',
    padding: 'calc(2.5cm * var(--preview-zoom, 1))',
    hyphens: 'auto',
  });
  const tamañoUsado = await page.locator('#html-output')
    .evaluate(preview => parseFloat(getComputedStyle(preview).fontSize));
  assert.ok(
    Math.abs(tamañoUsado - (13 * 96) / 72) < 0.01,
    `13 pt deberían ser 17,33 px y la vista previa usa ${tamañoUsado}`,
  );

  // Al reabrirlo, el cuadro muestra lo que el documento declara.
  await page.locator('#doc-format-toolbar-btn').click();
  await page.locator('#doc-format-tab-format').click();
  assert.equal(await page.locator('#doc-format-fields-align').inputValue(), 'justify');
  assert.equal(await page.locator('#doc-format-fields-fontsize').inputValue(), '13');

  // Y quitarlo del documento devuelve el Markdown a lo que era.
  await page.locator('#doc-format-reset-btn').click();
  await page.locator('#doc-format-save-btn').click();
  const limpio = await page.locator('#markdown-input').inputValue();
  assert.equal(/align:|fontsize:|margin-left:|hyphenate:/.test(limpio), false);
  assert.match(limpio, /# Prueba/);
  assert.equal(await page.locator('#html-output').evaluate(preview => preview.style.textAlign), '');
});

/*
  Copiar moría con un TypeError donde no hay contexto seguro —un http:// que no
  sea localhost, o el archivo abierto a pelo—, porque ahí navigator.clipboard
  sencillamente no existe y las dos funciones de copia lo daban por hecho. El
  respaldo con execCommand ya estaba escrito; solo que nadie lo llamaba.
*/
test('copiar funciona sin navigator.clipboard', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      delete window.ClipboardItem;
    },
  });
  t.after(() => context.close());

  assert.equal(await page.evaluate(() => navigator.clipboard === undefined), true);
  await page.locator('#markdown-input').fill('# Hola\n\nUn *párrafo*.');
  await page.waitForFunction(() => document.querySelector('#html-output')?.innerHTML.includes('Hola'));

  const marca = async (selector) => {
    await page.locator(selector).click();
    // La confirmación es el icono: la marca verde solo aparece si no hubo error.
    return page.locator(`${selector} [data-lucide]`).first().getAttribute('data-lucide');
  };
  assert.equal(await marca('#copy-html-btn'), 'check');
});

/*
  La cabecera tenía todo apilado en el borde derecho y el centro desierto, con
  la carpeta de «Archivo» repitiendo el icono de su propia primera opción y dos
  circulitos idénticos —la interrogación y la i— al final. Ahora los menús se
  leen escritos junto al logotipo y a la derecha quedan las acciones del día a
  día, cada una con un icono distinto.
*/
test('la cabecera separa los menús de las acciones del documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  // Los menús, con su nombre y sin icono, junto a la marca.
  const menus = page.locator('#header-menus');
  assert.equal(await menus.locator('#actions-menu-btn').count(), 1);
  assert.equal(await menus.locator('#settings-menu-btn').count(), 1);
  assert.equal(await menus.locator('[data-lucide="folder"], [data-lucide="settings"]').count(), 0);
  assert.equal((await menus.locator('#actions-menu-btn').innerText()).trim(), 'Archivo');

  // Exportar es un menú más, entre Archivo y Configuración: son seis formatos
  // con su descripción, no una acción de un clic.
  assert.equal(await menus.locator('#export-menu-btn').count(), 1);
  assert.deepEqual(
    await menus.locator(':scope > div > button[aria-haspopup="true"]').allInnerTexts(),
    ['Archivo', 'Exportar', 'Configuración'],
  );

  // Guardar sale a la barra como icono, que es la vía rápida, y está además en
  // el menú: «Guardar como…» sin «Guardar» al lado se lee mal, y en el menú la
  // opción lleva su atajo escrito, que el icono solo enseña al pasar el ratón.
  const acciones = page.locator('#document-actions-group');
  assert.equal(await acciones.locator('#save-btn').count(), 1);
  assert.equal(await page.locator('#actions-menu #save-btn').count(), 0);
  assert.equal(await page.locator('#actions-menu #save-menu-btn').count(), 1);
  assert.equal(await page.locator('#actions-menu #save-as-btn').count(), 1);

  // Y en el orden de cualquier menú de archivo: primero lo que trae contenido,
  // después Guardar y Guardar como…
  await page.locator('#actions-menu-btn').click();
  await page.locator('#actions-menu').waitFor({ state: 'visible' });
  // El nombre vive en la primera fila; debajo va su explicación.
  assert.deepEqual(
    await page.locator('#actions-menu [role="menuitem"]:visible > span:first-child > span:not([data-shortcut])').allInnerTexts(),
    ['Abrir', 'Importar', 'Pegar LaTeX', 'Guardar', 'Guardar como…'],
  );
  assert.equal(await page.locator('#actions-menu #save-menu-btn [data-shortcut]').innerText(), 'Ctrl+S');
  await page.keyboard.press('Escape');

  // Exportar ya no es un submenú de Archivo: se abre por su cuenta.
  await page.locator('#export-menu-btn').click();
  await page.locator('#export-menu').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#actions-menu').isVisible(), false);
  await page.keyboard.press('Escape');

  // Un solo botón de ayuda para el manual y el «Acerca de».
  assert.equal(await page.locator('#help-controls-group').count(), 0);
  await page.locator('#help-menu-btn').click();
  await page.locator('#help-menu').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#help-menu #help-btn').isVisible(), true);
  assert.equal(await page.locator('#help-menu #about-btn').isVisible(), true);
  await page.keyboard.press('Escape');

  // Y el punto dice que al documento abierto le falta guardar.
  assert.equal(await page.locator('#save-dirty-dot').isVisible(), false);
  await page.locator('#markdown-input').fill('# Con cambios');
  await page.waitForFunction(() => !document.getElementById('save-dirty-dot').classList.contains('hidden'));
});

/*
  Los menús explicaban el formato con un paréntesis pegado al nombre —«DOCX
  (Microsoft Word)», «$...$ (en línea)»—, que alarga la etiqueta y obliga a
  leerla entera para distinguir una opción de otra. El nombre va solo y la
  explicación, debajo y en gris.
*/
test('cada opción de formato se explica debajo, no entre paréntesis', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const revisar = async (boton, menu, esperadas) => {
    await page.locator(boton).click();
    await page.locator(menu).waitFor({ state: 'visible' });
    const etiquetas = await page.locator(`${menu} [role="menuitem"] > span > span:not([data-shortcut]), ${menu} [role="menuitemradio"] > span > span:not([data-shortcut])`)
      .allTextContents();
    assert.deepEqual(etiquetas, esperadas, `etiquetas de ${menu}`);
    // Una descripción por opción, y ningún paréntesis en el nombre.
    const descripciones = await page.locator(`${menu} [role="menuitem"] > span:not(:first-child), ${menu} [role="menuitemradio"] > span:not(:first-child)`)
      .allTextContents();
    assert.equal(descripciones.length, esperadas.length, `descripciones de ${menu}`);
    assert.ok(descripciones.every(texto => texto.trim().length > 0), `alguna descripción vacía en ${menu}`);
    await page.keyboard.press('Escape');
  };

  await revisar('#export-menu-btn', '#export-menu', ['DOCX', 'ODT', 'EPUB', 'HTML', 'TEX', 'PDF']);
  await revisar('#formula-btn', '#formula-options', ['$...$', '$$...$$', '\\(...\\)', '\\[...\\]']);
  await revisar('#copy-html-menu-toggle', '#preview-copy-menu', ['Markdown', 'HTML', 'LaTeX', 'LaTeX completo']);
});

/*
  Copiar dejó de ser cosa de cada panel: los dos botones —el del Markdown y el
  de la previsualización— eran la misma acción con distinto formato, así que se
  funden en uno junto a Exportar, con su acorde y con un rótulo que dice qué
  copia el clic.
*/
test('un solo botón copia en los cuatro formatos', async (t) => {
  const { context, page } = await openApp({ permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(() => context.close());

  // El de cada panel ya no existe: el de la cabecera hace los cuatro formatos.
  assert.equal(await page.locator('#copy-md-btn').count(), 0);
  assert.equal(await page.locator('#document-actions-group #copy-html-btn').count(), 1);

  await page.locator('#markdown-input').fill('# Hola\n\nUn *párrafo*.');
  await page.waitForFunction(() => document.querySelector('#html-output')?.innerHTML.includes('Hola'));

  // El rótulo dice qué copia el clic. Se mira antes de copiar: la marca verde
  // de «copiado» ocupa el botón entero durante dos segundos.
  assert.equal(await page.locator('.copy-html-btn-label').innerText(), 'HTML');

  const portapapeles = () => page.evaluate(() => navigator.clipboard.readText());
  const acorde = async (tecla) => {
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await page.locator('#markdown-input').click();
    await page.keyboard.press('Control+Alt+KeyC');
    await page.keyboard.press(tecla);
    await page.waitForFunction(() => navigator.clipboard.readText().then(t => t.length > 0));
    return portapapeles();
  };

  // Lo que sale al portapapeles solo se puede leer donde hay permiso para
  // leerlo; el resto de la prueba —los rótulos, los acordes y su alineación—
  // no lo necesita y se comprueba en los dos navegadores.
  if (HAY_PORTAPAPELES) {
    assert.match(await acorde('Digit1'), /^# Hola/);
    assert.match(await acorde('Digit2'), /<h1[^>]*>Hola<\/h1>/);
  }

  // Y sigue al último formato elegido.
  await page.locator('#copy-html-menu-toggle').click();
  await page.locator('[data-copy-action="markdown"]').click();
  await page.waitForFunction(() => document.querySelector('.copy-html-btn-label')?.textContent === 'Markdown');

  // Y el menú enseña los cuatro acordes.
  await page.locator('#copy-html-menu-toggle').click();
  const atajos = await page.locator('#preview-copy-menu [data-shortcut]').allTextContents();
  assert.deepEqual(atajos, ['Ctrl+Alt+C 1', 'Ctrl+Alt+C 2', 'Ctrl+Alt+C 3', 'Ctrl+Alt+C 4']);
  // Sin la palabra «Copiar» repetida cuatro veces: la dice el encabezado, que
  // además aclara que va el documento entero y no lo que haya seleccionado.
  assert.match(await page.locator('[data-i18n-key="copy_menu_heading"]').innerText(), /todo el documento/i);
  assert.deepEqual(
    await page.locator('#preview-copy-menu [data-copy-action] > span > span:not([data-shortcut])').allTextContents(),
    ['Markdown', 'HTML', 'LaTeX', 'LaTeX completo'],
  );
  // Cada formato dice para qué sirve, y el HTML dice lo que nadie adivina:
  // que es el que se pega con formato en un procesador de textos.
  const descripciones = await page.locator('#preview-copy-menu [data-copy-action] > span:not(:first-child)').allTextContents();
  assert.equal(descripciones.length, 4);
  assert.match(descripciones[1], /procesadores y editores/i);

  // Y los atajos quedan alineados: la marca del activo no los desplaza.
  const izquierdas = await page.locator('#preview-copy-menu [data-shortcut]')
    .evaluateAll(spans => spans.map(span => Math.round(span.getBoundingClientRect().left)));
  assert.equal(new Set(izquierdas).size, 1, `los atajos no están alineados: ${izquierdas}`);
});

/*
  Una tabla más ancha que la hoja se desplaza dentro de su propia caja: si se
  saliera, arrastraría a la mesa entera y el documento acabaría moviéndose a lo
  ancho por culpa de una tabla.
*/
test('una tabla ancha se desplaza dentro de la hoja, sin mover la página', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  /*
    Con la hoja a tamaño de papel, la mesa se desplaza a lo ancho en cuanto el
    panel es más estrecho que una página: para mirar lo que hace la tabla hace
    falta una ventana donde la hoja quepa entera.
  */
  await page.setViewportSize({ width: 1400, height: 900 });
  const columnas = Array.from({ length: 12 }, (_, i) => `Columna bastante larga ${i + 1}`);
  await page.locator('#markdown-input').fill([
    '# Con tabla',
    '',
    `| ${columnas.join(' | ')} |`,
    `| ${columnas.map(() => '---').join(' | ')} |`,
    `| ${columnas.map((_, i) => `dato ${i + 1}`).join(' | ')} |`,
    '',
  ].join('\n'));
  await page.locator('#layout-switch [data-layout="html"]').click();
  // Y con la disposición ya asentada: durante el cambio los paneles todavía se
  // están repartiendo el ancho.
  await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
  await page.waitForSelector('#html-output table');
  // El ancho de la tabla depende de la tipografía: medir antes de que cargue
  // da números de otra fuente y la prueba se vuelve caprichosa.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const tabla = document.querySelector('#html-output table');
    return !!tabla && tabla.scrollWidth > tabla.clientWidth;
  });

  const medidas = await page.evaluate(() => {
    const mesa = document.getElementById('preview-desk');
    const hoja = document.getElementById('html-output');
    const tabla = hoja.querySelector('table');
    return {
      tablaSeDesplaza: tabla.scrollWidth > tabla.clientWidth,
      tablaCabeEnLaHoja: Math.round(tabla.getBoundingClientRect().width)
        <= Math.round(hoja.getBoundingClientRect().width),
      mesaQuieta: mesa.scrollWidth <= mesa.clientWidth,
    };
  });

  assert.equal(medidas.tablaSeDesplaza, true, 'la tabla debería poder desplazarse por dentro');
  assert.equal(medidas.tablaCabeEnLaHoja, true, 'la tabla no debería salirse de la hoja');
  assert.equal(medidas.mesaQuieta, true, 'la mesa no debería desplazarse a lo ancho');
});

/*
  Los cuatro delimitadores en un acorde: Ctrl+M abre la espera y la segunda
  tecla elige. Cada combinación nueva chocaba con algo —Ctrl+Mayús+J es la
  consola del navegador y Ctrl+Mayús+M, la lupa del sistema—, así que solo se
  expone una y las segundas teclas son teclas normales.
*/
test('Ctrl+M abre la espera y la segunda tecla elige el delimitador', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const editor = page.locator('#markdown-input');
  const acorde = async (segunda) => {
    await editor.fill('');
    await editor.click();
    await page.keyboard.press('Control+KeyM');
    if (segunda) await page.keyboard.press(segunda);
    return editor.inputValue();
  };

  assert.equal(await acorde('Digit1'), '$$');
  assert.equal(await acorde('Digit2'), '\n$$\n\n$$\n');
  assert.equal(await acorde('Digit3'), '\\(\\)');
  assert.equal(await acorde('Digit4'), '\n\\[\n\n\\]\n');
  // El caso común, en dos pulsaciones y sin mirar la ayuda.
  assert.equal(await acorde('Enter'), '$$');
  assert.equal(await acorde('KeyM'), '$$');
  // Escape cancela sin escribir; cualquier otra tecla cancela y se escribe.
  assert.equal(await acorde('Escape'), '');
  assert.equal(await acorde('KeyA'), 'a');

  // Mientras espera, la barra de estado dice qué teclas valen.
  await editor.click();
  await page.keyboard.press('Control+KeyM');
  assert.match(await page.locator('#status-toast-message').textContent(), /1 \$…\$/);
  await page.keyboard.press('Digit1');
  assert.equal(await page.locator('#status-toast-message').textContent(), '');

  // Y el menú enseña el acorde, para aprenderlo sin abrir el manual.
  await page.locator('#formula-btn').click();
  await page.locator('#formula-options').waitFor({ state: 'visible' });
  const atajos = await page.locator('#formula-options [data-shortcut]').allTextContents();
  assert.deepEqual(atajos, ['Ctrl+M 1', 'Ctrl+M 2', 'Ctrl+M 3', 'Ctrl+M 4']);
});

/*
  El índice y la numeración eran de la aplicación entera: activarlos para un
  manual se los ponía también a la nota de dos líneas del día siguiente. Ahora
  cada documento puede decir lo suyo, y decirlo también para quitárselos.
*/
test('el índice y la numeración de este documento viajan en sus metadatos', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#markdown-input').fill('# Manual\n\nUn párrafo cualquiera.');

  await page.locator('#doc-format-toolbar-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#doc-own-toc').selectOption('yes');
  await page.locator('#doc-own-numbersections').selectOption('no');
  await page.locator('#doc-format-save-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'hidden' });

  const markdown = await page.locator('#markdown-input').inputValue();
  assert.match(markdown, /toc: true/);
  assert.match(markdown, /numbersections: false/);
  assert.match(markdown, /# Manual/);

  // Al reabrirlo, el cuadro muestra lo que el documento declara.
  await page.locator('#doc-format-toolbar-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#doc-own-toc').inputValue(), 'yes');
  assert.equal(await page.locator('#doc-own-numbersections').inputValue(), 'no');

  // Y volver a «Heredado» deja el documento sin decir nada.
  await page.locator('#doc-own-toc').selectOption('');
  await page.locator('#doc-own-numbersections').selectOption('');
  await page.locator('#doc-format-save-btn').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'hidden' });
  const limpio = await page.locator('#markdown-input').inputValue();
  assert.equal(/toc:|numbersections:/.test(limpio), false);
  assert.match(limpio, /# Manual/);
});

/*
  Al imprimir solo debe salir el documento. La hoja de impresión esconde el
  panel Markdown, pero una regla posterior devolvía el alto natural a todo
  `.panel` con más peso, y la cabecera del panel —el contador de caracteres y
  el botón Copiar— reaparecía en la primera página.
*/
test('al imprimir no sale nada de la interfaz, solo el documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#markdown-input').fill('# Para imprimir\n\nUn párrafo.');
  await page.emulateMedia({ media: 'print' });

  for (const selector of ['#markdown-panel', '#markdown-char-counter', '#copy-html-btn', '#toolbar', '#tab-bar', '#desktop-release-banner']) {
    assert.equal(await page.locator(selector).isVisible(), false, `${selector} no debe imprimirse`);
  }
  await page.locator('#html-output').waitFor({ state: 'visible' });
  assert.match(await page.locator('#html-output').innerText(), /Para imprimir/);

  await page.emulateMedia({ media: 'screen' });
});

/*
  La marca del corrector se quedaba puesta aunque el corrector se apagara: el
  SVG que escribe Lucide conserva su `data-lucide`, la siguiente pasada de
  `createIcons()` lo sustituye y la referencia guardada apuntaba a un nodo que
  ya no estaba en la página.
*/
test('la marca del corrector ortográfico sigue al estado real', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const boton = page.locator('#spellcheck-toggle-btn');
  const marca = page.locator('#spellcheck-toggle-btn .submenu-check');
  const marcaVisible = () => marca.evaluate(check => getComputedStyle(check).display !== 'none');

  assert.equal(await boton.getAttribute('aria-checked'), 'true');
  assert.equal(await marcaVisible(), true, 'de fábrica está encendido y marcado');

  await boton.evaluate(btn => btn.click());
  assert.equal(await boton.getAttribute('aria-checked'), 'false');
  assert.equal(await marcaVisible(), false, 'al apagarlo la marca se quita');
  assert.equal(await page.locator('#markdown-input').getAttribute('spellcheck'), 'false');

  await boton.evaluate(btn => btn.click());
  assert.equal(await marcaVisible(), true, 'y vuelve al encenderlo');
  assert.equal(await page.locator('#markdown-input').getAttribute('spellcheck'), 'true');
});

/*
  La lista de imágenes incrustadas crecía con cada imagen pegada hasta empujar
  al editor fuera de la pantalla, y las líneas no decían qué imagen era cada
  una: un nombre del portapapeles y su tamaño.
*/
test('la lista de imágenes incrustadas se pliega y muestra miniaturas', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await page.locator('#new-tab-btn').click();
  await page.evaluate((png) => markdownEditor.setValue(
    `![uno](data:image/png;base64,${png})\n\n![dos](data:image/png;base64,${png})`,
  ), PNG);

  const lista = page.locator('#base64-hidden-list');
  await page.locator('#base64-hidden-count').getByText('2 imágenes', { exact: true }).waitFor();
  assert.equal(await lista.isVisible(), false, 'de partida la lista viene plegada');
  const altoPlegado = await page.locator('#base64-hidden-container').evaluate(el => el.getBoundingClientRect().height);

  await page.locator('#base64-hidden-toggle').click();
  await lista.waitFor({ state: 'visible' });
  assert.equal(await page.locator('#base64-hidden-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(await lista.locator('.base64-hidden-thumb img').count(), 2, 'cada línea lleva su miniatura');
  // Y por muchas que haya, la lista se queda con su alto y su barra propia.
  assert.equal(await lista.evaluate(el => getComputedStyle(el).overflowY), 'auto');
  assert.ok(await lista.evaluate(el => el.getBoundingClientRect().height) <= 13 * 16 + 1);

  await lista.locator('.base64-hidden-thumb').first().click();
  await page.locator('#base64-preview-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#base64-preview-title').textContent(), 'uno');
  assert.match(await page.locator('#base64-preview-image').getAttribute('src'), /^data:image\/png;base64,/);
  await page.keyboard.press('Escape');
  await page.locator('#base64-preview-overlay').waitFor({ state: 'hidden' });

  // Plegar deja el panel como estaba: una sola línea.
  await page.locator('#base64-hidden-toggle').click();
  await lista.waitFor({ state: 'hidden' });
  assert.equal(
    await page.locator('#base64-hidden-container').evaluate(el => el.getBoundingClientRect().height),
    altoPlegado,
  );
});

/*
  Quitar una imagen incrustada tiene que llevarse su código entero: en el
  editor solo se ve un marcador, y borrarlo a mano deja un `![alt]()` vacío.
*/
test('una imagen incrustada se puede quitar del documento desde la lista', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#new-tab-btn').click();
  await page.evaluate((png) => markdownEditor.setValue(
    `# Título\n\n![sola](data:image/png;base64,${png})\n\nTexto con ![dentro](data:image/png;base64,${png}) en medio.`,
  ), PNG);
  await page.locator('#base64-hidden-toggle').click();
  await page.locator('.base64-hidden-item').first().waitFor();

  // La que ocupaba su propia línea se lleva la línea, sin dejar hueco.
  await page.locator('.base64-hidden-item').first().locator('.base64-hidden-btn-danger').click();
  await page.waitForFunction(() => !markdownEditor.getValue().includes('![sola]'));
  assert.equal(await page.evaluate(() => markdownEditor.getValue()).then(md => md.includes('\n\n\n')), false);
  assert.equal(await page.locator('.base64-hidden-item').count(), 1);

  // La de dentro de un párrafo deja el texto que la rodeaba con un solo espacio.
  await page.locator('.base64-hidden-item').first().locator('.base64-hidden-btn-danger').click();
  await page.waitForFunction(() => !markdownEditor.getValue().includes('data:image'));
  const markdown = await page.evaluate(() => markdownEditor.getValue());
  assert.match(markdown, /Texto con en medio\./);
  assert.match(markdown, /# Título/);
  assert.equal(await page.locator('#base64-hidden-container').isVisible(), false);
});


/*
  Cada panel tiene su lupa y escala solo lo suyo: la del Markdown no puede
  mover la hoja, porque lo que la hoja enseña es lo que va a exportarse y sería
  una promesa falsa; y la de la hoja no puede mover al editor.
*/
test('la lupa de cada panel escala su panel y deja quieto al otro', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());
  await conLaHojaATamanoReal(page);

  await page.locator('#markdown-input').fill('# Hola\n\nUn párrafo de prueba.');
  await page.waitForFunction(() => document.querySelector('#html-output p'));

  const medir = () => page.evaluate(() => ({
    // El editor de Markdown es el textarea; el único CodeMirror es el del código HTML.
    editor: getComputedStyle(document.getElementById('markdown-input')).fontSize,
    hoja: getComputedStyle(document.getElementById('html-output')).fontSize,
    anchoHoja: Math.round(document.getElementById('html-output').getBoundingClientRect().width),
  }));

  const inicio = await medir();
  assert.equal(await page.locator('#markdown-zoom-value').innerText(), '100 %');

  await page.locator('#markdown-zoom-in').click();
  const trasAmpliarElEditor = await medir();
  assert.notEqual(trasAmpliarElEditor.editor, inicio.editor, 'el editor no siguió a su lupa');
  assert.equal(trasAmpliarElEditor.hoja, inicio.hoja, 'la hoja siguió a la lupa del editor');
  assert.equal(await page.locator('#markdown-zoom-value').innerText(), '110 %');

  /*
    Las dos lupas comparten sitio en la barra de estado: se enseña la del panel
    en el que se trabaja, así que hay que ir a la hoja para llegar a la suya.
  */
  await page.locator('#html-output').click();
  await page.locator('#preview-zoom-in').click();
  const trasAmpliarLaHoja = await medir();
  assert.notEqual(trasAmpliarLaHoja.hoja, inicio.hoja, 'la hoja no siguió a su lupa');
  assert.equal(trasAmpliarLaHoja.editor, trasAmpliarElEditor.editor, 'el editor siguió a la lupa de la hoja');

  // Y el porcentaje devuelve cada uno a su sitio.
  await page.locator('#preview-zoom-reset').click();
  await page.locator('#markdown-input').click();
  await page.locator('#markdown-zoom-reset').click();
  assert.deepEqual(await medir(), inicio);
});

/*
  Con los dos paneles a la vista, el activo se ve marcado aunque el foco se haya
  ido a un botón: es el panel sobre el que trabajan las herramientas, y sin
  marca no había manera de saber cuál era.
*/
test('el panel activo queda marcado aunque el foco salga de él', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const activo = () => page.locator('#editor-container').getAttribute('data-panel-activo');
  const filoDeLaHoja = () => page.locator('#preview-desk').evaluate(desk => getComputedStyle(desk).borderColor);

  await page.locator('#markdown-input').click();
  assert.equal(await activo(), 'markdown');

  await page.locator('#html-output').click();
  assert.equal(await activo(), 'preview');
  const marcado = await filoDeLaHoja();

  // El foco se va a un botón de fuera y el panel activo se queda donde estaba.
  await page.locator('#help-menu-btn').focus();
  assert.equal(await activo(), 'preview');
  assert.equal(await filoDeLaHoja(), marcado, 'la hoja perdió la marca al salir el foco');

  await page.locator('#markdown-input').click();
  assert.equal(await activo(), 'markdown');
  assert.notEqual(await filoDeLaHoja(), marcado, 'la hoja se quedó marcada sin ser el panel activo');
});

/*
  La lupa de la vista previa es de la pantalla: agranda la hoja para leerla, no
  el documento. Al imprimir se colaba —la hoja salía más ancha que la página— y
  el navegador cortaba por la derecha el texto y las imágenes.
*/
test('la lupa de la vista previa no llega al papel', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  // Un ancho parecido al imprimible de un A4 con sus márgenes.
  await page.setViewportSize({ width: 658, height: 900 });
  await page.emulateMedia({ media: 'print' });
  const enPapel = zoom => page.evaluate((valor) => {
    document.documentElement.style.setProperty('--preview-zoom', valor);
    const hoja = document.getElementById('html-output');
    return {
      cabe: Math.round(hoja.getBoundingClientRect().width) <= document.documentElement.clientWidth,
      cuerpo: getComputedStyle(hoja).fontSize,
      desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  }, zoom);

  const normal = await enPapel('1');
  assert.deepEqual(normal, { cabe: true, cuerpo: '16px', desborda: false });
  for (const zoom of ['1.25', '2']) {
    assert.deepEqual(await enPapel(zoom), normal, `la lupa al ${zoom} cambió el papel`);
  }
  await page.emulateMedia({ media: 'screen' });
});

/*
  Y los márgenes del documento sí llegan: la hoja los enseña como relleno, pero
  al imprimir el relleno se quita y hace falta escribirlos en `@page`.
*/
test('los márgenes del documento se escriben para el papel', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const regla = () => page.evaluate(
    () => document.getElementById('doc-print-page-style')?.textContent ?? '',
  );
  /*
    El papel va siempre, tenga el documento márgenes propios o no: sin él, un
    documento en Carta se imprimía en el papel que tuviera puesto la impresora
    y el reparto en páginas de la pantalla dejaba de valer. De los márgenes,
    mientras no se fijen, se ocupa el de partida del CSS de impresión.
  */
  assert.equal(await regla(), '@media print { @page { size: A4; } }');

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('---\npapersize: "letter"\nmargin-left: "3"\nmargin-right: "2.5"\n---\n\nTexto\n');
  await page.waitForFunction(
    () => (document.getElementById('doc-print-page-style')?.textContent || '').includes('margin-left'),
  );
  const escrita = await regla();
  assert.match(escrita, /@media print \{ @page \{/);
  assert.match(escrita, /size: Letter;/);
  assert.match(escrita, /margin-left: 3cm;/);
  assert.match(escrita, /margin-right: 2\.5cm;/);
});

/*
  Lo que no fija nadie también se cuenta: sin decirlo, un campo sin pista no se
  distingue de uno cuya pista se ha perdido, y el rótulo del resumen dejaba
  fuera justo los ajustes por los que se pregunta.
*/
test('lo que no hereda nada lo dice, en el cuadro y en el resumen', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  // El rótulo del resumen nombra los siete ajustes, con guion los no fijados.
  const rotulo = await page.locator('#doc-format-status').getAttribute('title');
  const etiquetas = ['Alineación', 'Tipo de letra', 'Tamaño', 'Interlineado',
    'Márgenes', 'Sangría de primera línea', 'Partir palabras'];
  etiquetas.forEach(etiqueta => assert.ok(
    rotulo.includes(etiqueta), `el rótulo no nombra «${etiqueta}»: ${rotulo}`,
  ));
  assert.ok(rotulo.includes('Sangría de primera línea: —'));
  assert.ok(rotulo.includes('Márgenes de página (cm): — / — / — / —'));
  // Y explica el guion, que si no se lee como un fallo.
  assert.match(rotulo, /—\s*:\s*sin fijar/);

  // En el cuadro, cada campo sin valor general lo dice bajo su casilla.
  await page.locator('#doc-format-status').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  const pista = id => page.evaluate((campo) => {
    const hint = document.getElementById(campo)?.nextElementSibling;
    return hint && hint.dataset.inheritedHint && !hint.classList.contains('hidden')
      ? hint.textContent
      : '';
  }, id);
  assert.match(await pista('doc-format-fields-indent'), /Sin fijar/);
  assert.match(await pista('doc-format-fields-align'), /Sin fijar/);
  // Y el que sí hereda sigue diciendo de qué.
  assert.match(await pista('doc-format-fields-font'), /Hereda: Con remates/);
  const margen = await page.locator('#doc-format-fields-margin-top').getAttribute('title');
  assert.match(margen, /Sin fijar/);
});

/*
  De lo de este documento a lo de todos: el cuadro dice que lo heredado sale de
  las opciones de exportación, y lleva a ellas por la misma pestaña, que es lo
  que se busca cuando uno se pregunta de dónde viene un valor.
*/
test('el cuadro del documento lleva a las opciones generales por su misma pestaña', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  // Desde la pestaña del formato, a la del formato.
  await page.locator('#doc-format-status').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#doc-format-open-general').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#doc-settings-tab-format').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#doc-settings-panel-format').isVisible(), true);
  await page.locator('#latex-settings-cancel-btn').click();

  // Y desde la del documento, a la del documento.
  await page.locator('#doc-language-status').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#doc-format-open-general').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#doc-settings-tab-document').getAttribute('aria-selected'), 'true');
});

/*
  El documento se reparte en páginas: la hoja mide lo que mide el papel y el
  texto salta a la siguiente cuando se acaba la caja. El corte cae entre dos
  bloques y nunca a media línea, y las hojas se dibujan fuera del contenido
  editable: dentro acabarían escritas en el Markdown, que se regenera de él.
*/
test('el editor visual reparte el documento en páginas del tamaño del papel', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());
  await conLaHojaATamanoReal(page);

  /*
    El reparto se rehace cada vez que la hoja o la mesa cambian de tamaño, así
    que hay que dejar que la disposición se asiente antes de medir: a mitad del
    cambio de paneles las cuentas son las del ancho de hace un instante.
  */
  const soloVisual = async () => {
    await page.locator('#layout-switch [data-layout="html"]').click();
    await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);
    /*
      Y a que el reparto deje de moverse: las fórmulas y las imágenes cambian de
      alto al terminar de pintarse, y cada cambio lo rehace un fotograma después.
    */
    await page.waitForFunction(() => new Promise((resolve) => {
      const foto = () => [...document.querySelectorAll('#html-output > [data-page-start]')]
        .map(bloque => bloque.style.getPropertyValue('--page-jump')).join('|');
      const antes = foto();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(antes === foto())));
    }));
  };

  await page.setViewportSize({ width: 1400, height: 900 });
  await soloVisual();

  const escribir = async (md) => {
    await page.locator('#layout-switch [data-layout="dual"]').click();
    await page.locator('#markdown-input').waitFor({ state: 'visible' });
    await page.locator('#markdown-input').fill(md);
    await soloVisual();
  };

  const medidas = () => page.evaluate(() => {
    const hoja = document.getElementById('html-output');
    const hojas = [...document.querySelectorAll('.page-sheet')];
    const inicios = [...document.querySelectorAll('#html-output > [data-page-start]')];
    const margen = Number.parseFloat(getComputedStyle(hoja).paddingTop);
    const paso = Number.parseFloat(hojas[0].style.height) + 24;
    const origen = hoja.getBoundingClientRect().top - hoja.offsetTop;
    // Cuánto se aparta cada inicio de página del sitio donde empieza la caja
    // de texto de su hoja.
    const desviaciones = inicios.map((bloque) => {
      const arriba = bloque.getBoundingClientRect().top - origen;
      const pagina = Math.round((arriba - hoja.offsetTop - margen) / paso);
      return {
        bloque: `${bloque.tagName} ${(bloque.textContent || '').slice(0, 30)}`,
        desvio: Math.abs(arriba - (hoja.offsetTop + pagina * paso + margen)),
      };
    });
    const peor = desviaciones.sort((a, b) => b.desvio - a.desvio)[0];
    return {
      ancho: Math.round(hoja.getBoundingClientRect().width),
      altoHoja: Math.round(Number.parseFloat(hojas[0].style.height)),
      paginas: hojas.length,
      saltos: inicios.length,
      desviacion: peor ? peor.desvio : 0,
      peorBloque: peor ? peor.bloque : '',
      etiqueta: hojas[0].textContent,
      dentroDelTexto: hojas.some(hoja2 => document.getElementById('html-output').contains(hoja2)),
    };
  });

  const PX_CM = 96 / 2.54;
  const a4 = await medidas();
  assert.equal(a4.ancho, Math.round(21 * PX_CM), 'la hoja no mide un A4 de ancho');
  assert.equal(a4.altoHoja, Math.round(29.7 * PX_CM), 'la hoja no mide un A4 de alto');
  assert.match(a4.etiqueta, /Página 1/);
  assert.equal(a4.dentroDelTexto, false, 'una hoja acabó dentro del contenido editable');
  assert.ok(a4.saltos >= 1, 'no se repartió en páginas');
  assert.ok(a4.desviacion < 1, `A4: «${a4.peorBloque}» se desvía ${a4.desviacion}px de su página`);

  // Carta cambia las dos medidas.
  await escribir('---\npapersize: "letter"\n---\n\n' + 'Texto de relleno. '.repeat(2000));
  const carta = await medidas();
  assert.equal(carta.ancho, Math.round(21.59 * PX_CM));
  assert.equal(carta.altoHoja, Math.round(27.94 * PX_CM));
  assert.ok(carta.desviacion < 1, `Carta: los saltos se desvían ${carta.desviacion}px`);

  // Y unos márgenes grandes dejan menos caja, así que hacen falta más páginas.
  await escribir('---\npapersize: "a4"\nmargin-top: "5"\nmargin-bottom: "5"\n---\n\n' + 'Texto de relleno. '.repeat(2000));
  const conMargenes = await medidas();
  assert.ok(
    conMargenes.paginas > carta.paginas,
    `con márgenes de 5 cm deberían salir más páginas: ${conMargenes.paginas} frente a ${carta.paginas}`,
  );
  assert.ok(conMargenes.desviacion < 1, `con márgenes: los saltos se desvían ${conMargenes.desviacion}px`);
});

/*
  El índice, cuando el documento lo pide. Hasta ahora marcar «Índice automático»
  no cambiaba nada hasta exportar, así que era un ajuste fácil de olvidar en las
  dos direcciones. Ahora se ve el que va a salir, con sus números de página, y
  sigue sin ser contenido: no se puede editar y no llega al Markdown.
*/
test('el editor visual enseña el índice del documento con sus páginas', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.locator('#new-tab-btn').click();
  const cuerpo = [
    '# Primero',
    '',
    'Texto del primer apartado. '.repeat(120),
    '',
    '## Sub A',
    '',
    'Más texto. '.repeat(150),
    '',
    '# Segundo',
    '',
    'Y más. '.repeat(200),
    '',
  ].join('\n');

  // Sin pedirlo, no hay índice que valga.
  await page.locator('#markdown-input').fill(cuerpo);
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);
  assert.equal(await page.locator('#html-output [data-edimark-toc]').count(), 0);

  // Y pedido en los metadatos, aparece con los apartados y sus páginas.
  await page.locator('#layout-switch [data-layout="dual"]').click();
  await page.locator('#markdown-input').fill(`---\ntoc: true\n---\n\n${cuerpo}`);
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.locator('#markdown-panel').waitFor({ state: 'hidden' });
  await page.waitForFunction(
    () => document.querySelectorAll('#html-output [data-edimark-toc] .doc-toc-page')?.[2]?.textContent,
  );

  const indice = await page.evaluate(() => {
    const nav = document.querySelector('#html-output > [data-edimark-toc]');
    return {
      titulo: nav.querySelector('.doc-toc-title').textContent,
      editable: nav.getAttribute('contenteditable'),
      entradas: [...nav.querySelectorAll('.doc-toc-entry')].map(entrada => [
        entrada.querySelector('.doc-toc-text').textContent,
        entrada.querySelector('.doc-toc-page').textContent,
      ]),
    };
  });
  assert.equal(indice.titulo, 'Índice');
  assert.equal(indice.editable, 'false', 'el índice no debería poder editarse');
  assert.deepEqual(indice.entradas.map(([texto]) => texto), ['Primero', 'Sub A', 'Segundo']);
  // El primero abre el documento; los otros dos caen más allá de la página uno.
  assert.equal(indice.entradas[0][1], '1');
  assert.ok(Number(indice.entradas[2][1]) > 1, `«Segundo» debería caer en otra página: ${indice.entradas[2][1]}`);

  // No es contenido: ni en el Markdown ni en lo que se copia de la hoja.
  const markdown = await page.locator('#markdown-input').inputValue();
  assert.equal(markdown.includes('Índice'), false, 'el índice acabó en el Markdown');
  assert.equal(markdown.includes('doc-toc'), false);

  // Y al quitarlo del documento, desaparece.
  await page.locator('#layout-switch [data-layout="dual"]').click();
  await page.locator('#markdown-input').fill(cuerpo);
  await page.waitForFunction(() => document.querySelectorAll('#html-output [data-edimark-toc]').length === 0);
});

/*
  Y el reparto es solo mirada: lo que se guarda tiene que seguir siendo el mismo
  Markdown, sin rastro de las páginas.
*/
test('las páginas no dejan nada escrito en el documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.locator('#new-tab-btn').click();
  // Varios párrafos, y bastantes: el reparto necesita más de una página, y el
  // corte tiene que caer entre dos de ellos.
  const original = `# Título\n\n${Array.from({ length: 12 }, (_, i) => `Párrafo ${i + 1}. ${'Con su texto y su fondo. '.repeat(30)}`).join('\n\n')}\n`;
  await page.locator('#markdown-input').fill(original);
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);

  // Se escribe sobre la hoja, que es lo que regenera el Markdown.
  await page.locator('#html-output p').first().click();
  await page.keyboard.type('Añadido. ');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('Añadido.'));

  const markdown = await page.locator('#markdown-input').inputValue();
  assert.equal(markdown.includes('page-jump'), false, 'el salto de página acabó en el Markdown');
  assert.equal(markdown.includes('page-start'), false, 'la marca de página acabó en el Markdown');
  assert.equal(markdown.includes('Página'), false, 'el número de página acabó en el Markdown');
});

/*
  En el papel no hay huecos que dibujar: el salto de pantalla se cambia por uno
  de verdad, de modo que el PDF corta por donde cortaba la hoja.
*/
test('lo que en pantalla salta de página, en el papel también', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);

  await page.emulateMedia({ media: 'print' });
  const enPapel = await page.evaluate(() => {
    const inicio = document.querySelector('#html-output > [data-page-start]');
    const estilos = getComputedStyle(inicio);
    return {
      salto: estilos.breakBefore,
      hueco: estilos.marginTop,
      hojasVisibles: getComputedStyle(document.getElementById('page-sheets')).display,
      bloquesEnteros: getComputedStyle(document.querySelector('#html-output > p')).breakInside,
    };
  });
  await page.emulateMedia({ media: 'screen' });

  assert.equal(enPapel.salto, 'page', 'el bloque que estrena página no la estrena al imprimir');
  assert.equal(enPapel.hueco, '0px', 'el hueco de pantalla se imprimiría');
  assert.equal(enPapel.hojasVisibles, 'none');
  assert.equal(enPapel.bloquesEnteros, 'avoid', 'el papel podría partir un párrafo que la pantalla no parte');
});

/*
  Con la hoja estrechada el texto ya no rompe donde rompería en el papel, así
  que el reparto mentiría y se retira hasta que vuelva a caber. Estrechar la
  ventana ya no basta para llegar a ese caso: la lupa ajustada al ancho encoge
  la hoja entera y el reparto sigue siendo fiel; hace falta fijar un aumento
  con el que no quepa.
*/
test('el reparto en páginas se retira cuando la hoja no cabe entera', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);

  /*
    En una pantalla de móvil los paneles se apilan y la atadura no rige, así que
    la hoja se estrecha para caber en la ventana: el texto ya no rompe donde
    rompería en el papel y el reparto se retira.
  */
  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length === 0);
  assert.equal(
    await page.locator('#html-output > [data-page-start]').count(),
    0,
    'quedaron saltos aplicados sin páginas que los sostengan',
  );

  // Y con la lupa más baja la hoja vuelve a caber entera, en proporción.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--preview-zoom', '0.67');
    window.__refreshPageBreaks();
  });
  await page.waitForFunction(() => document.querySelectorAll('.page-sheet').length > 1);
});

/*
  El resumen del formato enseña siempre los tres ajustes que se consultan a
  diario —tamaño, tipo de letra e interlineado—, con un guion donde no hay nada
  fijado: una píldora que cambia de contenido según lo que haya obliga a abrir
  el cuadro para saber si un ajuste está sin poner o es que no cabía.
*/
test('el resumen del formato enseña siempre los tres ajustes', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const pildora = page.locator('#doc-format-status');
  const texto = () => pildora.evaluate(el => el.innerText.replace(/\s+/g, ' ').trim());

  // Recién abierto, los tres valores de partida de las opciones generales.
  await pildora.waitFor({ state: 'visible' });
  assert.equal(await texto(), '12 pt · Serif · 1,5');

  // Y con los tres puestos en el documento, los tres con su valor.
  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('---\nfontsize: "14pt"\nfont: "sans"\nlinestretch: "2"\n---\n\nHola\n');
  await page.waitForFunction(
    () => document.getElementById('doc-format-status').innerText.includes('14 pt'),
  );
  assert.equal(await texto(), '14 pt · Sans · 2');

  // Y lleva al cuadro por la pestaña del formato, que es lo que resume.
  await pildora.click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#doc-format-tab-format').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#doc-format-panel-format').isVisible(), true);

  // La del idioma, en cambio, abre por la suya.
  await page.locator('#doc-format-cancel-btn').click();
  await page.locator('#doc-language-status').click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#doc-format-tab-document').getAttribute('aria-selected'), 'true');
});

/*
  El idioma con el que va a salir el documento se lee en la barra de estado sin
  abrir nada: es lo que decide en qué lengua corrigen Word y LibreOffice. Y dice
  de dónde sale —del documento o de las opciones generales— sin gastar palabras.
*/
test('la barra de estado enseña siempre el idioma del documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const pildora = page.locator('#doc-language-status');
  const heredado = () => pildora.evaluate(el => el.classList.contains('is-inherited'));

  // Sin idioma propio: el general, y atenuado.
  await pildora.waitFor({ state: 'visible' });
  assert.equal(await pildora.innerText(), 'ES');
  assert.equal(await heredado(), true);

  // Con el suyo escrito en los metadatos: encendido y con su código.
  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('---\nlang: "pt-BR"\n---\n\nOlá\n');
  await page.waitForFunction(
    () => document.getElementById('doc-language-status').innerText.trim() === 'PT-BR',
  );
  assert.equal(await heredado(), false);

  // Al quitarlo vuelve a seguir al general.
  await page.locator('#markdown-input').fill('Sin idioma propio\n');
  await page.waitForFunction(
    () => document.getElementById('doc-language-status').innerText.trim() === 'ES',
  );
  assert.equal(await heredado(), true);

  // Y el heredado sigue al idioma de la interfaz cuando este cambia.
  await page.evaluate(() => {
    const select = document.getElementById('language-select');
    select.value = 'en';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(
    () => document.getElementById('doc-language-status').innerText.trim() === 'EN',
  );

  // Lleva al mismo cuadro donde se cambia.
  await pildora.click();
  await page.locator('#doc-format-modal-overlay').waitFor({ state: 'visible' });
});

/*
  En el tema oscuro los encabezados del documento tienen que aclararse los seis:
  los que se quedaban fuera de la regla heredaban el gris oscuro de Tailwind
  Typography y sobre la hoja oscura se leían negros.
*/
test('en el tema oscuro los seis niveles de encabezado se aclaran', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      try { localStorage.setItem('edimarkweb-theme', 'dark'); } catch (_error) {}
    },
  });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await page.locator('#markdown-input').fill('# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro\n\n##### Cinco\n\n###### Seis\n');
  await page.locator('#html-output h6').waitFor();
  const colores = await page.evaluate(() => (
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      .map(tag => getComputedStyle(document.querySelector(`#html-output ${tag}`)).color)
  ));
  assert.deepEqual(new Set(colores), new Set(['rgb(241, 245, 249)']), `encabezados sin aclarar: ${colores}`);
});

/*
  La misma marca, dicha con palabras: la barra de estado lleva el nombre del
  panel activo, y solo ese. El botón que alterna la hoja y su código es cosa del
  panel derecho, así que solo sale cuando ese es el activo.
*/
test('la barra de estado nombra el panel activo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#markdown-input').click();
  assert.equal(await page.locator('#markdown-panel-title').isVisible(), true);
  assert.equal(await page.locator('#html-panel-title').isVisible(), false);
  assert.equal(await page.locator('#view-toggle-btn').isVisible(), false);

  await page.locator('#html-output').click();
  assert.equal(await page.locator('#html-panel-title').isVisible(), true);
  assert.equal(await page.locator('#markdown-panel-title').isVisible(), false);
  assert.equal(await page.locator('#view-toggle-btn').isVisible(), true);

  // Y ese rótulo nombra lo que se está mirando en el panel.
  assert.equal(await page.locator('#html-panel-title').innerText(), 'EDITOR VISUAL');
  await page.locator('#view-toggle-btn').click();
  assert.equal(await page.locator('#html-panel-title').innerText(), 'CÓDIGO HTML');
});

/*
  Las dos lupas comparten sitio en la barra de estado y solo se enseña la del
  panel en el que se trabaja: cada una escala una cosa distinta —el texto que se
  escribe o la hoja que se verá— y juntas invitaban a confundirlas.
*/
test('la barra de estado enseña la lupa del panel activo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#markdown-input').click();
  assert.equal(await page.locator('#markdown-zoom').isVisible(), true);
  assert.equal(await page.locator('#preview-zoom').isVisible(), false);

  await page.locator('#html-output').click();
  assert.equal(await page.locator('#preview-zoom').isVisible(), true);
  assert.equal(await page.locator('#markdown-zoom').isVisible(), false);

  /*
    Pulsar la lupa lleva el foco al botón, que está fuera de los dos paneles: si
    eso contara como cambio de panel, la lupa se cambiaría sola a mitad de la
    faena.
  */
  // Suelto el interruptor: atado, la hoja ya llena el panel y la lupa no sube.
  await page.locator('#preview-link-toggle').click();
  await page.locator('#preview-zoom-in').click();
  assert.equal(await page.locator('#preview-zoom').isVisible(), true);
  assert.equal(await page.locator('#preview-zoom-value').innerText(), '110 %');

  // Con un solo panel a la vista, la lupa que se enseña es la suya.
  await page.locator('#layout-switch [data-layout="md"]').click();
  assert.equal(await page.locator('#markdown-zoom').isVisible(), true);
  assert.equal(await page.locator('#preview-zoom').isVisible(), false);
});

/*
  Las teclas mueven la lupa del panel en el que se está trabajando: con los dos
  paneles a la vista, el que tenga el foco.
*/
test('Ctrl y las teclas de más y menos mueven la lupa del panel activo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await conLaHojaATamanoReal(page);
  await page.locator('#markdown-input').click();
  await page.keyboard.press('Control+Equal');
  assert.equal(await page.locator('#markdown-zoom-value').innerText(), '110 %');
  assert.equal(await page.locator('#preview-zoom-value').innerText(), '100 %');

  await page.locator('#html-output').click();
  await page.keyboard.press('Control+Equal');
  assert.equal(await page.locator('#preview-zoom-value').innerText(), '110 %');
  assert.equal(await page.locator('#markdown-zoom-value').innerText(), '110 %');

  await page.keyboard.press('Control+Minus');
  assert.equal(await page.locator('#preview-zoom-value').innerText(), '100 %');
});

/*
  Desde que la vista previa dejó de seguir al tamaño de la interfaz, necesita
  un número propio: sin él se quedaba en el que le diera la hoja de estilos,
  que no es el que se exporta y convertía la previsualización en una promesa
  falsa. Las opciones generales lo traen puesto.
*/
test('el formato general trae un tamaño concreto que la vista previa aplica', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());
  await conLaHojaATamanoReal(page);

  await page.locator('#markdown-input').fill('# Hola\n\nUn párrafo.');
  await page.waitForFunction(() => document.querySelector('#html-output p'));

  // El ajuste general lo declara, no se queda vacío.
  assert.equal(
    await page.evaluate(() => (window.__edimarkLatexSettings || {}).documentFormat?.fontSize),
    '12',
  );
  // Y llega a la vista previa como estilo propio, en puntos y con la lupa
  // dentro, que en reposo vale 1: 12 pt son 16 px.
  assert.equal(
    await page.evaluate(() => document.getElementById('html-output').style.fontSize),
    'calc(12pt * var(--preview-zoom, 1))',
  );
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.getElementById('html-output')).fontSize),
    '16px',
  );
});

/*
  Una sola forma de explicar una opción, y visible.

  Antes convivían dos: unos menús escribían la explicación debajo del nombre y
  otros la escondían en el `title`, que no existe en una tableta, no sale al
  enfocar con el teclado y no obedece al tema. Ahora toda la información está
  escrita; el tooltip se queda para los botones de icono de la barra, donde no
  hay sitio para texto.
*/
test('ninguna opción de menú esconde su explicación en el ratón', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  assert.equal(
    await page.locator('[role="menu"] [role^="menuitem"][title]').count(),
    0,
    'queda alguna opción con la explicación solo en el tooltip',
  );
});

test('cada opción de menú lleva su explicación escrita debajo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const leer = async (boton, menu) => {
    await page.locator(boton).click();
    await page.locator(menu).waitFor({ state: 'visible' });
    const filas = await page.locator(`${menu} > [role^="menuitem"]`).evaluateAll(items => items.map((item) => {
      const spans = Array.from(item.children).filter(child => child.tagName === 'SPAN');
      const descripcion = spans[spans.length - 1];
      return {
        nombre: item.innerText.split('\n')[0].trim(),
        descripcion: spans.length > 1 ? descripcion.textContent.trim() : '',
      };
    }));
    await page.keyboard.press('Escape');
    return filas;
  };

  for (const [boton, menu] of [
    ['#actions-menu-btn', '#actions-menu'],
    ['#export-menu-btn', '#export-menu'],
    ['#settings-menu-btn', '#settings-menu'],
    ['#help-menu-btn', '#help-menu'],
  ]) {
    for (const fila of await leer(boton, menu)) {
      assert.ok(fila.descripcion, `«${fila.nombre}» de ${menu} se quedó sin explicación`);
    }
  }
});

/*
  Los dos paneles se seguían por proporción, y en un documento largo esa
  proporción dejaba la línea del cursor fuera de la pantalla del otro panel.
  La prueba usa un documento donde la proporción falla —cuarenta apartados con
  un párrafo largo cada uno— y comprueba lo único que importa: que el trozo
  correspondiente se vea de verdad, ida y vuelta.
*/
test('los dos paneles se siguen por la línea, no por la proporción', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const apartados = [];
  for (let i = 1; i <= 40; i += 1) {
    apartados.push(`## Apartado ${i}`, '', `Texto del apartado ${i}. `.repeat(12), '');
  }
  await page.locator('#markdown-input').fill(apartados.join('\n'));
  await page.waitForFunction(() => document.querySelectorAll('#html-output h2').length === 40);

  // El cursor en un encabezado del final: la vista previa tiene que enseñarlo.
  await page.evaluate(() => {
    const textarea = document.getElementById('markdown-input');
    const posicion = textarea.value.indexOf('## Apartado 33');
    textarea.focus();
    textarea.setSelectionRange(posicion, posicion);
    textarea.click();
  });
  // La sincronía se resuelve en el fotograma siguiente.
  await page.waitForTimeout(200);
  const visible = await page.evaluate(() => {
    const scroller = document.getElementById('preview-desk');
    const encabezado = Array.from(document.querySelectorAll('#html-output h2'))
      .find(titulo => titulo.textContent.trim() === 'Apartado 33');
    const caja = encabezado.getBoundingClientRect();
    const mesa = scroller.getBoundingClientRect();
    return caja.top >= mesa.top - 2 && caja.bottom <= mesa.bottom + 2;
  });
  assert.ok(visible, 'la vista previa no llegó al apartado del cursor');

  // Y al pinchar en la hoja, el Markdown enseña esa misma línea.
  await page.evaluate(() => {
    const encabezado = Array.from(document.querySelectorAll('#html-output h2'))
      .find(titulo => titulo.textContent.trim() === 'Apartado 7');
    encabezado.scrollIntoView();
    const caja = encabezado.getBoundingClientRect();
    encabezado.dispatchEvent(new MouseEvent('click', {
      bubbles: true, clientX: caja.left + 4, clientY: caja.top + 4,
    }));
  });
  await page.waitForTimeout(200);
  const lineaVisible = await page.evaluate(() => {
    const textarea = document.getElementById('markdown-input');
    const linea = textarea.value.split('\n').indexOf('## Apartado 7');
    const medida = markdownEditor.lineMetrics(linea);
    return medida.top >= textarea.scrollTop && medida.top <= textarea.scrollTop + textarea.clientHeight;
  });
  assert.ok(lineaVisible, 'el Markdown no llegó a la línea del bloque pinchado');
});

/*
  La barra de formato escribía siempre en el Markdown y se apagaba al pasar a
  la hoja. Ahora trabaja en los dos lados: en la hoja cambia el HTML y el
  Markdown se escribe solo por el camino de siempre. Lo que se comprueba es el
  Markdown resultante, que es lo que se guarda y se exporta.
*/
async function seleccionarEnLaHoja(page, texto) {
  await page.evaluate((buscado) => {
    const salida = document.getElementById('html-output');
    salida.focus();
    const buscar = (nodo) => {
      for (const hijo of nodo.childNodes) {
        if (hijo.nodeType === 3 && hijo.data.includes(buscado)) return hijo;
        if (hijo.nodeType === 1) {
          const encontrado = buscar(hijo);
          if (encontrado) return encontrado;
        }
      }
      return null;
    };
    const nodo = buscar(salida);
    if (!nodo) throw new Error(`No se encontró «${buscado}» en la vista previa`);
    const inicio = nodo.data.indexOf(buscado);
    const rango = document.createRange();
    rango.setStart(nodo, inicio);
    rango.setEnd(nodo, inicio + buscado.length);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    // El guardado de la selección escucha este evento, que no se dispara solo
    // cuando la selección se pone desde un script.
    document.dispatchEvent(new Event('selectionchange'));
  }, texto);
}

/*
  La vista previa se repinta agrupando las pulsaciones, así que un documento
  nuevo con el mismo texto que el anterior no se distingue del que ya estaba en
  pantalla: hay que escribir algo distinto cada vez y esperar a verlo.
*/
async function documentoDePrueba(page, palabra) {
  await page.locator('#markdown-input').fill(`Un párrafo de prueba para ${palabra}.\n`);
  await page.locator('#html-output p').getByText(palabra).waitFor();
}

test('el formato de la barra se aplica también sobre la vista previa', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();

  for (const [formato, palabra, esperado] of [
    ['bold', 'negrita', 'Un párrafo de prueba para **negrita**.'],
    ['italic', 'cursiva', 'Un párrafo de prueba para *cursiva*.'],
    ['code', 'código', 'Un párrafo de prueba para `código`.'],
    ['quote', 'cita', '> Un párrafo de prueba para cita.'],
    ['list-ul', 'lista', '- Un párrafo de prueba para lista.'],
    ['list-ol', 'numerada', '1. Un párrafo de prueba para numerada.'],
  ]) {
    await documentoDePrueba(page, palabra);
    await seleccionarEnLaHoja(page, palabra);
    await page.locator(`[data-format="${formato}"]`).click();
    await page.waitForFunction(
      (texto) => document.getElementById('markdown-input').value.trim() === texto,
      esperado,
    );
    assert.equal(
      (await page.locator('#markdown-input').inputValue()).trim(),
      esperado,
      `«${formato}» desde la vista previa`,
    );
  }

  // El mismo botón quita lo que puso.
  await documentoDePrueba(page, 'alternancia');
  await seleccionarEnLaHoja(page, 'alternancia');
  await page.locator('[data-format="bold"]').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('**'));
  await seleccionarEnLaHoja(page, 'alternancia');
  await page.locator('[data-format="bold"]').click();
  await page.waitForFunction(() => !document.getElementById('markdown-input').value.includes('**'));

  // Y el atajo hace lo mismo que el botón.
  await documentoDePrueba(page, 'atajo');
  await seleccionarEnLaHoja(page, 'atajo');
  await page.keyboard.press('Control+b');
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.trim() === 'Un párrafo de prueba para **atajo**.',
  );
});

test('desde la vista previa se insertan títulos, enlaces, imágenes y tablas', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();

  // Título: el desplegable lo pone y, repetido, lo quita.
  await documentoDePrueba(page, 'encabezado');
  await seleccionarEnLaHoja(page, 'encabezado');
  await page.locator('#heading-btn').click();
  await page.locator('[data-format="heading-2"]').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.startsWith('## '));
  await seleccionarEnLaHoja(page, 'encabezado');
  await page.locator('#heading-btn').click();
  await page.locator('[data-format="heading-2"]').click();
  await page.waitForFunction(() => !document.getElementById('markdown-input').value.startsWith('## '));

  /*
    Enlace: la ventana de siempre, con el texto seleccionado ya escrito —solo
    queda poner la dirección, igual que pidiéndolo desde el Markdown— y puesto
    donde estaba la selección.
  */
  await documentoDePrueba(page, 'enlace');
  await seleccionarEnLaHoja(page, 'enlace');
  await page.locator('[data-format="link"]').click();
  await page.locator('#link-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#link-text').inputValue(), 'enlace');
  await page.locator('#link-url').fill('https://ejemplo.org');
  await page.locator('#insert-link-btn').click();
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.includes('[enlace](https://ejemplo.org)'),
  );

  // La imagen hace lo mismo con el texto alternativo.
  await documentoDePrueba(page, 'ilustración');
  await seleccionarEnLaHoja(page, 'ilustración');
  await page.locator('[data-format="image"]').click();
  await page.locator('#image-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#image-alt-text').inputValue(), 'ilustración');
  await page.locator('#cancel-image-btn').click();

  // Tabla: bloque nuevo detrás del párrafo, no dentro de él.
  await documentoDePrueba(page, 'tabla');
  await seleccionarEnLaHoja(page, 'tabla');
  await page.locator('[data-format="table"]').click();
  await page.locator('#table-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#create-table-btn').click();
  await page.waitForFunction(() => /\n\|.+\|\n/.test(document.getElementById('markdown-input').value));
  assert.equal(await page.locator('#html-output table').count(), 1);

});

/*
  Sobre la hoja no hay dónde escribir dentro de un par de delimitadores: en
  cuanto se repinta, KaTeX convierte el hueco en fórmula. Por eso el menú de
  fórmulas abre una ventana donde se escribe el código con el resultado
  delante, y solo entra en el documento lo que ya está montado. En el panel
  Markdown no cambia nada: allí los delimitadores se escriben en el texto.
*/
test('sobre la vista previa las fórmulas se escriben en su propia ventana', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await documentoDePrueba(page, 'x^2');
  await seleccionarEnLaHoja(page, 'x^2');

  // Sobre la hoja el botón abre la ventana de una vez: no hay menú detrás, y
  // la flecha que lo anunciaba se retira.
  assert.equal(await page.locator('#formula-btn-caret').isVisible(), false);
  assert.equal(await page.locator('#formula-btn').getAttribute('aria-haspopup'), 'dialog');
  await page.locator('#formula-btn').click();
  await page.locator('#math-modal-overlay').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#formula-options').isVisible(), false);

  // De partida, en línea y con \(...\).
  assert.equal(await page.locator('input[name="math-placement"]:checked').inputValue(), 'inline');
  assert.equal(await page.locator('input[name="math-delimiter"]:checked').inputValue(), 'bracket');

  // Lo seleccionado llega escrito y se ve renderizado antes de aceptar.
  assert.equal(await page.locator('#math-code').inputValue(), 'x^2');
  await page.locator('#math-preview .katex').waitFor();

  // Un error se explica en vez de colarse en el documento.
  await page.locator('#math-code').fill('\\frac{a}');
  await page.locator('#math-error').waitFor({ state: 'visible' });

  await page.locator('#math-code').fill('\\frac{a}{b}');
  await page.locator('#math-error').waitFor({ state: 'hidden' });
  await page.locator('#insert-math-btn').click();
  await page.waitForFunction(
    () => /\\\(\\frac\{a\}\{b\}\\\)/.test(document.getElementById('markdown-input').value),
  );
  await page.locator('#html-output .katex').first().waitFor();

  /*
    Los dos ejes se eligen en la ventana, y el par ofrecido es el de la
    presentación puesta: en bloque, `\[...\]` y `$$...$$`.
  */
  await documentoDePrueba(page, 'aparte');
  await seleccionarEnLaHoja(page, 'aparte');
  await page.locator('#formula-btn').click();
  await page.locator('#math-modal-overlay').waitFor({ state: 'visible' });
  await page.locator('#math-code').fill('\\frac{a}{b}');
  await page.locator('input[name="math-placement"][value="block"]').check();
  assert.equal(await page.locator('#math-delimiter-bracket-label').textContent(), '\\[...\\]');
  assert.equal(await page.locator('#math-delimiter-dollar-label').textContent(), '$$...$$');
  await page.locator('input[name="math-delimiter"][value="dollar"]').check();
  await page.locator('#math-preview .katex-display').waitFor();
  await page.locator('#insert-math-btn').click();
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.includes('$$\\frac{a}{b}$$'),
  );
  await page.locator('#html-output .katex-display').waitFor();

  // Desde el panel Markdown, el menú de siempre y sin ventana.
  await page.locator('#markdown-input').fill('Texto.\n');
  await page.locator('#markdown-input').focus();
  assert.equal(await page.locator('#formula-btn-caret').isVisible(), true);
  await page.locator('#formula-btn').click();
  await page.locator('#formula-options').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#math-modal-overlay').isVisible(), false);
  await page.locator('[data-format="latex-inline-dollar"]').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('$$'));
});

/*
  Ctrl+M hace lo mismo que el botón, y el botón hace dos cosas distintas: sobre
  la hoja no hay delimitadores que elegir, así que la espera de las cuatro
  teclas no pinta nada y el atajo abre la ventana de una vez.
*/
test('sobre la vista previa Ctrl+M abre la ventana en lugar de la espera', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await documentoDePrueba(page, 'x^2');
  await seleccionarEnLaHoja(page, 'x^2');

  await page.keyboard.press('Control+KeyM');
  await page.locator('#math-modal-overlay').waitFor({ state: 'visible' });
  // La espera no llegó a abrirse: la barra de estado no anuncia las teclas.
  assert.equal(await page.locator('#status-toast-message').textContent(), '');
  // Y lo seleccionado en la hoja llega escrito, como con el botón.
  assert.equal(await page.locator('#math-code').inputValue(), 'x^2');
  await page.locator('#cancel-math-btn').click();
});

/*
  Quien abre una ventana suele escribir a continuación sin tocar el ratón. Con
  el foco puesto un fotograma más tarde, la primera letra se perdía —y se
  colaba en el documento—, así que se comprueba escribiendo a ciegas.
*/
test('las ventanas de la barra reciben el cursor en su primer campo', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await documentoDePrueba(page, 'ventanas');
  await seleccionarEnLaHoja(page, 'ventanas');
  await page.locator('#formula-btn').click();
  await page.locator('#math-modal-overlay').waitFor({ state: 'visible' });
  await page.keyboard.type('x^2');
  assert.equal(await page.locator('#math-code').inputValue(), 'x^2');
  await page.locator('#cancel-math-btn').click();

  /*
    Y el cursor tiene que verse, que es otra cosa: el reset de Tailwind deja
    los `textarea` sin relleno, así que el caret se dibujaba en la posición
    cero, tapado por el borde del campo. Con el campo vacío no se veía nada y
    parecía que la ventana no daba el foco.
  */
  for (const campo of ['#math-code', '#latex-import-input']) {
    const relleno = await page.locator(campo).evaluate((el) => {
      const estilo = window.getComputedStyle(el);
      return { izquierda: parseFloat(estilo.paddingLeft), arriba: parseFloat(estilo.paddingTop) };
    });
    assert.ok(relleno.izquierda > 0, `${campo} pega el cursor al borde izquierdo`);
    assert.ok(relleno.arriba > 0, `${campo} pega el cursor al borde superior`);
  }

  for (const [boton, ventana, campo] of [
    // Con texto seleccionado, el enlace da por sabido el texto y pide la
    // dirección; sin él, empieza por el texto.
    ['[data-format="link"]', '#link-modal-overlay', 'link-url'],
    ['[data-format="image"]', '#image-modal-overlay', 'image-file-input'],
    ['[data-format="table"]', '#table-modal-overlay', 'table-cols'],
  ]) {
    await documentoDePrueba(page, `campo ${campo}`);
    await seleccionarEnLaHoja(page, 'campo');
    await page.locator(boton).click();
    await page.locator(ventana).waitFor({ state: 'visible' });
    assert.equal(
      await page.evaluate(() => document.activeElement.id),
      campo,
      `la ventana de ${boton} no dio el cursor a ${campo}`,
    );
    await page.evaluate((selector) => { document.querySelector(selector).style.display = 'none'; }, ventana);
  }
});

/*
  EdiCuaTeX devuelve la fórmula ya escrita en Markdown, y eso no se puede
  volver a interpretar: `\(` es un paréntesis escapado, así que pasarla por el
  conversor le comía las barras y la fórmula llegaba como texto suelto.
*/
test('la fórmula de EdiCuaTeX entra intacta en la vista previa', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await documentoDePrueba(page, 'hueco');
  await seleccionarEnLaHoja(page, 'hueco');
  await page.evaluate(() => window.postMessage({
    type: 'edicuatex:result',
    latex: 'x^2',
    delimiter: 'parentheses',
    wrapped: '\\(x^2\\)',
  }, '*'));
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.includes('\\(x^2\\)'),
  );
  await page.locator('#html-output .katex').first().waitFor();
});

/*
  Tocar la hoja rehace el Markdown entero, así que lo que no se ha tocado tiene
  que volver tal cual: es la diferencia entre una ayuda y un editor en el que
  se pueda confiar.
*/
test('formatear en la vista previa no reescribe el resto del documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const documento = [
    '# Título',
    '',
    'Un párrafo con **negrita**, *cursiva*, `código` y un [enlace](https://ejemplo.org).',
    '',
    '- uno',
    '  - anidado',
    '- dos',
    '',
    '1. primero',
    '2. segundo',
    '',
    '- [ ] tarea',
    '- [x] hecha',
    '',
    '> una cita',
    '',
    'Fórmula $E=mc^2$ en línea.',
    '',
    'Final.',
    '',
  ].join('\n');
  await page.locator('#markdown-input').fill(documento);
  await page.locator('#html-output blockquote').waitFor();

  await seleccionarEnLaHoja(page, 'Final');
  await page.locator('[data-format="bold"]').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('**Final**'));

  const resultado = await page.locator('#markdown-input').inputValue();
  assert.equal(resultado.trim(), documento.replace('Final.', '**Final**.').trim());
});

/*
  Cambiar de pestaña devolvía las dos vistas al principio del documento, así
  que volver a un texto largo obligaba a buscar otra vez por dónde se iba.
*/
test('cada pestaña vuelve por donde se quedó', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  const documento = Array.from({ length: 60 }, (_, i) => `Línea ${i + 1} de un documento largo de prueba.`).join('\n\n');
  await page.locator('#markdown-input').fill(documento);
  await page.locator('#html-output p').getByText('Línea 60', { exact: false }).waitFor();

  // El cursor, bien entrado el documento.
  await page.evaluate(() => {
    const editor = document.getElementById('markdown-input');
    const posicion = editor.value.indexOf('Línea 40');
    editor.focus();
    editor.setSelectionRange(posicion + 4, posicion + 4);
    editor.dispatchEvent(new Event('select'));
  });
  /*
    La hoja sigue moviéndose un poco mientras se renderizan las fórmulas y las
    imágenes; se mide cuando se ha quedado quieta, que es lo que guarda la
    pestaña al salir.
  */
  await page.waitForFunction(() => {
    const mesa = document.getElementById('preview-desk');
    if (!mesa.scrollTop) return false;
    const anterior = window.__ultimoScroll;
    window.__ultimoScroll = mesa.scrollTop;
    return anterior === mesa.scrollTop;
  }, null, { polling: 250 });
  const antes = await page.evaluate(() => ({
    cursor: document.getElementById('markdown-input').selectionStart,
    markdown: Math.round(document.getElementById('markdown-input').scrollTop),
    vista: Math.round(document.getElementById('preview-desk').scrollTop),
  }));
  assert.ok(antes.markdown > 0, 'la prueba necesita el editor desplazado');

  await page.locator('#new-tab-btn').click();
  await page.locator('.tab').nth(1).click();
  await page.waitForFunction(
    (esperado) => document.getElementById('markdown-input').selectionStart === esperado,
    antes.cursor,
  );
  const despues = await page.evaluate(() => ({
    cursor: document.getElementById('markdown-input').selectionStart,
    markdown: Math.round(document.getElementById('markdown-input').scrollTop),
    vista: Math.round(document.getElementById('preview-desk').scrollTop),
  }));
  assert.equal(despues.cursor, antes.cursor);
  assert.ok(Math.abs(despues.markdown - antes.markdown) <= 4, `el editor volvió a ${despues.markdown} en vez de ${antes.markdown}`);
  assert.ok(Math.abs(despues.vista - antes.vista) <= 4, `la hoja volvió a ${despues.vista} en vez de ${antes.vista}`);
});

/*
  Listas de varios niveles con el tabulador, en los dos paneles. En la hoja se
  mueve el elemento a mano: el `outdent` de `execCommand` deshacía el punto en
  Firefox en vez de subirlo de nivel.
*/
test('el tabulador anida y desanida los puntos de una lista', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();

  // En el panel Markdown, sobre la línea del punto y no donde esté el cursor.
  await page.locator('#markdown-input').fill('- uno\n- dos\n- tres\n');
  await page.locator('#html-output li').getByText('dos', { exact: true }).waitFor();
  await page.evaluate(() => {
    const editor = document.getElementById('markdown-input');
    const posicion = editor.value.indexOf('dos') + 3;
    editor.focus();
    editor.setSelectionRange(posicion, posicion);
  });
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.startsWith('- uno\n  - dos'));
  await page.keyboard.press('Shift+Tab');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.startsWith('- uno\n- dos'));

  // Y en la hoja, con el cursor dentro del punto.
  const caretEnElPunto = async (texto) => {
    await page.evaluate((buscado) => {
      const salida = document.getElementById('html-output');
      salida.focus();
      const punto = Array.from(salida.querySelectorAll('li'))
        .find(li => li.firstChild && li.firstChild.nodeType === 3 && li.firstChild.data.trim() === buscado);
      const rango = document.createRange();
      rango.setStart(punto.firstChild, punto.firstChild.data.length);
      rango.collapse(true);
      const seleccion = window.getSelection();
      seleccion.removeAllRanges();
      seleccion.addRange(rango);
      document.dispatchEvent(new Event('selectionchange'));
    }, texto);
  };

  await page.locator('#markdown-input').fill('- alfa\n- beta\n- gamma\n');
  await page.locator('#html-output li').getByText('beta', { exact: true }).waitFor();
  await caretEnElPunto('beta');
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('\n  - beta'));
  assert.equal(await page.locator('#html-output ul ul li').count(), 1);

  // El cursor se queda donde se estaba escribiendo, no salta al punto siguiente.
  assert.equal(
    await page.evaluate(() => {
      const nodo = window.getSelection().anchorNode;
      return nodo && nodo.nodeType === 3 ? nodo.data.trim() : '';
    }),
    'beta',
  );

  await page.keyboard.press('Shift+Tab');
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.trim() === '- alfa\n- beta\n- gamma',
  );

  // El primer punto no tiene bajo qué anidarse y se queda como está.
  await page.locator('#markdown-input').fill('- uno\n- dos\n');
  await page.locator('#html-output li').getByText('uno', { exact: true }).waitFor();
  await caretEnElPunto('uno');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  assert.equal((await page.locator('#markdown-input').inputValue()).trim(), '- uno\n- dos');
});

/*
  Una lista numerada sangra tres espacios, que es lo que ocupa `1. `; con los
  dos de las viñetas el punto se quedaba en el mismo nivel, solo que con otro
  número, y en la hoja no aparecía anidado.
*/
test('las listas numeradas se anidan como las de viñetas', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('1. uno\n2. dos\n3. tres\n');
  await page.locator('#html-output li').getByText('dos', { exact: true }).waitFor();
  await page.evaluate(() => {
    const editor = document.getElementById('markdown-input');
    const posicion = editor.value.indexOf('2. dos') + 6;
    editor.focus();
    editor.setSelectionRange(posicion, posicion);
  });
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('\n   1. dos'));
  await page.locator('#html-output ol ol li').waitFor();

  // Y vuelve a su nivel con la numeración que le toca allí.
  await page.keyboard.press('Shift+Tab');
  await page.waitForFunction(
    () => document.getElementById('markdown-input').value.startsWith('1. uno\n2. dos'),
  );
  // La hoja se repinta un poco después: se espera a que la anidada desaparezca.
  await page.waitForFunction(() => document.querySelectorAll('#html-output ol ol li').length === 0);
});

/*
  Un punto vacío cierra la lista, pero solo la del primer nivel: dentro de una
  anidada, dos intros seguidos acababan con todo en vez de sacar el punto al
  nivel de arriba, que es donde se seguía escribiendo.
*/
test('un punto vacío de una lista anidada sube de nivel', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();

  // En el panel Markdown, con tres niveles: se sube de uno en uno.
  await page.locator('#markdown-input').fill('- uno\n  - dos\n    - tres\n');
  await page.locator('#html-output ul ul ul li').waitFor();
  await page.evaluate(() => {
    const editor = document.getElementById('markdown-input');
    const posicion = editor.value.indexOf('- tres') + 6;
    editor.focus();
    editor.setSelectionRange(posicion, posicion);
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.endsWith('  - \n'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.endsWith('\n- \n'));
  // Ya en el primer nivel, el siguiente intro sí cierra la lista.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.getElementById('markdown-input').value.endsWith('- \n'));

  // Y una numerada recupera el número que le toca en el nivel de arriba.
  await page.locator('#markdown-input').fill('1. uno\n   1. dos\n');
  await page.locator('#html-output ol ol li').waitFor();
  await page.evaluate(() => {
    const editor = document.getElementById('markdown-input');
    const posicion = editor.value.indexOf('1. dos') + 6;
    editor.focus();
    editor.setSelectionRange(posicion, posicion);
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('\n2. '));

  // En la hoja, lo mismo.
  await page.locator('#markdown-input').fill('- alfa\n  - beta\n');
  await page.locator('#html-output ul ul li').waitFor();
  await page.evaluate(() => {
    const salida = document.getElementById('html-output');
    salida.focus();
    const punto = Array.from(salida.querySelectorAll('li')).find(li => li.textContent.trim() === 'beta');
    const rango = document.createRange();
    rango.setStart(punto.firstChild, punto.firstChild.data.length);
    rango.collapse(true);
    const seleccion = window.getSelection();
    seleccion.removeAllRanges();
    seleccion.addRange(rango);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('#html-output ul ul li').length === 2);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('#html-output ul ul li').length === 1);
  assert.equal(await page.locator('#html-output > ul > li').count(), 2);
});

/*
  Abrir la aplicación en su propia ventana es cosa de cómo se ve, así que está
  con los botones de la vista y no solo enterrado en Configuración. No es un
  modo que se quede puesto, sino algo que pasa una vez: va al final y detrás de
  una raya. En la aplicación de escritorio no pinta nada.
*/
test('la ventana independiente se pide desde la fila de la vista', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const boton = page.locator('#desktop-window-toolbar-btn');
  await boton.waitFor();
  assert.equal(await page.locator('#desktop-window-separator').isVisible(), true);

  // Al final de la fila, detrás del que cambia el ancho de trabajo.
  const ancho = await page.locator('#toggle-width-btn').boundingBox();
  const ventana = await boton.boundingBox();
  assert.ok(ventana.x > ancho.x + ancho.width, 'debería quedar a la derecha de todo');

  // Y hace lo mismo que la opción de Configuración.
  const emergente = page.waitForEvent('popup');
  await boton.click();
  const nueva = await emergente;
  assert.match(nueva.url(), /desktop=1/);
});

test('en la aplicación de escritorio no se ofrece la ventana independiente', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__EDIMARK_TAURI__ = { dialog: {}, fs: {}, opener: { openUrl: async () => {} } };
    },
  });
  t.after(() => context.close());

  await page.waitForFunction(() => document.body.classList.contains('desktop-mode'));
  for (const selector of ['#desktop-window-toolbar-btn', '#desktop-window-separator', '#desktop-window-btn']) {
    assert.equal(await page.locator(selector).isVisible(), false, `${selector} no debería verse en el escritorio`);
  }
});

/*
  Una imagen pegada entra como `data:image/png;base64,…`: viaja con el texto,
  pero engorda el `.md` y lo vuelve incómodo de leer. El camino de vuelta la
  saca a un archivo en `imagenes/` y deja su ruta en el texto; los archivos se
  escriben al guardar, por donde ya pasan las imágenes de ruta relativa.
*/
const PNG_BASE64 = PNG_PIXEL.toString('base64');

/*
  Las imágenes salen a una carpeta con el nombre del documento, así que los
  documentos de estas pruebas se llaman como se llamarían en el disco.
*/
async function nombrarDocumento(page, nombre) {
  await page.evaluate((valor) => {
    const doc = docs.find(d => d.id === currentId);
    if (doc) doc.name = valor;
  }, nombre);
}

async function documentoConImagenIncrustada(page, extra = '') {
  await page.evaluate(([datos, cola]) => {
    markdownEditor.setValue(`# Con una imagen\n\n![Un gráfico](data:image/png;base64,${datos})\n${cola}`);
  }, [PNG_BASE64, extra]);
  await page.locator('#base64-hidden-container').waitFor({ state: 'visible' });
}

test('las imágenes incrustadas se pueden pasar a la carpeta del documento', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await nombrarDocumento(page, 'Mi archivo');
  // La segunda imagen comprueba que no se pisa una ruta ya usada.
  await documentoConImagenIncrustada(page, '\n![Ya suelta](Mi-archivo/01.png)\n');
  await page.locator('#base64-extract-btn').click();

  await page.waitForFunction(() => !document.getElementById('markdown-input').value.includes('base64,'));
  const markdown = await page.locator('#markdown-input').inputValue();
  /*
    La carpeta lleva el nombre del documento —con los espacios en guiones, que
    en un `![](...)` cortarían el enlace—, para que dos `.md` vecinos no se
    pisen las imágenes.
  */
  assert.match(markdown, /!\[Un gráfico\]\(Mi-archivo\/02\.png\)/);
  assert.match(markdown, /!\[Ya suelta\]\(Mi-archivo\/01\.png\)/);

  // El panel de incrustadas se vacía y la vista previa las sigue enseñando.
  await page.locator('#base64-hidden-container').waitFor({ state: 'hidden' });
  const imagenes = await page.locator('#html-output img').evaluateAll(nodes => nodes.map(img => ({
    src: img.getAttribute('src'),
    original: img.dataset.edimarkSrc || '',
  })));
  const extraida = imagenes.find(imagen => imagen.original === 'Mi-archivo/02.png');
  assert.ok(extraida, 'la imagen extraída debería seguir en la vista previa');
  assert.match(extraida.src, /^blob:/);
});

test('las imágenes pasadas a la carpeta se escriben al guardar', async (t) => {
  const { context, page } = await openApp({
    initStorage: () => {
      window.__webSaveCalls = [];
      const makeDirectory = (prefix = '') => ({
        getDirectoryHandle: async name => makeDirectory(`${prefix}${name}/`),
        getFileHandle: async name => ({
          createWritable: async () => ({
            write: async (contents) => {
              const value = contents instanceof Blob
                ? [...new Uint8Array(await contents.arrayBuffer())]
                : String(contents);
              window.__webSaveCalls.push(['write', `${prefix}${name}`, value]);
            },
            close: async () => {},
          }),
        }),
      });
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: async () => makeDirectory(),
      });
    },
  });
  t.after(() => context.close());

  await page.locator('#new-tab-btn').click();
  await documentoConImagenIncrustada(page);
  await nombrarDocumento(page, 'tema-3');
  await page.locator('#base64-extract-btn').click();
  await page.waitForFunction(() => document.getElementById('markdown-input').value.includes('tema-3/01.png'));

  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__webSaveCalls.some(call => call[1] === 'tema-3/01.png'));

  const llamadas = await page.evaluate(() => window.__webSaveCalls);
  const markdown = llamadas.find(call => String(call[1]).endsWith('.md'));
  assert.ok(!markdown[2].includes('base64,'), 'el Markdown guardado no debe llevar la imagen dentro');
  const imagen = llamadas.find(call => call[1] === 'tema-3/01.png');
  assert.deepEqual(imagen[2], [...PNG_PIXEL], 'la imagen escrita debe ser la original, byte a byte');
});

/*
  La hoja de la vista previa mide el papel de verdad, así que en un panel
  estrecho no cabía y la mesa se desplazaba a lo ancho. Con el panel atado a la
  lupa se encoge entera —y no estrechándola, que reordenaría el texto y
  perdería el reparto en páginas—, de modo que a cualquier anchura la página se
  ve completa y sin barra horizontal.
*/
test('la vista previa se ajusta al ancho del panel y no deja barra horizontal', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const medir = () => page.evaluate(() => {
    const desk = document.getElementById('preview-desk');
    const sheet = document.getElementById('html-output');
    return {
      barraHorizontal: desk.scrollWidth > desk.clientWidth,
      zoom: Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1,
      etiqueta: document.getElementById('preview-zoom-value').textContent,
      hoja: Math.round(sheet.getBoundingClientRect().width),
      paginas: document.querySelectorAll('#page-sheets .page-sheet').length,
    };
  });

  await page.setViewportSize({ width: 1600, height: 900 });
  // El formato del documento es quien le da a la hoja el ancho del papel.
  await page.evaluate(() => window.__applyDocumentFormatToPreview());
  await page.waitForFunction(() => document.querySelectorAll('#page-sheets .page-sheet').length > 0);

  const ancha = await medir();
  assert.equal(ancha.barraHorizontal, false);
  assert.ok(ancha.zoom >= 1, 'con sitio de sobra la hoja llega al menos a tamaño real');
  assert.ok(ancha.paginas > 0, 'la hoja al ancho del papel va repartida en páginas');

  // Un portátil estrecho: la hoja ya no cabe a tamaño real y la lupa lo resuelve.
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.waitForFunction(() => (
    (Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1) < 1
  ));
  const estrecha = await medir();
  assert.equal(estrecha.barraHorizontal, false);
  assert.ok(estrecha.zoom < 1, 'la hoja se encoge para caber');
  assert.ok(estrecha.paginas > 0, 'encogerla entera conserva el reparto en páginas');
  assert.match(estrecha.etiqueta, /^\d+ ?%$/);

  /*
    Soltar el interruptor devuelve la lupa a su tamaño real y con ella la
    barra: es la vía para ampliar más allá de lo que cabe. Los controles de la
    vista previa solo se enseñan mientras se trabaja en ella, así que antes hay
    que pasar a ese panel.
  */
  assert.equal(await page.locator('#preview-zoom-reset').getAttribute('data-ajuste'), 'true');
  await page.locator('#html-output').click();
  await page.locator('#preview-link-toggle').waitFor({ state: 'visible' });
  await page.locator('#preview-link-toggle').click();
  await page.locator('#preview-zoom-reset').click();
  const real = await medir();
  assert.equal(real.zoom, 1);
  assert.equal(real.barraHorizontal, true, 'a tamaño real la hoja no cabe: la barra vuelve');
  assert.equal(await page.locator('#preview-zoom-reset').getAttribute('data-ajuste'), 'false');

  // Y volver a atarlo la encaja otra vez, sin tocar nada más.
  await page.locator('#preview-link-toggle').click();
  await page.waitForFunction(() => (
    (Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1) < 1
  ));
  assert.equal((await medir()).barraHorizontal, false);
  assert.equal(await page.locator('#preview-zoom-reset').getAttribute('data-ajuste'), 'true');

  /*
    Con la vista previa sola no hay nada que atar —ningún panel le disputa el
    ancho—, así que el interruptor se retira y la lupa se queda donde estaba;
    al volver a los dos paneles vuelve a mandar el ajuste.
  */
  const antesDeAislarla = (await medir()).zoom;
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.waitForTimeout(600);
  const aislada = await medir();
  assert.equal(aislada.zoom, antesDeAislarla, 'la lupa se movió sin que nadie se lo pidiera');
  assert.equal(aislada.barraHorizontal, false);
  assert.equal(await page.locator('#preview-link-toggle').isVisible(), false);

  await page.locator('#layout-switch [data-layout="dual"]').click();
  await page.waitForTimeout(600);
  assert.equal((await medir()).barraHorizontal, false);
  assert.equal(await page.locator('#preview-link-toggle').isVisible(), true);
});

/*
  La aplicación abre expandida: en la columna centrada de 1280 px no caben el
  editor y una hoja A4 a tamaño real, que es lo que se viene a ver. Quien
  prefiera la columna lo dice una vez con el botón y se recuerda.
*/
test('la aplicación abre expandida y recuerda si se contrae', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  const expandida = () => page.locator('#main-container').evaluate(el => el.classList.contains('is-expanded'));
  assert.equal(await expandida(), true);

  await page.locator('#toggle-width-btn').click();
  assert.equal(await expandida(), false);

  await page.reload();
  await page.waitForFunction(() => window.__edimarkReady === true);
  assert.equal(await expandida(), false, 'la columna centrada elegida no sobrevivió a la recarga');

  await page.locator('#toggle-width-btn').click();
  await page.reload();
  await page.waitForFunction(() => window.__edimarkReady === true);
  assert.equal(await expandida(), true);
});

/*
  El panel y la lupa, atados en los dos sentidos: subir el aumento aparta el
  separador para que la hoja siga entera, y moverlo recalcula el aumento. La
  atadura se para donde el editor de Markdown se quedaría sin su ancho mínimo:
  la promesa es que la página se ve completa, y para ir más allá se suelta.
*/
test('la lupa y el separador van atados en los dos sentidos', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => window.__applyDocumentFormatToPreview());
  await page.waitForFunction(() => document.querySelectorAll('#page-sheets .page-sheet').length > 0);

  const medir = () => page.evaluate(() => {
    const desk = document.getElementById('preview-desk');
    return {
      md: document.getElementById('markdown-panel').offsetWidth,
      barraHorizontal: desk.scrollWidth > desk.clientWidth,
      zoom: Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1,
      paginas: document.querySelectorAll('#page-sheets .page-sheet').length,
    };
  });

  await page.locator('#html-output').click();
  const partida = await medir();
  assert.ok(partida.zoom >= 1);
  assert.equal(await page.locator('#preview-link-toggle').getAttribute('aria-pressed'), 'true');

  // Ampliar aparta el separador: el editor de Markdown cede ancho.
  const antesDeAmpliar = partida.zoom;
  await page.locator('#preview-zoom-in').click();
  await page.waitForFunction((previo) => (
    (Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1) > previo
  ), antesDeAmpliar);
  const ampliado = await medir();
  assert.ok(ampliado.zoom > antesDeAmpliar);
  assert.ok(ampliado.md < partida.md, 'el separador no se apartó al ampliar');
  assert.equal(ampliado.barraHorizontal, false);
  assert.ok(ampliado.paginas > 0);

  /*
    Y sigue ampliando hasta donde cabe, no más: al llegar ahí el `+` se apaga,
    que es lo que dice que el ancho se ha acabado.
  */
  const mas = page.locator('#preview-zoom-in');
  for (let i = 0; i < 8 && await mas.getAttribute('aria-disabled') !== 'true'; i += 1) {
    await mas.click();
    await page.waitForTimeout(120);
  }
  assert.equal(await mas.getAttribute('aria-disabled'), 'true', 'el + nunca dijo que se había acabado el ancho');
  const tope = await medir();
  assert.equal(tope.barraHorizontal, false, 'la lupa pasó de lo que cabe en el panel');
  assert.ok(tope.md >= 280, 'el editor de Markdown se quedó sin su ancho mínimo');

  // Mover el separador recalcula el aumento, que es el otro sentido.
  await page.evaluate(() => {
    const md = document.getElementById('markdown-panel');
    const hp = document.getElementById('html-panel');
    const total = md.offsetWidth + hp.offsetWidth;
    md.style.width = `${Math.round(total * 0.7)}px`;
    hp.style.width = `${Math.round(total * 0.3)}px`;
  });
  await page.waitForFunction(() => (
    (Number(getComputedStyle(document.documentElement).getPropertyValue('--preview-zoom')) || 1) < 1
  ));
  const estrechado = await medir();
  assert.equal(estrechado.barraHorizontal, false);
  assert.ok(estrechado.paginas > 0, 'encogerla entera conserva el reparto en páginas');
  assert.equal(await page.locator('#preview-zoom-reset').getAttribute('data-ajuste'), 'true');
});

/*
  La atadura es cosa de los dos paneles uno al lado del otro, que es donde el
  ancho de uno se lo quita al otro. Con un solo panel a la vista nadie le
  disputa el ancho a la hoja, y en una pantalla estrecha los paneles van uno
  encima del otro y no hay separador que mover: en los dos casos el interruptor
  se retira y la lupa vuelve a ser libre.
*/
test('la atadura solo existe con los dos paneles uno al lado del otro', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.setViewportSize({ width: 1500, height: 900 });
  await page.evaluate(() => window.__applyDocumentFormatToPreview());
  const interruptor = page.locator('#preview-link-toggle');
  assert.equal(await interruptor.isVisible(), true);

  // Con la vista previa sola: sin interruptor, y la lupa se mueve y se queda.
  await page.locator('#layout-switch [data-layout="html"]').click();
  await page.waitForTimeout(500);
  assert.equal(await interruptor.isVisible(), false);

  await page.locator('#preview-zoom-out').click();
  const bajado = await page.locator('#preview-zoom-value').innerText();
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator('#preview-zoom-value').innerText(),
    bajado,
    'la lupa volvió sola a llenar el panel sin nadie con quien repartirlo',
  );

  // Y en una pantalla de móvil, donde los paneles se apilan, tampoco está.
  await page.locator('#layout-switch [data-layout="dual"]').click();
  await page.waitForTimeout(500);
  assert.equal(await interruptor.isVisible(), true);
  await page.setViewportSize({ width: 420, height: 800 });
  await page.waitForTimeout(600);
  assert.equal(await interruptor.isVisible(), false);
});

/*
  El motor de la aplicación de escritorio en Linux es WebKitGTK, que imprime
  con los márgenes de su cuadro del sistema —0,25 pulgadas, y ese cuadro no
  deja cambiarlos— y no con los de `@page`: un documento de 4 cm salía con
  0,63. Allí los márgenes se dan como relleno del texto, descontando los que
  pone el cuadro para que la suma sea la pedida.
*/
test('en el escritorio con WebKitGTK los márgenes van como relleno', async (t) => {
  const { context, page } = await openApp({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  });
  t.after(() => context.close());

  await page.evaluate(() => document.body.classList.add('desktop-mode'));
  await page.locator('#new-tab-btn').click();
  await page.locator('#markdown-input').fill('---\nmargin-top: "4"\nmargin-left: "4"\n---\n\nTexto\n');
  await page.waitForFunction(
    () => (document.getElementById('doc-print-page-style')?.textContent || '').includes('padding-left'),
  );

  const regla = await page.evaluate(() => document.getElementById('doc-print-page-style').textContent);
  // 4 cm menos los 0,635 que pone el cuadro: la suma vuelve a ser 4.
  assert.match(regla, /padding-left: 3\.365cm !important;/);
  assert.match(regla, /padding-top: 3\.365cm !important;/);
  assert.match(regla, /@page \{ size: A4; margin: 0; \}/);
  assert.ok(!/margin-left: 4cm/.test(regla), 'el margen de @page no debe seguir puesto: allí no llega');

  // Un margen más pequeño que el del cuadro no puede quedar en negativo.
  await page.locator('#markdown-input').fill('---\nmargin-left: "0.2"\n---\n\nTexto\n');
  await page.waitForFunction(
    () => (document.getElementById('doc-print-page-style')?.textContent || '').includes('padding-left: 0.000cm'),
  );
});
