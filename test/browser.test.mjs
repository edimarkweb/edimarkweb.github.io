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
test('el JSONP de analítica no alcanza la página que lo carga', async (t) => {
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
  Los ajustes de LaTeX solo sirven si sobreviven a la sesión: se guardan en el
  almacenamiento local y el exportador los recoge de window.
*/
test('los ajustes de LaTeX se guardan y se recuperan al volver', async (t) => {
  const { context, page } = await openApp();
  t.after(() => context.close());

  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
  await page.locator('#latex-documentclass').selectOption('report');
  await page.locator('#latex-classoption').fill('12pt, a4paper');
  await page.locator('#latex-preamble').fill('\\usepackage{amsthm}');
  await page.locator('#latex-settings-save-btn').click();

  assert.deepEqual(
    await page.evaluate(() => window.__edimarkLatexSettings),
    { documentClass: 'report', classOptions: '12pt, a4paper', preamble: '\\usepackage{amsthm}' }
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.tab-name').first().waitFor();
  await page.locator('#settings-menu-btn').click();
  await page.locator('#latex-settings-btn').click();
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
