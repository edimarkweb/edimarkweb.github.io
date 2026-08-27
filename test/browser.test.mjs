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

async function openApp({ locale = 'es-ES', initStorage, permissions } = {}) {
  const context = await browser.newContext({ locale, ...(permissions ? { permissions } : {}) });
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
  const bottomGap = await page.locator('#markdown-input').evaluate((editor) => (
    window.innerHeight - editor.getBoundingClientRect().bottom
  ));
  assert.ok(bottomGap >= 15 && bottomGap <= 17, `margen inferior inesperado: ${bottomGap}px`);

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

  // Con el foco en la previsualización no se escribe en el Markdown: los
  // botones de fórmulas quedan apagados como el resto del formato.
  await page.locator('#html-output').focus();
  assert.equal(await page.locator('#formula-btn').getAttribute('data-controls-disabled'), 'true');
  assert.equal(await page.locator('#open-edicuatex-btn').getAttribute('data-controls-disabled'), 'true');
  // El botón sigue recibiendo el clic —así avisa de por qué no hace nada—,
  // pero Playwright lo ve deshabilitado por aria-disabled: hay que forzarlo.
  await page.locator('#open-edicuatex-btn').click({ force: true });
  assert.equal(await page.locator('#edicuatex-modal-overlay').isVisible(), false);

  await page.locator('#markdown-input').focus();
  assert.equal(await page.locator('#formula-btn').getAttribute('data-controls-disabled'), null);
  assert.equal(await page.locator('#open-edicuatex-btn').getAttribute('data-controls-disabled'), null);
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
        'edimarkweb-fontsize': '20',
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
    await page.locator('html').evaluate(html => html.style.getPropertyValue('--fs-base')),
    '20px',
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
  await page.locator('[data-export-format="pdf"]').click();
  await page.waitForFunction(() => window.__impresiones === 1);
  assert.equal(await page.locator('#export-menu').isVisible(), false);
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

  // El panel derecho pasa a mostrar el código HTML y se edita allí.
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

test('el menú único cambia entre las tres disposiciones y respeta el orden de la barra', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  assert.equal(await page.locator('#new-tab-btn').evaluate(button => button.previousElementSibling?.id), 'tab-bar');
  assert.equal(await page.locator('#layout-menu-container').evaluate(container => container.nextElementSibling?.id), 'focus-mode-toggle');
  assert.equal(await page.locator('#focus-mode-toggle').evaluate(button => button.nextElementSibling?.id), 'toggle-width-btn');

  await page.locator('#layout-menu-btn').click();
  await page.locator('[data-layout="md"]').click();
  assert.equal(await page.locator('#markdown-panel').isVisible(), true);
  assert.equal(await page.locator('#html-panel').isVisible(), false);
  assert.equal(await page.locator('[data-layout="md"]').getAttribute('aria-checked'), 'true');

  await page.locator('#layout-menu-btn').click();
  await page.locator('[data-layout="html"]').click();
  assert.equal(await page.locator('#markdown-panel').isVisible(), false);
  assert.equal(await page.locator('#html-panel').isVisible(), true);

  await page.locator('#layout-menu-btn').click();
  await page.locator('[data-layout="dual"]').click();
  assert.equal(await page.locator('#markdown-panel').isVisible(), true);
  assert.equal(await page.locator('#html-panel').isVisible(), true);
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
        Sin tocar el formato del texto, sus ajustes quedan sin fijar salvo el
        tamaño, que trae número de partida: la vista previa dejó de seguir al
        de la interfaz y sin él no tendría ninguno que enseñar.
      */
      documentFormat: {
        align: '',
        font: '',
        fontSize: '12',
        lineHeight: '',
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
  assert.deepEqual(styles, { align: 'justify', size: '13pt', padding: '2.5cm', hyphens: 'auto' });

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

  assert.match(await acorde('Digit1'), /^# Hola/);
  assert.match(await acorde('Digit2'), /<h1[^>]*>Hola<\/h1>/);

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
  Dos ajustes que se veían igual y significan cosas distintas: el tamaño de
  Configuración es la comodidad de quien escribe, y el de Formato del texto es
  el aspecto del archivo que se entrega. Antes el primero movía los dos
  paneles, así que la vista previa mentía sobre lo que iba a exportarse.
*/
test('el tamaño de texto mueve el editor y deja quieta la vista previa', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#markdown-input').fill('# Hola\n\nUn párrafo de prueba.');
  await page.waitForFunction(() => document.querySelector('#html-output p'));

  const medir = () => page.evaluate(() => ({
    editor: getComputedStyle(document.querySelector('.CodeMirror')).fontSize,
    previa: getComputedStyle(document.querySelector('#html-output')).fontSize,
  }));

  const antes = await medir();
  const opciones = await page.evaluate(() => {
    const select = document.getElementById('font-size-select');
    const valores = Array.from(select.options).map(option => option.value);
    select.value = valores[valores.length - 1];
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return valores;
  });
  const despues = await medir();

  assert.ok(opciones.length > 1, 'el selector de tamaño no ofrece opciones');
  assert.equal(despues.editor, `${opciones[opciones.length - 1]}px`, 'el editor no siguió al ajuste');
  assert.notEqual(despues.editor, antes.editor, 'el ajuste no cambió nada');
  assert.equal(despues.previa, antes.previa, 'la vista previa siguió al ajuste de la interfaz');
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

  await page.locator('#markdown-input').fill('# Hola\n\nUn párrafo.');
  await page.waitForFunction(() => document.querySelector('#html-output p'));

  // El ajuste general lo declara, no se queda vacío.
  assert.equal(
    await page.evaluate(() => (window.__edimarkLatexSettings || {}).documentFormat?.fontSize),
    '12',
  );
  // Y llega a la vista previa como estilo propio, en puntos.
  assert.equal(
    await page.evaluate(() => document.getElementById('html-output').style.fontSize),
    '12pt',
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
