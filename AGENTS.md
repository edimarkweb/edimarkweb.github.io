# Repository Guidelines

EdiMarkWeb is a vanilla-JS Markdown editor shipped two ways from one frontend: as a static site (GitHub Pages) and as a Tauri 2 desktop app for Linux/Windows/macOS. No framework; the web app has no bundler.

## Architecture

- Root files are the app: `index.html` bootstraps the UI, `script.js` is editor behavior, `search.js` find/replace, `i18n.js` loads `locales/*.json`. Styles: source in `tailwind.css`/`style.css`, generated output committed as `tailwind.build.css`.
- Import/export: `pandoc-exporter.js` drives the bundled `pandoc.wasm`; `pandoc-prepare.js` holds the pure Markdown preparation logic (metadata, titles, images, Pandoc args, the `stripUnsafeMarkup` pass that disarms inline handlers and executable URL schemes) with no browser dependencies so Node tests can run it directly. `zip-reader.js`/`zip-writer.js` read/rebuild DOCX/ODT/EPUB archives using DecompressionStream only (stored entries on write), so they run unchanged in browser and tests. `odt-tables.js` recovers table headers Pandoc's ODT reader drops; `odt-formulas.js` repairs formula references Pandoc's own ODT writer emits unresolvably.
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
- `python -m http.server`: serve locally for manual checks (`file://` breaks things).
- Desktop: `npm run desktop:dev` / `desktop:build`. Needs Rust plus Linux native packages listed in README.
- There is no lint or typecheck setup; verification means tests plus opening the app in Chromium and Firefox.

## Desktop build coupling

`scripts/build-desktop.mjs` builds `dist/` and fails loudly if any of these are missing — update them together:
- New root-level app file → add to its `appFiles` array.
- New CDN library referenced in `index.html` → add matching entries to **both** `vendorFiles` and `indexReplacements`, at exactly the pinned npm versions. A URL mismatch aborts the build.

## Versions & releases

The app version lives in five places that must be bumped together: `package.json` (+ `package-lock.json`), `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock`), `APP_VERSION` at the top of `script.js`, and the desktop banner string in `index.html`. `tauri.conf.json` is what names the installers, so a stale `Cargo.toml` ships quietly — 2.21.0 went out that way.
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
