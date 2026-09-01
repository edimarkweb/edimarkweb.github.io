![EdiMarkWeb logo](logo_100px.png)

# EdiMarkWeb manual

EdiMarkWeb is a **Markdown text editor** made for teachers and content creators: you write quickly, export to Word, LibreOffice, EPUB, HTML, LaTeX and PDF, and you can add mathematical formulas. It runs **in the browser**, with nothing to install, and also as a **desktop application** for Linux, Windows and macOS. Either way the work happens on your own computer: neither the documents nor the images leave it.

## Getting started

Type in the left-hand pane and watch the document take shape on the right. You do not need to know Markdown: the toolbar buttons add bold, headings, lists, tables, links, images and formulas, and they work **in both panes**.

When you are done there are two ways out: **Save** (`Ctrl+S`) leaves a `.md` file, which is plain text and opens anywhere, and **Export** produces the DOCX, the PDF or whichever format you have to hand in.

---

## The two editors

The working area is split into two resizable panes. **Both edit the same document**, always in sync:

* **Markdown editor** (left): the source, as it is. Everything you type here appears at once in the other pane.
* **Visual editor** (right): the finished document, shown as a sheet of paper on a desk, and **you write straight onto it**. The formatting bar works here too: bold, italics, headings, quotes, lists, links, images, tables and formulas apply to what you see and the Markdown is rewritten on its own. The same button removes what it added, and `Ctrl+Z` undoes even while you are on the sheet, because the history belongs to the document. The button with the code icon switches between the finished document and the generated HTML.

**Active pane**: with both in view, one is in charge — the one the buttons and the zoom act on. You recognise it by the coloured edge and by the label in the status bar, which names the active pane only.

**Splitting them**: drag the central bar, or use `Ctrl+L` and the three layout buttons — Markdown editor only, both at once, visual editor only. The double arrow **maximizes the editing area**, hiding the bars and leaving the screen for the text.

**The zoom** in the status bar (`−`, the percentage and `+`, or `Ctrl` + `+` / `Ctrl` + `-`) enlarges or shrinks what you see in the active pane. It enlarges the whole sheet, pages and margins included, so the page never reflows. It changes neither the document nor what is exported or printed —paper always comes out at 100 %—: the font size lives in *Text format*.

**The pane tied to the zoom** (the chain switch, left of the zoom) keeps the page whole at all times, and works both ways: move the splitter and the zoom is recalculated so the sheet still fits —the percentage then shows blue and underlined, because it set it, not you—; touch the zoom and it is the splitter that moves aside to make room for the sheet. No horizontal scrollbar appears, and the page layout is always kept.

It comes switched on. It stops where the Markdown editor would lose its minimum width: at that point the `+` goes dim and says so on hover. To enlarge beyond that, release the switch —the chain opens and turns amber— or leave the visual editor on its own (`Ctrl` + `L`), which gives it the full width.

The sheet fills the pane rather than merely fitting in it: give the visual editor more room and the page grows past 100 % —up to 200 %, as far as the zoom goes—. 100 % is the real size of the paper, the one that comes out in print, and it is one click away on the central percentage; to keep it there, release the switch.

All of this belongs to the two panes side by side, where one's width is taken from the other. With a single pane in view, or on a narrow screen where they stack one above the other, the switch steps aside and the zoom is free.

**Pages**: the sheet is as wide as the paper —A4 or Letter, whichever the document says— and the visual editor lays the text out in pages, with a gap between one and the next. The break always falls between two blocks, never mid-line: whatever does not fit at the end of a page moves whole to the next one, as in a word processor. It is faithful to the PDF and to printing, which come out of this very sheet and break where it breaks; for Word or LaTeX it is a guide, because each one lays out its lines its own way. With the pane tied to the zoom the layout is always kept; it only steps aside if you release the switch and set a zoom at which the sheet does not fit in the pane.

### Paste anything

With `Ctrl+V` or the **Paste** button, EdiMarkWeb puts whatever is on the clipboard into the right pane: plain text and Markdown go to the Markdown editor, at the cursor position; formatted content (Word, LibreOffice, a web page, a formula from a chatbot) and even images are rendered in the visual editor and generate their Markdown. No intermediate steps: copy from wherever and paste.

Holding `Ctrl` (or `Cmd`), a click on a link in the visual editor opens it; in the desktop application, in your usual browser.

---

## Tabs

Each document lives in its own tab. `Ctrl+T` creates one; `Ctrl+Tab` moves between them and each remembers where you left it. Double-click the title to rename it, the `X` to close it, and a red dot (`●`) warns of unsaved changes.

They all **autosave** on your computer: if you reload the page or open the program again, the content is back. It is a safety net, not a replacement for saving the file.

---

## Menus and toolbar

Next to the logo sit the **File**, **Export** and **Settings** menus. On the right, the everyday actions as single icons: **Save**, **Export**, **Copy**, **Print**, **Search** and **Help**.

* **File**: `Open (Ctrl+O)`, `Import (Ctrl+Alt+O)` and `Paste LaTeX (Ctrl+Shift+V)` bring content in; `Save (Ctrl+S)` and `Save as… (Ctrl+Shift+S)` take it out. In the desktop application it ends with **Quit**, which saves before closing.
* **Export (Ctrl+Alt+E)**: the six formats, each with a line saying what it is for.
* **Settings (Ctrl+,)**: interface **Language**; **Theme** (System, Light or Dark, remembered); **Separate window**, which opens EdiMarkWeb with no tabs or address bar (web version only); **Spell checker**, which underlines mistakes using the dictionaries installed on your computer and follows the document language; and **General document options…**.
* **Print (Ctrl+P)**: a view ready for paper or PDF.
* **Help**: the **Manual (F1)**, **About EdiMarkWeb** — version, author and licences — and, on the desktop, **Check for updates…**.

The toolbar below gathers undo and redo, bold, italics, headings (H1…H6), lists, quotes, code, links, images, tables, **bibliographic citations**, **Paste** and formulas. Each button says what it does, and its shortcut, when you hover over it. On small screens it folds into two buttons, **Actions** and **Format**.

---

## Opening, importing and dragging

* **Open (`Ctrl+O`)**: `.md` and `.markdown` files.
* **Import (`Ctrl+Alt+O`)**: converts `.docx`, `.odt`, `.epub`, `.html` and `.tex` documents to Markdown with Pandoc, keeping headings, lists, tables, links and images. From an `.epub` the book language comes back too.
* **Drag and drop**: drop one or several files of those same types onto the application and each opens in its own tab. Whole folders work as well: their subfolders are walked in alphabetical order and anything unsupported is ignored. If the document was already open, it is not duplicated: the application goes back to its tab.

In the desktop application `Ctrl+S` writes over the file you opened; in the browser it downloads. The folder you use is remembered while the application is open, so the next open, save or export dialogs start where you were.

---

## Images

The **Image** button takes a file from disk or a URL, and asks how to insert it:

* **As a relative path** (recommended): the document only names the image —`![Chart](images/01.png)`— and the file stays in its folder. This is what every Markdown editor does and it keeps the `.md` small; in exchange, the document and its image folder travel together.
* **Inside the document**: the image is embedded in the file, which becomes self-contained but much heavier. Handy for emailing a single `.md`.

**Relative paths.** In the desktop application the images are found on their own in the document folder. In the browser no page may read a folder without permission: if images are missing, a notice appears with the **Find its folder…** button and, once you choose it, they all show up. Doing it once is enough. On saving, those images are copied next to the `.md` keeping their paths (or inside a ZIP, if the browser will not write folders). The Markdown never changes: what you save, copy or export carries the path you wrote.

**Image manager.** Under the Markdown editor, a list brings together the images in the document. Every image can be **viewed**, **replaced** with another pasted from the clipboard, chosen from disk or entered as a URL, and **removed from the document**. Linked images show their path or URL and can also be **embedded** as Base64; removing the reference does not delete the original file or remote image. For online images, conversion depends on the server allowing the browser to download them; if it blocks the request, the document does not change. Images that are already embedded show their format and size and let you view or copy their code.

Base64 code takes thousands of characters, so EdiMarkWeb folds it away and leaves a short marker such as `__EDIMARK_B64_1__` in the editor; the real content is kept intact when saving, copying and exporting. The **Move embedded images to the folder** button goes the other way: each image becomes a file inside the document resource subfolder (`my-file.md` → `my-file/images/`) and the Markdown keeps its path. The files are written when you save, and `Ctrl+Z` undoes the change.

---

## Mathematical formulas

Formulas are written in LaTeX and typeset on the spot with KaTeX. There are three ways to add them:

* **Formula menu** (in the Markdown editor): `Ctrl+M` opens the wait — the status bar reminds you of the keys — and then `1`, `2`, `3` or `4` picks the delimiter (`$...$`, `$$...$$`, `\(...\)` or `\[...\]`); `Enter` inserts `$...$` and `Esc` cancels.
* **Formula window** (in the visual editor): the `{}` button —or `Ctrl+M`, which asks about no delimiters here— opens a window with the LaTeX code and the result in view as you type, with the error message if there is one. There you choose whether it goes inline or as a block, and with which delimiters. It works this way because there is nowhere to type inside an empty `$…$` on the sheet: KaTeX turns it into a formula as soon as it repaints.
* **EdiCuaTeX (`Ctrl+Alt+M`)**: the built-in visual formula editor, for building them with the mouse. When you accept, the formula comes back inserted.

### LaTeX formula examples

#### Quadratic formula

To solve a quadratic equation such as $ax^2 + bx + c = 0$, you use:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

#### 2x2 matrix

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

#### Other delimiters

As well as `$...$` and `$$...$$`, you can use LaTeX's own delimiters: \(E = mc^2\) inline, and as a block:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

#### Sums, limits and integrals

The sum of the first $n$ natural numbers is $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ and the integral $\int_0^1 x^2\,dx = \frac{1}{3}$. The number $e$ is defined as a limit:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

#### Systems of equations

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

#### Assorted symbols

Greek letters ($\alpha$, $\beta$, $\Omega$), subscripts ($H_2O$), comparisons ($a \neq b$, $x \leq y$) and sets ($\mathbb{R}$, $A \subseteq B$).

---

## Citations and bibliography

Under **Settings → General document options… → Citations**, load a **BibTeX** (`.bib`) or **CSL JSON** (`.json`) library. **Load example bibliography** prepares seven complete references. Use **Add reference…** to expand the loaded library—including the example—or create a new one. Journal articles, books, chapters, reports, web pages, theses and conference papers are supported, with the specific fields needed to compose the final references correctly. **APA 7** is the initial style; you can also choose Chicago author-date, MLA 9, IEEE, or load your own **CSL** (`.csl`) file. You can also change the bibliography title and its H1–H6 level. Files are not sent to any service.

The book button —or `Ctrl+Alt+B`— opens a search by author, title, year or key. The **parenthetical** form produces `[@garcia2024]`; the **narrative** form, `@garcia2024`; and **year only**, `[-@garcia2024]`, for a name already written in the sentence. With one reference you can add pages or another locator, such as `[@garcia2024, p. 5]` or `@garcia2024 [pp. 5–7]`. Multiple citations use the parenthetical form. If the cursor is inside a citation, the same button edits all these details. The final bibliography appears in the preview and all exports.

When `my-file.md` is saved, EdiMarkWeb copies the library to `my-file/references.bib`—or `references.json`—and declares that path in the YAML metadata. Its own images are grouped under `my-file/images/`. To move the work, keep the Markdown and its `my-file` folder together. The desktop app retrieves the library automatically; for security, in the web version press **Link resource folder…** and choose `my-file` after opening it in another browser or computer. A custom CSL style remains a local device preference.

---

## Search and replace

The magnifier (or `Ctrl+F`) opens the search box, which works in whichever pane you are in:

* It highlights every match even if you type without accents or in lower case. `Enter` jumps to the next one and `Shift+Enter` goes back; the `current / total` counter tells you where you are.
* The side arrow reveals the replace box, one at a time or all at once (with confirmation).
* The **Regex** button reads your search as a regular expression: accents do count there, and you can use groups such as `(\d+)`, recovered in the replacement with the dollar sign and the group number.
* `Esc` closes it and returns the focus to the editor. While it is open, the formatting shortcuts are paused.

---

## Each document's settings

Next to the character counter, in the status bar, there is a short button, always in view, with the language the document will come out in (`EN`, `ES`, `FR`…). If it looks dimmed, that document has no language of its own and follows the general one. Pressing it opens the **This document** dialog, with two tabs:

* **Document**: language, author, table of contents and section numbering. The **language** matters: it travels inside the file and it is what stops Word and LibreOffice from spell-checking a Spanish text against an English dictionary. With *Other…* you can write the code of any language (`fr`, `de`, `pt-BR`), and *Inherited* returns to the general one. With the table of contents on, the visual editor shows it at the top of the sheet —the sections with their page number, taken from the layout you are looking at— without it being part of the text: you cannot type in it and it never reaches the Markdown or what you copy. The real one is generated by each format on export.
* **Format**: alignment, font and font size, line spacing, paper size, margins, first-line indent and hyphenation. Choosing *Other…* for the font shows a list of the typefaces the application can see installed; you may write any name even if it is not there — you are warned in amber and a fallback is used — because the file may end up on a computer that does have it. Under each field you can read what it inherits right now, and the ones that inherit nothing say so too: there it is up to whichever program opens the file.

A pill in the status bar sums up how the document will come out: the font size, the typeface and the line spacing, all three always. If you ever empty one in the general options, a dash (`—`) warns that whichever program opens the file decides that one. The rest —alignment, indent, hyphenation and margins— is read by hovering over it, and clicking it opens this same dialog on its **Format** tab.

Everything you set is stored **inside the `.md` itself**, in a few lines between dashes at the top of the file:

```
---
lang: "en"
toc: true
align: "justify"
fontsize: "12pt"
---
```

This is the standard way of storing data about a document and many programs understand it. It appears in the Markdown editor, which is the source, but not in the visual editor, because it is not content. Whatever you leave as *Inherited* follows **Settings → General document options…**, and the dialog itself carries a link, *Edit general options…*, which opens those options on the same tab. *Remove everything from the document* leaves it with nothing of its own.

The format applies to the visual editor and to all five export formats, with three caveats: in the **EPUB** the margins are a suggestion, because the reading device is in charge; in **TEX**, if your preamble already loads `geometry`, your margins win and the application says so; and **hyphenation** uses the system's hyphenation dictionaries (on Linux, LibreOffice needs the language package, for example `hyphen-en-gb`).

---

## Exporting

**Export (Ctrl+Alt+E)** produces the document ready to hand in or publish:

* **DOCX (Word)**: to share with Word users; Google Docs opens it too.
* **ODT (LibreOffice)**: for free suites such as LibreOffice or OnlyOffice.
* **EPUB (digital book)**: compatible with EPUB 3 readers. The title comes from the first level-1 heading (or from the document name), and the author, cover and language from the settings.
* **HTML (web page)**: a self-contained file with the styles and formulas inside, ready to upload.
* **TEX (LaTeX)**: a complete `.tex` with a header ready to compile.
* **PDF**: opens the print dialog, where you choose «Save as PDF». You get exactly what you see, with the formulas typeset and the text selectable. The margins are the document's; with none of its own, 18 mm.

The toolbar also carries an export button with its arrow, next to the copy one: the button repeats the last format you used with a single click —it says so on a small label, and it starts at DOCX— and the arrow opens this same list.

With a bibliography loaded, every format resolves `[@key]` citations and adds the reference list in the chosen CSL style.

### General document options

**Settings → General document options…** stores the starting values for every document, and they are remembered between sessions. It has five tabs:

* **Details & outline**: **language** (by default, the same as the interface), **author** — which appears in the file properties and on the EPUB and LaTeX cover; leave it empty if you do not want Pandoc to write the name line in DOCX and ODT —, **table of contents** and **number the sections** (1, 1.1, 1.2…; ODT does not support that numbering).
* **Text & page**: the same text and page settings as the section above, as starting values. Four come already set —**12 pt**, **serif**, **1.5** line spacing and **A4** paper—, because those are the ones the visual editor needs in order to show the truth: once declared, what you see on the sheet is what comes out in all five formats. The rest start unset.
* **EPUB**: the **cover**, which can be the one the application **generates** with the title and author, **an image of your own** (up to 1 MB) or **none**.
* **Citations**: the BibTeX or CSL JSON library and, optionally, the CSL style applied on export.
* **LaTeX**: the **class** (`article`, `report` or `book`), its **options** (`12pt, a4paper`) and a **preamble** of your own, inserted just before `\begin{document}`. A faulty preamble raises no warning here: the error shows up when compiling.

> **About the table of contents**: in DOCX and ODT it is a field the word processor calculates, so the document opens with the list of sections but without page numbers. To get them, update it: in Word, right-click the table of contents → *Update field*; in LibreOffice, *Tools → Update → Indexes and Tables*.

Depth can limit it to H1, H1–H2, or H1–H3. Under **Text & page** you can also choose portrait or landscape orientation and make every H1 except the first start on a new page; the preview and exports respect all three settings.

If the document starts with its own YAML metadata, that is what counts.

---

## Copying without downloading

The copy button, next to **Export**, does the same thing but to the clipboard, in four formats:

* *Markdown* (`Ctrl+Alt+C` then `1`): the source text as it is.
* *HTML* (`Ctrl+Alt+C 2`): the rendered document. This is the option for taking the text **with its formatting** to Word, LibreOffice, Google Docs or email, with no file in between. Two warnings: formulas are pasted as text — for real equations, export to DOCX or ODT — and images only travel if they are embedded.
* *LaTeX* (`Ctrl+Alt+C 3`): the current fragment only.
* *Full LaTeX* (`Ctrl+Alt+C 4`): with the header and environment ready to compile.

The button remembers the last format and shows it on a small label beside it, so repeating is a single click; the arrow opens the list to change it.

---

## The desktop application

It is the same application — the same menus, shortcuts and formats — installed on **Linux, Windows and macOS**. The installers are on the [downloads page](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest): `.deb` and `.AppImage` for Linux, `.exe` and `.msi` for Windows, and `.dmg` for Macs with Apple or Intel processors.

Compared with the browser it adds:

* **Double-click to open**: `.md` and `.markdown` files are associated with EdiMarkWeb, show its icon in the file manager and open in the application; if it is already running, the document reaches that same window, which comes to the front. And if that file was already open, it goes back to its tab instead of being duplicated. (The icon is installed by the `.deb` package and the Windows installers; the AppImage touches nothing on the system.)
* **Save writes to the real file**, with no trip through the downloads folder.
* **System spell checker**, using the dictionaries on your computer (on Linux you may have to install them, for example `hunspell-en-gb`).
* **Works offline**: it carries Pandoc and EdiCuaTeX inside. The internet is only needed to check for new versions.

**Updates**: on startup it checks once a day for a newer version and, when there is one, a notice appears with **Download and install**, which fetches the installer and launches it. Since no installer can replace the files of a running application, the same notice offers **Close EdiMarkWeb**, which saves and quits. With an AppImage, the application downloads the new one and opens its folder so you can replace the old file. You can ask for the check whenever you like from **Help → Check for updates…**, or turn it off with the **Check on startup** box.

The documents are the same plain Markdown files in both versions and move from one to the other with no conversion; what is not shared is the autosave, because each version keeps its working copy in its own storage.

---

## Keyboard shortcuts

| Action | Shortcut (Windows/Linux) | Shortcut (macOS) |
| :--- | :--- | :--- |
| **Formatting** | | |
| Bold | `Ctrl` + `B` | `Cmd` + `B` |
| Italic | `Ctrl` + `I` | `Cmd` + `I` |
| Headings 1-6 | `Ctrl` + `1..6` | `Cmd` + `1..6` |
| Bulleted list | `Ctrl` + `Shift` + `L` | `Cmd` + `Shift` + `L` |
| Numbered list | `Ctrl` + `Shift` + `O` | `Cmd` + `Shift` + `O` |
| Quote | `Ctrl` + `Shift` + `Q` | `Cmd` + `Shift` + `Q` |
| Nest / unnest a list item | `Tab` / `Shift` + `Tab` | `Tab` / `Shift` + `Tab` |
| Move up one level (on an empty item) | `Enter` | `Enter` |
| Code | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| Link | `Ctrl` + `K` | `Cmd` + `K` |
| Image | `Ctrl` + `Shift` + `I` | `Cmd` + `Shift` + `I` |
| Table | `Ctrl` + `Shift` + `T` | `Cmd` + `Shift` + `T` |
| Formula `$...$` (inline) | `Ctrl` + `M` then `1` | `Cmd` + `M` then `1` |
| Formula `$$...$$` (block) | `Ctrl` + `M` then `2` | `Cmd` + `M` then `2` |
| Formula `\(...\)` (inline) | `Ctrl` + `M` then `3` | `Cmd` + `M` then `3` |
| Formula `\[...\]` (block) | `Ctrl` + `M` then `4` | `Cmd` + `M` then `4` |
| Undo / Redo | `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | `Cmd` + `Z` / `Cmd` + `Shift` + `Z` |
| **Managing documents** | | |
| New tab | `Ctrl` + `T` | `Cmd` + `T` |
| Close tab | `Ctrl` + `W` | `Cmd` + `W` |
| Next / previous tab | `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab` | `Cmd` + `Tab` / `Cmd` + `Shift` + `Tab` |
| Save | `Ctrl` + `S` | `Cmd` + `S` |
| Save as… | `Ctrl` + `Shift` + `S` | `Cmd` + `Shift` + `S` |
| Open file | `Ctrl` + `O` | `Cmd` + `O` |
| Import document | `Ctrl` + `Alt` + `O` | `Cmd` + `Alt` + `O` |
| Paste LaTeX (open dialog) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interface** | | |
| Open EdiCuaTeX | `Ctrl` + `Alt` + `M` | `Cmd` + `Alt` + `M` |
| Paste from clipboard | `Ctrl` + `Alt` + `V` | `Cmd` + `Alt` + `V` |
| Open Export | `Ctrl` + `Alt` + `E` | `Cmd` + `Alt` + `E` |
| Copy (`1` Markdown · `2` HTML · `3` LaTeX · `4` full LaTeX) | `Ctrl` + `Alt` + `C` then `1`–`4` | `Cmd` + `Alt` + `C` then `1`–`4` |
| Open Settings | `Ctrl` + `,` | `Cmd` + `,` |
| Maximize editing area | `Ctrl` + `Shift` + `F` | `Cmd` + `Shift` + `F` |
| Change layout | `Ctrl` + `L` | `Cmd` + `L` |
| Search | `Ctrl` + `F` | `Cmd` + `F` |
| Zoom the pane you are in, in / out | `Ctrl` + `+` / `Ctrl` + `-` | `Cmd` + `+` / `Cmd` + `-` |
| Manual | `Ctrl` + `H` or `F1` | `Cmd` + `H` or `F1` |
| Reload the manual | `Ctrl` + `Shift` + `H` | `Cmd` + `Shift` + `H` |
| Print | `Ctrl` + `P` | `Cmd` + `P` |

Single-letter shortcuts act on the document, so they are paused while the search box is open.

---

## Licence and contributions

EdiMarkWeb is free software under the [GNU Affero General Public License v3.0](LICENSE): you may use it in your classroom, adapt it and deploy it on your own servers, as long as you share any improvement under the same licence and offer the code to whoever uses your version. If you find a problem or want to propose changes, open an issue on [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) or send a pull request.
