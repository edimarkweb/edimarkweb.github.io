![EdiMarkWeb-en logotipoa](logo_100px.png)

# EdiMarkWeb eskuliburua

EdiMarkWeb **Markdown testu-editore** bat da, irakasleentzat eta eduki-sortzaileentzat pentsatua: azkar idazten da, Word, LibreOffice, EPUB, HTML, LaTeX eta PDF formatuetara esportatzen du, eta formula matematikoak onartzen ditu. **Nabigatzailean** funtzionatzen du, ezer instalatu gabe, eta baita **mahaigaineko aplikazio** gisa ere Linux, Windows eta macOSerako. Bi kasuetan lana zure ekipoan gertatzen da: ez dokumentuak ez irudiak ez dira handik ateratzen.

## Hasteko

Idatzi ezkerreko panelean eta dokumentua eskuinean osatzen ikusiko duzu. Ez da beharrezkoa Markdown jakitea: tresna-barrako botoiek lodiak, izenburuak, zerrendak, taulak, estekak, irudiak eta formulak jartzen dituzte, eta **bi paneletan** funtzionatzen dute.

Amaitzean, bi bide dituzu: **Gorde** (`Ctrl+S`) aukerak `.md` fitxategi bat uzten du —testu arrunta da eta edonon irekitzen da—, eta **Esportatu** aukerak entregatu behar duzun DOCXa, PDFa edo formatua sortzen du.

---

## Bi editoreak

Lan-eremua bi panel neurri-aldakorretan banatzen da. **Biek dokumentu bera editatzen dute**, une oro sinkronizatuta:

* **Markdown editorea** (ezkerra): iturburu-kodea, dagoen bezala. Hemen idazten duzun guztia berehala agertzen da beste panelean.
* **Editore bisuala** (eskuina): dokumentua jada osatuta, mahai baten gaineko orri bat balitz bezala, eta **zuzenean haren gainean idazten da**. Formatu-barrak hemen ere lan egiten du: lodia, etzana, izenburuak, aipuak, zerrendak, estekak, irudiak, taulak eta formulak ikusten duzunaren gainean aplikatzen dira, eta Markdown-a bakarrik berridazten da. Botoi berak kentzen du jarritakoa, eta `Ctrl+Z` teklak desegiten du orrian egon arren, historia dokumentuarena baita. Kodearen ikonoa duen botoiak dokumentu osatuaren eta sortutako HTMLaren artean txandakatzen du.

**Panel aktiboa**: biak ikusgai daudenean, batek agintzen du —botoiek eta luparrak hari eragiten diote—. Koloreko ertzagatik eta egoera-barrako errotuluagatik ezagutzen da, panel aktiboa baino izendatzen ez baitu.

**Nola banatu**: arrastatu erdiko barra, edo erabili `Ctrl+L` eta antolaketaren hiru botoiak —Markdown editorea soilik, biak batera, editore bisuala soilik—. Gezi bikoitzak **editatzeko eremua maximizatzen du**: barrak ezkutatu eta pantaila testurako uzten du.

**Egoera-barrako lupak** (`−`, ehunekoa eta `+`, edo `Ctrl` + `+` / `Ctrl` + `-`) panel aktiboan ikusten duzuna handitzen edo txikitzen du. Orri osoa handitzen du, bere orrialdeekin eta marjinekin, beraz orrialdea ez da berrantolatzen. Ez du dokumentua aldatzen, ezta esportatzen edo inprimatzen dena ere —papera beti % 100ean ateratzen da—: letra-tamaina *Testuaren formatua* atalean dago.

**Panela lupari lotuta** (katedun etengailua, luparen ezkerraldean) orrialdea beti osorik mantentzen du, eta bi noranzkoetan lan egiten du: banatzailea mugitzen baduzu, handipena birkalkulatzen da orria sartzen jarrai dezan —ehunekoa orduan urdinez eta azpimarratuta agertzen da, berak jartzen duelako eta ez zuk—; lupa ukitzen baduzu, banatzailea da alde egiten duena orriari lekua uzteko. Horrela ez da barra horizontalik agertzen, eta orrialdetako banaketa beti mantentzen da.

Jarrita dator. Markdown editoreak bere gutxieneko zabalera galduko lukeen tokian gelditzen da: hara iristean `+` botoia itzali egiten da eta arratoia gainetik pasatzean esaten du. Harago handitzeko, askatu etengailua —katea ireki eta anbar kolorekoa jartzen da— edo utzi editore bisuala bakarrik (`Ctrl` + `L`), zabalera osoa ematen baitio.

Orriak panela betetzen du, ez da bertan sartu besterik egiten: editore bisualari lekua egiten badiozu, orrialdea handiago ikusten da eta handipena % 100etik gora pasatzen da —% 200era arte, luparen mugaraino—. % 100 paperaren benetako tamaina da, inprimatuta aterako dena, eta erdiko ehunekoan klik bakarrera duzu; finko gera dadin, askatu etengailua.

Hau guztia bi panelak batera daudenean gertatzen da, batak bestearen zabalera hartzen duenean. Panel bakarra ikusgai dagoenean, edo bata bestearen gainean jartzen diren pantaila estuetan, etengailua kendu egiten da eta lupa librea da.

**Orriak**: orriak paperak duen neurria du —A4 edo Letter, dokumentuak dioena— eta editore bisualak testua orrialdetan banatzen du, batetik besterako tarte eta guzti. Mozketa beti bi bloqueren artean gertatzen da, inoiz ez lerro erdian: orrialde baten amaieran sartzen ez dena osorik pasatzen da hurrengora, testu-prozesadore batean bezala. PDFarekiko eta inprimaketarekiko fidela da, orri beretik ateratzen baitira eta hark mozten duen tokian mozten baitute; Word edo LaTeXerako orientagarria da, bakoitzak bere erara banatzen baititu lerroak. Panela lupari lotuta dagoenean banaketa beti mantentzen da; etengailua askatu eta orria panelean sartzen ez den handipen bat jarrita bakarrik kentzen da.

### Edozer itsatsi

`Ctrl+V` teklekin edo **Itsatsi** botoiarekin, EdiMarkWebek arbelean dagoena panel egokian jartzen du: testu soila eta Markdown-a Markdown editorera doaz, kurtsorearen kokalekura; formatudun edukia (Word, LibreOffice, web-orri bat, chatbot baten formula bat) eta baita irudiak ere editore bisualean osatzen dira eta beren Markdown-a sortzen dute. Ez da tarteko urratsik behar: kopiatu nahi duzun tokitik eta itsatsi.

`Ctrl` (edo `Cmd`) sakatuta, editore bisualeko esteka batean klik eginda irekitzen da; mahaigaineko aplikazioan, zure ohiko nabigatzailean.

---

## Fitxak

Dokumentu bakoitza bere fitxan bizi da. `Ctrl+T` teklek bat sortzen dute; `Ctrl+Tab` teklek batetik bestera pasatzen dute eta bakoitzak non utzi zenuen gogoratzen du. Klik bikoitza izenburuan berrizendatzeko, `X` ixteko, eta puntu gorri batek (`●`) gorde gabeko aldaketak daudela abisatzen du.

Guztiak **bakarrik gordetzen dira** ekipoan: orria birkargatzen baduzu edo programa berriro irekitzen baduzu, edukia berriro hor dago. Segurtasun-sarea da, ez fitxategia gordetzearen ordezkoa.

---

## Menuak eta tresna-barra

Logotipoaren ondoan **Fitxategia**, **Esportatu** eta **Ezarpenak** menuak daude. Eskuinean, eguneroko ekintzak ikono bakarrean: **Gorde**, **Esportatu**, **Kopiatu**, **Inprimatu**, **Bilatu** eta **Laguntza**.

* **Fitxategia**: `Ireki (Ctrl+O)`, `Inportatu (Ctrl+Alt+O)` eta `Itsatsi LaTeX (Ctrl+Shift+V)` aukerek edukia ekartzen dute; `Gorde (Ctrl+S)` eta `Gorde honela… (Ctrl+Shift+S)` aukerek atera. Mahaigaineko aplikazioan **Irten** aukerarekin amaitzen da, eta horrek itxi aurretik gordetzen du.
* **Esportatu (Ctrl+Alt+E)**: sei formatuak, bakoitza zertarako den dioen lerro batekin.
* **Ezarpenak (Ctrl+,)**: interfazearen **Hizkuntza**; **Gaia** (Sistema, Argia edo Iluna, gogoratu egiten da); **Leiho independentea**, EdiMarkWeb fitxarik eta helbide-barrarik gabe irekitzen duena (web bertsioan soilik); **Zuzentzaile ortografikoa**, akatsak ekipoko hiztegiekin azpimarratzen dituena eta dokumentuaren hizkuntza jarraitzen duena; eta **Aukera orokorrak…**.
* **Inprimatu (Ctrl+P)**: papererako edo PDFrako prest dagoen ikuspegia.
* **Laguntza**: **Eskuliburua (F1)**, **EdiMarkWebi buruz** —bertsioa, egilea eta lizentziak— eta, mahaigainean, **Bilatu eguneraketak…**.

Tresna-barrak, aurrekoaren azpian, desegin eta berregin, lodia, etzana, izenburuak (H1…H6), zerrendak, aipuak, kodea, estekak, irudiak, taulak, **bibliografia-aipuak**, **Itsatsi** eta formulak biltzen ditu. Botoi bakoitzak, sagua gainetik pasatzean, zer egiten duen eta zein lasterbiderekin esaten du. Pantaila txikietan bi botoitan tolesten da: **Ekintzak** eta **Formatua**.

---

## Ireki, inportatu eta arrastatu

* **Ireki (`Ctrl+O`)**: `.md` eta `.markdown` fitxategiak.
* **Inportatu (`Ctrl+Alt+O`)**: `.docx`, `.odt`, `.epub`, `.html` eta `.tex` dokumentuak Markdown-era bihurtzen ditu Pandoc-ekin, beren izenburu, zerrenda, taula, esteka eta irudiekin. `.epub` batetik liburuaren hizkuntza ere itzultzen da.
* **Arrastatu eta jaregin**: jaregin aplikazioaren gainean mota horietako fitxategi bat edo gehiago eta bakoitza bere fitxan irekiko da. Karpeta osoak ere bai: azpikarpetak alfabetoaren ordenan zeharkatzen dira eta bateragarria ez dena baztertu egiten da. Dokumentua jada irekita bazegoen, ez da bikoizten: aplikazioa bere fitxara itzultzen da.

Mahaigaineko aplikazioan, `Ctrl+S` teklek ireki duzun fitxategiaren gainean idazten dute; nabigatzailean deskargatu egiten da. Erabiltzen duzun karpeta gogoratu egiten da aplikazioa irekita dagoen bitartean, beraz hurrengo ireki, gorde edo esportatzeko elkarrizketak zeunden tokian ateratzen dira.

---

## Irudiak

**Irudia** botoiak diskoko fitxategi bat edo URL bat onartzen du, eta nola txertatu galdetzen du:

* **Bide erlatiboarekin** (gomendatua): dokumentuak irudia izendatu besterik ez du egiten —`![Grafikoa](irudiak/01.png)`—, eta hura bere karpetan geratzen da. Hori da edozein Markdown editorek egiten duena, eta `.md` fitxategia arina mantentzen du; ordainetan, dokumentua eta bere irudien karpeta elkarrekin bidaiatzen dute.
* **Dokumentuaren barruan**: irudia fitxategian bertan txertatzen da, eta hura autonomoa bihurtzen da, baina askoz astunagoa. Erabilgarria `.md` soil bat postaz bidaltzeko.

**Bide erlatiboak.** Mahaigaineko aplikazioan irudiak dokumentuaren karpetan bilatzen dira bakarrik. Nabigatzailean orri batek ere ezin du karpeta bat baimenik gabe irakurri: irudiak falta badira, abisu bat agertzen da **Bilatu bere karpeta…** botoiarekin eta, hura hautatzean, guztiak ikusten dira. Behin egitea nahikoa da. Gordetzean, irudi horiek `.md` fitxategiaren ondoan kopiatzen dira beren bideak mantenduz (edo ZIP baten barruan, nabigatzaileak karpetak idazten uzten ez badu). Markdown-a ez da inoiz aldatzen: gordetzen, kopiatzen edo esportatzen duzunak idatzi zenuen bidea darama.

**Irudien kudeatzailea.** Markdown editorearen azpian, zerrenda batek dokumentuko irudiak biltzen ditu. Guztiak **ikus**, arbeletik itsatsitako, diskotik aukeratutako edo URL baten bidez adierazitako beste irudi batekin **ordeztu**, eta **dokumentutik kendu** daitezke. Estekatutakoek bidea edo URLa erakusten dute, eta Base64 gisa ere **txerta** daitezke; erreferentzia kentzeak ez du jatorrizko fitxategia edo urruneko irudia ezabatzen. Sareko irudietan, bihurketa zerbitzariak haiek deskargatzea baimentzearen mende dago; blokeatzen badu, dokumentua ez da aldatzen. Lehendik txertatuta daudenek formatua eta tamaina erakusten dituzte, eta kodea ikusi edo kopiatzeko aukera ematen dute.

Base64 kodeak milaka karaktere hartzen ditu; horregatik, EdiMarkWebek tolestu eta `__EDIMARK_B64_1__` moduko marka labur bat uzten du editorean, baina benetako edukia oso-osorik mantentzen da gordetzean, kopiatzean eta esportatzean. **Txertatutako irudiak karpetara eraman** botoiak itzulerako bidea egiten du: irudi bakoitza fitxategi bihurtzen da dokumentuaren baliabideen azpikarpetan (`nire-fitxategia.md` → `nire-fitxategia/images/`) eta Markdown-ean bere bidea geratzen da. Fitxategiak dokumentua gordetzean idazten dira, eta `Ctrl+Z` teklek aldaketa desegiten dute.

---

## Formula matematikoak

Formulak LaTeX-en idazten dira eta unean bertan osatzen dira KaTeX-ekin. Hiru modu daude jartzeko:

* **Formula-menua** (Markdown editorean): `Ctrl+M` teklek itxarotea irekitzen dute —egoera-barrak teklak gogorarazten ditu— eta gero `1`, `2`, `3` edo `4` teklek mugatzailea hautatzen dute (`\(...\)`, `\[...\]`, `$...$` edo `$$...$$`); `Sartu` teklak `\(...\)` txertatzen du —gomendatua— eta `Esc` teklak bertan behera uzten du.
* **Formularen leihoa** (editore bisualean): `{}` botoiak —edo `Ctrl+M` teklek, hemen mugatzaileei buruz galdetzen ez dutenak— leiho bat irekitzen du LaTeX kodearekin eta emaitza ikusgai idazten duzun bitartean, errorearen abisuarekin baldin badago. Han hautatzen duzu lerroan ala blokean doan eta zein mugatzailerekin. Horrela egiten da orriaren gainean ez dagoelako `$…$` huts baten barruan idazteko lekurik: KaTeX-ek formula bihurtzen du berriro margotu bezain laster.
* **EdiCuaTeX (`Ctrl+Alt+M`)**: formulen editore bisual integratua, saguarekin eraikitzeko. Onartzean, formula txertatuta itzultzen da.

### LaTeX formulen adibideak

#### Bigarren mailako formula

$ax^2 + bx + c = 0$ bezalako bigarren mailako ekuazio bat ebazteko, hau erabiltzen da:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

#### 2x2 matrizea

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

#### Beste mugatzaile batzuk

`$...$` eta `$$...$$` ez ezik, LaTeX-en mugatzaileak ere erabil ditzakezu: \(E = mc^2\) lerroan, eta blokean:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

#### Batukariak, limiteak eta integralak

Lehen $n$ zenbaki naturalen batura $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ da, eta integrala $\int_0^1 x^2\,dx = \frac{1}{3}$. $e$ zenbakia limite gisa definitzen da:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

#### Ekuazio-sistemak

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### Sinbolo solteak

Greziar letrak ($\alpha$, $\beta$, $\Omega$), azpiindizeak ($H_2O$), konparazioak ($a \neq b$, $x \leq y$) eta multzoak ($\mathbb{R}$, $A \subseteq B$).

---

## Aipuak eta bibliografia

**Ezarpenak → Aukera orokorrak… → Aipuak** atalean **BibTeX** (`.bib`) edo **CSL JSON** (`.json`) liburutegi bat karga dezakezu. **Kargatu adibideko bibliografia** aukerak zazpi erreferentzia oso prestatzen ditu; jada bibliografia bazenuen, zurea ordezkatu gabe gehitzen zaizkio. **Gehitu erreferentzia…** aukerarekin kargatutako liburutegia —adibidekoa barne— zabaldu edo berri bat sor dezakezu. Aipu-gakoa aukerakoa da: hutsik uzten baduzu, programak abizenarekin, urtearekin eta izenburuko hitz batekin osatzen du, eta beste batekin bat ez datorrela ziurtatzen du. Artikuluak, liburuak, kapituluak, txostenak, web-orriak, tesiak eta komunikazioak onartzen ditu, amaierako erreferentziak behar bezala osatzeko eremu espezifikoekin. **APA 7** da hasierako estiloa; Chicago egile-data, MLA 9, IEEE edo norberaren **CSL** fitxategia ere erabil daiteke. Bibliografiaren izenburua eta H1–H6 maila ere alda daitezke. Fitxategiak ez dira inongo zerbitzutara bidaltzen.

Liburuaren botoiak —edo `Ctrl+Alt+B`— egilearen, izenburuaren, urtearen edo gakoaren araberako bilaketa irekitzen du, eta **Gehitu erreferentzia eskuz** beti eskura dago koadrotik atera gabe berri bat idazteko. Koadroaren oinean irakur daiteke aipuak zein estilorekin osatuko diren —APA, Chicago, MLA, IEEE edo kargatu duzun CSLa— eta esteka batek bibliografiaren aukeretara eramaten du hura aldatzeko. Forma **parentetikoak** `[@garcia2024]` sortzen du; **narratiboak**, `@garcia2024`; eta **urtea bakarrik** aukerak, `[-@garcia2024]`, izena esaldian dagoenean. Erreferentzia bakarrarekin orriak edo beste kokatzaile bat gehi daiteke, adibidez `[@garcia2024, p. 5]` edo `@garcia2024 [pp. 5–7]`. Aipu anitzek forma parentetikoa erabiltzen dute. Kurtsorea aipu baten barruan badago, botoi berak xehetasun horiek guztiak editatzen ditu. Amaierako bibliografia aurrebistan eta esportazio guztietan agertzen da.

`nire-fitxategia.md` gordetzean, EdiMarkWebek liburutegia `nire-fitxategia/references.bib` fitxategira —edo `references.json` fitxategira— kopiatzen du eta bide hori YAML metadatuetan adierazten du. Bere irudiak `nire-fitxategia/images/` karpetan biltzen dira. Lana lekuz aldatzeko, nahikoa da Markdown fitxategia eta haren `nire-fitxategia` karpeta elkarrekin mantentzea. Norberaren CSL fitxategia erabiltzen baduzu, ondoan kopiatzen da, `nire-fitxategia/style.csl` gisa, eta hura ere adierazita geratzen da: horrela aipuak berdin ikusten dira edozein ekipotan. Mahaigaineko aplikazioak liburutegia eta estiloa automatikoki berreskuratzen ditu; web bertsioan, segurtasunagatik, dokumentuaren karpeta lotu behar da —aurrebistaren gainean agertzen den **Bilatu bere karpeta…** oharra— beste nabigatzaile edo ordenagailu batean irekitzean.

---

## Bilatu eta ordezkatu

Lupak (edo `Ctrl+F`) bilatzailea irekitzen du, eta zauden panelean lan egiten du:

* Bat-etortze guztiak nabarmentzen ditu azenturik gabe edo minuskulaz idatzita ere. `Sartu` teklak hurrengora salto egiten du eta `Maius+Sartu` teklek atzera; `unekoa / guztira` kontagailuak non zauden esaten du.
* Alboko geziak ordezkapena zabaltzen du, banan-banan edo denak batera (berrespenarekin).
* **Regex** botoiak bilaketa adierazpen erregular gisa interpretatzen du: han azentuek balio dute eta `(\d+)` moduko taldeak erabil ditzakezu, ordezkapenean dolar ikurrarekin eta taldearen zenbakiarekin berreskuratzen direnak.
* `Esc` teklak itxi eta fokua editoreari itzultzen dio. Irekita dagoen bitartean, formatuaren lasterbideak etenda daude.

---

## Dokumentu bakoitzaren ezarpenak

Karaktere-kontagailuaren ondoan, egoera-barran, botoi labur bat dago beti ikusgai, dokumentua zein hizkuntzatan aterako den adierazten duena (`EU`, `ES`, `FR`…). Itzalita ikusten bada, dokumentu horrek ez du hizkuntza propiorik eta orokorra jarraitzen du. Sakatzean **Dokumentu hau** koadroa irekitzen da, bi fitxarekin:

* **Dokumentua**: hizkuntza, egilea, aurkibide automatikoa eta atalen zenbakitzea. **Hizkuntza** garrantzitsua da: fitxategiaren barruan bidaiatzen du eta horrek egiten du Word-ek eta LibreOffice-k euskarazko testu bat ingelesez zuzentzeari uztea. *Beste bat…* aukerarekin edozein hizkuntzaren kodea idatz dezakezu (`fr`, `de`, `pt-BR`) eta *Heredatua* aukerarekin orokorrera itzultzen da. Aurkibidea jarrita, editore bisualak orriaren hasieran erakusten du —atalak beren orrialde-zenbakiarekin, ikusten ari zaren banaketatik hartuta—, testuaren parte izan gabe: ezin da bertan idatzi eta ez da Markdownera ez kopiatzen duzunera iristen. Benetakoa formatu bakoitzak sortzen du esportatzean.
* **Formatua**: lerrokatzea, letra-mota eta -tamaina, lerroartea, paper-tamaina, marjinak, lehen lerroaren koska eta hitzen banaketa marratxoarekin. Letra-motan *Beste bat…* hautatzean, aplikazioak instalatuta ezagutzen dituen tipografien zerrenda agertzen da; edozein izen idatz dezakezu hemen ez badago ere —anbarrez abisatzen da eta ordezko bat erabiltzen da—, fitxategia hura duen ekipo batean amai baitezake. Eremu bakoitzaren azpian une honetan zer heredatzen duen irakurtzen da, eta ezer heredatzen ez duenak ere hala dio: han fitxategia irekitzen duen programak agintzen du.

Estekek dokumentuaren letra-mota erabiltzen dute. **Serifarik gabe** hautatzean, formuletako letra latinoak eta zifrak ere serifa gabe agertzen dira aurrebistan, PDFan eta esportazioetan. Ikur bereziek eta formulan berariaz hautatutako alfabetoek beren tipografia matematikoa gordetzen dute. Jatorrizko Markdown kodea ez da aldatzen.

Egoera-barrako pilula batek dokumentua nola aterako den laburbiltzen du: letra-tamaina, letra-mota eta lerroartea, hirurak beti. Aukera orokorretan bat hustuz gero, marratxo batek (`—`) fitxategia irekitzen duen programak agintzen duela adierazten du. Gainerakoa —lerrokatzea, koska, banaketa eta marjinak— sagua gainetik pasatzean irakurtzen da, eta sakatzean koadro bera irekitzen da bere **Formatua** fitxan.

Finkatzen duzun guztia **`.md` fitxategiaren barruan** gordetzen da, fitxategiaren hasieran marren arteko lerro batzuetan:

```
---
lang: "eu"
toc: true
align: "justify"
fontsize: "12pt"
---
```

Dokumentu bati buruzko datuak gordetzeko modu estandarra da eta programa askok ulertzen dute. Markdown editorean agertzen da, iturburu-kodea baita, baina ez editore bisualean, ez baita edukia. *Heredatua* uzten duzuna **Ezarpenak → Aukera orokorrak…** atalari jarraitzen dio, eta koadroak berak esteka bat dakar, *Editatu aukera orokorrak…*, aukera horiek fitxa beretik irekitzen dituena. *Dena kendu dokumentutik* aukerak ezer propiorik gabe uzten du.

**Formatu-profilak.** Ezarpen berberak lan askotan errepikatzen badituzu, gorde itzazu behin: koadroaren goiko aldean, *Gorde profil gisa…* aukerak izen bat eskatzen du —«TFG», «apunteak»— eta testua, orria eta aurkibidea une horretan dauden bezala gogoratzen ditu. Beste dokumentu batean nahikoa da hura hautatu eta *Aplikatu profila* sakatzea: profilak finkatzen dituen eremuak betetzen ditu eta gainerakoak dauden bezala uzten ditu, beraz oraindik uki ditzakezu berretsi aurretik. Ezer ez da dokumentura iristen *Aplikatu* sakatu arte, eta *Utzi* aukerak beti bezala baztertzen du. Lehendik dagoen profil baten izenarekin gordetzeak hura eguneratzen du. Profilak ekipo honetan geratzen dira, ez dira `.md` barruan bidaiatzen.

Formatua editore bisualari eta esportatzeko bost formatuei aplikatzen zaie, hiru salbuespenekin: **EPUBean** marjinak iradokizun bat dira, liburu-irakurgailuak agintzen baitu; **TEXean**, zure aitzinsolasak jada `geometry` kargatzen badu, zure marjinek agintzen dute eta aplikazioak abisatu egiten du; eta **hitzen banaketak** sistemaren marratxo-hiztegiak erabiltzen ditu (Linuxen, LibreOfficek hizkuntzaren paketea behar du, adibidez `hyphen-eu`).

---

## Esportatu

**Esportatu (Ctrl+Alt+E)** aukerak dokumentua entregatzeko edo argitaratzeko prest sortzen du:

* **DOCX (Word)**: Word erabiltzen dutenekin partekatzeko; Google Docs-ek ere irekitzen du.
* **ODT (LibreOffice)**: LibreOffice edo OnlyOffice bezalako suite askeetarako.
* **EPUB (liburu digitala)**: EPUB 3 irakurgailuekin bateragarria. Izenburua lehen mailako lehen izenburutik ateratzen da (edo dokumentuaren izenetik) eta egilea, azala eta hizkuntza, ezarpenetatik.
* **HTML (web-orria)**: fitxategi autonomo bat estiloak eta formulak barruan dituela, webera igotzeko prest.
* **TEX (LaTeX)**: `.tex` oso bat konpilatzeko prest dagoen goiburuarekin.
* **PDF**: inprimatzeko elkarrizketa irekitzen du, non «Gorde PDF gisa» hautatzen duzun. Ikusten duzuna bera ateratzen da, formulak osatuta eta testua hautagarri. Marjinak dokumentuarenak dira; bererik ez badu, 18 mm.

Barran esportatzeko botoi bat ere badago, bere geziarekin, kopiatzekoaren ondoan: botoiak erabili zenuen azken formatua errepikatzen du klik bakarrean —errotulu txiki batean esaten du, eta abiapuntuan DOCX da— eta geziak zerrenda bera irekitzen du.

Bibliografia bat kargatu baduzu, formatu guztiek `[@gakoa]` aipuak ebazten dituzte eta erreferentzien zerrenda gehitzen dute aukeratutako CSL estiloarekin.

### Dokumentuen aukera orokorrak

**Ezarpenak → Aukera orokorrak…** atalak dokumentu guztientzako abiapuntuko balioak gordetzen ditu, eta saio batetik bestera gogoratzen dira. Bost fitxa ditu:

* **Datuak eta aurkibidea**: **hizkuntza** (lehenetsita, interfazearen bera), **egilea** —fitxategiaren propietateetan eta EPUBaren eta LaTeX-en azalean agertzen dena; utzi hutsik Pandoc-ek DOCX eta ODTn izenaren lerroa idaztea nahi ez baduzu—, **aurkibide automatikoa** eta **atalak zenbakitu** (1, 1.1, 1.2…; ODTk ez du zenbakitze hori onartzen).
* **Testua eta orria**: aurreko ataleko testu- eta orri-ezarpen berak, abiapuntuko balio gisa. Lau jarrita datoz —**12 pt**, **serifaduna**, **1,5** lerroartea eta **A4** papera—, editore bisualak egia erakusteko behar dituenak baitira: deklaratuta, orrian ikusten dena da bost formatuetan ateratzen dena. Gainerakoak finkatu gabe ateratzen dira.
* **EPUB**: **azala**, aplikazioak izenburuarekin eta egilearekin **sortzen duena**, **zure irudi bat** (1 MB arte) edo **bat ere ez** izan daitekeena.
* **Aipuak**: BibTeX edo CSL JSON liburutegia eta, aukeran, esportatzean aplikatuko den CSL estiloa.
* **LaTeX**: **klasea** (`article`, `report` edo `book`), bere **aukerak** (`12pt, a4paper`) eta zure **aitzinsolasa**, `\begin{document}` aurretik txertatzen dena. Akatsak dituen aitzinsolasak ez du hemen abisatzen: hutsegitea konpilatzean agertzen da.

> **Aurkibideari buruz**: DOCX eta ODTn testu-prozesadoreak kalkulatzen duen eremu bat da, beraz dokumentua atalen zerrendarekin irekitzen da baina orrialde-zenbakirik gabe. Ager daitezen, eguneratu ezazu: Word-en, eskuineko klika aurkibidean → *Eguneratu eremuak*; LibreOfficen, *Tresnak → Eguneratu → Aurkibideak*.

Sakonerak H1, H1–H2 edo H1–H3 mailetara mugatzeko aukera ematen du. **Testua eta orria** atalean orientazio bertikala edo horizontala ere hauta dezakezu, eta H1 bakoitza, lehena izan ezik, orri berri batean has dadin ezarri; aurrebistak eta esportazioek hiru doikuntzak errespetatzen dituzte.

Dokumentua bere YAML metadatuekin hasten bada, haiek agintzen dute.

---

## Kopiatu deskargatu gabe

Kopiatzeko botoiak, **Esportatu** aukeraren ondoan, gauza bera egiten du baina arbelera, lau formatutan:

* *Markdown* (`Ctrl+Alt+C` eta gero `1`): iturburu-testua dagoen bezala.
* *HTML* (`Ctrl+Alt+C 2`): dokumentu osatua. Testua **bere formatuarekin** Word-era, LibreOfficera, Google Docs-era edo postara eramateko aukera da, fitxategirik gabe. Bi abisu: formulak testu gisa itsasten dira —benetako ekuazioetarako, esportatu DOCX edo ODTra— eta irudiak txertatuta badaude bakarrik bidaiatzen dute.
* *LaTeX* (`Ctrl+Alt+C 3`): uneko zatia soilik.
* *LaTeX osoa* (`Ctrl+Alt+C 4`): goiburua eta ingurunea konpilatzeko prest.

Botoiak azken formatua gogoratzen du eta bere ondoko errotulu batean esaten du, beraz errepikatzea klik bakarra da; geziak zerrenda irekitzen du aldatzeko.

---

## Mahaigaineko aplikazioa

Aplikazio bera da —menu, lasterbide eta formatu berak— **Linux, Windows eta macOSen** instalatuta. Instalatzaileak [deskargen orrian](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest) daude: `.deb` eta `.AppImage` Linuxerako, `.exe` eta `.msi` Windowserako, eta `.dmg` Apple edo Intel prozesagailua duten Mac-etarako.

Nabigatzailearen aldean hau gehitzen du:

* **Klik bikoitzez irekitzea**: `.md` eta `.markdown` fitxategiak lotuta geratzen dira, EdiMarkWeb-en ikonoa erakusten dute fitxategi-kudeatzailean eta aplikazioan irekitzen dira; jada irekita badago, dokumentua leiho horretara bertara iristen da, eta leihoa aurrera etortzen da. Eta fitxategi hori jada irekita bazegoen, bere fitxara itzultzen da bikoiztu beharrean. (Ikonoa `.deb` paketeak eta Windowseko instalatzaileek jartzen dute; AppImage-k ez du sistema ukitzen.)
* **Gordetzeak benetako fitxategian idazten du**, deskargen karpetatik pasatu gabe.
* **Sistemaren zuzentzaile ortografikoa**, ekipoko hiztegiekin (Linuxen instalatu behar izan daitezke, adibidez `hunspell-eu`).
* **Konexiorik gabe funtzionatzen du**: Pandoc eta EdiCuaTeX barruan daramatza. Internet bertsio berririk dagoen egiaztatzeko bakarrik behar da.

**Eguneraketak**: abiaraztean egunean behin egiaztatzen du bertsio berririk dagoen eta, badago, abisu bat agertzen da **Deskargatu eta instalatu** botoiarekin, instalatzailea jaitsi eta abiarazten duena. Instalatzaile batek ere ezin dituenez aplikazio ireki baten fitxategiak ordeztu, abisu berak **Itxi EdiMarkWeb** dakar, gorde eta ixten duena. AppImage batekin, aplikazioak berria deskargatzen du eta bere karpeta irekitzen du aurrekoa ordez dezazun. Egiaztapena nahi duzunean eska dezakezu **Laguntza → Bilatu eguneraketak…** atalean, edo desaktibatu **Egiaztatu abiaraztean** laukiarekin.

Dokumentuak Markdown fitxategi berberak dira bi bertsioetan eta batetik bestera pasatzen dira bihurketarik gabe; partekatzen ez dena gordetze automatikoa da, bertsio bakoitzak bere lan-kopia bere espazioan gordetzen baitu.

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
| Zerrenda-puntu bat habiaratu / atera | `Tab` / `Maius` + `Tab` | `Tab` / `Maius` + `Tab` |
| Maila bat igo (puntu huts batean) | `Sartu` | `Sartu` |
| Kodea | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Esteka | `Ctrl` + `K` | `Cmd` + `K` |
| Irudia | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` |
| Taula | `Ctrl` + `Shift` + `T` | `Cmd` + `Shift` + `T` |
| `$...$` formula (lerroan) | `Ctrl` + `M` gero `1` | `Cmd` + `M` gero `1` |
| `$$...$$` formula (blokean) | `Ctrl` + `M` gero `2` | `Cmd` + `M` gero `2` |
| `\(...\)` formula (lerroan) | `Ctrl` + `M` gero `3` | `Cmd` + `M` gero `3` |
| `\[...\]` formula (blokean) | `Ctrl` + `M` gero `4` | `Cmd` + `M` gero `4` |
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
| Kopiatu (`1` Markdown · `2` HTML · `3` LaTeX · `4` LaTeX osoa) | `Ctrl` + `Alt` + `C` gero `1`–`4` | `Cmd` + `Alt` + `C` gero `1`–`4` |
| Ireki Ezarpenak | `Ctrl` + `,` | `Cmd` + `,` |
| Editatzeko eremua maximizatu | `Ctrl` + `Shift` + `F` | `Cmd` + `Shift` + `F` |
| Antolaketa aldatu | `Ctrl` + `L` | `Cmd` + `L` |
| Bilatu | `Ctrl` + `F` | `Cmd` + `F` |
| Zauden panela handitu / txikitu | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Erabiltzailearen eskuliburua | `Ctrl` + `H` edo `F1` | `Cmd` + `H` edo `F1` |
| Eskuliburua birkargatu | `Ctrl` + `Shift` + `H` | `Cmd` + `Shift` + `H` |
| Inprimatu | `Ctrl` + `P` | `Cmd` + `P` |

Letra bakarreko lasterbideek dokumentuaren gainean eragiten dute, beraz eten egiten dira bilatzailea irekita dagoen bitartean.

---

## Lizentzia eta ekarpenak

EdiMarkWeb software librea da [GNU Affero General Public License v3.0](LICENSE) lizentziapean: zure ikasgelan erabil dezakezu, egokitu eta zure zerbitzarietan zabaldu, betiere edozein hobekuntza lizentzia beraren pean partekatzen baduzu eta zure bertsioa erabiltzen dutenei kodea eskaintzen badiezu. Arazoren bat aurkitzen baduzu edo aldaketak proposatu nahi badituzu, ireki gorabehera bat [GitHuben](https://github.com/edimarkweb/edimarkweb.github.io/issues) edo bidali pull request bat.
