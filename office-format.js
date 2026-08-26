/*
Formato del texto dentro del DOCX y del ODT.

Ninguno de los dos escritores de Pandoc acepta la alineación, la letra o los
márgenes como metadatos: todo eso sale de su plantilla interna. La única vía
es abrir el archivo que acaba de generar y reescribir sus estilos, que es lo
que se hace aquí —la misma técnica que ya usan `odt-tables.js` y
`odt-formulas.js` para lo que Pandoc no deja arreglar de otro modo.

Solo se toca lo que el usuario haya fijado. Un documento sin formato propio
sale byte a byte como salía antes.

Son funciones de texto a texto, sin ZIP ni DOM, para poder probarlas en Node.
*/
// Word mide en vigésimas de punto, y la letra en medios puntos.
export const TWIPS_PER_CM = 566.9291338582677;
const DOCX_ALIGN = { left: 'start', justify: 'both', right: 'end' };
const ODT_ALIGN = { left: 'start', justify: 'justify', right: 'end' };
// Una sangría clásica de primera línea, en las unidades de cada formato.
export const INDENT_CM = 1.25;

const round = value => Math.round(value);

function escapeXmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ DOCX */

/*
  La plantilla escribe la letra con referencias al tema (`w:asciiTheme`), que
  ganan a cualquier nombre suelto que se añada al lado, así que se sustituyen
  en vez de acompañarlas.
*/
function docxRunDefaults(xml, styles) {
  if (!styles.fontName && !styles.fontSizePt) return xml;
  return xml.replace(/<w:rPrDefault>([\s\S]*?)<\/w:rPrDefault>/, (match, inner) => {
    let updated = inner;
    if (styles.fontName) {
      const font = escapeXmlAttribute(styles.fontName);
      const rFonts = `<w:rFonts w:ascii="${font}" w:cs="${font}" w:eastAsia="${font}" w:hAnsi="${font}" />`;
      updated = /<w:rFonts\b[^>]*\/>/.test(updated)
        ? updated.replace(/<w:rFonts\b[^>]*\/>/, () => rFonts)
        : updated.replace(/<w:rPr>/, () => `<w:rPr>${rFonts}`);
    }
    if (styles.fontSizePt) {
      const halfPoints = round(styles.fontSizePt * 2);
      updated = /<w:sz\b[^>]*\/>/.test(updated)
        ? updated.replace(/<w:sz\b[^>]*\/>/, () => `<w:sz w:val="${halfPoints}" />`)
        : updated.replace(/<w:rPr>/, () => `<w:rPr><w:sz w:val="${halfPoints}" />`);
      updated = /<w:szCs\b[^>]*\/>/.test(updated)
        ? updated.replace(/<w:szCs\b[^>]*\/>/, () => `<w:szCs w:val="${halfPoints}" />`)
        : updated.replace(/<w:sz\b[^>]*\/>/, match2 => `${match2}<w:szCs w:val="${halfPoints}" />`);
    }
    return `<w:rPrDefault>${updated}</w:rPrDefault>`;
  });
}

/*
  Alineación, interlineado y sangría van al párrafo por omisión. El esquema
  de OOXML es una secuencia, no una bolsa: `w:jc` detrás de `w:spacing` y de
  `w:ind`, o Word da el archivo por dañado y se niega a abrirlo.
*/
const DOCX_PPR_ORDER = [
  'w:pStyle', 'w:keepNext', 'w:keepLines', 'w:pageBreakBefore', 'w:framePr',
  'w:widowControl', 'w:numPr', 'w:suppressLineNumbers', 'w:pBdr', 'w:shd',
  'w:tabs', 'w:suppressAutoHyphens', 'w:kinsoku', 'w:wordWrap',
  'w:overflowPunct', 'w:topLinePunct', 'w:autoSpaceDE', 'w:autoSpaceDN',
  'w:bidi', 'w:adjustRightInd', 'w:snapToGrid', 'w:spacing', 'w:ind',
  'w:contextualSpacing', 'w:mirrorIndents', 'w:suppressOverlap', 'w:jc',
  'w:textDirection', 'w:textAlignment', 'w:textboxTightWrap',
  'w:outlineLvl', 'w:divId', 'w:cnfStyle', 'w:rPr', 'w:sectPr', 'w:pPrChange',
];

function docxElementName(element) {
  const match = element.match(/^<([\w:]+)/);
  return match ? match[1] : '';
}

function sortDocxParagraphChildren(elements) {
  return elements
    .map((element, index) => ({ element, index, rank: DOCX_PPR_ORDER.indexOf(docxElementName(element)) }))
    .sort((a, b) => {
      // Lo que no está en la lista conserva su sitio relativo al final.
      const rankA = a.rank === -1 ? DOCX_PPR_ORDER.length : a.rank;
      const rankB = b.rank === -1 ? DOCX_PPR_ORDER.length : b.rank;
      return rankA - rankB || a.index - b.index;
    })
    .map(entry => entry.element);
}

function docxParagraphDefaults(xml, styles) {
  if (!styles.align && !styles.lineHeight && !styles.indent) return xml;
  return xml.replace(/<w:pPrDefault>([\s\S]*?)<\/w:pPrDefault>/, (match, inner) => {
    const pPr = inner.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
    const children = (pPr ? pPr[1] : '').match(/<[\w:]+[^>]*\/>|<([\w:]+)[^>]*>[\s\S]*?<\/\2>/g) || [];

    const kept = children
      .filter(element => !['w:jc', 'w:ind'].includes(docxElementName(element)))
      .map((element) => {
        // El interlineado se suma al `w:spacing` que ya trae la plantilla:
        // dos elementos iguales dejarían el documento fuera del esquema.
        if (docxElementName(element) !== 'w:spacing') return element;
        const cleaned = element.replace(/\s*w:(line|lineRule)="[^"]*"/g, '');
        if (!styles.lineHeight) return cleaned;
        return cleaned.replace(/\s*\/>$/, ` w:line="${round(styles.lineHeight * 240)}" w:lineRule="auto" />`);
      });

    const added = [];
    if (styles.lineHeight && !kept.some(element => docxElementName(element) === 'w:spacing')) {
      added.push(`<w:spacing w:line="${round(styles.lineHeight * 240)}" w:lineRule="auto" />`);
    }
    if (styles.indent) {
      const twips = styles.indent === 'yes' ? round(INDENT_CM * TWIPS_PER_CM) : 0;
      added.push(`<w:ind w:firstLine="${twips}" />`);
    }
    if (styles.align) added.push(`<w:jc w:val="${DOCX_ALIGN[styles.align]}" />`);

    const ordered = sortDocxParagraphChildren([...kept, ...added]);
    return `<w:pPrDefault><w:pPr>${ordered.join('')}</w:pPr></w:pPrDefault>`;
  });
}

/*
  Los encabezados de la plantilla llevan su tamaño en puntos, no en
  proporción al cuerpo, así que con otro tamaño base hay que estirarlos para
  que la jerarquía siga siendo la misma.
*/
function docxHeadingSizes(xml, scale) {
  if (!scale || scale === 1) return xml;
  return xml.replace(
    /<w:style\b[^>]*w:styleId="(Heading\d)"[\s\S]*?<\/w:style>/g,
    style => style.replace(
      /<w:(sz|szCs) w:val="(\d+)" \/>/g,
      (match, tag, value) => `<w:${tag} w:val="${round(Number(value) * scale)}" />`,
    ),
  );
}

export function applyDocxStyles(stylesXml, styles) {
  if (typeof stylesXml !== 'string' || !stylesXml) return stylesXml;
  let updated = docxRunDefaults(stylesXml, styles);
  updated = docxParagraphDefaults(updated, styles);
  updated = docxHeadingSizes(updated, styles.headingScale);
  return updated;
}

/*
  Los encabezados no toman su letra de `docDefaults`, sino de las fuentes
  «major» y «minor» del tema, así que cambiar el tema es lo que hace que el
  documento entero use una sola tipografía —igual que en la vista previa.
*/
export function applyDocxTheme(themeXml, fontName) {
  if (typeof themeXml !== 'string' || !themeXml || !fontName) return themeXml;
  const font = escapeXmlAttribute(fontName);
  return themeXml.replace(/<a:(majorFont|minorFont)>([\s\S]*?)<\/a:\1>/g, (match, tag, inner) => {
    const updated = inner.replace(
      /<a:latin\b[^>]*\/>/,
      () => `<a:latin typeface="${font}"/>`,
    );
    return `<a:${tag}>${updated}</a:${tag}>`;
  });
}

/*
  Los márgenes viven en la sección, al final del cuerpo. Pandoc la deja
  vacía (`<w:sectPr />`), de modo que casi siempre hay que abrirla.
*/
export function applyDocxMargins(documentXml, marginsCm) {
  if (typeof documentXml !== 'string' || !documentXml) return documentXml;
  const sides = Object.keys(marginsCm || {});
  if (!sides.length) return documentXml;
  const attribute = side => (
    typeof marginsCm[side] === 'number'
      ? ` w:${side}="${round(marginsCm[side] * TWIPS_PER_CM)}"`
      : ''
  );
  const pgMar = `<w:pgMar${attribute('top')}${attribute('right')}${attribute('bottom')}${attribute('left')} />`;
  if (/<w:sectPr\s*\/>/.test(documentXml)) {
    return documentXml.replace(/<w:sectPr\s*\/>/, () => `<w:sectPr>${pgMar}</w:sectPr>`);
  }
  if (/<w:sectPr\b[^>]*>/.test(documentXml)) {
    return documentXml
      .replace(/<w:pgMar\b[^>]*\/>/, '')
      .replace(/(<w:sectPr\b[^>]*>)/, (match, open) => `${open}${pgMar}`);
  }
  return documentXml.replace(/<\/w:body>/, () => `<w:sectPr>${pgMar}</w:sectPr></w:body>`);
}

/* Word parte las palabras solo si el documento se lo pide. */
export function applyDocxHyphenation(settingsXml, hyphenate) {
  if (typeof settingsXml !== 'string' || !settingsXml || !hyphenate) return settingsXml;
  const value = hyphenate === 'yes' ? 'true' : 'false';
  if (/<w:autoHyphenation\b[^>]*\/>/.test(settingsXml)) {
    return settingsXml.replace(/<w:autoHyphenation\b[^>]*\/>/, () => `<w:autoHyphenation w:val="${value}" />`);
  }
  return settingsXml.replace(/(<w:settings\b[^>]*>)/, (match, open) => (
    `${open}<w:autoHyphenation w:val="${value}" />`
  ));
}

/* ------------------------------------------------------------------- ODT */

function odtParagraphProperties(styles) {
  const attributes = [];
  if (styles.align) attributes.push(`fo:text-align="${ODT_ALIGN[styles.align]}"`);
  if (styles.lineHeight) attributes.push(`fo:line-height="${round(styles.lineHeight * 100)}%"`);
  if (styles.indent) {
    attributes.push(`fo:text-indent="${styles.indent === 'yes' ? `${INDENT_CM}cm` : '0cm'}"`);
  }
  if (styles.hyphenate) {
    attributes.push(`fo:hyphenate="${styles.hyphenate === 'yes' ? 'true' : 'false'}"`);
    if (styles.hyphenate === 'yes') {
      // Sin mínimos, LibreOffice parte dejando una letra suelta en la línea.
      attributes.push('fo:hyphenation-remain-char-count="2"', 'fo:hyphenation-push-char-count="2"');
    }
  }
  return attributes;
}

function odtTextProperties(styles) {
  const attributes = [];
  if (styles.fontName) {
    const font = escapeXmlAttribute(styles.fontName);
    attributes.push(`style:font-name="${font}"`, `style:font-name-asian="${font}"`, `style:font-name-complex="${font}"`);
  }
  if (styles.fontSizePt) {
    const size = `${styles.fontSizePt}pt`;
    attributes.push(`fo:font-size="${size}"`, `style:font-size-asian="${size}"`, `style:font-size-complex="${size}"`);
  }
  return attributes;
}

/*
  Todo cuelga de `Standard`, que Pandoc deja vacío y autocerrado. Los
  encabezados heredan de `Heading`, cuyo tamaño sí es absoluto: los `115%` de
  «Heading 1» se miden contra él, así que basta con estirar ese.
*/
export function applyOdtStyles(stylesXml, styles) {
  if (typeof stylesXml !== 'string' || !stylesXml) return stylesXml;
  const paragraph = odtParagraphProperties(styles);
  const text = odtTextProperties(styles);
  let updated = stylesXml;

  if (paragraph.length || text.length) {
    const body = [
      paragraph.length ? `<style:paragraph-properties ${paragraph.join(' ')} />` : '',
      text.length ? `<style:text-properties ${text.join(' ')} />` : '',
    ].join('');
    const openTag = /<style:style([^>]*style:name="Standard"[^>]*?)\s*\/>/;
    if (openTag.test(updated)) {
      updated = updated.replace(openTag, (match, attributes) => (
        `<style:style${attributes}>${body}</style:style>`
      ));
    } else {
      updated = updated.replace(
        /(<style:style[^>]*style:name="Standard"[^>]*>)/,
        (match, open) => `${open}${body}`,
      );
    }
  }

  if (styles.fontName) {
    // Un nombre sin declarar deja a LibreOffice adivinando la tipografía.
    const font = escapeXmlAttribute(styles.fontName);
    if (!new RegExp(`<style:font-face[^>]*style:name="${font}"`).test(updated)) {
      updated = updated.replace(
        /(<office:font-face-decls\b[^>]*>)/,
        (match, open) => `${open}<style:font-face style:name="${font}" svg:font-family="${font}" />`,
      );
    }
  }

  if (styles.fontName) {
    // «Heading» declara su propia tipografía, así que no hereda la de Standard.
    const font = escapeXmlAttribute(styles.fontName);
    updated = updated.replace(
      /(<style:style[^>]*style:name="Heading"[^>]*>[\s\S]*?<\/style:style>)/,
      heading => heading.replace(
        /(style:font-name|style:font-name-asian|style:font-name-complex)="[^"]*"/g,
        (match, attribute) => `${attribute}="${font}"`,
      ),
    );
  }

  if (styles.headingScale && styles.headingScale !== 1) {
    updated = updated.replace(
      /(<style:style[^>]*style:name="Heading"[^>]*>[\s\S]*?<\/style:style>)/,
      heading => heading.replace(
        /(fo:font-size|style:font-size-asian|style:font-size-complex)="([\d.]+)pt"/g,
        (match, attribute, value) => (
          `${attribute}="${Number((Number(value) * styles.headingScale).toFixed(1))}pt"`
        ),
      ),
    );
  }
  return updated;
}

/* La caja de la página, en la disposición que declara el propio archivo. */
export function applyOdtMargins(stylesXml, marginsCm) {
  if (typeof stylesXml !== 'string' || !stylesXml) return stylesXml;
  const sides = Object.keys(marginsCm || {});
  if (!sides.length) return stylesXml;
  return stylesXml.replace(/<style:page-layout-properties\b[^>]*>/, (properties) => {
    let updated = properties;
    sides.forEach((side) => {
      const declaration = `fo:margin-${side}="${marginsCm[side]}cm"`;
      const existing = new RegExp(`fo:margin-${side}="[^"]*"`);
      updated = existing.test(updated)
        ? updated.replace(existing, () => declaration)
        : updated.replace(/^<style:page-layout-properties/, match => `${match} ${declaration}`);
    });
    return updated;
  });
}
