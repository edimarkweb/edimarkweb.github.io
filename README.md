# EdiMarkWeb

EdiMarkWeb es un editor Markdown orientado a docentes, estudiantes y creadores técnicos que necesitan escribir, visualizar y exportar contenido sin salir del navegador. Combina edición Markdown y HTML sincronizada, soporte completo de LaTeX con KaTeX y utilidades de importación/exportación basadas en Pandoc.

- 🌐 Aplicación publicada en: [https://edimarkweb.github.io/](https://edimarkweb.github.io/)
- 📘 Manual de usuario: [manual.md](manual.md) (también en [inglés](manual-en.md), [català](manual-ca.md), [galego](manual-gl.md) y [euskara](manual-eu.md))
- 🐞 Incidencias y mejoras: [Issues de GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues)

![Interfaz de EdiMarkWeb](logo.png)

## Características principales

- **Edición dual sincronizada**: redacta en Markdown o modifica el HTML renderizado; ambos paneles se actualizan al instante.
- **Pestañas ilimitadas con autoguardado**: trabaja con varios documentos a la vez; cada pestaña guarda una copia local para evitar pérdidas.
- **Menú Archivo unificado**: abrir (`Ctrl+O`), importar vía Pandoc (DOCX, ODT, EPUB, HTML, TEX), pegar LaTeX (`Ctrl+Mayús+V`), guardar (`Ctrl+S`) y exportar a DOCX, ODT, EPUB, HTML autónomo o LaTeX completo.
- **Soporte matemático avanzado**: integración con KaTeX y acceso directo a EdiCuaTeX para insertar expresiones complejas.
- **Panel de previsualización editable**: edita sobre el resultado final, copia HTML o genera variantes LaTeX desde un menú contextual.
- **Búsqueda y reemplazo inteligente**: ignora tildes y mayúsculas, resalta coincidencias, admite expresiones regulares y ofrece navegación rápida.
- **Internacionalización y accesibilidad**: selector de idioma, control del tamaño de fuente, modo claro/oscuro y atajos visibles.
- **Diseño adaptable**: barras plegables, modo escritorio independiente, área de edición a pantalla completa y posibilidad de ampliar el ancho de trabajo.

## Flujo de trabajo destacado

| Zona | Qué ofrece |
| --- | --- |
| **Barra superior** | Gestión de archivos, idioma, tamaño de fuente, tema, ancho expandido, ventana independiente, impresión y acceso directo al manual (`Ctrl+H`). |
| **Barra de herramientas** | Formatos básicos, listas, citas, bloques de código, enlaces, imágenes, tablas y un menú de fórmulas con snippets listos. |
| **Panel Markdown** | Editor de texto con contador de caracteres, indicador de idioma del documento, plegado de imágenes base64, botón de copia y soporte de arrastrar y soltar archivos o carpetas enteras (`.md` y también DOCX, ODT, EPUB, HTML o TEX, que se convierten al vuelo). |
| **Panel HTML / Vista previa** | Cambia entre vista renderizada y código HTML, copia contenido con distintos perfiles (HTML, LaTeX parcial o completo). |

Las pestañas muestran un punto rojo (`●`) cuando hay cambios sin guardar y pueden renombrarse con doble clic. El autoguardado del navegador recupera automáticamente el contenido tras recargar la página.

## Importación, exportación y copia rápida

- **Importar**: abre Markdown locales, pega documentos LaTeX completos o convierte ficheros mediante Pandoc (DOCX, ODT, EPUB, HTML, TEX). Al arrastrar y soltar se admiten carpetas enteras, que se recorren en busca de archivos compatibles. Las imágenes de los documentos DOCX, ODT y EPUB se extraen del archivo y se incrustan en el Markdown.
- **Exportar**: genera descargas inmediatas en DOCX, ODT, EPUB (libro digital), HTML autónomo (con estilos y fórmulas incrustados) o LaTeX preparado para compilar. Todos los formatos declaran el idioma del documento —corrector ortográfico en DOCX y ODT, partición de palabras en LaTeX, atributo `lang` en HTML y EPUB— y el `.tex` usa el primer encabezado como título. Desde **Configuración → Documento exportado…** se fijan ese idioma, el autor y, para LaTeX, la clase, sus opciones y un preámbulo propio que se reutiliza en cada exportación. El HTML autónomo toma el título de la pestaña del primer encabezado. Cada documento puede además llevar el suyo: el botón de idioma del panel Markdown lo guarda como `lang` en el front matter del `.md`, de modo que viaja con el archivo.
- **Copiar**: botones dedicados para copiar Markdown del panel izquierdo o seleccionar, desde el panel derecho, qué formato enviar al portapapeles.

## Atajos esenciales

| Acción | Windows / Linux | macOS |
| --- | --- | --- |
| Negrita / Cursiva | `Ctrl+B`, `Ctrl+I` | `Cmd+B`, `Cmd+I` |
| Encabezados H1–H6 | `Ctrl+1..6` | `Cmd+1..6` |
| Lista / Lista numerada | `Ctrl+Mayús+L` / `Ctrl+Mayús+O` | `Cmd+Mayús+L` / `Cmd+Mayús+O` |
| Nueva pestaña / Cerrar | `Ctrl+T` / `Ctrl+W` | `Cmd+T` / `Cmd+W` |
| Fórmula en línea / en bloque | `Ctrl+M` / `Ctrl+Mayús+M` | `Cmd+M` / `Cmd+Mayús+M` |
| Deshacer / Rehacer | `Ctrl+Z` / `Ctrl+Mayús+Z` | `Cmd+Z` / `Cmd+Mayús+Z` |
| Abrir / Guardar | `Ctrl+O` / `Ctrl+S` | `Cmd+O` / `Cmd+S` |
| Pegar LaTeX | `Ctrl+Mayús+V` | `Cmd+Mayús+V` |
| Cambiar diseño | `Ctrl+L` | `Cmd+L` |
| Buscar | `Ctrl+F` | `Cmd+F` |
| Manual | `Ctrl+H` | `Cmd+H` |
| Imprimir | `Ctrl+P` | `Cmd+P` |

Consulta la tabla completa en el [manual](manual.md#atajos-de-teclado).

## Ejecutar la aplicación en local

1. Clona el repositorio usando SSH (configurado en `~/.gitconfig`):
   ```bash
   git clone git@github.com:edimarkweb/edimarkweb.github.io.git
   cd edimarkweb.github.io
   ```
2. Opción rápida: abre `index.html` directamente en tu navegador y todo funcionará offline (las dependencias externas se cargan desde CDNs).
3. Si prefieres servirlo localmente, utiliza la utilidad que quieras (`python -m http.server`, `npx serve`, etc.) para evitar restricciones de origen en algunos navegadores.

### Construir los estilos (opcional)

El CSS principal (`tailwind.build.css`) ya está generado. Si modificas `tailwind.css`, ejecuta:

```bash
npm install
npm run build:css
```

### Pruebas

```bash
npm install
npm test          # rápido: preparación del Markdown (títulos, metadatos, imágenes)
npm run test:export   # lento: convierte con el pandoc.wasm real y valida el EPUB/DOCX/ODT
npm run test:all
```

`npm run test:export` carga el WASM de Pandoc incluido en el repositorio y comprueba que cada
documento de muestra produce un archivo **no vacío** y con estructura válida. Pandoc señala sus
fallos internos dejando la salida vacía en lugar de lanzar un error, así que estas pruebas son las
que evitan que una exportación rota llegue al usuario como una descarga de 0 bytes.

## Tecnologías empleadas

- **HTML5 / CSS3 / JavaScript** sin framework.
- **Tailwind CSS** y `@tailwindcss/typography` para la capa visual.
- **CodeMirror** para la vista de código HTML.
- **Marked.js** y **Turndown + plugin GFM** para las conversiones Markdown ↔ HTML.
- **KaTeX** y **EdiCuaTeX** para matemáticas.
- **Split.js** para la distribución de paneles y **Lucide Icons** para los iconos.

## Contribuir

1. Crea un fork y una rama descriptiva.
2. Instala dependencias si necesitas regenerar CSS (`npm install`).
3. Asegúrate de que tus cambios funcionan en navegadores modernos (Chromium/Firefox).
4. Envía un pull request describiendo el problema resuelto y, si aplica, captura o vídeo corto.

Para reportar errores o proponer mejoras, utiliza las [incidencias de GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues). El [manual](manual.md) sirve como referencia funcional para validar comportamientos.

## Licencia

El código de EdiMarkWeb se distribuye bajo la [GNU Affero General Public License v3.0](LICENSE). Puedes usarlo, modificarlo y desplegarlo siempre que mantengas la misma licencia, publiques las mejoras y entregues el código fuente cuando la aplicación se ofrezca como servicio.
