/*
  End-to-end checks against the bundled pandoc.wasm.

  These exist because Pandoc signals an internal failure by leaving its output
  file empty instead of throwing: a broken export used to reach the user as a
  0-byte download labelled "export completed". Every case below therefore
  asserts on real bytes coming out of the real converter.

  Slow by design (the WASM module is ~50 MB): run with `npm run test:export`.
*/
import test from 'node:test';
import assert from 'node:assert/strict';

import { runPandoc, readZipEntries } from './helpers/pandoc-runner.mjs';
import {
  buildExportArgs,
  ensureEpubMetadata,
  collectRemoteImageUrls,
  dropImagesByUrl,
} from '../pandoc-prepare.js';

// Mirrors what exportDocument() sends for format 'epub'.
function exportEpub(markdown, { fallbackTitle = 'documento', lang = 'es' } = {}) {
  const prepared = ensureEpubMetadata(markdown, { fallbackTitle, lang });
  const args = buildExportArgs('epub3', { mathml: true, titleFromHeading: prepared.titleFromHeading });
  return runPandoc(args, prepared.markdown);
}

function assertValidEpub(result, label) {
  assert.ok(
    result.bytes.length > 0,
    `${label}: EPUB vacío (0 bytes). stderr: ${result.stderr.join(' | ') || '(sin salida)'}`,
  );
  const entries = readZipEntries(result.bytes);
  assert.equal(entries.get('mimetype')?.toString('utf8'), 'application/epub+zip', `${label}: mimetype`);
  assert.ok(entries.has('META-INF/container.xml'), `${label}: falta container.xml`);
  assert.ok(entries.has('EPUB/content.opf'), `${label}: falta content.opf`);
  assert.ok(entries.has('EPUB/nav.xhtml'), `${label}: falta nav.xhtml`);
  return entries;
}

const DOCUMENTS = {
  'texto simple': '# Título\n\nUn párrafo normal.\n',
  'acentos y emoji': '# Año 2026 — ñandú 🎓\n\nCafé, camión, ¿qué tal?\n',
  'matemáticas': '# Mates\n\nEn línea $a^2+b^2=c^2$.\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$\n',
  'LaTeX crudo': '# Crudo\n\n\\textbf{negrita} y \\emph{cursiva}\n',
  'tabla': '# Tabla\n\n| a | b |\n|---|---|\n| 1 | 2 |\n',
  'bloque de código': '# Código\n\n```python\nprint("hola")\n```\n',
  'HTML incrustado': '# HTML\n\n<div class="aviso">contenido</div>\n',
  'listas y cita': '# Listas\n\n- uno\n- dos\n\n1. a\n2. b\n\n> cita\n',
  'nota al pie': '# Notas\n\nTexto[^1]\n\n[^1]: la nota\n',
  'enlaces': '# Enlaces\n\n[web](https://ejemplo.org) y <https://ejemplo.org>\n',
  'imagen data URI': '# Imagen\n\n![a](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)\n',
  'sin encabezado': 'Solo un párrafo suelto, sin ningún encabezado.\n',
  'raya horizontal inicial': '---\n\n# Tras la raya\n\nTexto.\n',
  'front matter propio': '---\ntitle: "Título propio"\nlang: gl\n---\n\n# Cuerpo\n\nTexto.\n',
};

for (const [label, markdown] of Object.entries(DOCUMENTS)) {
  test(`exporta EPUB no vacío: ${label}`, { timeout: 180000 }, async () => {
    assertValidEpub(await exportEpub(markdown), label);
  });
}

test('el EPUB lleva el título del encabezado y el idioma de la interfaz', { timeout: 180000 }, async () => {
  const result = await exportEpub('# Guía de estudio\n\nTexto.\n', { lang: 'ca' });
  const entries = assertValidEpub(result, 'metadatos');
  const opf = entries.get('EPUB/content.opf').toString('utf8');
  assert.match(opf, /<dc:title[^>]*>Guía de estudio<\/dc:title>/);
  assert.match(opf, /<dc:language>ca<\/dc:language>/);
  // Sin título propio Pandoc usaría el nombre del fichero temporal.
  assert.doesNotMatch(opf, /<dc:title[^>]*>in<\/dc:title>/);
});

test('sin encabezado se usa el nombre del documento como título', { timeout: 180000 }, async () => {
  const result = await exportEpub('Solo texto.\n', { fallbackTitle: 'apuntes de clase' });
  const entries = assertValidEpub(result, 'título de respaldo');
  const opf = entries.get('EPUB/content.opf').toString('utf8');
  assert.match(opf, /<dc:title[^>]*>apuntes de clase<\/dc:title>/);
});

test('el título no se repite: hay portada solo si el cuerpo no lo muestra', { timeout: 180000 }, async () => {
  const conEncabezado = await exportEpub('# Mi libro\n\nTexto.\n');
  const entradasConEncabezado = assertValidEpub(conEncabezado, 'con encabezado');
  assert.ok(
    !entradasConEncabezado.has('EPUB/text/title_page.xhtml'),
    'el cuerpo ya abre con el título, no debería añadirse portada',
  );

  const sinEncabezado = await exportEpub('Solo texto.\n', { fallbackTitle: 'apuntes' });
  const entradasSinEncabezado = assertValidEpub(sinEncabezado, 'sin encabezado');
  assert.ok(
    entradasSinEncabezado.has('EPUB/text/title_page.xhtml'),
    'sin título en el cuerpo debería generarse la portada',
  );
});

test('una imagen remota sin resolver rompe la conversión (razón de inlineRemoteImages)', { timeout: 180000 }, async () => {
  const markdown = '# Con imagen\n\n![alt](https://ejemplo.org/foto.png)\n';
  const result = await exportEpub(markdown);
  assert.equal(result.bytes.length, 0, 'se esperaba que Pandoc fallara sin red');
  assert.ok(
    result.stderr.some(line => line.includes('openURL')),
    `stderr inesperado: ${result.stderr.join(' | ')}`,
  );
});

test('omitir las imágenes que no se pueden descargar salva la exportación', { timeout: 180000 }, async () => {
  const markdown = '# Con imagen\n\n![Diagrama](https://ejemplo.org/foto.png)\n\nTexto final.\n';
  const urls = collectRemoteImageUrls(markdown);
  assert.deepEqual(urls, ['https://ejemplo.org/foto.png']);

  const entries = assertValidEpub(await exportEpub(dropImagesByUrl(markdown, urls)), 'imagen omitida');
  const chapter = [...entries.entries()].find(([name]) => name.includes('/text/ch'))[1].toString('utf8');
  assert.match(chapter, /Diagrama/, 'debería conservarse el texto alternativo');
  assert.doesNotMatch(chapter, /ejemplo\.org/);
});

test('una imagen data URI acaba incrustada en el EPUB', { timeout: 180000 }, async () => {
  const markdown = '# Imagen\n\n![a](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)\n';
  const entries = assertValidEpub(await exportEpub(markdown), 'data URI');
  assert.ok(
    [...entries.keys()].some(name => name.startsWith('EPUB/media/')),
    `la imagen no se incrustó: ${[...entries.keys()].join(', ')}`,
  );
});

test('DOCX y ODT siguen exportando correctamente', { timeout: 180000 }, async () => {
  const markdown = '# Documento\n\nTexto con $a^2$ y una tabla.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n';
  for (const [format, mathml] of [['docx', false], ['odt', true]]) {
    const result = await runPandoc(buildExportArgs(format, { mathml }), markdown);
    assert.ok(
      result.bytes.length > 0,
      `${format}: salida vacía. stderr: ${result.stderr.join(' | ')}`,
    );
    assert.equal(result.bytes[0], 0x50, `${format}: no parece un ZIP`);
  }
});
