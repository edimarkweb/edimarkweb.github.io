![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

Benvido/a a EdiMarkWeb, un **editor de textos en Markdown** deseñado para docentes e creadores de contido que precisan traballar rápido, exportar a varios formatos e engadir matemáticas con LaTeX sen complicacións. Todo funciona directamente no navegador e os documentos gárdanse de forma segura no teu equipo.

## Novidades destacadas

- Edición dual: podes traballar tanto en Markdown como directamente na vista previa HTML, sempre sincronizadas.
- Menú de exportación e de importación compatible con DOCX, ODT, EPUB, HTML e LaTeX, incluíndo opcións de copia directa ao portapapeis.
- Buscador con substitución que resalta as coincidencias e acepta termos sen acentos nin distinción entre maiúsculas e minúsculas.
- Menú **Configuración** co idioma, o tamaño da letra, o tema, o ancho de traballo e a xanela independente reunidos nun mesmo sitio.
- Tema da interface con tres opcións —Sistema, Claro e Escuro— que se lembra entre sesións.
- Menú de fórmulas renovado e acceso directo a EdiCuaTeX para construír expresións complexas.
- Apertura de varios ficheiros arrastrándoos ao editor (cada un na súa lapela): Markdown e tamén DOCX, ODT, EPUB, HTML ou TEX, que se converten ao voo con Pandoc.

## Pega calquera contido

> **Importante:** podes pegar **calquera obxecto desde o portapapeis**: texto plano, fragmentos de Word ou LibreOffice, HTML completo, fórmulas xeradas por un chatbot e mesmo imaxes copiadas directamente. Usa `Ctrl+V`/`Cmd+V` ou o botón da barra de ferramentas coa icona de portapapeis (`Pegar`) e EdiMarkWeb colocará o contido no panel axeitado:

- O texto Markdown ou sen formato insírese no panel esquerdo respectando exactamente a posición do cursor.
- O contido enriquecido (HTML, DOCX, pegado desde o navegador, etc.) vólvese calcular no panel dereito e, ao mesmo tempo, xérase o Markdown correspondente para manter ambas as vistas sincronizadas.

Isto elimina os pasos intermedios: copia desde a túa orixe favorita e fai clic en **Pegar** para seguir editando sen interrupcións.

## Vídeos

Os seguintes vídeos, **sen audio e de reprodución continua**, mostran algunhas accións comúns.

### Copiar directamente o contido do chat

Podemos copiar o resultado de calquera chat e pegalo en EdiMarkWeb para modificar, gardar ou exportar. Isto podémolo facer con calquera chatbot, agás con ChatGPT, que require un paso adicional (ver abaixo).

![Copiar directamente o contido do chat](imagenes/googledocs.gif)

### ChatGPT

ChatGPT deixou de utilizar LaTeX estándar, polo que hai que pedirlle as fórmulas nunha caixa Markdown. Ademais, no vídeo aparece como exportar en DOCX e como subir a Google Drive:

![ChatGPT e Google](imagenes/chatgpt_google.gif)

### Escribir fórmulas en EdiMarkWeb

![Escribir fórmulas en EdiMarkWeb](imagenes/formulas.gif)

### LaTeX creado con Gemini

Cando facemos un canvas podémoslle pedir a Gemini que faga un PDF. Este PDF utiliza código LaTeX que poderemos pegar directamente en EdiMarkWeb.

![Escribir fórmulas en EdiMarkWeb](imagenes/gemini_pdf.gif)

---

## Xestión de documentos (lapelas)

Traballa con varios documentos á vez, cada un na súa propia lapela.

* **Crear lapelas**: preme o botón `+` (ou `Ctrl+T`) para abrir un documento en branco.
* **Cambiar de lapela**: fai clic no nome para mostrar o seu contido.
* **Renomear**: fai dobre clic sobre o título para poñer un nome máis descritivo (p. ex. «Tema 3 – Ecuacións»).
* **Pechar lapelas**: preme o `X`. Se hai cambios sen gardar, a aplicación amosará un aviso.
* **Cambios sen gardar**: un punto vermello (`●`) indica que hai modificacións pendentes.
* **Gardado automático**: cada lapela garda automaticamente unha copia no teu navegador; se recargas a páxina, o contido reaparecerá.

---

## Barra superior de controis

A barra xunto ao logotipo agrupa as opcións globais da aplicación e concentra todas as accións de ficheiro nun único botón despregable:

* **Arquivo**: reúne as accións sobre o documento en dous grupos. Primeiro as que traen contido —`Abrir (Ctrl+O)`, `Importar` e `Pegar LaTeX (Ctrl+Maiús+V)`— e despois as que o sacan: `Gardar (Ctrl+S)` e o submenú **Exportar**, que se desprega á dereita con DOCX, ODT, EPUB, HTML e TEX. Cada opción mostra o seu atallo de teclado.
* **Configuración**: agrupa todos os axustes da aplicación, cada un cun submenú que indica o valor activo.
  * **Idioma**: cambia o idioma da interface.
  * **Tamaño do texto**: pequeno, normal, grande ou moi grande.
  * **Tema**: `Sistema` segue o do equipo e cambia con el; `Claro` e `Escuro` fíxano. A elección lémbrase a próxima vez que abras a aplicación.
  * **Ancho expandido**: amplía a superficie de traballo.
  * **Xanela independente**: abre EdiMarkWeb nunha xanela propia, a xeito de aplicación de escritorio.
* **Imprimir (Ctrl+P)**: xera unha vista preparada para papel ou PDF cos estilos actuais.
* **Buscar (Ctrl+F)** e **Manual (Ctrl+H)**: abren o buscador avanzado ou este mesmo documento.
* **Borrar todo**: limpa por completo o documento activo tras pedir confirmación.

A disposición dos paneis cámbiase con `Ctrl+L` ou coas frechas das cabeceiras de cada panel.

---

## Barra de ferramentas

A franxa gris baixo a barra superior contén accesos rápidos a formato e elementos:

* **Estilos básicos**: negra, cursiva e un menú de cabeceiras (H1…H6).
* **Listas e citas**: viñetas, numeración e bloques de cita con atallos asociados.
* **Código, ligazóns, imaxes e táboas**: insercións guiadas mediante diálogos.
* **Fórmulas LaTeX**: menú para inserir ordes en liña ou en bloque coa sintaxe correcta.
* **EdiCuaTeX**: abre o asistente externo nunha xanela nova. Ao aceptar, a fórmula volve inserida no editor.

Cada botón mostra unha descrición ao pasar o rato e indica o atallo de teclado equivalente.

---

## Buscar e substituír

O botón da lupa (ou `Ctrl+F`) abre un panel con busca avanzada:

* O cadro de busca resalta todas as coincidencias, aínda que ignores acentos ou maiúsculas.
* Usa `Enter` para saltar á seguinte coincidencia e `Maiús+Enter` para retroceder.
* Preme a frecha lateral para amosar o panel de substitución. Podes substituír coincidencias unha a unha ou todas á vez (con confirmación).
* O contador `actual / total` axúdache a seguir o progreso.

A busca funciona tanto na vista de Markdown como na vista HTML, segundo onde teñas o foco.

---

## Interface principal

A zona de traballo divídese en dous paneis redimensionables:

* **Markdown** (esquerda): editor de texto con resaltado, numeración opcional e controis de copia. Todo o que escribas aquí reflíctese de inmediato no panel dereito.
* **HTML / Vista previa** (dereita): mostra o resultado final e tamén permite editar o contido directamente. Usa o botón coa icona de código para alternar entre a vista previa rica e o código HTML xerado.
* **Copiar contido**: botóns específicos para copiar o Markdown ou o HTML xerado (inclúe fórmulas convertidas a LaTeX cando copias HTML).

Podes arrastrar a barra central para dar máis espazo a calquera dos paneis.

---

## Vista previa interactiva

* Fai clic no panel dereito para editar directamente sobre o resultado: os cambios sincronízanse co Markdown mantendo o formato sempre que a edición sexa compatible.
* A vista previa admite seleccións, copiar e pegar, así como atallos básicos (Ctrl+B/I, cabeceiras, etc.) igual que o editor de Markdown.
* Mantén premido `Ctrl` (ou `Cmd` en macOS) e fai clic para abrir ligazóns nunha lapela nova do navegador.
* As fórmulas LaTeX represéntanse automaticamente con KaTeX; ao editalas volven á súa sintaxe orixinal.

---

## Accións principais

* **Abrir (`Ctrl+O`)**: importa ficheiros `.md` ou `.markdown`.
* **Importar**: converte a Markdown documentos noutros formatos mediante Pandoc: `.docx`, `.odt`, `.epub`, `.html` e `.tex`. Recupéranse as cabeceiras, as listas, as táboas e as ligazóns, e tamén as imaxes: cando proceden dun `.docx`, `.odt` ou `.epub` extráense do propio ficheiro e quedan incrustadas no Markdown, de xeito que se ven na vista previa e viaxan contigo ao exportar.
* **Gardar (`Ctrl+S`)**: descarga o documento actual no teu equipo.
* **Copiar contido**: o panel esquerdo inclúe un botón para copiar o Markdown; na vista previa podes elixir que se copiará (HTML representado ou variantes LaTeX) desde o menú despregable xunto á icona de copia.
* **Borrar todo**: restablece o documento tras unha confirmación.
* **Cambiar tema, disposición ou ancho**: desde o menú **Configuración** (tema e ancho) e con `Ctrl+L` (disposición dos paneis) adaptas a interface a cada situación: encerado dixital, portátil, etc.
* **Manual**: dispós deste documento sempre actualizado con `Ctrl+H`.

---

## Exportar

Abre o botón **Arquivo** e selecciona `Exportar` para descargar versións listas para entregar ou publicar:

* **DOCX (Microsoft Word)**: ideal para compartir con alumnado ou colegas que usan Word, e compatible con Google Docs.
* **ODT (LibreOffice)**: pensado para suites libres como LibreOffice ou OnlyOffice.
* **EPUB (libro dixital)**: crea un libro electrónico compatible con lectores de EPUB 3 (Calibre, Apple Libros, Thorium, tinta electrónica…). O título tómase da primeira cabeceira de nivel 1 (ou do nome do documento) e o idioma, do seleccionado na aplicación.
* **HTML (páxina web)**: xera un ficheiro autónomo con estilos e fórmulas incrustados, listo para aloxar na web.
* **TEX (LaTeX)**: crea un documento `.tex` completo con cabeceira preparada para compilar.

Durante a exportación, a barra superior mostra mensaxes de estado (progreso, éxito ou erros).

---

## Copiar e compartir sen descargar

* **Copiar Markdown**: botón directo no panel esquerdo para enviar o texto fonte ao portapapeis.
* **Copiar desde a vista previa**: o botón de copia do panel dereito lembra a túa última elección entre:
  * *Copiar HTML* (representado tal como o ves).
  * *Copiar LaTeX* (só o fragmento actual).
  * *Copiar LaTeX – documento completo* (inclúe cabeceira e contorno listos para compilar).

Cada opción mostra unha notificación de éxito e, cando corresponde, prepara automaticamente o marcado LaTeX a partir da vista previa representada.

---

## Arrastrar e soltar ficheiros

Arrastra un ou varios ficheiros sobre a aplicación. Admítense `.md` e `.markdown`, que se abren tal cal, e `.docx`, `.odt`, `.epub`, `.html` e `.tex`, que se converten a Markdown con Pandoc antes de abrirse:

* Verás un marco iluminado que confirma que os podes soltar.
* Cada ficheiro abrirase na súa propia lapela co nome orixinal.
* O contido queda dispoñible sen conexión grazas ao gardado automático. Tamén podes arrastrar cartafoles completos desde o explorador do sistema; cada ficheiro compatible abrirase na súa propia lapela.

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
| Código | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| **Xestión de documentos** | | |
| Nova lapela | `Ctrl` + `T` | `Cmd` + `T` |
| Pechar lapela | `Ctrl` + `W` | `Cmd` + `W` |
| Gardar | `Ctrl` + `S` | `Cmd` + `S` |
| Abrir ficheiro | `Ctrl` + `O` | `Cmd` + `O` |
| Pegar LaTeX (abrir diálogo) | `Ctrl` + `Maiús` + `V` | `Cmd` + `Maiús` + `V` |
| **Interface** | | |
| Cambiar disposición | `Ctrl` + `L` | `Cmd` + `L` |
| Buscar | `Ctrl` + `F` | `Cmd` + `F` |
| Manual de uso | `Ctrl` + `H` | `Cmd` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

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
