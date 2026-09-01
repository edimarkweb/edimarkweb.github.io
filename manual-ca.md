![Logotip d'EdiMarkWeb](logo_100px.png)

# Manual d'EdiMarkWeb

EdiMarkWeb és un **editor de textos en Markdown** pensat per a docents i creadors de contingut: s'escriu de pressa, s'exporta a Word, LibreOffice, EPUB, HTML, LaTeX i PDF, i admet fórmules matemàtiques. Funciona **al navegador**, sense instal·lar res, i també com a **aplicació d'escriptori** per a Linux, Windows i macOS. En tots dos casos la feina passa al teu equip: ni els documents ni les imatges en surten.

## Per començar

Escriu al plafó de l'esquerra i veuràs el document composant-se a la dreta. No cal saber Markdown: els botons de la barra d'eines posen negretes, títols, llistes, taules, enllaços, imatges i fórmules, i funcionen **als dos plafons**.

Quan acabis, tens dos camins: **Desar** (`Ctrl+S`) deixa un fitxer `.md`, que és text corrent i s'obre a qualsevol lloc, i **Exportar** genera el DOCX, el PDF o el format que hagis de lliurar.

---

## Els dos editors

La zona de treball es divideix en dos plafons redimensionables. **Tots dos editen el mateix document**, sincronitzats en tot moment:

* **Editor Markdown** (esquerra): el codi font, tal qual. Tot el que hi escriguis apareix a l'instant a l'altre plafó.
* **Editor visual** (dreta): el document ja compost, com un full sobre una taula, i **s'hi escriu directament a sobre**. La barra de format també hi treballa: negreta, cursiva, títols, cites, llistes, enllaços, imatges, taules i fórmules s'apliquen sobre el que veus i el Markdown es reescriu tot sol. El mateix botó treu el que ha posat, i `Ctrl+Z` desfà encara que siguis al full, perquè l'historial és el del document. El botó amb la icona de codi alterna entre el document compost i l'HTML generat.

**Plafó actiu**: amb tots dos a la vista, un mana —el que reben els botons i la lupa—. Es reconeix pel cantó de color i pel rètol de la barra d'estat, que només anomena el plafó actiu.

**Com repartir-los**: arrossega la barra central, o fes servir `Ctrl+L` i els tres botons de disposició —només l'editor Markdown, tots dos alhora, només l'editor visual—. La doble fletxa **maximitza l'àrea d'edició**, que amaga les barres i deixa la pantalla per al text.

**La lupa** de la barra d'estat (`−`, el percentatge i `+`, o `Ctrl` + `+` / `Ctrl` + `-`) engrandeix o redueix el que veus al plafó actiu. Engrandeix el full sencer, amb les seves pàgines i els seus marges, així que la pàgina no es reordena. No canvia el document ni el que s'exporta o s'imprimeix —el paper surt sempre al 100 %—: la mida de la lletra és a *Format del text*.

**El plafó lligat a la lupa** (l'interruptor amb la cadena, a l'esquerra de la lupa) manté la pàgina sempre sencera, i treballa en els dos sentits: si mous el separador, l'augment es recalcula perquè el full hi continuï cabent —el percentatge va llavors en blau i subratllat, perquè el posa ell i no tu—; si toques la lupa, és el separador el que s'aparta per deixar lloc al full. Així no apareix la barra de desplaçament horitzontal, i el repartiment en pàgines es conserva sempre.

Ve posat. S'atura on l'editor Markdown es quedaria sense la seva amplada mínima: en arribar-hi el `+` s'apaga i ho diu en passar-hi el ratolí. Per ampliar més enllà, deslliga l'interruptor —la cadena s'obre i es torna ambre— o deixa l'editor visual sol (`Ctrl` + `L`), que li dona tota l'amplada.

El full omple el plafó, no només hi cap: si fas lloc a l'editor visual, la pàgina es veu més gran i l'augment passa del 100 % —fins al 200 %, que és on arriba la lupa—. El 100 % és la mida real del paper, la que sortirà impresa, i el tens a un clic al percentatge del centre; perquè es quedi fix, deslliga l'interruptor.

Tot això és cosa dels dos plafons alhora, que és on l'amplada d'un se la pren de l'altre. Amb un sol plafó a la vista, o en una pantalla estreta on van l'un damunt de l'altre, l'interruptor es retira i la lupa és lliure.

**Les pàgines**: el full amida el que amida el paper —A4 o Carta, el que digui el document— i l'editor visual reparteix el text en pàgines, amb el seu buit entre una i l'altra. El tall cau sempre entre dos blocs, mai a mitja línia: el que no cap al final d'una pàgina passa sencer a la següent, com en un processador de textos. És fidel al PDF i a la impressió, que surten d'aquest mateix full i tallen per on talla ell; per al Word o el LaTeX és orientatiu, perquè cadascun reparteix les línies a la seva manera. Amb el plafó lligat a la lupa el repartiment es conserva sempre; només es retira si deslligues l'interruptor i poses un augment amb què el full no càpiga al plafó.

### Enganxar qualsevol cosa

Amb `Ctrl+V` o el botó **Enganxar**, EdiMarkWeb col·loca al plafó adequat el que hi hagi al porta-retalls: el text pla i el Markdown van a l'editor Markdown, a la posició del cursor; el contingut amb format (Word, LibreOffice, una pàgina web, una fórmula d'un chatbot) i fins i tot les imatges es recomponen a l'editor visual i generen el seu Markdown. No calen passos intermedis: copia d'on sigui i enganxa.

Amb `Ctrl` (o `Cmd`) premut, un clic a un enllaç de l'editor visual l'obre; a l'aplicació d'escriptori, al teu navegador habitual.

---

## Pestanyes

Cada document viu a la seva pestanya. `Ctrl+T` en crea una; `Ctrl+Tab` passa d'una a l'altra i cadascuna recorda on la vas deixar. Doble clic sobre el títol per reanomenar-la, la `X` per tancar-la, i un punt vermell (`●`) avisa de canvis sense desar.

Totes es **desen soles** a l'equip: si recarregues la pàgina o tornes a obrir el programa, el contingut hi torna a ser. És una xarxa de seguretat, no un substitut de desar el fitxer.

---

## Menús i barra d'eines

Al costat del logotip hi ha els menús **Fitxer**, **Exportar** i **Configuració**. A la dreta, les accions de cada dia en una sola icona: **Desar**, **Exportar**, **Copiar**, **Imprimir**, **Cercar** i **Ajuda**.

* **Fitxer**: `Obrir (Ctrl+O)`, `Importar (Ctrl+Alt+O)` i `Enganxar LaTeX (Ctrl+Maj+V)` porten contingut; `Desar (Ctrl+S)` i `Desar com a… (Ctrl+Maj+S)` el treuen. A l'aplicació d'escriptori acaba amb **Sortir**, que desa abans de tancar.
* **Exportar (Ctrl+Alt+E)**: els sis formats, cadascun amb una línia que diu per a què serveix.
* **Configuració (Ctrl+,)**: **Idioma** de la interfície; **Tema** (Sistema, Clar o Fosc, es recorda); **Finestra independent**, que obre EdiMarkWeb sense pestanyes ni barra d'adreces (només a la versió web); **Corrector ortogràfic**, que subratlla les faltes amb els diccionaris de l'equip i segueix l'idioma del document; i **Opcions generals…**.
* **Imprimir (Ctrl+P)**: una vista preparada per a paper o PDF.
* **Ajuda**: el **Manual (F1)**, **Quant a EdiMarkWeb** —versió, autor i llicències— i, a l'escriptori, **Cercar actualitzacions…**.

La barra d'eines, sota l'anterior, reuneix desfer i refer, negreta, cursiva, encapçalaments (H1…H6), llistes, cites, codi, enllaços, imatges, taules, **citacions bibliogràfiques**, **Enganxar** i les fórmules. Cada botó diu, en passar-hi el ratolí, què fa i amb quina drecera. A les pantalles petites es plega en dos botons, **Accions** i **Format**.

---

## Obrir, importar i arrossegar

* **Obrir (`Ctrl+O`)**: fitxers `.md` i `.markdown`.
* **Importar (`Ctrl+Alt+O`)**: converteix a Markdown amb Pandoc documents `.docx`, `.odt`, `.epub`, `.html` i `.tex`, amb els seus encapçalaments, llistes, taules, enllaços i imatges. D'un `.epub` en torna també l'idioma del llibre.
* **Arrossegar i deixar anar**: deixa sobre l'aplicació un o més fitxers d'aquests mateixos tipus i cadascun s'obre a la seva pestanya. També carpetes senceres: se'n recorren les subcarpetes en ordre alfabètic i el que no sigui compatible s'ignora. Si el document ja era obert, no es duplica: l'aplicació torna a la seva pestanya.

A l'aplicació d'escriptori, `Ctrl+S` escriu sobre el fitxer que has obert; al navegador es descarrega. La carpeta que facis servir es recorda mentre l'aplicació és oberta, així que els següents quadres d'obrir, desar o exportar surten on eres.

---

## Imatges

El botó **Imatge** admet un fitxer del disc o una URL, i pregunta com inserir-lo:

* **Amb ruta relativa** (el recomanat): el document només anomena la imatge —`![Gràfic](imatges/01.png)`—, que es queda a la seva carpeta. És el que fa qualsevol editor de Markdown i manté el `.md` lleuger; a canvi, el document i la seva carpeta d'imatges viatgen junts.
* **Dins del document**: la imatge s'incrusta al fitxer, que es torna autònom però molt més pesat. Útil per enviar un `.md` solt per correu.

**Rutes relatives.** A l'aplicació d'escriptori les imatges es busquen soles a la carpeta del document. Al navegador cap pàgina no pot llegir una carpeta sense permís: si falten imatges, apareix un avís amb el botó **Cercar la seva carpeta…** i, en triar-la, es veuen totes. N'hi ha prou de fer-ho una vegada. En desar, aquestes imatges es copien al costat del `.md` conservant les rutes (o dins d'un ZIP, si el navegador no deixa escriure carpetes). El Markdown no canvia mai: el que deses, copies o exportes duu la ruta que vas escriure.

**Gestor d'imatges.** Sota l'editor Markdown, una llista reuneix les imatges del document. Totes es poden **veure**, **reemplaçar** per una altra enganxada des del porta-retalls, triada del disc o indicada mitjançant un URL, i **eliminar del document**. Les enllaçades mostren la ruta o l'URL i també es poden **incrustar** en Base64; eliminar la referència no esborra el fitxer original ni la imatge remota. En les imatges en línia, la conversió depèn que el servidor permeti descarregar-les; si la bloqueja, el document no canvia. Les que ja estan incrustades mostren el format i la mida i permeten veure'n o copiar-ne el codi.

El codi Base64 ocupa milers de caràcters, per això EdiMarkWeb el plega i deixa a l'editor una marca curta com ara `__EDIMARK_B64_1__`; el contingut real es conserva intacte en desar, copiar i exportar. El botó **Passar les incrustades a la carpeta** fa el camí de tornada: cada imatge es converteix en un fitxer dins de la subcarpeta de recursos del document (`el-meu-fitxer.md` → `el-meu-fitxer/images/`) i al Markdown hi queda la seva ruta. Els fitxers s'escriuen en desar, i `Ctrl+Z` desfà el canvi.

---

## Fórmules matemàtiques

Les fórmules s'escriuen en LaTeX i es componen a l'instant amb KaTeX. Hi ha tres maneres de posar-les:

* **Menú de fórmules** (a l'editor Markdown): `Ctrl+M` obre l'espera —la barra d'estat recorda les tecles— i després `1`, `2`, `3` o `4` tria el delimitador (`$...$`, `$$...$$`, `\(...\)` o `\[...\]`); `Retorn` insereix `$...$` i `Esc` cancel·la.
* **Finestra de fórmula** (a l'editor visual): el botó `{}` —o `Ctrl+M`, que aquí no pregunta pels delimitadors— obre una finestra amb el codi LaTeX i el resultat a la vista mentre escrius, amb l'avís de l'error si n'hi ha. Allà tries si va en línia o en bloc i amb quins delimitadors. Es fa així perquè sobre el full no hi ha on escriure dins d'un `$…$` buit: KaTeX el converteix en fórmula tan bon punt es repinta.
* **EdiCuaTeX (`Ctrl+Alt+M`)**: l'editor visual de fórmules integrat, per construir-les amb el ratolí. En acceptar, la fórmula torna inserida.

### Exemples de fórmules amb LaTeX

#### Fórmula de segon grau

Per resoldre una equació de segon grau com $ax^2 + bx + c = 0$, s'utilitza:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

#### Matriu 2x2

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

#### Altres delimitadors

A més de `$...$` i `$$...$$`, pots fer servir els delimitadors propis de LaTeX: \(E = mc^2\) en línia, i en bloc:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

#### Sumatoris, límits i integrals

La suma dels $n$ primers naturals és $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ i la integral $\int_0^1 x^2\,dx = \frac{1}{3}$. El nombre $e$ es defineix com un límit:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

#### Sistemes d'equacions

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### Símbols solts

Lletres gregues ($\alpha$, $\beta$, $\Omega$), subíndexs ($H_2O$), comparacions ($a \neq b$, $x \leq y$) i conjunts ($\mathbb{R}$, $A \subseteq B$).

---

## Citacions i bibliografia

A **Configuració → Opcions generals… → Citacions** pots carregar una biblioteca **BibTeX** (`.bib`) o **CSL JSON** (`.json`). **Carrega una bibliografia d'exemple** prepara set referències completes; si ja tenies bibliografia, s'hi sumen sense substituir-la. Amb **Afegeix una referència…** pots ampliar la biblioteca carregada —inclosa la d'exemple— o crear-ne una de nova. La clau de citació és opcional: si la deixes buida, el programa en compon una amb el cognom, l'any i una paraula del títol, i s'assegura que no coincideixi amb cap altra. Admet articles, llibres, capítols, informes, pàgines web, tesis i comunicacions, amb els camps específics necessaris per compondre correctament les referències finals. **APA 7** és l'estil inicial; també pots triar Chicago autor-data, MLA 9, IEEE o un fitxer **CSL** propi. També es poden canviar el títol de la bibliografia i el nivell H1–H6. Els fitxers no s'envien a cap servei.

El botó del llibre —o `Ctrl+Alt+B`— obre un cercador per autor, títol, any o clau, amb **Afegeix una referència…** sempre a mà per escriure'n una de nova sense sortir del quadre. La forma **parentètica** produeix `[@garcia2024]`; la **narrativa**, `@garcia2024`; i **només l'any**, `[-@garcia2024]`, quan el nom ja és a la frase. Amb una sola referència pots afegir pàgines o un altre localitzador, com `[@garcia2024, p. 5]` o `@garcia2024 [pp. 5–7]`. Les citacions múltiples usen la forma parentètica. Si el cursor és dins d'una citació, el mateix botó permet editar-ne tots els detalls. La bibliografia final apareix a la vista prèvia i a totes les exportacions.

En desar `el-meu-fitxer.md`, EdiMarkWeb copia la biblioteca a `el-meu-fitxer/references.bib` —o `references.json`— i declara aquesta ruta a les metadades YAML. Les imatges pròpies s'agrupen a `el-meu-fitxer/images/`. Per traslladar el treball n'hi ha prou de conservar junts el Markdown i la carpeta `el-meu-fitxer`. L'aplicació d'escriptori recupera la biblioteca automàticament; per seguretat, a la versió web cal prémer **Vincula la carpeta de recursos…** i triar `el-meu-fitxer` en obrir-lo en un altre navegador o ordinador. L'estil CSL personalitzat continua sent una preferència local del dispositiu.

---

## Cercar i reemplaçar

La lupa (o `Ctrl+F`) obre el cercador, que treballa al plafó on siguis:

* Ressalta totes les coincidències encara que escriguis sense accents o en minúscules. `Retorn` salta a la següent i `Maj+Retorn` recula; el comptador `actual / total` diu per on vas.
* La fletxa lateral desplega el reemplaçament, una a una o totes de cop (amb confirmació).
* El botó **Regex** interpreta la cerca com una expressió regular: allà els accents sí que compten i pots fer servir grups com `(\d+)`, que en el reemplaçament es recuperen amb el signe de dòlar i el número de grup.
* `Esc` el tanca i torna el focus a l'editor. Mentre és obert, les dreceres de format queden en pausa.

---

## Els ajustos de cada document

Al costat del comptador de caràcters, a la barra d'estat, hi ha un botó curt, sempre a la vista, amb l'idioma amb què sortirà el document (`CA`, `ES`, `FR`…). Si es veu atenuat, aquest document no té idioma propi i segueix el general. En prémer-lo s'obre el quadre **Aquest document**, amb dues pestanyes:

* **Document**: idioma, autor, índex automàtic i numeració d'apartats. L'**idioma** és important: viatja dins del fitxer i és el que fa que Word i LibreOffice deixin de corregir en anglès un text en català. Amb *Un altre…* pots escriure el codi de qualsevol llengua (`fr`, `de`, `pt-BR`) i amb *Heretat* es torna al general. Amb l'índex posat, l'editor visual el mostra al principi del full —els apartats amb el seu número de pàgina, trets del repartiment que estàs veient—, sense que formi part del text: no s'hi pot escriure i no arriba ni al Markdown ni al que copiïs. El de debò el genera cada format en exportar.
* **Format**: alineació, tipus i mida de lletra, interlineat, mida del paper, marges, sagnat de primera línia i partició de mots amb guionet. En triar *Una altra…* al tipus de lletra apareix una llista amb les tipografies que l'aplicació reconeix instal·lades; pots escriure qualsevol nom encara que aquí no hi sigui —s'avisa en ambre i se'n fa servir una de reserva—, perquè el fitxer pot acabar en un equip que sí que la tingui. Sota cada camp es llegeix el que hereta ara mateix, i el que no hereta res també ho diu: allà mana el programa que obri el fitxer.

Una pastilla a la barra d'estat resumeix com sortirà el document: la mida de lletra, el tipus i l'interlineat, tots tres sempre. Si algun cop en buides un a les opcions generals, un guionet (`—`) avisa que allà mana el programa que obri el fitxer. La resta —alineació, sagnat, partició i marges— es llegeix en passar-hi el ratolí, i en prémer-la s'obre aquest mateix quadre per la pestanya **Format**.

Tot el que fixis es desa **dins del mateix `.md`**, en unes línies entre ratlles al principi del fitxer:

```
---
lang: "ca"
toc: true
align: "justify"
fontsize: "12pt"
---
```

És la manera estàndard de desar dades sobre un document i molts programes l'entenen. Apareix a l'editor Markdown, que és el codi font, però no a l'editor visual, perquè no és contingut. El que deixis en *Heretat* segueix **Configuració → Opcions generals…**, i el mateix quadre duu un enllaç, *Editar les opcions generals…*, que obre aquestes opcions per la mateixa pestanya. *Treure-ho tot del document* el deixa sense res propi.

El format s'aplica a l'editor visual i als cinc formats d'exportació, amb tres excepcions: a l'**EPUB** els marges són un suggeriment, perquè mana el lector de llibres; en **TEX**, si el teu preàmbul ja carrega `geometry`, manen els teus marges i l'aplicació ho avisa; i la **partició de mots** fa servir els diccionaris de guionets del sistema (a Linux, el LibreOffice necessita el paquet de l'idioma, per exemple `hyphen-ca`).

---

## Exportar

**Exportar (Ctrl+Alt+E)** genera el document llest per lliurar o publicar:

* **DOCX (Word)**: per compartir amb qui fa servir Word; també l'obre Google Docs.
* **ODT (LibreOffice)**: per a suites lliures com LibreOffice o OnlyOffice.
* **EPUB (llibre digital)**: compatible amb lectors d'EPUB 3. El títol surt del primer encapçalament de nivell 1 (o del nom del document) i l'autor, la portada i l'idioma, dels ajustos.
* **HTML (pàgina web)**: un fitxer autònom amb els estils i les fórmules a dins, llest per pujar a la web.
* **TEX (LaTeX)**: un `.tex` complet amb la capçalera preparada per compilar.
* **PDF**: obre el diàleg d'impressió, on tries «Desar com a PDF». Surt exactament el que veus, amb les fórmules compostes i el text seleccionable. Els marges són els del document; si no en duu cap, 18 mm.

A la barra hi ha també un botó d'exportar amb la seva fletxa, al costat del de copiar: el botó repeteix d'un clic l'últim format que vas fer servir —ho diu en un rètol petit, i de partida és DOCX— i la fletxa obre aquesta mateixa llista.

Si has carregat una bibliografia, tots els formats resolen les citacions `[@clau]` i afegeixen la llista de referències amb l'estil CSL triat.

### Opcions generals dels documents

**Configuració → Opcions generals…** desa els valors de partida per a tots els documents, i es recorden d'una sessió a l'altra. Té cinc pestanyes:

* **Dades i índex**: **idioma** (per omissió, el mateix de la interfície), **autor** —que apareix a les propietats del fitxer i a la portada de l'EPUB i del LaTeX; deixa'l buit si no vols que el Pandoc escrigui la línia del nom en DOCX i ODT—, **índex automàtic** i **numerar els apartats** (1, 1.1, 1.2…; l'ODT no admet aquesta numeració).
* **Text i pàgina**: els mateixos ajustos de text i pàgina de l'apartat anterior, com a valors de partida. Quatre ja vénen posats —**12 pt**, **amb serifa**, interlineat **1,5** i paper **A4**—, perquè són els que l'editor visual necessita per ensenyar la veritat: declarats, el que es veu al full és el que surt en els cinc formats. La resta surten sense fixar.
* **EPUB**: la **portada**, que pot ser la que **genera** l'aplicació amb el títol i l'autor, **una imatge teva** (fins a 1 MB) o **cap**.
* **Citacions**: la biblioteca BibTeX o CSL JSON i, opcionalment, l'estil CSL que s'aplicarà en exportar.
* **LaTeX**: la **classe** (`article`, `report` o `book`), les seves **opcions** (`12pt, a4paper`) i un **preàmbul** propi, que s'insereix just abans de `\begin{document}`. Un preàmbul amb errors no avisa aquí: la fallada apareix en compilar.

> **Sobre l'índex**: en DOCX i ODT és un camp que calcula el processador de textos, així que el document s'obre amb la llista d'apartats però sense números de pàgina. Perquè surtin, actualitza'l: al Word, clic dret sobre l'índex → *Actualitzar camps*; al LibreOffice, *Eines → Actualitza → Índexs*.

La profunditat permet limitar-lo a H1, H1–H2 o H1–H3. A **Text i pàgina** també pots triar orientació vertical o horitzontal i fer que cada H1, tret del primer, comenci en una pàgina nova; la vista prèvia i les exportacions respecten els tres ajustos.

Si el document comença amb les seves pròpies metadades YAML, manen elles.

---

## Copiar sense descarregar

El botó de copiar, al costat d'**Exportar**, fa el mateix però al porta-retalls, en quatre formats:

* *Markdown* (`Ctrl+Alt+C` i després `1`): el text font tal qual.
* *HTML* (`Ctrl+Alt+C 2`): el document compost. És l'opció per portar el text **amb el seu format** al Word, al LibreOffice, a Google Docs o al correu, sense passar per cap fitxer. Dos avisos: les fórmules s'enganxen com a text —per a equacions de debò, exporta a DOCX o ODT— i les imatges només viatgen si estan incrustades.
* *LaTeX* (`Ctrl+Alt+C 3`): només el fragment actual.
* *LaTeX complet* (`Ctrl+Alt+C 4`): amb capçalera i entorn llestos per compilar.

El botó recorda l'últim format i ho diu en un rètol al seu costat, així que repetir és un clic; la fletxa obre la llista per canviar-lo.

---

## L'aplicació d'escriptori

És la mateixa aplicació —els mateixos menús, dreceres i formats— instal·lada a **Linux, Windows i macOS**. Els instal·ladors són a la [pàgina de descàrregues](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest): `.deb` i `.AppImage` per a Linux, `.exe` i `.msi` per a Windows, i `.dmg` per a Mac amb processador Apple o Intel.

Respecte al navegador hi afegeix:

* **Doble clic per obrir**: els fitxers `.md` i `.markdown` queden associats, mostren la icona d'EdiMarkWeb al gestor de fitxers i s'obren a l'aplicació; si ja és oberta, el document arriba a aquesta mateixa finestra, que es posa al davant. I si aquell fitxer ja era obert, torna a la seva pestanya en comptes de duplicar-se. (La icona la instal·len el paquet `.deb` i els instal·ladors de Windows; l'AppImage no toca el sistema.)
* **Desar escriu al fitxer de veritat**, sense passar per la carpeta de descàrregues.
* **Corrector ortogràfic del sistema**, amb els diccionaris de l'equip (a Linux pot caldre instal·lar-los, per exemple `hunspell-ca`).
* **Funciona sense connexió**: duu a dins el Pandoc i l'EdiCuaTeX. Només cal internet per comprovar si hi ha versions noves.

**Actualitzacions**: en arrencar comprova un cop al dia si hi ha versió nova i, si n'hi ha, apareix un avís amb **Descarregar i instal·lar**, que baixa l'instal·lador i el llança. Com que cap instal·lador no pot substituir els fitxers d'una aplicació oberta, el mateix avís duu **Tancar EdiMarkWeb**, que desa i tanca. Amb una AppImage, l'aplicació descarrega la nova i obre la seva carpeta perquè substitueixis l'anterior. Pots demanar la comprovació quan vulguis des d'**Ajuda → Cercar actualitzacions…**, o desactivar-la amb la casella **Comprovar en iniciar**.

Els documents són els mateixos fitxers Markdown a les dues versions i passen d'una a l'altra sense conversions; el que no es comparteix és el desament automàtic, perquè cada versió en guarda la còpia de treball al seu propi espai.

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
| Imbricar / desimbricar un punt de llista | `Tab` / `Maj` + `Tab` | `Tab` / `Maj` + `Tab` |
| Pujar un nivell (en un punt buit) | `Retorn` | `Retorn` |
| Codi | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Enllaç | `Ctrl` + `K` | `Cmd` + `K` |
| Imatge | `Ctrl` + `Maj` + `I` | `Cmd` + `Maj` + `I` |
| Taula | `Ctrl` + `Maj` + `T` | `Cmd` + `Maj` + `T` |
| Fórmula `$...$` (en línia) | `Ctrl` + `M` després `1` | `Cmd` + `M` després `1` |
| Fórmula `$$...$$` (en bloc) | `Ctrl` + `M` després `2` | `Cmd` + `M` després `2` |
| Fórmula `\(...\)` (en línia) | `Ctrl` + `M` després `3` | `Cmd` + `M` després `3` |
| Fórmula `\[...\]` (en bloc) | `Ctrl` + `M` després `4` | `Cmd` + `M` després `4` |
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
| Copiar (`1` Markdown · `2` HTML · `3` LaTeX · `4` LaTeX complet) | `Ctrl` + `Alt` + `C` després `1`–`4` | `Cmd` + `Alt` + `C` després `1`–`4` |
| Obrir Configuració | `Ctrl` + `,` | `Cmd` + `,` |
| Maximitzar l'àrea d'edició | `Ctrl` + `Maj` + `F` | `Cmd` + `Maj` + `F` |
| Canviar disposició | `Ctrl` + `L` | `Cmd` + `L` |
| Cercar | `Ctrl` + `F` | `Cmd` + `F` |
| Ampliar / reduir el plafó on ets | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual d'ús | `Ctrl` + `H` o `F1` | `Cmd` + `H` o `F1` |
| Recarregar el manual | `Ctrl` + `Maj` + `H` | `Cmd` + `Maj` + `H` |
| Imprimir | `Ctrl` + `P` | `Cmd` + `P` |

Les dreceres d'una sola lletra actuen sobre el document, així que queden en pausa mentre el cercador és obert.

---

## Llicència i contribucions

EdiMarkWeb és programari lliure sota la [GNU Affero General Public License v3.0](LICENSE): pots fer-lo servir a l'aula, adaptar-lo i desplegar-lo en servidors propis, sempre que comparteixis qualsevol millora sota la mateixa llicència i ofereixis el codi a qui faci servir la teva versió. Si detectes un problema o vols proposar canvis, obre una incidència a [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) o envia un pull request.
