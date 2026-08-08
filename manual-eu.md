![EdiMarkWeb-en logotipoa](logo_100px.png)

# EdiMarkWeb eskuliburua

Ongi etorri EdiMarkWeb-era, **Markdown testu-editore** bat, azkar lan egin, hainbat formatutara esportatu eta LaTeX bidezko matematika konplikaziorik gabe gehitu behar duten irakasle eta eduki-sortzaileentzat diseinatua. Dena nabigatzailean bertan funtzionatzen du, eta dokumentuak modu seguruan gordetzen dira zure ekipoan.

## Nabarmentzekoak

- Edizio bikoitza: Markdown-en zein HTML aurrebistan zuzenean lan egin dezakezu, beti sinkronizatuta.
- Esportatzeko eta inportatzeko menuak, DOCX, ODT, EPUB, HTML eta LaTeX onartzen dituztenak, arbelera zuzenean kopiatzeko aukerekin.
- Bilatzailea ordezkapenarekin: bat-etortzeak nabarmentzen ditu eta azenturik gabeko terminoak onartzen ditu, maiuskulak eta minuskulak bereizi gabe.
- **Ezarpenak** menua, hizkuntza, testuaren tamaina, gaia, lan-zabalera eta leiho independentea leku berean bilduta.
- Interfazearen gaia hiru aukerarekin —Sistemakoa, Argia eta Iluna— eta saioen artean gogoratzen da.
- Formulen menu berritua eta EdiCuaTeX-erako sarbide zuzena adierazpen konplexuak eraikitzeko.
- Hainbat fitxategi ireki editorera arrastatuz (bakoitza bere fitxan): Markdown eta baita DOCX, ODT, EPUB, HTML edo TEX ere, Pandoc-ekin bat-batean bihurtzen direnak.

## Itsatsi edozein eduki

> **Garrantzitsua:** **arbeleko edozein objektu** itsats dezakezu: testu soila, Word edo LibreOffice zatiak, HTML osoa, chatbot batek sortutako formulak eta baita zuzenean kopiatutako irudiak ere. Erabili `Ctrl+V`/`Cmd+V` edo tresna-barrako arbelaren ikonoa duen botoia (`Itsatsi`), eta EdiMarkWeb-ek dagokion panelean jarriko du edukia:

- Markdown edo formaturik gabeko testua ezkerreko panelean txertatzen da, kurtsorearen kokapena zehatz-mehatz errespetatuz.
- Eduki aberastua (HTML, DOCX, nabigatzailetik itsatsia, etab.) eskuineko panelean berriro kalkulatzen da eta, aldi berean, dagokion Markdown-a sortzen da bi ikuspegiak sinkronizatuta mantentzeko.

Horrek tarteko urratsak ezabatzen ditu: kopiatu zure iturri gogokoenetik eta egin klik **Itsatsi** aukeran, etenik gabe editatzen jarraitzeko.

## Bideoak

Ondorengo bideoek, **audiorik gabe eta etengabe erreproduzitzen direnak**, ohiko ekintza batzuk erakusten dituzte.

### Txataren edukia zuzenean kopiatzea

Edozein txatetako emaitza kopiatu eta EdiMarkWeb-en itsats dezakegu aldatzeko, gordetzeko edo esportatzeko. Hori edozein chatbot-ekin egin dezakegu, ChatGPT-rekin izan ezik, urrats gehigarri bat behar baitu (ikus behean).

![Txataren edukia zuzenean kopiatzea](imagenes/googledocs.gif)

### ChatGPT

ChatGPT-k LaTeX estandarra erabiltzeari utzi dio; beraz, formulak Markdown kutxa batean eskatu behar zaizkio. Gainera, bideoan DOCX formatuan nola esportatu eta Google Drive-ra nola igo agertzen da:

![ChatGPT eta Google](imagenes/chatgpt_google.gif)

### EdiMarkWeb-en formulak idaztea

![EdiMarkWeb-en formulak idaztea](imagenes/formulas.gif)

### Gemini-rekin sortutako LaTeX

Canvas bat egiten dugunean, Gemini-ri PDF bat egiteko eska diezaiokegu. PDF horrek LaTeX kodea erabiltzen du, eta zuzenean EdiMarkWeb-en itsats dezakegu.

![EdiMarkWeb-en formulak idaztea](imagenes/gemini_pdf.gif)

---

## Dokumentuen kudeaketa (fitxak)

Egin lan hainbat dokumenturekin aldi berean, bakoitza bere fitxan.

* **Fitxak sortu**: sakatu `+` botoia (edo `Ctrl+T`) dokumentu huts bat irekitzeko.
* **Fitxaz aldatu**: egin klik izenean bere edukia erakusteko.
* **Berrizendatu**: egin klik bikoitza izenburuan izen deskribatzaileago bat jartzeko (adib. «3. gaia – Ekuazioak»).
* **Fitxak itxi**: sakatu `X`. Gorde gabeko aldaketarik badago, aplikazioak abisu bat erakutsiko du.
* **Gorde gabeko aldaketak**: puntu gorri batek (`●`) adierazten du aldaketak zain daudela.
* **Gordetze automatikoa**: fitxa bakoitzak kopia bat gordetzen du automatikoki nabigatzailean; orria birkargatzen baduzu, edukia berriro agertuko da.

---

## Goiko kontrol-barra

Logotipoaren ondoko barrak aplikazioaren aukera orokorrak biltzen ditu eta fitxategiaren ekintza guztiak botoi zabalgarri bakar batean elkartzen ditu:

* **Fitxategia**: dokumentuaren gaineko ekintzak bi multzotan biltzen ditu. Lehenik edukia ekartzen dutenak —`Ireki (Ctrl+O)`, `Inportatu` eta `Itsatsi LaTeX (Ctrl+Shift+V)`— eta ondoren ateratzen dutenak: `Gorde (Ctrl+S)` eta **Esportatu** azpimenua, eskuinera zabaltzen dena DOCX, ODT, EPUB, HTML eta TEX aukerekin. Aukera bakoitzak bere teklatu-lasterbidea erakusten du.
* **Ezarpenak**: aplikazioaren ezarpen guztiak biltzen ditu, bakoitza uneko balioa adierazten duen azpimenu batekin.
  * **Hizkuntza**: interfazearen hizkuntza aldatzen du.
  * **Testuaren tamaina**: txikia, normala, handia edo oso handia.
  * **Gaia**: `Sistemakoa` aukerak ekipoarena jarraitzen du eta harekin batera aldatzen da; `Argia` eta `Iluna` aukerek finkatu egiten dute. Aukeraketa gogoratu egiten da aplikazioa hurrengoan irekitzean.
  * **Zabalera hedatua**: lan-azalera zabaltzen du.
  * **Leiho independentea**: EdiMarkWeb bere leiho batean irekitzen du, mahaigaineko aplikazio gisa.
* **Inprimatu (Ctrl+P)**: papererako edo PDFrako prest dagoen ikuspegia sortzen du uneko estiloekin.
* **Bilatu (Ctrl+F)** eta **Eskuliburua (Ctrl+H)**: bilatzaile aurreratua edo dokumentu hau bera irekitzen dituzte.
* **Ezabatu dena**: dokumentu aktiboa erabat hustutzen du, berrespena eskatu ondoren.

Panelen antolaketa `Ctrl+L` teklarekin edo panel bakoitzaren goiburuko geziekin aldatzen da.

---

## Tresna-barra

Goiko barraren azpiko marra grisak formaturako eta elementuetarako sarbide azkarrak ditu:

* **Oinarrizko estiloak**: lodia, etzana eta izenburuen menua (H1…H6).
* **Zerrendak eta aipuak**: buletak, zenbakitzea eta aipu-blokeak, beren lasterbideekin.
* **Kodea, estekak, irudiak eta taulak**: elkarrizketa-koadroen bidezko txertaketa gidatua.
* **LaTeX formulak**: lerroko edo blokeko aginduak sintaxi zuzenarekin txertatzeko menua.
* **EdiCuaTeX**: kanpoko laguntzailea leiho berri batean irekitzen du. Onartzean, formula editorean txertatuta itzultzen da.

Botoi bakoitzak deskribapen bat erakusten du sagua gainetik pasatzean, eta baliokidea den teklatu-lasterbidea adierazten du.

---

## Bilatu eta ordezkatu

Lupa-botoiak (edo `Ctrl+F`) bilaketa aurreratuko panel bat irekitzen du:

* Bilaketa-koadroak bat-etortze guztiak nabarmentzen ditu, azenturik edo maiuskularik kontuan hartu gabe ere.
* Erabili `Enter` hurrengo bat-etortzera joateko eta `Shift+Enter` atzera egiteko.
* Sakatu alboko gezia ordezkatze-panela erakusteko. Bat-etortzeak banan-banan edo denak batera ordezka ditzakezu (berrespenarekin).
* `unekoa / guztira` kontagailuak aurrerapena jarraitzen laguntzen dizu.

Bilaketak Markdown ikuspegian zein HTML ikuspegian funtzionatzen du, fokua non duzun.

---

## Interfaze nagusia

Lan-eremua tamainaz alda daitezkeen bi paneletan banatzen da:

* **Markdown** (ezkerra): testu-editorea nabarmentzearekin, aukerako zenbakitzearekin eta kopiatzeko kontrolekin. Hemen idazten duzun guztia berehala islatzen da eskuineko panelean.
* **HTML / Aurrebista** (eskuina): azken emaitza erakusten du eta edukia zuzenean editatzeko aukera ere ematen du. Erabili kode-ikonoa duen botoia aurrebista aberatsaren eta sortutako HTML kodearen artean txandakatzeko.
* **Edukia kopiatu**: Markdown-a edo sortutako HTMLa kopiatzeko botoi zehatzak (HTMLa kopiatzean LaTeX-era bihurtutako formulak barne).

Erdiko barra arrasta dezakezu edozein paneli leku gehiago emateko.

---

## Aurrebista interaktiboa

* Egin klik eskuineko panelean emaitzaren gainean zuzenean editatzeko: aldaketak Markdown-arekin sinkronizatzen dira, formatua mantenduz edizioa bateragarria den bitartean.
* Aurrebistak hautaketak, kopiatu eta itsatsi, eta oinarrizko lasterbideak (Ctrl+B/I, izenburuak, etab.) onartzen ditu, Markdown editoreak bezalaxe.
* Eutsi `Ctrl` teklari (edo `Cmd` macOS-en) eta egin klik estekak nabigatzailearen fitxa berri batean irekitzeko.
* LaTeX formulak automatikoki errendatzen dira KaTeX-ekin; editatzean beren jatorrizko sintaxira itzultzen dira.

---

## Ekintza nagusiak

* **Ireki (`Ctrl+O`)**: `.md` edo `.markdown` fitxategiak inportatzen ditu.
* **Inportatu**: beste formatu batzuetako dokumentuak Markdown-era bihurtzen ditu Pandoc bidez: `.docx`, `.odt`, `.epub`, `.html` eta `.tex`. Izenburuak, zerrendak, taulak eta estekak berreskuratzen dira, eta baita irudiak ere: `.docx`, `.odt` edo `.epub` batetik datozenean, fitxategitik bertatik ateratzen dira eta Markdown-ean kapsulatuta geratzen dira; horrela, aurrebistan ikusten dira eta zurekin bidaiatzen dute esportatzean.
* **Gorde (`Ctrl+S`)**: uneko dokumentua zure ekipora deskargatzen du.
* **Edukia kopiatu**: ezkerreko panelak Markdown-a kopiatzeko botoi bat du; aurrebistan zer kopiatuko den aukera dezakezu (errendatutako HTMLa edo LaTeX aldaerak) kopiatzeko ikonoaren ondoko menu zabalgarritik.
* **Ezabatu dena**: dokumentua berrezartzen du berrespen baten ondoren.
* **Gaia, antolaketa edo zabalera aldatu**: **Ezarpenak** menutik (gaia eta zabalera) eta `Ctrl+L` teklarekin (panelen antolaketa) interfazea egoera bakoitzera egokitzen duzu: arbel digitala, eramangarria, etab.
* **Eskuliburua**: dokumentu hau beti eguneratuta duzu `Ctrl+H` bidez.

---

## Esportatu

Ireki **Fitxategia** botoia eta hautatu `Esportatu` entregatzeko edo argitaratzeko prest dauden bertsioak deskargatzeko:

* **DOCX (Microsoft Word)**: aproposa Word erabiltzen duten ikasleekin edo lankideekin partekatzeko, eta Google Docs-ekin bateragarria.
* **ODT (LibreOffice)**: LibreOffice edo OnlyOffice bezalako suite libreetarako pentsatua.
* **EPUB (liburu digitala)**: EPUB 3 irakurgailuekin bateragarria den liburu elektroniko bat sortzen du (Calibre, Apple Liburuak, Thorium, tinta elektronikoa…). Izenburua 1. mailako lehen goiburutik hartzen da (edo dokumentuaren izenetik), eta hizkuntza, aplikazioan hautatutakotik.
* **HTML (web-orria)**: fitxategi autonomo bat sortzen du, estiloak eta formulak kapsulatuta dituena, webean ostatatzeko prest.
* **TEX (LaTeX)**: `.tex` dokumentu oso bat sortzen du, konpilatzeko prest dagoen goiburuarekin.

Esportatzen den bitartean, goiko barrak egoera-mezuak erakusten ditu (aurrerapena, arrakasta edo erroreak).

---

## Kopiatu eta partekatu deskargatu gabe

* **Markdown kopiatu**: ezkerreko panelean botoi zuzena, iturburu-testua arbelera bidaltzeko.
* **Aurrebistatik kopiatu**: eskuineko panelaren kopiatzeko botoiak zure azken aukeraketa gogoratzen du:
  * *HTML kopiatu* (ikusten duzun bezala errendatuta).
  * *LaTeX kopiatu* (uneko zatia soilik).
  * *LaTeX kopiatu – dokumentu osoa* (goiburua eta ingurunea barne, konpilatzeko prest).

Aukera bakoitzak arrakasta-jakinarazpen bat erakusten du eta, dagokionean, LaTeX markaketa automatikoki prestatzen du errendatutako aurrebistatik abiatuta.

---

## Fitxategiak arrastatu eta jaregin

Arrastatu fitxategi bat edo gehiago aplikazioaren gainera. `.md` eta `.markdown` onartzen dira, zuzenean irekitzen direnak, eta `.docx`, `.odt`, `.epub`, `.html` eta `.tex`, ireki aurretik Pandoc-ekin Markdown-era bihurtzen direnak:

* Marko argiztatu bat ikusiko duzu, jaregin ditzakezula berresten duena.
* Fitxategi bakoitza bere fitxan irekiko da, jatorrizko izenarekin.
* Edukia lineaz kanpo erabilgarri geratzen da gordetze automatikoari esker. Karpeta osoak ere arrasta ditzakezu sistemaren fitxategi-kudeatzailetik; fitxategi bateragarri bakoitza bere fitxan irekiko da.

---

## Teklatu-lasterbideak

| Ekintza | Lasterbidea (Windows/Linux) | Lasterbidea (macOS) |
| :--- | :--- | :--- |
| **Formatua** | | |
| Lodia | `Ctrl` + `B` | `Cmd` + `B` |
| Etzana | `Ctrl` + `I` | `Cmd` + `I` |
| 1-6 izenburuak | `Ctrl` + `1..6` | `Cmd` + `1..6` |
| Buletadun zerrenda | `Ctrl` + `Shift` + `L` | `Cmd` + `Shift` + `L` |
| Zenbakidun zerrenda | `Ctrl` + `Shift` + `O` | `Cmd` + `Shift` + `O` |
| Kodea | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| **Dokumentuen kudeaketa** | | |
| Fitxa berria | `Ctrl` + `T` | `Cmd` + `T` |
| Fitxa itxi | `Ctrl` + `W` | `Cmd` + `W` |
| Gorde | `Ctrl` + `S` | `Cmd` + `S` |
| Fitxategia ireki | `Ctrl` + `O` | `Cmd` + `O` |
| Itsatsi LaTeX (elkarrizketa ireki) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interfazea** | | |
| Antolaketa aldatu | `Ctrl` + `L` | `Cmd` + `L` |
| Bilatu | `Ctrl` + `F` | `Cmd` + `F` |
| Erabiltzailearen eskuliburua | `Ctrl` + `H` | `Cmd` + `H` |
| Inprimatu | `Ctrl` + `P` | `Cmd` + `P` |

---

## LaTeX formulen adibideak

### Bigarren mailako formula

$ax^2 + bx + c = 0$ bezalako bigarren mailako ekuazio bat ebazteko, hau erabiltzen da:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

### 2x2 matrizea

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

### Beste mugatzaile batzuk

`$...$` eta `$$...$$` ez ezik, LaTeX-en mugatzaileak ere erabil ditzakezu: \(E = mc^2\) lerroan, eta blokean:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

### Batukariak, limiteak eta integralak

Lehen $n$ zenbaki naturalen batura $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ da, eta integrala $\int_0^1 x^2\,dx = \frac{1}{3}$. $e$ zenbakia limite gisa definitzen da:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### Ekuazio-sistemak

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

### Sinbolo solteak

Greziar letrak ($\alpha$, $\beta$, $\Omega$), azpiindizeak ($H_2O$), konparazioak ($a \neq b$, $x \leq y$) eta multzoak ($\mathbb{R}$, $A \subseteq B$).

Bisualki eraikitzea nahiago baduzu, hautatu testua editorean eta ireki **EdiCuaTeX**: formula automatikoki txertatuta itzuliko da.

---

## Ideiak irakasleentzat

* **Apunteak eta laburpenak**: konbinatu testua formulekin eta estekekin zure ikasgela birtualean partekatzeko.
* **Azterketak eta ariketak**: esportatu DOCX/ODT formatura inprimatzeko edo geroago editatzeko.
* **Txantiloi berrerabilgarriak**: gorde dokumentuak HTML autonomo gisa Moodle-ra, blogetara edo GitHub Pages-era igotzeko.
* **Ikasleen lana**: gonbidatu itzazu Markdown-en idaztera; gordetze automatikoarekin ez dute aurrerapenik galduko.

---

## Lizentzia eta ekarpenak

EdiMarkWeb software librea da [GNU Affero General Public License v3.0](LICENSE) lizentziapean. Horrek esan nahi du aplikazioa zure ikasgelan erabil dezakezula, egokitu eta zure zerbitzarietan zabaldu, betiere edozein hobekuntza lizentzia beraren pean partekatzen baduzu eta zure bertsioa erabiltzen dutenei kodea eskaintzen badiezu. Arazoren bat aurkitzen baduzu edo aldaketak proposatu nahi badituzu, ireki gorabehera bat [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues)-en edo bidali pull request bat.
