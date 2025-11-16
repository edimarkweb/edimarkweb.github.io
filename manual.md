![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

Bienvenido/a a EdiMarkWeb, un **editor de textos en Markdown** diseñado para docentes y creadores de contenido que necesitan trabajar rápido, exportar a varios formatos y añadir matemáticas con LaTeX sin complicaciones. Todo funciona directamente en el navegador y los documentos se guardan de forma segura en tu equipo.

## Novedades destacadas

- Edición dual: puedes trabajar tanto en Markdown como directamente en la vista previa HTML, siempre sincronizadas.
- Menú de exportación y de importación con soporte para DOCX, ODT, HTML y LaTeX, incluyendo opciones de copia directa al portapapeles.
- Buscador con reemplazo que resalta las coincidencias y acepta términos sin tildes ni distinción entre mayúsculas y minúsculas.
- Selector de idioma y tamaño de letra para adaptar la interfaz a tu aula.
- Botones para ampliar el ancho de trabajo o abrir la aplicación en una ventana independiente (modo escritorio).
- Menú de fórmulas renovado y acceso directo a EdiCuaTeX para construir expresiones complejas.
- Apertura de múltiples archivos Markdown arrastrándolos al editor (cada uno en su pestaña).

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
* **Cambiar de pestaña**: Haz clic en el nombre para mostrar su contenido.
* **Renombrar**: Haz doble clic sobre el título para poner un nombre más descriptivo (ej. “Tema 3 – Ecuaciones”).
* **Cerrar pestañas**: Pulsa la `X`. Si hay cambios sin guardar, la aplicación mostrará un aviso.
* **Cambios sin guardar**: Un punto rojo (`●`) indica que hay modificaciones pendientes.
* **Autoguardado**: Cada pestaña guarda automáticamente una copia en tu navegador; si recargas la página, el contenido reaparecerá.

---

## Barra superior de controles

La barra junto al logotipo agrupa las opciones globales de la aplicación y ahora concentra todas las acciones de archivo en un único botón desplegable:

* **Archivo**: abre un menú con `Abrir (Ctrl+O)`, `Importar` mediante Pandoc, `Pegar LaTeX (Ctrl+Mayús+V)` para pegar documentos completos, `Guardar (Ctrl+S)` y el submenú **Exportar** con DOCX, ODT, HTML o TEX. Así no hay iconos duplicados y siempre encontrarás los comandos de gestión en el mismo lugar.
* **Idioma y tamaño de letra**: selecciona el idioma de la interfaz y el tamaño base del texto sin salir del flujo de trabajo.
* **Tema claro/oscuro** y **Diseño (Ctrl+L)**: ajustan el aspecto visual (tema, distribución de paneles) en un solo clic.
* **Ancho expandido** y **Ventana independiente**: amplían la superficie útil o lanzan EdiMarkWeb en una ventana separada para modo escritorio.
* **Imprimir (Ctrl+P)**: genera una vista preparada para papel o PDF con los estilos actuales.
* **Buscar (Ctrl+F)** y **Manual (Ctrl+H)**: abren el buscador avanzado o este mismo documento.
* **Borrar todo**: limpia por completo el documento activo tras pedir confirmación.

---

## Barra de herramientas

La franja gris bajo la barra superior contiene accesos rápidos a formateo y elementos:

* **Estilos básicos**: Negrita, cursiva y un menú de encabezados (H1…H6).
* **Listas y citas**: Viñetas, numeración y bloques de cita con atajos asociados.
* **Código, enlaces, imágenes y tablas**: Inserciones guiadas mediante modales.
* **Fórmulas LaTeX**: Menú para insertar comandos en línea o en bloque con la sintaxis correcta.
* **EdiCuaTeX**: Abre el asistente externo en una ventana nueva. Al aceptar, la fórmula vuelve insertada en el editor.

Cada botón muestra una descripción al pasar el ratón e indica el atajo de teclado equivalente.

---

## Buscar y reemplazar

El botón de la lupa (o `Ctrl+F`) abre un panel con búsqueda avanzada:

* El cuadro de búsqueda resalta todas las coincidencias, aunque ignores tildes o mayúsculas.
* Usa `Enter` para saltar a la siguiente coincidencia y `Mayús+Enter` para retroceder.
* Pulsa la flecha lateral para mostrar el panel de reemplazo. Puedes sustituir coincidencias una a una o todas a la vez (con confirmación).
* El contador `actual / total` te ayuda a seguir el progreso.

La búsqueda funciona tanto en la vista de Markdown como en la vista HTML según dónde tengas el foco.

---

## Interfaz principal

La zona de trabajo se divide en dos paneles redimensionables:

* **Markdown** (izquierda): editor de texto con resaltado, numeración opcional y controles de copia. Todo lo que escribas aquí se refleja de inmediato en el panel derecho.
* **HTML / Previsualización** (derecha): muestra el resultado final y también permite editar el contenido directamente. Usa el botón con el icono de código para alternar entre la previsualización rica y el código HTML generado.
* **Copiar contenido**: Botones específicos para copiar Markdown o el HTML generado (incluye fórmulas convertidas a LaTeX cuando copias HTML).

Puedes arrastrar la barra central para dar más espacio a cualquiera de los paneles.

---

## Previsualización interactiva

* Haz clic en el panel derecho para editar directamente sobre el resultado: los cambios se sincronizan con el Markdown manteniendo el formato siempre que la edición sea compatible.
* La vista previa admite selecciones, copiar y pegar, así como el uso de atajos básicos (Ctrl+B/I, encabezados, etc.) igual que el editor de Markdown.
* Mantén pulsado `Ctrl` (o `Cmd` en macOS) y haz clic para abrir enlaces en una pestaña nueva del navegador.
* Las fórmulas LaTeX se renderizan automáticamente con KaTeX; al editar vuelven a su sintaxis original.

---

## Acciones principales

* **Abrir (`Ctrl+O`)**: Importa archivos `.md` o `.markdown`.
* **Guardar (`Ctrl+S`)**: Descarga el documento actual en tu equipo.
* **Copiar contenido**: El panel izquierdo incluye un botón para copiar el Markdown; en la vista previa puedes elegir qué se copiará (HTML renderizado o variantes LaTeX) desde el menú desplegable junto al icono de copia.
* **Borrar todo**: Restablece el documento tras una confirmación.
* **Cambiar tema / diseño / ancho**: Ajusta la interfaz a diferentes situaciones (pizarra digital, portátil, etc.).
* **Manual**: Dispones de este documento siempre actualizado con `Ctrl+H`.

---

## Exportar

Abre el botón **Archivo** y selecciona `Exportar` para descargar versiones listas para entregar o publicar:

* **DOCX (Microsoft Word)**: Ideal para compartir con alumnado o colegas que usan Word, y compatible con Google Docs.
* **ODT (LibreOffice)**: Pensado para suites libres como LibreOffice u OnlyOffice.
* **HTML (página web)**: Genera un archivo autónomo con estilos y fórmulas incrustadas, listo para alojar en la web.
* **TEX (LaTeX)**: Crea un documento `.tex` completo con cabecera preparada para compilar.

Durante la exportación, la barra superior muestra mensajes de estado (progreso, éxito o errores).

---

## Copiar y compartir sin descargar

* **Copiar Markdown**: Botón directo en el panel izquierdo para enviar el texto fuente al portapapeles.
* **Copiar desde la vista previa**: El botón de copia del panel derecho recuerda tu última elección entre:
  * *Copiar HTML* (renderizado tal como lo ves).
  * *Copiar LaTeX* (solo el fragmento actual).
  * *Copiar LaTeX – documento completo* (incluye cabecera y entorno listos para compilar).

Cada opción muestra una notificación de éxito y, cuando corresponde, prepara automáticamente el marcado LaTeX a partir de la vista previa renderizada.

---

## Arrastrar y soltar archivos

Arrastra uno o varios archivos `.md` o `.markdown` sobre la aplicación:

* Verás un marco iluminado que confirma que puedes soltarlos.
* Cada archivo se abrirá en su propia pestaña con el nombre original.
* El contenido queda disponible offline gracias al autoguardado. También puedes arrastrar carpetas completas desde el explorador del sistema; cada archivo compatible se abrirá en su propia pestaña.

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
| Código | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| **Gestión de documentos** | | |
| Nueva pestaña | `Ctrl` + `T` | `Cmd` + `T` |
| Cerrar pestaña | `Ctrl` + `W` | `Cmd` + `W` |
| Guardar | `Ctrl` + `S` | `Cmd` + `S` |
| Abrir archivo | `Ctrl` + `O` | `Cmd` + `O` |
| Pegar LaTeX (abrir modal) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interfaz** | | |
| Cambiar diseño | `Ctrl` + `L` | `Cmd` + `L` |
| Buscar | `Ctrl` + `F` | `Cmd` + `F` |
| Manual de uso | `Ctrl` + `H` | `Cmd` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

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
