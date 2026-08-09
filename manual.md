![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

Bienvenido/a a EdiMarkWeb, un **editor de textos en Markdown** diseñado para docentes y creadores de contenido que necesitan trabajar rápido, exportar a varios formatos y añadir matemáticas con LaTeX sin complicaciones. Todo funciona directamente en el navegador y los documentos se guardan de forma segura en tu equipo.

## Novedades destacadas

- Edición dual: puedes trabajar tanto en Markdown como directamente en la vista previa HTML, siempre sincronizadas.
- Menú de exportación y de importación con soporte para DOCX, ODT, EPUB, HTML y LaTeX, incluyendo opciones de copia directa al portapapeles.
- Buscador con reemplazo que resalta las coincidencias y acepta términos sin tildes ni distinción entre mayúsculas y minúsculas.
- Menú **Configuración** con el idioma, el tamaño de letra, el tema, el ancho de trabajo y la ventana independiente reunidos en un mismo sitio.
- Tema de la interfaz con tres opciones —Sistema, Claro y Oscuro— que se recuerda entre sesiones.
- Menú de fórmulas renovado y acceso directo a EdiCuaTeX para construir expresiones complejas.
- Apertura de múltiples archivos, o de carpetas enteras, arrastrándolos al editor (cada archivo en su pestaña): Markdown y también DOCX, ODT, EPUB, HTML o TEX, que se convierten al vuelo con Pandoc.
- Búsqueda con expresiones regulares y modo de edición a pantalla completa para trabajar sin distracciones.

## ¡Pega cualquier contenido!

> **Importante:** ahora puedes pegar **cualquier objeto desde el portapapeles**: texto plano, fragmentos de Word o LibreOffice, HTML completo, fórmulas generadas por un chatbot e incluso imágenes copiadas directamente. Usa `Ctrl+V`/`Cmd+V` o el botón de la barra de herramientas con el icono de portapapeles (`Pegar`) y EdiMarkWeb colocará automáticamente el contenido en el panel adecuado:

- El texto Markdown o sin formato se inserta en el panel izquierdo respetando exactamente la posición del cursor.
- El contenido enriquecido (HTML, DOCX, pegado desde el navegador, etc.) se vuelve a calcular en el panel derecho y, al mismo tiempo, se genera el Markdown correspondiente para mantener ambas vistas sincronizadas.

Esto elimina la necesidad de pasos intermedios: copia desde tu origen favorito y haz clic en **Pegar** para seguir editando sin interrupciones.

## Vídeos
Los siguientes vídeos **sin audio y de reproducción continua** muestran algunas acciones comunes.

### Copiar directamente el contenido del chat
Podemos copiar el resultado de cualquier chat y pegarlo en EdiMarkWeb para modificar, guardar o exportar. Esto lo podemos hacer con cualquier chatbot, excepto con ChatGPT que requiere un paso adicional (ver abajo).

![Copiar directamente el contenido del chat](imagenes/googledocs.gif)

### ChatGPT
ChatGPT ha dejado de utilizar LaTeX estándar, por lo que se le tiene que pedir las fórmulas en una caja Markdown. Además, en el vídeo aparece cómo exportar en DOCX y cómo subir a Google Drive:
![ChatGPT y Google](imagenes/chatgpt_google.gif)

### Escribir fórmulas en EdiMarkweb

![Escribir fórmulas en EdiMarkweb](imagenes/formulas.gif)

### LaTeX creado con Gemini
Cuando hacemos un canvas le podemos pedir a Gemini que haga un PDF. Este PDF utiliza código LaTeX que podremos pegar directamente en EdiMarkWeb.

![Escribir fórmulas en EdiMarkweb](imagenes/gemini_pdf.gif)

---

## Gestión de documentos (pestañas)

Trabaja con varios documentos a la vez, cada uno en su propia pestaña.

* **Crear pestañas**: Pulsa el botón `+` (o `Ctrl+T`) para abrir un nuevo documento en blanco.
* **Cambiar de pestaña**: Haz clic en el nombre para mostrar su contenido, o pasa de una a otra con `Ctrl+Tab`.
* **Renombrar**: Haz doble clic sobre el título para poner un nombre más descriptivo (ej. “Tema 3 – Ecuaciones”).
* **Cerrar pestañas**: Pulsa la `X`. Si hay cambios sin guardar, la aplicación mostrará un aviso.
* **Cambios sin guardar**: Un punto rojo (`●`) indica que hay modificaciones pendientes.
* **Autoguardado**: Cada pestaña guarda automáticamente una copia en tu navegador; si recargas la página, el contenido reaparecerá.

---

## Barra superior de controles

La barra junto al logotipo agrupa las opciones globales de la aplicación y ahora concentra todas las acciones de archivo en un único botón desplegable:

* **Archivo**: reúne las acciones sobre el documento en dos grupos. Primero las que traen contenido —`Abrir (Ctrl+O)`, `Importar` y `Pegar LaTeX (Ctrl+Mayús+V)`— y después las que lo sacan: `Guardar (Ctrl+S)` y el submenú **Exportar**, que se despliega a la derecha con DOCX, ODT, EPUB, HTML y TEX. Cada opción muestra su atajo de teclado.
* **Configuración**: agrupa todos los ajustes de la aplicación, cada uno con un submenú que indica el valor activo.
  * **Idioma**: cambia el idioma de la interfaz.
  * **Tamaño de texto**: pequeño, normal, grande o muy grande.
  * **Tema**: `Sistema` sigue el del equipo y cambia con él; `Claro` y `Oscuro` lo fijan. La elección se recuerda la próxima vez que abras la aplicación.
  * **Ancho expandido**: amplía la superficie de trabajo.
  * **Ventana independiente**: abre EdiMarkWeb en una ventana propia, a modo de aplicación de escritorio.
  * **Documento LaTeX…**: abre los ajustes del `.tex` que genera la aplicación, explicados más abajo.
* **Imprimir (Ctrl+P)**: genera una vista preparada para papel o PDF con los estilos actuales.
* **Buscar (Ctrl+F)** y **Manual (Ctrl+H)**: abren el buscador avanzado o este mismo documento.
* **Borrar todo**: limpia por completo el documento activo tras pedir confirmación.

El diseño de los paneles se cambia con `Ctrl+L` o con las flechas de las cabeceras de cada panel. En pantallas pequeñas, la barra se pliega en dos botones —**Acciones** y **Formato**— que muestran cada grupo cuando lo necesitas.

---

## Barra de herramientas

La franja gris bajo la barra superior contiene accesos rápidos a formateo y elementos:

* **Deshacer y rehacer**: Las dos flechas del extremo izquierdo (`Ctrl+Z` y `Ctrl+Mayús+Z`).
* **Estilos básicos**: Negrita, cursiva y un menú de encabezados (H1…H6).
* **Listas y citas**: Viñetas, numeración y bloques de cita con atajos asociados.
* **Código, enlaces, imágenes y tablas**: Inserciones guiadas mediante modales.
* **Pegar**: Trae al documento lo que haya en el portapapeles, como se explica más arriba.
* **Fórmulas LaTeX**: Menú para insertar comandos en línea o en bloque con la sintaxis correcta.
* **Editor de fórmulas (EdiCuaTeX)**: Abre el asistente externo en una ventana nueva. Al aceptar, la fórmula vuelve insertada en el editor.

Cada botón muestra una descripción al pasar el ratón e indica el atajo de teclado equivalente.

---

## Buscar y reemplazar

El botón de la lupa (o `Ctrl+F`) abre un panel con búsqueda avanzada:

* El cuadro de búsqueda resalta todas las coincidencias, aunque ignores tildes o mayúsculas.
* Usa `Enter` para saltar a la siguiente coincidencia y `Mayús+Enter` para retroceder.
* Pulsa la flecha lateral para mostrar el panel de reemplazo. Puedes sustituir coincidencias una a una o todas a la vez (con confirmación).
* El botón **Regex** interpreta lo que escribas como una expresión regular. En este modo las tildes sí cuentan (las mayúsculas se siguen ignorando) y puedes usar grupos como `(\d+)`; en el reemplazo se recuperan con las referencias numeradas habituales de JavaScript (el signo de dólar seguido del número de grupo).
* El contador `actual / total` te ayuda a seguir el progreso.
* `Esc` cierra el buscador y devuelve el foco al editor.

La búsqueda funciona tanto en la vista de Markdown como en la vista HTML según dónde tengas el foco. Mientras el buscador está abierto, los atajos de formato quedan en pausa para no interferir con lo que escribas en él.

---

## Interfaz principal

La zona de trabajo se divide en dos paneles redimensionables:

* **Markdown** (izquierda): editor de texto sencillo con un contador de caracteres y su botón de copia. Todo lo que escribas aquí se refleja de inmediato en el panel derecho.
* **HTML / Previsualización** (derecha): muestra el resultado final y también permite editar el contenido directamente. Usa el botón con el icono de código para alternar entre la previsualización rica y el código HTML generado.
* **Copiar contenido**: Botones específicos para copiar Markdown o el HTML generado (incluye fórmulas convertidas a LaTeX cuando copias HTML).

Puedes arrastrar la barra central para dar más espacio a cualquiera de los paneles, maximizar uno de los dos con las flechas de su cabecera o usar el botón de la derecha de las pestañas para **maximizar el área de edición**, que oculta las barras superiores y deja la pantalla para el texto.

### Imágenes incrustadas

Cuando un documento lleva imágenes en base64 —al importar un DOCX, al pegar desde otra aplicación—, su código ocupa miles de caracteres y hace ilegible el Markdown. EdiMarkWeb las pliega automáticamente: en el editor aparece una marca corta del tipo `__EDIMARK_B64_1__` y, bajo el panel, una lista con cada imagen oculta, su formato, su tamaño y un botón **Ver código** para consultarla o copiarla. El contenido real se conserva intacto al guardar, copiar o exportar.

---

## Previsualización interactiva

* Haz clic en el panel derecho para editar directamente sobre el resultado: los cambios se sincronizan con el Markdown manteniendo el formato siempre que la edición sea compatible.
* La vista previa admite selecciones, copiar y pegar, así como el uso de atajos básicos (Ctrl+B/I, encabezados, etc.) igual que el editor de Markdown.
* Mantén pulsado `Ctrl` (o `Cmd` en macOS) y haz clic para abrir enlaces en una pestaña nueva del navegador.
* Las fórmulas LaTeX se renderizan automáticamente con KaTeX; al editar vuelven a su sintaxis original.

---

## Acciones principales

* **Abrir (`Ctrl+O`)**: Importa archivos `.md` o `.markdown`.
* **Importar**: Convierte a Markdown documentos en otros formatos mediante Pandoc: `.docx`, `.odt`, `.epub`, `.html` y `.tex`. Se recuperan los encabezados, listas, tablas y enlaces, y también las imágenes: al proceder de un `.docx`, `.odt` o `.epub`, se extraen del propio archivo y quedan incrustadas en el Markdown, de modo que se ven en la previsualización y viajan contigo al exportar.
* **Guardar (`Ctrl+S`)**: Descarga el documento actual en tu equipo.
* **Copiar contenido**: El panel izquierdo incluye un botón para copiar el Markdown; en la vista previa puedes elegir qué se copiará (HTML renderizado o variantes LaTeX) desde el menú desplegable junto al icono de copia.
* **Borrar todo**: Restablece el documento tras una confirmación.
* **Cambiar tema, diseño o ancho**: Desde el menú **Configuración** (tema y ancho) y con `Ctrl+L` (diseño de los paneles) adaptas la interfaz a cada situación: pizarra digital, portátil, etc.
* **Manual**: Dispones de este documento siempre actualizado con `Ctrl+H`.

---

## Exportar

Abre el botón **Archivo** y selecciona `Exportar` para descargar versiones listas para entregar o publicar:

* **DOCX (Microsoft Word)**: Ideal para compartir con alumnado o colegas que usan Word, y compatible con Google Docs.
* **ODT (LibreOffice)**: Pensado para suites libres como LibreOffice u OnlyOffice.
* **EPUB (libro digital)**: Crea un libro electrónico compatible con lectores de EPUB 3 (Calibre, Apple Libros, Thorium, tinta electrónica…). El título se toma del primer encabezado de nivel 1 (o del nombre del documento) y el idioma, del seleccionado en la aplicación.
* **HTML (página web)**: Genera un archivo autónomo con estilos y fórmulas incrustadas, listo para alojar en la web.
* **TEX (LaTeX)**: Crea un documento `.tex` completo con cabecera preparada para compilar. Lleva el idioma de la interfaz, de modo que la partición de palabras y los rótulos automáticos salen en tu lengua, y si el documento empieza con un único encabezado de nivel 1 este pasa a ser el título (`\title` y `\maketitle`) en lugar de una sección más.

Durante la exportación, la barra superior muestra mensajes de estado (progreso, éxito o errores).

### Ajustar el documento LaTeX

**Configuración → Documento LaTeX…** guarda tres preferencias que se reutilizan en cada exportación a TEX y en cada copia de *LaTeX – documento completo*, también la próxima vez que abras la aplicación:

* **Clase de documento**: `article` (la predeterminada), `report` o `book`.
* **Opciones de clase**: lo que va entre corchetes en `\documentclass`, separado por comas (`12pt, a4paper`).
* **Preámbulo**: tus paquetes y macros, que se insertan tal cual al final del preámbulo, justo antes de `\begin{document}`.

Los tres afectan solo al LaTeX: DOCX, ODT, EPUB y HTML se exportan igual que siempre. Y si el documento empieza con sus propios metadatos YAML, mandan ellos y estos ajustes no se aplican. Ten en cuenta que un preámbulo con errores no dará ningún aviso aquí: el fallo aparecerá al compilar el `.tex`.

---

## Copiar y compartir sin descargar

* **Copiar Markdown**: Botón directo en el panel izquierdo para enviar el texto fuente al portapapeles.
* **Copiar desde la vista previa**: El botón de copia del panel derecho recuerda tu última elección entre:
  * *Copiar HTML* (renderizado tal como lo ves).
  * *Copiar LaTeX* (solo el fragmento actual).
  * *Copiar LaTeX – documento completo* (incluye cabecera y entorno listos para compilar, con el mismo idioma y título que la exportación a TEX).

Cada opción muestra una notificación de éxito y, cuando corresponde, prepara automáticamente el marcado LaTeX a partir de la vista previa renderizada.

---

## Arrastrar y soltar archivos

Arrastra uno o varios archivos sobre la aplicación. Se admiten `.md` y `.markdown`, que se abren tal cual, y `.docx`, `.odt`, `.epub`, `.html` y `.tex`, que se convierten a Markdown con Pandoc antes de abrirse:

* Verás un marco iluminado que confirma que puedes soltarlos.
* Cada archivo se abrirá en su propia pestaña con el nombre original.
* También puedes arrastrar carpetas completas desde el explorador del sistema: se recorren sus subcarpetas y cada archivo compatible se abre en su pestaña, en orden alfabético. Lo que no sea compatible se ignora y, si no hay nada aprovechable, la aplicación te lo advierte.
* El contenido queda disponible offline gracias al autoguardado.

---

## Atajos de teclado

| Acción | Atajo (Windows/Linux) | Atajo (macOS) |
| :--- | :--- | :--- |
| **Formato** | | |
| Negrita | `Ctrl` + `B` | `Cmd` + `B` |
| Cursiva | `Ctrl` + `I` | `Cmd` + `I` |
| Encabezados 1-6 | `Ctrl` + `1..6` | `Cmd` + `1..6` |
| Lista con viñetas | `Ctrl` + `Shift` + `L` | `Cmd` + `Shift` + `L` |
| Lista numerada | `Ctrl` + `Shift` + `O` | `Cmd` + `Shift` + `O` |
| Cita | `Ctrl` + `Shift` + `Q` | `Cmd` + `Shift` + `Q` |
| Código | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Enlace | `Ctrl` + `K` | `Cmd` + `K` |
| Imagen | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` |
| Tabla | `Ctrl` + `Shift` + `T` | `Cmd` + `Shift` + `T` |
| Fórmula en línea | `Ctrl` + `M` | `Cmd` + `M` |
| Fórmula en bloque | `Ctrl` + `Shift` + `M` | `Cmd` + `Shift` + `M` |
| Deshacer / Rehacer | `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | `Cmd` + `Z` / `Cmd` + `Shift` + `Z` |
| **Gestión de documentos** | | |
| Nueva pestaña | `Ctrl` + `T` | `Cmd` + `T` |
| Cerrar pestaña | `Ctrl` + `W` | `Cmd` + `W` |
| Pestaña siguiente / anterior | `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Shift` + `Tab` |
| Guardar | `Ctrl` + `S` | `Cmd` + `S` |
| Abrir archivo | `Ctrl` + `O` | `Cmd` + `O` |
| Pegar LaTeX (abrir modal) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interfaz** | | |
| Cambiar diseño | `Ctrl` + `L` | `Cmd` + `L` |
| Buscar | `Ctrl` + `F` | `Cmd` + `F` |
| Aumentar / reducir el texto | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual de uso | `Ctrl` + `H` | `Cmd` + `H` |
| Recargar el manual | `Ctrl` + `Shift` + `H` | `Cmd` + `Shift` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

Los atajos de una sola letra actúan sobre el documento, así que quedan en pausa mientras el buscador está abierto.

---

## Ejemplos de fórmulas con LaTeX

### Fórmula de segundo grado

Para resolver una ecuación de segundo grado como $ax^2 + bx + c = 0$, se utiliza:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

### Matriz 2x2

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

### Otros delimitadores

Además de `$...$` y `$$...$$`, puedes usar los delimitadores propios de LaTeX: \(E = mc^2\) en línea, y en bloque:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

### Sumatorios, límites e integrales

La suma de los $n$ primeros naturales es $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ y la integral $\int_0^1 x^2\,dx = \frac{1}{3}$. El número $e$ se define como un límite:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### Sistemas de ecuaciones

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

### Símbolos sueltos

Letras griegas ($\alpha$, $\beta$, $\Omega$), subíndices ($H_2O$), comparaciones ($a \neq b$, $x \leq y$) y conjuntos ($\mathbb{R}$, $A \subseteq B$).

Si prefieres construirlas visualmente, selecciona el texto en el editor y abre **EdiCuaTeX**: la fórmula volverá insertada automáticamente.

---

## Ideas para docentes

* **Apuntes y resúmenes**: Combina texto con fórmulas y enlaces para compartirlos en tu aula virtual.
* **Exámenes y ejercicios**: Exporta a DOCX/ODT para imprimir o editar posteriormente.
* **Plantillas reutilizables**: Guarda documentos como HTML autónomo para subirlos a Moodle, blogs o GitHub Pages.
* **Trabajo del alumnado**: Invítales a redactar en Markdown; con el autoguardado no perderán sus avances.

---

## Licencia y contribuciones

EdiMarkWeb es software libre bajo la [GNU Affero General Public License v3.0](LICENSE). Esto significa que puedes usar la aplicación en tu aula, adaptarla y desplegarla en servidores propios, siempre que compartas cualquier mejora bajo la misma licencia y ofrezcas el código a quienes usen tu versión. Si detectas un problema o quieres proponer cambios, abre una incidencia en [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) o envía un pull request.
