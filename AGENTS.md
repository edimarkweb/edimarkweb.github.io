# Repository Guidelines

## Project Structure & Module Organization

This repository is a static web application. Core files live at the project root: `index.html` bootstraps the UI, `script.js` handles editor behavior, `search.js` powers find/replace, `i18n.js` loads translations, and `pandoc-exporter.js` / `pandoc-prepare.js` / `pandoc-wasm.js` manage import-export features. Styles are split between source (`tailwind.css`, `style.css`) and generated output (`tailwind.build.css`). Localized strings are stored in `locales/*.json`, image assets belong in `imagenes/`, and automated tests live in `test/`.

`pandoc-prepare.js` holds the pure Markdown preparation logic (metadata, titles, image handling, Pandoc argument building) with no browser dependencies, so it can be unit tested outside a browser. `zip-reader.js` reads images out of the DOCX/ODT/EPUB archives on import, using DecompressionStream so it runs unchanged in both the browser and the tests, and `odt-tables.js` recovers the table headers Pandoc's ODT reader drops. Keep it that way: anything touching `window`, `document`, or `fetch` belongs in `pandoc-exporter.js`.

## Build, Test, and Development Commands

- `npm install`: installs the Tailwind toolchain and the WASI shim used by the tests.
- `npm run build:css`: rebuilds `tailwind.build.css` from `tailwind.css`.
- `npm test`: fast unit tests for the Markdown preparation logic (`test/prepare.test.mjs`).
- `npm run test:export`: end-to-end conversions through the bundled `pandoc.wasm`. Slow (the module is ~50 MB) but the only check that catches a broken export.
- `npm run test:all`: both suites.
- `python -m http.server`: serves the app locally to test browser behavior without `file://` restrictions.

There is no application bundler or framework build step; most changes can be verified by opening `index.html` in a browser.

## Coding Style & Naming Conventions

Use plain HTML, CSS, and vanilla JavaScript. Match the existing style in each file: `script.js` and related modules use semicolons, descriptive function names, and straightforward DOM-oriented logic. Prefer 2-space indentation in HTML/CSS and follow the surrounding indentation style in JavaScript. Use lowercase kebab-case for asset filenames, and keep translation keys stable across every file in `locales/`.

When editing styles, update `tailwind.css` or `style.css` first and only commit a regenerated `tailwind.build.css` when the source changed.

## Testing Guidelines

Automated tests use the built-in `node:test` runner; there is no test framework dependency. `test/prepare.test.mjs` covers `pandoc-prepare.js` directly. `test/epub-export.test.mjs` runs the real `pandoc.wasm` through the same WASI shim and argument string as the browser, via the helper in `test/helpers/pandoc-runner.mjs`.

Any change to an export path must run `npm run test:all`. Pandoc reports internal failures by leaving its output file empty rather than by throwing, so an export can break while still appearing to succeed: assert on actual output bytes, never on the absence of an exception. When adding an export format or changing how Markdown is fed to Pandoc, add a sample document to the end-to-end suite.

Automated tests do not cover the browser layer. Still validate changes manually in current Chromium- and Firefox-based browsers: editor sync, preview rendering, import/export flows, and any touched shortcut or localization behavior. Hard-refresh (or use a private window) before testing an export — a cached module is easily mistaken for a bug. For translation changes, verify the affected text in at least one additional locale file.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Preserve math delimiters in preview` and `Warn on disabled format controls`. Keep commit titles concise, sentence-cased, and focused on one behavior change.

Pull requests should include a clear summary, manual test notes, linked issues when relevant, and screenshots or a short screen recording for UI changes. Do not mix unrelated refactors with functional fixes.

## Security & Configuration Tips

Do not commit secrets, generated personal data, or local browser storage dumps. Use SSH Git remotes for GitHub operations in this repository.
