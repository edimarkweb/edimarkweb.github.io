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
- Obertura de diversos fitxers, o de carpetes senceres, arrossegant-los a l'editor (cada fitxer en la seva pestanya): Markdown i també DOCX, ODT, EPUB, HTML o TEX, que es converteixen al vol amb Pandoc.
- Cerca amb expressions regulars i mode d'edició a pantalla completa per treballar sense distraccions.
- **Idioma de cada document**, desat dins del fitxer mateix i visible al costat del comptador de caràcters. Els cinc formats el declaren, de manera que el Word i el LibreOffice deixen de corregir en anglès un text en català.
- **Ajustos del document exportat** en un mateix lloc: autor, portada de l'EPUB, índex automàtic, numeració d'apartats i, per al LaTeX, la classe, les seves opcions i un preàmbul propi.

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
* **Canviar de pestanya**: fes clic al nom per mostrar-ne el contingut, o passa d'una a l'altra amb `Ctrl+Tab`.
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
  * **Document exportat…**: obre els ajustos dels fitxers que genera l'aplicació (idioma i, per al LaTeX, classe i preàmbul), explicats més avall.
* **Imprimir (Ctrl+P)**: genera una vista preparada per a paper o PDF amb els estils actuals.
* **Cercar (Ctrl+F)** i **Manual (Ctrl+H)**: obren el cercador avançat o aquest mateix document.
* **Esborrar-ho tot**: buida completament el document actiu després de demanar confirmació.

La disposició dels plafons es canvia amb `Ctrl+L` o amb les fletxes de les capçaleres de cada plafó. En pantalles petites, la barra es plega en dos botons —**Accions** i **Format**— que mostren cada grup quan el necessites.

---

## Barra d'eines

La franja grisa sota la barra superior conté accessos ràpids a format i elements:

* **Desfer i refer**: les dues fletxes de l'extrem esquerre (`Ctrl+Z` i `Ctrl+Maj+Z`).
* **Estils bàsics**: negreta, cursiva i un menú d'encapçalaments (H1…H6).
* **Llistes i cites**: pics, numeració i blocs de cita amb dreceres associades.
* **Codi, enllaços, imatges i taules**: insercions guiades mitjançant diàlegs.
* **Enganxar**: porta al document el que hi hagi al porta-retalls, tal com s'explica més amunt.
* **Fórmules LaTeX**: menú per inserir ordres en línia o en bloc amb la sintaxi correcta.
* **Editor de fórmules (EdiCuaTeX)**: obre l'assistent extern en una finestra nova. En acceptar, la fórmula torna inserida a l'editor.

Cada botó mostra una descripció en passar-hi el ratolí i indica la drecera de teclat equivalent.

---

## Cercar i reemplaçar

El botó de la lupa (o `Ctrl+F`) obre un plafó amb cerca avançada:

* El quadre de cerca ressalta totes les coincidències, encara que ignoris accents o majúscules.
* Fes servir `Enter` per saltar a la coincidència següent i `Maj+Enter` per retrocedir.
* Prem la fletxa lateral per mostrar el plafó de reemplaçament. Pots substituir les coincidències una a una o totes alhora (amb confirmació).
* El botó **Regex** interpreta el que escriguis com una expressió regular. En aquest mode els accents sí que compten (les majúscules se segueixen ignorant) i pots fer servir grups com ara `(\d+)`; al reemplaçament es recuperen amb les referències numerades habituals de JavaScript (el signe de dòlar seguit del número de grup).
* El comptador `actual / total` t'ajuda a seguir el progrés.
* `Esc` tanca el cercador i retorna el focus a l'editor.

La cerca funciona tant a la vista de Markdown com a la vista HTML, segons on tinguis el focus. Mentre el cercador és obert, les dreceres de format queden en pausa per no interferir amb el que hi escriguis.

---

## Interfície principal

La zona de treball es divideix en dos plafons redimensionables:

* **Markdown** (esquerra): editor de text senzill amb un comptador de caràcters, l'indicador d'idioma del document i el seu botó de còpia. Tot el que hi escriguis es reflecteix immediatament al plafó dret.
* **HTML / Vista prèvia** (dreta): mostra el resultat final i també permet editar el contingut directament. Fes servir el botó amb la icona de codi per alternar entre la vista prèvia rica i el codi HTML generat.
* **Copiar contingut**: botons específics per copiar el Markdown o l'HTML generat (inclou fórmules convertides a LaTeX quan copies HTML).

Pots arrossegar la barra central per donar més espai a qualsevol dels plafons, maximitzar-ne un amb les fletxes de la seva capçalera o fer servir el botó de la dreta de les pestanyes per **maximitzar l'àrea d'edició**, que amaga les barres superiors i deixa la pantalla per al text.

### L'idioma de cada document

Al costat del comptador de caràcters hi ha un botó curt amb l'idioma del document: `ES`, `CA`, `FR`… Si es veu atenuat, aquest document no té idioma propi i fa servir l'**idioma general** de *Configuració → Document exportat…*, que és el més habitual.

En triar un idioma concret, l'aplicació el desa **dins del document mateix**, de manera que viatja amb el fitxer: si el deses i l'obres demà, aquí o en un altre equip, o l'hi passes a algú, continuarà sent aquell. Per tornar enrere, tria *Idioma general*. I amb *Un altre idioma…* pots escriure el codi de qualsevol llengua (`fr`, `de`, `pt-BR`). En aquest mateix menú, *Autor d'aquest document…* fa el mateix amb l'autor.

Si algun dia obres el teu `.md` amb un editor de text pla, veuràs aquesta preferència a dalt de tot, en unes línies entre ratlles:

```
---
lang: "ca"
---
```

És la manera estàndard de desar dades sobre un document i molts programes l'entenen. EdiMarkWeb no la mostra a la vista prèvia, perquè no és contingut, però sí al plafó Markdown, que és el codi font. Pots esborrar-la o canviar-la a mà si vols.

### Imatges incrustades

Quan un document porta imatges en base64 —en importar un DOCX, en enganxar des d'una altra aplicació—, el seu codi ocupa milers de caràcters i fa il·legible el Markdown. EdiMarkWeb les plega automàticament: a l'editor apareix una marca curta del tipus `__EDIMARK_B64_1__` i, sota el plafó, una llista amb cada imatge amagada, el seu format, la seva mida i un botó **Veure codi** per consultar-la o copiar-la. El contingut real es conserva intacte en desar, copiar o exportar.

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
* **EPUB (llibre digital)**: crea un llibre electrònic compatible amb lectors d'EPUB 3 (Calibre, Apple Llibres, Thorium, tinta electrònica…). El títol es pren del primer encapçalament de nivell 1 (o del nom del document), i l'autor, la portada i l'idioma surten dels ajustos que s'expliquen més avall.
* **HTML (pàgina web)**: genera un fitxer autònom amb estils i fórmules incrustats, a punt per allotjar-lo al web. El títol de la pestanya del navegador es pren del primer encapçalament, o del nom del document si no n'hi ha.
* **TEX (LaTeX)**: crea un document `.tex` complet amb la capçalera preparada per compilar. Porta l'idioma del document, de manera que la partició de mots i els rètols automàtics surten en la teva llengua, i si el document comença amb un únic encapçalament de nivell 1 aquest passa a ser el títol (`\title` i `\maketitle`) en lloc d'una secció més.

Durant l'exportació, la barra superior mostra missatges d'estat (progrés, èxit o errors).

### Ajustos del document exportat

**Configuració → Document exportat…** desa preferències que es reutilitzen en cada exportació, també la propera vegada que obris l'aplicació.

**Idioma del document**, que s'aplica als cinc formats. És el que decideix en quina llengua corregeixen l'ortografia el Word i el LibreOffice en obrir un DOCX o un ODT, com parteix els mots el LaTeX i quin idioma declaren l'HTML i l'EPUB per als lectors de pantalla. Per defecte és **Igual que la interfície**: si canvies l'idioma d'EdiMarkWeb, els documents el segueixen. Pots fixar qualsevol dels cinc idiomes de l'aplicació o triar **Altre…** i escriure'n el codi (`fr`, `de`, `pt-BR`).

**Autor**, que es desa a les propietats del fitxer i apareix com a autor del llibre a l'EPUB i a la portada del LaTeX. En DOCX i ODT, a més, el Pandoc escriu una línia amb el nom al principi del document; si no vols que hi aparegui, deixa el camp buit. Un document concret pot portar un altre autor: *Autor d'aquest document…*, al menú del botó d'idioma.

**Portada de l'EPUB**, amb tres possibilitats. D'entrada, EdiMarkWeb **en genera una** amb el títol i l'autor del document, perquè un llibre sense imatge apareix amb la icona genèrica al prestatge del lector. Pots posar-hi **una imatge teva** —fins a 1 MB, que per a una portada ja va sobrat: es desa al navegador, al mateix espai que els teus documents— o deixar el llibre **sense portada**. Només afecta l'EPUB.

**Índex automàtic**, que afegeix al principi del document un índex amb els apartats. En DOCX és un índex del Word de debò i en ODT un de natiu del LibreOffice; l'EPUB no el necessita, perquè el lector ja porta el seu índex de navegació.

> **Sobre els números de pàgina**: en DOCX i ODT l'índex és un camp que calcula el processador de textos, perquè cal maquetar les pàgines per saber on cau cada apartat. EdiMarkWeb hi escriu la llista d'apartats, de manera que el document s'obre amb l'índex a la vista, però sense números. Perquè hi surtin, actualitza'l: al Word, clic dret a l'índex → *Actualitza el camp*; al LibreOffice, *Eines → Actualitza → Índexs*.

**Numerar els apartats**, que anteposa 1, 1.1, 1.2… als encapçalaments. Funciona en DOCX, HTML i LaTeX; l'ODT no admet aquesta numeració i surt sense.

I tres ajustos **només per a LaTeX**, que s'apliquen en exportar a TEX i en copiar *LaTeX – document complet*:

* **Classe de document**: `article` (la predeterminada), `report` o `book`.
* **Opcions de classe**: el que va entre claudàtors a `\documentclass`, separat per comes (`12pt, a4paper`).
* **Preàmbul**: els teus paquets i macros, que s'insereixen tal qual al final del preàmbul, just abans de `\begin{document}`.

Si el document comença amb metadades YAML pròpies, manen elles i cap d'aquests ajustos s'aplica. I tingues en compte que un preàmbul amb errors no avisarà de res aquí: la fallada apareixerà en compilar el `.tex`.

---

## Copiar i compartir sense baixar

* **Copiar Markdown**: botó directe al plafó esquerre per enviar el text font al porta-retalls.
* **Copiar des de la vista prèvia**: el botó de còpia del plafó dret recorda la teva última elecció entre:
  * *Copiar HTML* (representat tal com el veus).
  * *Copiar LaTeX* (només el fragment actual).
  * *Copiar LaTeX – document complet* (inclou capçalera i entorn a punt per compilar, amb el mateix idioma i títol que l'exportació a TEX).

Cada opció mostra una notificació d'èxit i, quan escau, prepara automàticament el marcatge LaTeX a partir de la vista prèvia representada.

---

## Arrossegar i deixar anar fitxers

Arrossega un o diversos fitxers sobre l'aplicació. S'admeten `.md` i `.markdown`, que s'obren tal qual, i `.docx`, `.odt`, `.epub`, `.html` i `.tex`, que es converteixen a Markdown amb Pandoc abans d'obrir-se:

* Veuràs un marc il·luminat que confirma que els pots deixar anar.
* Cada fitxer s'obrirà a la seva pestanya amb el nom original.
* També pots arrossegar carpetes senceres des del gestor de fitxers: se'n recorren les subcarpetes i cada fitxer compatible s'obre a la seva pestanya, en ordre alfabètic. La resta s'ignora i, si no hi ha res aprofitable, l'aplicació t'ho adverteix.
* El contingut queda disponible fora de línia gràcies al desament automàtic.

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
| Cita | `Ctrl` + `Maj` + `Q` | `Cmd` + `Maj` + `Q` |
| Codi | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Enllaç | `Ctrl` + `K` | `Cmd` + `K` |
| Imatge | `Ctrl` + `Maj` + `I` | `Cmd` + `Maj` + `I` |
| Taula | `Ctrl` + `Maj` + `T` | `Cmd` + `Maj` + `T` |
| Fórmula en línia | `Ctrl` + `M` | `Cmd` + `M` |
| Fórmula en bloc | `Ctrl` + `Maj` + `M` | `Cmd` + `Maj` + `M` |
| Desfer / Refer | `Ctrl` + `Z` / `Ctrl` + `Maj` + `Z` | `Cmd` + `Z` / `Cmd` + `Maj` + `Z` |
| **Gestió de documents** | | |
| Pestanya nova | `Ctrl` + `T` | `Cmd` + `T` |
| Tancar pestanya | `Ctrl` + `W` | `Cmd` + `W` |
| Pestanya següent / anterior | `Ctrl` + `Tab` / `Ctrl` + `Maj` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Maj` + `Tab` |
| Desar | `Ctrl` + `S` | `Cmd` + `S` |
| Obrir fitxer | `Ctrl` + `O` | `Cmd` + `O` |
| Enganxar LaTeX (obrir diàleg) | `Ctrl` + `Maj` + `V` | `Cmd` + `Maj` + `V` |
| **Interfície** | | |
| Canviar disposició | `Ctrl` + `L` | `Cmd` + `L` |
| Cercar | `Ctrl` + `F` | `Cmd` + `F` |
| Augmentar / reduir el text | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual d'ús | `Ctrl` + `H` | `Cmd` + `H` |
| Recarregar el manual | `Ctrl` + `Maj` + `H` | `Cmd` + `Maj` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

Les dreceres d'una sola lletra actuen sobre el document, així que queden en pausa mentre el cercador és obert.

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

### Altres delimitadors

A més de `$...$` i `$$...$$`, pots fer servir els delimitadors propis de LaTeX: \(E = mc^2\) en línia, i en bloc:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

### Sumatoris, límits i integrals

La suma dels $n$ primers naturals és $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ i la integral $\int_0^1 x^2\,dx = \frac{1}{3}$. El nombre $e$ es defineix com un límit:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### Sistemes d'equacions

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

### Símbols solts

Lletres gregues ($\alpha$, $\beta$, $\Omega$), subíndexs ($H_2O$), comparacions ($a \neq b$, $x \leq y$) i conjunts ($\mathbb{R}$, $A \subseteq B$).

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
