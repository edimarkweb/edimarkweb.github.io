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
