![Logotip d'EdiMarkWeb](logo_100px.png)

# Manual d'EdiMarkWeb

Benvingut/uda a EdiMarkWeb, un **editor de textos en Markdown** dissenyat per a docents i creadors de contingut que necessiten treballar de pressa, exportar a diversos formats i afegir matemàtiques amb LaTeX sense complicacions. Tot funciona directament al navegador i els documents es desen de manera segura al teu equip.

## Novetats destacades

- Edició dual: pots treballar tant en Markdown com directament a la vista prèvia HTML, sempre sincronitzades.
- Menú d'exportació i d'importació compatible amb DOCX, ODT, EPUB, HTML i LaTeX, amb opcions de còpia directa al porta-retalls.
- Cercador amb reemplaçament que ressalta les coincidències i accepta termes sense accents ni distinció entre majúscules i minúscules.
- Menú **Configuració** amb l'idioma, la mida de la lletra, el tema, l'amplada de treball i la finestra independent reunits en un mateix lloc.
- Tema de la interfície amb tres opcions —Sistema, Clar i Fosc— que es recorda entre sessions.
- Menú de fórmules renovat i accés directe a EdiCuaTeX per construir expressions complexes.
- Obertura de diversos fitxers arrossegant-los a l'editor (cadascun en la seva pestanya): Markdown i també DOCX, ODT, EPUB, HTML o TEX, que es converteixen al vol amb Pandoc.

## Enganxa qualsevol contingut

> **Important:** pots enganxar **qualsevol objecte des del porta-retalls**: text pla, fragments del Word o del LibreOffice, HTML complet, fórmules generades per un chatbot i fins i tot imatges copiades directament. Fes servir `Ctrl+V`/`Cmd+V` o el botó de la barra d'eines amb la icona del porta-retalls (`Enganxar`) i EdiMarkWeb col·locarà el contingut al plafó adequat:

- El text Markdown o sense format s'insereix al plafó esquerre respectant exactament la posició del cursor.
- El contingut enriquit (HTML, DOCX, enganxat des del navegador, etc.) es torna a calcular al plafó dret i, alhora, es genera el Markdown corresponent per mantenir les dues vistes sincronitzades.

Això elimina els passos intermedis: copia des del teu origen preferit i fes clic a **Enganxar** per continuar editant sense interrupcions.

## Vídeos

Els vídeos següents, **sense àudio i de reproducció contínua**, mostren algunes accions habituals.

### Copiar directament el contingut del xat

Podem copiar el resultat de qualsevol xat i enganxar-lo a EdiMarkWeb per modificar-lo, desar-lo o exportar-lo. Això ho podem fer amb qualsevol chatbot, excepte amb ChatGPT, que requereix un pas addicional (vegeu més avall).

![Copiar directament el contingut del xat](imagenes/googledocs.gif)

### ChatGPT

ChatGPT ha deixat d'utilitzar LaTeX estàndard, de manera que se li han de demanar les fórmules dins d'una caixa Markdown. Al vídeo també es veu com exportar en DOCX i com pujar-ho a Google Drive:

![ChatGPT i Google](imagenes/chatgpt_google.gif)

### Escriure fórmules a EdiMarkWeb

![Escriure fórmules a EdiMarkWeb](imagenes/formulas.gif)

### LaTeX creat amb Gemini

Quan fem un canvas li podem demanar a Gemini que faci un PDF. Aquest PDF utilitza codi LaTeX que podrem enganxar directament a EdiMarkWeb.

![Escriure fórmules a EdiMarkWeb](imagenes/gemini_pdf.gif)

---

## Gestió de documents (pestanyes)

Treballa amb diversos documents alhora, cadascun a la seva pestanya.

* **Crear pestanyes**: prem el botó `+` (o `Ctrl+T`) per obrir un document en blanc.
* **Canviar de pestanya**: fes clic al nom per mostrar-ne el contingut.
* **Reanomenar**: fes doble clic al títol per posar-hi un nom més descriptiu (p. ex. «Tema 3 – Equacions»).
* **Tancar pestanyes**: prem la `X`. Si hi ha canvis sense desar, l'aplicació t'ho advertirà.
* **Canvis sense desar**: un punt vermell (`●`) indica que hi ha modificacions pendents.
* **Desament automàtic**: cada pestanya desa automàticament una còpia al navegador; si recarregues la pàgina, el contingut reapareixerà.

---

## Barra superior de controls

La barra del costat del logotip agrupa les opcions globals de l'aplicació i concentra totes les accions de fitxer en un únic botó desplegable:

* **Fitxer**: reuneix les accions sobre el document en dos grups. Primer les que hi porten contingut —`Obrir (Ctrl+O)`, `Importar` i `Enganxar LaTeX (Ctrl+Maj+V)`— i després les que el treuen: `Desar (Ctrl+S)` i el submenú **Exportar**, que es desplega a la dreta amb DOCX, ODT, EPUB, HTML i TEX. Cada opció mostra la seva drecera de teclat.
* **Configuració**: agrupa tots els ajustos de l'aplicació, cadascun amb un submenú que n'indica el valor actiu.
  * **Idioma**: canvia l'idioma de la interfície.
  * **Mida del text**: petita, normal, gran o molt gran.
  * **Tema**: `Sistema` segueix el de l'equip i canvia amb ell; `Clar` i `Fosc` el fixen. L'elecció es recorda el pròxim cop que obris l'aplicació.
  * **Amplada ampliada**: eixampla la superfície de treball.
  * **Finestra independent**: obre EdiMarkWeb en una finestra pròpia, a manera d'aplicació d'escriptori.
* **Imprimir (Ctrl+P)**: genera una vista preparada per a paper o PDF amb els estils actuals.
* **Cercar (Ctrl+F)** i **Manual (Ctrl+H)**: obren el cercador avançat o aquest mateix document.
* **Esborrar-ho tot**: buida completament el document actiu després de demanar confirmació.

La disposició dels plafons es canvia amb `Ctrl+L` o amb les fletxes de les capçaleres de cada plafó.

---

## Barra d'eines

La franja grisa sota la barra superior conté accessos ràpids a format i elements:

* **Estils bàsics**: negreta, cursiva i un menú d'encapçalaments (H1…H6).
* **Llistes i cites**: pics, numeració i blocs de cita amb dreceres associades.
* **Codi, enllaços, imatges i taules**: insercions guiades mitjançant diàlegs.
* **Fórmules LaTeX**: menú per inserir ordres en línia o en bloc amb la sintaxi correcta.
* **EdiCuaTeX**: obre l'assistent extern en una finestra nova. En acceptar, la fórmula torna inserida a l'editor.

Cada botó mostra una descripció en passar-hi el ratolí i indica la drecera de teclat equivalent.

---

## Cercar i reemplaçar

El botó de la lupa (o `Ctrl+F`) obre un plafó amb cerca avançada:

* El quadre de cerca ressalta totes les coincidències, encara que ignoris accents o majúscules.
* Fes servir `Enter` per saltar a la coincidència següent i `Maj+Enter` per retrocedir.
* Prem la fletxa lateral per mostrar el plafó de reemplaçament. Pots substituir les coincidències una a una o totes alhora (amb confirmació).
* El comptador `actual / total` t'ajuda a seguir el progrés.

La cerca funciona tant a la vista de Markdown com a la vista HTML, segons on tinguis el focus.

---

## Interfície principal

La zona de treball es divideix en dos plafons redimensionables:

* **Markdown** (esquerra): editor de text amb ressaltat, numeració opcional i controls de còpia. Tot el que hi escriguis es reflecteix immediatament al plafó dret.
* **HTML / Vista prèvia** (dreta): mostra el resultat final i també permet editar el contingut directament. Fes servir el botó amb la icona de codi per alternar entre la vista prèvia rica i el codi HTML generat.
* **Copiar contingut**: botons específics per copiar el Markdown o l'HTML generat (inclou fórmules convertides a LaTeX quan copies HTML).

Pots arrossegar la barra central per donar més espai a qualsevol dels plafons.

---

## Vista prèvia interactiva

* Fes clic al plafó dret per editar directament sobre el resultat: els canvis se sincronitzen amb el Markdown mantenint el format sempre que l'edició sigui compatible.
* La vista prèvia admet seleccions, copiar i enganxar, així com dreceres bàsiques (Ctrl+B/I, encapçalaments, etc.) igual que l'editor de Markdown.
* Mantén premuda la tecla `Ctrl` (o `Cmd` a macOS) i fes clic per obrir enllaços en una pestanya nova del navegador.
* Les fórmules LaTeX es representen automàticament amb KaTeX; en editar-les tornen a la seva sintaxi original.

---

## Accions principals

* **Obrir (`Ctrl+O`)**: importa fitxers `.md` o `.markdown`.
* **Importar**: converteix a Markdown documents en altres formats mitjançant Pandoc: `.docx`, `.odt`, `.epub`, `.html` i `.tex`. Es recuperen els encapçalaments, les llistes, les taules i els enllaços, i també les imatges: quan provenen d'un `.docx`, `.odt` o `.epub` s'extreuen del mateix fitxer i queden incrustades al Markdown, de manera que es veuen a la vista prèvia i viatgen amb tu en exportar.
* **Desar (`Ctrl+S`)**: baixa el document actual al teu equip.
* **Copiar contingut**: el plafó esquerre inclou un botó per copiar el Markdown; a la vista prèvia pots triar què es copiarà (HTML representat o variants LaTeX) des del menú desplegable del costat de la icona de còpia.
* **Esborrar-ho tot**: restableix el document després d'una confirmació.
* **Canviar tema, disposició o amplada**: des del menú **Configuració** (tema i amplada) i amb `Ctrl+L` (disposició dels plafons) adaptes la interfície a cada situació: pissarra digital, portàtil, etc.
* **Manual**: disposes d'aquest document sempre actualitzat amb `Ctrl+H`.

---

## Exportar

Obre el botó **Fitxer** i selecciona `Exportar` per baixar versions llestes per lliurar o publicar:

* **DOCX (Microsoft Word)**: ideal per compartir amb alumnat o companys que fan servir Word, i compatible amb Google Docs.
* **ODT (LibreOffice)**: pensat per a suites lliures com LibreOffice o OnlyOffice.
* **EPUB (llibre digital)**: crea un llibre electrònic compatible amb lectors d'EPUB 3 (Calibre, Apple Llibres, Thorium, tinta electrònica…). El títol es pren del primer encapçalament de nivell 1 (o del nom del document) i l'idioma, del seleccionat a l'aplicació.
* **HTML (pàgina web)**: genera un fitxer autònom amb estils i fórmules incrustats, a punt per allotjar-lo al web.
* **TEX (LaTeX)**: crea un document `.tex` complet amb la capçalera preparada per compilar.

Durant l'exportació, la barra superior mostra missatges d'estat (progrés, èxit o errors).

---

## Copiar i compartir sense baixar

* **Copiar Markdown**: botó directe al plafó esquerre per enviar el text font al porta-retalls.
* **Copiar des de la vista prèvia**: el botó de còpia del plafó dret recorda la teva última elecció entre:
  * *Copiar HTML* (representat tal com el veus).
  * *Copiar LaTeX* (només el fragment actual).
  * *Copiar LaTeX – document complet* (inclou capçalera i entorn a punt per compilar).

Cada opció mostra una notificació d'èxit i, quan escau, prepara automàticament el marcatge LaTeX a partir de la vista prèvia representada.

---

## Arrossegar i deixar anar fitxers

Arrossega un o diversos fitxers sobre l'aplicació. S'admeten `.md` i `.markdown`, que s'obren tal qual, i `.docx`, `.odt`, `.epub`, `.html` i `.tex`, que es converteixen a Markdown amb Pandoc abans d'obrir-se:

* Veuràs un marc il·luminat que confirma que els pots deixar anar.
* Cada fitxer s'obrirà a la seva pestanya amb el nom original.
* El contingut queda disponible fora de línia gràcies al desament automàtic. També pots arrossegar carpetes senceres des del gestor de fitxers; cada fitxer compatible s'obrirà a la seva pestanya.

---

## Dreceres de teclat

| Acció | Drecera (Windows/Linux) | Drecera (macOS) |
| :--- | :--- | :--- |
| **Format** | | |
| Negreta | `Ctrl` + `B` | `Cmd` + `B` |
| Cursiva | `Ctrl` + `I` | `Cmd` + `I` |
| Encapçalaments 1-6 | `Ctrl` + `1..6` | `Cmd` + `1..6` |
| Llista amb pics | `Ctrl` + `Maj` + `L` | `Cmd` + `Maj` + `L` |
| Llista numerada | `Ctrl` + `Maj` + `O` | `Cmd` + `Maj` + `O` |
| Codi | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| **Gestió de documents** | | |
| Pestanya nova | `Ctrl` + `T` | `Cmd` + `T` |
| Tancar pestanya | `Ctrl` + `W` | `Cmd` + `W` |
| Desar | `Ctrl` + `S` | `Cmd` + `S` |
| Obrir fitxer | `Ctrl` + `O` | `Cmd` + `O` |
| Enganxar LaTeX (obrir diàleg) | `Ctrl` + `Maj` + `V` | `Cmd` + `Maj` + `V` |
| **Interfície** | | |
| Canviar disposició | `Ctrl` + `L` | `Cmd` + `L` |
| Cercar | `Ctrl` + `F` | `Cmd` + `F` |
| Manual d'ús | `Ctrl` + `H` | `Cmd` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

---

## Exemples de fórmules amb LaTeX

### Fórmula de segon grau

Per resoldre una equació de segon grau com $ax^2 + bx + c = 0$, s'utilitza:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

### Matriu 2x2

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

Si prefereixes construir-les visualment, selecciona el text a l'editor i obre **EdiCuaTeX**: la fórmula tornarà inserida automàticament.

---

## Idees per a docents

* **Apunts i resums**: combina text amb fórmules i enllaços per compartir-los a la teva aula virtual.
* **Exàmens i exercicis**: exporta a DOCX/ODT per imprimir o editar després.
* **Plantilles reutilitzables**: desa documents com a HTML autònom per pujar-los a Moodle, blogs o GitHub Pages.
* **Treball de l'alumnat**: convida'ls a redactar en Markdown; amb el desament automàtic no perdran els seus avenços.

---

## Llicència i contribucions

EdiMarkWeb és programari lliure sota la [GNU Affero General Public License v3.0](LICENSE). Això vol dir que pots fer servir l'aplicació a la teva aula, adaptar-la i desplegar-la en servidors propis, sempre que comparteixis qualsevol millora sota la mateixa llicència i ofereixis el codi a qui faci servir la teva versió. Si detectes un problema o vols proposar canvis, obre una incidència a [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) o envia un pull request.
