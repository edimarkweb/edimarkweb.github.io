# Local PDF runtime

Lazy-loaded by `pdf-worker.js`, served from the same origin in both GitHub Pages
and the desktop bundle. No document uploads, OCR or remote conversion service.

Pinned distribution: Pyodide 0.29.3 (Python 3.13 ABI 2025_0), PyMuPDF and
PyMuPDF4LLM 1.28.2. `manifest.json` records exact upstream URLs, sizes and SHA-256
checksums. Wheels include their license metadata; extracted notices are in
`licenses/`. PyMuPDF/PyMuPDF4LLM are AGPL; EdiMarkWeb is AGPL-3.0-only.
Pyodide source and notices: https://github.com/pyodide/pyodide/tree/0.29.3
PyMuPDF source: https://github.com/pymupdf/PyMuPDF/tree/1.28.2
PyMuPDF4LLM source: https://github.com/pymupdf/pymupdf4llm

The browser uses PyMuPDF4LLM's non-Layout engine: the native Layout model is not
included in its WASM distribution. Two eager imports for unused optional OCR
and process-pool features are removed from the installed files in the worker's
in-memory filesystem. The exact adaptation is in `pdf-worker.js`; the upstream
wheels are unmodified. No OCR or process-pool function is substituted or called.

`pdf-import.py` implements page selection, repeated margin-text removal and
conservative rasterization of detected mathematical regions. This is not the
same Layout conversion tested in native Python. Preview and cancellation are
mandatory parts of the import flow.

To restore assets, fetch the URLs in manifest.json and verify their SHA-256
hashes. Update all pins and repeat real Chromium/Firefox conversion tests when
upgrading. Do not replace an asset at an existing version with different bytes.
