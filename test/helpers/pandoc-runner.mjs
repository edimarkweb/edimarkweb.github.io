/*
  Runs the bundled pandoc.wasm exactly like the browser does: same argument
  string, same WASI shim (@bjorn3/browser_wasi_shim) and same /in and /out
  in-memory files as pandoc-wasm.js. The WASM module is compiled once and
  reused, since decoding pandoc.b64 is the slow part.
*/
import { WASI, OpenFile, File, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let modulePromise = null;

function loadModule() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const base64 = (await readFile(join(repoRoot, 'pandoc.b64'), 'utf8')).trim();
      return WebAssembly.compile(Buffer.from(base64, 'base64'));
    })();
  }
  return modulePromise;
}

export async function runPandoc(argsString, input) {
  const wasmModule = await loadModule();
  const args = ['pandoc.wasm', '+RTS', '-H64m', '-RTS'];
  const inFile = new File(new Uint8Array(), { readonly: true });
  const outFile = new File(new Uint8Array(), { readonly: false });
  const stderr = [];
  const fds = [
    new OpenFile(new File(new Uint8Array(), { readonly: true })),
    ConsoleStdout.lineBuffered(() => {}),
    ConsoleStdout.lineBuffered(line => stderr.push(line)),
    new PreopenDirectory('/', [['in', inFile], ['out', outFile]]),
  ];

  const wasi = new WASI(args, [], fds);
  const instance = await WebAssembly.instantiate(wasmModule, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  wasi.initialize(instance);
  instance.exports.__wasm_call_ctors();

  const view = () => new DataView(instance.exports.memory.buffer);
  const argcPtr = instance.exports.malloc(4);
  view().setUint32(argcPtr, args.length, true);
  const argv = instance.exports.malloc(4 * (args.length + 1));
  for (let i = 0; i < args.length; i += 1) {
    const ptr = instance.exports.malloc(args[i].length + 1);
    new TextEncoder().encodeInto(args[i], new Uint8Array(instance.exports.memory.buffer, ptr, args[i].length));
    view().setUint8(ptr + args[i].length, 0);
    view().setUint32(argv + 4 * i, ptr, true);
  }
  view().setUint32(argv + 4 * args.length, 0, true);
  const argvPtr = instance.exports.malloc(4);
  view().setUint32(argvPtr, argv, true);
  instance.exports.hs_init_with_rtsopts(argcPtr, argvPtr);

  const argsPtr = instance.exports.malloc(argsString.length);
  new TextEncoder().encodeInto(argsString, new Uint8Array(instance.exports.memory.buffer, argsPtr, argsString.length));
  inFile.data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);

  let threw = null;
  try {
    instance.exports.wasm_main(argsPtr, argsString.length);
  } catch (error) {
    threw = error;
  }

  return { bytes: new Uint8Array(outFile.data), stderr, threw };
}

// Minimal ZIP reader (central directory walk) so tests can assert on the
// contents of an EPUB without pulling in a dependency.
export function readZipEntries(bytes) {
  const buffer = Buffer.from(bytes);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error('No es un ZIP: falta el end-of-central-directory');

  const total = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < total; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Cabecera central inválida');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

export const MARKDOWN_READER = [
  'markdown',
  '+tex_math_dollars',
  '+tex_math_single_backslash',
  '+tex_math_double_backslash',
  '+raw_tex',
  '-auto_identifiers',
].join('');
