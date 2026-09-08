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
