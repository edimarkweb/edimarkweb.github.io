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

  function searchBibliography(entries, query) {
    const needle = searchable(query);
    if (!needle) return Array.from(entries || []);
    return (entries || []).filter(entry => String(entry.search || '').includes(needle));
  }

  function buildCitation(ids) {
    const unique = [];
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
      const clean = normalizeText(id);
      if (clean && !/[\s\[\];]/.test(clean) && !unique.includes(clean)) unique.push(clean);
    });
    return unique.length ? `[${unique.map(id => `@${id}`).join('; ')}]` : '';
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
      return parts[parts.length - 1];
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
    const labels = ids.map((id) => {
      const entry = byId.get(id);
      const suppressAuthor = String(source).includes(`-@${id}`);
      return [suppressAuthor ? '' : shortAuthor(entry.author), entry.year].filter(Boolean).join(', ')
        || entry.title
        || id;
    });
    return `(${labels.join('; ')})`;
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
    searchBibliography,
    buildCitation,
    citationIds,
    formatPreviewCitation,
    bibliographyFormat,
    isCslStyle,
    normalizeSettings,
    pandocResources,
  };
}));
