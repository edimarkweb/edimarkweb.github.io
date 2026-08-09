import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ensureEpubMetadata,
  ensureExportMetadata,
  prepareLatexStandalone,
  extractMarkdownTitle,
  hasYamlFrontMatter,
  collectRemoteImageUrls,
  collectFetchableImageUrls,
  replaceImageUrls,
  dropImagesByUrl,
  trimInlineMath,
  normalizeNewlines,
  normalizeThematicBreaks,
  buildImportArgs,
  buildExportArgs,
  stripEpubAnchorPrefixes,
  stripUnsafeMarkup,
  collectArchiveImagePaths,
  inlineArchiveImages,
  prepareOdtForImport,
  requestDocxFieldUpdate,
  collectDocxHeadings,
} from '../pandoc-prepare.js';
import { readZipEntries, mimeForPath } from '../zip-reader.js';
import { createZip } from '../zip-writer.js';
import { normalizeFormulaHrefs } from '../odt-formulas.js';
import { extractOdtTableHeaders, restoreTableHeaders } from '../odt-tables.js';
import { makeZip } from './helpers/make-zip.mjs';

test('hasYamlFrontMatter distingue metadatos de una línea horizontal', () => {
  assert.equal(hasYamlFrontMatter('---\ntitle: X\n---\n\nTexto\n'), true);
  assert.equal(hasYamlFrontMatter('---\ntitle: X\n...\n\nTexto\n'), true);
  assert.equal(hasYamlFrontMatter('\n\n---\ntitle: X\n---\n'), true);
  // Una raya horizontal suelta no es un bloque de metadatos.
  assert.equal(hasYamlFrontMatter('---\n\n# Título\n\nTexto\n'), false);
  assert.equal(hasYamlFrontMatter('# Título\n\nTexto\n'), false);
});

test('extractMarkdownTitle ignora los bloques de código', () => {
  const markdown = '```bash\n# Instalar dependencias\nnpm install\n```\n\n# Guía real\n';
  assert.equal(extractMarkdownTitle(markdown), 'Guía real');
  assert.equal(extractMarkdownTitle('~~~\n# falso\n~~~\n\n# verdadero\n'), 'verdadero');
  assert.equal(extractMarkdownTitle('## Solo nivel 2\n'), '');
  assert.equal(extractMarkdownTitle('# Con cierre ###\n'), 'Con cierre');
});

test('ensureEpubMetadata respeta lo que el documento declara y completa el resto', () => {
  const original = '---\ntitle: "Mío"\nauthor: Ana\n---\n\n# Cuerpo\n';
  const result = ensureEpubMetadata(original, { fallbackTitle: 'otro', lang: 'es' });
  // El título es suyo; el idioma faltaba y se añade sin tocar lo demás.
  assert.match(result.markdown, /title: "Mío"\nauthor: Ana\nlang: "es"/);
  assert.equal(result.markdown.includes('title: "otro"'), false);
  assert.equal(result.titleFromHeading, false);

  const completo = '---\ntitle: "Mío"\nlang: "de"\n---\n\n# Cuerpo\n';
  assert.equal(ensureEpubMetadata(completo, { lang: 'es' }).markdown, completo);
  assert.equal(ensureEpubMetadata(completo, { lang: 'es' }).injected, false);
});

test('ensureEpubMetadata inyecta título e idioma cuando faltan', () => {
  const result = ensureEpubMetadata('# Mi libro\n\nTexto\n', { fallbackTitle: 'archivo', lang: 'ca' });
  assert.match(result.markdown, /^---\ntitle: "Mi libro"\nlang: "ca"\n---\n/);
  assert.equal(result.titleFromHeading, true);
});

test('ensureEpubMetadata encadena encabezado, nombre del documento y sin título', () => {
  const conNombre = ensureEpubMetadata('Solo texto\n', { fallbackTitle: 'apuntes', lang: 'es' });
  assert.match(conNombre.markdown, /title: "apuntes"/);
  assert.equal(conNombre.titleFromHeading, false);

  // Un encabezado vacío no debe saltarse el nombre del documento.
  const vacio = ensureEpubMetadata('#   \n\nTexto\n', { fallbackTitle: 'apuntes', lang: 'es' });
  assert.match(vacio.markdown, /title: "apuntes"/);

  const sinNada = ensureEpubMetadata('Texto\n', { fallbackTitle: '', untitledLabel: 'Sin título', lang: 'es' });
  assert.match(sinNada.markdown, /title: "Sin título"/);
});

/*
  El índice y la numeración son banderas del conversor, no metadatos: el
  escritor DOCX ignora `toc: true` y la numeración no sale sin la bandera.
*/
test('buildExportArgs añade índice y numeración solo cuando se piden', () => {
  assert.equal(buildExportArgs('docx', {}).includes('--toc'), false);
  assert.match(buildExportArgs('docx', { toc: true }), /--toc(?!-)/);
  assert.match(buildExportArgs('docx', { numberSections: true }), /--number-sections/);
  // El EPUB ya trae su índice de navegación; otro encima sobra.
  assert.equal(buildExportArgs('epub3', { toc: true }).includes('--toc'), false);
  assert.match(buildExportArgs('epub3', { toc: true, numberSections: true }), /--number-sections/);
});

test('el rótulo del índice viaja como metadato', () => {
  const conRotulo = ensureExportMetadata('# Tema\n', { lang: 'es', tocTitle: 'Índice' });
  assert.match(conRotulo.markdown, /toc-title: "Índice"/);
  // Sin rótulo no se inventa ninguno: Pandoc pondrá el suyo.
  assert.equal(ensureExportMetadata('# Tema\n', { lang: 'es' }).markdown.includes('toc-title'), false);
});

test('ensureExportMetadata marca el idioma cuando el documento no lo trae', () => {
  const result = ensureExportMetadata('# Apuntes\n\nTexto\n', { lang: 'gl' });
  assert.equal(result.injected, true);
  assert.match(result.markdown, /^---\nlang: "gl"\n---\n\n# Apuntes/);
});

test('ensureExportMetadata no pisa el front matter del documento ni inventa idiomas', () => {
  const propio = '---\nlang: "de"\nauthor: "Ana"\n---\n\nTexto\n';
  const result = ensureExportMetadata(propio, { lang: 'es', author: 'Otro' });
  assert.equal(result.markdown, propio);
  assert.equal(result.injected, false);

  const sinNada = ensureExportMetadata('Texto\n', { lang: '  ', author: '  ' });
  assert.equal(sinNada.markdown, 'Texto\n');
  assert.equal(sinNada.injected, false);
});

/*
  `pagetitle` es el <title> de la página y nada más. Con `title` a secas, la
  plantilla imprime además un bloque de título en el cuerpo que repite el
  encabezado con el que ya empieza el documento.
*/
test('ensureExportMetadata añade autor y título de página sin tocar el cuerpo', () => {
  const result = ensureExportMetadata('# Ecuaciones\n\nTexto\n', {
    lang: 'es',
    author: 'Juan José',
    pageTitle: 'Ecuaciones',
  });
  assert.match(result.markdown, /^---\nlang: "es"\nauthor: "Juan José"\npagetitle: "Ecuaciones"\n---\n/);
  assert.equal(result.markdown.includes('\ntitle:'), false, 'title duplicaría el encabezado en el cuerpo');
  assert.match(result.markdown, /# Ecuaciones\n\nTexto/);
});

test('prepareLatexStandalone promueve a título el único encabezado inicial', () => {
  const result = prepareLatexStandalone('# Ecuaciones\n\n## Planteamiento\n\nTexto\n', { lang: 'es' });
  assert.match(result.markdown, /^---\ntitle: "Ecuaciones"\nlang: "es"\n---\n/);
  assert.equal(result.shiftHeadings, true);
  // El encabezado promovido sale del cuerpo para no repetirse bajo \\maketitle.
  assert.equal(result.markdown.includes('# Ecuaciones'), false);
  assert.match(result.markdown, /## Planteamiento/);
});

test('prepareLatexStandalone deja intactos los documentos con varios encabezados de nivel 1', () => {
  const result = prepareLatexStandalone('# Tema 1\n\nTexto\n\n# Tema 2\n', { lang: 'es' });
  assert.equal(result.shiftHeadings, false);
  assert.equal(result.markdown.includes('title:'), false);
  assert.match(result.markdown, /lang: "es"/);
  assert.match(result.markdown, /# Tema 1[\s\S]*# Tema 2/);
});

test('prepareLatexStandalone solo asciende el encabezado que abre el documento', () => {
  const trasTexto = prepareLatexStandalone('Introducción\n\n# Desarrollo\n', { lang: 'es' });
  assert.equal(trasTexto.shiftHeadings, false);
  assert.equal(trasTexto.markdown.includes('title:'), false);

  // Una almohadilla dentro de un bloque de código no es un título.
  const enCodigo = prepareLatexStandalone('```sh\n# npm install\n```\n\n# De verdad\n', { lang: 'es' });
  assert.equal(enCodigo.shiftHeadings, false);
});

test('prepareLatexStandalone no mueve un título que el documento ya declara', () => {
  const propio = '---\ntitle: "Mío"\n---\n\n# Cuerpo\n';
  const result = prepareLatexStandalone(propio, { lang: 'eu' });
  assert.match(result.markdown, /title: "Mío"\nlang: "eu"/);
  // El encabezado no se promueve ni se borra: el título ya estaba puesto.
  assert.match(result.markdown, /# Cuerpo/);
  assert.equal(result.shiftHeadings, false);

  const soloTexto = prepareLatexStandalone('Texto suelto\n', { lang: 'gl' });
  assert.match(soloTexto.markdown, /^---\nlang: "gl"\n---\n/);
});

test('prepareLatexStandalone aplica clase, opciones y preámbulo del usuario', () => {
  const result = prepareLatexStandalone('# Apuntes\n\nTexto\n', {
    lang: 'es',
    documentClass: 'report',
    classOptions: '12pt, a4paper',
    preamble: '\\usepackage{geometry}\n\\newcommand{\\R}{\\mathbb{R}}',
  });
  assert.match(result.markdown, /documentclass: "report"/);
  // Pandoc espera una entrada por opción, no la cadena entera.
  assert.match(result.markdown, /classoption:\n- "12pt"\n- "a4paper"\n/);
  assert.match(result.markdown, /header-includes: \|\n {2}\\usepackage\{geometry\}\n {2}\\newcommand/);
});

test('prepareLatexStandalone no deja que el preámbulo rompa el YAML', () => {
  // Comillas, dos puntos, barras y una línea que parece cerrar los metadatos.
  const hostil = '\\title{"x": y}\n---\n\\def\\z{1}\n\n\\usepackage{amsmath}\n';
  const result = prepareLatexStandalone('Texto\n', { lang: 'es', preamble: hostil });
  const lineas = result.markdown.split('\n');
  const cierre = lineas.indexOf('---', 1);

  // El bloque literal va indentado, así que ningún --- del usuario cierra nada.
  assert.match(lineas[cierre - 1], /^ {2}\\usepackage\{amsmath\}$/);
  assert.match(result.markdown, /^ {2}---$/m);
  assert.equal(lineas.slice(cierre).join('\n'), '---\n\nTexto\n');
});

test('prepareLatexStandalone ignora los ajustes vacíos o desconocidos', () => {
  const result = prepareLatexStandalone('Texto\n', {
    lang: 'es',
    documentClass: 'memoir',
    classOptions: ' , ,',
    preamble: '   \n',
  });
  assert.equal(result.markdown, '---\nlang: "es"\n---\n\nTexto\n');
});

/*
  Elegir idioma para un documento le escribe `lang` en su bloque. Con la regla
  de todo o nada, eso le habría costado la clase y el preámbulo configurados.
*/
test('prepareLatexStandalone completa los ajustes que el documento no declara', () => {
  const conIdioma = '---\nlang: "fr"\n---\n\n# Notas\n\nTexto\n';
  const result = prepareLatexStandalone(conIdioma, {
    lang: 'es',
    documentClass: 'book',
    preamble: '\\usepackage{tikz}',
  });
  // Su idioma manda; el resto de ajustes llegan igualmente.
  assert.match(result.markdown, /lang: "fr"/);
  assert.equal(result.markdown.includes('lang: "es"'), false);
  assert.match(result.markdown, /documentclass: "book"/);
  assert.match(result.markdown, /header-includes: \|\n {2}\\usepackage\{tikz\}/);
  // Sigue promoviendo el título, porque el documento no declara ninguno.
  assert.match(result.markdown, /title: "Notas"/);
  assert.equal(result.shiftHeadings, true);
  assert.equal(result.markdown.includes('# Notas'), false);

  const suyo = '---\nlang: "fr"\ndocumentclass: "memoir"\n---\n\nTexto\n';
  const respetado = prepareLatexStandalone(suyo, { lang: 'es', documentClass: 'book' });
  assert.match(respetado.markdown, /documentclass: "memoir"/);
  assert.equal(respetado.markdown.includes('"book"'), false);
});

test('ensureEpubMetadata escapa comillas en el título y el idioma', () => {
  const result = ensureEpubMetadata('# El «"mejor"» libro\n', { lang: 'es"x' });
  assert.match(result.markdown, /title: "El «\\"mejor\\"» libro"/);
  assert.match(result.markdown, /lang: "es\\"x"/);
});

test('una raya horizontal inicial no impide inyectar los metadatos', () => {
  const result = ensureEpubMetadata('---\n\n# Tema 1\n\nTexto\n', { fallbackTitle: 'doc', lang: 'es' });
  assert.equal(result.injected, true);
  assert.match(result.markdown, /title: "Tema 1"/);
});

test('collectRemoteImageUrls encuentra imágenes Markdown y HTML sin duplicar', () => {
  const markdown = [
    '![a](https://ejemplo.org/1.png)',
    '![b](https://ejemplo.org/1.png "título")',
    '<img src="https://ejemplo.org/2.jpg" alt="c">',
    '![local](imagenes/x.png)',
    '![datos](data:image/gif;base64,R0lGOD)',
    '[enlace](https://ejemplo.org/3.html)',
  ].join('\n\n');
  assert.deepEqual(collectRemoteImageUrls(markdown), [
    'https://ejemplo.org/1.png',
    'https://ejemplo.org/2.jpg',
  ]);
});

test('replaceImageUrls sustituye la imagen pero no un enlace a la misma URL', () => {
  const markdown = '![a](https://ejemplo.org/1.png)\n\n[enlace](https://ejemplo.org/1.png)\n';
  const result = replaceImageUrls(markdown, new Map([['https://ejemplo.org/1.png', 'data:image/png;base64,AAA']]));
  assert.match(result, /!\[a\]\(data:image\/png;base64,AAA\)/);
  assert.match(result, /\[enlace\]\(https:\/\/ejemplo\.org\/1\.png\)/);
});

test('dropImagesByUrl conserva el texto alternativo de las imágenes omitidas', () => {
  const markdown = '![Diagrama](https://ejemplo.org/1.png)\n\n<img src="https://ejemplo.org/2.jpg">\n\n![ok](data:image/gif;base64,R0lGOD)\n';
  const result = dropImagesByUrl(markdown, ['https://ejemplo.org/1.png', 'https://ejemplo.org/2.jpg']);
  assert.match(result, /^Diagrama$/m);
  assert.doesNotMatch(result, /ejemplo\.org/);
  assert.match(result, /!\[ok\]\(data:image\/gif/);
});

test('normalizeThematicBreaks convierte las rayas --- en ***', () => {
  // Pandoc leería estos --- como el inicio de un bloque YAML y fallaría.
  assert.equal(
    normalizeThematicBreaks('# Uno\n\nTexto.\n\n---\n\n# Dos\n'),
    '# Uno\n\nTexto.\n\n***\n\n# Dos\n',
  );
  assert.equal(normalizeThematicBreaks('---\n\n# Tras la raya\n'), '***\n\n# Tras la raya\n');
});

test('normalizeThematicBreaks respeta encabezados setext, código y front matter', () => {
  // `---` pegado a un texto es un encabezado de nivel 2, no una raya.
  assert.equal(normalizeThematicBreaks('Encabezado\n---\n\nTexto\n'), 'Encabezado\n---\n\nTexto\n');
  assert.equal(
    normalizeThematicBreaks('# T\n\n```yaml\n\n---\nclave: valor\n```\n'),
    '# T\n\n```yaml\n\n---\nclave: valor\n```\n',
  );
  // El bloque de metadatos inicial debe conservarse íntegro.
  assert.equal(
    normalizeThematicBreaks('---\ntitle: X\n---\n\nTexto\n\n---\n\nFin\n'),
    '---\ntitle: X\n---\n\nTexto\n\n***\n\nFin\n',
  );
  // Cuatro guiones no son ambiguos para Pandoc: se dejan como están.
  assert.equal(normalizeThematicBreaks('Texto\n\n----\n\nMás\n'), 'Texto\n\n----\n\nMás\n');
  assert.equal(normalizeThematicBreaks('Sin rayas\n'), 'Sin rayas\n');
});

test('buildImportArgs pide a Pandoc Markdown plano según el formato', () => {
  const epub = buildImportArgs('epub');
  for (const ext of ['-fenced_divs', '-native_divs', '-bracketed_spans', '-header_attributes', '-raw_html']) {
    assert.ok(epub.includes(ext), `faltaba ${ext}`);
  }
  // DOCX y ODT solo necesitan evitar el `{width=...}` y el <img> crudo.
  for (const format of ['docx', 'odt']) {
    assert.ok(buildImportArgs(format).includes('-link_attributes-raw_html'), format);
    assert.doesNotMatch(buildImportArgs(format), /-fenced_divs/);
  }
  // LaTeX y HTML conservan el comportamiento que ya tenían.
  assert.doesNotMatch(buildImportArgs('latex'), /-link_attributes|-raw_html/);
  assert.doesNotMatch(buildImportArgs('html'), /-link_attributes|-raw_html/);

  // Sin esto Pandoc devuelve tablas alineadas con espacios, que la
  // previsualización muestra como texto plano.
  for (const format of ['epub', 'docx', 'odt', 'html', 'latex']) {
    const args = buildImportArgs(format);
    assert.ok(args.includes('+pipe_tables'), `${format} sin pipe_tables`);
    assert.ok(args.includes('-simple_tables'), `${format} con simple_tables`);
  }
});

test('stripEpubAnchorPrefixes recorta el nombre del archivo interno', () => {
  assert.equal(
    stripEpubAnchorPrefixes('Ver [la sección](#ch001.xhtml_rutinas-de-pensamiento).'),
    'Ver [la sección](#rutinas-de-pensamiento).',
  );
  assert.equal(
    stripEpubAnchorPrefixes('[a](#text/ch012.xhtml_tema) y [b](#normal)'),
    '[a](#tema) y [b](#normal)',
  );
  // Un enlace externo con .html en la ruta no debe tocarse.
  assert.equal(
    stripEpubAnchorPrefixes('[web](https://ejemplo.org/pagina.html)'),
    '[web](https://ejemplo.org/pagina.html)',
  );
});

test('trimInlineMath y normalizeNewlines siguen comportándose igual', () => {
  assert.equal(trimInlineMath('$ a^2 $ y $$b$$'), '$a^2$ y $$b$$');
  assert.equal(normalizeNewlines('a\r\nb\rc'), 'a\nb\nc');
  assert.equal(normalizeNewlines(null), '');
});

test('collectArchiveImagePaths separa rutas internas de URLs y data URIs', () => {
  const markdown = [
    '![a](Pictures/1000.png)',
    '![b](media/image1.png)',
    '![c](https://ejemplo.org/x.png)',
    '![d](data:image/gif;base64,R0lGOD)',
    '<img src="word/media/image2.jpg">',
  ].join('\n\n');
  assert.deepEqual(collectArchiveImagePaths(markdown), [
    'Pictures/1000.png',
    'media/image1.png',
    'word/media/image2.jpg',
  ]);
});

/*
  Dentro del WASM no hay red ni sistema de archivos, así que una ruta relativa
  se pierde igual que una URL remota: Pandoc avisa "Could not fetch resource" y
  deja solo la descripción. El navegador puede resolver ambas.
*/
test('collectFetchableImageUrls recoge también las rutas relativas', () => {
  const markdown = [
    '![logo](logo_100px.png)',
    '![gif](imagenes/formulas.gif)',
    '![absoluta](/assets/portada.png)',
    '![remota](https://ejemplo.org/x.png)',
    '![incrustada](data:image/gif;base64,R0lGOD)',
    '<img src="imagenes/otra.gif">',
  ].join('\n\n');

  assert.deepEqual(collectFetchableImageUrls(markdown), [
    'logo_100px.png',
    'imagenes/formulas.gif',
    '/assets/portada.png',
    'https://ejemplo.org/x.png',
    'imagenes/otra.gif',
  ]);
  // La variante remota sigue existiendo para quien solo necesite esas.
  assert.deepEqual(collectRemoteImageUrls(markdown), ['https://ejemplo.org/x.png']);
});

test('inlineArchiveImages saca las imágenes del archivo y las incrusta', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const zip = await makeZip({
    'mimetype': 'application/vnd.oasis.opendocument.text',
    'Pictures/1000.png': png,
    // Pandoc acorta la ruta de DOCX: media/… en vez de word/media/…
    'word/media/image1.jpeg': png,
  });

  const markdown = '![Gato](Pictures/1000.png)\n\n![Perro](media/image1.jpeg)\n';
  const result = await inlineArchiveImages(markdown, zip);

  assert.match(result, /!\[Gato\]\(data:image\/png;base64,[A-Za-z0-9+/=]+\)/);
  assert.match(result, /!\[Perro\]\(data:image\/jpeg;base64,[A-Za-z0-9+/=]+\)/);
  assert.doesNotMatch(result, /Pictures\//);
});

test('inlineArchiveImages deja el texto intacto si no encuentra la imagen', async () => {
  const zip = await makeZip({ 'otra/cosa.txt': 'nada' });
  const markdown = '![x](Pictures/ausente.png)\n';
  assert.equal(await inlineArchiveImages(markdown, zip), markdown);
  // Un archivo ilegible tampoco debe romper la importación.
  assert.equal(await inlineArchiveImages(markdown, new Uint8Array([1, 2, 3])), markdown);
  assert.equal(await inlineArchiveImages(markdown, null), markdown);
});

test('readZipEntries omite directorios y descomprime entradas deflate', async () => {
  const zip = await makeZip({ 'dir/': '', 'a.txt': 'hola', 'b.bin': new Uint8Array([0, 1, 2]) });
  const entries = await readZipEntries(zip);
  assert.equal(entries.has('dir/'), false);
  assert.equal(new TextDecoder().decode(entries.get('a.txt')), 'hola');
  assert.deepEqual([...entries.get('b.bin')], [0, 1, 2]);
  assert.equal(mimeForPath('foto.JPG'), 'image/jpeg');
  assert.equal(mimeForPath('raro.xyz'), 'application/octet-stream');
});

const ODT_CONTENT_XML = `<office:document-content>
  <table:table table:name="Tabla1">
    <table:table-header-rows>
      <table:table-row>
        <table:table-cell office:value-type="string"><text:p>Nombre</text:p></table:table-cell>
        <table:table-cell office:value-type="string"><text:p>Edad &amp; m&#225;s</text:p></table:table-cell>
      </table:table-row>
    </table:table-header-rows>
    <table:table-row><table:table-cell><text:p>Ana</text:p></table:table-cell></table:table-row>
  </table:table>
  <table:table table:name="Tabla2">
    <table:table-row><table:table-cell><text:p>1</text:p></table:table-cell></table:table-row>
  </table:table>
</office:document-content>`;

test('extractOdtTableHeaders lee los encabezados y decodifica entidades', () => {
  const headers = extractOdtTableHeaders(ODT_CONTENT_XML);
  assert.equal(headers.length, 2, 'una entrada por tabla del documento');
  assert.deepEqual(headers[0], ['Nombre', 'Edad & más']);
  // Una tabla sin fila de encabezado no aporta nada.
  assert.deepEqual(headers[1], []);
  assert.deepEqual(extractOdtTableHeaders(''), []);
});

test('restoreTableHeaders rellena la fila vacía y realinea la tabla', () => {
  const markdown = '|       |     |\n|-------|-----|\n| Ana   | 28  |\n';
  const result = restoreTableHeaders(markdown, [['Nombre', 'Edad & más']]);
  assert.equal(result, [
    '| Nombre | Edad & más |',
    '|--------|------------|',
    '| Ana    | 28         |',
    '',
  ].join('\n'));
});

test('restoreTableHeaders empareja cada tabla con la suya y respeta la alineación', () => {
  const markdown = [
    '|     |     |', '|:---:|----:|', '| a   | b   |',
    '',
    'Texto.',
    '',
    '|     |', '|-----|', '| z   |',
    '',
  ].join('\n');
  const result = restoreTableHeaders(markdown, [['Uno', 'Dos'], ['Tres']]);
  assert.match(result, /\| Uno \| Dos \|/);
  assert.match(result, /\|:-+:\|-+:\|/, 'debería conservar :---: y ---:');
  assert.match(result, /\| Tres \|/);
});

test('restoreTableHeaders no toca tablas que ya tienen encabezado ni descuadres', () => {
  const conEncabezado = '| Ya | Está |\n|----|------|\n| 1  | 2    |\n';
  assert.equal(restoreTableHeaders(conEncabezado, [['Otro', 'Cosa']]), conEncabezado);

  // Distinto número de columnas: mejor no tocar nada.
  const descuadre = '|     |     |\n|-----|-----|\n| a   | b   |\n';
  assert.equal(restoreTableHeaders(descuadre, [['Solo una']]), descuadre);

  assert.equal(restoreTableHeaders('Sin tablas\n', [['x']]), 'Sin tablas\n');
  assert.equal(restoreTableHeaders(conEncabezado, []), conEncabezado);
});

test('restoreTableHeaders escapa las barras verticales del encabezado', () => {
  const result = restoreTableHeaders('|     |\n|-----|\n| a   |\n', [['uno|dos']]);
  assert.match(result, /\| uno\\\|dos \|/);
});

/*
  Reparación de las referencias de fórmula de un ODT.

  El escritor ODT de Pandoc apunta a cada fórmula con una barra final
  (`Formula-0/`) y su propio lector no resuelve esa forma: la fórmula se pierde
  sin dejar rastro. LibreOffice usa `./Object 1`, que Pandoc sí lee, así que
  solo fallan los ODT exportados por la propia aplicación.
*/
const FRAME_PANDOC = '<draw:frame draw:style-name="fr1" text:anchor-type="as-char">'
  + '<draw:object xlink:href="Formula-0/" xlink:type="simple" /></draw:frame>';
const FRAME_LIBREOFFICE = '<draw:frame draw:name="Objeto1" text:anchor-type="as-char">'
  + '<draw:object xlink:href="./Object 1" xlink:type="simple"/>'
  + '<draw:image xlink:href="./ObjectReplacements/Object 1"/></draw:frame>';

test('normalizeFormulaHrefs quita la barra final que Pandoc no sabe resolver', () => {
  const xml = `<office:text><text:p>Antes ${FRAME_PANDOC} después</text:p></office:text>`;
  const { xml: patched, changed } = normalizeFormulaHrefs(xml);
  assert.equal(changed, true);
  assert.match(patched, /xlink:href="Formula-0"/);
  assert.doesNotMatch(patched, /xlink:href="Formula-0\/"/);
  // Nada más del marco puede alterarse.
  assert.match(patched, /Antes <draw:frame[^>]*><draw:object[^>]*\/><\/draw:frame> después/);
});

test('normalizeFormulaHrefs no toca un ODT de LibreOffice ni las imágenes', () => {
  const xml = `<office:text><text:p>${FRAME_LIBREOFFICE}</text:p></office:text>`;
  const { xml: patched, changed } = normalizeFormulaHrefs(xml);
  assert.equal(changed, false, 'Pandoc ya lee esta forma: no hay que reescribir nada');
  assert.equal(patched, xml);
});

/*
  El índice del DOCX no es texto: es un campo que calcula el procesador de
  textos. Sin pedir la actualización de campos, el documento se abre con el
  índice vacío.
*/
test('collectDocxHeadings lee los encabezados con su número de apartado', () => {
  const xml = '<w:body>'
    + '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>1</w:t></w:r><w:r><w:tab/><w:t>Tema 1</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t xml:space="preserve">1.1</w:t></w:r><w:r><w:tab/><w:t>Copiar &amp; pegar</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:pStyle w:val="FirstParagraph"/></w:pPr><w:r><w:t>Texto normal</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:pStyle w:val="Heading4"/></w:pPr><w:r><w:t>Demasiado hondo</w:t></w:r></w:p>'
    + '</w:body>';
  assert.deepEqual(collectDocxHeadings(xml), [
    { level: 1, text: '1 Tema 1' },
    // Las entidades del XML vuelven a ser texto legible.
    { level: 2, text: '1.1 Copiar & pegar' },
  ]);
});

/*
  Ni el campo marcado como pendiente ni updateFields bastan: LibreOffice abre el
  documento con el índice en blanco y Word solo lo rellena si el usuario acepta
  el aviso. Las entradas se escriben en el resultado guardado del campo.
*/
test('requestDocxFieldUpdate escribe las entradas dentro del campo del índice', async () => {
  const document = '<w:document xmlns:w="x"><w:body>'
    + '<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/>'
    + '<w:instrText xml:space="preserve">TOC \\o "1-3"</w:instrText>'
    + '<w:fldChar w:fldCharType="separate"/><w:fldChar w:fldCharType="end"/></w:r></w:p>'
    + '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Tema &amp; uno</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Apartado</w:t></w:r></w:p>'
    + '</w:body></w:document>';
  const docx = await createZip(new Map([
    ['word/settings.xml', '<w:settings xmlns:w="x"/>'],
    ['word/document.xml', document],
  ]));
  const entries = await readZipEntries(await requestDocxFieldUpdate(docx));
  const resultado = new TextDecoder().decode(entries.get('word/document.xml'));

  assert.match(resultado, /<w:t xml:space="preserve">Tema &amp; uno<\/w:t>/, 'el texto se escapa, no se rompe el XML');
  assert.match(resultado, /<w:ind w:left="340"\/>/, 'el segundo nivel va sangrado');
  // El campo sigue siendo un campo: begin … separate … entradas … end.
  const orden = ['fldCharType="begin"', 'fldCharType="separate"', 'Apartado', 'fldCharType="end"']
    .map(fragmento => resultado.indexOf(fragmento));
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b), `orden inesperado: ${orden}`);
  assert.equal(resultado.split('<w:fldChar w:fldCharType="end"').length - 1, 1, 'un solo cierre de campo');
});

test('requestDocxFieldUpdate pide actualizar los campos sin tocar nada más', async () => {
  const docx = await createZip(new Map([
    ['[Content_Types].xml', '<?xml version="1.0"?><Types/>'],
    ['word/settings.xml', '<?xml version="1.0"?><w:settings xmlns:w="x"><w:zoom w:percent="100"/></w:settings>'],
    ['word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="x"><w:body/></w:document>'],
  ]));
  const actualizado = await requestDocxFieldUpdate(docx);
  const entries = await readZipEntries(actualizado);

  const leer = name => new TextDecoder().decode(entries.get(name));
  const settings = leer('word/settings.xml');
  assert.match(settings, /<w:settings[^>]*><w:updateFields w:val="true"\/>/, 'va al principio, como pide el esquema');
  assert.match(settings, /<w:zoom w:percent="100"\/>/, 'lo que ya había se conserva');
  assert.equal(entries.size, 3, 'ninguna entrada se pierde');
  assert.match(leer('word/document.xml'), /<w:body\/>/);
});

test('requestDocxFieldUpdate no repite el ajuste ni rompe un archivo ilegible', async () => {
  const yaPedido = await createZip(new Map([
    ['word/settings.xml', '<w:settings xmlns:w="x"><w:updateFields w:val="true"/></w:settings>'],
  ]));
  assert.equal(await requestDocxFieldUpdate(yaPedido), yaPedido, 'sin cambios, se devuelve el mismo archivo');

  // Un archivo que no es un ZIP no debe acabar en una descarga corrupta.
  const basura = new Uint8Array([1, 2, 3, 4]);
  assert.equal(await requestDocxFieldUpdate(basura), basura);
});

test('prepareOdtForImport reescribe el ODT y conserva el resto de entradas', async () => {
  const contentXml = `<?xml version="1.0"?><office:document-content><office:body><office:text>`
    + `<text:p>Fórmula ${FRAME_PANDOC} dentro</text:p></office:text></office:body></office:document-content>`;
  const odt = await createZip(new Map([
    ['mimetype', 'application/vnd.oasis.opendocument.text'],
    ['content.xml', contentXml],
    ['Formula-0/content.xml', '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi></math>'],
    ['Pictures/1000.png', new Uint8Array([1, 2, 3])],
  ]));

  const bytes = await prepareOdtForImport(odt);
  assert.notEqual(bytes, odt, 'debería reescribirse');

  const entries = await readZipEntries(bytes);
  // mimetype va primero en un ODT.
  assert.equal([...entries.keys()][0], 'mimetype');
  assert.deepEqual([...entries.get('Pictures/1000.png')], [1, 2, 3], 'las imágenes deben sobrevivir');
  assert.match(new TextDecoder().decode(entries.get('Formula-0/content.xml')), /<math/);
  assert.match(new TextDecoder().decode(entries.get('content.xml')), /xlink:href="Formula-0"/);
});

test('prepareOdtForImport devuelve el archivo intacto si no hay nada que reparar', async () => {
  const odt = await createZip(new Map([
    ['mimetype', 'application/vnd.oasis.opendocument.text'],
    ['content.xml', `<office:text><text:p>${FRAME_LIBREOFFICE}</text:p></office:text>`],
  ]));
  assert.equal(await prepareOdtForImport(odt), odt, 'no debería reescribirse');
});

/*
  La versión vivía escrita a mano en siete sitios y nada avisaba si se olvidaba
  alguno. Ahora los textos del pie llevan un marcador {version} y solo quedan dos
  copias del número: package.json y APP_VERSION. Esta prueba las ata.
*/
test('la versión no se desincroniza entre package.json y la aplicación', () => {
  const leer = nombre => readFileSync(new URL(`../${nombre}`, import.meta.url), 'utf8');
  const packageVersion = JSON.parse(leer('package.json')).version;
  assert.match(packageVersion, /^\d+\.\d+\.\d+$/, 'versión con formato inesperado');

  const declarada = leer('script.js').match(/^const APP_VERSION = '([^']+)';$/m);
  assert.ok(declarada, 'no se encuentra APP_VERSION en script.js');
  assert.equal(declarada[1], packageVersion, 'APP_VERSION y package.json no coinciden');

  // Ni los idiomas ni el HTML pueden volver a llevar el número escrito a mano.
  for (const locale of ['es', 'en', 'ca', 'gl', 'eu']) {
    const texto = JSON.parse(leer(`locales/${locale}.json`)).footer_version;
    assert.ok(texto.includes('{version}'), `${locale}: falta el marcador {version}`);
    assert.doesNotMatch(texto, /\d+\.\d+\.\d+/, `${locale}: versión escrita a mano`);
  }
  const pie = leer('index.html').match(/<span data-i18n-key="footer_version">([^<]*)<\/span>/);
  assert.ok(pie, 'no se encuentra el pie de versión en index.html');
  assert.doesNotMatch(pie[1], /\d+\.\d+\.\d+/, 'index.html lleva la versión escrita a mano');
});

/*
  Lo que llega dentro de un archivo importado se renderiza en la vista previa,
  o sea en el origen de la aplicación y con acceso a los documentos guardados.
*/
test('la importación desarma manejadores y esquemas ejecutables', () => {
  const TAB = String.fromCharCode(9);
  const casos = [
    ['<img src="x.png" onerror="robar()">', '<img src="x.png">'],
    ['<a href="javascript:robar()">pulsa</a>', '<a>pulsa</a>'],
    // El destino del enlace lleva paréntesis: no puede cortarse por el primero.
    ['[pulsa](javascript:robar())', '[pulsa](#)'],
    ['[pulsa](javascript:alert(1) "titulo")', '[pulsa](#)'],
    // Un carácter de control no puede usarse para partir el esquema.
    [`<a href="java${TAB}script:robar()">x</a>`, '<a>x</a>'],
    ["<a HREF='VBScript:robar()'>x</a>", '<a>x</a>'],
    ['<a href="data:text/html,<script>robar()</script>">x</a>', '<a>x</a>'],
    // Un `>` dentro de una comilla no puede cortar la etiqueta antes de tiempo:
    // el navegador respeta las comillas y ejecutaría el manejador.
    ['<img src="a>" onerror="alert(1)">', '<img src="a>">'],
    ["<span data-x='a>b' onclick=\"y()\">z</span>", "<span data-x='a>b'>z</span>"],
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(stripUnsafeMarkup(entrada), esperado, entrada);
  }
});

/*
  Contrapartida: el saneado no puede comerse contenido legítimo. El caso del
  código importa especialmente porque el manual de la aplicación documenta
  etiquetas HTML dentro de bloques cercados.
*/
test('el saneado de la importación no toca el contenido legítimo', () => {
  const intactos = [
    'Texto normal con la palabra onclick= suelta en medio.',
    '<img src="imagen.png" alt="foto">',
    '<a href="https://example.org/a?b=1&c=2">enlace</a>',
    '[enlace](https://example.org)',
    '[con titulo](https://example.org "Mi titulo")',
    '![imagen](data:image/png;base64,iVBORw0KGgo=)',
    '`<img onerror="x">` dentro de codigo en linea',
    '```html\n<img src=x onerror="alert(1)">\n```',
    '~~~\n[x](javascript:alert(1))\n~~~',
    '| a | b |\n|---|---|\n| `<a href="javascript:x">` | c |',
  ];
  for (const caso of intactos) {
    assert.equal(stripUnsafeMarkup(caso), caso, caso);
  }
});

test('stripUnsafeMarkup tolera entradas que no son texto', () => {
  assert.equal(stripUnsafeMarkup(null), '');
  assert.equal(stripUnsafeMarkup(undefined), '');
  assert.equal(stripUnsafeMarkup(''), '');
});
