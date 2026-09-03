# EdiCuaTeX en EdiMarkWeb Desktop

La web abre el editor de fórmulas publicado en <https://edicuatex.github.io/>,
así que recibe cada versión nueva sin hacer nada. La aplicación de escritorio no
tiene red garantizada y necesita su propia copia.

Esa copia ya no se trae a mano: EdiCuaTeX es una dependencia de npm y la
revisión concreta la fija `package-lock.json`. Para actualizarla basta con

    npm i -D edicuatex@<versión>

`scripts/build-desktop.mjs` la copia a `dist/vendor/edicuatex` al construir, sin
las dependencias del paquete, su script de vendorizado ni los README.

## MathJax

El paquete publicado no incluye MathJax, porque quien sirve el editor desde la
web lo pide al CDN. En escritorio eso no vale, de modo que el script de
construcción genera la copia local (`npm run vendor` de EdiCuaTeX) la primera
vez que falta y aborta si no aparece. Son unos 18 MB, casi todo tipografías.

## Por qué la CSP permite workers desde `blob:`

`src-tauri/tauri.conf.json` incluye `worker-src 'self' blob:` por MathJax 4, que
construye el worker de su motor de voz desde una URL `blob:`. Con la CSP
anterior el WebView lo rechazaba, y el fallo no se quedaba en la voz: abortaba
el renderizado entero, de modo que el editor no dibujaba ninguna fórmula.
MathJax 3 no usaba ese worker y por eso el problema aparece al actualizar.

Permitirlo no ensancha nada en la práctica: crear un worker exige ejecutar
JavaScript antes, y eso lo sigue impidiendo `script-src 'self'`.

## Cambios de integración

Se aplican sobre la copia de `dist`, nunca sobre el paquete, para que actualizar
EdiCuaTeX no obligue a rehacer ningún parche:

- `theme.css` se añade al final de `css/edicuatex.css`.
- `theme.js` se antepone a `js/edicuatex-tools.js`.

Entre los dos aplican la paleta de EdiMarkWeb cuando `script.js` abre el editor
con `?mode=light` o `?mode=dark`.

## Lo que ya no hace falta parchear

La copia anterior forzaba la ruta de MathJax a mano. Desde EdiCuaTeX 1.5.0 el
propio editor la resuelve junto a su script y solo recurre al CDN si falta, así
que ese parche desapareció.
