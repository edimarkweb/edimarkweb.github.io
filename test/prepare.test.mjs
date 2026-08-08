import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureEpubMetadata,
  extractMarkdownTitle,
  hasYamlFrontMatter,
  collectRemoteImageUrls,
  replaceImageUrls,
  dropImagesByUrl,
  trimInlineMath,
  normalizeNewlines,
  normalizeThematicBreaks,
  buildImportArgs,
  stripEpubAnchorPrefixes,
  collectArchiveImagePaths,
  inlineArchiveImages,
} from '../pandoc-prepare.js';
import { readZipEntries, mimeForPath } from '../zip-reader.js';
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

test('ensureEpubMetadata respeta el front matter propio del documento', () => {
  const original = '---\ntitle: "Mío"\nauthor: Ana\n---\n\n# Cuerpo\n';
  const result = ensureEpubMetadata(original, { fallbackTitle: 'otro', lang: 'es' });
  assert.equal(result.markdown, original);
  assert.equal(result.injected, false);
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

test('inlineArchiveImages saca las imágenes del archivo y las incrusta', async () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  const zip = makeZip({
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
  const zip = makeZip({ 'otra/cosa.txt': 'nada' });
  const markdown = '![x](Pictures/ausente.png)\n';
  assert.equal(await inlineArchiveImages(markdown, zip), markdown);
  // Un archivo ilegible tampoco debe romper la importación.
  assert.equal(await inlineArchiveImages(markdown, new Uint8Array([1, 2, 3])), markdown);
  assert.equal(await inlineArchiveImages(markdown, null), markdown);
});

test('readZipEntries omite directorios y descomprime entradas deflate', async () => {
  const zip = makeZip({ 'dir/': '', 'a.txt': 'hola', 'b.bin': new Uint8Array([0, 1, 2]) });
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
