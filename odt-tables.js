/*
  Recovers ODT table header rows.

  Pandoc writes the header of an ODT table into a separate
  <table:table-header-rows> block, but its ODT reader ignores that block, so an
  imported table arrives with an empty first row. The header is still in the
  file, so it can be read from content.xml and put back.

  Tables are matched by order of appearance, which is the order Pandoc keeps
  when converting. Anything that does not line up is left untouched.
*/

const XML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decodeXmlText(value) {
  return value
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, match => XML_ENTITIES[match]);
}

function cellText(cellXml) {
  const paragraphs = cellXml.match(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g) || [];
  const text = paragraphs
    .map(p => p.replace(/<[^>]+>/g, ''))
    .join(' ');
  return decodeXmlText(text).replace(/\s+/g, ' ').trim();
}

function repeatCount(cellXml) {
  const match = cellXml.match(/table:number-columns-repeated="(\d+)"/);
  const count = match ? Number(match[1]) : 1;
  // Trailing filler cells can claim thousands of repeats; ignore those.
  return count > 0 && count < 64 ? count : 1;
}

// One entry per table in the document, each an array of header cell texts
// (empty when the table has no header row).
export function extractOdtTableHeaders(contentXml) {
  if (typeof contentXml !== 'string') return [];
  const tables = contentXml.match(/<table:table\b[\s\S]*?<\/table:table>/g) || [];

  return tables.map((table) => {
    const headerBlock = table.match(/<table:table-header-rows\b[^>]*>([\s\S]*?)<\/table:table-header-rows>/);
    if (!headerBlock) return [];
    const firstRow = headerBlock[1].match(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/);
    if (!firstRow) return [];

    const cells = firstRow[1].match(/<table:table-cell\b[^>]*?(?:\/>|>[\s\S]*?<\/table:table-cell>)/g) || [];
    const headers = [];
    for (const cell of cells) {
      const text = cellText(cell);
      for (let i = 0; i < repeatCount(cell); i += 1) headers.push(text);
    }
    return headers.some(text => text !== '') ? headers : [];
  });
}

const isSeparatorRow = line => /^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/.test(line);
const isTableRow = line => /^\s*\|.*\|\s*$/.test(line);

// Splits on unescaped pipes, so a `\|` inside a cell stays part of the text.
function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/);
}

function isEmptyRow(line) {
  return splitRow(line).every(cell => cell.trim() === '');
}

function alignmentOf(cell) {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

function separatorCell(width, alignment) {
  const inner = Math.max(width, alignment ? 3 : 1);
  if (alignment === 'center') return `:${'-'.repeat(inner)}:`.slice(0, inner + 2);
  if (alignment === 'right') return `${'-'.repeat(inner + 1)}:`;
  if (alignment === 'left') return `:${'-'.repeat(inner + 1)}`;
  return '-'.repeat(inner + 2);
}

// Re-pads every row to the widest cell so the table stays readable after the
// header text is put back.
function realign(rows, separatorIndex) {
  const cells = rows.map(splitRow);
  const columns = cells[0].length;
  const widths = [];
  for (let column = 0; column < columns; column += 1) {
    widths[column] = cells.reduce((max, row, index) => (
      index === separatorIndex ? max : Math.max(max, (row[column] || '').trim().length)
    ), 1);
  }
  const alignments = cells[separatorIndex].map(alignmentOf);

  return rows.map((_row, index) => {
    if (index === separatorIndex) {
      return `|${widths.map((width, column) => separatorCell(width, alignments[column])).join('|')}|`;
    }
    const row = cells[index];
    return `|${widths.map((width, column) => ` ${(row[column] || '').trim().padEnd(width)} `).join('|')}|`;
  });
}

/*
  Fills in the blank header row of each pipe table and realigns the table so the
  restored text does not leave the columns ragged.
*/
export function restoreTableHeaders(markdown, headersPerTable) {
  if (typeof markdown !== 'string' || !Array.isArray(headersPerTable) || headersPerTable.length === 0) {
    return markdown || '';
  }

  const lines = markdown.split('\n');
  let tableIndex = 0;

  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!isTableRow(lines[i]) || !isSeparatorRow(lines[i + 1])) continue;

    let end = i + 2;
    while (end < lines.length && isTableRow(lines[end])) end += 1;

    const headers = headersPerTable[tableIndex];
    tableIndex += 1;

    const columns = splitRow(lines[i]).length;
    if (headers && headers.length === columns && isEmptyRow(lines[i])) {
      lines[i] = `|${headers.map(text => ` ${String(text).replace(/\|/g, '\\|')} `).join('|')}|`;
      const rows = lines.slice(i, end);
      if (rows.every(row => splitRow(row).length === columns)) {
        lines.splice(i, rows.length, ...realign(rows, 1));
      }
    }

    i = end - 1;
  }

  return lines.join('\n');
}
