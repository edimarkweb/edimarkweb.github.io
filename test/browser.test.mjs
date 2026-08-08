import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox } from '@playwright/test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

async function openApp({ locale = 'es-ES', initStorage } = {}) {
  const context = await browser.newContext({ locale });
  if (initStorage) {
    await context.addInitScript(initStorage);
  }
  await context.route(/pandoc\.b64(?:\.gz)?(?:\?.*)?$/, route => (
    route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  ));
  await context.route(/\/imagenes\//, route => route.abort());
  const requests = [];
  const page = await context.newPage();
  page.on('request', request => requests.push(request.url()));
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
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

test('los controles base64 y de pegado se traducen', async (t) => {
  const { context, page } = await openApp({ locale: 'en-US' });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(await page.locator('#paste-btn').getAttribute('title'), 'Paste from clipboard');
  await page.locator('#new-tab-btn').click();
  await page.evaluate(() => markdownEditor.setValue('![Demo](data:image/png;base64,iVBORw0KGgo=)'));
  await page.locator('.base64-hidden-title').getByText('Hidden base64 images', { exact: true }).waitFor();
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

test('el pie muestra la versión de package.json en cada idioma', async (t) => {
  const packageVersion = JSON.parse(await readFile(resolve(repoRoot, 'package.json'), 'utf8')).version;
  const { context, page } = await openApp({ locale: 'en-US' });
  t.after(() => context.close());

  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(
    await page.locator('[data-i18n-key="footer_version"]').textContent(),
    `Version ${packageVersion}.`,
  );
  // El marcador no puede llegar nunca a la vista.
  assert.doesNotMatch(await page.locator('.site-footer').textContent(), /\{version\}/);
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
  await page.locator('.base64-hidden-item').first().waitFor();

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
