![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

Benvido/a a EdiMarkWeb, un **editor de textos en Markdown** deseñado para docentes e creadores de contido que precisan traballar rápido, exportar a varios formatos e engadir matemáticas con LaTeX sen complicacións. Podes usalo **no navegador**, sen instalar nada, ou **instalalo como aplicación de escritorio** en Linux, Windows e macOS. Nos dous casos o traballo ocorre no teu equipo: nin os documentos nin as imaxes saen del.

## Novidades destacadas

- Edición dual: podes traballar tanto en Markdown como directamente na vista previa HTML, sempre sincronizadas.
- Menú de exportación e de importación compatible con DOCX, ODT, EPUB, HTML, LaTeX e PDF, incluíndo opcións de copia directa ao portapapeis.
- Buscador con substitución que resalta as coincidencias e acepta termos sen acentos nin distinción entre maiúsculas e minúsculas.
- Menú **Configuración** co idioma, o tamaño da letra, o tema e a xanela independente reunidos nun mesmo sitio; o ancho de traballo cámbiase xunto aos controis dos paneis.
- Tema da interface con tres opcións —Sistema, Claro e Escuro— que se lembra entre sesións.
- Menú de fórmulas renovado e acceso directo a EdiCuaTeX para construír expresións complexas.
- Apertura de varios ficheiros, ou de cartafoles enteiros, arrastrándoos ao editor (cada ficheiro na súa lapela): Markdown e tamén DOCX, ODT, EPUB, HTML ou TEX, que se converten ao voo con Pandoc.
- Busca con expresións regulares e modo de edición a pantalla completa para traballar sen distraccións.
- **Idioma de cada documento**, gardado dentro do propio ficheiro e visible xunto ao contador de caracteres. Os cinco formatos decláranno, así que Word e LibreOffice deixan de corrixir en inglés un texto en galego.
- **Opcións de exportación** nun mesmo sitio: autor, portada do EPUB, índice automático, numeración de apartados e, para LaTeX, a clase, as súas opcións e un preámbulo propio.
- **Aplicación de escritorio** para Linux, Windows e macOS, cos documentos asociados ao dobre clic, gardado sobre o ficheiro orixinal, corrector ortográfico do sistema e funcionamento sen conexión.
- **Aviso de versións novas** na aplicación de escritorio, con descarga e instalación desde a propia aplicación.

## Pega calquera contido

> **Importante:** podes pegar **calquera obxecto desde o portapapeis**: texto plano, fragmentos de Word ou LibreOffice, HTML completo, fórmulas xeradas por un chatbot e mesmo imaxes copiadas directamente. Usa `Ctrl+V`/`Cmd+V` ou o botón da barra de ferramentas coa icona de portapapeis (`Pegar`) e EdiMarkWeb colocará o contido no panel axeitado:

- O texto Markdown ou sen formato insírese no panel esquerdo respectando exactamente a posición do cursor.
- O contido enriquecido (HTML, DOCX, pegado desde o navegador, etc.) vólvese calcular no panel dereito e, ao mesmo tempo, xérase o Markdown correspondente para manter ambas as vistas sincronizadas.

Isto elimina os pasos intermedios: copia desde a túa orixe favorita e fai clic en **Pegar** para seguir editando sen interrupcións.

O botón **Imaxe** tamén permite escoller un ficheiro do disco, ademais de escribir un URL, e pregunta como queres inserilo:

* **Con ruta relativa** (o recomendado e o que vén marcado): o documento só nomea a imaxe —`![Gráfico](imaxes/01.png)`—, que queda onde está. É o que fai calquera editor de Markdown e o que mantén o `.md` lixeiro e lexible; a cambio, o documento e o seu cartafol de imaxes viaxan xuntos.
* **Dentro do documento**: a imaxe incrústase no propio ficheiro, que pasa a ser autónomo pero moito máis pesado. Útil para enviar un `.md` solto por correo.

Na aplicación de escritorio a ruta calcúlase soa desde o cartafol do documento. No navegador non hai forma de coñecer o cartafol da imaxe, así que se escribe só o seu nome e avísase diso.

---

## Xestión de documentos (lapelas)

Traballa con varios documentos á vez, cada un na súa propia lapela.

* **Crear lapelas**: preme o botón `+` (ou `Ctrl+T`) para abrir un documento en branco.
* **Cambiar de lapela**: fai clic no nome para mostrar o seu contido, ou pasa dunha a outra con `Ctrl+Tab`.
* **Renomear**: fai dobre clic sobre o título para poñer un nome máis descritivo (p. ex. «Tema 3 – Ecuacións»).
* **Pechar lapelas**: preme o `X`. Se hai cambios sen gardar, a aplicación amosará un aviso.
* **Cambios sen gardar**: un punto vermello (`●`) indica que hai modificacións pendentes.
* **Gardado automático**: cada lapela garda soa unha copia no equipo, no espazo propio da aplicación; se recargas a páxina ou volves abrir o programa, o contido reaparece. É unha rede de seguridade, non un substituto de gardar o ficheiro.

---

## Barra superior de controis

A cabeceira ten dúas metades. Xunto ao logotipo están os dous menús —**Arquivo** e **Configuración**—, co seu nome escrito e sen icona, como a barra de menús de calquera programa de escritorio. No extremo dereito, as accións sobre o documento que se usan a diario, como botóns dunha soa icona: **Gardar**, **Exportar**, **Imprimir**, **Buscar** e **Axuda**.

* **Gardar (Ctrl+S)**: o primeiro botón da dereita. Cando o documento aberto ten cambios pendentes, aparécelle un punto vermello no canto, o mesmo que marca a lapela.
* **Exportar (Ctrl+Alt+E)**: desprega DOCX, ODT, EPUB, HTML, TEX e PDF.
* **Arquivo**: o que non se fai a diario. `Abrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` e `Pegar LaTeX (Ctrl+Maiús+V)` traen contido; `Gardar como… (Ctrl+Maiús+S)` sácao con outro nome. Cada opción mostra o seu atallo de teclado. Na aplicación de escritorio o menú remata con **Saír**, que garda o documento en curso e pecha a aplicación.
* **Configuración**: agrupa todos os axustes da aplicación, cada un cun submenú que indica o valor activo.
  * **Idioma**: cambia o idioma da interface.
  * **Tamaño do texto**: pequeno, normal, grande ou moi grande.
  * **Tema**: `Sistema` segue o do equipo e cambia con el; `Claro` e `Escuro` fíxano. A elección lémbrase a próxima vez que abras a aplicación.
  * **Xanela independente**: abre EdiMarkWeb nunha xanela propia do navegador, sen lapelas nin barra de enderezos. Só aparece na versión web; a aplicación de escritorio xa é unha xanela propia.
  * **Corrector ortográfico**: subliña as faltas do panel Markdown cos dicionarios instalados no equipo e segue o idioma do documento. Vén activado; ao desmarcalo apágase e a escolla lémbrase.
  * **Opcións de exportación…**: abre os axustes dos ficheiros que xera a aplicación (idioma e, para LaTeX, clase e preámbulo), explicados máis abaixo.
* **Imprimir (Ctrl+P)**: xera unha vista preparada para papel ou PDF cos estilos actuais.
* **Buscar (Ctrl+F)**: abre o buscador avanzado.
* **Axuda**: o botón da interrogación reúne o **Manual de uso (F1)**, **Acerca de EdiMarkWeb** —versión instalada, autor, licenza e licenzas das bibliotecas de terceiros, coas ligazóns á versión web e ás descargas— e, na aplicación de escritorio, **Buscar actualizacións…**.

A disposición dos paneis cámbiase con `Ctrl+L` ou co botón de disposición situado xunto ao botón que maximiza a área de edición. O seu menú permite **Maximizar panel Markdown**, **Maximizar panel de vista previa** ou **Dividir paneis**. En pantallas pequenas, a barra prégase en dous botóns —**Accións** e **Formato**— que mostran cada grupo cando o precisas.

---

## Barra de ferramentas

A franxa gris baixo a barra superior contén accesos rápidos a formato e elementos:

* **Desfacer e refacer**: as dúas frechas do extremo esquerdo (`Ctrl+Z` e `Ctrl+Maiús+Z`).
* **Estilos básicos**: negra, cursiva e un menú de cabeceiras (H1…H6).
* **Listas e citas**: viñetas, numeración e bloques de cita con atallos asociados.
* **Código, ligazóns, imaxes e táboas**: insercións guiadas mediante diálogos.
* **Pegar**: trae ao documento o que haxa no portapapeis, tal e como se explica máis arriba.
* **Fórmulas LaTeX**: menú cos catro delimitadores —`$...$`, `$$...$$`, `\(...\)` e `\[...\]`—, cada un co seu atallo ao lado. Van en acorde: `Ctrl+M` abre a espera —a barra de estado lembra as teclas— e despois `1`, `2`, `3` ou `4` escolle o delimitador; `Intro` ou unha `M` repetida inseren `$...$`, o de sempre, e `Esc` ou calquera outra tecla cancelan. Faise así porque unha combinación distinta para cada delimitador acaba chocando co navegador ou co escritorio: `Ctrl+Maiús+J` é a consola do navegador e `Ctrl+Maiús+M` pode ser a lupa do sistema, e ningún dos dous solta o seu atallo.
* **Editor de fórmulas (EdiCuaTeX)**: abre o asistente integrado con `Ctrl+Alt+M`. Ao aceptar, a fórmula volve inserida no editor.

Cada botón mostra unha descrición ao pasar o rato e indica o atallo de teclado equivalente.

---

## Buscar e substituír

O botón da lupa (ou `Ctrl+F`) abre un panel con busca avanzada:

* O cadro de busca resalta todas as coincidencias, aínda que ignores acentos ou maiúsculas.
* Usa `Enter` para saltar á seguinte coincidencia e `Maiús+Enter` para retroceder.
* Preme a frecha lateral para amosar o panel de substitución. Podes substituír coincidencias unha a unha ou todas á vez (con confirmación).
* O botón **Regex** interpreta o que escribas como unha expresión regular. Neste modo os acentos si contan (as maiúsculas séguense ignorando) e podes usar grupos como `(\d+)`; na substitución recupéranse coas referencias numeradas habituais de JavaScript (o signo de dólar seguido do número de grupo).
* O contador `actual / total` axúdache a seguir o progreso.
* `Esc` pecha o buscador e devolve o foco ao editor.

A busca funciona tanto na vista de Markdown como na vista HTML, segundo onde teñas o foco. Mentres o buscador está aberto, os atallos de formato quedan en pausa para non interferir co que escribas nel.

---

## Interface principal

A zona de traballo divídese en dous paneis redimensionables:

* **Markdown** (esquerda): editor de texto sinxelo cun contador de caracteres, o indicador de idioma do documento e o seu botón de copia. Todo o que escribas aquí reflíctese de inmediato no panel dereito.
* **HTML / Vista previa** (dereita): mostra o resultado final e tamén permite editar o contido directamente. Usa o botón coa icona de código para alternar entre a vista previa rica e o código HTML xerado.
* **Copiar contido**: botóns específicos para copiar o Markdown ou o HTML xerado (inclúe fórmulas convertidas a LaTeX cando copias HTML).

Podes arrastrar a barra central para dar máis espazo a calquera dos paneis, escoller unha das tres disposicións no botón da dereita ou usar a frecha dobre para **maximizar a área de edición**, que agocha as barras superiores e deixa a pantalla para o texto. O botón `+` mantense xusto despois da última lapela.

### Os axustes de cada documento

Xunto ao contador de caracteres hai un botón curto co idioma do documento: `ES`, `CA`, `FR`… Se se ve atenuado, ese documento non ten idioma propio e usa o **idioma xeral** de *Configuración → Opcións de exportación…*, que é o normal.

Ao escoller un idioma concreto, a aplicación gárdao **dentro do propio documento**, de xeito que viaxa co ficheiro: se o gardas e o abres mañá, aquí ou noutro equipo, ou llo pasas a alguén, seguirá sendo ese. Para volver ao anterior, escolle *Idioma xeral*. E con *Outro idioma…* podes escribir o código de calquera lingua (`fr`, `de`, `pt-BR`). Nese mesmo menú, *Autor deste documento…* fai o propio co autor.

No cadro **Este documento** están tamén o **índice automático** e a **numeración dos apartados**, coas mesmas tres posibilidades: *Herdado*, *Si* e *Non*. Son os mesmos axustes de *Opcións de exportación*, pero ditos por este documento, que é onde adoitan decidirse: un manual quere índice numerado e unha nota de dous parágrafos non. Debaixo de cada campo lese o que herda agora mesmo, e un *Non* explícito quítalle o índice a este documento aínda que a opción xeral o pida.

Se algunha vez abres o teu `.md` cun editor de texto plano, verás esa preferencia arriba de todo, nunhas liñas entre raias:

```
---
lang: "ca"
toc: true
---
```

É a forma estándar de gardar datos sobre un documento e enténdena moitos programas. EdiMarkWeb non a mostra na previsualización, porque non é contido, pero si no panel Markdown, que é o código fonte. Podes borrala ou cambiala a man se queres.

#### O formato do texto

No mesmo cadro —que tamén abre o botón dos controis deslizantes do final da barra— fíxanse a **aliñación** (esquerda, xustificada ou dereita), o **tipo de letra** (con serifa, sen serifa, monoespazada ou a que escribas), o **tamaño** en puntos, o **entreliñado**, as **marxes** dos catro lados en centímetros, a **sangría de primeira liña** e a **partición de palabras con guión**.

Ao escoller *Outra…* no tipo de letra aparece o nome da tipografía xusto debaixo, cunha lista de suxestións: as que a aplicación puido recoñecer como instaladas neste equipo (en Chrome e Edge, ademais, *Ver todas as do sistema…* pide permiso e ofrece a lista completa). Podes escribir calquera nome aínda que non estea instalado: o documento gárdao igual, porque o ficheiro pode acabar nun equipo que si a teña. Se aquí non está, avísase en ámbar e a previsualización usa unha tipografía de reserva; ao exportar, o nome viaxa escrito e resólveo cada programa (Word e LibreOffice se a teñen, e en LaTeX só con XeLaTeX ou LuaLaTeX).

O que deixes en *Herdado* segue **Configuración → Opcións de exportación…**, onde están os mesmos axustes como valores de partida para todos os documentos. Debaixo de cada campo vese, en gris, o valor que herda agora mesmo. O que fixes aquí gárdase dentro do propio documento, xunto ao idioma e ao autor, así que viaxa co ficheiro. *Quitar todo do documento* déixao sen nada propio:

```
---
lang: "gl"
align: "justify"
fontsize: "12pt"
margin-left: "3cm"
---
```

Aplícase á previsualización e aos cinco formatos de exportación, con tres salvidades que convén coñecer:

* No **EPUB** as marxes son unha suxestión: quen manda sobre a caixa da páxina é o lector de libros.
* No **TEX**, se o teu preámbulo xa carga `geometry`, mandan as túas marxes: a aplicación avisa de que deixou fóra as do menú en lugar de romper a compilación con dous `\usepackage` iguais.
* A **partición de palabras** usa os dicionarios de guións do sistema. Word en Windows e macOS trae os seus; en Linux, LibreOffice precisa o paquete do idioma (por exemplo, `hyphen-gl`).

### Imaxes con ruta relativa

Un `.md` corrente non leva as imaxes dentro: gárdaas nun cartafol ao lado e noméaas cunha ruta relativa, `imaxes/01.png`. EdiMarkWeb resolve esas rutas e mostra as imaxes na previsualización.

* Na **aplicación de escritorio** non hai que facer nada: ao abrir o documento, as imaxes búscanse no seu cartafol e aparecen.
* No **navegador** ningunha páxina pode ler un cartafol do disco sen permiso. Se o documento nomea imaxes que non se atopan, sobre a previsualización aparece un aviso co botón **Buscar o seu cartafol…**: ao escoller o cartafol do documento, todas as imaxes vense. Abonda con facelo unha vez: EdiMarkWeb garda no navegador as imaxes que usa o documento e recupéraas ao recargar a páxina.
* Arrastrar un cartafol enteiro ao editor abre os seus documentos **e** rexistra as súas imaxes dunha vez.
* Ao **gardar**, as imaxes recuperadas cópianse xunto ao `.md`, conservando rutas como `imaxes/01.png`. No navegador escóllese o cartafol de destino; se o navegador non permite escribir cartafoles, descárgase un ZIP listo para descomprimir. **Gardar como…** fai a mesma copia na aplicación de escritorio.

O Markdown non cambia en ningún momento: o que se garda, se copia ou se exporta segue levando a ruta que escribiches. As imaxes que non se atopan márcanse cun recadro descontinuo en lugar da icona rota do navegador.

### Imaxes incrustadas

Cando un documento leva imaxes en base64 —ao importar un DOCX, ao pegar desde outra aplicación—, o seu código ocupa miles de caracteres e fai ilexible o Markdown. EdiMarkWeb prégaas automaticamente: no editor aparece unha marca curta do tipo `__EDIMARK_B64_1__` e, baixo o panel, unha lista con cada imaxe agochada, o seu formato, o seu tamaño e un botón **Ver código** para consultala ou copiala. O contido real consérvase intacto ao gardar, copiar ou exportar. A lista vén recollida nunha soa liña, co número de imaxes: ao despregala, cada unha amosa a súa miniatura —clic nela para vela a tamaño grande— e a lista queda coa súa propia altura e barra de desprazamento, así que por moitas imaxes que teña o documento nunca lle come sitio ao editor. Lémbrase se a deixaches aberta ou pechada. Cada liña trae ademais un botón **Eliminar**, que quita a imaxe do documento —o código enteiro, non só o marcador— tras pedir confirmación, e **Ver código**, útil se queres copiar o `data:` para pegar esa mesma imaxe noutro documento ou noutra ferramenta.

---

## Vista previa interactiva

* Fai clic no panel dereito para editar directamente sobre o resultado: os cambios sincronízanse co Markdown mantendo o formato sempre que a edición sexa compatible.
* A vista previa admite seleccións, copiar e pegar, así como atallos básicos (Ctrl+B/I, cabeceiras, etc.) igual que o editor de Markdown.
* Mantén premido `Ctrl` (ou `Cmd` en macOS) e fai clic para abrir ligazóns; na aplicación de escritorio ábrense no teu navegador habitual.
* As fórmulas LaTeX represéntanse automaticamente con KaTeX; ao editalas volven á súa sintaxe orixinal.

---

## Accións principais

* **Abrir (`Ctrl+O`)**: importa ficheiros `.md` ou `.markdown`.
* **Importar**: converte a Markdown documentos noutros formatos mediante Pandoc: `.docx`, `.odt`, `.epub`, `.html` e `.tex`. Recupéranse as cabeceiras, as listas, as táboas e as ligazóns, e tamén as imaxes: cando proceden dun `.docx`, `.odt` ou `.epub` extráense do propio ficheiro e quedan incrustadas no Markdown, de xeito que se ven na vista previa e viaxan contigo ao exportar.
* **Gardar (`Ctrl+S`)**: garda o documento actual. Na aplicación de escritorio actualiza o ficheiro xa aberto; **Gardar como… (`Ctrl+Maiús+S`)** sempre permite escoller outro nome ou localización.
* **Copiar contido**: o panel esquerdo inclúe un botón para copiar o Markdown; na vista previa podes elixir que se copiará (HTML representado ou variantes LaTeX) desde o menú despregable xunto á icona de copia.
* **Cambiar tema, disposición ou ancho**: usa **Configuración** para o tema, `Ctrl+L` ou o menú de paneis para a disposición e o botón de ancho (só icona), á dereita da frecha dobre, para ampliar o espazo web.
* **Manual**: dispós deste documento sempre actualizado con `Ctrl+H`.
* **A carpeta lémbrase**: na aplicación de escritorio, o primeiro cadro de abrir ou gardar sae onde diga o sistema, pero a partir de aí todos —abrir, gardar como, exportar, escoller unha imaxe— volven á última carpeta que usaches. Lémbrase só mentres a aplicación está aberta.

---

## Exportar

Abre o botón **Arquivo** e selecciona `Exportar` para descargar versións listas para entregar ou publicar:

* **DOCX (Microsoft Word)**: ideal para compartir con alumnado ou colegas que usan Word, e compatible con Google Docs.
* **ODT (LibreOffice)**: pensado para suites libres como LibreOffice ou OnlyOffice.
* **EPUB (libro dixital)**: crea un libro electrónico compatible con lectores de EPUB 3 (Calibre, Apple Libros, Thorium, tinta electrónica…). O título tómase da primeira cabeceira de nivel 1 (ou do nome do documento), e o autor, a portada e o idioma saen dos axustes que se explican máis abaixo.
* **HTML (páxina web)**: xera un ficheiro autónomo con estilos e fórmulas incrustados, listo para aloxar na web. O título da lapela do navegador tómase do primeiro encabezamento, ou do nome do documento se non o hai.
* **TEX (LaTeX)**: crea un documento `.tex` completo con cabeceira preparada para compilar. Leva o idioma do documento, de xeito que a partición de palabras e os rótulos automáticos saen na túa lingua, e se o documento comeza cun único encabezamento de nivel 1 este pasa a ser o título (`\title` e `\maketitle`) no canto dunha sección máis.
* **PDF**: abre o diálogo de impresión do sistema, onde escolles «Gardar como PDF» como destino. Sae exactamente o que ves na vista previa, coas fórmulas compostas e as marxes do documento, e o texto queda seleccionable e buscable. É o mesmo camiño que o botón **Imprimir (Ctrl+P)**.

Durante a exportación, a barra superior mostra mensaxes de estado (progreso, éxito ou erros).

### Opcións de exportación

**Configuración → Opcións de exportación…** garda preferencias que se reutilizan en cada exportación, tamén a próxima vez que abras a aplicación.

O cadro está repartido en catro lapelas —**Documento**, **Formato**, **EPUB** e **LaTeX**— que tamén se percorren coas frechas do teclado. Na aplicación de escritorio, ademais, estas opcións gárdanse nun ficheiro `settings.json` dentro do cartafol de configuración de EdiMarkWeb no teu perfil de usuario, así que sobreviven a unha limpeza de datos do navegador interno ou a unha reinstalación.

**Idioma do documento**, que se aplica aos cinco formatos. É o que decide en que lingua corrixen a ortografía Word e LibreOffice ao abrir un DOCX ou un ODT, como parte as palabras LaTeX e que idioma declaran o HTML e o EPUB para os lectores de pantalla. Por omisión é **Igual ca a interface**: se cambias o idioma de EdiMarkWeb, os documentos ségueno. Podes fixar calquera dos cinco idiomas da aplicación ou escoller **Outro…** e escribir o seu código (`fr`, `de`, `pt-BR`).

**Autor**, que se garda nas propiedades do ficheiro e aparece como autor do libro no EPUB e na portada do LaTeX. En DOCX e ODT, ademais, Pandoc escribe unha liña co nome ao principio do documento; se non queres que apareza, deixa o campo baleiro. Un documento concreto pode levar outro autor: *Autor deste documento…*, no menú do botón de idioma.

**Portada do EPUB**, con tres posibilidades. De partida, EdiMarkWeb **xera unha** co título e o autor do documento, porque un libro sen imaxe aparece coa icona xenérica no estante do lector. Podes poñer **unha imaxe túa** —ata 1 MB, que para unha portada sobra: gárdase canda os teus documentos, no espazo propio da aplicación— ou deixar o libro **sen portada**. Só afecta ao EPUB.

**Formato do texto**: aliñación, tipo e tamaño de letra, entreliñado, marxes, sangría e partición de palabras, cos valores de partida para todos os documentos. Cada documento pode fixar os seus desde o panel Markdown, e o que non fixe hérdao de aquí.

**Índice automático**, que engade ao principio do documento un índice cos apartados. En DOCX é un índice de Word de verdade e en ODT un nativo de LibreOffice; o EPUB non o precisa, porque o lector xa trae o seu índice de navegación. É o valor de partida: cada documento pode pedilo ou rexeitalo pola súa conta no cadro **Este documento**.

> **Sobre os números de páxina**: en DOCX e ODT o índice é un campo que calcula o procesador de textos, porque hai que maquetar as páxinas para saber en cal cae cada apartado. EdiMarkWeb escríbelle dentro a lista de apartados, así que o documento ábrese co índice á vista, pero sen números. Para que aparezan, actualízao: en Word, clic dereito sobre o índice → *Actualizar campos*; en LibreOffice, *Ferramentas → Actualizar → Índices*.

**Numerar os apartados**, que antepón 1, 1.1, 1.2… aos encabezamentos. Funciona en DOCX, HTML e LaTeX; o ODT non admite esta numeración e sae sen ela. Tamén a pode fixar cada documento.

E tres axustes **só para LaTeX**, que se aplican ao exportar a TEX e ao copiar *LaTeX – documento completo*:

* **Clase de documento**: `article` (a predeterminada), `report` ou `book`.
* **Opcións de clase**: o que vai entre corchetes en `\documentclass`, separado por comas (`12pt, a4paper`).
* **Preámbulo**: os teus paquetes e macros, que se insiren tal cal ao final do preámbulo, xusto antes de `\begin{document}`.

Se o documento comeza cos seus propios metadatos YAML, mandan eles e ningún destes axustes se aplica. E ten en conta que un preámbulo con erros non dará ningún aviso aquí: o fallo aparecerá ao compilar o `.tex`.

---

## Copiar e compartir sen descargar

O botón de copiar está na cabeceira, xunto a **Exportar**: os dous fan o mesmo con distinto destino, un ao ficheiro e outro ao portapapeis. Copia en catro formatos:

* *Markdown* (`Ctrl+Alt+C` e logo `1`): o texto fonte, tal cal está no editor.
* *HTML* (`Ctrl+Alt+C 2`): o documento representado, tal como o ves na vista previa. É a opción para levar o texto **co seu formato** a Word, LibreOffice, Google Docs, o correo ou calquera outro editor: todos len o HTML do portapapeis e pegan encabezamentos, negras, listas e táboas xa compostos, sen pasar por ningún ficheiro. Dous avisos: as fórmulas péganse como texto, non como ecuacións —para iso hai que exportar a DOCX ou ODT—, e as imaxes só viaxan se están incrustadas no documento.
* *LaTeX* (`Ctrl+Alt+C 3`): só o fragmento actual.
* *LaTeX completo* (`Ctrl+Alt+C 4`): inclúe cabeceira e contorno listos para compilar, co mesmo idioma e título ca a exportación a TEX.

O botón lembra o último formato que escolliches e dío nunha etiqueta pequena ao seu carón —`Markdown`, `HTML`, `LaTeX`—, así que copiar outra vez nese formato é un só clic, ou `Ctrl+Alt+C` seguido de `Intro`. A frecha do lado abre a lista para cambialo.

Cada opción mostra unha notificación de éxito e, cando corresponde, prepara automaticamente o marcado LaTeX a partir da vista previa representada.

---

## Arrastrar e soltar ficheiros

Arrastra un ou varios ficheiros sobre a aplicación. Admítense `.md` e `.markdown`, que se abren tal cal, e `.docx`, `.odt`, `.epub`, `.html` e `.tex`, que se converten a Markdown con Pandoc antes de abrirse:

* Verás un marco iluminado que confirma que os podes soltar.
* Cada ficheiro abrirase na súa propia lapela co nome orixinal.
* Tamén podes arrastrar cartafoles completos desde o explorador do sistema: percórrense os seus subcartafoles e cada ficheiro compatible ábrese na súa lapela, por orde alfabética. O que non sexa compatible ignórase e, se non hai nada aproveitable, a aplicación avísache.
* O contido queda dispoñible sen conexión grazas ao gardado automático.

---

## A aplicación de escritorio

Ademais da versión web, EdiMarkWeb instálase como programa en **Linux, Windows e macOS**. É a mesma aplicación —os mesmos menús, os mesmos atallos e os mesmos formatos—, así que o que aprendas nunha valeche na outra.

### Instalala

Os instaladores están na [páxina de descargas](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest), un para cada sistema:

* **Linux**: un paquete `.deb` para Debian, Ubuntu, Mint e derivadas, e unha `.AppImage` que se executa sen instalar en calquera distribución.
* **Windows**: un instalador `.exe` e outro `.msi`, para quen despregue a aplicación nunha aula ou nun centro.
* **macOS**: unha imaxe `.dmg` para os Mac con procesador Apple e outra para os Mac con Intel.

### Que engade respecto ao navegador

* **Os documentos ábrense cun dobre clic**: a instalación asocia os ficheiros `.md` e `.markdown`, de xeito que se abren en EdiMarkWeb desde o xestor de ficheiros. Se a aplicación xa está aberta, o documento chega a esa mesma xanela nunha lapela nova.
* **Gardar escribe no ficheiro de verdade**: `Ctrl+S` actualiza o documento que abriches, sen pasar pola carpeta de descargas. **Gardar como…** abre o diálogo do sistema para escoller nome e cartafol.
* **Corrector ortográfico do sistema**: o editor subliña as faltas cos dicionarios instalados no equipo. En Windows e macOS son os idiomas que xa teñas; en Linux pode ser necesario instalar o dicionario que queiras (por exemplo, o paquete `hunspell-gl`). Podes apagalo en **Configuración → Corrector ortográfico**.
* **Funciona sen conexión**: a aplicación leva dentro todo o que precisa, incluídos Pandoc e o editor de fórmulas EdiCuaTeX, así que podes escribir, importar e exportar sen internet. Só fai falta conexión para comprobar se hai versións novas.
* **Saír**: ao final do menú **Arquivo**, garda o documento en curso e pecha a aplicación.

### Mantela ao día

Ao arrincar, a aplicación comproba unha vez ao día se hai unha versión máis recente. Cando a hai, aparece un aviso baixo a barra de ferramentas co botón **Descargar e instalar**: baixa o instalador que corresponde ao teu sistema, amosa o progreso e entrégallo ao instalador do sistema para que remates nun par de clics. Cunha AppImage non hai nada que instalar, así que a aplicación descarga a nova e abre o seu cartafol para que substitúas a que tiñas. Ningún instalador pode substituír os ficheiros dunha aplicación aberta, así que en canto arranca aparece no mesmo aviso o botón **Pechar EdiMarkWeb**, que garda o que esteas a escribir e pecha: ao rematar a instalación, volve abrila e xa terás a versión nova.

O aviso inclúe a caixa **Comprobar ao iniciar**, que desactiva esa comprobación automática, e a ligazón **Ver novidades** coa lista de cambios. Podes pedila cando queiras desde **Axuda → Buscar actualizacións…**; se xa tes a última versión, dirácho na barra de estado.

### O que non cambia

Os documentos que comeces no navegador e os da aplicación de escritorio son ficheiros Markdown correntes: podes movelos dun a outro sen conversións. O gardado automático das lapelas, en cambio, é independente en cada un, porque cada versión garda a súa copia de traballo no seu propio espazo.

---

## Atallos de teclado

| Acción | Atallo (Windows/Linux) | Atallo (macOS) |
| :--- | :--- | :--- |
| **Formato** | | |
| Negra | `Ctrl` + `B` | `Cmd` + `B` |
| Cursiva | `Ctrl` + `I` | `Cmd` + `I` |
| Cabeceiras 1-6 | `Ctrl` + `1..6` | `Cmd` + `1..6` |
| Lista con viñetas | `Ctrl` + `Maiús` + `L` | `Cmd` + `Maiús` + `L` |
| Lista numerada | `Ctrl` + `Maiús` + `O` | `Cmd` + `Maiús` + `O` |
| Cita | `Ctrl` + `Maiús` + `Q` | `Cmd` + `Maiús` + `Q` |
| Código | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Ligazón | `Ctrl` + `K` | `Cmd` + `K` |
| Imaxe | `Ctrl` + `Maiús` + `I` | `Cmd` + `Maiús` + `I` |
| Táboa | `Ctrl` + `Maiús` + `T` | `Cmd` + `Maiús` + `T` |
| Fórmula `$...$` (en liña) | `Ctrl` + `M` logo `1` | `Cmd` + `M` logo `1` |
| Fórmula `$$...$$` (en bloque) | `Ctrl` + `M` logo `2` | `Cmd` + `M` logo `2` |
| Fórmula `\(...\)` (en liña) | `Ctrl` + `M` logo `3` | `Cmd` + `M` logo `3` |
| Fórmula `\[...\]` (en bloque) | `Ctrl` + `M` logo `4` | `Cmd` + `M` logo `4` |
| Desfacer / Refacer | `Ctrl` + `Z` / `Ctrl` + `Maiús` + `Z` | `Cmd` + `Z` / `Cmd` + `Maiús` + `Z` |
| **Xestión de documentos** | | |
| Nova lapela | `Ctrl` + `T` | `Cmd` + `T` |
| Pechar lapela | `Ctrl` + `W` | `Cmd` + `W` |
| Lapela seguinte / anterior | `Ctrl` + `Tab` / `Ctrl` + `Maiús` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Maiús` + `Tab` |
| Gardar | `Ctrl` + `S` | `Cmd` + `S` |
| Gardar como… | `Ctrl` + `Maiús` + `S` | `Cmd` + `Maiús` + `S` |
| Abrir ficheiro | `Ctrl` + `O` | `Cmd` + `O` |
| Importar documento | `Ctrl` + `Alt` + `O` | `Cmd` + `Alt` + `O` |
| Pegar LaTeX (abrir diálogo) | `Ctrl` + `Maiús` + `V` | `Cmd` + `Maiús` + `V` |
| **Interface** | | |
| Abrir EdiCuaTeX | `Ctrl` + `Alt` + `M` | `Cmd` + `Alt` + `M` |
| Pegar desde o portapapeis | `Ctrl` + `Alt` + `V` | `Cmd` + `Alt` + `V` |
| Abrir Exportar | `Ctrl` + `Alt` + `E` | `Cmd` + `Alt` + `E` |
| Copiar (`1` Markdown · `2` HTML · `3` LaTeX · `4` LaTeX completo) | `Ctrl` + `Alt` + `C` logo `1`–`4` | `Cmd` + `Alt` + `C` logo `1`–`4` |
| Abrir Configuración | `Ctrl` + `,` | `Cmd` + `,` |
| Maximizar área de edición | `Ctrl` + `Maiús` + `F` | `Cmd` + `Maiús` + `F` |
| Cambiar disposición | `Ctrl` + `L` | `Cmd` + `L` |
| Buscar | `Ctrl` + `F` | `Cmd` + `F` |
| Aumentar / reducir o texto | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual de uso | `Ctrl` + `H` ou `F1` | `Cmd` + `H` ou `F1` |
| Recargar o manual | `Ctrl` + `Maiús` + `H` | `Cmd` + `Maiús` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

Os atallos dunha soa letra actúan sobre o documento, así que quedan en pausa mentres o buscador está aberto.

---

## Exemplos de fórmulas con LaTeX

### Fórmula de segundo grao

Para resolver unha ecuación de segundo grao como $ax^2 + bx + c = 0$, utilízase:

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

### Outros delimitadores

Ademais de `$...$` e `$$...$$`, podes usar os delimitadores propios de LaTeX: \(E = mc^2\) en liña, e en bloque:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

### Sumatorios, límites e integrais

A suma dos $n$ primeiros naturais é $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ e a integral $\int_0^1 x^2\,dx = \frac{1}{3}$. O número $e$ defínese como un límite:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### Sistemas de ecuacións

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

### Símbolos soltos

Letras gregas ($\alpha$, $\beta$, $\Omega$), subíndices ($H_2O$), comparacións ($a \neq b$, $x \leq y$) e conxuntos ($\mathbb{R}$, $A \subseteq B$).

Se prefires construílas visualmente, selecciona o texto no editor e abre **EdiCuaTeX**: a fórmula volverá inserida automaticamente.

---

## Ideas para docentes

* **Apuntamentos e resumos**: combina texto con fórmulas e ligazóns para compartilos na túa aula virtual.
* **Exames e exercicios**: exporta a DOCX/ODT para imprimir ou editar posteriormente.
* **Modelos reutilizables**: garda documentos como HTML autónomo para subilos a Moodle, blogs ou GitHub Pages.
* **Traballo do alumnado**: convídaos a redactar en Markdown; co gardado automático non perderán os seus avances.

---

## Licenza e contribucións

EdiMarkWeb é software libre baixo a [GNU Affero General Public License v3.0](LICENSE). Isto significa que podes usar a aplicación na túa aula, adaptala e desplegala en servidores propios, sempre que compartas calquera mellora baixo a mesma licenza e ofrezas o código a quen use a túa versión. Se detectas un problema ou queres propoñer cambios, abre unha incidencia en [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) ou envía un pull request.
