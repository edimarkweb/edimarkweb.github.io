import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../vendor/pdf-runtime/', import.meta.url);
test('el runtime PDF local incluye los binarios íntegros y las dependencias de Pyodide', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  const files = new Set(manifest.files.map(file => file.name));
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(file.name, root));
    assert.equal(bytes.length, file.bytes, file.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.name);
  }
  const lock = JSON.parse(await readFile(new URL('pyodide-lock.json', root), 'utf8'));
  function checkDependency(name) {
    const pkg = lock.packages[name];
    assert.ok(pkg, name);
    assert.ok(files.has(pkg.file_name), `Missing local dependency: ${name}`);
    for (const dependency of pkg.depends) checkDependency(dependency);
  }
  for (const name of ['numpy', 'pillow', 'packaging']) checkDependency(name);
});

/*
  `pdf-import.py` lleva una copia de `extract_cells` de PyMuPDF con una rama
  añadida: la biblioteca marca negrita, cursiva, monoespaciada y tachado
  dentro de una celda, pero no el superíndice, y sin él una llamada de nota al
  pie llega pegada a la palabra anterior. Una copia de la función de otro es
  correcta mientras siga siendo la de la versión de la que se tomó, así que al
  actualizar PyMuPDF este test falla: hay que coger el `extract_cells` nuevo,
  volver a añadirle la rama y mover `PATCHED_PYMUPDF`. Sin esto, el parche se
  desactiva solo en silencio y las notas dejan de detectarse sin que nadie se
  entere.
*/
test('el parche de PyMuPDF declara la versión que el runtime instala', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  const source = await readFile(new URL('../pdf-import.py', import.meta.url), 'utf8');
  const patched = /^PATCHED_PYMUPDF = '([^']+)'$/m.exec(source);
  assert.ok(patched, 'pdf-import.py debería declarar PATCHED_PYMUPDF');
  assert.equal(
    patched[1],
    manifest.pymupdf,
    'PyMuPDF ha cambiado de versión: rehaz extract_cells_with_superscripts sobre la nueva y actualiza PATCHED_PYMUPDF',
  );
});
