import assert from 'node:assert/strict';

// Esta función se serializa para Playwright. No debe cerrar sobre variables de Node.
export function inspectProfile(html = null) {
  const root = html === null ? document.getElementById('html-output')
    : new DOMParser().parseFromString(html, 'text/html').body;
  const text = node => node.textContent.replace(/\s+/g, ' ').trim();
  const body = root.cloneNode(true);
  const alignedTable = root.querySelectorAll('table')[1];
  body.querySelectorAll('.footnotes, [data-edimark-bibliography]').forEach(n => n.remove());
  const noteContent = n => {
    if (!n) return null;
    const copy = n.cloneNode(true);
    copy.querySelectorAll('.footnote-back, .footnote-backref').forEach(a => a.remove());
    return [...copy.querySelectorAll('p')].length ? [...copy.querySelectorAll('p')].map(text) : [text(copy)];
  };
  return {
    computedTableAlignments: html === null
      ? [...(alignedTable?.querySelectorAll('th,td') || [])].map(n => getComputedStyle(n).textAlign)
      : null,
    headings: [...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => [n.tagName, text(n)]),
    tables: [...body.querySelectorAll('table')].map(table => [...table.rows].map(row =>
      [...row.cells].map(cell => ({ kind: cell.tagName, text: text(cell), align: cell.style.textAlign || cell.getAttribute('align') || '' })))),
    emphasis: ['strong', 'em', 'del', 'sub', 'sup'].map(tag =>
      [...body.querySelectorAll(tag)].filter(n => !n.closest('.katex, .footnote-reference, .footnote-ref')).map(text)),
    lists: [...body.querySelectorAll('ul,ol')].map(list => ({
      kind: list.tagName, start: Number(list.getAttribute('start') || 1),
      items: [...list.children].map(item => {
        const copy = item.cloneNode(true);
        copy.querySelectorAll('ul,ol').forEach(n => n.remove());
        return text(copy);
      }),
    })),
    links: [...body.querySelectorAll('a[href^="https://example.org/"]')]
      .map(n => [text(n), n.getAttribute('href'), n.getAttribute('title') || '']),
    code: [...body.querySelectorAll('pre code')].map(n => n.textContent.trimEnd()),
    breaks: [...body.querySelectorAll('p')].filter(n => n.querySelector('br')).map(n => ({text: text(n), count: n.querySelectorAll('br').length})),
    softParagraph: [...body.querySelectorAll('p')].some(n => text(n) === 'Primera línea del mismo párrafo segunda línea del mismo párrafo.' && !n.querySelector('br')),
    literal: [...body.querySelectorAll('p')].some(n => text(n) === 'Escapados: *sin cursiva*, ~2~, ^3^ y #sin título.' && !n.querySelector('em,sub,sup')),
    rules: body.querySelectorAll('hr').length,
    // Pandoc repite la definición por llamada; la hoja reutiliza una nota.
    // Comparar el destino de cada llamada comprueba el significado en ambos.
    notes: [...root.querySelectorAll('.footnote-reference a, a.footnote-ref')]
      .map(a => noteContent(root.querySelector(a.getAttribute('href')))),
  };
}

export function assertProfile(detail) {
  if (detail.computedTableAlignments !== null) assert.deepEqual(detail.computedTableAlignments,
    Array.from({length: 5}, () => ['left', 'center', 'right']).flat(), 'alineación efectiva en pantalla o impresión');
  assert.deepEqual(detail.headings, [
    ['H1', 'Perfil Markdown'], ['H2', 'Texto y énfasis'], ['H2', 'Enlaces e imágenes'],
    ['H2', 'Listas y tareas'], ['H2', 'Tablas'], ['H2', 'Fórmulas'], ['H2', 'Notas y bibliografía'],
    ['H2', 'Código y caracteres literales'], ['H2', 'Párrafos y saltos'],
    ['H2', 'Encabezados de todos los niveles'], ['H3', 'Ejemplo H3'], ['H4', 'Ejemplo H4'],
    ['H5', 'Ejemplo H5'], ['H6', 'Ejemplo H6'], ['H2', 'Separador horizontal'],
  ], 'jerarquía H1–H6');
  const cell = (kind, text, align = '') => ({kind, text, align});
  assert.deepEqual(detail.tables, [
    [[cell('TH', 'Sustancia'), cell('TH', 'Área')], [cell('TD', 'H2O'), cell('TD', 'm2')]],
    [
      [cell('TH', 'Izquierda', 'left'), cell('TH', 'Centro', 'center'), cell('TH', 'Derecha', 'right')],
      [cell('TD', 'Negrita en celda', 'left'), cell('TD', 'Cursiva en celda', 'center'), cell('TD', '123', 'right')],
      [cell('TD', 'A | B', 'left'), cell('TD', 'Enlace en celda', 'center'), cell('TD', '45', 'right')],
      [cell('TD', 'Vacía a la derecha', 'left'), cell('TD', 'H2O', 'center'), cell('TD', '', 'right')],
      [cell('TD', 'Código en celda', 'left'), cell('TD', 'a + b', 'center'), cell('TD', '7', 'right')],
    ],
  ], 'filas, columnas, cabeceras, alineación, barra escapada y celda vacía');
  assert.deepEqual(detail.emphasis, [
    ['Negrita', 'Negrita en celda'], ['cursiva', 'Cursiva en celda'], ['tachado'], ['2', '2', '2'], ['2', '2'],
  ], 'énfasis e índices, también dentro de las celdas');
  assert.deepEqual(detail.lists, [
    {kind:'UL', start:1, items:['Elemento']}, {kind:'UL', start:1, items:['Anidado']},
    {kind:'OL', start:1, items:['Primero', 'Segundo']}, {kind:'UL', start:1, items:['Pendiente', 'Hecho']},
  ], 'tipo, orden y anidamiento de listas');
  assert.deepEqual(detail.links, [
    ['Enlace explícito', 'https://example.org/explicit', ''], ['https://example.org/bare', 'https://example.org/bare', ''],
    ['Enlace con título', 'https://example.org/title', 'Título del enlace'],
    ['https://example.org/angle', 'https://example.org/angle', ''],
    ['enlace por referencia', 'https://example.org/reference', 'Referencia'],
    ['Enlace en celda', 'https://example.org/cell', ''],
  ], 'texto, destino y título de enlaces');
  assert.deepEqual(detail.code, ['"Texto" ... -- ---\nH~2~O y $a^2$', '# Esto es código, no un título\n```js\nconst x = "literal";\n```\n| Esto | No es una tabla |'], 'código literal y cercas anidadas');
  assert.equal(detail.softParagraph, true, 'el salto blando sigue en el mismo párrafo');
  assert.equal(detail.breaks.length, 1);
  assert.equal(detail.breaks[0].count, 1, 'un salto visible');
  assert.ok(detail.breaks[0].text.includes('Primera línea con salto visible.'));
  assert.ok(detail.breaks[0].text.includes('Segunda línea con salto visible.'));
  assert.equal(detail.literal, true, 'los caracteres escapados no se interpretan');
  assert.equal(detail.rules, 1, 'el separador no se confunde con YAML');
  assert.deepEqual(detail.notes, [['Explicación con énfasis.'], ['Explicación con énfasis.'], ['Primer párrafo de la nota larga.', 'Segundo párrafo con cursiva en nota.']], 'cada llamada alcanza su nota, incluida la repetida y la multipárrafo');
}
