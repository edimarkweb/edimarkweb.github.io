![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

EdiMarkWeb es un **editor de textos en Markdown** pensado para docentes y creadores de contenido: se escribe rápido, se exporta a Word, LibreOffice, EPUB, HTML, LaTeX y PDF, y admite fórmulas matemáticas. Funciona **en el navegador**, sin instalar nada, y también como **aplicación de escritorio** para Linux, Windows y macOS. En los dos casos el trabajo ocurre en tu equipo: ni los documentos ni las imágenes salen de él.

## Para empezar

Escribe en el panel de la izquierda y verás el documento componerse a la derecha. No hace falta saber Markdown: los botones de la barra de herramientas ponen negritas, títulos, listas, tablas, enlaces, imágenes y fórmulas, y funcionan **en los dos paneles**.

Cuando termines, tienes dos caminos: **Guardar** (`Ctrl+S`) deja un archivo `.md`, que es texto corriente y se abre en cualquier sitio, y **Exportar** genera el DOCX, el PDF o el formato que necesites entregar.

---

## Los dos editores

La zona de trabajo se divide en dos paneles redimensionables. **Los dos editan el mismo documento**, sincronizados en todo momento:

* **Editor Markdown** (izquierda): el código fuente, tal cual. Todo lo que escribas aquí aparece al momento en el otro panel.
* **Editor visual** (derecha): el documento ya compuesto, como una hoja sobre una mesa, y **se escribe directamente sobre él**. La barra de formato trabaja también aquí: negrita, cursiva, títulos, citas, listas, enlaces, imágenes, tablas y fórmulas se aplican sobre lo que ves y el Markdown se reescribe solo. El mismo botón quita lo que puso, y `Ctrl+Z` deshace aunque estés en la hoja, porque el historial es el del documento. El botón con el icono de código alterna entre el documento compuesto y el HTML generado.

**Panel activo**: con los dos a la vista, uno manda —el que reciben los botones y la lupa—. Se reconoce por el filo de color y por el rótulo de la barra de estado, que nombra solo el panel activo.

**Cómo repartirlos**: arrastra la barra central, o usa `Ctrl+L` y los tres botones de disposición —solo el editor Markdown, los dos a la vez, solo el editor visual—. La doble flecha **maximiza el área de edición**, que oculta las barras y deja la pantalla para el texto.

**La lupa** de la barra de estado (`−`, el porcentaje y `+`, o `Ctrl` + `+` / `Ctrl` + `-`) agranda o reduce lo que ves en el panel activo. Agranda la hoja entera, con sus páginas y sus márgenes, así que la página no se reordena. No cambia el documento ni lo que se exporta o imprime —el papel sale siempre al 100 %—: el tamaño de letra está en *Formato del texto*.

**El panel atado a la lupa** (el interruptor con la cadena, a la izquierda de la lupa) mantiene la página siempre entera, y trabaja en los dos sentidos: si mueves el separador, el aumento se recalcula para que la hoja siga cabiendo —el porcentaje va entonces en azul y subrayado, porque lo pone él y no tú—; si tocas la lupa, es el separador el que se aparta para dejar sitio a la hoja. Así no aparece la barra de desplazamiento horizontal, y el reparto en páginas se conserva siempre.

Viene puesto. Se para donde el editor Markdown se quedaría sin su ancho mínimo: al llegar ahí el `+` se apaga y lo dice al pasar el ratón por encima. Para ampliar más allá, suelta el interruptor —la cadena se abre y se vuelve ámbar— o deja el editor visual solo (`Ctrl` + `L`), que da todo el ancho.

La hoja llena el panel, no solo cabe en él: si le haces sitio al editor visual, la página se ve más grande y el aumento pasa del 100 % —hasta el 200 %, que es donde llega la lupa—. El 100 % es el tamaño real del papel, el que va a salir impreso, y lo tienes a un clic en el porcentaje del centro; para que se quede fijo, suelta el interruptor.

Todo esto es cosa de los dos paneles a la vez, que es donde el ancho de uno se lo quita al otro. Con un solo panel a la vista, o en una pantalla estrecha donde van uno encima del otro, el interruptor se retira y la lupa es libre.

**Las páginas**: la hoja mide lo que mide el papel —A4 o Carta, lo que diga el documento— y el editor visual reparte el texto en páginas, con su hueco entre una y otra. El corte cae siempre entre dos bloques, nunca a media línea: lo que no cabe al final de una página pasa entera a la siguiente, como en un procesador de textos. Es fiel al PDF y a la impresión, que salen de esta misma hoja y cortan por donde corta ella; para Word o LaTeX es orientativo, porque cada uno reparte las líneas a su manera. Con el panel atado a la lupa el reparto se conserva siempre; solo se retira si sueltas el interruptor y pones un aumento con el que la hoja no quepa en el panel.

### Pegar cualquier cosa

Con `Ctrl+V` o el botón **Pegar**, EdiMarkWeb coloca en el panel adecuado lo que haya en el portapapeles: texto plano y Markdown van al editor Markdown, en la posición del cursor; el contenido con formato (Word, LibreOffice, una página web, una fórmula de un chatbot) e incluso las imágenes se recomponen en el editor visual y generan su Markdown. No hacen falta pasos intermedios: copia de donde sea y pega.

Con `Ctrl` (o `Cmd`) pulsado, un clic en un enlace del editor visual lo abre; en la aplicación de escritorio, en tu navegador habitual.

---

## Pestañas

Cada documento vive en su pestaña. `Ctrl+T` crea una; `Ctrl+Tab` pasa de una a otra y cada una recuerda dónde la dejaste. Doble clic sobre el título para renombrarla, la `X` para cerrarla, y un punto rojo (`●`) avisa de cambios sin guardar.

Todas se **autoguardan** solas en el equipo: si recargas la página o vuelves a abrir el programa, el contenido reaparece. Es una red de seguridad, no un sustituto de guardar el archivo.

---

## Menús y barra de herramientas

Junto al logotipo están los menús **Archivo**, **Exportar** y **Configuración**. A la derecha, las acciones de cada día en un solo icono: **Guardar**, **Exportar**, **Copiar**, **Imprimir**, **Buscar** y **Ayuda**.

* **Archivo**: `Abrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` y `Pegar LaTeX (Ctrl+Mayús+V)` traen contenido; `Guardar (Ctrl+S)` y `Guardar como… (Ctrl+Mayús+S)` lo sacan. En la aplicación de escritorio termina con **Salir**, que guarda antes de cerrar.
* **Exportar (Ctrl+Alt+E)**: los seis formatos, cada uno con una línea que dice para qué sirve.
* **Configuración (Ctrl+,)**: **Idioma** de la interfaz; **Tema** (Sistema, Claro u Oscuro, se recuerda); **Ventana independiente**, que abre EdiMarkWeb sin pestañas ni barra de direcciones (solo en la versión web); **Corrector ortográfico**, que subraya las faltas con los diccionarios del equipo y sigue el idioma del documento; y **Opciones generales…**.
* **Imprimir (Ctrl+P)**: una vista lista para papel o PDF.
* **Ayuda**: el **Manual (F1)**, **Acerca de EdiMarkWeb** —versión, autor y licencias— y, en escritorio, **Buscar actualizaciones…**.

La barra de herramientas, bajo la anterior, reúne deshacer y rehacer, negrita, cursiva, encabezados (H1…H6), listas, citas, código, enlaces, imágenes, tablas, **citas bibliográficas**, **Pegar** y las fórmulas. Cada botón dice al pasar el ratón qué hace y con qué atajo. En pantallas pequeñas se pliega en dos botones, **Acciones** y **Formato**.

---

## Abrir, importar y arrastrar

* **Abrir (`Ctrl+O`)**: archivos `.md` y `.markdown`.
* **Importar (`Ctrl+Alt+O`)**: convierte a Markdown con Pandoc documentos `.docx`, `.odt`, `.epub`, `.html` y `.tex`, con sus encabezados, listas, tablas, enlaces e imágenes. De un `.epub` vuelve además el idioma del libro.
* **Arrastrar y soltar**: suelta sobre la aplicación uno o varios archivos de esos mismos tipos y cada uno se abre en su pestaña. También carpetas enteras: se recorren sus subcarpetas en orden alfabético y lo que no sea compatible se ignora. Si el documento ya estaba abierto, no se duplica: la aplicación vuelve a su pestaña.

En la aplicación de escritorio, `Ctrl+S` escribe sobre el archivo que abriste; en el navegador se descarga. La carpeta que uses se recuerda mientras la aplicación esté abierta, así que los siguientes cuadros de abrir, guardar o exportar salen donde estabas.

---

## Imágenes

El botón **Imagen** admite un archivo del disco o una URL, y pregunta cómo insertarlo:

* **Con ruta relativa** (lo recomendado): el documento solo nombra la imagen —`![Gráfico](imagenes/01.png)`—, que se queda en su carpeta. Es lo que hace cualquier editor de Markdown y mantiene el `.md` ligero; a cambio, el documento y su carpeta de imágenes viajan juntos.
* **Dentro del documento**: la imagen se incrusta en el archivo, que se vuelve autónomo pero mucho más pesado. Útil para enviar un `.md` suelto por correo.

**Rutas relativas.** En la aplicación de escritorio las imágenes se buscan solas en la carpeta del documento. En el navegador ninguna página puede leer una carpeta sin permiso: si faltan imágenes, aparece un aviso con el botón **Buscar su carpeta…** y, al elegirla, se ven todas. Basta hacerlo una vez. Al guardar, esas imágenes se copian junto al `.md` conservando sus rutas (o dentro de un ZIP, si el navegador no deja escribir carpetas). El Markdown nunca cambia: lo que guardas, copias o exportas lleva la ruta que escribiste.

**Gestor de imágenes.** Bajo el editor Markdown, una lista reúne las imágenes del documento. Todas pueden **verse**, **reemplazarse** por otra pegada desde el portapapeles, elegida del disco o indicada mediante una URL, y **eliminarse del documento**. Las enlazadas muestran su ruta o URL y también pueden **incrustarse** en Base64; eliminar la referencia no borra el archivo original ni la imagen remota. En las imágenes en línea, la conversión depende de que el servidor permita descargarlas; si la bloquea, el documento no cambia. Las que ya están incrustadas muestran su formato y tamaño y permiten ver o copiar su código.

El código Base64 ocupa miles de caracteres, por lo que EdiMarkWeb lo pliega y deja en el editor una marca corta como `__EDIMARK_B64_1__`; el contenido real se conserva intacto al guardar, copiar y exportar. El botón **Pasar las incrustadas a la carpeta** hace el camino de vuelta: cada imagen se convierte en un archivo dentro de la subcarpeta de recursos del documento (`mi-archivo.md` → `mi-archivo/images/`) y en el Markdown queda su ruta. Los archivos se escriben al guardar, y `Ctrl+Z` deshace el cambio.

---

## Fórmulas matemáticas

Las fórmulas se escriben en LaTeX y se componen al momento con KaTeX. Hay tres maneras de ponerlas:

* **Menú de fórmulas** (en el editor Markdown): `Ctrl+M` abre la espera —la barra de estado recuerda las teclas— y después `1`, `2`, `3` o `4` elige el delimitador (`$...$`, `$$...$$`, `\(...\)` o `\[...\]`); `Intro` inserta `$...$` y `Esc` cancela.
* **Ventana de fórmula** (en el editor visual): el botón `{}` —o `Ctrl+M`, que aquí no pregunta por delimitadores— abre una ventana con el código LaTeX y el resultado a la vista mientras escribes, con el aviso del error si lo hay. Ahí eliges si va en línea o en bloque y con qué delimitadores. Se hace así porque sobre la hoja no hay dónde escribir dentro de un `$…$` vacío: KaTeX lo convierte en fórmula en cuanto se repinta.
* **EdiCuaTeX (`Ctrl+Alt+M`)**: el editor visual de fórmulas integrado, para construirlas a golpe de ratón. Al aceptar, la fórmula vuelve insertada.

### Ejemplos de fórmulas con LaTeX

#### Fórmula de segundo grado

Para resolver una ecuación de segundo grado como $ax^2 + bx + c = 0$, se utiliza:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

#### Matriz 2x2

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

#### Otros delimitadores

Además de `$...$` y `$$...$$`, puedes usar los delimitadores propios de LaTeX: \(E = mc^2\) en línea, y en bloque:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

#### Sumatorios, límites e integrales

La suma de los $n$ primeros naturales es $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ y la integral $\int_0^1 x^2\,dx = \frac{1}{3}$. El número $e$ se define como un límite:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

#### Sistemas de ecuaciones

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### Símbolos sueltos

Letras griegas ($\alpha$, $\beta$, $\Omega$), subíndices ($H_2O$), comparaciones ($a \neq b$, $x \leq y$) y conjuntos ($\mathbb{R}$, $A \subseteq B$).

---

## Citas y bibliografía

En **Configuración → Opciones generales… → Citas** puedes cargar una biblioteca **BibTeX** (`.bib`) o **CSL JSON** (`.json`). Si solo quieres probar la función, **Cargar bibliografía de ejemplo** prepara siete referencias completas; si ya tenías bibliografía, se suman a la tuya sin sustituirla. Con **Añadir referencia…** puedes ampliar la biblioteca cargada —incluida la de ejemplo— o crear una nueva. La clave de cita es opcional: si la dejas vacía, el programa compone una con el apellido, el año y una palabra del título, y se asegura de que no coincida con otra. Admite artículos, libros, capítulos, informes, páginas web, tesis y comunicaciones, con los campos específicos necesarios para componer correctamente las referencias finales. **APA 7** es el estilo inicial; también puedes elegir Chicago autor-fecha, MLA 9, IEEE o cargar un archivo **CSL** (`.csl`) propio. También se puede cambiar el título de la bibliografía y su nivel H1–H6. Los archivos no se envían a ningún servicio.

El botón del libro —o `Ctrl+Alt+B`— abre un buscador por autor, título, año o clave, con **Añadir referencia manualmente** siempre a mano para escribir una nueva sin salir del cuadro. Al pie del cuadro se lee con qué estilo se van a componer las citas —APA, Chicago, MLA, IEEE o el CSL que hayas cargado— y un enlace lleva a las opciones de la bibliografía para cambiarlo. La forma **parentética** produce `[@garcia2024]`; la **narrativa**, `@garcia2024`; y **solo año**, `[-@garcia2024]`, para escribir el nombre en la frase sin repetirlo. Con una sola referencia puedes añadir páginas u otro localizador, por ejemplo `[@garcia2024, p. 5]` o `@garcia2024 [pp. 5–7]`. Las citas múltiples usan la forma parentética. Si el cursor está dentro de una cita, el mismo botón permite editar todos estos datos. La bibliografía final se muestra al pie de la vista previa y se reproduce al exportar.

Al guardar `mi-archivo.md`, EdiMarkWeb copia la biblioteca a `mi-archivo/references.bib` —o `references.json`— y declara esa ruta en los metadatos YAML. Las imágenes propias se agrupan en `mi-archivo/images/`. Para trasladar el trabajo basta con conservar juntos el Markdown y su carpeta `mi-archivo`. La aplicación de escritorio recupera la biblioteca automáticamente; por seguridad, en la versión web hay que pulsar **Vincular carpeta de recursos…** y elegir `mi-archivo` al abrirlo en otro navegador u ordenador. El estilo CSL personalizado continúa siendo una preferencia local del dispositivo.

---

## Buscar y reemplazar

La lupa (o `Ctrl+F`) abre el buscador, que trabaja en el panel donde estés:

* Resalta todas las coincidencias aunque escribas sin tildes o en minúsculas. `Enter` salta a la siguiente y `Mayús+Enter` retrocede; el contador `actual / total` dice por dónde vas.
* La flecha lateral despliega el reemplazo, una a una o todas de golpe (con confirmación).
* El botón **Regex** interpreta la búsqueda como expresión regular: ahí las tildes sí cuentan y puedes usar grupos como `(\d+)`, que en el reemplazo se recuperan con el signo de dólar y el número de grupo.
* `Esc` cierra y devuelve el foco al editor. Mientras está abierto, los atajos de formato quedan en pausa.

---

## Los ajustes de cada documento

Junto al contador de caracteres, en la barra de estado, hay un botón corto, siempre a la vista, con el idioma en el que va a salir el documento (`ES`, `CA`, `FR`…). Si se ve atenuado, ese documento no tiene idioma propio y sigue el general. Al pulsarlo se abre el cuadro **Este documento**, con dos pestañas:

* **Documento**: idioma, autor, índice automático y numeración de apartados. El **idioma** es importante: viaja dentro del archivo y es lo que hace que Word y LibreOffice dejen de corregir en inglés un texto en castellano. Con *Otro…* puedes escribir el código de cualquier lengua (`fr`, `de`, `pt-BR`) y con *Heredado* se vuelve al general. Con el índice puesto, el editor visual lo enseña al principio de la hoja —los apartados con su número de página, sacados del reparto que estás viendo—, sin que forme parte del texto: no se puede escribir en él y no llega al Markdown ni a lo que copies. El de verdad lo genera cada formato al exportar.
* **Formato**: alineación, tipo y tamaño de letra, interlineado, tamaño de papel, márgenes, sangría de primera línea y partición de palabras con guion. Al elegir *Otra…* en el tipo de letra aparece una lista con las tipografías que la aplicación reconoce instaladas; puedes escribir cualquier nombre aunque aquí no esté —se avisa en ámbar y se usa una de reserva—, porque el archivo puede acabar en un equipo que sí la tenga. Debajo de cada campo se lee lo que hereda ahora mismo, y el que no hereda nada lo dice también: ahí manda el programa que abra el archivo.

Una pastilla en la barra de estado resume cómo va a salir el documento: el tamaño de letra, el tipo y el interlineado, los tres siempre. Si alguna vez vacías uno en las opciones generales, un guion (`—`) avisa de que ahí manda el programa que abra el archivo. El resto —alineación, sangría, partición y márgenes— se lee al pasar el ratón, y al pulsarla se abre este mismo cuadro por su pestaña **Formato**.

Todo lo que fijes se guarda **dentro del propio `.md`**, en unas líneas entre rayas al principio del archivo:

```
---
lang: "ca"
toc: true
align: "justify"
fontsize: "12pt"
---
```

Es la forma estándar de guardar datos sobre un documento y la entienden muchos programas. Aparece en el editor Markdown, que es el código fuente, pero no en el editor visual, porque no es contenido. Lo que dejes en *Heredado* sigue a **Configuración → Opciones generales…**, y el propio cuadro lleva un enlace, *Editar las opciones generales…*, que abre esas opciones por la misma pestaña. *Quitar todo del documento* lo deja sin nada propio.

El formato se aplica al editor visual y a los cinco formatos de exportación, con tres salvedades: en el **EPUB** los márgenes son una sugerencia, porque manda el lector de libros; en **TEX**, si tu preámbulo ya carga `geometry`, mandan tus márgenes y la aplicación avisa; y la **partición de palabras** usa los diccionarios de guiones del sistema (en Linux, LibreOffice necesita el paquete del idioma, por ejemplo `hyphen-es`).

---

## Exportar

**Exportar (Ctrl+Alt+E)** genera el documento listo para entregar o publicar:

* **DOCX (Word)**: para compartir con quien usa Word; también lo abre Google Docs.
* **ODT (LibreOffice)**: para suites libres como LibreOffice u OnlyOffice.
* **EPUB (libro digital)**: compatible con lectores de EPUB 3. El título sale del primer encabezado de nivel 1 (o del nombre del documento) y el autor, la portada y el idioma, de los ajustes.
* **HTML (página web)**: un archivo autónomo con los estilos y las fórmulas dentro, listo para subir a la web.
* **TEX (LaTeX)**: un `.tex` completo con la cabecera preparada para compilar.
* **PDF**: abre el diálogo de impresión, donde eliges «Guardar como PDF». Sale exactamente lo que ves, con las fórmulas compuestas y el texto seleccionable. Los márgenes son los del documento; si no lleva ninguno, 18 mm.

En la barra hay además un botón de exportar con su flecha, junto al de copiar: el botón repite de un clic el último formato que usaste —lo dice en un rótulo pequeño, y de partida es DOCX— y la flecha abre esta misma lista.

Si has cargado una bibliografía, todos los formatos resuelven las citas `[@clave]` y añaden la lista de referencias con el estilo CSL elegido.

### Opciones generales de los documentos

**Configuración → Opciones generales…** guarda los valores de partida para todos los documentos, y se recuerdan de una sesión a otra. Tiene cinco pestañas:

* **Datos e índice**: **idioma** (por omisión, el mismo de la interfaz), **autor** —que aparece en las propiedades del archivo y en la portada del EPUB y del LaTeX; déjalo vacío si no quieres que Pandoc escriba la línea del nombre en DOCX y ODT—, **índice automático** y **numerar los apartados** (1, 1.1, 1.2…; el ODT no admite esa numeración).
* **Texto y página**: los mismos ajustes de texto y página de la sección anterior, como valores de partida. Cuatro vienen puestos —**12 pt**, **con remates**, interlineado **1,5** y papel **A4**—, porque son los que la vista previa necesita para enseñar la verdad: declarados, lo que se ve en la hoja es lo que sale en los cinco formatos. Los demás salen sin fijar.
* **EPUB**: la **portada**, que puede ser la que **genera** la aplicación con el título y el autor, **una imagen tuya** (hasta 1 MB) o **ninguna**.
* **Citas**: la biblioteca BibTeX o CSL JSON y, opcionalmente, el estilo CSL que se aplicará al exportar.
* **LaTeX**: la **clase** (`article`, `report` o `book`), sus **opciones** (`12pt, a4paper`) y un **preámbulo** propio, que se inserta justo antes de `\begin{document}`. Un preámbulo con errores no avisa aquí: el fallo aparece al compilar.

> **Sobre el índice**: en DOCX y ODT es un campo que calcula el procesador de textos, así que el documento se abre con la lista de apartados pero sin números de página. Para que salgan, actualízalo: en Word, clic derecho sobre el índice → *Actualizar campos*; en LibreOffice, *Herramientas → Actualizar → Índices*.

La profundidad permite limitarlo a H1, H1–H2 o H1–H3. En **Texto y página** también puedes elegir orientación vertical u horizontal y hacer que cada H1, salvo el primero, empiece en una página nueva; la vista previa y las exportaciones respetan los tres ajustes.

Si el documento empieza con sus propios metadatos YAML, mandan ellos.

---

## Copiar sin descargar

El botón de copiar, junto a **Exportar**, hace lo mismo pero al portapapeles, en cuatro formatos:

* *Markdown* (`Ctrl+Alt+C` y luego `1`): el texto fuente tal cual.
* *HTML* (`Ctrl+Alt+C 2`): el documento compuesto. Es la opción para llevar el texto **con su formato** a Word, LibreOffice, Google Docs o el correo, sin pasar por ningún archivo. Dos avisos: las fórmulas se pegan como texto —para ecuaciones de verdad, exporta a DOCX u ODT— y las imágenes solo viajan si están incrustadas.
* *LaTeX* (`Ctrl+Alt+C 3`): solo el fragmento actual.
* *LaTeX completo* (`Ctrl+Alt+C 4`): con cabecera y entorno listos para compilar.

El botón recuerda el último formato y lo dice en un rótulo a su lado, así que repetir es un clic; la flecha abre la lista para cambiarlo.

---

## La aplicación de escritorio

Es la misma aplicación —los mismos menús, atajos y formatos— instalada en **Linux, Windows y macOS**. Los instaladores están en la [página de descargas](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest): `.deb` y `.AppImage` para Linux, `.exe` y `.msi` para Windows, y `.dmg` para Mac con procesador Apple o Intel.

Frente al navegador añade:

* **Doble clic para abrir**: los archivos `.md` y `.markdown` quedan asociados, muestran el icono de EdiMarkWeb en el explorador de archivos y se abren en la aplicación; si ya está abierta, el documento llega a esa misma ventana, que se pone delante. Y si ese archivo ya estaba abierto, vuelve a su pestaña en vez de duplicarse. (El icono lo instalan el paquete `.deb` y los instaladores de Windows; la AppImage no toca el sistema.)
* **Guardar escribe en el archivo de verdad**, sin pasar por la carpeta de descargas.
* **Corrector ortográfico del sistema**, con los diccionarios del equipo (en Linux puede hacer falta instalarlos, por ejemplo `hunspell-es`).
* **Funciona sin conexión**: lleva dentro Pandoc y EdiCuaTeX. Solo hace falta internet para comprobar si hay versiones nuevas.

**Actualizaciones**: al arrancar comprueba una vez al día si hay versión nueva y, si la hay, aparece un aviso con **Descargar e instalar**, que baja el instalador y lo lanza. Como ningún instalador puede sustituir los archivos de una aplicación abierta, el mismo aviso trae **Cerrar EdiMarkWeb**, que guarda y cierra. Con una AppImage, la aplicación descarga la nueva y abre su carpeta para que sustituyas la anterior. Puedes pedir la comprobación cuando quieras desde **Ayuda → Buscar actualizaciones…**, o desactivarla con la casilla **Comprobar al iniciar**.

Los documentos son los mismos archivos Markdown en las dos versiones y pasan de una a otra sin conversiones; lo que no se comparte es el autoguardado, porque cada versión guarda su copia de trabajo en su propio espacio.

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

## Licencia y contribuciones

EdiMarkWeb es software libre bajo la [GNU Affero General Public License v3.0](LICENSE): puedes usarlo en tu aula, adaptarlo y desplegarlo en servidores propios, siempre que compartas cualquier mejora bajo la misma licencia y ofrezcas el código a quienes usen tu versión. Si detectas un problema o quieres proponer cambios, abre una incidencia en [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) o envía un pull request.
