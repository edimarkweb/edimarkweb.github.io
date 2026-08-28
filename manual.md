![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

Bienvenido/a a EdiMarkWeb, un **editor de textos en Markdown** diseñado para docentes y creadores de contenido que necesitan trabajar rápido, exportar a varios formatos y añadir matemáticas con LaTeX sin complicaciones. Puedes usarlo **en el navegador**, sin instalar nada, o **instalarlo como aplicación de escritorio** en Linux, Windows y macOS. En ambos casos todo el trabajo ocurre en tu equipo: ni los documentos ni las imágenes salen de él.

## Novedades destacadas

- Edición dual: puedes trabajar tanto en Markdown como directamente en la vista previa HTML, siempre sincronizadas.
- Menú de exportación y de importación con soporte para DOCX, ODT, EPUB, HTML, LaTeX y PDF, incluyendo opciones de copia directa al portapapeles.
- Buscador con reemplazo que resalta las coincidencias y acepta términos sin tildes ni distinción entre mayúsculas y minúsculas.
- Menú **Configuración** con el idioma, el tema y la ventana independiente reunidos en un mismo sitio; cada panel lleva su propia lupa, que aparece en la **barra de estado** cuando trabajas en él; el ancho de trabajo se cambia en la fila de las pestañas y el reparto de paneles, en la barra de estado.
- Tema de la interfaz con tres opciones —Sistema, Claro y Oscuro— que se recuerda entre sesiones.
- Menú de fórmulas renovado y acceso directo a EdiCuaTeX para construir expresiones complejas.
- Apertura de múltiples archivos, o de carpetas enteras, arrastrándolos al editor (cada archivo en su pestaña): Markdown y también DOCX, ODT, EPUB, HTML o TEX, que se convierten al vuelo con Pandoc.
- Búsqueda con expresiones regulares y modo de edición a pantalla completa para trabajar sin distracciones.
- **Idioma de cada documento**, guardado dentro del propio archivo y visible junto al contador de caracteres. Los cinco formatos lo declaran, así que Word y LibreOffice dejan de corregir en inglés un texto en castellano.
- **Opciones de exportación** en un mismo sitio: autor, portada del EPUB, índice automático, numeración de apartados y, para LaTeX, la clase, sus opciones y un preámbulo propio.
- **Aplicación de escritorio** para Linux, Windows y macOS, con los documentos asociados al doble clic, guardado sobre el archivo original, corrector ortográfico del sistema y funcionamiento sin conexión.
- **Aviso de versiones nuevas** en la aplicación de escritorio, con descarga e instalación desde la propia aplicación.

## ¡Pega cualquier contenido!

> **Importante:** ahora puedes pegar **cualquier objeto desde el portapapeles**: texto plano, fragmentos de Word o LibreOffice, HTML completo, fórmulas generadas por un chatbot e incluso imágenes copiadas directamente. Usa `Ctrl+V`/`Cmd+V` o el botón de la barra de herramientas con el icono de portapapeles (`Pegar`) y EdiMarkWeb colocará automáticamente el contenido en el panel adecuado:

- El texto Markdown o sin formato se inserta en el panel izquierdo respetando exactamente la posición del cursor.
- El contenido enriquecido (HTML, DOCX, pegado desde el navegador, etc.) se vuelve a calcular en el panel derecho y, al mismo tiempo, se genera el Markdown correspondiente para mantener ambas vistas sincronizadas.

Esto elimina la necesidad de pasos intermedios: copia desde tu origen favorito y haz clic en **Pegar** para seguir editando sin interrupciones.

El botón **Imagen** también permite elegir un archivo del disco, además de escribir una URL, y pregunta cómo quieres insertarlo:

* **Con ruta relativa** (lo recomendado y lo que viene marcado): el documento se limita a nombrar la imagen —`![Gráfico](imagenes/01.png)`—, que se queda donde está. Es lo que hace cualquier editor de Markdown y lo que mantiene el `.md` ligero y legible; a cambio, el documento y su carpeta de imágenes viajan juntos.
* **Dentro del documento**: la imagen se incrusta en el propio archivo, que pasa a ser autónomo pero mucho más pesado. Útil para enviar un `.md` suelto por correo.

En la aplicación de escritorio la ruta se calcula sola desde la carpeta del documento. En el navegador no hay forma de conocer la carpeta de la imagen, así que se escribe solo su nombre y se avisa de ello.

---

## Gestión de documentos (pestañas)

Trabaja con varios documentos a la vez, cada uno en su propia pestaña.

* **Crear pestañas**: Pulsa el botón `+` (o `Ctrl+T`) para abrir un nuevo documento en blanco.
* **Cambiar de pestaña**: Haz clic en el nombre para mostrar su contenido, o pasa de una a otra con `Ctrl+Tab`. Cada pestaña recuerda dónde la dejaste: al volver, el cursor y las dos vistas están donde estaban.
* **Renombrar**: Haz doble clic sobre el título para poner un nombre más descriptivo (ej. “Tema 3 – Ecuaciones”).
* **Cerrar pestañas**: Pulsa la `X`. Si hay cambios sin guardar, la aplicación mostrará un aviso.
* **Cambios sin guardar**: Un punto rojo (`●`) indica que hay modificaciones pendientes.
* **Autoguardado**: Cada pestaña guarda sola una copia en el equipo, en el espacio propio de la aplicación; si recargas la página o vuelves a abrir el programa, el contenido reaparece. Es una red de seguridad, no un sustituto de guardar el archivo.

---

## Barra superior de controles

La cabecera tiene dos mitades. Junto al logotipo están los tres menús —**Archivo**, **Exportar** y **Configuración**—, con su nombre escrito y sin icono, como la barra de menús de cualquier programa de escritorio. En el extremo derecho, las acciones que se usan a diario, como botones de un solo icono: **Guardar**, **Copiar**, **Imprimir**, **Buscar** y **Ayuda**.

* **Guardar (Ctrl+S)**: el primer botón de la derecha. Cuando el documento abierto tiene cambios pendientes, le aparece un punto rojo en la esquina, el mismo que marca la pestaña.
* **Exportar (Ctrl+Alt+E)**: los seis formatos —DOCX, ODT, EPUB, HTML, TEX y PDF—, cada uno con una línea que dice para qué sirve.
* **Archivo**: lo que no se hace a diario. `Abrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` y `Pegar LaTeX (Ctrl+Mayús+V)` traen contenido; `Guardar (Ctrl+S)` y `Guardar como… (Ctrl+Mayús+S)` lo sacan. Guardar está aquí además de en su icono: la opción lleva el atajo escrito, y «Guardar como…» sin «Guardar» al lado se lee mal. Cada opción muestra su atajo de teclado. En la aplicación de escritorio el menú termina con **Salir**, que guarda el documento en curso y cierra la aplicación.
* **Configuración**: agrupa todos los ajustes de la aplicación, cada uno con un submenú que indica el valor activo.
  * **Idioma**: cambia el idioma de la interfaz.
  * **Tema**: `Sistema` sigue el del equipo y cambia con él; `Claro` y `Oscuro` lo fijan. La elección se recuerda la próxima vez que abras la aplicación.
  * **Ventana independiente**: abre EdiMarkWeb en una ventana propia del navegador, sin pestañas ni barra de direcciones. La tienes también como botón al final de la fila de la vista, a la derecha de los controles de paneles. Solo aparece en la versión web; la aplicación de escritorio ya es una ventana propia.
  * **Corrector ortográfico**: subraya las faltas del panel Markdown con los diccionarios instalados en el equipo y sigue el idioma del documento. Viene activado; al desmarcarlo se apaga y la elección se recuerda.
  * **Opciones de exportación…**: abre los ajustes de los archivos que genera la aplicación (idioma y, para LaTeX, clase y preámbulo), explicados más abajo.
* **Imprimir (Ctrl+P)**: genera una vista preparada para papel o PDF con los estilos actuales.
* **Buscar (Ctrl+F)**: abre el buscador avanzado.
* **Ayuda**: el botón de la interrogación reúne el **Manual de uso (F1)**, **Acerca de EdiMarkWeb** —versión instalada, autor, licencia y licencias de las bibliotecas de terceros, con los enlaces a la versión web y a las descargas— y, en la aplicación de escritorio, **Buscar actualizaciones…**.

El diseño de los paneles se cambia con `Ctrl+L` o con los tres botones de disposición situados junto al botón que maximiza el área de edición: **solo el código fuente**, **los dos paneles a la vez** y **solo el resultado**, en ese orden, con el activo resaltado. En pantallas estrechas los tres se pliegan en un menú con las mismas opciones. En pantallas pequeñas, la barra se pliega en dos botones —**Acciones** y **Formato**— que muestran cada grupo cuando lo necesitas.

---

## Barra de herramientas

La franja gris bajo la barra superior contiene accesos rápidos a formateo y elementos:

* **Deshacer y rehacer**: Las dos flechas del extremo izquierdo (`Ctrl+Z` y `Ctrl+Mayús+Z`).
* **Estilos básicos**: Negrita, cursiva y un menú de encabezados (H1…H6).
* **Listas y citas**: Viñetas, numeración y bloques de cita con atajos asociados.
* **Código, enlaces, imágenes y tablas**: Inserciones guiadas mediante modales.
* **Pegar**: Trae al documento lo que haya en el portapapeles, como se explica más arriba.
* **Fórmulas LaTeX**: menú con los cuatro delimitadores —`$...$`, `$$...$$`, `\(...\)` y `\[...\]`—, cada uno con su atajo al lado. Van en acorde: `Ctrl+M` abre la espera —la barra de estado recuerda las teclas— y después `1`, `2`, `3` o `4` elige el delimitador; `Intro` o una `M` repetida insertan `$...$`, que es el de siempre, y `Esc` o cualquier otra tecla cancelan. Se hace así porque una combinación distinta para cada delimitador acaba chocando con el navegador o con el escritorio: `Ctrl+Mayús+J` es la consola del navegador y `Ctrl+Mayús+M` puede ser la lupa del sistema, y ninguno de los dos suelta su atajo.
* **Editor de fórmulas (EdiCuaTeX)**: abre el asistente integrado con `Ctrl+Alt+M`. Al aceptar, la fórmula vuelve insertada en el editor.

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

* **Markdown** (izquierda): editor de texto sencillo. Su lupa y el contador de caracteres están en la barra de estado, bajo los dos paneles. La lupa (`−`, el porcentaje y `+`, o `Ctrl` + `+` / `Ctrl` + `-`) agranda o reduce el texto del editor sin tocar el documento; el porcentaje vuelve al 100 %. Todo lo que escribas aquí se refleja de inmediato en el panel derecho.
* **HTML / Previsualización** (derecha): muestra el resultado final y también permite editar el contenido directamente. Usa el botón con el icono de código para alternar entre la previsualización rica y el código HTML generado. El documento se presenta como una hoja sobre una mesa, y su zoom —en la barra de estado, cuando estás en este panel— (`−`, el porcentaje y `+`) la agranda o la reduce en pantalla; el porcentaje devuelve el 100 %. Es una lupa: no cambia el texto ni lo que se exporta —el tamaño del documento está en *Formato del texto*—.
* **Panel activo**: con los dos paneles a la vista, uno de ellos es el que manda —el que reciben los botones de la barra de herramientas y el que gobierna la lupa—. Se reconoce por el filo de color del panel y por el rótulo de la barra de estado, que nombra solo el panel activo, y sigue marcado aunque pulses un botón y el cursor deje de parpadear ahí.
* **Copiar contenido**: Botones específicos para copiar Markdown o el HTML generado (incluye fórmulas convertidas a LaTeX cuando copias HTML).

Puedes arrastrar la barra central para dar más espacio a cualquiera de los paneles, elegir una de las tres disposiciones en los botones situados a la derecha o usar la doble flecha para **maximizar el área de edición**, que oculta las barras superiores y deja la pantalla para el texto. El botón `+` permanece justo después de la última pestaña.

### Los ajustes de cada documento

Junto al contador de caracteres hay un botón corto con el idioma del documento: `ES`, `CA`, `FR`… Si se ve atenuado, ese documento no tiene idioma propio y usa el **idioma general** de *Configuración → Opciones de exportación…*, que es lo normal. Al pulsarlo se abre el cuadro **Este documento**, repartido en dos pestañas: **Documento** —idioma, autor, índice y numeración— y **Formato**, con el formato del texto.

Al elegir un idioma concreto, la aplicación lo guarda **dentro del propio documento**, de modo que viaja con el archivo: si lo guardas y lo abres mañana, aquí o en otro equipo, o se lo pasas a alguien, seguirá siendo ese. Para volver a lo anterior, elige *Heredado*. Y con *Otro…* puedes escribir el código de cualquier lengua (`fr`, `de`, `pt-BR`). El **autor** funciona igual, en el campo de al lado.

En la barra de estado, junto al contador de caracteres, una pastilla resume cómo va a salir el documento: el tipo y el tamaño de letra, el interlineado o la alineación —los tres primeros que estén decididos—, ya con la herencia resuelta —lo que dice el documento y, donde calla, la opción general—. El resto —y los márgenes, la sangría y la partición— se lee al pasar el ratón por encima, y al pulsarla se abre este mismo cuadro. En pantallas estrechas se queda solo con el primero.

En la misma pestaña están el **índice automático** y la **numeración de los apartados**, con las mismas tres posibilidades: *Heredado*, *Sí* y *No*. Son los mismos ajustes de *Opciones de exportación*, pero dichos por este documento, que es donde suelen decidirse: un manual quiere índice numerado y una nota de dos párrafos no. Debajo de cada campo se lee lo que hereda ahora mismo, y un *No* explícito le quita el índice a este documento aunque la opción general lo pida.

Si alguna vez abres tu `.md` con un editor de texto plano, verás esa preferencia arriba del todo, en unas líneas entre rayas:

```
---
lang: "ca"
toc: true
---
```

Es la forma estándar de guardar datos sobre un documento y la entienden muchos programas. EdiMarkWeb no la muestra en la previsualización, porque no es contenido, pero sí en el panel Markdown, que es el código fuente. Puedes borrarla o cambiarla a mano si quieres.

#### El formato del texto

En el mismo cuadro —que también abre el botón de los controles deslizantes del final de la barra— se fijan la **alineación** (izquierda, justificada o derecha), el **tipo de letra** (con remates, sin remates, monoespaciada o la que escribas), el **tamaño** en puntos, el **interlineado**, los **márgenes** de los cuatro lados en centímetros, la **sangría de primera línea** y la **partición de palabras con guion**.

Al elegir *Otra…* en el tipo de letra aparece el nombre de la tipografía justo debajo, con una lista de sugerencias: las que la aplicación ha podido reconocer como instaladas en este equipo (en Chrome y Edge, además, *Ver todas las del sistema…* pide permiso y ofrece la lista completa). Puedes escribir cualquier nombre aunque no esté instalado: el documento lo guarda igual, porque el archivo puede acabar en un equipo que sí la tenga. Si aquí no está, se avisa en ámbar y la previsualización usa una tipografía de reserva; al exportar, el nombre viaja escrito y lo resuelve cada programa (Word y LibreOffice si la tienen, y en LaTeX solo con XeLaTeX o LuaLaTeX).

Lo que dejes en *Heredado* sigue a **Configuración → Opciones de exportación…**, donde están los mismos ajustes como valores de partida para todos los documentos. Debajo de cada campo se ve, en gris, el valor que hereda ahora mismo. Lo que fijes aquí se guarda dentro del propio documento, junto al idioma y al autor, así que viaja con el archivo. *Quitar todo del documento* lo deja sin nada propio:

```
---
lang: "es"
align: "justify"
fontsize: "12pt"
margin-left: "3cm"
---
```

Se aplica a la previsualización y a los cinco formatos de exportación, con tres salvedades que conviene conocer:

* En el **EPUB** los márgenes son una sugerencia: quien manda sobre la caja de la página es el lector de libros.
* En **TEX**, si tu preámbulo ya carga `geometry`, mandan tus márgenes: la aplicación avisa de que ha dejado fuera los del menú en lugar de romper la compilación con dos `\usepackage` iguales.
* La **partición de palabras** usa los diccionarios de guiones del sistema. Word en Windows y macOS trae los suyos; en Linux, LibreOffice necesita el paquete del idioma (por ejemplo, `hyphen-es`).

### Imágenes con ruta relativa

Un `.md` corriente no lleva las imágenes dentro: las guarda en una carpeta al lado y las nombra con una ruta relativa, `imagenes/01.png`. EdiMarkWeb resuelve esas rutas y muestra las imágenes en la previsualización.

* En la **aplicación de escritorio** no hay que hacer nada: al abrir el documento, las imágenes se buscan en su carpeta y aparecen.
* En el **navegador** ninguna página puede leer una carpeta del disco sin permiso. Si el documento nombra imágenes que no se encuentran, sobre la previsualización aparece un aviso con el botón **Buscar su carpeta…**: al elegir la carpeta del documento, todas sus imágenes se ven. Basta hacerlo una vez: EdiMarkWeb guarda en el navegador las imágenes que usa ese documento y las recupera al recargar la página.
* Arrastrar una carpeta entera al editor abre sus documentos **y** registra sus imágenes de una vez.
* Al **guardar**, las imágenes recuperadas se copian junto al `.md`, conservando rutas como `imagenes/01.png`. En el navegador se elige la carpeta de destino; si el navegador no permite escribir carpetas, se descarga un ZIP listo para descomprimir. **Guardar como…** hace la misma copia en la aplicación de escritorio.

El Markdown no cambia en ningún momento: lo que se guarda, se copia o se exporta sigue llevando la ruta que escribiste. Las imágenes que no se encuentran se marcan con un recuadro discontinuo en lugar del icono roto del navegador.

### Imágenes incrustadas

Cuando un documento lleva imágenes en base64 —al importar un DOCX, al pegar desde otra aplicación—, su código ocupa miles de caracteres y hace ilegible el Markdown. EdiMarkWeb las pliega automáticamente: en el editor aparece una marca corta del tipo `__EDIMARK_B64_1__` y, bajo el panel, una lista con cada imagen oculta, su formato, su tamaño y un botón **Ver código** para consultarla o copiarla. El contenido real se conserva intacto al guardar, copiar o exportar. La lista viene recogida en una sola línea, con el número de imágenes: al desplegarla, cada una muestra su miniatura —clic en ella para verla a tamaño grande— y la lista se queda con su propia altura y su barra de desplazamiento, de modo que por muchas imágenes que tenga el documento nunca le come sitio al editor. Se recuerda si la dejaste abierta o cerrada. Cada línea trae además un botón **Eliminar**, que quita la imagen del documento —el código entero, no solo el marcador— tras pedir confirmación, y **Ver código**, útil si quieres copiar el `data:` para pegar esa misma imagen en otro documento o en otra herramienta.

Si prefieres que las imágenes no vayan dentro del texto, el botón **Pasar las imágenes a la carpeta**, en ese mismo panel, hace el camino de vuelta: cada imagen se convierte en un archivo de una carpeta con el nombre del documento —`mi-archivo.md` las saca a `mi-archivo/`, con los espacios en guiones— y en el Markdown queda su ruta, que es como guarda las imágenes cualquier `.md`. La carpeta lleva el nombre del documento para que dos `.md` guardados uno al lado del otro no se pisen las imágenes, que se numeran desde `01` en cada uno. Los archivos se escriben al guardar el documento, por el mismo camino que el resto de imágenes con ruta: junto al `.md` en la aplicación de escritorio, en la carpeta que elijas en el navegador y, donde el navegador no ofrece elegir carpeta, dentro del ZIP. Mientras tanto se siguen viendo en la previsualización, y `Ctrl`+`Z` deshace el cambio si no era lo que querías.

---

## Previsualización interactiva

* Haz clic en el panel derecho para editar directamente sobre el resultado: los cambios se sincronizan con el Markdown manteniendo el formato siempre que la edición sea compatible.
* La vista previa admite selecciones, copiar y pegar.
* **La barra de formato trabaja también aquí.** Con el cursor en la hoja, la negrita, la cursiva, el código, los títulos, la cita, las listas, los enlaces, las imágenes, las tablas y las fórmulas se aplican sobre lo que estás viendo, y el Markdown se reescribe solo: es un editor de texto con formato que va traduciendo a Markdown. El mismo botón quita lo que puso —pulsar *Negrita* sobre algo ya en negrita se la quita— y los atajos (`Ctrl`+`B`, `Ctrl`+`I`, `Ctrl`+`Mayús`+`L`, etc.) hacen lo mismo que los botones. `Ctrl`+`Z` deshace, aunque estés en la hoja: el historial es siempre el del documento.
* Mantén pulsado `Ctrl` (o `Cmd` en macOS) y haz clic para abrir enlaces; en la aplicación de escritorio se abren en tu navegador habitual.
* **Las fórmulas se escriben en su propia ventana.** Sobre la hoja no hay dónde escribir dentro de un `$…$` vacío, porque KaTeX lo convierte en fórmula en cuanto se repinta; por eso, con el cursor en la previsualización, el botón `{}` abre directamente una ventana con el código LaTeX, el resultado a la vista mientras escribes y el aviso del error si lo hay. Lo que hubiera seleccionado llega ya escrito. Dentro se elige si la fórmula va **en línea o en bloque** y con qué **delimitadores**, `\(...\)` o `$...$`, que es lo que viene puesto de partida: en línea y `\(...\)`. Desde el panel Markdown no cambia nada: el mismo botón despliega los cuatro pares y los delimitadores se escriben en el texto, como siempre.
* Las fórmulas LaTeX se renderizan automáticamente con KaTeX; al editar vuelven a su sintaxis original.

---

## Acciones principales

* **Abrir (`Ctrl+O`)**: Importa archivos `.md` o `.markdown`.
* **Importar**: Convierte a Markdown documentos en otros formatos mediante Pandoc: `.docx`, `.odt`, `.epub`, `.html` y `.tex`. Se recuperan los encabezados, listas, tablas y enlaces, y también las imágenes: al proceder de un `.docx`, `.odt` o `.epub`, se extraen del propio archivo y quedan incrustadas en el Markdown, de modo que se ven en la previsualización y viajan contigo al exportar. De un `.epub` vuelve además el idioma del documento, que el libro guarda en su envoltorio y no en el texto.
* **Guardar (`Ctrl+S`)**: guarda el documento actual. En la aplicación de escritorio actualiza el archivo ya abierto; **Guardar como… (`Ctrl+Mayús+S`)** siempre permite elegir otro nombre o ubicación.
* **Copiar contenido**: El panel izquierdo incluye un botón para copiar el Markdown; en la vista previa puedes elegir qué se copiará (HTML renderizado o variantes LaTeX) desde el menú desplegable junto al icono de copia.
* **Cambiar tema, diseño o ancho**: usa **Configuración** para el tema, `Ctrl+L` o los botones de paneles para el diseño y el botón de ancho (solo icono), a la derecha de la doble flecha, para ampliar la superficie web.
* **Manual**: Dispones de este documento siempre actualizado con `Ctrl+H`.
* **La carpeta se recuerda**: en la aplicación de escritorio, el primer cuadro de abrir o guardar sale donde diga el sistema, pero a partir de ahí todos —abrir, guardar como, exportar, elegir una imagen— vuelven a la última carpeta que usaste. Se recuerda solo mientras la aplicación está abierta.

---

## Exportar

Abre el botón **Archivo** y selecciona `Exportar` para descargar versiones listas para entregar o publicar:

* **DOCX (Microsoft Word)**: Ideal para compartir con alumnado o colegas que usan Word, y compatible con Google Docs.
* **ODT (LibreOffice)**: Pensado para suites libres como LibreOffice u OnlyOffice.
* **EPUB (libro digital)**: Crea un libro electrónico compatible con lectores de EPUB 3 (Calibre, Apple Libros, Thorium, tinta electrónica…). El título se toma del primer encabezado de nivel 1 (o del nombre del documento), y el autor, la portada y el idioma salen de los ajustes que se explican más abajo.
* **HTML (página web)**: Genera un archivo autónomo con estilos y fórmulas incrustadas, listo para alojar en la web. El título de la pestaña del navegador se toma del primer encabezado, o del nombre del documento si no lo hay.
* **TEX (LaTeX)**: Crea un documento `.tex` completo con cabecera preparada para compilar. Lleva el idioma del documento, de modo que la partición de palabras y los rótulos automáticos salen en tu lengua, y si el documento empieza con un único encabezado de nivel 1 este pasa a ser el título (`\title` y `\maketitle`) en lugar de una sección más.
* **PDF**: Abre el diálogo de impresión del sistema, donde eliges «Guardar como PDF» como destino. Sale exactamente lo que ves en la vista previa, con las fórmulas compuestas y los márgenes del documento, y el texto queda seleccionable y buscable. Es el mismo camino que el botón **Imprimir (Ctrl+P)**.

Durante la exportación, la barra superior muestra mensajes de estado (progreso, éxito o errores).

### Opciones de exportación

**Configuración → Opciones de exportación…** guarda preferencias que se reutilizan en cada exportación, también la próxima vez que abras la aplicación.

El cuadro está repartido en cuatro pestañas —**Documento**, **Formato**, **EPUB** y **LaTeX**— y se recorren también con las flechas del teclado. En la aplicación de escritorio, además de recordarse, estas opciones se guardan en un archivo `settings.json` dentro de la carpeta de configuración de EdiMarkWeb en tu perfil de usuario, así que sobreviven a una limpieza de datos del navegador interno o a una reinstalación.

**Idioma del documento**, que se aplica a los cinco formatos. Es el que decide en qué lengua corrigen la ortografía Word y LibreOffice al abrir un DOCX o un ODT, cómo parte las palabras LaTeX y qué idioma declaran el HTML y el EPUB para los lectores de pantalla. Por omisión es **Igual que la interfaz**: si cambias el idioma de EdiMarkWeb, los documentos lo siguen. Puedes fijar cualquiera de los cinco idiomas de la aplicación o elegir **Otro…** y escribir su código (`fr`, `de`, `pt-BR`).

**Autor**, que se guarda en las propiedades del archivo y aparece como autor del libro en el EPUB y en la portada del LaTeX. En DOCX y ODT, además, Pandoc escribe una línea con el nombre al principio del documento; si no quieres que aparezca, deja el campo vacío. Un documento concreto puede llevar otro autor: *Autor de este documento…*, en el menú del botón de idioma.

**Portada del EPUB**, con tres posibilidades. De partida, EdiMarkWeb **genera una** con el título y el autor del documento, porque un libro sin imagen aparece con el icono genérico en la estantería del lector. Puedes poner **una imagen tuya** —hasta 1 MB, que para una portada sobra: se guarda junto a tus documentos, en el espacio propio de la aplicación— o dejar el libro **sin portada**. Solo afecta al EPUB.

**Formato del texto**: alineación, tipo y tamaño de letra, interlineado, márgenes, sangría y partición de palabras, con los valores de partida para todos los documentos. El tamaño viene puesto en doce puntos, que es lo que ya escriben DOCX y ODT, para que la vista previa tenga siempre un cuerpo concreto que enseñar; los demás salen sin fijar. Cada documento puede fijar los suyos desde el panel Markdown, y lo que no fije lo hereda de aquí.

**Índice automático**, que añade al principio del documento un índice con los apartados. En DOCX es un índice de Word de verdad y en ODT uno nativo de LibreOffice; el EPUB no lo necesita, porque el lector ya trae su índice de navegación. Es el valor de partida: cada documento puede pedirlo o rechazarlo por su cuenta en el cuadro **Este documento**.

> **Sobre los números de página**: en DOCX y ODT el índice es un campo que el procesador de textos calcula, porque hace falta maquetar las páginas para saber en cuál cae cada apartado. EdiMarkWeb le escribe dentro la lista de apartados, así que el documento se abre con el índice a la vista, pero sin números. Para que aparezcan, actualízalo: en Word, clic derecho sobre el índice → *Actualizar campos*; en LibreOffice, *Herramientas → Actualizar → Índices*.

**Numerar los apartados**, que antepone 1, 1.1, 1.2… a los encabezados. Funciona en DOCX, HTML y LaTeX; el ODT no admite esta numeración y sale sin ella. También lo puede fijar cada documento.

Y tres ajustes **solo para LaTeX**, que se aplican al exportar a TEX y al copiar *LaTeX – documento completo*:

* **Clase de documento**: `article` (la predeterminada), `report` o `book`.
* **Opciones de clase**: lo que va entre corchetes en `\documentclass`, separado por comas (`12pt, a4paper`).
* **Preámbulo**: tus paquetes y macros, que se insertan tal cual al final del preámbulo, justo antes de `\begin{document}`.

Si el documento empieza con sus propios metadatos YAML, mandan ellos y ninguno de estos ajustes se aplica. Y ten en cuenta que un preámbulo con errores no dará ningún aviso aquí: el fallo aparecerá al compilar el `.tex`.

---

## Copiar y compartir sin descargar

El botón de copiar está en la cabecera, junto a **Exportar**: los dos hacen lo mismo con distinto destino, uno al archivo y otro al portapapeles. Copia en cuatro formatos:

* *Markdown* (`Ctrl+Alt+C` y luego `1`): el texto fuente, tal cual está en el editor.
* *HTML* (`Ctrl+Alt+C 2`): el documento representado, tal como lo ves en la vista previa. Es la opción para llevar el texto **con su formato** a Word, LibreOffice, Google Docs, el correo o cualquier otro editor: todos leen el HTML del portapapeles y pegan encabezados, negritas, listas y tablas ya compuestos, sin pasar por ningún archivo. Dos avisos: las fórmulas se pegan como texto, no como ecuaciones —para eso hay que exportar a DOCX u ODT—, y las imágenes solo viajan si están incrustadas en el documento.
* *LaTeX* (`Ctrl+Alt+C 3`): solo el fragmento actual.
* *LaTeX completo* (`Ctrl+Alt+C 4`): incluye cabecera y entorno listos para compilar, con el mismo idioma y título que la exportación a TEX.

El botón recuerda el último formato que elegiste y lo dice en un rótulo pequeño a su lado —`Markdown`, `HTML`, `LaTeX`—, así que copiar otra vez en ese formato es un solo clic, o `Ctrl+Alt+C` seguido de `Intro`. La flecha de al lado abre la lista para cambiarlo.

Cada opción muestra una notificación de éxito y, cuando corresponde, prepara automáticamente el marcado LaTeX a partir de la vista previa renderizada.

---

## Arrastrar y soltar archivos

Arrastra uno o varios archivos sobre la aplicación. Se admiten `.md` y `.markdown`, que se abren tal cual, y `.docx`, `.odt`, `.epub`, `.html` y `.tex`, que se convierten a Markdown con Pandoc antes de abrirse:

* Verás un marco iluminado que confirma que puedes soltarlos.
* Cada archivo se abrirá en su propia pestaña con el nombre original.
* También puedes arrastrar carpetas completas desde el explorador del sistema: se recorren sus subcarpetas y cada archivo compatible se abre en su pestaña, en orden alfabético. Lo que no sea compatible se ignora y, si no hay nada aprovechable, la aplicación te lo advierte.
* El contenido queda disponible sin conexión gracias al autoguardado.

---

## La aplicación de escritorio

Además de la versión web, EdiMarkWeb se instala como programa en **Linux, Windows y macOS**. Es la misma aplicación —los mismos menús, los mismos atajos y los mismos formatos—, así que lo que aprendas en una te sirve en la otra.

### Instalarla

Los instaladores están en la [página de descargas](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest), con uno para cada sistema:

* **Linux**: un paquete `.deb` para Debian, Ubuntu, Mint y derivadas, y una `.AppImage` que se ejecuta sin instalar en cualquier distribución.
* **Windows**: un instalador `.exe` y otro `.msi`, para quien despliegue la aplicación en un aula o un centro.
* **macOS**: una imagen `.dmg` para Mac con procesador Apple y otra para los Mac con Intel.

### Qué añade respecto al navegador

* **Los documentos se abren con doble clic**: la instalación asocia los archivos `.md` y `.markdown`, de modo que se abren en EdiMarkWeb desde el explorador de archivos. Si la aplicación ya está abierta, el documento llega a esa misma ventana en una pestaña nueva.
* **Guardar escribe en el archivo de verdad**: `Ctrl+S` actualiza el documento que abriste, sin pasar por la carpeta de descargas. **Guardar como…** abre el diálogo del sistema para elegir nombre y carpeta.
* **Corrector ortográfico del sistema**: el editor subraya las faltas con los diccionarios instalados en el equipo. En Windows y macOS son los idiomas que ya tengas; en Linux puede hacer falta instalar el diccionario que quieras (por ejemplo, el paquete `hunspell-es`). Puedes apagarlo en **Configuración → Corrector ortográfico**.
* **Funciona sin conexión**: la aplicación lleva dentro todo lo que necesita, incluidos Pandoc y el editor de fórmulas EdiCuaTeX, así que puedes escribir, importar y exportar sin internet. Solo hace falta conexión para comprobar si hay versiones nuevas.
* **Salir**: al final del menú **Archivo**, guarda el documento en curso y cierra la aplicación.

### Mantenerla al día

Al arrancar, la aplicación comprueba una vez al día si hay una versión más reciente. Cuando la hay, aparece un aviso bajo la barra de herramientas con el botón **Descargar e instalar**: baja el instalador que corresponde a tu sistema, muestra el progreso y se lo entrega al instalador del sistema para que termines en un par de clics. Con una AppImage no hay nada que instalar, así que la aplicación descarga la nueva y abre su carpeta para que sustituyas la que tenías. Ningún instalador puede sustituir los archivos de una aplicación abierta, así que en cuanto arranca aparece en el mismo aviso el botón **Cerrar EdiMarkWeb**, que guarda lo que estés escribiendo y cierra: al terminar la instalación, vuelve a abrirla y ya tendrás la versión nueva.

El aviso incluye la casilla **Comprobar al iniciar**, que desactiva esa comprobación automática, y el enlace **Ver novedades** con la lista de cambios. Puedes pedirla cuando quieras desde **Ayuda → Buscar actualizaciones…**; si ya tienes la última versión, te lo dirá en la barra de estado.

### Lo que no cambia

Los documentos que empieces en el navegador y los de la aplicación de escritorio son archivos Markdown corrientes: puedes moverlos de uno a otro sin conversiones. El autoguardado de las pestañas, en cambio, es independiente en cada uno, porque cada versión guarda su copia de trabajo en su propio espacio.

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
| Anidar / desanidar un punto de lista | `Tab` / `Mayús` + `Tab` | `Tab` / `Mayús` + `Tab` |
| Subir un nivel (en un punto vacío) | `Intro` | `Intro` |
| Código | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Enlace | `Ctrl` + `K` | `Cmd` + `K` |
| Imagen | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` |
| Tabla | `Ctrl` + `Shift` + `T` | `Cmd` + `Shift` + `T` |
| Fórmula `$...$` (en línea) | `Ctrl` + `M` luego `1` | `Cmd` + `M` luego `1` |
| Fórmula `$$...$$` (en bloque) | `Ctrl` + `M` luego `2` | `Cmd` + `M` luego `2` |
| Fórmula `\(...\)` (en línea) | `Ctrl` + `M` luego `3` | `Cmd` + `M` luego `3` |
| Fórmula `\[...\]` (en bloque) | `Ctrl` + `M` luego `4` | `Cmd` + `M` luego `4` |
| Deshacer / Rehacer | `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | `Cmd` + `Z` / `Cmd` + `Shift` + `Z` |
| **Gestión de documentos** | | |
| Nueva pestaña | `Ctrl` + `T` | `Cmd` + `T` |
| Cerrar pestaña | `Ctrl` + `W` | `Cmd` + `W` |
| Pestaña siguiente / anterior | `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Shift` + `Tab` |
| Guardar | `Ctrl` + `S` | `Cmd` + `S` |
| Guardar como… | `Ctrl` + `Shift` + `S` | `Cmd` + `Shift` + `S` |
| Abrir archivo | `Ctrl` + `O` | `Cmd` + `O` |
| Importar documento | `Ctrl` + `Alt` + `O` | `Cmd` + `Alt` + `O` |
| Pegar LaTeX (abrir modal) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interfaz** | | |
| Abrir EdiCuaTeX | `Ctrl` + `Alt` + `M` | `Cmd` + `Alt` + `M` |
| Pegar desde el portapapeles | `Ctrl` + `Alt` + `V` | `Cmd` + `Alt` + `V` |
| Abrir Exportar | `Ctrl` + `Alt` + `E` | `Cmd` + `Alt` + `E` |
| Copiar (`1` Markdown · `2` HTML · `3` LaTeX · `4` LaTeX completo) | `Ctrl` + `Alt` + `C` luego `1`–`4` | `Cmd` + `Alt` + `C` luego `1`–`4` |
| Abrir Configuración | `Ctrl` + `,` | `Cmd` + `,` |
| Maximizar área de edición | `Ctrl` + `Shift` + `F` | `Cmd` + `Shift` + `F` |
| Cambiar diseño | `Ctrl` + `L` | `Cmd` + `L` |
| Buscar | `Ctrl` + `F` | `Cmd` + `F` |
| Ampliar / reducir el panel en el que estás | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual de uso | `Ctrl` + `H` o `F1` | `Cmd` + `H` o `F1` |
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
