/*
  Minimal ZIP writer, the counterpart of zip-reader.js.

  Entries are deflated when the platform offers CompressionStream, and stored
  otherwise. Compression started to matter when the app began rebuilding a DOCX
  before handing it to the user: stored, a manual grew from 22 KB to 159 KB just
  to flip one flag in settings.xml. The ODT rebuilt on its way into Pandoc never
  reaches the disk, so there either way works.

  `mimetype` is never compressed, and is expected first: an ODT whose first
  entry is not a stored `mimetype` is not a valid ODT.

  Insertion order is preserved.
*/

/*
  Bit 11 de los «general purpose flags»: los nombres de entrada van en UTF-8.
  Sin él, quien lea el archivo interpreta los nombres con la página de códigos
  local y una imagen como `Pictures/gráfico.png` vuelve con el nombre roto.
  TextEncoder ya escribe UTF-8, así que solo faltaba anunciarlo.
*/
const UTF8_NAME_FLAG = 0x0800;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(content) {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new TextEncoder().encode(String(content ?? ''));
}

const STORED = 0;
const DEFLATED = 8;

/*
  Devuelve los bytes comprimidos, o null cuando no compensa: sin
  CompressionStream, o si el resultado no es menor que el original, que es lo
  normal en lo ya comprimido (un PNG, un JPEG).
*/
async function deflateRaw(bytes) {
  if (typeof CompressionStream !== 'function' || bytes.length === 0) return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const packed = new Uint8Array(await new Response(stream).arrayBuffer());
    return packed.length < bytes.length ? packed : null;
  } catch (error) {
    console.warn('No se pudo comprimir una entrada del ZIP, se guarda tal cual:', error);
    return null;
  }
}

/*
  `files` is a Map (or a plain object) of entry name to bytes or string.
  Returns a promise for the archive as a Uint8Array.
*/
export async function createZip(files) {
  const entries = files instanceof Map ? [...files.entries()] : Object.entries(files || {});
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name);
    const data = toBytes(content);
    const crc = crc32(data);
    const packed = name === 'mimetype' ? null : await deflateRaw(data);
    const payload = packed || data;
    const method = packed ? DEFLATED : STORED;

    const local = new Uint8Array(30 + nameBytes.length + payload.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, UTF8_NAME_FLAG, true);
    localView.setUint16(8, method, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, payload.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(payload, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, UTF8_NAME_FLAG, true);
    centralView.setUint16(10, method, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, payload.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, centrals.length, true);
  eocdView.setUint16(10, centrals.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}
