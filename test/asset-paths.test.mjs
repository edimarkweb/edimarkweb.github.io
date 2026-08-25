import assert from 'node:assert/strict';
import test from 'node:test';

import assetPaths from '../asset-paths.js';

const {
  buildAssetIndex,
  directoryOf,
  isImagePath,
  isRelativeAssetPath,
  lookupAsset,
  mimeTypeFor,
  normalizeRelativePath,
  relativePathFrom,
  resolveAgainstDirectory,
} = assetPaths;

test('distingue las rutas que hay que resolver de las que ya sabe cargar el navegador', () => {
  assert.equal(isRelativeAssetPath('imagenes/01.png'), true);
  assert.equal(isRelativeAssetPath('./imagenes/01.png'), true);
  assert.equal(isRelativeAssetPath('../comunes/logo.png'), true);
  assert.equal(isRelativeAssetPath('01.png'), true);

  assert.equal(isRelativeAssetPath('https://ejemplo.org/01.png'), false);
  assert.equal(isRelativeAssetPath('data:image/png;base64,AAA'), false);
  assert.equal(isRelativeAssetPath('blob:http://localhost/abc'), false);
  assert.equal(isRelativeAssetPath('/var/imagenes/01.png'), false);
  assert.equal(isRelativeAssetPath('C:\\Documentos\\01.png'), false);
  assert.equal(isRelativeAssetPath('//servidor/recursos/01.png'), false);
  assert.equal(isRelativeAssetPath('#seccion'), false);
  assert.equal(isRelativeAssetPath(''), false);
});

test('normaliza las rutas relativas y descodifica los espacios', () => {
  assert.equal(normalizeRelativePath('./imagenes/01.png'), 'imagenes/01.png');
  assert.equal(normalizeRelativePath('imagenes/../fotos/01.png'), 'fotos/01.png');
  assert.equal(normalizeRelativePath('imagenes\\01.png'), 'imagenes/01.png');
  assert.equal(normalizeRelativePath('imagenes/Apuntes%20de%20clase.png'), 'imagenes/Apuntes de clase.png');
  assert.equal(normalizeRelativePath('imagenes/01.png?v=2'), 'imagenes/01.png');
  // Un porcentaje suelto no es un escape y no debe romper la ruta.
  assert.equal(normalizeRelativePath('imagenes/100%.png'), 'imagenes/100%.png');
  // Lo que sube por encima del origen se conserva para resolverlo después.
  assert.equal(normalizeRelativePath('../comunes/logo.png'), '../comunes/logo.png');
});

test('resuelve la ruta contra la carpeta del documento en Linux y en Windows', () => {
  assert.equal(
    resolveAgainstDirectory('/home/juanjo/articulo', 'imagenes/01.png'),
    '/home/juanjo/articulo/imagenes/01.png',
  );
  assert.equal(
    resolveAgainstDirectory('/home/juanjo/articulo', '../comunes/logo.png'),
    '/home/juanjo/comunes/logo.png',
  );
  assert.equal(
    resolveAgainstDirectory('C:\\Documentos\\Tema 3', 'imagenes/01.png'),
    'C:\\Documentos\\Tema 3\\imagenes\\01.png',
  );
  assert.equal(
    resolveAgainstDirectory('/home/juanjo/articulo', 'imagenes/Apuntes%20de%20clase.png'),
    '/home/juanjo/articulo/imagenes/Apuntes de clase.png',
  );
});

test('extrae la carpeta del documento conservando el separador', () => {
  assert.equal(directoryOf('/home/juanjo/articulo/articulo.md'), '/home/juanjo/articulo');
  assert.equal(directoryOf('C:\\Documentos\\Tema 3\\apuntes.md'), 'C:\\Documentos\\Tema 3');
  assert.equal(directoryOf('apuntes.md'), '');
});

test('calcula la ruta relativa que se escribe al insertar una imagen', () => {
  assert.equal(
    relativePathFrom('/home/juanjo/articulo', '/home/juanjo/articulo/imagenes/01.png'),
    'imagenes/01.png',
  );
  assert.equal(
    relativePathFrom('/home/juanjo/articulo', '/home/juanjo/comunes/logo.png'),
    '../comunes/logo.png',
  );
  assert.equal(
    relativePathFrom('C:\\Documentos\\Tema 3', 'C:\\Documentos\\Tema 3\\imagenes\\01.png'),
    'imagenes/01.png',
  );
  // Otra unidad de Windows: no hay ruta relativa posible.
  assert.equal(relativePathFrom('C:\\Documentos', 'D:\\Fotos\\01.png'), '');
  assert.equal(relativePathFrom('', '/home/juanjo/01.png'), '');
});

test('reconoce las extensiones de imagen y su tipo', () => {
  assert.equal(isImagePath('imagenes/01.PNG'), true);
  assert.equal(isImagePath('imagenes/logo.svg'), true);
  assert.equal(isImagePath('documento.md'), false);
  assert.equal(mimeTypeFor('01.jpg'), 'image/jpeg');
  assert.equal(mimeTypeFor('logo.svg'), 'image/svg+xml');
  assert.equal(mimeTypeFor('cualquiera.xyz'), 'application/octet-stream');
});

test('encuentra la imagen en la carpeta vinculada aunque la ruta venga de otra altura', () => {
  const portada = { nombre: 'portada' };
  const grafico = { nombre: 'grafico' };
  const assetIndex = buildAssetIndex([
    { path: 'articulo/imagenes/00-portada.jpg', file: portada },
    { path: 'articulo/imagenes/01-grafico.png', file: grafico },
    { path: 'articulo/articulo.md', file: { nombre: 'markdown' } },
  ]);

  assert.equal(lookupAsset(assetIndex, 'imagenes/00-portada.jpg'), portada);
  assert.equal(lookupAsset(assetIndex, './imagenes/01-grafico.png'), grafico);
  assert.equal(lookupAsset(assetIndex, '01-grafico.png'), grafico);
  assert.equal(lookupAsset(assetIndex, 'imagenes/no-existe.png'), null);
});

test('no adivina cuando dos carpetas tienen una imagen con el mismo nombre', () => {
  const uno = { nombre: 'uno' };
  const dos = { nombre: 'dos' };
  const assetIndex = buildAssetIndex([
    { path: 'tema-1/imagenes/01.png', file: uno },
    { path: 'tema-2/imagenes/01.png', file: dos },
  ]);

  // El nombre suelto es ambiguo: mejor no mostrar nada que mostrar la otra.
  assert.equal(lookupAsset(assetIndex, '01.png'), null);
  assert.equal(lookupAsset(assetIndex, 'imagenes/01.png'), null);
  // Con la carpeta que las distingue, sí.
  assert.equal(lookupAsset(assetIndex, 'tema-2/imagenes/01.png'), dos);
});
