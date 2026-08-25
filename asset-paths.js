/*
  Rutas de los archivos que acompañan a un documento Markdown.

  Un `.md` normal no lleva las imágenes dentro: las referencia con rutas
  relativas a su propia carpeta (`imagenes/01.png`, `../comunes/logo.png`). Para
  que la vista previa las muestre hay que convertir esas rutas en algo que el
  webview pueda cargar, y eso exige resolverlas contra la carpeta del documento
  (aplicación de escritorio) o buscarlas en la carpeta que el usuario haya
  vinculado (navegador).

  Aquí viven solo las funciones de rutas, sin DOM ni sistema de archivos, para
  poder probarlas con `node --test`.
*/
(function initAssetPaths(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  } else {
    root.EdiMarkAssetPaths = exported;
  }
}(typeof window !== 'undefined' ? window : globalThis, function assetPathsFactory() {
  const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico',
  ]);

  const MIME_TYPES = new Map([
    ['png', 'image/png'],
    ['jpg', 'image/jpeg'],
    ['jpeg', 'image/jpeg'],
    ['gif', 'image/gif'],
    ['webp', 'image/webp'],
    ['svg', 'image/svg+xml'],
    ['bmp', 'image/bmp'],
    ['avif', 'image/avif'],
    ['ico', 'image/x-icon'],
  ]);

  /* Windows mezcla los dos separadores; dentro se trabaja siempre con `/`. */
  function toSlashes(path) {
    return String(path || '').replace(/\\/g, '/');
  }

  function extensionOf(path) {
    const match = toSlashes(path).replace(/[?#].*$/, '').match(/\.([^./]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  function isImagePath(path) {
    return IMAGE_EXTENSIONS.has(extensionOf(path));
  }

  function mimeTypeFor(path) {
    return MIME_TYPES.get(extensionOf(path)) || 'application/octet-stream';
  }

  /*
    Una ruta es relativa —y por tanto hay que resolverla— cuando no es ya algo
    que el navegador sepa cargar por su cuenta: URL con esquema (http:, data:,
    blob:, asset:…), ruta absoluta de Linux o macOS, ruta absoluta de Windows
    (`C:\…`) o UNC (`\\servidor\…`). El ancla suelta (`#seccion`) tampoco es un
    archivo.
  */
  function isRelativeAssetPath(src) {
    const value = String(src || '').trim();
    if (!value) return false;
    if (value.startsWith('#')) return false;
    if (value.startsWith('//')) return false;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
    const slashed = toSlashes(value);
    if (slashed.startsWith('/')) return false;
    return true;
  }

  /*
    Quita `./`, aplica los `../` que se puedan aplicar y descodifica los `%20`
    de los nombres con espacios, que es como los escriben casi todos los
    editores. Los `../` que se salen por arriba se conservan, porque una ruta
    como `../comunes/logo.png` es legítima y se resolverá contra la carpeta del
    documento.
  */
  function normalizeRelativePath(path) {
    let value = toSlashes(path).replace(/[?#].*$/, '');
    try {
      value = decodeURIComponent(value);
    } catch (_) {
      /* Un `%` suelto no es un escape: se deja el texto tal cual. */
    }
    const result = [];
    for (const segment of value.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..' && result.length && result[result.length - 1] !== '..') {
        result.pop();
        continue;
      }
      result.push(segment);
    }
    return result.join('/');
  }

  /* La carpeta que contiene el archivo, conservando el separador original. */
  function directoryOf(filePath) {
    const raw = String(filePath || '');
    const index = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
    if (index < 0) return '';
    return raw.slice(0, index);
  }

  /*
    Une la carpeta del documento con la ruta relativa de la imagen. El
    resultado mantiene el estilo de la base —barras invertidas en Windows— para
    que se lo pueda tragar el sistema de archivos tal cual.
  */
  function resolveAgainstDirectory(baseDir, relativePath) {
    const base = String(baseDir || '');
    if (!base) return normalizeRelativePath(relativePath);
    const windowsStyle = base.includes('\\') && !base.includes('/');
    const segments = toSlashes(base).replace(/\/+$/, '').split('/');
    for (const segment of toSlashes(String(relativePath || '')).replace(/[?#].*$/, '').split('/')) {
      const piece = decodeSegment(segment);
      if (!piece || piece === '.') continue;
      if (piece === '..') {
        if (segments.length > 1) segments.pop();
        continue;
      }
      segments.push(piece);
    }
    const joined = segments.join('/');
    return windowsStyle ? joined.replace(/\//g, '\\') : joined;
  }

  function decodeSegment(segment) {
    try {
      return decodeURIComponent(segment);
    } catch (_) {
      return segment;
    }
  }

  /*
    Camino desde la carpeta del documento hasta el archivo, que es lo que se
    escribe en el Markdown al insertar una imagen «con ruta relativa». Si el
    archivo está fuera del árbol del documento se sube con `../`, y si está en
    otra unidad de Windows no hay ruta relativa posible y se devuelve cadena
    vacía: quien llame decidirá qué hacer.
  */
  function relativePathFrom(baseDir, targetPath) {
    const base = toSlashes(baseDir).replace(/\/+$/, '');
    const target = toSlashes(targetPath);
    if (!base || !target) return '';
    const baseSegments = base.split('/').filter(Boolean);
    const targetSegments = target.split('/').filter(Boolean);
    const caseInsensitive = /^[a-zA-Z]:$/.test(baseSegments[0] || '');
    const same = (a, b) => (caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b);
    if (caseInsensitive && targetSegments.length && !same(baseSegments[0], targetSegments[0])) {
      return '';
    }
    let common = 0;
    while (
      common < baseSegments.length
      && common < targetSegments.length
      && same(baseSegments[common], targetSegments[common])
    ) {
      common += 1;
    }
    const ups = new Array(baseSegments.length - common).fill('..');
    return [...ups, ...targetSegments.slice(common)].join('/');
  }

  /*
    Índice de las imágenes de una carpeta vinculada en el navegador, donde no
    hay rutas del sistema y solo se dispone de los archivos que el usuario ha
    entregado.

    Se indexa cada archivo por todos los sufijos de su ruta —`01.png`,
    `imagenes/01.png`, `tema-3/imagenes/01.png`— porque el documento puede
    nombrar la imagen desde cualquier altura y la carpeta elegida puede ser la
    del documento o una que la contenga. Al buscar se prueba del sufijo más
    largo al más corto, así que la coincidencia más específica gana; las
    ambiguas (dos `01.png` en carpetas distintas) solo se resuelven si la ruta
    pedida las distingue.
  */
  function buildAssetIndex(entries) {
    const index = new Map();
    const ambiguous = new Set();
    for (const entry of entries || []) {
      const path = normalizeRelativePath(entry && entry.path);
      if (!path || !isImagePath(path)) continue;
      const segments = path.split('/');
      for (let i = 0; i < segments.length; i += 1) {
        const key = segments.slice(i).join('/');
        if (index.has(key)) {
          if (index.get(key) !== entry.file) ambiguous.add(key);
          continue;
        }
        index.set(key, entry.file);
      }
    }
    return { index, ambiguous };
  }

  function lookupAsset(assetIndex, relativePath) {
    if (!assetIndex || !assetIndex.index) return null;
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized) return null;
    const segments = normalized.split('/');
    for (let i = 0; i < segments.length; i += 1) {
      const key = segments.slice(i).join('/');
      if (assetIndex.index.has(key) && !assetIndex.ambiguous.has(key)) {
        return assetIndex.index.get(key);
      }
    }
    return null;
  }

  return {
    buildAssetIndex,
    directoryOf,
    extensionOf,
    isImagePath,
    isRelativeAssetPath,
    lookupAsset,
    mimeTypeFor,
    normalizeRelativePath,
    relativePathFrom,
    resolveAgainstDirectory,
  };
}));
