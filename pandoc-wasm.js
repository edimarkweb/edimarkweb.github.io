/*
 MDAITex: editor para textos generados por IA
 Copyright (C) 2025 Juan José de Haro

 Licencia del código: AGPL v3. Consulte LICENSE.txt para más detalles.
 Contenidos educativos: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
*/
import {
  WASI,
  OpenFile,
  File,
  ConsoleStdout,
  PreopenDirectory,
} from "https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js";

/*
  `extraFiles` monta archivos junto a la entrada, en el sistema de ficheros
  virtual: dentro del WASM no hay disco, así que una opción como
  --epub-cover-image solo encuentra su imagen si se le deja ahí.
*/
export async function pandoc(args_str, inputData, base64Wasm, extraFiles = {}) {
  const bytes = Uint8Array.from(atob(base64Wasm), c => c.charCodeAt(0));

  const args = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"];
  // Las longitudes que espera el WASM son bytes UTF-8, no unidades UTF-16:
  // medir con .length trunca en cuanto aparece un carácter no ASCII.
  const encoder = new TextEncoder();
  const env = [];
  const in_file = new File(new Uint8Array(), { readonly: true });
  const out_file = new File(new Uint8Array(), { readonly: false });

  const fds = [
    new OpenFile(new File(new Uint8Array(), { readonly: true })),
    ConsoleStdout.lineBuffered(msg => console.log(`[stdout] ${msg}`)),
    ConsoleStdout.lineBuffered(msg => console.warn(`[stderr] ${msg}`)),
    new PreopenDirectory("/", [
      ["in", in_file],
      ["out", out_file],
      ...Object.entries(extraFiles || {}).map(([name, bytes]) => [
        name,
        new File(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { readonly: true }),
      ]),
    ]),
  ];

  const wasi = new WASI(args, env, fds);
  const { instance } = await WebAssembly.instantiate(bytes, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  wasi.initialize(instance);
  instance.exports.__wasm_call_ctors();

  function memory_data_view() {
    return new DataView(instance.exports.memory.buffer);
  }

  const argc_ptr = instance.exports.malloc(4);
  memory_data_view().setUint32(argc_ptr, args.length, true);
  const argv = instance.exports.malloc(4 * (args.length + 1));
  for (let i = 0; i < args.length; ++i) {
    const argBytes = encoder.encode(args[i]);
    const arg = instance.exports.malloc(argBytes.length + 1);
    new Uint8Array(instance.exports.memory.buffer, arg, argBytes.length).set(argBytes);
    memory_data_view().setUint8(arg + argBytes.length, 0);
    memory_data_view().setUint32(argv + 4 * i, arg, true);
  }
  memory_data_view().setUint32(argv + 4 * args.length, 0, true);
  const argv_ptr = instance.exports.malloc(4);
  memory_data_view().setUint32(argv_ptr, argv, true);

  instance.exports.hs_init_with_rtsopts(argc_ptr, argv_ptr);

  const argsStrBytes = encoder.encode(args_str);
  const args_ptr = instance.exports.malloc(argsStrBytes.length);
  new Uint8Array(instance.exports.memory.buffer, args_ptr, argsStrBytes.length).set(argsStrBytes);
  let inputBytes;
  if (typeof inputData === 'string') {
    inputBytes = new TextEncoder().encode(inputData);
  } else if (inputData instanceof Uint8Array) {
    inputBytes = inputData;
  } else if (inputData instanceof ArrayBuffer) {
    inputBytes = new Uint8Array(inputData);
  } else {
    inputBytes = new Uint8Array();
  }
  in_file.data = inputBytes;
  instance.exports.wasm_main(args_ptr, argsStrBytes.length);
  return new Uint8Array(out_file.data);
}
