import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'dist');

const appFiles = [
  'asset-paths.js',
  'desktop-updater.js',
  'document-format.js',
  'favicon.ico',
  'i18n.js',
  'index.html',
  'logo_100px.png',
  'logo_256.png',
  'manifest.json',
  'manual-ca.md',
  'manual-en.md',
  'manual-eu.md',
  'manual-gl.md',
  'manual.md',
  'odt-formulas.js',
  'office-format.js',
  'odt-tables.js',
  'pandoc-exporter.js',
  'pandoc-prepare.js',
  'pandoc-wasm.js',
  'pandoc.b64',
  'pandoc.b64.gz',
  'package.json',
  'platform-api.js',
  'script.js',
  'search.js',
  'style.css',
  'tailwind.build.css',
  'zip-reader.js',
  'zip-writer.js',
];

const directories = ['locales', 'vendor/edicuatex'];

const vendorFiles = new Map([
  ['node_modules/marked/lib/marked.umd.js', 'vendor/marked.umd.js'],
  ['node_modules/turndown/dist/turndown.js', 'vendor/turndown.js'],
  ['vendor/turndown-plugin-gfm.js', 'vendor/turndown-plugin-gfm.js'],
  ['node_modules/katex/dist/katex.min.css', 'vendor/katex/katex.min.css'],
  ['node_modules/katex/dist/katex.min.js', 'vendor/katex/katex.min.js'],
  ['node_modules/katex/dist/contrib/auto-render.min.js', 'vendor/katex/auto-render.min.js'],
  ['node_modules/lucide/dist/umd/lucide.min.js', 'vendor/lucide.min.js'],
  ['node_modules/codemirror/lib/codemirror.css', 'vendor/codemirror/codemirror.min.css'],
  ['node_modules/codemirror/theme/eclipse.css', 'vendor/codemirror/theme/eclipse.min.css'],
  ['node_modules/codemirror/theme/material-darker.css', 'vendor/codemirror/theme/material-darker.min.css'],
  ['node_modules/codemirror/lib/codemirror.js', 'vendor/codemirror/codemirror.min.js'],
  ['node_modules/codemirror/addon/mode/overlay.js', 'vendor/codemirror/addon/mode/overlay.min.js'],
  ['node_modules/codemirror/addon/search/searchcursor.js', 'vendor/codemirror/addon/search/searchcursor.js'],
  ['node_modules/codemirror/mode/xml/xml.js', 'vendor/codemirror/mode/xml/xml.min.js'],
  ['node_modules/codemirror/mode/javascript/javascript.js', 'vendor/codemirror/mode/javascript/javascript.min.js'],
  ['node_modules/codemirror/mode/css/css.js', 'vendor/codemirror/mode/css/css.min.js'],
  ['node_modules/codemirror/mode/htmlmixed/htmlmixed.js', 'vendor/codemirror/mode/htmlmixed/htmlmixed.min.js'],
  ['node_modules/codemirror/mode/markdown/markdown.js', 'vendor/codemirror/mode/markdown/markdown.min.js'],
  ['node_modules/codemirror/mode/gfm/gfm.js', 'vendor/codemirror/mode/gfm/gfm.min.js'],
  ['node_modules/codemirror/addon/edit/continuelist.js', 'vendor/codemirror/addon/edit/continuelist.min.js'],
  ['node_modules/split.js/dist/split.min.js', 'vendor/split.min.js'],
]);

const indexReplacements = new Map([
  ['https://cdn.jsdelivr.net/npm/marked@18.0.9/lib/marked.umd.js', 'vendor/marked.umd.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/turndown/7.1.1/turndown.min.js', 'vendor/turndown.js'],
  ['https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css', 'vendor/katex/katex.min.css'],
  ['https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js', 'vendor/katex/katex.min.js'],
  ['https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/contrib/auto-render.min.js', 'vendor/katex/auto-render.min.js'],
  ['https://cdn.jsdelivr.net/npm/lucide@0.523.0/dist/umd/lucide.min.js', 'vendor/lucide.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.css', 'vendor/codemirror/codemirror.min.css'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/theme/eclipse.min.css', 'vendor/codemirror/theme/eclipse.min.css'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/theme/material-darker.min.css', 'vendor/codemirror/theme/material-darker.min.css'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/codemirror.min.js', 'vendor/codemirror/codemirror.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/addon/mode/overlay.min.js', 'vendor/codemirror/addon/mode/overlay.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/addon/search/searchcursor.js', 'vendor/codemirror/addon/search/searchcursor.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/xml/xml.min.js', 'vendor/codemirror/mode/xml/xml.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/javascript/javascript.min.js', 'vendor/codemirror/mode/javascript/javascript.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/css/css.min.js', 'vendor/codemirror/mode/css/css.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/htmlmixed/htmlmixed.min.js', 'vendor/codemirror/mode/htmlmixed/htmlmixed.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/markdown/markdown.min.js', 'vendor/codemirror/mode/markdown/markdown.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/mode/gfm/gfm.min.js', 'vendor/codemirror/mode/gfm/gfm.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.15/addon/edit/continuelist.min.js', 'vendor/codemirror/addon/edit/continuelist.min.js'],
  ['https://cdn.jsdelivr.net/npm/split.js@1.6.5/dist/split.min.js', 'vendor/split.min.js'],
]);

async function copyFile(source, destination) {
  const absoluteDestination = join(outputRoot, destination);
  await mkdir(dirname(absoluteDestination), { recursive: true });
  await cp(join(projectRoot, source), absoluteDestination);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const file of appFiles) await copyFile(file, file);
for (const directory of directories) {
  await mkdir(dirname(join(outputRoot, directory)), { recursive: true });
  await cp(join(projectRoot, directory), join(outputRoot, directory), { recursive: true });
}
for (const [source, destination] of vendorFiles) await copyFile(source, destination);

await build({
  entryPoints: [join(projectRoot, 'platform-tauri-entry.js')],
  outfile: join(outputRoot, 'platform-tauri.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome105', 'safari15'],
  minify: true,
});

await cp(
  join(projectRoot, 'node_modules/katex/dist/fonts'),
  join(outputRoot, 'vendor/katex/fonts'),
  { recursive: true },
);
await cp(
  join(projectRoot, 'node_modules/@bjorn3/browser_wasi_shim/dist'),
  join(outputRoot, 'vendor/browser-wasi-shim'),
  { recursive: true },
);

let indexHtml = await readFile(join(outputRoot, 'index.html'), 'utf8');
for (const [remoteUrl, localUrl] of indexReplacements) {
  if (!indexHtml.includes(remoteUrl)) throw new Error(`No se encontró la dependencia ${remoteUrl}`);
  indexHtml = indexHtml.replaceAll(remoteUrl, localUrl);
}
// Las sumas SRI corresponden a los ficheros minificados de cada CDN. Algunas
// copias de npm son equivalentes pero no byte a byte, así que el WebView las
// bloquearía si conservásemos los atributos de la versión remota.
indexHtml = indexHtml
  .replace(/\s+integrity="[^"]*"/g, '')
  .replace(/\s+crossorigin="anonymous"/g, '');
// En escritorio no hay visitas web que medir. Además, retirar este único
// script en línea permite aplicar una CSP que bloquee manejadores HTML como
// `onerror` dentro de documentos Markdown abiertos por el usuario.
const analyticsBlock = /\s*<script>\s*\(function \(\) \{\s*var ANALYTICS_FALLBACK_ENDPOINT[\s\S]*?\}\)\(\);\s*<\/script>/;
if (!analyticsBlock.test(indexHtml)) throw new Error('No se encontró el bloque de analítica');
indexHtml = indexHtml.replace(analyticsBlock, '');
const platformScript = '<script src="platform-api.js"></script>';
if (!indexHtml.includes(platformScript)) throw new Error('No se encontró la API de plataforma');
indexHtml = indexHtml.replace(
  platformScript,
  '<script src="platform-tauri.js"></script>\n    <script src="platform-api.js"></script>',
);
await writeFile(join(outputRoot, 'index.html'), indexHtml);

const wasiRemoteUrl = 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js';
const pandocPath = join(outputRoot, 'pandoc-wasm.js');
let pandocBridge = await readFile(pandocPath, 'utf8');
if (!pandocBridge.includes(wasiRemoteUrl)) throw new Error('No se encontró la importación del shim WASI');
pandocBridge = pandocBridge.replace(wasiRemoteUrl, './vendor/browser-wasi-shim/index.js');
await writeFile(pandocPath, pandocBridge);

const remainingRemoteDependencies = [...indexHtml.matchAll(/(?:src|href)="(https?:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)[^\"]+)"/g)]
  .map(match => match[1]);
if (remainingRemoteDependencies.length) {
  throw new Error(`Quedan dependencias remotas: ${remainingRemoteDependencies.join(', ')}`);
}

console.log(`Aplicación de escritorio preparada en ${outputRoot}`);
