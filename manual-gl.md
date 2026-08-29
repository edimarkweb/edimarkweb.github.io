![Logotipo de EdiMarkWeb](logo_100px.png)

# Manual de EdiMarkWeb

EdiMarkWeb é un **editor de textos en Markdown** pensado para docentes e creadores de contido: escríbese rápido, expórtase a Word, LibreOffice, EPUB, HTML, LaTeX e PDF, e admite fórmulas matemáticas. Funciona **no navegador**, sen instalar nada, e tamén como **aplicación de escritorio** para Linux, Windows e macOS. Nos dous casos o traballo ocorre no teu equipo: nin os documentos nin as imaxes saen del.

## Para comezar

Escribe no panel da esquerda e verás o documento compoñerse á dereita. Non fai falta saber Markdown: os botóns da barra de ferramentas poñen negras, títulos, listas, táboas, ligazóns, imaxes e fórmulas, e funcionan **nos dous paneis**.

Cando remates, tes dous camiños: **Gardar** (`Ctrl+S`) deixa un ficheiro `.md`, que é texto corrente e ábrese en calquera sitio, e **Exportar** xera o DOCX, o PDF ou o formato que precises entregar.

---

## Os dous editores

A zona de traballo divídese en dous paneis redimensionables. **Os dous editan o mesmo documento**, sincronizados en todo momento:

* **Editor Markdown** (esquerda): o código fonte, tal cal. Todo o que escribas aquí aparece no momento no outro panel.
* **Editor visual** (dereita): o documento xa composto, como unha folla sobre unha mesa, e **escríbese directamente sobre el**. A barra de formato traballa tamén aquí: negra, cursiva, títulos, citas, listas, ligazóns, imaxes, táboas e fórmulas aplícanse sobre o que ves e o Markdown reescríbese só. O mesmo botón quita o que puxo, e `Ctrl+Z` desfai aínda que esteas na folla, porque o historial é o do documento. O botón coa icona de código alterna entre o documento composto e o HTML xerado.

**Panel activo**: cos dous á vista, un manda —o que reciben os botóns e a lupa—. Recoñécese polo fío de cor e polo rótulo da barra de estado, que nomea só o panel activo.

**Como repartilos**: arrastra a barra central, ou usa `Ctrl+L` e os tres botóns de disposición —só o editor Markdown, os dous á vez, só o editor visual—. A dobre frecha **maximiza a área de edición**, que agocha as barras e deixa a pantalla para o texto.

**A lupa** da barra de estado (`−`, a porcentaxe e `+`, ou `Ctrl` + `+` / `Ctrl` + `-`) agranda ou reduce o que ves no panel activo; a porcentaxe volve ao 100 %. Agranda a folla enteira, coas súas páxinas e as súas marxes, así que a páxina non se reordena: se deixa de caber no panel, aparece unha barra para percorrela. Non cambia o documento nin o que se exporta ou imprime —o papel sae sempre ao 100 %—: o tamaño de letra está en *Formato do texto*.

**As páxinas**: a folla mide o que mide o papel —A4 ou Carta, o que diga o documento— e o editor visual reparte o texto en páxinas, co seu oco entre unha e outra. O corte cae sempre entre dous bloques, nunca a media liña: o que non colle ao final dunha páxina pasa enteiro á seguinte, como nun procesador de textos. É fiel ao PDF e á impresión, que saen desta mesma folla e cortan por onde corta ela; para Word ou LaTeX é orientativo, porque cada un reparte as liñas á súa maneira. Se a folla non colle enteira —unha xanela estreita, ou os dous paneis á vez—, o reparto retírase ata que volva caber: abonda con baixar a lupa.

### Pegar calquera cousa

Con `Ctrl+V` ou o botón **Pegar**, EdiMarkWeb coloca no panel axeitado o que haxa no portapapeis: o texto plano e o Markdown van ao editor Markdown, na posición do cursor; o contido con formato (Word, LibreOffice, unha páxina web, unha fórmula dun chatbot) e mesmo as imaxes recompóñense no editor visual e xeran o seu Markdown. Non fan falta pasos intermedios: copia de onde sexa e pega.

Con `Ctrl` (ou `Cmd`) premido, un clic nunha ligazón do editor visual ábrea; na aplicación de escritorio, no teu navegador habitual.

---

## Lapelas

Cada documento vive na súa lapela. `Ctrl+T` crea unha; `Ctrl+Tab` pasa dunha a outra e cada unha lembra onde a deixaches. Dobre clic sobre o título para renomeala, o `X` para pechala, e un punto vermello (`●`) avisa de cambios sen gardar.

Todas se **autogardan** soas no equipo: se recargas a páxina ou volves abrir o programa, o contido reaparece. É unha rede de seguridade, non un substituto de gardar o ficheiro.

---

## Menús e barra de ferramentas

Xunto ao logotipo están os menús **Ficheiro**, **Exportar** e **Configuración**. Á dereita, as accións de cada día nunha soa icona: **Gardar**, **Exportar**, **Copiar**, **Imprimir**, **Buscar** e **Axuda**.

* **Ficheiro**: `Abrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` e `Pegar LaTeX (Ctrl+Maiús+V)` traen contido; `Gardar (Ctrl+S)` e `Gardar como… (Ctrl+Maiús+S)` sácano. Na aplicación de escritorio remata con **Saír**, que garda antes de pechar.
* **Exportar (Ctrl+Alt+E)**: os seis formatos, cada un cunha liña que di para que serve.
* **Configuración (Ctrl+,)**: **Idioma** da interface; **Tema** (Sistema, Claro ou Escuro, lémbrase); **Xanela independente**, que abre EdiMarkWeb sen lapelas nin barra de enderezos (só na versión web); **Corrector ortográfico**, que subliña as faltas cos dicionarios do equipo e segue o idioma do documento; e **Opcións de exportación…**.
* **Imprimir (Ctrl+P)**: unha vista lista para papel ou PDF.
* **Axuda**: o **Manual (F1)**, **Acerca de EdiMarkWeb** —versión, autor e licenzas— e, no escritorio, **Buscar actualizacións…**.

A barra de ferramentas, baixo a anterior, reúne desfacer e refacer, negra, cursiva, cabeceiras (H1…H6), listas, citas, código, ligazóns, imaxes, táboas, **Pegar** e as fórmulas. Cada botón di ao pasar o rato que fai e con que atallo. En pantallas pequenas pregase en dous botóns, **Accións** e **Formato**.

---

## Abrir, importar e arrastrar

* **Abrir (`Ctrl+O`)**: ficheiros `.md` e `.markdown`.
* **Importar (`Ctrl+Alt+O`)**: converte a Markdown con Pandoc documentos `.docx`, `.odt`, `.epub`, `.html` e `.tex`, coas súas cabeceiras, listas, táboas, ligazóns e imaxes. Dun `.epub` volve tamén o idioma do libro.
* **Arrastrar e soltar**: solta sobre a aplicación un ou varios ficheiros deses mesmos tipos e cada un ábrese na súa lapela. Tamén cartafoles enteiros: percórrense as súas subcarpetas en orde alfabética e o que non sexa compatible ignórase. Se o documento xa estaba aberto, non se duplica: a aplicación volve á súa lapela.

Na aplicación de escritorio, `Ctrl+S` escribe sobre o ficheiro que abriches; no navegador descárgase. O cartafol que uses lémbrase mentres a aplicación está aberta, así que os seguintes cadros de abrir, gardar ou exportar saen onde estabas.

---

## Imaxes

O botón **Imaxe** admite un ficheiro do disco ou unha URL, e pregunta como inserilo:

* **Con ruta relativa** (o recomendado): o documento só nomea a imaxe —`![Gráfico](imaxes/01.png)`—, que queda no seu cartafol. É o que fai calquera editor de Markdown e mantén o `.md` lixeiro; a cambio, o documento e o seu cartafol de imaxes viaxan xuntos.
* **Dentro do documento**: a imaxe incrústase no ficheiro, que se volve autónomo pero moito máis pesado. Útil para enviar un `.md` solto por correo.

**Rutas relativas.** Na aplicación de escritorio as imaxes búscanse soas no cartafol do documento. No navegador ningunha páxina pode ler un cartafol sen permiso: se faltan imaxes, aparece un aviso co botón **Buscar o seu cartafol…** e, ao elixilo, vense todas. Abonda con facelo unha vez. Ao gardar, esas imaxes cópianse xunto ao `.md` conservando as súas rutas (ou dentro dun ZIP, se o navegador non permite escribir cartafoles). O Markdown nunca cambia: o que gardas, copias ou exportas leva a ruta que escribiches.

**Imaxes incrustadas.** Cando chegan dentro do texto —ao importar un DOCX, ao pegar desde outra aplicación—, o seu código ocupa milleiros de caracteres. EdiMarkWeb prégaas: no editor queda unha marca curta como `__EDIMARK_B64_1__` e, baixo o panel, unha lista coa miniatura, o formato e o tamaño de cada unha, con botóns para **vela**, **ver o seu código** ou **eliminala**. O contido real consérvase intacto ao gardar, copiar e exportar.

O botón **Pasar as imaxes ao cartafol**, nesa mesma lista, fai o camiño de volta: cada imaxe convértese nun ficheiro dentro dun cartafol co nome do documento (`o-meu-ficheiro.md` → `o-meu-ficheiro/`) e no Markdown queda a súa ruta. Os ficheiros escríbense ao gardar, e `Ctrl+Z` desfai o cambio.

---

## Fórmulas matemáticas

As fórmulas escríbense en LaTeX e compóñense no momento con KaTeX. Hai tres maneiras de poñelas:

* **Menú de fórmulas** (no editor Markdown): `Ctrl+M` abre a espera —a barra de estado lembra as teclas— e despois `1`, `2`, `3` ou `4` elixe o delimitador (`$...$`, `$$...$$`, `\(...\)` ou `\[...\]`); `Intro` insire `$...$` e `Esc` cancela.
* **Xanela de fórmula** (no editor visual): o botón `{}` —ou `Ctrl+M`, que aquí non pregunta polos delimitadores— abre unha xanela co código LaTeX e o resultado á vista mentres escribes, co aviso do erro se o hai. Aí elixes se vai en liña ou en bloque e con que delimitadores. Faise así porque sobre a folla non hai onde escribir dentro dun `$…$` baleiro: KaTeX convérteo en fórmula en canto se repinta.
* **EdiCuaTeX (`Ctrl+Alt+M`)**: o editor visual de fórmulas integrado, para construílas co rato. Ao aceptar, a fórmula volve inserida.

### Exemplos de fórmulas con LaTeX

#### Fórmula de segundo grao

Para resolver unha ecuación de segundo grao como $ax^2 + bx + c = 0$, utilízase:

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

#### Outros delimitadores

Ademais de `$...$` e `$$...$$`, podes usar os delimitadores propios de LaTeX: \(E = mc^2\) en liña, e en bloque:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

#### Sumatorios, límites e integrais

A suma dos $n$ primeiros naturais é $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ e a integral $\int_0^1 x^2\,dx = \frac{1}{3}$. O número $e$ defínese como un límite:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

#### Sistemas de ecuacións

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### Símbolos soltos

Letras gregas ($\alpha$, $\beta$, $\Omega$), subíndices ($H_2O$), comparacións ($a \neq b$, $x \leq y$) e conxuntos ($\mathbb{R}$, $A \subseteq B$).

---

## Buscar e substituír

A lupa (ou `Ctrl+F`) abre o buscador, que traballa no panel onde esteas:

* Resalta todas as coincidencias aínda que escribas sen acentos ou en minúsculas. `Intro` salta á seguinte e `Maiús+Intro` retrocede; o contador `actual / total` di por onde vas.
* A frecha lateral desprega a substitución, unha a unha ou todas de golpe (con confirmación).
* O botón **Regex** interpreta a busca como expresión regular: aí os acentos si contan e podes usar grupos como `(\d+)`, que na substitución se recuperan co signo de dólar e o número de grupo.
* `Esc` péchao e devolve o foco ao editor. Mentres está aberto, os atallos de formato quedan en pausa.

---

## Os axustes de cada documento

Xunto ao contador de caracteres, na barra de estado, hai un botón curto, sempre á vista, co idioma no que vai saír o documento (`GL`, `ES`, `FR`…). Se se ve atenuado, ese documento non ten idioma propio e segue o xeral. Ao premelo ábrese o cadro **Este documento**, con dúas lapelas:

* **Documento**: idioma, autor, índice automático e numeración de apartados. O **idioma** é importante: viaxa dentro do ficheiro e é o que fai que Word e LibreOffice deixen de corrixir en inglés un texto en galego. Con *Outro…* podes escribir o código de calquera lingua (`fr`, `de`, `pt-BR`) e con *Herdado* vólvese ao xeral. Co índice posto, o editor visual amósao ao principio da folla —os apartados co seu número de páxina, sacados do reparto que estás vendo—, sen que forme parte do texto: non se pode escribir nel e non chega ao Markdown nin ao que copies. O de verdade xérao cada formato ao exportar.
* **Formato**: aliñación, tipo e tamaño de letra, interliñado, tamaño de papel, marxes, sangría de primeira liña e partición de palabras con guión. Ao elixir *Outra…* no tipo de letra aparece unha lista coas tipografías que a aplicación recoñece instaladas; podes escribir calquera nome aínda que aquí non estea —avísase en ámbar e úsase unha de reserva—, porque o ficheiro pode acabar nun equipo que si a teña. Debaixo de cada campo lese o que herda agora mesmo, e o que non herda nada dio tamén: aí manda o programa que abra o ficheiro.

Unha pastilla na barra de estado resume como vai saír o documento: o tamaño de letra, o tipo e o interliñado, os tres sempre. Se algunha vez baleiras un nas opcións xerais, un guión (`—`) avisa de que aí manda o programa que abra o ficheiro. O resto —aliñación, sangría, partición e marxes— lese ao pasar o rato, e ao premela ábrese este mesmo cadro pola súa lapela **Formato**.

Todo o que fixes gárdase **dentro do propio `.md`**, nunhas liñas entre raias ao principio do ficheiro:

```
---
lang: "gl"
toc: true
align: "justify"
fontsize: "12pt"
---
```

É a forma estándar de gardar datos sobre un documento e enténdena moitos programas. Aparece no editor Markdown, que é o código fonte, pero non no editor visual, porque non é contido. O que deixes en *Herdado* segue **Configuración → Opcións de exportación…**, e o propio cadro leva unha ligazón, *Cambiar o que herdan todos os documentos…*, que abre esas opcións pola mesma lapela. *Quitar todo do documento* déixao sen nada propio.

O formato aplícase ao editor visual e aos cinco formatos de exportación, con tres salvidades: no **EPUB** as marxes son unha suxestión, porque manda o lector de libros; en **TEX**, se o teu preámbulo xa carga `geometry`, mandan as túas marxes e a aplicación avisa; e a **partición de palabras** usa os dicionarios de guións do sistema (en Linux, LibreOffice precisa o paquete do idioma, por exemplo `hyphen-gl`).

---

## Exportar

**Exportar (Ctrl+Alt+E)** xera o documento listo para entregar ou publicar:

* **DOCX (Word)**: para compartir con quen usa Word; tamén o abre Google Docs.
* **ODT (LibreOffice)**: para suites libres como LibreOffice ou OnlyOffice.
* **EPUB (libro dixital)**: compatible con lectores de EPUB 3. O título sae da primeira cabeceira de nivel 1 (ou do nome do documento) e o autor, a portada e o idioma, dos axustes.
* **HTML (páxina web)**: un ficheiro autónomo cos estilos e as fórmulas dentro, listo para subir á web.
* **TEX (LaTeX)**: un `.tex` completo coa cabeceira preparada para compilar.
* **PDF**: abre o diálogo de impresión, onde elixes «Gardar como PDF». Sae exactamente o que ves, coas fórmulas compostas e o texto seleccionable. As marxes son as do documento; se non leva ningunha, 18 mm.

Na barra hai tamén un botón de exportar coa súa frecha, xunto ao de copiar: o botón repite dun clic o último formato que usaches —dío nun rótulo pequeno, e de partida é DOCX— e a frecha abre esta mesma lista.

### Opcións de exportación

**Configuración → Opcións de exportación…** garda os valores de partida para todos os documentos, e lémbranse dunha sesión a outra. Ten catro lapelas:

* **Documento**: **idioma** (por omisión, o mesmo da interface), **autor** —que aparece nas propiedades do ficheiro e na portada do EPUB e do LaTeX; déixao baleiro se non queres que Pandoc escriba a liña do nome en DOCX e ODT—, **índice automático** e **numerar os apartados** (1, 1.1, 1.2…; o ODT non admite esa numeración).
* **Formato**: os mesmos axustes de texto do apartado anterior, como valores de partida. Catro veñen postos —**12 pt**, **con remates**, interliñado **1,5** e papel **A4**—, porque son os que o editor visual precisa para amosar a verdade: declarados, o que se ve na folla é o que sae nos cinco formatos. Os demais saen sen fixar.
* **EPUB**: a **portada**, que pode ser a que **xera** a aplicación co título e o autor, **unha imaxe túa** (ata 1 MB) ou **ningunha**.
* **LaTeX**: a **clase** (`article`, `report` ou `book`), as súas **opcións** (`12pt, a4paper`) e un **preámbulo** propio, que se insire xusto antes de `\begin{document}`. Un preámbulo con erros non avisa aquí: o fallo aparece ao compilar.

> **Sobre o índice**: en DOCX e ODT é un campo que calcula o procesador de textos, así que o documento ábrese coa lista de apartados pero sen números de páxina. Para que saian, actualízao: en Word, clic dereito sobre o índice → *Actualizar campos*; en LibreOffice, *Ferramentas → Actualizar → Índices*.

Se o documento comeza cos seus propios metadatos YAML, mandan eles.

---

## Copiar sen descargar

O botón de copiar, xunto a **Exportar**, fai o mesmo pero ao portapapeis, en catro formatos:

* *Markdown* (`Ctrl+Alt+C` e logo `1`): o texto fonte tal cal.
* *HTML* (`Ctrl+Alt+C 2`): o documento composto. É a opción para levar o texto **co seu formato** a Word, LibreOffice, Google Docs ou o correo, sen pasar por ningún ficheiro. Dous avisos: as fórmulas péganse como texto —para ecuacións de verdade, exporta a DOCX ou ODT— e as imaxes só viaxan se están incrustadas.
* *LaTeX* (`Ctrl+Alt+C 3`): só o fragmento actual.
* *LaTeX completo* (`Ctrl+Alt+C 4`): con cabeceira e contorno listos para compilar.

O botón lembra o último formato e dio nun rótulo ao seu carón, así que repetir é un clic; a frecha abre a lista para cambialo.

---

## A aplicación de escritorio

É a mesma aplicación —os mesmos menús, atallos e formatos— instalada en **Linux, Windows e macOS**. Os instaladores están na [páxina de descargas](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest): `.deb` e `.AppImage` para Linux, `.exe` e `.msi` para Windows, e `.dmg` para Mac con procesador Apple ou Intel.

Fronte ao navegador engade:

* **Dobre clic para abrir**: os ficheiros `.md` e `.markdown` quedan asociados, amosan a icona de EdiMarkWeb no xestor de ficheiros e ábrense na aplicación; se xa está aberta, o documento chega a esa mesma xanela, que se pon diante. E se ese ficheiro xa estaba aberto, volve á súa lapela en vez de duplicarse. (A icona instálana o paquete `.deb` e os instaladores de Windows; a AppImage non toca o sistema.)
* **Gardar escribe no ficheiro de verdade**, sen pasar polo cartafol de descargas.
* **Corrector ortográfico do sistema**, cos dicionarios do equipo (en Linux pode facer falta instalalos, por exemplo `hunspell-gl`).
* **Funciona sen conexión**: leva dentro Pandoc e EdiCuaTeX. Só fai falta internet para comprobar se hai versións novas.

**Actualizacións**: ao arrincar comproba unha vez ao día se hai versión nova e, se a hai, aparece un aviso con **Descargar e instalar**, que baixa o instalador e láncao. Como ningún instalador pode substituír os ficheiros dunha aplicación aberta, o mesmo aviso trae **Pechar EdiMarkWeb**, que garda e pecha. Cunha AppImage, a aplicación descarga a nova e abre o seu cartafol para que substitúas a anterior. Podes pedir a comprobación cando queiras desde **Axuda → Buscar actualizacións…**, ou desactivala coa caixa **Comprobar ao iniciar**.

Os documentos son os mesmos ficheiros Markdown nas dúas versións e pasan dunha a outra sen conversións; o que non se comparte é o autogardado, porque cada versión garda a súa copia de traballo no seu propio espazo.

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
| Aniñar / desaniñar un punto de lista | `Tab` / `Maiús` + `Tab` | `Tab` / `Maiús` + `Tab` |
| Subir un nivel (nun punto baleiro) | `Intro` | `Intro` |
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
| Ampliar / reducir o panel no que estás | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual de uso | `Ctrl` + `H` ou `F1` | `Cmd` + `H` ou `F1` |
| Recargar o manual | `Ctrl` + `Maiús` + `H` | `Cmd` + `Maiús` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

Os atallos dunha soa letra actúan sobre o documento, así que quedan en pausa mentres o buscador está aberto.

---

## Licenza e contribucións

EdiMarkWeb é software libre baixo a [GNU Affero General Public License v3.0](LICENSE): podes usalo na túa aula, adaptalo e despregalo en servidores propios, sempre que compartas calquera mellora baixo a mesma licenza e ofrezas o código a quen use a túa versión. Se detectas un problema ou queres propoñer cambios, abre unha incidencia en [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) ou envía un pull request.
