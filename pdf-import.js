import { stripUnsafeMarkup } from './pandoc-prepare.js';

let active = false;

export async function importPdf(file, translate) {
    if (active) return null;
    active = true;
    const t = key => translate(key, key);
    const dialog = document.createElement('dialog');
    dialog.className = 'pdf-import-dialog';
    dialog.setAttribute('aria-labelledby', 'pdf-import-title');
    dialog.innerHTML = `
      <form method="dialog" class="pdf-import-content">
        <h2 id="pdf-import-title"></h2>
        <p class="pdf-import-filename"></p>
        <p id="pdf-import-info" class="pdf-import-info" role="status"></p>
        <p class="pdf-import-note" id="pdf-import-note"></p>
        <div class="pdf-import-options">
          <label><input id="pdf-remove-headers" type="checkbox" checked> <span></span></label>
          <label><input id="pdf-keep-images" type="checkbox" checked> <span></span></label>
          <label for="pdf-pages"></label>
          <input id="pdf-pages" type="text" placeholder="1-3, 5" autocomplete="off" aria-describedby="pdf-import-note">
        </div>
        <p id="pdf-import-status" role="status" aria-live="polite"></p>
        <div id="pdf-import-progress" role="progressbar" aria-labelledby="pdf-import-status" hidden><span class="pdf-import-progress-bar"></span></div>
        <iframe id="pdf-import-preview" sandbox="" referrerpolicy="no-referrer"></iframe>
        <div class="pdf-import-actions">
          <button id="pdf-cancel" type="button"></button>
          <button id="pdf-preview" type="button" disabled></button>
          <button id="pdf-accept" type="button" disabled></button>
        </div>
      </form>`;
    const $ = selector => dialog.querySelector(selector);
    $('#pdf-import-title').textContent = t('pdf_title');
    $('.pdf-import-filename').textContent = file.name;
    $('#pdf-import-note').textContent = t('pdf_note');
    $('#pdf-remove-headers + span').textContent = t('pdf_remove_headers');
    $('#pdf-keep-images + span').textContent = t('pdf_keep_images');
    $('label[for="pdf-pages"]').textContent = t('pdf_pages');
    $('#pdf-cancel').textContent = t('pdf_cancel');
    $('#pdf-preview').textContent = t('pdf_preview');
    $('#pdf-accept').textContent = t('pdf_accept');
    $('#pdf-import-preview').title = t('pdf_preview');
    document.body.append(dialog);
    // A fresh frame avoids competing about:blank/srcdoc navigations in Firefox
    // when options are changed and the preview is regenerated.
    function setPreview(html = '') {
        const frame = document.createElement('iframe');
        frame.id = 'pdf-import-preview';
        frame.title = t('pdf_preview');
        frame.setAttribute('sandbox', '');
        frame.referrerPolicy = 'no-referrer';
        const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
        frame.srcdoc = html;
        $('#pdf-import-preview').replaceWith(frame);
        return loaded;
    }
    const previousFocus = document.activeElement;
    let worker;
    let markdown = null;
    let busy = false;
    let inspected = false;
    let closed = false;
    let watchdog;
    return new Promise(resolve => {
        function finish(value) {
            if (closed) return;
            closed = true;
            clearTimeout(watchdog);
            worker?.terminate();
            dialog.close();
            dialog.remove();
            active = false;
            previousFocus?.focus();
            resolve(value);
        }
        /*
          La barra se mueve sola solo mientras no hay nada que contar —al abrir
          el conversor y al limpiar encabezados, que recorre el documento
          entero—; el resto del tiempo marca las páginas que lleva hechas.
        */
        function setProgress(stage, done, total) {
            if (stage === 'heartbeat') return;
            const bar = $('#pdf-import-progress');
            const indeterminate = !total || !done;
            bar.hidden = false;
            bar.dataset.indeterminate = String(indeterminate);
            if (indeterminate) {
                bar.removeAttribute('aria-valuenow');
                bar.querySelector('.pdf-import-progress-bar').style.width = '';
            } else {
                const percent = Math.round((done / total) * 100);
                bar.setAttribute('aria-valuenow', String(percent));
                bar.querySelector('.pdf-import-progress-bar').style.width = `${percent}%`;
            }
            // Durante la carga manda su propio mensaje, que dice cuánto ocupa.
            if (stage === 'loading' || !done) return;
            const key = stage === 'headers'
                ? 'pdf_scanning_page'
                : stage === 'analysing' ? 'pdf_analysing_page' : 'pdf_converting_page';
            $('#pdf-import-status').textContent = t(key)
                .replaceAll('{page}', String(done))
                .replaceAll('{total}', String(total));
        }
        function clearProgress() {
            const bar = $('#pdf-import-progress');
            bar.hidden = true;
            bar.dataset.indeterminate = 'false';
            bar.removeAttribute('aria-valuenow');
            bar.querySelector('.pdf-import-progress-bar').style.width = '';
        }
        function renewWatchdog() {
            clearTimeout(watchdog);
            if (busy) watchdog = setTimeout(() => fail('pdf_error'), 180000);
        }
        function setBusy(value) {
            busy = value;
            renewWatchdog();
            if (!value) clearProgress();
            $('#pdf-preview').disabled = value || !inspected;
            for (const input of dialog.querySelectorAll('input')) input.disabled = value;
            $('#pdf-accept').disabled = value || !markdown;
            dialog.setAttribute('aria-busy', String(value));
        }
        function fail(key) {
            markdown = null;
            $('#pdf-import-status').textContent = t(key);
            worker?.terminate();
            worker = null;
            setBusy(false);
        }
        function ensureWorker() {
            if (worker) return worker;
            worker = new Worker(new URL('./pdf-worker.js?v=2.49.4', import.meta.url));
            worker.onerror = () => fail('pdf_error');
            worker.onmessage = async ({ data }) => {
                if (closed) return;
                // Every worker message proves activity: the three-minute
                // timeout measures silence, never total conversion time.
                if (busy) renewWatchdog();
                if (data.type === 'progress') setProgress(data.stage, data.done, data.total);
                else if (data.type === 'status') $('#pdf-import-status').textContent = t(data.key);
                else if (data.type === 'error') fail(data.key);
                else if (data.type === 'info') {
                    inspected = true;
                    $('#pdf-import-info').textContent = t('pdf_document_info')
                        .replaceAll('{count}', String(data.result.pages));
                    $('#pdf-import-status').textContent = '';
                    setBusy(false);
                } else if (data.type === 'result') {
                    markdown = stripUnsafeMarkup(data.result.markdown);
                    if (!markdown.trim()) { fail('pdf_empty'); return; }
                    const html = stripUnsafeMarkup(window.marked.parse(markdown));
                    // No scripts, network requests, forms or parent access in the preview.
                    await setPreview(`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';"><style>body{font:16px/1.5 system-ui;padding:16px;color:#182536;background:#fff;overflow-wrap:anywhere}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #94a3b8;padding:6px}pre{white-space:pre-wrap}a{pointer-events:none}</style>${html}`);
                    if (closed || !busy) return;
                    $('#pdf-import-status').textContent = t(data.result.textPages < data.result.pages ? 'pdf_partial' : 'pdf_ready');
                    setBusy(false);
                }
            };
            return worker;
        }
        dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
        $('#pdf-cancel').onclick = () => finish(null);
        $('#pdf-accept').onclick = () => { if (!busy && markdown) finish(markdown); };
        for (const input of dialog.querySelectorAll('input')) input.addEventListener('input', () => {
            markdown = null;
            $('#pdf-accept').disabled = true;
            setPreview();
            $('#pdf-import-status').textContent = t('pdf_changed');
        });
        $('#pdf-preview').onclick = async () => {
            if (busy) return;
            markdown = null;
            setPreview();
            if (file.size > 50 * 1024 * 1024) return fail('pdf_size_limit');
            setBusy(true);
            $('#pdf-import-status').textContent = t('pdf_loading');
            setProgress('loading', 0, 0);
            try {
                ensureWorker();
                const bytes = await file.arrayBuffer();
                if (closed) return;
                worker.postMessage({ operation: 'convert', bytes, options: {
                    pages: $('#pdf-pages').value,
                    removeHeaders: $('#pdf-remove-headers').checked,
                    keepImages: $('#pdf-keep-images').checked,
                } }, [bytes]);
            } catch (_) { if (!closed) fail('pdf_error'); }
        };
        dialog.showModal();
        $('#pdf-preview').focus();
        (async () => {
            if (file.size > 50 * 1024 * 1024) { fail('pdf_size_limit'); return; }
            setBusy(true);
            $('#pdf-import-status').textContent = t('pdf_inspecting');
            setProgress('loading', 0, 0);
            try {
                ensureWorker();
                const bytes = await file.arrayBuffer();
                if (closed) return;
                worker.postMessage({ operation: 'inspect', bytes }, [bytes]);
            } catch (_) { if (!closed) fail('pdf_error'); }
        })();
    });
}
