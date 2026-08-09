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
  MARKDOWN_READER_NO_AUTO_IDS,
  buildExportArgs,
  ensureEpubMetadata,
  collectRemoteImageUrls,
  dropImagesByUrl,
  normalizeNewlines,
  normalizeThematicBreaks,
  trimInlineMath,
  buildImportArgs,
  prepareLatexStandalone,
  stripEpubAnchorPrefixes,
  inlineArchiveImages,
  restoreOdtTableHeaders,
  prepareOdtForImport,
} from '../pandoc-prepare.js';

// Mirrors what exportDocument() sends for format 'epub'.
function exportEpub(markdown, { fallbackTitle = 'documento', lang = 'es' } = {}) {
  const prepared = ensureEpubMetadata(normalizeThematicBreaks(markdown), { fallbackTitle, lang });
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

/*
  Reproduce el documento que motivó normalizeThematicBreaks: secciones separadas
  por `---`, alguna de ellas seguida inmediatamente por texto en negrita. Pandoc
  lee ese `---` como el delimitador de un bloque YAML y el `*` de la línea
  siguiente como un alias, así que aborta la conversión entera.
*/
const CON_RAYAS = `# Catálogo\n\nIntroducción con *cursiva* y **negrita**.\n\n---\n\n${
  Array.from({ length: 30 }, (_, i) =>
    `## Sección ${i + 1}\n\n_Texto en cursiva._\n\n- punto uno\n- punto dos\n\n---\n${
      i % 5 === 4 ? '**Destacado**: sin línea en blanco tras la raya.\n\n---\n' : ''}`,
  ).join('\n')}`;

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
  // Documento largo con rayas --- entre secciones: Pandoc las leía como
  // metadatos YAML y abortaba la conversión sin producir nada.
  'rayas --- entre secciones': CON_RAYAS,
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

test('una imagen remota sin resolver rompe la conversión (razón de inlineFetchableImages)', { timeout: 180000 }, async () => {
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

function textOf(entries) {
  return [...entries.entries()]
    .filter(([name]) => name.endsWith('.xhtml'))
    .map(([, content]) => content.toString('utf8'))
    .join('\n');
}

/*
  Sin normalizar, un `---` que va tras una línea en blanco abre un bloque de
  metadatos YAML. Si lo que sigue no es YAML válido, Pandoc aborta y no escribe
  nada: exactamente el EPUB de 0 bytes que motivó esta prueba.
*/
test('las rayas --- sin normalizar abortan la conversión', { timeout: 180000 }, async () => {
  const result = await runPandoc(buildExportArgs('epub3', { mathml: true }), CON_RAYAS);
  assert.equal(result.bytes.length, 0, 'se esperaba un fallo de parseo YAML');
  assert.ok(
    result.stderr.some(line => line.includes('YAML')),
    `stderr inesperado: ${result.stderr.join(' | ')}`,
  );
});

test('tras normalizar no se pierde ninguna sección', { timeout: 180000 }, async () => {
  const entries = assertValidEpub(await exportEpub(CON_RAYAS), 'documento con rayas');
  const texto = textOf(entries);
  for (const n of [1, 15, 30]) {
    assert.ok(texto.includes(`Sección ${n}`), `falta la sección ${n} en el EPUB`);
  }
  assert.match(texto, /<hr\s*\/?>/, 'las rayas deberían seguir siendo líneas horizontales');
});

test('un encabezado setext sigue siendo un encabezado tras normalizar', { timeout: 180000 }, async () => {
  const entries = assertValidEpub(await exportEpub('# Doc\n\nSubtítulo real\n---\n\nTexto.\n'), 'setext');
  const chapter = [...entries.entries()].find(([name]) => name.includes('/text/ch'))[1].toString('utf8');
  assert.match(chapter, /<h2[^>]*>Subtítulo real<\/h2>/);
});

test('DOCX y ODT siguen exportando correctamente', { timeout: 180000 }, async () => {
  const markdown = normalizeThematicBreaks('# Documento\n\nTexto con $a^2$ y una tabla.\n\n---\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
  for (const [format, mathml] of [['docx', false], ['odt', true]]) {
    const result = await runPandoc(buildExportArgs(format, { mathml }), markdown);
    assert.ok(
      result.bytes.length > 0,
      `${format}: salida vacía. stderr: ${result.stderr.join(' | ')}`,
    );
    assert.equal(result.bytes[0], 0x50, `${format}: no parece un ZIP`);
  }
});

test('un EPUB se puede volver a importar como Markdown limpio', { timeout: 180000 }, async () => {
  const original = [
    '# Manual',
    '',
    'Ver el [índice](#seccion-uno).',
    '',
    '## Sección uno',
    '',
    'Texto con **negrita**, *cursiva* y $a^2+b^2$.',
    '',
    '- punto uno',
    '- punto dos',
    '',
    '> una cita',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
  ].join('\n');

  const exported = await exportEpub(original);
  assertValidEpub(exported, 'ida y vuelta');

  const imported = await runPandoc(buildImportArgs('epub'), exported.bytes);
  assert.ok(imported.bytes.length > 0, `importación vacía: ${imported.stderr.join(' | ')}`);
  const markdown = stripEpubAnchorPrefixes(new TextDecoder().decode(imported.bytes));

  // Sin las extensiones desactivadas, Pandoc devolvería divs y anclas vacías.
  assert.doesNotMatch(markdown, /^:::/m, 'no debería haber bloques :::');
  assert.doesNotMatch(markdown, /\[\]\{#/, 'no debería haber anclas vacías');
  assert.doesNotMatch(markdown, /\.xhtml/, 'no deberían quedar referencias al EPUB');

  assert.match(markdown, /^# Manual$/m);
  assert.match(markdown, /^## Sección uno$/m);
  assert.match(markdown, /\*\*negrita\*\*/);
  assert.match(markdown, /^- +punto uno$/m);
  assert.match(markdown, /^> una cita$/m);
  assert.match(markdown, /\(#seccion-uno\)/);
});

const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

/*
  Pandoc only returns text, so an imported image points at a path inside the
  uploaded archive (Pictures/…, media/…) that no longer exists. The image has to
  be pulled out of the file itself.
*/
for (const [label, exportFormat, importFormat] of [
  ['DOCX', 'docx', 'docx'],
  ['ODT', 'odt', 'odt'],
  ['EPUB', 'epub3', 'epub'],
]) {
  test(`las imágenes sobreviven al viaje de ida y vuelta en ${label}`, { timeout: 180000 }, async () => {
    const source = `# Prueba\n\nAntes.\n\n![Un gato](${PNG_DATA_URI})\n\nDespués.\n`;
    const prepared = ensureEpubMetadata(source, { fallbackTitle: 'doc', lang: 'es' });
    const exported = await runPandoc(
      buildExportArgs(exportFormat, { mathml: exportFormat !== 'docx', titleFromHeading: prepared.titleFromHeading }),
      exportFormat === 'epub3' ? prepared.markdown : source,
    );
    assert.ok(exported.bytes.length > 0, `exportación vacía: ${exported.stderr.join(' | ')}`);

    const imported = await runPandoc(buildImportArgs(importFormat), exported.bytes);
    assert.ok(imported.bytes.length > 0, `importación vacía: ${imported.stderr.join(' | ')}`);
    const raw = new TextDecoder().decode(imported.bytes);

    // Pandoc devuelve una ruta interna del archivo, no la imagen.
    assert.match(raw, /!\[[^\]]*\]\([^)]+\)/, 'no hay ninguna imagen en el Markdown importado');
    assert.doesNotMatch(raw, /\{width=/, 'los atributos de tamaño saldrían como texto en la previsualización');
    assert.doesNotMatch(raw, /<img/, 'no debería aparecer HTML crudo');

    const resolved = await inlineArchiveImages(raw, exported.bytes);
    assert.match(resolved, /!\[[^\]]*\]\(data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+\)/, 'la imagen no quedó incrustada');
  });
}

/*
  Pandoc's default Markdown writer aligns tables with spaces. The preview only
  understands pipe tables, so an imported table used to show up as plain text.
*/
for (const [label, exportFormat, importFormat] of [
  ['DOCX', 'docx', 'docx'],
  ['ODT', 'odt', 'odt'],
  ['EPUB', 'epub3', 'epub'],
]) {
  test(`las tablas vuelven como tabla Markdown desde ${label}`, { timeout: 180000 }, async () => {
    const source = '# Datos\n\n| Nombre | Edad | Ciudad    |\n|--------|------|-----------|\n| Ana    | 28   | Barcelona |\n| Marta  | 42   | Valencia  |\n';
    const prepared = ensureEpubMetadata(source, { fallbackTitle: 'doc', lang: 'es' });
    const exported = await runPandoc(
      buildExportArgs(exportFormat, { mathml: exportFormat !== 'docx', titleFromHeading: prepared.titleFromHeading }),
      exportFormat === 'epub3' ? prepared.markdown : source,
    );
    assert.ok(exported.bytes.length > 0, `exportación vacía: ${exported.stderr.join(' | ')}`);

    const imported = await runPandoc(buildImportArgs(importFormat), exported.bytes);
    let markdown = new TextDecoder().decode(imported.bytes);
    // El lector ODT de Pandoc descarta <table:table-header-rows>; la app lo
    // recupera del propio archivo, así que la prueba hace lo mismo.
    if (importFormat === 'odt') {
      markdown = await restoreOdtTableHeaders(markdown, exported.bytes);
    }

    // Lo esencial: una tabla de tuberías, no texto alineado con espacios.
    assert.match(markdown, /^\|.*\|$/m, `sin tabla de tuberías:\n${markdown}`);
    assert.match(markdown, /^\|[-:| ]+\|$/m, 'falta la fila separadora');
    assert.match(markdown, /\|\s*Ana\s*\|\s*28\s*\|\s*Barcelona\s*\|/);
    assert.match(markdown, /\|\s*Marta\s*\|\s*42\s*\|\s*Valencia\s*\|/);
    assert.match(markdown, /^\|\s*Nombre\s*\|\s*Edad\s*\|\s*Ciudad\s*\|/m, 'se perdió el encabezado');
  });
}

/*
  Fórmulas. El manual las escribe con $…$ y $$…$$, y los botones de la barra
  insertan además \(…\) y \[…\]: las cuatro variantes tienen que llegar al
  documento exportado, no solo producir un archivo no vacío.
*/
const MATH_CASES = [
  [
    'dólares (como el manual)',
    '## Fórmulas\n\nComo $ax^2 + bx + c = 0$, se utiliza:\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\n$$\n',
    /ax\^\{?2\}?/,
  ],
  [
    'barra invertida',
    '## Fórmulas\n\nEn línea \\(E = mc^2\\) y en bloque:\n\n\\[\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n\\]\n',
    /mc\^\{?2\}?/,
  ],
];

// Igual que exportDocument()/generateLatex()/generateHtml() antes de Pandoc.
function prepareForExport(markdown) {
  return normalizeThematicBreaks(normalizeNewlines(trimInlineMath(markdown)));
}

for (const [label, markdown, cuerpo] of MATH_CASES) {
  test(`las fórmulas llegan a LaTeX: ${label}`, { timeout: 180000 }, async () => {
    const args = `-f ${MARKDOWN_READER_NO_AUTO_IDS} -t latex --no-highlight`;
    const result = await runPandoc(args, prepareForExport(markdown));
    assert.ok(result.bytes.length > 0, `salida vacía: ${result.stderr.join(' | ')}`);
    const tex = new TextDecoder().decode(result.bytes);
    assert.match(tex, /\\\(|\\\[|\$/, 'sin delimitadores matemáticos');
    assert.match(tex, cuerpo, `no aparece la fórmula:\n${tex}`);
  });

  test(`las fórmulas llegan a HTML: ${label}`, { timeout: 180000 }, async () => {
    const args = `-f ${MARKDOWN_READER_NO_AUTO_IDS} -t html --mathjax -s`;
    const result = await runPandoc(args, prepareForExport(markdown));
    assert.ok(result.bytes.length > 0, `salida vacía: ${result.stderr.join(' | ')}`);
    const html = new TextDecoder().decode(result.bytes);
    assert.match(html, /class="math (inline|display)"/, 'sin marcado de fórmula');
  });

  test(`las fórmulas llegan a DOCX como OMML: ${label}`, { timeout: 180000 }, async () => {
    const result = await runPandoc(buildExportArgs('docx', {}), prepareForExport(markdown));
    assert.ok(result.bytes.length > 0, `DOCX vacío: ${result.stderr.join(' | ')}`);
    const document = readZipEntries(result.bytes).get('word/document.xml').toString('utf8');
    assert.match(document, /<m:oMath/, 'Word no recibiría una fórmula editable');
  });

  test(`las fórmulas llegan a ODT: ${label}`, { timeout: 180000 }, async () => {
    const result = await runPandoc(buildExportArgs('odt', { mathml: true }), prepareForExport(markdown));
    assert.ok(result.bytes.length > 0, `ODT vacío: ${result.stderr.join(' | ')}`);
    const names = [...readZipEntries(result.bytes).keys()].join(' ');
    assert.match(names, /Formula|Object/i, `sin objetos de fórmula: ${names}`);
  });

  test(`las fórmulas llegan al EPUB como MathML: ${label}`, { timeout: 180000 }, async () => {
    const entries = assertValidEpub(await exportEpub(markdown), label);
    const capitulos = [...entries.entries()]
      .filter(([name]) => name.endsWith('.xhtml'))
      .map(([, bytes]) => bytes.toString('utf8'))
      .join('\n');
    assert.match(capitulos, /<math/, 'sin MathML en el EPUB');
  });
}

test('la ida y vuelta Markdown -> DOCX -> Markdown conserva las fórmulas', { timeout: 240000 }, async () => {
  const [, markdown] = MATH_CASES[0];
  const exported = await runPandoc(buildExportArgs('docx', {}), prepareForExport(markdown));
  assert.ok(exported.bytes.length > 0, `DOCX vacío: ${exported.stderr.join(' | ')}`);

  const imported = await runPandoc(buildImportArgs('docx'), exported.bytes);
  assert.ok(imported.bytes.length > 0, `reimportación vacía: ${imported.stderr.join(' | ')}`);
  const vuelta = trimInlineMath(normalizeNewlines(new TextDecoder().decode(imported.bytes)));

  // Pandoc normaliza los exponentes (ax^2 -> ax^{2}); lo que importa es que la
  // fórmula vuelva delimitada, no que sea idéntica carácter a carácter.
  assert.match(vuelta, /\$ax\^\{?2\}? \+ bx \+ c = 0\$/, `en línea perdida:\n${vuelta}`);
  assert.match(vuelta, /\$\$x = \\frac\{-? ?b \\pm \\sqrt\{b\^\{?2\}? ?-? ?4ac\}\}\{2a\}\$\$/, `bloque perdido:\n${vuelta}`);
});

/*
  Razón de ser de inlineFetchableImages: una ruta relativa no rompe la
  conversión como una URL remota, pero se pierde en silencio. El navegador tiene
  que descargarla antes; aquí se documenta qué pasa si no lo hace.
*/
test('una ruta de imagen relativa se pierde si el navegador no la resuelve', { timeout: 180000 }, async () => {
  const markdown = '# Con imagen\n\n![Diagrama](imagenes/formulas.gif)\n\nTexto final.\n';
  const entries = assertValidEpub(await exportEpub(markdown), 'ruta relativa');
  const chapter = [...entries.entries()].find(([name]) => name.includes('/text/ch'))[1].toString('utf8');
  assert.match(chapter, /Diagrama/, 'solo sobrevive el texto alternativo');
  assert.ok(
    ![...entries.keys()].some(name => name.startsWith('EPUB/media/')),
    'la imagen no debería haberse incrustado sin resolverla antes',
  );
});

/*
  Importación. Un documento con fórmulas que entra por DOCX, ODT, EPUB o LaTeX
  tiene que volver al editor como matemáticas delimitadas, no como texto suelto.
*/
// ODT queda fuera: necesita el paso extra de prepareOdtFormulas y tiene su
// propia prueba con el encadenado completo, más abajo.
for (const [importFormat, exportFormat] of [['docx', 'docx'], ['epub', 'epub3']]) {
  test(`importar ${importFormat.toUpperCase()} devuelve las fórmulas al editor`, { timeout: 240000 }, async () => {
    const source = '# Mates\n\nEn línea $a^2+b^2=c^2$.\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$\n';
    const prepared = exportFormat === 'epub3'
      ? ensureEpubMetadata(prepareForExport(source), { fallbackTitle: 'mates', lang: 'es' })
      : null;
    const args = buildExportArgs(exportFormat, {
      mathml: exportFormat !== 'docx',
      titleFromHeading: prepared ? prepared.titleFromHeading : false,
    });
    const exported = await runPandoc(args, prepared ? prepared.markdown : prepareForExport(source));
    assert.ok(exported.bytes.length > 0, `exportación vacía: ${exported.stderr.join(' | ')}`);

    const imported = await runPandoc(buildImportArgs(importFormat), exported.bytes);
    assert.ok(imported.bytes.length > 0, `importación vacía: ${imported.stderr.join(' | ')}`);
    const markdown = trimInlineMath(normalizeNewlines(new TextDecoder().decode(imported.bytes)));

    assert.match(markdown, /\$a\^\{?2\}? ?\+ ?b\^\{?2\}? ?= ?c\^\{?2\}?\$/, `en línea perdida:\n${markdown}`);
    assert.match(markdown, /\\int_\{?0\}?\^\{?1\}?/, `integral perdida:\n${markdown}`);
    assert.match(markdown, /\\frac\{1\}\{3\}/, `fracción perdida:\n${markdown}`);
  });
}

test('importar LaTeX devuelve las fórmulas al editor', { timeout: 180000 }, async () => {
  const latex = [
    '\\documentclass{article}',
    '\\begin{document}',
    'En línea \\(E = mc^2\\) y en bloque:',
    '\\[',
    '\\int_0^1 x^2\\,dx = \\frac{1}{3}',
    '\\]',
    '\\end{document}',
  ].join('\n');

  const imported = await runPandoc(buildImportArgs('latex'), latex);
  assert.ok(imported.bytes.length > 0, `importación vacía: ${imported.stderr.join(' | ')}`);
  const markdown = trimInlineMath(normalizeNewlines(new TextDecoder().decode(imported.bytes)));

  assert.match(markdown, /\$E = mc\^\{?2\}?\$/, `en línea perdida:\n${markdown}`);
  assert.match(markdown, /\\int_\{?0\}?\^\{?1\}?/, `integral perdida:\n${markdown}`);
  assert.match(markdown, /\\frac\{1\}\{3\}/, `fracción perdida:\n${markdown}`);
});

/*
  Fórmulas al importar un ODT.

  El escritor ODT de Pandoc referencia cada fórmula con una barra final
  (`Formula-0/`) que su propio lector no resuelve, así que un ODT exportado por
  la aplicación volvía sin sus fórmulas. prepareOdtForImport repara esa
  referencia y Pandoc convierte el MathML por su cuenta.
*/
async function importOdt(markdown, { reparar = true } = {}) {
  const exported = await runPandoc(buildExportArgs('odt', { mathml: true }), prepareForExport(markdown));
  assert.ok(exported.bytes.length > 0, `ODT vacío: ${exported.stderr.join(' | ')}`);

  const entrada = reparar ? await prepareOdtForImport(exported.bytes) : exported.bytes;
  const imported = await runPandoc(buildImportArgs('odt'), entrada);
  assert.ok(imported.bytes.length > 0, `importación vacía: ${imported.stderr.join(' | ')}`);
  return {
    markdown: trimInlineMath(normalizeNewlines(new TextDecoder().decode(imported.bytes))),
    odt: exported.bytes,
  };
}

test('importar un ODT exportado por la app recupera sus fórmulas', { timeout: 300000 }, async () => {
  const source = '# Mates\n\nEn línea $a^2+b^2=c^2$ y sigue el texto.\n\n$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$\n\nFinal.\n';

  // Sin reparar, Pandoc no encuentra ninguna de las dos fórmulas.
  const { markdown: sinReparar } = await importOdt(source, { reparar: false });
  assert.doesNotMatch(sinReparar, /a\^\{?2\}?/, `Pandoc ya resuelve la referencia; revisar la reparación:\n${sinReparar}`);

  const { markdown } = await importOdt(source);
  assert.match(markdown, /a\^\{?2\}? ?\+ ?b\^\{?2\}? ?= ?c\^\{?2\}?/, `en línea perdida:\n${markdown}`);
  assert.match(markdown, /\\int/, `integral perdida:\n${markdown}`);
  assert.match(markdown, /\\frac\{1\}\{3\}/, `fracción perdida:\n${markdown}`);
  assert.match(markdown, /^Final\.$/m, 'el texto posterior debe seguir intacto');
});

test('las fórmulas conviven con tablas e imágenes al importar un ODT', { timeout: 300000 }, async () => {
  const source = [
    '# Mezcla',
    '',
    '| Nombre | Valor |',
    '|--------|-------|',
    '| pi     | 3.14  |',
    '',
    'Fórmula $E = mc^2$ junto a una imagen:',
    '',
    '![Diagrama](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)',
    '',
  ].join('\n');
  const { markdown, odt } = await importOdt(source);

  const conTablas = await restoreOdtTableHeaders(markdown, odt);
  assert.match(conTablas, /E = mc\^\{?2\}?/, `fórmula perdida:\n${conTablas}`);
  assert.match(conTablas, /\|\s*Nombre\s*\|\s*Valor\s*\|/, `encabezado de tabla perdido:\n${conTablas}`);
  assert.match(conTablas, /!\[[^\]]*\]\(/, `imagen perdida:\n${conTablas}`);
});

/*
  El LaTeX autónomo sin metadatos salía siempre en inglés (sin babel, con la
  partición silábica por defecto) y con el título del documento convertido en
  una sección más, donde correspondía una portada.
*/
function latexStandalone(markdown, lang, settings = {}) {
  const prepared = prepareLatexStandalone(markdown, { lang, ...settings });
  let args = `-s -f ${MARKDOWN_READER_NO_AUTO_IDS} -t latex --no-highlight`;
  if (prepared.shiftHeadings) args += ' --shift-heading-level-by=-1';
  return runPandoc(args, prepared.markdown);
}

test('el LaTeX autónomo lleva el idioma de la interfaz y el título del documento', { timeout: 180000 }, async () => {
  const source = '# Ecuaciones\n\n## Planteamiento\n\nTexto con $E=mc^2$.\n\n### Detalle\n\nMás texto.\n';
  const { bytes } = await latexStandalone(source, 'es');
  const latex = new TextDecoder().decode(bytes);

  assert.match(latex, /\\babelprovide\[main,import\]\{spanish\}/, `sin babel español:\n${latex.slice(0, 800)}`);
  assert.match(latex, /\\title\{Ecuaciones\}/, 'el encabezado inicial debe ser el título');
  assert.match(latex, /\\maketitle/, 'falta la portada');
  // Con el título fuera del cuerpo, los encabezados suben un nivel.
  assert.match(latex, /\\section\{Planteamiento\}/);
  assert.match(latex, /\\subsection\{Detalle\}/);
  assert.equal(/\\section\{Ecuaciones\}/.test(latex), false, 'el título no debe repetirse como sección');
});

test('con varios encabezados de nivel 1 solo se añade el idioma', { timeout: 180000 }, async () => {
  const { bytes } = await latexStandalone('# Tema 1\n\nTexto.\n\n# Tema 2\n\nMás.\n', 'ca');
  const latex = new TextDecoder().decode(bytes);

  assert.match(latex, /\\babelprovide\[main,import\]\{catalan\}/);
  assert.equal(/\\maketitle/.test(latex), false, 'sin un título claro no se inventa portada');
  assert.match(latex, /\\section\{Tema 1\}/);
  assert.match(latex, /\\section\{Tema 2\}/);
});

test('los ajustes de LaTeX del usuario llegan al documento generado', { timeout: 180000 }, async () => {
  const { bytes } = await latexStandalone('# Apuntes\n\nTexto.\n', 'es', {
    documentClass: 'report',
    classOptions: '12pt, a4paper',
    preamble: '\\usepackage{amsthm}\n\\newcommand{\\R}{\\mathbb{R}}',
  });
  const latex = new TextDecoder().decode(bytes);

  assert.match(latex, /\\documentclass\[[\s\S]*?12pt,[\s\S]*?a4paper,?[\s\S]*?\]\{report\}/, `clase u opciones perdidas:\n${latex.slice(0, 400)}`);
  assert.match(latex, /\\usepackage\{amsthm\}/, 'falta el paquete del preámbulo');
  assert.match(latex, /\\newcommand\{\\R\}\{\\mathbb\{R\}\}/, 'falta la macro del preámbulo');
  // El preámbulo va antes del cuerpo, no dentro de él.
  assert.ok(latex.indexOf('\\usepackage{amsthm}') < latex.indexOf('\\begin{document}'));
});
