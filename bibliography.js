/*
  Bibliografías y citas.

  Aquí solo vive el modelo: lectura de BibTeX y CSL JSON, búsqueda de entradas,
  construcción de la cita Markdown y preparación de los archivos que Pandoc
  monta en su sistema virtual. No toca el DOM para que pueda probarse en Node.
*/
(function initBibliography(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  } else {
    root.EdiMarkBibliography = exported;
  }
}(typeof window !== 'undefined' ? window : globalThis, function bibliographyFactory() {
  const BIB_EXTENSIONS = ['bib', 'json'];
  const EXAMPLE_BIBLIOGRAPHY_NAME = 'bibliografia-ejemplo.bib';
  const EXAMPLE_BIBLIOGRAPHY = `@book{unesco2023ia,
  author = {{UNESCO}},
  title = {Guidance for Generative AI in Education and Research},
  year = {2023},
  publisher = {UNESCO},
  address = {Paris},
  url = {https://unesdoc.unesco.org/ark:/48223/pf0000386693}
}

@techreport{redecker2017digcompedu,
  author = {Redecker, Christine},
  title = {European Framework for the Digital Competence of Educators: {DigCompEdu}},
  year = {2017},
  institution = {Publications Office of the European Union},
  address = {Luxembourg},
  doi = {10.2760/159770}
}

@book{mayer2009multimedia,
  author = {Mayer, Richard E.},
  title = {Multimedia Learning},
  edition = {2},
  year = {2009},
  publisher = {Cambridge University Press},
  address = {Cambridge},
  doi = {10.1017/CBO9780511811678}
}

@article{sweller1988cognitive,
  author = {Sweller, John},
  title = {Cognitive Load During Problem Solving: Effects on Learning},
  journal = {Cognitive Science},
  year = {1988},
  volume = {12},
  number = {2},
  pages = {257--285},
  doi = {10.1207/s15516709cog1202_4}
}

@article{deharo2009redes,
  author = {de Haro, Juan José},
  title = {Las redes sociales aplicadas a la práctica docente},
  journal = {Didáctica, Innovación y Multimedia},
  year = {2009},
  number = {13},
  pages = {1--8},
  issn = {1699-3748},
  url = {https://dialnet.unirioja.es/servlet/articulo?codigo=2934817}
}

@article{freeman2014active,
  author = {Freeman, Scott and Eddy, Sarah L. and McDonough, Miles and Smith, Michelle K. and Okoroafor, Nnadozie and Jordt, Hannah and Wenderoth, Mary Pat},
  title = {Active Learning Increases Student Performance in Science, Engineering, and Mathematics},
  journal = {Proceedings of the National Academy of Sciences},
  year = {2014},
  volume = {111},
  number = {23},
  pages = {8410--8415},
  doi = {10.1073/pnas.1319030111}
}

@article{roediger2006testing,
  author = {Roediger, Henry L. and Karpicke, Jeffrey D.},
  title = {Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention},
  journal = {Psychological Science},
  year = {2006},
  volume = {17},
  number = {3},
  pages = {249--255},
  doi = {10.1111/j.1467-9280.2006.01693.x}
}`;

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function searchable(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  }

  function stripBibValue(value) {
    let clean = normalizeText(value);
    while ((clean.startsWith('{') && clean.endsWith('}'))
      || (clean.startsWith('"') && clean.endsWith('"'))) {
      clean = clean.slice(1, -1).trim();
    }
    return clean
      .replace(/\\([&%#$])/g, '$1')
      .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\\([{}])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function balancedValue(source, start, open, close) {
    let depth = 0;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const char = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === open) depth += 1;
      if (char === close) {
        depth -= 1;
        if (depth === 0) return { value: source.slice(start, index + 1), end: index + 1 };
      }
    }
    return { value: source.slice(start), end: source.length };
  }

  function readBibFields(source) {
    const fields = {};
    const raw = {};
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /[\s,]/.test(source[index])) index += 1;
      const nameMatch = source.slice(index).match(/^([a-zA-Z][\w-]*)\s*=/);
      if (!nameMatch) {
        index += 1;
        continue;
      }
      const name = nameMatch[1].toLowerCase();
      index += nameMatch[0].length;
      while (index < source.length && /\s/.test(source[index])) index += 1;

      let rawValue = '';
      if (source[index] === '{') {
        const result = balancedValue(source, index, '{', '}');
        rawValue = result.value;
        index = result.end;
      } else if (source[index] === '"') {
        let escaped = false;
        let end = index + 1;
        for (; end < source.length; end += 1) {
          const char = source[end];
          if (!escaped && char === '"') {
            end += 1;
            break;
          }
          if (!escaped && char === '\\') escaped = true;
          else escaped = false;
        }
        rawValue = source.slice(index, end);
        index = end;
      } else {
        const end = source.indexOf(',', index);
        rawValue = source.slice(index, end === -1 ? source.length : end);
        index = end === -1 ? source.length : end;
      }
      fields[name] = stripBibValue(rawValue);
      raw[name] = rawValue;
    }
    return { fields, raw };
  }

  /*
    El apellido del primer autor, que es por donde se busca en una lista de
    referencias. `bibAuthor` invierte el nombre para enseñarlo («Juan José de
    Haro»), así que ordenar por ese campo dejaba la lista alfabetizada por el
    nombre de pila: Christine, Henry, John, Juan José…
  */
  function bibFamily(value, rawValue = '') {
    const first = normalizeText(value).split(/\s+and\s+/i)[0] || '';
    if (!first) return '';
    // `author = {{UNESCO}}` es como BibTeX marca a una institución: se ordena
    // por su nombre entero, no por la última palabra.
    if (/^\s*\{\s*\{/.test(String(rawValue || ''))) return normalizeText(value);
    if (first.includes(',')) return first.split(',')[0].trim();
    const parts = first.split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : first;
  }

  function cslFamily(names) {
    const first = (Array.isArray(names) ? names : [])[0];
    if (!first || typeof first !== 'object') return '';
    return normalizeText(first.family || first.literal);
  }

  function bibAuthor(value) {
    return normalizeText(value)
      .split(/\s+and\s+/i)
      .map(name => name.includes(',')
        ? name.split(',').map(part => part.trim()).filter(Boolean).reverse().join(' ')
        : name)
      .join('; ');
  }

  // Devuelve cada entrada con su texto original, para poder copiarla tal cual
  // al fundir dos bibliografías.
  function bibEntryBlocks(source) {
    const text = String(source ?? '');
    const blocks = [];
    const entryStart = /@([a-zA-Z]+)\s*([({])/g;
    let match;
    while ((match = entryStart.exec(text))) {
      const type = match[1].toLowerCase();
      const open = match[2];
      const close = open === '{' ? '}' : ')';
      const start = entryStart.lastIndex - 1;
      const block = balancedValue(text, start, open, close);
      entryStart.lastIndex = block.end;
      if (['comment', 'preamble', 'string'].includes(type)) continue;
      const inner = block.value.slice(1, -1);
      const comma = inner.indexOf(',');
      if (comma === -1) continue;
      const id = inner.slice(0, comma).trim();
      if (!id || /[\s\[\];]/.test(id)) continue;
      const { fields, raw } = readBibFields(inner.slice(comma + 1));
      blocks.push({
        id,
        type,
        fields,
        raw,
        source: text.slice(match.index, block.end),
      });
    }
    return blocks;
  }

  function parseBibTeX(source) {
    return bibEntryBlocks(source).map(({ id, type, fields, raw }) => ({
      id,
      type,
      title: fields.title || fields.booktitle || fields.journal || '',
      author: bibAuthor(fields.author || fields.editor || ''),
      family: bibFamily(fields.author || fields.editor || '', raw.author || raw.editor || ''),
      year: normalizeText(fields.year || fields.date || '').slice(0, 10),
    }));
  }

  function cslNames(names) {
    return (Array.isArray(names) ? names : [])
      .map((name) => {
        if (!name || typeof name !== 'object') return '';
        return normalizeText([name.given, name.family].filter(Boolean).join(' ') || name.literal);
      })
      .filter(Boolean)
      .join('; ');
  }

  function cslYear(item) {
    const parts = item && item.issued && item.issued['date-parts'];
    if (Array.isArray(parts) && Array.isArray(parts[0]) && parts[0][0]) return String(parts[0][0]);
    return normalizeText(item && (item.issued?.literal || item.year || item.date)).slice(0, 10);
  }

  function parseCslJson(source) {
    let parsed;
    try {
      parsed = JSON.parse(String(source ?? ''));
    } catch (_) {
      return [];
    }
    const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
    return items
      .filter(item => item && typeof item === 'object' && normalizeText(item.id))
      .map(item => ({
        id: normalizeText(item.id),
        type: normalizeText(item.type),
        title: normalizeText(item.title || item['container-title']),
        author: cslNames(item.author || item.editor),
        family: cslFamily(item.author || item.editor),
        year: cslYear(item),
      }));
  }

  function bibliographyFormat(name, source) {
    const extension = String(name || '').toLowerCase().match(/\.([^.]+)$/)?.[1] || '';
    if (extension === 'bib') return 'bib';
    if (extension === 'json') return 'json';
    const trimmed = String(source || '').trim();
    return trimmed.startsWith('[') || trimmed.startsWith('{') ? 'json' : 'bib';
  }

  function parseBibliography(source, name = '') {
    const format = bibliographyFormat(name, source);
    const entries = format === 'json' ? parseCslJson(source) : parseBibTeX(source);
    return entries
      .map(entry => ({ ...entry, search: searchable([
        entry.id, entry.author, entry.title, entry.year, entry.type,
      ].join(' ')) }))
      /*
        Como se lee una bibliografía: por el apellido del primer autor y, a
        igualdad, del trabajo más antiguo al más reciente. Lo que no tiene autor
        —una web institucional, una norma— se coloca por su título, en el mismo
        alfabeto, en vez de amontonarse al principio.
      */
      .sort((left, right) => {
        const compare = (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
        const byAuthor = compare(left.family || left.title || left.id, right.family || right.title || right.id);
        if (byAuthor) return byAuthor;
        const byYear = compare(left.year || '', right.year || '');
        if (byYear) return byYear;
        return compare(left.title || left.id, right.title || right.id);
      });
  }

  function articleAuthors(value) {
    return normalizeText(value)
      .split(/\s*;\s*/)
      .map(author => author.trim())
      .filter(Boolean);
  }

  function cslAuthor(name) {
    const comma = name.indexOf(',');
    if (comma === -1) return { literal: name };
    const family = name.slice(0, comma).trim();
    const given = name.slice(comma + 1).trim();
    return { family, ...(given ? { given } : {}) };
  }

  function bibValue(value) {
    return normalizeText(value)
      .replace(/\\/g, '\\\\')
      .replace(/([{}&%#$])/g, '\\$1');
  }

  const REFERENCE_TYPES = {
    article: { bib: 'article', csl: 'article-journal', required: ['container'] },
    book: { bib: 'book', csl: 'book', required: ['publisher'] },
    chapter: { bib: 'incollection', csl: 'chapter', required: ['container', 'publisher'] },
    report: { bib: 'techreport', csl: 'report', required: ['institution'] },
    web: { bib: 'misc', csl: 'webpage', required: ['url'] },
    thesis: { bib: 'phdthesis', csl: 'thesis', required: ['institution'] },
    conference: { bib: 'inproceedings', csl: 'paper-conference', required: ['container'] },
  };

  const BIB_TO_CSL_TYPE = {
    article: 'article-journal',
    book: 'book',
    incollection: 'chapter',
    inbook: 'chapter',
    techreport: 'report',
    misc: 'webpage',
    online: 'webpage',
    phdthesis: 'thesis',
    mastersthesis: 'thesis',
    thesis: 'thesis',
    inproceedings: 'paper-conference',
    conference: 'paper-conference',
  };

  function bibNamesToCsl(value) {
    return normalizeText(value)
      .split(/\s+and\s+/i)
      .map(name => name.trim())
      .filter(Boolean)
      .map(cslAuthor);
  }

  function bibBlockToCsl({ id, type, fields }) {
    const item = { id, type: BIB_TO_CSL_TYPE[type] || 'document' };
    if (fields.title) item.title = fields.title;
    if (fields.author) item.author = bibNamesToCsl(fields.author);
    if (fields.editor) item.editor = bibNamesToCsl(fields.editor);
    const container = fields.journal || fields.booktitle || fields.howpublished;
    if (container) item['container-title'] = container;
    const year = normalizeText(fields.year || fields.date).match(/\d{4}/);
    if (year) item.issued = { 'date-parts': [[Number(year[0])]] };
    const publisher = fields.publisher || fields.institution || fields.school;
    if (publisher) item.publisher = publisher;
    if (fields.volume) item.volume = fields.volume;
    if (fields.number) item.issue = fields.number;
    if (fields.pages) item.page = fields.pages;
    if (fields.edition) item.edition = fields.edition;
    if (fields.address) item['publisher-place'] = fields.address;
    if (fields.isbn) item.ISBN = fields.isbn;
    if (fields.issn) item.ISSN = fields.issn;
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizeText(fields.urldate))) {
      item.accessed = { 'date-parts': [fields.urldate.split('-').map(Number)] };
    }
    if (fields.doi) item.DOI = fields.doi;
    if (fields.url) item.URL = fields.url;
    return item;
  }

  // Añade a una bibliografía las entradas de otra que aún no estén, en lugar de
  // sustituirla: así cargar el ejemplo no borra lo que ya había.
  function mergeBibliography(source, name = '', extraSource = '', extraName = '') {
    const text = String(source ?? '');
    if (!text.trim()) {
      const content = String(extraSource ?? '');
      const outputName = normalizeText(extraName) || normalizeText(name) || 'bibliografia.bib';
      const entries = parseBibliography(content, outputName);
      return { ok: true, content, name: outputName, entries, added: entries.length };
    }
    const outputName = normalizeText(name) || 'bibliografia.bib';
    const current = parseBibliography(text, outputName);
    const taken = new Set(current.map(entry => entry.id));
    const blocks = bibEntryBlocks(extraSource).filter(block => !taken.has(block.id));
    if (!blocks.length) {
      return { ok: true, content: text, name: outputName, entries: current, added: 0 };
    }
    let content;
    if (bibliographyFormat(outputName, text) === 'json') {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        return { ok: false, error: 'invalid-library' };
      }
      const items = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(items)) return { ok: false, error: 'invalid-library' };
      blocks.forEach(block => items.push(bibBlockToCsl(block)));
      content = `${JSON.stringify(parsed, null, 2)}\n`;
    } else {
      content = `${text.trimEnd()}\n\n${blocks.map(block => block.source.trim()).join('\n\n')}\n`;
    }
    return {
      ok: true,
      content,
      name: outputName,
      entries: parseBibliography(content, outputName),
      added: blocks.length,
    };
  }

  function citationKeyPart(value) {
    return searchable(value).replace(/[^a-z0-9]+/g, '');
  }

  // La clave es opcional: si no se escribe, se compone con el apellido, el año y
  // una palabra del título, y se le añade un número si ya estuviera ocupada.
  function suggestCitationKey(reference = {}, taken = []) {
    const used = new Set(taken);
    const first = articleAuthors(reference.author)[0] || '';
    const family = citationKeyPart(first.includes(',') ? first.split(',')[0] : first.split(/\s+/).pop() || '');
    const word = normalizeText(reference.title)
      .split(/\s+/)
      .map(citationKeyPart)
      .find(part => part.length > 3) || '';
    const year = normalizeText(reference.year).match(/\d{4}/)?.[0] || '';
    const base = `${family}${year}${word}`.slice(0, 60) || 'referencia';
    let key = base;
    let suffix = 1;
    while (used.has(key)) {
      suffix += 1;
      key = `${base}${suffix}`;
    }
    return key;
  }

  function appendReference(source, name = '', reference = {}) {
    const type = REFERENCE_TYPES[reference.type] ? reference.type : 'article';
    const normalized = {
      id: normalizeText(reference.id),
      author: normalizeText(reference.author),
      editor: normalizeText(reference.editor),
      title: normalizeText(reference.title),
      container: normalizeText(reference.container || reference.journal),
      year: normalizeText(reference.year),
      publisher: normalizeText(reference.publisher),
      institution: normalizeText(reference.institution),
      volume: normalizeText(reference.volume),
      number: normalizeText(reference.number),
      pages: normalizeText(reference.pages),
      edition: normalizeText(reference.edition),
      place: normalizeText(reference.place),
      isbn: normalizeText(reference.isbn),
      accessed: normalizeText(reference.accessed),
      doi: normalizeText(reference.doi),
      url: normalizeText(reference.url),
    };
    if (!normalized.author || !normalized.title || !normalized.year
      || REFERENCE_TYPES[type].required.some(field => !normalized[field])) {
      return { ok: false, error: 'required-fields' };
    }
    if (normalized.id && !/^[A-Za-z0-9][A-Za-z0-9_.:+/-]*$/.test(normalized.id)) {
      return { ok: false, error: 'invalid-key' };
    }
    if (!/^\d{4}$/.test(normalized.year)) return { ok: false, error: 'invalid-year' };

    const text = String(source ?? '');
    const outputName = normalizeText(name) || 'bibliografia.bib';
    const taken = parseBibliography(text, outputName).map(entry => entry.id);
    if (!normalized.id) normalized.id = suggestCitationKey(normalized, taken);
    else if (taken.includes(normalized.id)) return { ok: false, error: 'duplicate-key' };

    let content;
    if (bibliographyFormat(outputName, text) === 'json') {
      let parsed;
      try {
        parsed = text.trim() ? JSON.parse(text) : [];
      } catch (_) {
        return { ok: false, error: 'invalid-library' };
      }
      const items = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(items)) return { ok: false, error: 'invalid-library' };
      const item = {
        id: normalized.id,
        type: REFERENCE_TYPES[type].csl,
        title: normalized.title,
        author: articleAuthors(normalized.author).map(cslAuthor),
        issued: { 'date-parts': [[Number(normalized.year)]] },
      };
      if (normalized.editor) item.editor = articleAuthors(normalized.editor).map(cslAuthor);
      if (normalized.container) item['container-title'] = normalized.container;
      if (normalized.publisher) item.publisher = normalized.publisher;
      if (normalized.institution) item.publisher = normalized.institution;
      if (normalized.volume) item.volume = normalized.volume;
      if (normalized.number) item.issue = normalized.number;
      if (normalized.pages) item.page = normalized.pages;
      if (normalized.edition) item.edition = normalized.edition;
      if (normalized.place) item['publisher-place'] = normalized.place;
      if (normalized.isbn) item.ISBN = normalized.isbn;
      if (normalized.accessed && /^\d{4}-\d{2}-\d{2}$/.test(normalized.accessed)) {
        item.accessed = { 'date-parts': [normalized.accessed.split('-').map(Number)] };
      }
      if (normalized.doi) item.DOI = normalized.doi;
      if (normalized.url) item.URL = normalized.url;
      items.push(item);
      content = `${JSON.stringify(parsed, null, 2)}\n`;
    } else {
      const fields = [
        `  author = {${bibValue(articleAuthors(normalized.author).join(' and '))}}`,
        `  title = {${bibValue(normalized.title)}}`,
      ];
      if (normalized.editor) fields.push(`  editor = {${bibValue(articleAuthors(normalized.editor).join(' and '))}}`);
      if (normalized.container) {
        fields.push(`  ${type === 'article' ? 'journal' : (type === 'web' ? 'howpublished' : 'booktitle')} = {${bibValue(normalized.container)}}`);
      }
      fields.push(`  year = {${normalized.year}}`);
      if (normalized.publisher) fields.push(`  publisher = {${bibValue(normalized.publisher)}}`);
      if (normalized.institution) {
        const field = type === 'thesis' ? 'school' : 'institution';
        fields.push(`  ${field} = {${bibValue(normalized.institution)}}`);
      }
      if (normalized.volume) fields.push(`  volume = {${bibValue(normalized.volume)}}`);
      if (normalized.number) fields.push(`  number = {${bibValue(normalized.number)}}`);
      if (normalized.pages) fields.push(`  pages = {${bibValue(normalized.pages)}}`);
      if (normalized.edition) fields.push(`  edition = {${bibValue(normalized.edition)}}`);
      if (normalized.place) fields.push(`  address = {${bibValue(normalized.place)}}`);
      if (normalized.isbn) fields.push(`  isbn = {${bibValue(normalized.isbn)}}`);
      if (normalized.accessed) fields.push(`  urldate = {${bibValue(normalized.accessed)}}`);
      if (normalized.doi) fields.push(`  doi = {${bibValue(normalized.doi)}}`);
      if (normalized.url) fields.push(`  url = {${bibValue(normalized.url)}}`);
      const entry = `@${REFERENCE_TYPES[type].bib}{${normalized.id},\n${fields.join(',\n')}\n}`;
      content = `${text.trimEnd()}${text.trim() ? '\n\n' : ''}${entry}\n`;
    }
    return {
      ok: true,
      content,
      name: outputName,
      entries: parseBibliography(content, outputName),
    };
  }

  function appendArticle(source, name = '', article = {}) {
    return appendReference(source, name, { ...article, type: 'article' });
  }

  function searchBibliography(entries, query) {
    const needle = searchable(query);
    if (!needle) return Array.from(entries || []);
    return (entries || []).filter(entry => String(entry.search || '').includes(needle));
  }

  function cleanLocator(value) {
    return normalizeText(value).replace(/[\[\]]/g, '');
  }

  function buildCitation(ids, options = {}) {
    const unique = [];
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
      const clean = normalizeText(id);
      if (clean && !/[\s\[\];]/.test(clean) && !unique.includes(clean)) unique.push(clean);
    });
    if (!unique.length) return '';
    let mode = ['parenthetical', 'narrative', 'suppress-author'].includes(options.mode)
      ? options.mode : 'parenthetical';
    let locator = cleanLocator(options.locator);
    if (unique.length !== 1 && mode !== 'parenthetical') mode = 'parenthetical';
    if (unique.length !== 1) locator = '';
    if (mode === 'narrative') return `@${unique[0]}${locator ? ` [${locator}]` : ''}`;
    const marker = mode === 'suppress-author' ? `-@${unique[0]}` : unique.map(id => `@${id}`).join('; ');
    return `[${marker}${locator ? `, ${locator}` : ''}]`;
  }

  function citationDetails(source) {
    const text = String(source || '').trim();
    const ids = citationIds(text);
    let mode = 'parenthetical';
    if (!text.startsWith('[')) mode = 'narrative';
    else if (/^\[\s*-@/.test(text)) mode = 'suppress-author';
    let locator = '';
    if (ids.length === 1) {
      if (mode === 'narrative') locator = text.match(/\s+\[([^\]\n]+)\]\s*$/)?.[1] || '';
      else locator = text.match(/@[^,;\]]+,\s*([^\]\n]+)\]\s*$/)?.[1] || '';
    }
    return { ids, mode, locator: cleanLocator(locator) };
  }

  function citationIds(source) {
    const ids = [];
    const pattern = /-?@([A-Za-z0-9][^\s,;\]]*)/g;
    let match;
    while ((match = pattern.exec(String(source || '')))) {
      if (!ids.includes(match[1])) ids.push(match[1]);
    }
    return ids;
  }

  function shortAuthor(author) {
    const names = normalizeText(author).split(/\s*;\s*/).filter(Boolean);
    const surname = name => {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length === 1 || name === name.toLocaleUpperCase()) return name;
      const particle = parts.length > 1 && /^(?:de|del|da|do|dos|van|von)$/i.test(parts[parts.length - 2])
        ? `${parts[parts.length - 2]} ` : '';
      return `${particle}${parts[parts.length - 1]}`;
    };
    if (!names.length) return '';
    if (names.length === 1) return surname(names[0]);
    if (names.length === 2) return `${surname(names[0])} & ${surname(names[1])}`;
    return `${surname(names[0])} et al.`;
  }

  function formatPreviewCitation(source, entries) {
    const byId = new Map((entries || []).map(entry => [entry.id, entry]));
    const ids = citationIds(source);
    if (!ids.length || ids.some(id => !byId.has(id))) return '';
    const details = citationDetails(source);
    const labels = ids.map((id) => {
      const entry = byId.get(id);
      const suppressAuthor = details.mode === 'suppress-author';
      return [suppressAuthor ? '' : shortAuthor(entry.author), entry.year].filter(Boolean).join(', ')
        || entry.title
        || id;
    });
    const locator = details.locator ? `, ${details.locator}` : '';
    if (details.mode === 'narrative') {
      const entry = byId.get(ids[0]);
      return `${shortAuthor(entry.author) || entry.title || ids[0]} (${entry.year || ''}${locator})`;
    }
    return `(${labels.join('; ')}${locator})`;
  }

  function isCslStyle(source) {
    const text = String(source || '');
    return /<style\b/i.test(text) && /<info\b/i.test(text);
  }

  function normalizeSettings(settings = {}) {
    const bibliographyContent = typeof settings.bibliographyContent === 'string'
      ? settings.bibliographyContent : '';
    const bibliographyName = typeof settings.bibliographyName === 'string'
      ? settings.bibliographyName : '';
    const cslContent = typeof settings.cslContent === 'string' ? settings.cslContent : '';
    const cslName = typeof settings.cslName === 'string' ? settings.cslName : '';
    return { bibliographyContent, bibliographyName, cslContent, cslName };
  }

  function pandocResources(settings = {}) {
    const normalized = normalizeSettings(settings);
    if (!normalized.bibliographyContent.trim()) return { args: '', files: {} };
    const format = bibliographyFormat(normalized.bibliographyName, normalized.bibliographyContent);
    const bibliographyFile = format === 'json' ? 'references.json' : 'references.bib';
    const encoder = new TextEncoder();
    const files = { [bibliographyFile]: encoder.encode(normalized.bibliographyContent) };
    let args = ` --citeproc --bibliography=/${bibliographyFile}`;
    if (normalized.cslContent.trim()) {
      files['style.csl'] = encoder.encode(normalized.cslContent);
      args += ' --csl=/style.csl';
    }
    return { args, files };
  }

  return {
    BIB_EXTENSIONS,
    EXAMPLE_BIBLIOGRAPHY,
    EXAMPLE_BIBLIOGRAPHY_NAME,
    parseBibTeX,
    parseCslJson,
    parseBibliography,
    bibEntryBlocks,
    mergeBibliography,
    suggestCitationKey,
    REFERENCE_TYPES,
    appendReference,
    appendArticle,
    searchBibliography,
    buildCitation,
    citationDetails,
    citationIds,
    formatPreviewCitation,
    bibliographyFormat,
    isCslStyle,
    normalizeSettings,
    pandocResources,
  };
}));
