/*
  Builds a tiny ZIP archive in memory so the reader can be tested without
  running the (slow) Pandoc WASM module. Entries are stored uncompressed;
  a deflated entry is covered by the end-to-end suite, which reads real
  DOCX/ODT/EPUB files.

  The app rebuilds ODT archives on import, so the writer lives in zip-writer.js
  and the tests exercise that same implementation instead of a copy.
*/
export { createZip as makeZip } from '../../zip-writer.js';
