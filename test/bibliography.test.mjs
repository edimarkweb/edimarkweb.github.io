import assert from 'node:assert/strict';
import test from 'node:test';

import bibliography from '../bibliography.js';

const {
  parseBibliography,
  searchBibliography,
  buildCitation,
  isCslStyle,
  pandocResources,
  EXAMPLE_BIBLIOGRAPHY,
  EXAMPLE_BIBLIOGRAPHY_NAME,
  formatPreviewCitation,
} = bibliography;

test('lee BibTeX con campos anidados, autores y claves', () => {
  const entries = parseBibliography(`
    @book{garcia2024,
      author = {García, Ana and López, Luis},
      title = {Enseñar {IA} en el aula},
      year = {2024}
    }
    @article{muller2023, author="Müller, Eva", title="Práctica", year=2023}
  `, 'fuentes.bib');
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.find(entry => entry.id === 'garcia2024'), {
    id: 'garcia2024',
    type: 'book',
    title: 'Enseñar IA en el aula',
    author: 'Ana García; Luis López',
    year: '2024',
    search: 'garcia2024 ana garcia; luis lopez ensenar ia en el aula 2024 book',
  });
});

test('lee CSL JSON y toma autor, título y año', () => {
  const entries = parseBibliography(JSON.stringify([{
    id: 'doe2025',
    type: 'article-journal',
    title: 'Learning with Markdown',
    author: [{ given: 'Jane', family: 'Doe' }],
    issued: { 'date-parts': [[2025, 4, 2]] },
  }]), 'library.json');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].author, 'Jane Doe');
  assert.equal(entries[0].year, '2025');
});

test('busca sin distinguir mayúsculas ni tildes', () => {
  const entries = parseBibliography('@book{clave, author={García, Ana}, title={Educación}, year={2024}}', 'a.bib');
  assert.deepEqual(searchBibliography(entries, 'GARCIA educacion').map(entry => entry.id), ['clave']);
});

test('construye citas múltiples sin repetir claves inseguras', () => {
  assert.equal(buildCitation(['uno', 'dos', 'uno', 'clave mala']), '[@uno; @dos]');
  assert.equal(buildCitation([]), '');
});

test('reconoce un estilo CSL y prepara archivos locales para Pandoc', () => {
  const csl = '<?xml version="1.0"?><style><info><title>Prueba</title></info></style>';
  assert.equal(isCslStyle(csl), true);
  const resources = pandocResources({
    bibliographyName: 'fuentes.bib',
    bibliographyContent: '@book{x,title={X}}',
    cslName: 'apa.csl',
    cslContent: csl,
  });
  assert.match(resources.args, /--citeproc --bibliography=\/references\.bib --csl=\/style\.csl/);
  assert.equal(new TextDecoder().decode(resources.files['references.bib']), '@book{x,title={X}}');
  assert.equal(new TextDecoder().decode(resources.files['style.csl']), csl);
});

test('la bibliografía de ejemplo está completa y lista para buscar y citar', () => {
  const entries = parseBibliography(EXAMPLE_BIBLIOGRAPHY, EXAMPLE_BIBLIOGRAPHY_NAME);
  assert.equal(entries.length, 4);
  assert.deepEqual(
    entries.map(entry => entry.id).sort(),
    ['mayer2009multimedia', 'redecker2017digcompedu', 'sweller1988cognitive', 'unesco2023ia'],
  );
  entries.forEach((entry) => {
    assert.ok(entry.title, `falta título en ${entry.id}`);
    assert.ok(entry.author, `falta autor en ${entry.id}`);
    assert.match(entry.year, /^\d{4}$/);
  });
});

test('compone una etiqueta breve para la vista previa', () => {
  const entries = parseBibliography(EXAMPLE_BIBLIOGRAPHY, EXAMPLE_BIBLIOGRAPHY_NAME);
  assert.equal(
    formatPreviewCitation('[@redecker2017digcompedu; @sweller1988cognitive]', entries),
    '(Redecker, 2017; Sweller, 1988)',
  );
  assert.equal(formatPreviewCitation('[@no-existe]', entries), '');
});
