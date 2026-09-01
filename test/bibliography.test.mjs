import assert from 'node:assert/strict';
import test from 'node:test';

import bibliography from '../bibliography.js';

const {
  parseBibliography,
  appendReference,
  appendArticle,
  searchBibliography,
  buildCitation,
  citationDetails,
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

test('construye y vuelve a leer citas narrativas, parentéticas y sin autor', () => {
  assert.equal(buildCitation('deharo2009redes', { mode: 'narrative' }), '@deharo2009redes');
  assert.equal(
    buildCitation('deharo2009redes', { mode: 'narrative', locator: 'p. 5' }),
    '@deharo2009redes [p. 5]',
  );
  assert.equal(
    buildCitation('deharo2009redes', { mode: 'suppress-author', locator: 'pp. 5–7' }),
    '[-@deharo2009redes, pp. 5–7]',
  );
  assert.deepEqual(citationDetails('@deharo2009redes [cap. 3]'), {
    ids: ['deharo2009redes'], mode: 'narrative', locator: 'cap. 3',
  });
  assert.deepEqual(citationDetails('[-@deharo2009redes, p. 5]'), {
    ids: ['deharo2009redes'], mode: 'suppress-author', locator: 'p. 5',
  });
  assert.equal(
    buildCitation(['uno', 'dos'], { mode: 'narrative', locator: 'p. 5' }),
    '[@uno; @dos]',
  );
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
  assert.equal(entries.length, 7);
  assert.deepEqual(
    entries.map(entry => entry.id).sort(),
    [
      'deharo2009redes',
      'freeman2014active',
      'mayer2009multimedia',
      'redecker2017digcompedu',
      'roediger2006testing',
      'sweller1988cognitive',
      'unesco2023ia',
    ],
  );
  entries.forEach((entry) => {
    assert.ok(entry.title, `falta título en ${entry.id}`);
    assert.ok(entry.author, `falta autor en ${entry.id}`);
    assert.match(entry.year, /^\d{4}$/);
  });
  assert.deepEqual(
    entries.find(entry => entry.id === 'deharo2009redes'),
    {
      id: 'deharo2009redes',
      type: 'article',
      title: 'Las redes sociales aplicadas a la práctica docente',
      author: 'Juan José de Haro',
      year: '2009',
      search: 'deharo2009redes juan jose de haro las redes sociales aplicadas a la practica docente 2009 article',
    },
  );
});

test('añade un artículo a una biblioteca BibTeX y evita claves repetidas', () => {
  const article = {
    id: 'deharo2026ia',
    author: 'de Haro, Juan José; García, Ana',
    title: 'Inteligencia artificial y aprendizaje',
    journal: 'Educación Digital',
    year: '2026',
    doi: '10.1234/ed.2026.1',
    url: 'https://example.com/articulo',
  };
  const result = appendArticle(EXAMPLE_BIBLIOGRAPHY, EXAMPLE_BIBLIOGRAPHY_NAME, article);
  assert.equal(result.ok, true);
  assert.equal(result.entries.length, 8);
  assert.match(result.content, /@article\{deharo2026ia,/);
  assert.match(result.content, /author = \{de Haro, Juan José and García, Ana\}/);
  assert.equal(result.entries.find(entry => entry.id === article.id).author, 'Juan José de Haro; Ana García');
  assert.deepEqual(
    appendArticle(result.content, result.name, article),
    { ok: false, error: 'duplicate-key' },
  );
});

test('crea una biblioteca nueva y amplía CSL JSON sin cambiar su formato', () => {
  const article = {
    id: 'lopez2025',
    author: 'López, Marta',
    title: 'Aprender con fuentes',
    journal: 'Aula Abierta',
    year: '2025',
  };
  const created = appendArticle('', '', article);
  assert.equal(created.ok, true);
  assert.equal(created.name, 'bibliografia.bib');
  assert.equal(created.entries.length, 1);

  const json = appendArticle('{"items":[]}', 'fuentes.json', article);
  assert.equal(json.ok, true);
  assert.equal(json.entries.length, 1);
  const parsed = JSON.parse(json.content);
  assert.equal(parsed.items[0]['container-title'], 'Aula Abierta');
  assert.deepEqual(parsed.items[0].author, [{ family: 'López', given: 'Marta' }]);
});

test('crea los siete tipos de referencia con sus campos propios', () => {
  const cases = [
    ['article', { container: 'Revista', volume: '12', number: '2', pages: '5--9' }, '@article', 'article-journal'],
    ['book', { publisher: 'Editorial', edition: '2', isbn: '978-1' }, '@book', 'book'],
    ['chapter', { container: 'Libro colectivo', publisher: 'Editorial', editor: 'Pérez, Marta' }, '@incollection', 'chapter'],
    ['report', { institution: 'UNESCO', number: '42' }, '@techreport', 'report'],
    ['web', { url: 'https://example.com', accessed: '2026-09-01' }, '@misc', 'webpage'],
    ['thesis', { institution: 'Universidad' }, '@phdthesis', 'thesis'],
    ['conference', { container: 'Actas del Congreso', pages: '10--15' }, '@inproceedings', 'paper-conference'],
  ];
  cases.forEach(([type, extra, bibType, cslType], index) => {
    const reference = {
      type,
      id: `ref${index}`,
      author: 'García, Ana',
      title: `Título ${index}`,
      year: '2026',
      ...extra,
    };
    const result = appendReference('', '', reference);
    assert.equal(result.ok, true, type);
    assert.match(result.content, new RegExp(`^${bibType}\\{ref${index},`));
    const json = appendReference('[]', 'references.json', reference);
    assert.equal(json.ok, true, `${type} CSL`);
    assert.equal(JSON.parse(json.content)[0].type, cslType);
  });
});

test('compone una etiqueta breve para la vista previa', () => {
  const entries = parseBibliography(EXAMPLE_BIBLIOGRAPHY, EXAMPLE_BIBLIOGRAPHY_NAME);
  assert.equal(
    formatPreviewCitation('[@redecker2017digcompedu; @sweller1988cognitive]', entries),
    '(Redecker, 2017; Sweller, 1988)',
  );
  assert.equal(formatPreviewCitation('[@no-existe]', entries), '');
  assert.equal(formatPreviewCitation('@deharo2009redes [p. 5]', entries), 'de Haro (2009, p. 5)');
  assert.equal(formatPreviewCitation('[-@deharo2009redes, p. 5]', entries), '(2009, p. 5)');
});
