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

      let raw = '';
      if (source[index] === '{') {
        const result = balancedValue(source, index, '{', '}');
        raw = result.value;
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
        raw = source.slice(index, end);
        index = end;
      } else {
        const end = source.indexOf(',', index);
        raw = source.slice(index, end === -1 ? source.length : end);
        index = end === -1 ? source.length : end;
      }
      fields[name] = stripBibValue(raw);
    }
    return fields;
  }

  function bibAuthor(value) {
    return normalizeText(value)
      .split(/\s+and\s+/i)
      .map(name => name.includes(',')
        ? name.split(',').map(part => part.trim()).filter(Boolean).reverse().join(' ')
        : name)
      .join('; ');
  }

  function parseBibTeX(source) {
    const text = String(source ?? '');
    const entries = [];
    const entryStart = /@([a-zA-Z]+)\s*([({])/g;
    let match;
    while ((match = entryStart.exec(text))) {
      const type = match[1].toLowerCase();
      if (['comment', 'preamble', 'string'].includes(type)) continue;
      const open = match[2];
      const close = open === '{' ? '}' : ')';
      const start = entryStart.lastIndex - 1;
      const block = balancedValue(text, start, open, close);
      entryStart.lastIndex = block.end;
      const inner = block.value.slice(1, -1);
      const comma = inner.indexOf(',');
      if (comma === -1) continue;
      const id = inner.slice(0, comma).trim();
      if (!id || /[\s\[\];]/.test(id)) continue;
      const fields = readBibFields(inner.slice(comma + 1));
      const author = bibAuthor(fields.author || fields.editor || '');
      const title = fields.title || fields.booktitle || fields.journal || '';
      const year = fields.year || fields.date || '';
      entries.push({ id, type, title, author, year: normalizeText(year).slice(0, 10) });
    }
    return entries;
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
      .sort((left, right) => {
        const a = left.author || left.title || left.id;
        const b = right.author || right.title || right.id;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
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
    if (!normalized.id || !normalized.author || !normalized.title || !normalized.year
      || REFERENCE_TYPES[type].required.some(field => !normalized[field])) {
      return { ok: false, error: 'required-fields' };
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:+/-]*$/.test(normalized.id)) {
      return { ok: false, error: 'invalid-key' };
    }
    if (!/^\d{4}$/.test(normalized.year)) return { ok: false, error: 'invalid-year' };

    const text = String(source ?? '');
    const outputName = normalizeText(name) || 'bibliografia.bib';
    if (parseBibliography(text, outputName).some(entry => entry.id === normalized.id)) {
      return { ok: false, error: 'duplicate-key' };
    }

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
