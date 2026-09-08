/* One worker per dialog: terminating it cancels Python and releases the PDF. */
let runtime;
/* Loading is slow enough to look stalled: every step reports as it lands. */
const report = (stage, done, total) => self.postMessage({ type: 'progress', stage, done, total });

async function initialize() {
    const base = new URL('./vendor/pdf-runtime/', self.location.href).href;
    const packages = ['numpy', 'pillow', 'packaging'];
    const wheels = [
        'pymupdf-1.28.2-cp313-abi3-pyemscripten_2025_0_wasm32.whl',
        'pymupdf4llm-1.28.2-py3-none-any.whl',
        'tabulate-0.9.0-py3-none-any.whl',
    ];
    const steps = packages.length + wheels.length + 3;
    let done = 0;
    const step = () => report('loading', ++done, steps);
    importScripts(base + 'pyodide.js');
    step();
    const py = await loadPyodide({ indexURL: base });
    step();
    // WebKitGTK's asset protocol can stall when first-use parallel reads from
    // a worker. Loading these local packages one at a time avoids that Tauri
    // race and also keeps the inactivity watchdog informed between packages.
    for (const name of packages) {
        await py.loadPackage(name);
        step();
    }
    for (const name of wheels) {
        await py.loadPackage(base + name);
        step();
    }
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
    const response = await fetch(new URL('./pdf-import.py?v=2.49.4', self.location.href));
    if (!response.ok) throw new Error('pdf_load_error');
    py.runPython(await response.text());
    step();
    return py;
}
self.onmessage = async ({ data }) => {
    try {
        const operation = data.operation === 'inspect' ? 'inspect' : 'convert';
        self.postMessage({
            type: 'status',
            key: runtime ? (operation === 'inspect' ? 'pdf_inspecting' : 'pdf_converting') : 'pdf_loading',
        });
        runtime ||= initialize();
        const py = await runtime;
        self.postMessage({ type: 'status', key: operation === 'inspect' ? 'pdf_inspecting' : 'pdf_converting' });
        py.globals.set('pdf_bytes', new Uint8Array(data.bytes));
        if (operation === 'inspect') {
            try {
                const result = JSON.parse(py.runPython('inspect_json(pdf_bytes)'));
                self.postMessage({ type: 'info', result });
            } finally {
                py.globals.delete('pdf_bytes');
            }
            return;
        }
        py.globals.set('pdf_options', JSON.stringify(data.options));
        /*
          Python holds the worker's only thread while it converts, but a message
          posted from inside it still reaches the page, which is not blocked:
          that is what keeps the dialog moving during a long conversion.
        */
        py.globals.set('report_progress', report);
        try {
            const result = JSON.parse(py.runPython('convert_json(pdf_bytes, pdf_options, report_progress)'));
            self.postMessage({ type: 'result', result });
        } finally {
            py.globals.delete('pdf_bytes');
            py.globals.delete('pdf_options');
            py.globals.delete('report_progress');
        }
    } catch (error) {
        const message = String(error);
        const key = ['pdf_pages_invalid', 'pdf_password', 'pdf_page_limit'].find(k => message.includes(k)) || 'pdf_error';
        self.postMessage({ type: 'error', key });
    }
};
