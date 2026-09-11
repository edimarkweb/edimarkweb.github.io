# Repository Guidelines

EdiMarkWeb is a vanilla-JS Markdown editor shipped two ways from one frontend: as a static site (GitHub Pages) and as a Tauri 2 desktop app for Linux/Windows/macOS. No framework; the web app has no bundler.

## Architecture

- Root files are the app: `index.html` bootstraps the UI, `script.js` is editor behavior, `search.js` find/replace, `i18n.js` loads `locales/*.json`. Styles: source in `tailwind.css`/`style.css`, generated output committed as `tailwind.build.css`.
- Import/export: `pandoc-exporter.js` drives the bundled `pandoc.wasm`; `pandoc-prepare.js` holds the pure Markdown preparation logic (metadata, titles, images, Pandoc args, the `stripUnsafeMarkup` pass that disarms inline handlers and executable URL schemes) with no browser dependencies so Node tests can run it directly. `zip-reader.js`/`zip-writer.js` read/rebuild DOCX/ODT/EPUB archives using DecompressionStream only (stored entries on write), so they run unchanged in browser and tests. `odt-tables.js` recovers table headers Pandoc's ODT reader drops; `odt-formulas.js` repairs formula references Pandoc's own ODT writer emits unresolvably.
- PDF import: `pdf-import.js` owns the options/preview dialog; `pdf-worker.js` runs the vendored Pyodide/PyMuPDF runtime in `vendor/pdf-runtime/`; `pdf-import.py` handles page ranges, repeated margin text and detected math images. Scanned pages (no extractable text, or a sliver of it over an image covering the sheet) can go to Tesseract.js OCR, off by default and only offered when `count_scanned` (asked for right after the dialog opens, since reading every page costs 2.5 s on a 442-page report) finds any (it returns the page numbers too, which the notice names as ranges via `formatPageList`); every such page also carries its ordinary conversion, which wins whenever OCR does not read substantially more, so no real text is lost — but a page whose OCR reading wins becomes that text, and its picture is then dropped at import, which is why the notice says so. Embedded pictures follow the format the file itself used (`page_image_format`): PNG re-encoding of a photograph multiplied one 442-page report's images by thirty and ran the import out of memory. Pictures leave Python as bytes of their own (`detach_images` / the worker's `image` message) and reach the document as files, so the Markdown that crosses over is text; only a scanned page's fallback still carries base64, which `prepareEmbeddedImageExtraction` picks up. Pages are converted in batches copied into a document of their own (`page_batches` / `batch_markdown`): converting page by page cost proportionally to the whole document on every call, which is why there used to be a 200-page limit. There is none now. `remove_running_text` still matches over the whole document — what repeats cannot be seen in three pages — but redacts only the pages being converted. Building the preview and creating the document are announced too (`announce`), and the dialog stays up during the latter, counting each image as IndexedDB confirms it (4 s for 1330 in Firefox) — they take seconds on a long report and used to pass in silence, looking hung. The preview itself is capped (`previewMarkdown`: 80k characters, 12 pictures), which took laying out that report from 1.1 s to 0.12 s. No native Layout model. Runtime URLs and SHA-256 pins are in its manifest; the Node test checks asset integrity. The browser regression uses a synthetic PDF in `test/fixtures/` (regenerator in `test/helpers/make-pdf-fixture.py`), never personal documents.
- Startup curtain: `#app-loading` is painted by the HTML, not the script, because mounting a long document blocks the thread for seconds; its bar is a transform animation so it keeps moving from the compositor while the thread is taken. After three seconds a cancel button appears (`cancelStartupAndForgetSession`): it drops the saved session's localStorage keys and reloads, which is the only escape from a document that hangs every startup, so it confirms first. The manual opens by itself only until it is closed once — `closeDoc` records that in `MANUAL_DISMISSED_KEY` and an empty session then starts with a blank document.
- Boundary rule: anything touching `window`, `document`, or `fetch` stays out of `pandoc-prepare.js` / `zip-*.js`; it belongs in `pandoc-exporter.js`.
- Platform layer: `platform-api.js` abstracts web vs. desktop; `platform-tauri-entry.js` is bundled by esbuild into `dist/platform-tauri.js`; `desktop-updater.js` handles version checks and installer selection.
- Document images: `asset-paths.js` holds the pure path logic (relative-vs-absolute detection, normalization, resolving against the document folder, the suffix index used to match `images/01.png` against a user-picked folder) with no DOM, so `test/asset-paths.test.mjs` runs it in Node. `script.js` applies it to the preview, and the desktop side reads the bytes through the `read_document_asset` Rust command, which serves image extensions only — a `![](notes.md)` must never become a way to read arbitrary files. The Markdown is never rewritten: the original path is parked in `data-edimark-src` and restored by `restoreOriginalImageSources()` before anything leaves the preview (Markdown sync, copy, export).
- The web version loads libraries from CDNs (needs network); the desktop build vendors everything locally into `dist/` so it runs offline.

## Commands

- `npm run build:css`: regenerates `tailwind.build.css` after editing `tailwind.css`.
- `npm test`: fast unit tests for `pandoc-prepare.js`.
- `npm run test:platform` / `test:updater`: platform layer; updater version compare + installer choice.
- `npm run test:export`: slow end-to-end conversions through the real `pandoc.b64` (~68 MB of base64-decoded WASM).
- `npm run test:all` = unit + platform + updater + export. It does **not** include `test:browser`; CI runs browser tests as a separate matrix job.
- `npm run test:browser`: Playwright against real Chromium/Firefox. Select with `BROWSER=firefox` (default chromium); it starts its own static server, so no manual server needed. Requires `npx playwright install --with-deps <browser>` once.
- `python -m http.server`: serve locally for manual checks (`file://` breaks things). Open it as **`http://localhost:8080`**, never `http://0.0.0.0:8080`: Chrome counts `localhost`, `127.0.0.1` and HTTPS as secure contexts but not `0.0.0.0`, so the File System Access API disappears and saving a document with its own folder silently falls back to the ZIP path meant for Firefox.
- Desktop: `npm run desktop:dev` / `desktop:build`. Needs Rust plus Linux native packages listed in README.
- There is no lint or typecheck setup; verification means tests plus opening the app in Chromium and Firefox.

## Desktop build coupling

`scripts/build-desktop.mjs` builds `dist/` and fails loudly if any of these are missing — update them together:
- New root-level app file → add to its `appFiles` array.
- New CDN library referenced in `index.html` → add matching entries to **both** `vendorFiles` and `indexReplacements`, at exactly the pinned npm versions. A URL mismatch aborts the build.

## Big documents: it is the Linux engine

A 1.5 MB document (a 300-page PDF imported) lays its preview out in ~0.1 s under Windows' WebView2 and ~0.27 s under WebKit, and in **123 s** under the WebKitGTK that ships with Linux — the engine is as fast as any other at plain loops and regexes, and falls apart only where the work allocates hundreds of thousands of small objects (marked's parse, `indexPreviewLines`). Typing costs about half a second per keystroke there too, which a bare `textarea` holding the same text pays just the same: that part is the browser, not this code, and only a virtualized editor would fix it. Hence everything around huge documents is decided by **measuring**, never by document size or platform: the preview waits to be asked for, a fast machine is marked and never asked again (`edimarkweb-hoja-rapida`), and the preview stops following the keyboard when a redraw costs over 1.5 s. Confirmed by hand on Windows: no waits there.

## Desktop dev gotcha

`tauri dev` used to start `beforeDevCommand` (`build:desktop`) and `cargo run` at the same time, and `build:desktop` begins by wiping `dist/`: the window would open on a half-written `dist/`, whose `index.html` still carries the CDN URLs — the last build step is what swaps them for the local copies — and the CSP then blocks every script and stylesheet, so the app came up as raw unstyled text. `beforeDevCommand` now carries `"wait": true` for that reason; do not take it out. The same rule applies by hand: never rebuild `dist/` while a dev run is starting.

## Versions & releases

The app version lives in six places that must be bumped together: `package.json` (+ `package-lock.json`), `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock`), `APP_VERSION` at the top of `script.js`, the desktop banner string in `index.html`, and the `?v=` on every own script/stylesheet in `index.html` (cache-busting: without it a browser serves a stale `script.js` alongside fresh HTML). `npm run test` fails on a stale `?v=`. `tauri.conf.json` is what names the installers, so a stale `Cargo.toml` ships quietly — 2.21.0 went out that way.
Pushing a `v*` tag triggers `.github/workflows/desktop.yml`: installers are built and attached to the GitHub Release. Linux deliberately builds on ubuntu-22.04 because the binary links the builder's glibc — a newer runner would break Debian 12/Ubuntu 22.04 users. Do not bump that runner casually.

## Testing notes

- Runner is built-in `node:test`; no test framework dependency. Export e2e goes through `test/helpers/pandoc-runner.mjs` with the same WASI shim and argument string as the browser.
- Pandoc reports internal failure by leaving its output file empty, not by throwing: an export can "succeed" while producing 0 bytes. Assert on actual output bytes, never on absence of an exception.
- Any change to an export path: run `npm run test:all`. Adding an export format or changing how Markdown reaches Pandoc: add a sample document to the e2e suite.
- Automated tests don't cover the whole browser layer. Manually validate touched behavior in current Chromium- and Firefox-based browsers (editor sync, preview, import/export, shortcuts, i18n). Hard-refresh or use a private window first — a cached module is easily mistaken for a bug.
- The manual exists in five languages (`manual.md` Spanish plus `-en`, `-ca`, `-gl`, `-eu`); the app loads the active language and falls back to Spanish. A manual change must land in all five, and translation keys must stay consistent across every `locales/*.json`.

## Style & commits

Plain HTML/CSS/vanilla JS; semicolons in JS; match each file's existing indentation (2-space in HTML/CSS). Lowercase kebab-case asset filenames.
Commit subjects: short, imperative, one behavior change per commit (e.g. `Preserve math delimiters in preview`). PRs: summary, manual test notes, screenshot/recording for UI changes; don't mix refactors with fixes.

## Misc

Never commit secrets, personal data, or storage dumps; `dist/`, `src-tauri/target`, and `src-tauri/gen` stay out of git. Use SSH remotes for GitHub operations.
