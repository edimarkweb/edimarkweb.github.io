/*
  Minimal ZIP writer, the counterpart of zip-reader.js.

  Entries are always stored uncompressed: the only archive the app rebuilds is
  an ODT on its way into Pandoc, which never reaches the disk, so paying for
  compression would buy nothing. Storing also keeps the module free of
  CompressionStream, so it runs unchanged in the browser and in the tests.

  Insertion order is preserved, which matters for ODT: `mimetype` has to be the
  first entry of the archive.
*/

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

/*
  `files` is a Map (or a plain object) of entry name to bytes or string.
  Returns the archive as a Uint8Array.
*/
export function createZip(files) {
  const entries = files instanceof Map ? [...files.entries()] : Object.entries(files || {});
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name);
    const data = toBytes(content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
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
