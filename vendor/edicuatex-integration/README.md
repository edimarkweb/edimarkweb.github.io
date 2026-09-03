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

## Por qué la CSP no necesita `worker-src`

MathJax 4 construye desde una URL `blob:` el worker de su motor de voz, y el
WebView lo rechazaba; el fallo no se quedaba en la voz, abortaba el renderizado
entero y el editor no dibujaba ninguna fórmula. Durante un tiempo la CSP llevó
`worker-src 'self' blob:` para permitirlo.

Desde EdiCuaTeX 1.5.4 ese motor no se vendoriza y el editor no lo arranca, así
que no hay worker que permitir y la CSP ha vuelto a ser la de antes. Si alguna
vez vuelve a aparecer un fallo de renderizado silencioso al actualizar MathJax,
este es el primer sitio donde mirar.

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
