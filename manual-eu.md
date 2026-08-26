![EdiMarkWeb-en logotipoa](logo_100px.png)

# EdiMarkWeb eskuliburua

Ongi etorri EdiMarkWeb-era, **Markdown testu-editore** bat, azkar lan egin, hainbat formatutara esportatu eta LaTeX bidezko matematika konplikaziorik gabe gehitu behar duten irakasle eta eduki-sortzaileentzat diseinatua. **Nabigatzailean** erabil dezakezu, ezer instalatu gabe, edo **mahaigaineko aplikazio gisa instalatu** Linux, Windows eta macOS sistemetan. Bi kasuetan lana zure ekipoan gertatzen da: ez dokumentuak ez irudiak ez dira handik ateratzen.

## Nabarmentzekoak

- Edizio bikoitza: Markdown-en zein HTML aurrebistan zuzenean lan egin dezakezu, beti sinkronizatuta.
- Esportatzeko eta inportatzeko menuak, DOCX, ODT, EPUB, HTML eta LaTeX onartzen dituztenak, arbelera zuzenean kopiatzeko aukerekin.
- Bilatzailea ordezkapenarekin: bat-etortzeak nabarmentzen ditu eta azenturik gabeko terminoak onartzen ditu, maiuskulak eta minuskulak bereizi gabe.
- **Ezarpenak** menua, hizkuntza, testuaren tamaina, gaia eta leiho independentea leku berean bilduta; lan-zabalera panelen kontrolen ondoan aldatzen da.
- Interfazearen gaia hiru aukerarekin —Sistemakoa, Argia eta Iluna— eta saioen artean gogoratzen da.
- Formulen menu berritua eta EdiCuaTeX-erako sarbide zuzena adierazpen konplexuak eraikitzeko.
- Hainbat fitxategi, edo karpeta osoak, ireki editorera arrastatuz (fitxategi bakoitza bere fitxan): Markdown eta baita DOCX, ODT, EPUB, HTML edo TEX ere, Pandoc-ekin bat-batean bihurtzen direnak.
- Adierazpen erregularrekin bilatzeko aukera eta pantaila osoko edizio-modua, distrakziorik gabe lan egiteko.
- **Dokumentu bakoitzaren hizkuntza**, fitxategiaren barruan bertan gordeta eta karaktere-kontagailuaren ondoan ikusgai. Bost formatuek adierazten dute, eta, beraz, Word-ek eta LibreOffice-k ez dute ingelesez zuzentzen euskarazko testu bat.
- **Esportazio-aukerak** leku berean: egilea, EPUBaren azala, aurkibide automatikoa, atalen zenbakitzea eta, LaTeX-erako, klasea, bere aukerak eta atariko propio bat.
- **Mahaigaineko aplikazioa** Linux, Windows eta macOS sistemetarako: dokumentuak klik bikoitzarekin lotuta, jatorrizko fitxategiaren gainean gordetzea, sistemaren zuzentzaile ortografikoa eta konexiorik gabe funtzionatzea.
- **Bertsio berrien abisua** mahaigaineko aplikazioan, aplikaziotik bertatik deskargatu eta instalatzeko aukerarekin.

## Itsatsi edozein eduki

> **Garrantzitsua:** **arbeleko edozein objektu** itsats dezakezu: testu soila, Word edo LibreOffice zatiak, HTML osoa, chatbot batek sortutako formulak eta baita zuzenean kopiatutako irudiak ere. Erabili `Ctrl+V`/`Cmd+V` edo tresna-barrako arbelaren ikonoa duen botoia (`Itsatsi`), eta EdiMarkWeb-ek dagokion panelean jarriko du edukia:

- Markdown edo formaturik gabeko testua ezkerreko panelean txertatzen da, kurtsorearen kokapena zehatz-mehatz errespetatuz.
- Eduki aberastua (HTML, DOCX, nabigatzailetik itsatsia, etab.) eskuineko panelean berriro kalkulatzen da eta, aldi berean, dagokion Markdown-a sortzen da bi ikuspegiak sinkronizatuta mantentzeko.

Horrek tarteko urratsak ezabatzen ditu: kopiatu zure iturri gogokoenetik eta egin klik **Itsatsi** aukeran, etenik gabe editatzen jarraitzeko.

**Irudia** botoiak diskoko fitxategi bat aukeratzeko aukera ere ematen du, URL bat idazteaz gain, eta nola txertatu nahi duzun galdetzen dizu:

* **Bide erlatiboarekin** (gomendatua, eta markatuta datorrena): dokumentuak irudia izendatzen du besterik ez —`![Grafikoa](irudiak/01.png)`—, eta irudia dagoen lekuan geratzen da. Markdown editore orok egiten duena da, eta horrek `.md` fitxategia arina eta irakurgarria mantentzen du; horren truke, dokumentua eta bere irudi-karpeta elkarrekin bidaiatzen dute.
* **Dokumentuaren barruan**: irudia fitxategiaren barruan kapsulatzen da; dokumentua bere kabuz nahikoa da, baina askoz astunagoa. Egokia `.md` bakar bat postaz bidaltzeko.

Mahaigaineko aplikazioan bidea dokumentuaren karpetatik kalkulatzen da. Nabigatzailean ez dago irudiaren karpeta ezagutzerik, beraz izena baino ez da idazten, eta horren berri ematen zaizu.

---

## Dokumentuen kudeaketa (fitxak)

Egin lan hainbat dokumenturekin aldi berean, bakoitza bere fitxan.

* **Fitxak sortu**: sakatu `+` botoia (edo `Ctrl+T`) dokumentu huts bat irekitzeko.
* **Fitxaz aldatu**: egin klik izenean bere edukia erakusteko, edo pasa batetik bestera `Ctrl+Tab` erabiliz.
* **Berrizendatu**: egin klik bikoitza izenburuan izen deskribatzaileago bat jartzeko (adib. «3. gaia – Ekuazioak»).
* **Fitxak itxi**: sakatu `X`. Gorde gabeko aldaketarik badago, aplikazioak abisu bat erakutsiko du.
* **Gorde gabeko aldaketak**: puntu gorri batek (`●`) adierazten du aldaketak zain daudela.
* **Gordetze automatikoa**: fitxa bakoitzak kopia bat gordetzen du berez ekipoan, aplikazioaren espazio propioan; orria birkargatzen baduzu edo programa berriro irekitzen baduzu, edukia berriro agertuko da. Segurtasun-sarea da, ez fitxategia gordetzearen ordezkoa.

---

## Goiko kontrol-barra

Logotipoaren ondoko barrak aplikazioaren aukera orokorrak biltzen ditu eta fitxategiaren ekintza guztiak botoi zabalgarri bakar batean elkartzen ditu:

* **Fitxategia**: dokumentuaren gaineko ekintzak bi multzotan biltzen ditu. Lehenik edukia ekartzen dutenak —`Ireki (Ctrl+O)`, `Inportatu (Ctrl+Alt+O)` eta `Itsatsi LaTeX (Ctrl+Shift+V)`— eta ondoren ateratzen dutenak: `Gorde (Ctrl+S)`, `Gorde honela… (Ctrl+Shift+S)` eta **Esportatu** azpimenua, eskuinera zabaltzen dena DOCX, ODT, EPUB, HTML eta TEX aukerekin. Aukera bakoitzak bere teklatu-lasterbidea erakusten du. Mahaigaineko aplikazioan menua **Irten** aukerarekin amaitzen da: uneko dokumentua gorde eta aplikazioa ixten du.
* **Ezarpenak**: aplikazioaren ezarpen guztiak biltzen ditu, bakoitza uneko balioa adierazten duen azpimenu batekin.
  * **Hizkuntza**: interfazearen hizkuntza aldatzen du.
  * **Testuaren tamaina**: txikia, normala, handia edo oso handia.
  * **Gaia**: `Sistemakoa` aukerak ekipoarena jarraitzen du eta harekin batera aldatzen da; `Argia` eta `Iluna` aukerek finkatu egiten dute. Aukeraketa gogoratu egiten da aplikazioa hurrengoan irekitzean.
  * **Leiho independentea**: EdiMarkWeb nabigatzailearen leiho propio batean irekitzen du, fitxarik eta helbide-barrarik gabe. Web bertsioan bakarrik agertzen da; mahaigaineko aplikazioa dagoeneko leiho propioa da.
  * **Zuzentzaile ortografikoa**: Markdown paneleko akatsak azpimarratzen ditu ordenagailuan instalatutako hiztegiekin, dokumentuaren hizkuntzari jarraituz. Aktibatuta dator; desmarkatuz gero itzali egiten da eta aukera gogoratu egiten da.
  * **Bilatu eguneraketak…**: mahaigaineko aplikazioan bakarrik agertzen da. Bertsio berriagorik dagoen begiratzen du eta, halakorik badago, ohar bat erakusten du **Deskargatu eta instalatu** botoiarekin: zure sistemaren instalatzailea deskargatu eta irekitzen du. Aplikazioak berak egunean behin egiten du egiaztapena abiaraztean; oharreko **Egiaztatu abiaraztean** laukiak desaktibatzeko aukera ematen du.
  * **Esportazio-aukerak…**: aplikazioak sortzen dituen fitxategien ezarpenak irekitzen ditu (hizkuntza eta, LaTeX-erako, klasea eta atarikoa), behean azalduta.
* **Inprimatu (Ctrl+P)**: papererako edo PDFrako prest dagoen ikuspegia sortzen du uneko estiloekin.
* **Bilatu (Ctrl+F)** eta **Eskuliburua (Ctrl+H)**: bilatzaile aurreratua edo dokumentu hau bera irekitzen dituzte.
* **Honi buruz**: instalatutako bertsioa, egilea, lizentzia eta hirugarrenen liburutegien lizentziak erakusten ditu, web bertsiorako eta mahaigaineko deskargetarako estekekin batera.

Panelen antolaketa `Ctrl+L` teklarekin edo edizio-eremua maximizatzeko botoiaren ondoko antolaketa-botoiarekin aldatzen da. Menuak **Markdown panela maximizatu**, **Aurrebista panela maximizatu** eta **Panelak zatitu** aukerak eskaintzen ditu. Pantaila txikietan, barra bi botoitan tolesten da —**Ekintzak** eta **Formatua**— eta talde bakoitza behar duzunean erakusten dute.

---

## Tresna-barra

Goiko barraren azpiko marra grisak formaturako eta elementuetarako sarbide azkarrak ditu:

* **Desegin eta berregin**: ezker muturreko bi geziak (`Ctrl+Z` eta `Ctrl+Shift+Z`).
* **Oinarrizko estiloak**: lodia, etzana eta izenburuen menua (H1…H6).
* **Zerrendak eta aipuak**: buletak, zenbakitzea eta aipu-blokeak, beren lasterbideekin.
* **Kodea, estekak, irudiak eta taulak**: elkarrizketa-koadroen bidezko txertaketa gidatua.
* **Itsatsi**: arbelean dagoena dokumentura ekartzen du, goian azaldu bezala.
* **LaTeX formulak**: lerroko edo blokeko aginduak sintaxi zuzenarekin txertatzeko menua.
* **Formulen editorea (EdiCuaTeX)**: integratutako laguntzailea `Ctrl+Alt+M` bidez irekitzen du. Onartzean, formula editorean txertatuta itzultzen da.

Botoi bakoitzak deskribapen bat erakusten du sagua gainetik pasatzean, eta baliokidea den teklatu-lasterbidea adierazten du.

---

## Bilatu eta ordezkatu

Lupa-botoiak (edo `Ctrl+F`) bilaketa aurreratuko panel bat irekitzen du:

* Bilaketa-koadroak bat-etortze guztiak nabarmentzen ditu, azenturik edo maiuskularik kontuan hartu gabe ere.
* Erabili `Enter` hurrengo bat-etortzera joateko eta `Shift+Enter` atzera egiteko.
* Sakatu alboko gezia ordezkatze-panela erakusteko. Bat-etortzeak banan-banan edo denak batera ordezka ditzakezu (berrespenarekin).
* **Regex** botoiak idazten duzuna adierazpen erregular gisa interpretatzen du. Modu honetan azentuek balio dute (maiuskulak oraindik ez dira bereizten) eta `(\d+)` moduko taldeak erabil ditzakezu; ordezkapenean JavaScripten ohiko erreferentzia zenbakituekin berreskuratzen dira (dolar ikurra eta taldearen zenbakia).
* `unekoa / guztira` kontagailuak aurrerapena jarraitzen laguntzen dizu.
* `Esc` teklak bilatzailea ixten du eta fokua editoreari itzultzen dio.

Bilaketak Markdown ikuspegian zein HTML ikuspegian funtzionatzen du, fokua non duzun. Bilatzailea irekita dagoen bitartean, formatu-lasterbideak eten egiten dira, bertan idazten duzunarekin ez oztopatzeko.

---

## Interfaze nagusia

Lan-eremua tamainaz alda daitezkeen bi paneletan banatzen da:

* **Markdown** (ezkerra): testu-editore soila, karaktere-kontagailu batekin, dokumentuaren hizkuntza-adierazlearekin eta kopiatzeko bere botoiarekin. Hemen idazten duzun guztia berehala islatzen da eskuineko panelean.
* **HTML / Aurrebista** (eskuina): azken emaitza erakusten du eta edukia zuzenean editatzeko aukera ere ematen du. Erabili kode-ikonoa duen botoia aurrebista aberatsaren eta sortutako HTML kodearen artean txandakatzeko.
* **Edukia kopiatu**: Markdown-a edo sortutako HTMLa kopiatzeko botoi zehatzak (HTMLa kopiatzean LaTeX-era bihurtutako formulak barne).

Erdiko barra arrasta dezakezu edozein paneli leku gehiago emateko, eskuineko botoian hiru antolaketetako bat aukeratu edo gezi bikoitza erabili **edizio-eremua maximizatzeko**: goiko barrak ezkutatzen ditu eta pantaila testuarentzat uzten du. `+` botoia azken fitxaren ondoren geratzen da.

### Dokumentu bakoitzaren ezarpenak

Karaktere-kontagailuaren ondoan botoi labur bat dago, dokumentuaren hizkuntzarekin: `ES`, `CA`, `FR`… Itzalita ikusten bada, dokumentu horrek ez du hizkuntza propiorik eta *Ezarpenak → Esportazio-aukerak…* atalean dagoen **hizkuntza orokorra** erabiltzen du, ohikoena dena.

Hizkuntza jakin bat aukeratzean, aplikazioak **dokumentuaren barruan bertan** gordetzen du, eta, beraz, fitxategiarekin batera bidaiatzen du: gorde eta bihar irekitzen baduzu, hemen edo beste ordenagailu batean, edo norbaiti pasatzen badiozu, hura izaten jarraituko du. Atzera egiteko, aukeratu *Hizkuntza orokorra*. Eta *Beste hizkuntza bat…* aukerarekin edozein hizkuntzaren kodea idatz dezakezu (`fr`, `de`, `pt-BR`). Menu horretan bertan, *Dokumentu honen egilea…* aukerak gauza bera egiten du egilearekin.

Inoiz zure `.md` fitxategia testu-editore soil batekin irekitzen baduzu, hobespen hori goian ikusiko duzu, marren arteko lerro batzuetan:

```
---
lang: "ca"
---
```

Dokumentu bati buruzko datuak gordetzeko modu estandarra da eta programa askok ulertzen dute. EdiMarkWeb-ek ez du aurrebistan erakusten, edukia ez delako, baina bai Markdown panelean, iturburu-kodea baita. Nahi baduzu, eskuz ezaba edo alda dezakezu.

#### Testuaren formatua

Koadro berean —eta barraren amaierako **Formatua** botoian ere— finkatzen dira **lerrokatzea** (ezkerrera, justifikatua edo eskuinera), **letra-tipoa** (serifduna, serifgabea, tarte bakarrekoa edo idazten duzuna), **tamaina** puntutan, **lerroartea**, lau aldeetako **marjinak** zentimetrotan, **lehen lerroaren koska** eta **hitzak marratxoz zatitzea**.

Letra-tipoan *Bestelakoa…* aukeratzean, tipografiaren izena agertzen da azpian bertan, iradokizun-zerrenda batekin: aplikazioak ordenagailu honetan instalatuta daudela ezagutu ahal izan dituenak (Chromen eta Edgen, gainera, *Ikusi sistemako guztiak…* aukerak baimena eskatzen du eta zerrenda osoa eskaintzen). Edozein izen idatz dezakezu instalatuta ez badago ere: dokumentuak berdin gordetzen du, fitxategia hura duen ordenagailu batera irits daitekeelako. Hemen ez badago, ohar bat agertzen da anbar kolorez eta aurrebistak ordezko tipografia bat erabiltzen du; esportatzean izena idatzita bidaiatzen du eta programa bakoitzak ebazten du (Word eta LibreOffice hura badute, eta LaTeXen XeLaTeX edo LuaLaTeXekin soilik).

*Heredatua* uzten duzunak **Konfigurazioa → Esportazio-aukerak…** jarraitzen du, non ajuste berak dokumentu guztien abiapuntuko balio gisa dauden. Eremu bakoitzaren azpian, gris kolorez, orain bertan heredatzen duen balioa ikusten da. Hemen finkatzen duzuna dokumentuaren barruan gordetzen da, hizkuntzaren eta egilearen ondoan, eta fitxategiarekin bidaiatzen du. *Kendu dena dokumentutik* aukerak berezko ezer gabe uzten du:

```
---
lang: "eu"
align: "justify"
fontsize: "12pt"
margin-left: "3cm"
---
```

Aurrebistan eta esportazio-formatu bostetan aplikatzen da, jakitea komeni den hiru salbuespenekin:

* **EPUBen** marjinak iradokizun bat dira: orrialdearen kaxaren gainean liburu-irakurgailuak agintzen du.
* **TEXen**, zure aitzinsolasak `geometry` kargatzen badu dagoeneko, zure marjinek agintzen dute: aplikazioak menukoak kanpoan utzi dituela abisatzen du, bi `\usepackage` berdinekin konpilazioa hautsi beharrean.
* **Hitzen zatiketak** sistemaren marratxo-hiztegiak erabiltzen ditu. Windows eta macOSeko Wordek bereak dakartza; Linuxen, LibreOfficek hizkuntzaren paketea behar du (adibidez, `hyphen-eu`).

### Bide erlatiboa duten irudiak

`.md` arrunt batek ez ditu irudiak barruan eramaten: ondoko karpeta batean gordetzen ditu eta bide erlatibo batekin izendatzen, `irudiak/01.png`. EdiMarkWebek bide horiek ebazten ditu eta irudiak aurrebistan erakusten.

* **Mahaigaineko aplikazioan** ez dago ezer egin beharrik: dokumentua irekitzean, irudiak bere karpetan bilatzen dira eta agertu egiten dira.
* **Nabigatzailean** orri batek ezin du diskoko karpetarik irakurri baimenik gabe. Dokumentuak aurkitzen ez diren irudiak izendatzen baditu, aurrebistaren gainean ohar bat agertzen da **Bilatu bere karpeta…** botoiarekin: dokumentuaren karpeta aukeratuta, irudi guztiak ikusten dira. Behin egitea nahikoa da: EdiMarkWebek dokumentuak erabiltzen dituen irudiak nabigatzailean gordetzen ditu eta orria berriro kargatzean berreskuratzen ditu.
* Karpeta oso bat editorera arrastatzeak bertako dokumentuak irekitzen ditu **eta** bertako irudiak erregistratzen ditu aldi berean.
* **Gordetzean**, berreskuratutako irudiak `.md` fitxategiaren ondoan kopiatzen dira, `irudiak/01.png` bezalako bideak mantenduz. Nabigatzailean helmugako karpeta aukeratzen da; nabigatzaileak ezin badu karpetetan idatzi, deskonprimitzeko prest dagoen ZIP bat deskargatzen da. **Gorde honela…** aukerak kopia bera egiten du mahaigaineko aplikazioan.

Markdown-a ez da inoiz aldatzen: gordetzen, kopiatzen edo esportatzen dena idatzi zenuen bidearekin doa. Aurkitzen ez diren irudiak marra etenezko lauki batekin markatzen dira, nabigatzailearen ikono hautsiaren ordez.

### Kapsulatutako irudiak

Dokumentu batek base64 irudiak dituenean —DOCX bat inportatzean, beste aplikazio batetik itsastean—, haien kodeak milaka karaktere hartzen ditu eta Markdown-a irakurtezin bihurtzen du. EdiMarkWeb-ek automatikoki tolesten ditu: editorean `__EDIMARK_B64_1__` moduko marka labur bat agertzen da eta, panelaren azpian, zerrenda batek ezkutuko irudi bakoitza erakusten du, bere formatua, bere tamaina eta **Ikusi kodea** botoi bat kontsultatzeko edo kopiatzeko. Benetako edukia osorik mantentzen da gordetzean, kopiatzean edo esportatzean. Zerrenda lerro bakarrean bilduta dator, irudi kopuruarekin: zabaltzean, bakoitzak bere miniatura erakusten du —egin klik gainean tamaina handian ikusteko— eta zerrendak bere altuera eta korritze-barra propioak gordetzen ditu; hala, dokumentuak irudi asko izanda ere, ez dio inoiz editoreari lekurik kentzen. Irekita edo itxita utzi duzun gogoratzen da. Lerro bakoitzak **Ezabatu** botoia ere badu, irudia dokumentutik kentzen duena —kode osoa, ez markatzailea bakarrik— berrespena eskatu ondoren, eta **Ikusi kodea**, `data:` katea kopiatu eta irudi bera beste dokumentu edo tresna batean itsatsi nahi baduzu erabilgarria.

---

## Aurrebista interaktiboa

* Egin klik eskuineko panelean emaitzaren gainean zuzenean editatzeko: aldaketak Markdown-arekin sinkronizatzen dira, formatua mantenduz edizioa bateragarria den bitartean.
* Aurrebistak hautaketak, kopiatu eta itsatsi, eta oinarrizko lasterbideak (Ctrl+B/I, izenburuak, etab.) onartzen ditu, Markdown editoreak bezalaxe.
* Eutsi `Ctrl` teklari (edo `Cmd` macOS-en) eta egin klik estekak irekitzeko; mahaigaineko aplikazioan zure ohiko nabigatzailean irekitzen dira.
* LaTeX formulak automatikoki errendatzen dira KaTeX-ekin; editatzean beren jatorrizko sintaxira itzultzen dira.

---

## Ekintza nagusiak

* **Ireki (`Ctrl+O`)**: `.md` edo `.markdown` fitxategiak inportatzen ditu.
* **Inportatu**: beste formatu batzuetako dokumentuak Markdown-era bihurtzen ditu Pandoc bidez: `.docx`, `.odt`, `.epub`, `.html` eta `.tex`. Izenburuak, zerrendak, taulak eta estekak berreskuratzen dira, eta baita irudiak ere: `.docx`, `.odt` edo `.epub` batetik datozenean, fitxategitik bertatik ateratzen dira eta Markdown-ean kapsulatuta geratzen dira; horrela, aurrebistan ikusten dira eta zurekin bidaiatzen dute esportatzean.
* **Gorde (`Ctrl+S`)**: uneko dokumentua gordetzen du. Mahaigaineko aplikazioan aurretik irekitako fitxategia eguneratzen du; **Gorde honela… (`Ctrl+Shift+S`)** aukerak beti uzten du beste izen edo kokapen bat hautatzen.
* **Edukia kopiatu**: ezkerreko panelak Markdown-a kopiatzeko botoi bat du; aurrebistan zer kopiatuko den aukera dezakezu (errendatutako HTMLa edo LaTeX aldaerak) kopiatzeko ikonoaren ondoko menu zabalgarritik.
* **Gaia, antolaketa edo zabalera aldatu**: erabili **Ezarpenak** gaiarentzat, `Ctrl+L` edo panelen menua antolaketarentzat eta gezi bikoitzaren eskuineko zabalera-botoia (ikonoa soilik) webguneko lan-eremua zabaltzeko.
* **Eskuliburua**: dokumentu hau beti eguneratuta duzu `Ctrl+H` bidez.
* **Karpeta gogoratzen da**: mahaigaineko aplikazioan, irekitzeko edo gordetzeko lehen koadroa sistemak esaten duen lekuan agertzen da, baina hortik aurrera guztiak —ireki, gorde honela, esportatu, irudi bat aukeratu— erabili duzun azken karpetara itzultzen dira. Aplikazioa irekita dagoen bitartean baino ez da gogoratzen.

---

## Esportatu

Ireki **Fitxategia** botoia eta hautatu `Esportatu` entregatzeko edo argitaratzeko prest dauden bertsioak deskargatzeko:

* **DOCX (Microsoft Word)**: aproposa Word erabiltzen duten ikasleekin edo lankideekin partekatzeko, eta Google Docs-ekin bateragarria.
* **ODT (LibreOffice)**: LibreOffice edo OnlyOffice bezalako suite libreetarako pentsatua.
* **EPUB (liburu digitala)**: EPUB 3 irakurgailuekin bateragarria den liburu elektroniko bat sortzen du (Calibre, Apple Liburuak, Thorium, tinta elektronikoa…). Izenburua 1. mailako lehen goiburutik hartzen da (edo dokumentuaren izenetik), eta egilea, azala eta hizkuntza behean azaltzen diren ezarpenetatik ateratzen dira.
* **HTML (web-orria)**: fitxategi autonomo bat sortzen du, estiloak eta formulak kapsulatuta dituena, webean ostatatzeko prest. Nabigatzailearen fitxaren titulua lehen izenburutik hartzen da, edo dokumentuaren izenetik halakorik ez badago.
* **TEX (LaTeX)**: `.tex` dokumentu oso bat sortzen du, konpilatzeko prest dagoen goiburuarekin. Dokumentuaren hizkuntza darama, beraz hitz-zatiketa eta etiketa automatikoak zure hizkuntzan ateratzen dira, eta dokumentua 1. mailako izenburu bakar batekin hasten bada, izenburu hori dokumentuaren titulu bihurtzen da (`\title` eta `\maketitle`), beste atal bat izan beharrean.

Esportatzen den bitartean, goiko barrak egoera-mezuak erakusten ditu (aurrerapena, arrakasta edo erroreak).

### Esportazio-aukerak

**Ezarpenak → Esportazio-aukerak…** esportazio bakoitzean berrerabiltzen diren hobespenak gordetzen ditu, baita aplikazioa hurrengoan irekitzean ere.

Koadroa lau fitxatan banatuta dago —**Dokumentua**, **Formatua**, **EPUB** eta **LaTeX**— eta teklatuko geziekin ere ibil zaitezke haietan. Mahaigaineko aplikazioan, gainera, aukera horiek `settings.json` fitxategi batean gordetzen dira zure erabiltzaile-profileko EdiMarkWeb-en konfigurazio-karpetan, eta, beraz, barneko nabigatzailearen datuen garbiketa bat edo berrinstalazio bat gainditzen dute.

**Dokumentuaren hizkuntza**, bost formatuei aplikatzen zaiena. Horrek erabakitzen du zein hizkuntzatan zuzentzen duten ortografia Word-ek eta LibreOffice-k DOCX edo ODT bat irekitzean, nola zatitzen dituen hitzak LaTeX-ek eta zein hizkuntza adierazten duten HTMLak eta EPUBak pantaila-irakurgailuentzat. Lehenespenez **Interfazearen berbera** da: EdiMarkWeb-en hizkuntza aldatzen baduzu, dokumentuek jarraitu egiten diote. Aplikazioaren bost hizkuntzetako edozein finka dezakezu, edo **Bestelakoa…** aukeratu eta bere kodea idatzi (`fr`, `de`, `pt-BR`).

**Egilea**, fitxategiaren propietateetan gordetzen dena eta EPUBean liburuaren egile gisa eta LaTeX-en azalean agertzen dena. DOCX eta ODT formatuetan, gainera, Pandoc-ek izena duen lerro bat idazten du dokumentuaren hasieran; agertzerik nahi ez baduzu, utzi eremua hutsik. Dokumentu jakin batek beste egile bat eraman dezake: *Dokumentu honen egilea…*, hizkuntza-botoiaren menuan.

**EPUBaren azala**, hiru aukerarekin. Hasieran, EdiMarkWeb-ek **bat sortzen du** dokumentuaren tituluarekin eta egilearekin, irudirik gabeko liburu bat ikono generikoarekin agertzen baita irakurgailuaren apalean. **Zure irudi bat** jar dezakezu —1 MB arte, azal baterako nahikoa baino gehiago: zure dokumentuen ondoan gordetzen da, aplikazioaren espazio propioan— edo liburua **azalik gabe** utzi. EPUBari baino ez dio eragiten.

**Testuaren formatua**: lerrokatzea, letra-tipoa eta tamaina, lerroartea, marjinak, koska eta hitzen zatiketa, dokumentu guztien abiapuntuko balio gisa. Dokumentu bakoitzak bereak finka ditzake Markdown paneletik, eta finkatzen ez duena hemendik heredatzen du.

**Aurkibide automatikoa**, dokumentuaren hasieran atalen zerrenda bat gehitzen duena. DOCX formatuan Word-en benetako aurkibide bat da eta ODT formatuan LibreOffice-ren jatorrizko bat; EPUBak ez du behar, irakurgailuak bere nabigazio-aurkibidea baitakar.

> **Orrialde-zenbakiei buruz**: DOCX eta ODT formatuetan aurkibidea testu-prozesadoreak kalkulatzen duen eremu bat da, orrialdeak maketatu behar baitira atal bakoitza non erortzen den jakiteko. EdiMarkWeb-ek atalen zerrenda idazten dio barruan, beraz dokumentua aurkibidea ikusgai duela irekitzen da, baina zenbakirik gabe. Horiek agertzeko, eguneratu ezazu: Word-en, egin klik eskuineko botoiarekin aurkibidean → *Eguneratu eremuak*; LibreOffice-n, *Tresnak → Eguneratu → Aurkibideak*.

**Atalak zenbakitu**, izenburuen aurretik 1, 1.1, 1.2… jartzen dituena. DOCX, HTML eta LaTeX formatuetan funtzionatzen du; ODTk ez du zenbakitze hori onartzen eta gabe ateratzen da.

Eta hiru ezarpen **LaTeX-erako soilik**, TEX formatura esportatzean eta *LaTeX – dokumentu osoa* kopiatzean aplikatzen direnak:

* **Dokumentu-klasea**: `article` (lehenetsia), `report` edo `book`.
* **Klase-aukerak**: `\documentclass` aginduan kortxete artean doana, komaz bereizita (`12pt, a4paper`).
* **Atarikoa**: zure paketeak eta makroak, atarikoaren amaieran dauden bezala txertatzen direnak, `\begin{document}` baino lehen.

Dokumentua bere YAML metadatuekin hasten bada, haiek agintzen dute eta ezarpen hauetako bat ere ez da aplikatzen. Eta kontuan izan akatsak dituen atariko batek ez duela hemen abisurik emango: hutsegitea `.tex` konpilatzean agertuko da.

---

## Kopiatu eta partekatu deskargatu gabe

* **Markdown kopiatu**: ezkerreko panelean botoi zuzena, iturburu-testua arbelera bidaltzeko.
* **Aurrebistatik kopiatu**: eskuineko panelaren kopiatzeko botoiak zure azken aukeraketa gogoratzen du:
  * *HTML kopiatu* (ikusten duzun bezala errendatuta).
  * *LaTeX kopiatu* (uneko zatia soilik).
  * *LaTeX kopiatu – dokumentu osoa* (goiburua eta ingurunea barne, konpilatzeko prest, TEX esportazioaren hizkuntza eta titulu berberekin).

Aukera bakoitzak arrakasta-jakinarazpen bat erakusten du eta, dagokionean, LaTeX markaketa automatikoki prestatzen du errendatutako aurrebistatik abiatuta.

---

## Fitxategiak arrastatu eta jaregin

Arrastatu fitxategi bat edo gehiago aplikazioaren gainera. `.md` eta `.markdown` onartzen dira, zuzenean irekitzen direnak, eta `.docx`, `.odt`, `.epub`, `.html` eta `.tex`, ireki aurretik Pandoc-ekin Markdown-era bihurtzen direnak:

* Marko argiztatu bat ikusiko duzu, jaregin ditzakezula berresten duena.
* Fitxategi bakoitza bere fitxan irekiko da, jatorrizko izenarekin.
* Karpeta osoak ere arrasta ditzakezu sistemaren fitxategi-kudeatzailetik: azpikarpetak ere zeharkatzen dira eta fitxategi bateragarri bakoitza bere fitxan irekitzen da, ordena alfabetikoan. Gainerakoa alde batera uzten da eta, ezer baliagarririk ez badago, aplikazioak abisatu egiten dizu.
* Edukia konexiorik gabe erabilgarri geratzen da gordetze automatikoari esker.

---

## Mahaigaineko aplikazioa

Web bertsioaz gain, EdiMarkWeb programa gisa instalatzen da **Linux, Windows eta macOS** sistemetan. Aplikazio bera da —menu berberak, lasterbide berberak eta formatu berberak—, beraz batean ikasitakoak besterako balio dizu.

### Instalatzea

Instalatzaileak [deskarga-orrian](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest) daude, sistema bakoitzeko bat:

* **Linux**: `.deb` paketea Debian, Ubuntu, Mint eta eratorrietarako, eta `.AppImage` bat, edozein banaketatan instalatu gabe exekutatzen dena.
* **Windows**: `.exe` instalatzaile bat eta `.msi` beste bat, aplikazioa ikasgela edo ikastetxe batean zabaltzen duenarentzat.
* **macOS**: `.dmg` irudi bat Apple prozesadorea duten Mac-etarako eta beste bat Intel Mac-etarako.

### Zer gehitzen du nabigatzailearen aldean

* **Dokumentuak klik bikoitzarekin irekitzen dira**: instalazioak `.md` eta `.markdown` fitxategiak lotzen ditu, eta fitxategi-kudeatzailetik EdiMarkWeb-en irekitzen dira. Aplikazioa jada irekita badago, dokumentua leiho horretara bertara iristen da fitxa berri batean.
* **Gordetzeak benetako fitxategian idazten du**: `Ctrl+S` sakatuta ireki duzun dokumentua eguneratzen da, deskargen karpetatik pasatu gabe. **Gorde honela…** aukerak sistemaren elkarrizketa-koadroa irekitzen du izena eta karpeta aukeratzeko.
* **Sistemaren zuzentzaile ortografikoa**: editoreak akatsak azpimarratzen ditu ekipoan instalatutako hiztegiekin. Windows eta macOS sistemetan dagoeneko dituzun hizkuntzak dira; Linux-en beharrezkoa izan daiteke nahi duzun hiztegia instalatzea (adibidez, `hunspell-eu` paketea). **Konfigurazioa → Zuzentzaile ortografikoa** atalean itzal dezakezu.
* **Konexiorik gabe funtzionatzen du**: aplikazioak behar duen guztia darama barruan, Pandoc eta EdiCuaTeX formula-editorea barne, beraz internetik gabe idatzi, inportatu eta esporta dezakezu. Konexioa bertsio berririk dagoen egiaztatzeko baino ez da behar.
* **Irten**: **Fitxategia** menuaren amaieran, uneko dokumentua gorde eta aplikazioa ixten du.

### Egunean mantentzea

Abiaraztean, aplikazioak egunean behin egiaztatzen du bertsio berriagorik dagoen. Halakorik dagoenean, ohar bat agertzen da tresna-barraren azpian **Deskargatu eta instalatu** botoiarekin: zure sistemari dagokion instalatzailea jaisten du, aurrerapena erakusten du eta sistemaren instalatzaileari ematen dio, klik pare batean amai dezazun. AppImage batekin ez dago ezer instalatzeko, beraz aplikazioak berria deskargatzen du eta bere karpeta irekitzen du zeneukana ordezka dezazun. Instalatzaile batek ere ezin ditu ordezkatu irekita dagoen aplikazio baten fitxategiak; hortaz, abiatu bezain laster **Itxi EdiMarkWeb** botoia agertzen da ohar berean: idazten ari zarena gorde eta ixten du. Instalazioa amaitzean, ireki berriro eta bertsio berria izango duzu.

Oharrak **Egiaztatu abiaraztean** laukia dakar, egiaztapen automatiko hori desaktibatzeko, eta **Ikusi berritasunak** esteka, aldaketen zerrendarekin. Nahi duzunean eska dezakezu **Ezarpenak → Bilatu eguneraketak…** bidez; azken bertsioa jada baduzu, egoera-barran esango dizu.

### Zer ez den aldatzen

Nabigatzailean hasitako dokumentuak eta mahaigaineko aplikaziokoak Markdown fitxategi arruntak dira: batetik bestera mugi ditzakezu bihurketarik gabe. Fitxen gordetze automatikoa, aldiz, independentea da bakoitzean, bertsio bakoitzak bere lan-kopia bere espazioan gordetzen baitu.

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
| Aipua | `Ctrl` + `Shift` + `Q` | `Cmd` + `Shift` + `Q` |
| Kodea | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Esteka | `Ctrl` + `K` | `Cmd` + `K` |
| Irudia | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` |
| Taula | `Ctrl` + `Shift` + `T` | `Cmd` + `Shift` + `T` |
| Lerroko formula | `Ctrl` + `M` | `Cmd` + `M` |
| Blokeko formula | `Ctrl` + `Shift` + `M` | `Cmd` + `Shift` + `M` |
| Desegin / Berregin | `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | `Cmd` + `Z` / `Cmd` + `Shift` + `Z` |
| **Dokumentuen kudeaketa** | | |
| Fitxa berria | `Ctrl` + `T` | `Cmd` + `T` |
| Fitxa itxi | `Ctrl` + `W` | `Cmd` + `W` |
| Hurrengo / aurreko fitxa | `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Shift` + `Tab` |
| Gorde | `Ctrl` + `S` | `Cmd` + `S` |
| Gorde honela… | `Ctrl` + `Shift` + `S` | `Cmd` + `Shift` + `S` |
| Fitxategia ireki | `Ctrl` + `O` | `Cmd` + `O` |
| Dokumentua inportatu | `Ctrl` + `Alt` + `O` | `Cmd` + `Alt` + `O` |
| Itsatsi LaTeX (elkarrizketa ireki) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interfazea** | | |
| Ireki EdiCuaTeX | `Ctrl` + `Alt` + `M` | `Cmd` + `Alt` + `M` |
| Arbeletik itsatsi | `Ctrl` + `Alt` + `V` | `Cmd` + `Alt` + `V` |
| Ireki Esportatu | `Ctrl` + `Alt` + `E` | `Cmd` + `Alt` + `E` |
| Ireki Ezarpenak | `Ctrl` + `,` | `Cmd` + `,` |
| Editatzeko eremua maximizatu | `Ctrl` + `Shift` + `F` | `Cmd` + `Shift` + `F` |
| Antolaketa aldatu | `Ctrl` + `L` | `Cmd` + `L` |
| Bilatu | `Ctrl` + `F` | `Cmd` + `F` |
| Testua handitu / txikitu | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Erabiltzailearen eskuliburua | `Ctrl` + `H` edo `F1` | `Cmd` + `H` edo `F1` |
| Eskuliburua birkargatu | `Ctrl` + `Shift` + `H` | `Cmd` + `Shift` + `H` |
| Inprimatu | `Ctrl` + `P` | `Cmd` + `P` |

Letra bakarreko lasterbideek dokumentuaren gainean eragiten dute, beraz eten egiten dira bilatzailea irekita dagoen bitartean.

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
