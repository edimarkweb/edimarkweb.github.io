/* One worker per dialog: terminating it cancels Python and releases the PDF. */
let runtime;
async function initialize() {
    const base = new URL('./vendor/pdf-runtime/', self.location.href).href;
    importScripts(base + 'pyodide.js');
    const py = await loadPyodide({ indexURL: base });
    await py.loadPackage(['numpy', 'pillow', 'packaging']);
    for (const name of [
        'pymupdf-1.28.2-cp313-abi3-pyemscripten_2025_0_wasm32.whl',
        'pymupdf4llm-1.28.2-py3-none-any.whl',
        'tabulate-0.9.0-py3-none-any.whl',
    ]) await py.loadPackage(base + name);
    // Upstream imports optional OCR and process-pool dependencies eagerly.
    // Neither is used by the single-document, non-Layout converter. Remove
    // only these exact imports in the worker's ephemeral filesystem.
    py.runPython(`
from pathlib import Path
import sysconfig
root = Path(sysconfig.get_paths()['purelib']) / 'pymupdf4llm'
for relative, line in [('helpers/utils.py', 'from pymupdf4llm.ocr.analyze_page import analyze_page'), ('__init__.py', 'from .batch_converter import convert_batch')]:
    path = root / relative
    text = path.read_text()
    if text.count(line) != 1:
        raise RuntimeError('Unexpected PDF converter version')
    path.write_text(text.replace(line, ''))
`);
    const response = await fetch(new URL('./pdf-import.py?v=2.49.1', self.location.href));
    if (!response.ok) throw new Error('pdf_load_error');
    py.runPython(await response.text());
    return py;
}
self.onmessage = async ({ data }) => {
    try {
        self.postMessage({ type: 'status', key: runtime ? 'pdf_converting' : 'pdf_loading' });
        runtime ||= initialize();
        const py = await runtime;
        self.postMessage({ type: 'status', key: 'pdf_converting' });
        py.globals.set('pdf_bytes', new Uint8Array(data.bytes));
        py.globals.set('pdf_options', JSON.stringify(data.options));
        try {
            const result = JSON.parse(py.runPython('convert_json(pdf_bytes, pdf_options)'));
            self.postMessage({ type: 'result', result });
        } finally {
            py.globals.delete('pdf_bytes');
            py.globals.delete('pdf_options');
        }
    } catch (error) {
        const message = String(error);
        const key = ['pdf_pages_invalid', 'pdf_password', 'pdf_page_limit'].find(k => message.includes(k)) || 'pdf_error';
        self.postMessage({ type: 'error', key });
    }
};
