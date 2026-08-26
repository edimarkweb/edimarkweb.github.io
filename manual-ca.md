![Logotip d'EdiMarkWeb](logo_100px.png)

# Manual d'EdiMarkWeb

Benvingut/uda a EdiMarkWeb, un **editor de textos en Markdown** dissenyat per a docents i creadors de contingut que necessiten treballar de pressa, exportar a diversos formats i afegir matemàtiques amb LaTeX sense complicacions. El pots fer servir **al navegador**, sense instal·lar res, o **instal·lar-lo com a aplicació d'escriptori** a Linux, Windows i macOS. En tots dos casos la feina passa al teu equip: ni els documents ni les imatges en surten.

## Novetats destacades

- Edició dual: pots treballar tant en Markdown com directament a la vista prèvia HTML, sempre sincronitzades.
- Menú d'exportació i d'importació compatible amb DOCX, ODT, EPUB, HTML, LaTeX i PDF, amb opcions de còpia directa al porta-retalls.
- Cercador amb reemplaçament que ressalta les coincidències i accepta termes sense accents ni distinció entre majúscules i minúscules.
- Menú **Configuració** amb l'idioma, la mida de la lletra, el tema i la finestra independent reunits en un mateix lloc; l'amplada de treball es canvia al costat dels controls dels plafons.
- Tema de la interfície amb tres opcions —Sistema, Clar i Fosc— que es recorda entre sessions.
- Menú de fórmules renovat i accés directe a EdiCuaTeX per construir expressions complexes.
- Obertura de diversos fitxers, o de carpetes senceres, arrossegant-los a l'editor (cada fitxer en la seva pestanya): Markdown i també DOCX, ODT, EPUB, HTML o TEX, que es converteixen al vol amb Pandoc.
- Cerca amb expressions regulars i mode d'edició a pantalla completa per treballar sense distraccions.
- **Idioma de cada document**, desat dins del fitxer mateix i visible al costat del comptador de caràcters. Els cinc formats el declaren, de manera que el Word i el LibreOffice deixen de corregir en anglès un text en català.
- **Opcions d'exportació** en un mateix lloc: autor, portada de l'EPUB, índex automàtic, numeració d'apartats i, per al LaTeX, la classe, les seves opcions i un preàmbul propi.
- **Aplicació d'escriptori** per a Linux, Windows i macOS, amb els documents associats al doble clic, desament sobre el fitxer original, corrector ortogràfic del sistema i funcionament sense connexió.
- **Avís de versions noves** a l'aplicació d'escriptori, amb baixada i instal·lació des de la mateixa aplicació.

## Enganxa qualsevol contingut

> **Important:** pots enganxar **qualsevol objecte des del porta-retalls**: text pla, fragments del Word o del LibreOffice, HTML complet, fórmules generades per un chatbot i fins i tot imatges copiades directament. Fes servir `Ctrl+V`/`Cmd+V` o el botó de la barra d'eines amb la icona del porta-retalls (`Enganxar`) i EdiMarkWeb col·locarà el contingut al plafó adequat:

- El text Markdown o sense format s'insereix al plafó esquerre respectant exactament la posició del cursor.
- El contingut enriquit (HTML, DOCX, enganxat des del navegador, etc.) es torna a calcular al plafó dret i, alhora, es genera el Markdown corresponent per mantenir les dues vistes sincronitzades.

Això elimina els passos intermedis: copia des del teu origen preferit i fes clic a **Enganxar** per continuar editant sense interrupcions.

El botó **Imatge** també permet triar un fitxer del disc, a més d'escriure un URL, i pregunta com vols inserir-lo:

* **Amb ruta relativa** (el recomanat i el que ve marcat): el document només anomena la imatge —`![Gràfic](imatges/01.png)`—, que es queda on és. És el que fa qualsevol editor de Markdown i el que manté el `.md` lleuger i llegible; a canvi, el document i la seva carpeta d'imatges viatgen junts.
* **Dins del document**: la imatge s'incrusta dins del fitxer, que passa a ser autònom però molt més pesant. Útil per enviar un `.md` solt per correu.

A l'aplicació d'escriptori la ruta es calcula sola des de la carpeta del document. Al navegador no hi ha manera de conèixer la carpeta de la imatge, així que només se n'escriu el nom i se t'avisa.

---

## Gestió de documents (pestanyes)

Treballa amb diversos documents alhora, cadascun a la seva pestanya.

* **Crear pestanyes**: prem el botó `+` (o `Ctrl+T`) per obrir un document en blanc.
* **Canviar de pestanya**: fes clic al nom per mostrar-ne el contingut, o passa d'una a l'altra amb `Ctrl+Tab`.
* **Reanomenar**: fes doble clic al títol per posar-hi un nom més descriptiu (p. ex. «Tema 3 – Equacions»).
* **Tancar pestanyes**: prem la `X`. Si hi ha canvis sense desar, l'aplicació t'ho advertirà.
* **Canvis sense desar**: un punt vermell (`●`) indica que hi ha modificacions pendents.
* **Desament automàtic**: cada pestanya desa tota sola una còpia a l'equip, a l'espai propi de l'aplicació; si recarregues la pàgina o tornes a obrir el programa, el contingut reapareix. És una xarxa de seguretat, no un substitut de desar el fitxer.

---

## Barra superior de controls

La barra del costat del logotip agrupa les opcions globals de l'aplicació i concentra totes les accions de fitxer en un únic botó desplegable:

* **Fitxer**: reuneix les accions sobre el document en dos grups. Primer les que hi porten contingut —`Obrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` i `Enganxar LaTeX (Ctrl+Maj+V)`— i després les que el treuen: `Desar (Ctrl+S)`, `Desar com a… (Ctrl+Maj+S)` i el submenú **Exportar**, que es desplega a la dreta amb DOCX, ODT, EPUB, HTML, TEX i PDF. Cada opció mostra la seva drecera de teclat. A l'aplicació d'escriptori el menú acaba amb **Surt**, que desa el document en curs i tanca l'aplicació.
* **Configuració**: agrupa tots els ajustos de l'aplicació, cadascun amb un submenú que n'indica el valor actiu.
  * **Idioma**: canvia l'idioma de la interfície.
  * **Mida del text**: petita, normal, gran o molt gran.
  * **Tema**: `Sistema` segueix el de l'equip i canvia amb ell; `Clar` i `Fosc` el fixen. L'elecció es recorda el pròxim cop que obris l'aplicació.
  * **Finestra independent**: obre EdiMarkWeb en una finestra pròpia del navegador, sense pestanyes ni barra d'adreces. Només apareix a la versió web; l'aplicació d'escriptori ja és una finestra pròpia.
  * **Corrector ortogràfic**: subratlla les faltes del plafó Markdown amb els diccionaris instal·lats a l'equip i segueix l'idioma del document. Ve activat; en desmarcar-lo s'apaga i la tria es recorda.
  * **Cerca actualitzacions…**: només apareix a l'aplicació d'escriptori. Comprova si hi ha una versió més recent i, si n'hi ha, mostra un avís amb el botó **Baixa i instal·la**, que descarrega l'instal·lador del teu sistema i l'obre. L'aplicació fa aquesta comprovació tota sola un cop al dia en arrencar; la casella **Comprova en iniciar** de l'avís permet desactivar-la.
  * **Opcions d'exportació…**: obre els ajustos dels fitxers que genera l'aplicació (idioma i, per al LaTeX, classe i preàmbul), explicats més avall.
* **Imprimir (Ctrl+P)**: genera una vista preparada per a paper o PDF amb els estils actuals.
* **Cercar (Ctrl+F)** i **Manual (Ctrl+H)**: obren el cercador avançat o aquest mateix document.
* **Quant a**: mostra la versió instal·lada, l'autor, la llicència i les llicències de les biblioteques de tercers, a més dels enllaços a la versió web i a les baixades d'escriptori.

La disposició dels plafons es canvia amb `Ctrl+L` o amb el botó de disposició situat al costat del botó que maximitza l'àrea d'edició. El menú permet **Maximitzar el plafó Markdown**, **Maximitzar el plafó de vista prèvia** o **Dividir els plafons**. En pantalles petites, la barra es plega en dos botons —**Accions** i **Format**— que mostren cada grup quan el necessites.

---

## Barra d'eines

La franja grisa sota la barra superior conté accessos ràpids a format i elements:

* **Desfer i refer**: les dues fletxes de l'extrem esquerre (`Ctrl+Z` i `Ctrl+Maj+Z`).
* **Estils bàsics**: negreta, cursiva i un menú d'encapçalaments (H1…H6).
* **Llistes i cites**: pics, numeració i blocs de cita amb dreceres associades.
* **Codi, enllaços, imatges i taules**: insercions guiades mitjançant diàlegs.
* **Enganxar**: porta al document el que hi hagi al porta-retalls, tal com s'explica més amunt.
* **Fórmules LaTeX**: menú per inserir ordres en línia o en bloc amb la sintaxi correcta.
* **Editor de fórmules (EdiCuaTeX)**: obre l'assistent integrat amb `Ctrl+Alt+M`. En acceptar, la fórmula torna inserida a l'editor.

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

Pots arrossegar la barra central per donar més espai a qualsevol dels plafons, triar una de les tres disposicions al botó de la dreta o fer servir la doble fletxa per **maximitzar l'àrea d'edició**, que amaga les barres superiors i deixa la pantalla per al text. El botó `+` es manté just després de l'última pestanya.

### Els ajustos de cada document

Al costat del comptador de caràcters hi ha un botó curt amb l'idioma del document: `ES`, `CA`, `FR`… Si es veu atenuat, aquest document no té idioma propi i fa servir l'**idioma general** de *Configuració → Opcions d'exportació…*, que és el més habitual.

En triar un idioma concret, l'aplicació el desa **dins del document mateix**, de manera que viatja amb el fitxer: si el deses i l'obres demà, aquí o en un altre equip, o l'hi passes a algú, continuarà sent aquell. Per tornar enrere, tria *Idioma general*. I amb *Un altre idioma…* pots escriure el codi de qualsevol llengua (`fr`, `de`, `pt-BR`). En aquest mateix menú, *Autor d'aquest document…* fa el mateix amb l'autor.

Si algun dia obres el teu `.md` amb un editor de text pla, veuràs aquesta preferència a dalt de tot, en unes línies entre ratlles:

```
---
lang: "ca"
---
```

És la manera estàndard de desar dades sobre un document i molts programes l'entenen. EdiMarkWeb no la mostra a la vista prèvia, perquè no és contingut, però sí al plafó Markdown, que és el codi font. Pots esborrar-la o canviar-la a mà si vols.

#### El format del text

En el mateix quadre —i també al botó **Format** del final de la barra— es fixen l'**alineació** (esquerra, justificada o dreta), el **tipus de lletra** (amb serifa, sense serifa, monoespaiada o la que escriguis), la **mida** en punts, l'**interlineat**, els **marges** dels quatre costats en centímetres, la **sagnia de primera línia** i la **partició de mots amb guionet**.

En triar *Altra…* al tipus de lletra apareix el nom de la tipografia just a sota, amb una llista de suggeriments: les que l’aplicació ha pogut reconèixer com a instal·lades en aquest equip (a Chrome i Edge, a més, *Veure totes les del sistema…* demana permís i ofereix la llista completa). Pots escriure qualsevol nom encara que no estigui instal·lat: el document el desa igualment, perquè el fitxer pot acabar en un equip que sí que la tingui. Si aquí no hi és, s’avisa en ambre i la previsualització fa servir una tipografia de reserva; en exportar, el nom viatja escrit i el resol cada programa (Word i LibreOffice si la tenen, i en LaTeX només amb XeLaTeX o LuaLaTeX).

El que deixis a *Heretat* segueix **Configuració → Opcions d'exportació…**, on hi ha els mateixos ajustos com a valors de partida per a tots els documents. Sota cada camp es veu, en gris, el valor que hereta ara mateix. El que fixis aquí es desa dins del document mateix, al costat de l'idioma i de l'autor, així que viatja amb el fitxer. *Treure-ho tot del document* el deixa sense res propi:

```
---
lang: "ca"
align: "justify"
fontsize: "12pt"
margin-left: "3cm"
---
```

S'aplica a la vista prèvia i als cinc formats d'exportació, amb tres excepcions que convé conèixer:

* A l'**EPUB** els marges són un suggeriment: qui mana sobre la caixa de la pàgina és el lector de llibres.
* Al **TEX**, si el teu preàmbul ja carrega `geometry`, manen els teus marges: l'aplicació avisa que ha deixat fora els del menú en lloc de trencar la compilació amb dos `\usepackage` iguals.
* La **partició de mots** fa servir els diccionaris de guionets del sistema. El Word al Windows i al macOS porta els seus; al Linux, el LibreOffice necessita el paquet de l'idioma (per exemple, `hyphen-ca`).

### Imatges amb ruta relativa

Un `.md` corrent no porta les imatges a dins: les desa en una carpeta al costat i les anomena amb una ruta relativa, `imatges/01.png`. EdiMarkWeb resol aquestes rutes i mostra les imatges a la previsualització.

* A l'**aplicació d'escriptori** no cal fer res: en obrir el document, les imatges es busquen a la seva carpeta i apareixen.
* Al **navegador** cap pàgina no pot llegir una carpeta del disc sense permís. Si el document anomena imatges que no es troben, sobre la previsualització apareix un avís amb el botó **Cerca la seva carpeta…**: en triar la carpeta del document, totes les imatges es veuen. Només cal fer-ho una vegada: EdiMarkWeb desa al navegador les imatges que utilitza el document i les recupera en tornar a carregar la pàgina.
* Arrossegar una carpeta sencera a l'editor obre els seus documents **i** registra les seves imatges alhora.
* En **desar**, les imatges recuperades es copien al costat del `.md`, conservant rutes com `imatges/01.png`. Al navegador es tria la carpeta de destinació; si el navegador no permet escriure carpetes, es baixa un ZIP llest per descomprimir. **Desar com a…** fa la mateixa còpia a l'aplicació d'escriptori.

El Markdown no canvia en cap moment: el que es desa, es copia o s'exporta continua portant la ruta que vas escriure. Les imatges que no es troben es marquen amb un requadre discontinu en lloc de la icona trencada del navegador.

### Imatges incrustades

Quan un document porta imatges en base64 —en importar un DOCX, en enganxar des d'una altra aplicació—, el seu codi ocupa milers de caràcters i fa il·legible el Markdown. EdiMarkWeb les plega automàticament: a l'editor apareix una marca curta del tipus `__EDIMARK_B64_1__` i, sota el plafó, una llista amb cada imatge amagada, el seu format, la seva mida i un botó **Veure codi** per consultar-la o copiar-la. El contingut real es conserva intacte en desar, copiar o exportar. La llista es manté recollida en una sola línia, amb el nombre d'imatges: en desplegar-la, cada una mostra la seva miniatura —clic a sobre per veure-la a mida gran— i la llista es queda amb la seva pròpia alçada i barra de desplaçament, de manera que per moltes imatges que tingui el document mai no li menja lloc a l'editor. Es recorda si l'has deixada oberta o tancada. Cada línia porta a més un botó **Elimina**, que treu la imatge del document —el codi sencer, no només el marcador— després de demanar confirmació, i **Veure codi**, útil si vols copiar el `data:` per enganxar aquesta mateixa imatge en un altre document o en una altra eina.

---

## Vista prèvia interactiva

* Fes clic al plafó dret per editar directament sobre el resultat: els canvis se sincronitzen amb el Markdown mantenint el format sempre que l'edició sigui compatible.
* La vista prèvia admet seleccions, copiar i enganxar, així com dreceres bàsiques (Ctrl+B/I, encapçalaments, etc.) igual que l'editor de Markdown.
* Mantén premuda la tecla `Ctrl` (o `Cmd` a macOS) i fes clic per obrir enllaços; a l'aplicació d'escriptori s'obren al teu navegador habitual.
* Les fórmules LaTeX es representen automàticament amb KaTeX; en editar-les tornen a la seva sintaxi original.

---

## Accions principals

* **Obrir (`Ctrl+O`)**: importa fitxers `.md` o `.markdown`.
* **Importar**: converteix a Markdown documents en altres formats mitjançant Pandoc: `.docx`, `.odt`, `.epub`, `.html` i `.tex`. Es recuperen els encapçalaments, les llistes, les taules i els enllaços, i també les imatges: quan provenen d'un `.docx`, `.odt` o `.epub` s'extreuen del mateix fitxer i queden incrustades al Markdown, de manera que es veuen a la vista prèvia i viatgen amb tu en exportar.
* **Desar (`Ctrl+S`)**: desa el document actual. A l'aplicació d'escriptori actualitza el fitxer ja obert; **Desar com a… (`Ctrl+Maj+S`)** sempre permet triar un altre nom o ubicació.
* **Copiar contingut**: el plafó esquerre inclou un botó per copiar el Markdown; a la vista prèvia pots triar què es copiarà (HTML representat o variants LaTeX) des del menú desplegable del costat de la icona de còpia.
* **Canviar tema, disposició o amplada**: fes servir **Configuració** per al tema, `Ctrl+L` o el menú de plafons per a la disposició i el botó d'amplada (només icona), a la dreta de la doble fletxa, per eixamplar l'espai web.
* **Manual**: disposes d'aquest document sempre actualitzat amb `Ctrl+H`.
* **La carpeta es recorda**: a l'aplicació d'escriptori, el primer quadre d'obrir o desar surt on digui el sistema, però a partir d'aquí tots —obrir, desar com a, exportar, triar una imatge— tornen a la darrera carpeta que has fet servir. Només es recorda mentre l'aplicació està oberta.

---

## Exportar

Obre el botó **Fitxer** i selecciona `Exportar` per baixar versions llestes per lliurar o publicar:

* **DOCX (Microsoft Word)**: ideal per compartir amb alumnat o companys que fan servir Word, i compatible amb Google Docs.
* **ODT (LibreOffice)**: pensat per a suites lliures com LibreOffice o OnlyOffice.
* **EPUB (llibre digital)**: crea un llibre electrònic compatible amb lectors d'EPUB 3 (Calibre, Apple Llibres, Thorium, tinta electrònica…). El títol es pren del primer encapçalament de nivell 1 (o del nom del document), i l'autor, la portada i l'idioma surten dels ajustos que s'expliquen més avall.
* **HTML (pàgina web)**: genera un fitxer autònom amb estils i fórmules incrustats, a punt per allotjar-lo al web. El títol de la pestanya del navegador es pren del primer encapçalament, o del nom del document si no n'hi ha.
* **TEX (LaTeX)**: crea un document `.tex` complet amb la capçalera preparada per compilar. Porta l'idioma del document, de manera que la partició de mots i els rètols automàtics surten en la teva llengua, i si el document comença amb un únic encapçalament de nivell 1 aquest passa a ser el títol (`\title` i `\maketitle`) en lloc d'una secció més.
* **PDF (mitjançant impressió)**: obre el diàleg d'impressió del sistema, on tries «Desa com a PDF» com a destinació. En surt exactament el que veus a la vista prèvia, amb les fórmules compostes i els marges del document, i el text queda seleccionable i cercable. És el mateix camí que el botó **Imprimir (Ctrl+P)**.

Durant l'exportació, la barra superior mostra missatges d'estat (progrés, èxit o errors).

### Opcions d'exportació

**Configuració → Opcions d'exportació…** desa preferències que es reutilitzen en cada exportació, també la propera vegada que obris l'aplicació.

El quadre està repartit en quatre pestanyes —**Document**, **Format**, **EPUB** i **LaTeX**— que també es recorren amb les fletxes del teclat. A l'aplicació d'escriptori, a més, aquestes opcions es desen en un fitxer `settings.json` dins la carpeta de configuració d'EdiMarkWeb al teu perfil d'usuari, de manera que sobreviuen a una neteja de dades del navegador intern o a una reinstal·lació.

**Idioma del document**, que s'aplica als cinc formats. És el que decideix en quina llengua corregeixen l'ortografia el Word i el LibreOffice en obrir un DOCX o un ODT, com parteix els mots el LaTeX i quin idioma declaren l'HTML i l'EPUB per als lectors de pantalla. Per defecte és **Igual que la interfície**: si canvies l'idioma d'EdiMarkWeb, els documents el segueixen. Pots fixar qualsevol dels cinc idiomes de l'aplicació o triar **Altre…** i escriure'n el codi (`fr`, `de`, `pt-BR`).

**Autor**, que es desa a les propietats del fitxer i apareix com a autor del llibre a l'EPUB i a la portada del LaTeX. En DOCX i ODT, a més, el Pandoc escriu una línia amb el nom al principi del document; si no vols que hi aparegui, deixa el camp buit. Un document concret pot portar un altre autor: *Autor d'aquest document…*, al menú del botó d'idioma.

**Portada de l'EPUB**, amb tres possibilitats. D'entrada, EdiMarkWeb **en genera una** amb el títol i l'autor del document, perquè un llibre sense imatge apareix amb la icona genèrica al prestatge del lector. Pots posar-hi **una imatge teva** —fins a 1 MB, que per a una portada ja va sobrat: es desa al costat dels teus documents, a l'espai propi de l'aplicació— o deixar el llibre **sense portada**. Només afecta l'EPUB.

**Format del text**: alineació, tipus i mida de lletra, interlineat, marges, sagnia i partició de mots, amb els valors de partida per a tots els documents. Cada document pot fixar els seus des del plafó Markdown, i el que no fixi ho hereta d'aquí.

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
* El contingut queda disponible sense connexió gràcies al desament automàtic.

---

## L'aplicació d'escriptori

A més de la versió web, EdiMarkWeb s'instal·la com a programa a **Linux, Windows i macOS**. És la mateixa aplicació —els mateixos menús, les mateixes dreceres i els mateixos formats—, de manera que el que aprenguis en una et serveix a l'altra.

### Instal·lar-la

Els instal·ladors són a la [pàgina de baixades](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest), un per a cada sistema:

* **Linux**: un paquet `.deb` per a Debian, Ubuntu, Mint i derivades, i una `.AppImage` que s'executa sense instal·lar a qualsevol distribució.
* **Windows**: un instal·lador `.exe` i un altre `.msi`, per a qui desplegui l'aplicació en una aula o un centre.
* **macOS**: una imatge `.dmg` per als Mac amb processador Apple i una altra per als Mac amb Intel.

### Què afegeix respecte al navegador

* **Els documents s'obren amb doble clic**: la instal·lació associa els fitxers `.md` i `.markdown`, de manera que s'obren a EdiMarkWeb des del gestor de fitxers. Si l'aplicació ja és oberta, el document arriba a aquella mateixa finestra en una pestanya nova.
* **Desar escriu al fitxer de debò**: `Ctrl+S` actualitza el document que has obert, sense passar per la carpeta de baixades. **Desar com a…** obre el diàleg del sistema per triar nom i carpeta.
* **Corrector ortogràfic del sistema**: l'editor subratlla les faltes amb els diccionaris instal·lats a l'equip. Al Windows i al macOS són els idiomes que ja tinguis; al Linux pot caldre instal·lar el diccionari que vulguis (per exemple, el paquet `hunspell-ca`). El pots apagar a **Configuració → Corrector ortogràfic**.
* **Funciona sense connexió**: l'aplicació duu a dins tot el que necessita, inclosos el Pandoc i l'editor de fórmules EdiCuaTeX, així que pots escriure, importar i exportar sense internet. Només cal connexió per comprovar si hi ha versions noves.
* **Surt**: al final del menú **Fitxer**, desa el document en curs i tanca l'aplicació.

### Mantenir-la al dia

En arrencar, l'aplicació comprova un cop al dia si hi ha una versió més recent. Quan n'hi ha, apareix un avís sota la barra d'eines amb el botó **Baixa i instal·la**: descarrega l'instal·lador que correspon al teu sistema, mostra el progrés i el lliura a l'instal·lador del sistema perquè acabis en un parell de clics. Amb una AppImage no hi ha res a instal·lar, així que l'aplicació baixa la nova i obre la seva carpeta perquè substitueixis la que tenies. Cap instal·lador no pot substituir els fitxers d'una aplicació oberta, així que tan bon punt arrenca apareix al mateix avís el botó **Tanca EdiMarkWeb**, que desa el que estiguis escrivint i tanca: en acabar la instal·lació, torna a obrir-la i ja tindràs la versió nova.

L'avís inclou la casella **Comprova en iniciar**, que desactiva aquesta comprovació automàtica, i l'enllaç **Mira les novetats** amb la llista de canvis. La pots demanar quan vulguis des de **Configuració → Cerca actualitzacions…**; si ja tens l'última versió, t'ho dirà a la barra d'estat.

### El que no canvia

Els documents que comencis al navegador i els de l'aplicació d'escriptori són fitxers Markdown corrents: els pots moure d'un a l'altre sense conversions. El desament automàtic de les pestanyes, en canvi, és independent en cadascun, perquè cada versió desa la seva còpia de treball al seu propi espai.

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
| Desar com a… | `Ctrl` + `Maj` + `S` | `Cmd` + `Maj` + `S` |
| Obrir fitxer | `Ctrl` + `O` | `Cmd` + `O` |
| Importar document | `Ctrl` + `Alt` + `O` | `Cmd` + `Alt` + `O` |
| Enganxar LaTeX (obrir diàleg) | `Ctrl` + `Maj` + `V` | `Cmd` + `Maj` + `V` |
| **Interfície** | | |
| Obrir EdiCuaTeX | `Ctrl` + `Alt` + `M` | `Cmd` + `Alt` + `M` |
| Enganxar des del porta-retalls | `Ctrl` + `Alt` + `V` | `Cmd` + `Alt` + `V` |
| Obrir Exportar | `Ctrl` + `Alt` + `E` | `Cmd` + `Alt` + `E` |
| Obrir Configuració | `Ctrl` + `,` | `Cmd` + `,` |
| Maximitzar l'àrea d'edició | `Ctrl` + `Maj` + `F` | `Cmd` + `Maj` + `F` |
| Canviar disposició | `Ctrl` + `L` | `Cmd` + `L` |
| Cercar | `Ctrl` + `F` | `Cmd` + `F` |
| Augmentar / reduir el text | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual d'ús | `Ctrl` + `H` o `F1` | `Cmd` + `H` o `F1` |
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
