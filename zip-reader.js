/*
  Minimal ZIP reader for the archive-based formats Pandoc imports (DOCX, ODT,
  EPUB). Pandoc returns only text, so the images stay behind in the uploaded
  file; this reads them out of it.

  Uses DecompressionStream('deflate-raw'), available both in current browsers
  and in Node, so the same code runs in the app and in the tests.
*/

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

const MIME_BY_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

export function mimeForPath(path) {
  const extension = String(path).split('.').pop().toLowerCase();
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('decompression_unsupported');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(view, length) {
  const earliest = Math.max(0, length - 22 - 0xffff);
  for (let i = length - 22; i >= earliest; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

/*
  Returns a Map of entry name to bytes. Directory entries and anything using an
  unsupported compression method are skipped rather than throwing, so one odd
  entry cannot break an otherwise fine import.
*/
export async function readZipEntries(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view, bytes.byteLength);
  if (eocd === -1) throw new Error('not_a_zip');

  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map();

  for (let i = 0; i < total; i += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith('/') || compressedSize === 0) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(start, start + compressedSize);

    try {
      if (method === 0) entries.set(name, new Uint8Array(raw));
      else if (method === 8) entries.set(name, await inflateRaw(raw));
    } catch (error) {
      console.warn(`No se pudo leer la entrada ${name} del archivo:`, error);
    }
  }

  return entries;
}

export function bytesToDataUri(bytes, mime) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
