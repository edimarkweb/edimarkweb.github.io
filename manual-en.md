![EdiMarkWeb logo](logo_100px.png)

# EdiMarkWeb manual

Welcome to EdiMarkWeb, a **Markdown text editor** designed for teachers and content creators who need to work quickly, export to several formats and add LaTeX maths without complications. You can use it **in the browser**, with nothing to install, or **install it as a desktop application** on Linux, Windows and macOS. Either way the work happens on your own computer: neither the documents nor the images leave it.

## Highlights

- Dual editing: work either in Markdown or straight in the HTML preview, always in sync.
- Export and import menus supporting DOCX, ODT, EPUB, HTML, LaTeX and PDF, including options to copy directly to the clipboard.
- Search and replace that highlights matches and ignores accents and letter case.
- A **Settings** menu gathering the language, theme and separate window in one place; each pane carries its own zoom in its header; the working width is changed beside the pane controls.
- Interface theme with three options — System, Light and Dark — remembered between sessions.
- Redesigned formula menu and direct access to EdiCuaTeX for building complex expressions.
- Open several files, or whole folders, by dragging them onto the editor (each file in its own tab): Markdown and also DOCX, ODT, EPUB, HTML or TEX, converted on the fly with Pandoc.
- Regular-expression search and a full-screen editing mode for distraction-free work.
- **A language for each document**, stored inside the file itself and shown next to the character counter. All five formats declare it, so Word and LibreOffice stop spell-checking a Spanish text against an English dictionary.
- **Export options** gathered in one place: author, EPUB cover, table of contents, section numbering and, for LaTeX, the class, its options and a preamble of your own.
- **Desktop application** for Linux, Windows and macOS, with documents opening on a double click, saving over the original file, the system spell checker and offline operation.
- **New-version notice** in the desktop application, which downloads and installs the update for you.

## Paste anything

> **Important:** you can paste **any object from the clipboard**: plain text, fragments from Word or LibreOffice, full HTML, formulas produced by a chatbot and even images copied directly. Use `Ctrl+V`/`Cmd+V` or the toolbar button with the clipboard icon (`Paste`) and EdiMarkWeb will place the content in the appropriate pane:

- Markdown or unformatted text is inserted in the left pane exactly at the cursor position.
- Rich content (HTML, DOCX, pasted from the browser, etc.) is re-rendered in the right pane and, at the same time, the matching Markdown is generated so both views stay in sync.

This removes any intermediate steps: copy from your source of choice and click **Paste** to carry on editing.

The **Image** button also lets you choose a file from disk instead of entering a URL, and it asks how you want to insert it:

* **As a relative path** (recommended, and the option already selected): the document simply names the image —`![Chart](images/01.png)`— and the file stays where it is. This is what every Markdown editor does and what keeps the `.md` small and readable; in exchange, the document and its image folder travel together.
* **Inside the document**: the image is embedded in the file itself, which becomes self-contained but much heavier. Handy for emailing a single `.md`.

In the desktop application the path is worked out from the document folder. In the browser there is no way to know the image folder, so only its name is written and you are told about it.

---

## Managing documents (tabs)

Work on several documents at once, each in its own tab.

* **New tabs**: press the `+` button (or `Ctrl+T`) to open a blank document.
* **Switching tabs**: click the name to show its contents, or move from one to the next with `Ctrl+Tab`. Each tab remembers where you left it: when you come back, the cursor and both panes are where they were.
* **Renaming**: double-click the title to give it a more descriptive name (e.g. “Unit 3 – Equations”).
* **Closing tabs**: press the `X`. If there are unsaved changes, the application will warn you.
* **Unsaved changes**: a red dot (`●`) marks pending modifications.
* **Autosave**: each tab keeps a copy on its own in the application's own storage; if you reload the page or open the program again, the content reappears. It is a safety net, not a replacement for saving the file.

---

## Top control bar

The header has two halves. Next to the logo sit the three menus —**File**, **Export** and **Settings**—, spelled out and without an icon, like the menu bar of any desktop program. At the far right, the everyday actions, as single-icon buttons: **Save**, **Copy**, **Print**, **Search** and **Help**.

* **Save (Ctrl+S)**: the first button on the right. When the open document has pending changes, a red dot appears in its corner, the same one that marks the tab.
* **Export (Ctrl+Alt+E)**: the six formats —DOCX, ODT, EPUB, HTML, TEX and PDF—, each with a line saying what it is for.
* **File**: everything that is not everyday work. `Open (Ctrl+O)`, `Import (Ctrl+Alt+O)` and `Paste LaTeX (Ctrl+Shift+V)` bring content in; `Save (Ctrl+S)` and `Save as… (Ctrl+Shift+S)` take it out. Save is here as well as on its icon: the menu entry spells out its shortcut, and «Save as…» reads oddly without «Save» beside it. Each option shows its keyboard shortcut. In the desktop application the menu ends with **Quit**, which saves the current document and closes the application.
* **Settings**: gathers every application setting, each one in a submenu showing the current value.
  * **Language**: changes the interface language.
  * **Theme**: `System` follows your computer's setting and changes with it; `Light` and `Dark` fix it. Your choice is remembered next time you open the application.
  * **Separate window**: opens EdiMarkWeb in a browser window of its own, with no tabs or address bar. It only appears in the web version; the desktop application is already a window of its own.
  * **Spell checker**: underlines mistakes in the Markdown pane using the dictionaries installed on the computer, following the document language. It is on by default; unchecking it turns it off and the choice is remembered.
  * **Export options…**: opens the settings for the files the application generates (language, plus class and preamble for LaTeX), explained below.
* **Print (Ctrl+P)**: produces a view ready for paper or PDF using the current styles.
* **Search (Ctrl+F)**: opens the advanced search panel.
* **Help**: the question-mark button holds the **User manual (F1)**, **About EdiMarkWeb** —installed version, author, licence and third-party licences, with links to the web version and to the downloads— and, in the desktop application, **Check for updates…**.

The pane layout is changed with `Ctrl+L` or with the three layout buttons next to the editing-area button: **source only**, **both panels** and **result only**, in that order, with the active one highlighted. On narrow screens the three fold into a menu with the same options. On small screens the bar folds into two buttons — **Actions** and **Format** — that show each group when you need it.

---

## Toolbar

The grey strip below the top bar holds quick access to formatting and elements:

* **Undo and redo**: the two arrows at the far left (`Ctrl+Z` and `Ctrl+Shift+Z`).
* **Basic styles**: bold, italic and a headings menu (H1…H6).
* **Lists and quotes**: bullets, numbering and quote blocks with their own shortcuts.
* **Code, links, images and tables**: guided insertion through dialogs.
* **Paste**: brings whatever is on the clipboard into the document, as explained above.
* **LaTeX formulas**: a menu with the four delimiters —`$...$`, `$$...$$`, `\(...\)` and `\[...\]`—, each with its shortcut alongside. They work as a chord: `Ctrl+M` starts the wait —the status bar lists the keys— and then `1`, `2`, `3` or `4` picks the delimiter; `Enter` or a repeated `M` insert `$...$`, the usual one, and `Esc` or any other key cancels. A separate combination for each delimiter ends up clashing with the browser or the desktop: `Ctrl+Shift+J` is the browser console and `Ctrl+Shift+M` may be the system magnifier, and neither gives its shortcut up.
* **Formula editor (EdiCuaTeX)**: opens the integrated assistant with `Ctrl+Alt+M`. On accepting, the formula comes back inserted in the editor.

Each button shows a description on hover and states the equivalent keyboard shortcut.

---

## Search and replace

The magnifying glass button (or `Ctrl+F`) opens an advanced search panel:

* The search box highlights every match, even if you ignore accents or capitals.
* Use `Enter` to jump to the next match and `Shift+Enter` to go back.
* Press the side arrow to show the replace panel. You can replace matches one by one or all at once (with confirmation).
* The **Regex** button reads what you type as a regular expression. In this mode accents do count (letter case is still ignored) and you can use groups such as `(\d+)`; in the replacement you refer back to them with JavaScript's usual numbered references (a dollar sign followed by the group number).
* The `current / total` counter helps you follow your progress.
* `Esc` closes the search box and returns the focus to the editor.

Search works both in the Markdown view and in the HTML view, depending on where the focus is. While the search box is open the formatting shortcuts are paused, so they don't interfere with what you type in it.

---

## Main interface

The working area is split into two resizable panes:

* **Markdown** (left): a plain text editor with its own zoom, a character counter, the document language indicator and its copy button. The zoom (`−`, the percentage and `+`, or `Ctrl` + `+` / `Ctrl` + `-`) makes the editor text bigger or smaller without touching the document; the percentage goes back to 100%. Everything you type here is immediately reflected in the right pane.
* **HTML / Preview** (right): shows the final result and also lets you edit the content directly. Use the code icon button to switch between the rich preview and the generated HTML. The document is shown as a sheet on a desk, and the zoom to its left (`−`, the percentage and `+`) makes it bigger or smaller on screen; clicking the percentage goes back to 100%. It is a magnifier: it changes neither the text nor what you export — the document size lives in *Text format*.
* **Copying content**: dedicated buttons to copy the Markdown or the generated HTML (including formulas converted to LaTeX when copying HTML).

You can drag the central bar to give more room to either pane, choose one of the three layouts from the buttons on the right, or use the double arrow to **maximise the editing area**, which hides the top bars and leaves the screen to the text. The `+` button stays immediately after the last tab.

### Each document’s settings

Next to the character counter there is a short button with the document language: `ES`, `CA`, `FR`… When it looks dimmed, that document has no language of its own and uses the **general language** from *Settings → Export options…*, which is the usual case.

Pick a specific language and the application stores it **inside the document itself**, so it travels with the file: save it and open it tomorrow, here or on another computer, or hand it to someone else, and it stays. To go back, choose *General language*. And with *Other language…* you can type the code of any language (`fr`, `de`, `pt-BR`). In that same menu, *This document's author…* does the same for the author.

The **This document** dialog also holds the **table of contents** and the **section numbering**, with the same three choices: *Inherited*, *Yes* and *No*. They are the same settings as in *Export options*, but stated by this document, which is where they are usually decided: a manual wants a numbered table of contents and a two-paragraph note does not. Under each field you can read what it inherits right now, and an explicit *No* takes the table of contents away from this document even when the general option asks for one.

If you ever open your `.md` in a plain text editor, you will see that preference at the very top, in a few lines between dashes:

```
---
lang: "ca"
toc: true
---
```

That is the standard way of storing data about a document and many programs understand it. EdiMarkWeb does not show it in the preview, because it is not content, but it does show it in the Markdown pane, which is the source. You can delete or change it by hand if you want.

#### The text formatting

In that same dialog —which the sliders button at the end of the bar also opens— you set the **alignment** (left, justified or right), the **typeface** (serif, sans serif, monospaced or whatever you type), the **size** in points, the **line spacing**, the **margins** on all four sides in centimetres, the **first-line indent** and the **hyphenation**.

Choosing *Other…* as the typeface brings up the typeface name right underneath, with a list of suggestions: the ones the application could recognise as installed on this computer (in Chrome and Edge, *Show every typeface on this computer…* asks for permission and offers the full list). You can type any name even if it is not installed: the document keeps it anyway, because the file may end up on a computer that does have it. If it is missing here, an amber note says so and the preview falls back to another typeface; on export the name travels written down and each program resolves it (Word and LibreOffice if they have it, and in LaTeX only with XeLaTeX or LuaLaTeX).

Anything left on *Inherited* follows **Settings → Export options…**, where the same settings act as the starting values for every document. Under each field, in grey, you can see the value it inherits right now. What you set here is saved inside the document itself, next to the language and the author, so it travels with the file. *Remove everything from the document* leaves it with nothing of its own:

```
---
lang: "en"
align: "justify"
fontsize: "12pt"
margin-left: "3cm"
---
```

It applies to the preview and to all five export formats, with three caveats worth knowing:

* In the **EPUB** the margins are a suggestion: the reading app has the last word on the page box.
* In **TEX**, if your preamble already loads `geometry`, your margins win: the application says it has left the ones from the menu out rather than breaking the build with two identical `\usepackage` lines.
* **Hyphenation** uses the system dictionaries. Word on Windows and macOS brings its own; on Linux, LibreOffice needs the language package (`hyphen-en`, for instance).

### Images with a relative path

An ordinary `.md` does not carry its images inside: it keeps them in a folder next to it and names them with a relative path, `images/01.png`. EdiMarkWeb resolves those paths and shows the images in the preview.

* In the **desktop application** there is nothing to do: when the document opens, its images are looked up in its folder and appear.
* In the **browser** no page can read a folder from disk without permission. If the document names images that cannot be found, a notice appears above the preview with a **Find its folder…** button: choose the document folder and every image shows up. You only need to do this once: EdiMarkWeb stores the images used by that document in the browser and restores them after reloading the page.
* Dragging a whole folder onto the editor opens its documents **and** registers its images in one go.
* When you **save**, recovered images are copied next to the `.md`, preserving paths such as `images/01.png`. In the browser you choose the destination folder; if the browser cannot write folders, a ready-to-extract ZIP is downloaded. **Save as…** makes the same copy in the desktop application.

The Markdown never changes: what you save, copy or export still carries the path you wrote. Images that cannot be found are marked with a dashed frame instead of the browser's broken icon.

### Embedded images

When a document carries base64 images — after importing a DOCX, after pasting from another application — their code runs to thousands of characters and makes the Markdown unreadable. EdiMarkWeb folds them away automatically: a short marker such as `__EDIMARK_B64_1__` appears in the editor and, below the pane, a list shows every hidden image with its format, its size and a **View code** button to inspect or copy it. The real content is kept intact when you save, copy or export. The list stays collapsed in a single line with the image count: unfold it and each image shows its thumbnail —click it to see the picture full size— while the list keeps its own height and scrollbar, so no matter how many images the document carries it never eats into the editor. Whether you left it open or closed is remembered. Each row also carries a **Delete** button, which removes the image from the document —the whole code, not just the marker— after asking for confirmation, and **View code**, useful when you want to copy the `data:` string to paste that same image into another document or another tool.

---

## Interactive preview

* Click the right pane to edit the result directly: changes are synced back to the Markdown, keeping the formatting whenever the edit allows it.
* The preview supports selections, copy and paste.
* **The formatting toolbar works here too.** With the cursor on the sheet, bold, italic, code, headings, quotes, lists, links, images, tables and formulas are applied to what you are looking at, and the Markdown rewrites itself: it is a rich text editor that translates to Markdown as you go. The same button removes what it added —pressing *Bold* on text that is already bold removes it— and the shortcuts (`Ctrl`+`B`, `Ctrl`+`I`, `Ctrl`+`Shift`+`L`, etc.) do the same as the buttons. `Ctrl`+`Z` undoes even when you are on the sheet: the history is always the document's.
* Hold `Ctrl` (or `Cmd` on macOS) and click to open links; in the desktop application they open in your usual browser.
* **Formulas are written in their own window.** On the sheet there is nowhere to type inside an empty `$…$`, because KaTeX turns it into a formula as soon as it repaints; so, with the cursor in the preview, the `{}` button opens a window straight away with the LaTeX code, the result in view as you type and the error message if there is one. Whatever was selected arrives already written. Inside you choose whether the formula goes **inline or as a block** and with which **delimiters**, `\(...\)` or `$...$` —inline and `\(...\)` are what you get to begin with. From the Markdown pane nothing changes: the same button opens the four pairs and the delimiters are written into the text, as always.
* LaTeX formulas are rendered automatically with KaTeX; when you edit them they return to their original syntax.

---

## Main actions

* **Open (`Ctrl+O`)**: imports `.md` or `.markdown` files.
* **Import**: converts documents in other formats to Markdown using Pandoc: `.docx`, `.odt`, `.epub`, `.html` and `.tex`. Headings, lists, tables and links are recovered, and so are the images: when they come from a `.docx`, `.odt` or `.epub` they are extracted from the file itself and embedded in the Markdown, so they show up in the preview and travel with you when exporting. An `.epub` also brings back the document language, which the book keeps in its wrapper rather than in the text.
* **Save (`Ctrl+S`)**: saves the current document. In the desktop application it updates the file already open; **Save as… (`Ctrl+Shift+S`)** always lets you choose another name or location.
* **Copying content**: the left pane has a button to copy the Markdown; in the preview you can choose what gets copied (rendered HTML or LaTeX variants) from the drop-down next to the copy icon.
* **Changing theme, layout or width**: use **Settings** for the theme, `Ctrl+L` or the pane buttons for the layout, and the icon-only width button, to the right of the double arrow, to widen the web workspace.
* **Manual**: this document is always available and up to date with `Ctrl+H`.
* **The folder is remembered**: in the desktop application the first open or save dialog appears wherever the system decides, but from then on all of them —open, save as, export, pick an image— go back to the last folder you used. It is remembered only while the application stays open.

---

## Exporting

Open the **File** button and choose `Export` to download versions ready to hand in or publish:

* **DOCX (Microsoft Word)**: ideal for sharing with students or colleagues who use Word, and compatible with Google Docs.
* **ODT (LibreOffice)**: intended for free suites such as LibreOffice or OnlyOffice.
* **EPUB (e-book)**: creates an e-book compatible with EPUB 3 readers (Calibre, Apple Books, Thorium, e-ink devices…). The title comes from the first level-1 heading (or from the document name), and the author, the cover and the language come from the settings explained below.
* **HTML (web page)**: produces a self-contained file with embedded styles and formulas, ready to host on the web. The browser tab title comes from the first heading, or from the document name if there is none.
* **TEX (LaTeX)**: creates a complete `.tex` document with a preamble ready to compile. It carries the document language, so hyphenation and the automatic labels come out in your language, and if the document opens with a single level-1 heading that heading becomes the title (`\title` and `\maketitle`) instead of just another section.
* **PDF**: opens the system print dialog, where you pick “Save as PDF” as the destination. What comes out is exactly what the preview shows, with typeset formulas and the document margins, and the text stays selectable and searchable. It is the same path as the **Print (Ctrl+P)** button.

While exporting, the top bar shows status messages (progress, success or errors).

### Export options

**Settings → Export options…** stores preferences that are reused in every export, including the next time you open the application.

The dialog is split into four tabs —**Document**, **Formatting**, **EPUB** and **LaTeX**— which you can also walk through with the arrow keys. In the desktop application these options are additionally written to a `settings.json` file inside EdiMarkWeb’s configuration folder in your user profile, so they survive a clean-up of the embedded browser’s data or a reinstall.

**Document language**, which applies to all five formats. It decides which dictionary Word and LibreOffice spell-check a DOCX or an ODT against, how LaTeX hyphenates, and which language HTML and EPUB declare to screen readers. It defaults to **Same as the interface**: change the language of EdiMarkWeb and your documents follow. You can pin any of the five interface languages, or choose **Other…** and type a code (`fr`, `de`, `pt-BR`).

**Author**, stored in the file properties and shown as the book author in the EPUB and on the LaTeX title page. In DOCX and ODT, Pandoc also writes a line with the name at the start of the document; leave the field empty if you would rather it did not appear. A particular document can carry a different author: *This document's author…*, in the language button menu.

**EPUB cover**, with three choices. By default EdiMarkWeb **generates one** from the document title and author, because a book with no image shows up as a generic icon on the reader's shelf. You can use **an image of your own** —up to 1 MB, plenty for a cover: it is stored alongside your documents, in the application's own space— or leave the book **with no cover**. It only affects the EPUB.

**Text formatting**: alignment, typeface and size, line spacing, margins, indent and hyphenation, as the starting values for every document. The size comes set to twelve points, which is what DOCX and ODT already write, so that the preview always has a concrete body size to show; the rest start out unset. Each document can set its own from the Markdown pane, and whatever it does not set is inherited from here.

**Table of contents**, which adds a list of the sections at the start of the document. In DOCX it is a real Word table of contents and in ODT a native LibreOffice one; the EPUB does not need it, since the reader already provides its navigation index. This is the starting value: each document can ask for it, or turn it down, on its own in the **This document** dialog.

> **About page numbers**: in DOCX and ODT the table of contents is a field the word processor calculates, because the pages have to be laid out before it knows where each section falls. EdiMarkWeb writes the list of sections into it, so the document opens with the table of contents visible, but without numbers. To get them, refresh it: in Word, right-click the table of contents → *Update field*; in LibreOffice, *Tools → Update → Indexes*.

**Number the sections**, which puts 1, 1.1, 1.2… before the headings. It works in DOCX, HTML and LaTeX; ODT does not support this numbering and comes out without it. Each document can set this one too.

Plus three **LaTeX only** settings, applied when exporting to TEX and when copying *LaTeX – full document*:

* **Document class**: `article` (the default), `report` or `book`.
* **Class options**: whatever goes in brackets in `\documentclass`, comma separated (`12pt, a4paper`).
* **Preamble**: your packages and macros, inserted verbatim at the end of the preamble, right before `\begin{document}`.

If the document starts with its own YAML metadata, that wins and none of these settings apply. And bear in mind that a faulty preamble raises no warning here: the failure shows up when compiling the `.tex`.

---

## Copying and sharing without downloading

The copy button sits in the header, next to **Export**: both do the same thing with a different destination, one to a file and the other to the clipboard. It copies in four formats:

* *Markdown* (`Ctrl+Alt+C` then `1`): the source text, exactly as it stands in the editor.
* *HTML* (`Ctrl+Alt+C 2`): the rendered document, just as the preview shows it. This is the option for taking the text **with its formatting** into Word, LibreOffice, Google Docs, an email or any other editor: they all read the HTML from the clipboard and paste headings, bold, lists and tables already laid out, with no file in between. Two caveats: formulas paste as text, not as equations —for that you need the DOCX or ODT export—, and images only travel if they are embedded in the document.
* *LaTeX* (`Ctrl+Alt+C 3`): the current fragment only.
* *Full LaTeX* (`Ctrl+Alt+C 4`): includes preamble and environment ready to compile, with the same language and title as the TEX export.

The button remembers the last format you picked and says so in a small label beside it —`Markdown`, `HTML`, `LaTeX`—, so copying again in that format is a single click, or `Ctrl+Alt+C` followed by `Enter`. The arrow next to it opens the list to change it.

Each option shows a success notice and, where appropriate, prepares the LaTeX markup automatically from the rendered preview.

---

## Drag and drop files

Drag one or more files onto the application. `.md` and `.markdown` open as they are, while `.docx`, `.odt`, `.epub`, `.html` and `.tex` are converted to Markdown with Pandoc before opening:

* A highlighted frame confirms that you can drop them.
* Each file opens in its own tab, under its original name.
* You can also drag whole folders from your file manager: their subfolders are walked through and every compatible file opens in its own tab, in alphabetical order. Anything else is ignored and, if nothing usable is found, the application tells you.
* The content stays available without a connection thanks to autosave.

---

## The desktop application

Besides the web version, EdiMarkWeb installs as a program on **Linux, Windows and macOS**. It is the same application — the same menus, the same shortcuts and the same formats — so whatever you learn in one carries over to the other.

### Installing it

The installers live on the [downloads page](https://github.com/edimarkweb/edimarkweb.github.io/releases/latest), one for each system:

* **Linux**: a `.deb` package for Debian, Ubuntu, Mint and derivatives, and an `.AppImage` that runs without installing on any distribution.
* **Windows**: an `.exe` installer and an `.msi` one, for anyone deploying the application across a classroom or a school.
* **macOS**: a `.dmg` image for Apple silicon Macs and another for Intel Macs.

### What it adds over the browser

* **Documents open on a double click**: the installation registers `.md` and `.markdown` files, so they open in EdiMarkWeb from the file manager. If the application is already running, the document arrives in that same window as a new tab.
* **Saving writes to the real file**: `Ctrl+S` updates the document you opened, with no detour through the downloads folder. **Save as…** opens the system dialogue to choose a name and folder.
* **System spell checker**: the editor underlines mistakes using the dictionaries installed on the computer. On Windows and macOS these are the languages you already have; on Linux you may need to install the dictionary you want (the `hunspell-en` package, for instance). You can turn it off in **Settings → Spell checker**.
* **It works offline**: the application carries everything it needs, including Pandoc and the EdiCuaTeX formula editor, so you can write, import and export with no internet. A connection is only needed to check for new versions.
* **Quit**: at the end of the **File** menu, it saves the current document and closes the application.

### Keeping it up to date

At startup the application checks once a day whether a newer version exists. When there is one, a notice appears below the toolbar with a **Download and install** button: it fetches the installer for your system, shows the progress and hands it to the system installer so you can finish in a couple of clicks. With an AppImage there is nothing to install, so the application downloads the new one and opens its folder for you to replace the old file. No installer can replace the files of a running application, so as soon as it starts a **Close EdiMarkWeb** button appears in the same notice: it saves what you are writing and closes. When the installation finishes, open the application again and the new version is there.

The notice includes a **Check at startup** box that turns off the automatic check, and a **Release notes** link with the list of changes. You can ask for it whenever you like from **Help → Check for updates…**; if you already have the latest version, it says so in the status bar.

### What does not change

Documents started in the browser and those from the desktop application are ordinary Markdown files: you can move them between the two with no conversion. Tab autosave, on the other hand, is separate in each, because every version keeps its working copy in its own space.

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

## LaTeX formula examples

### Quadratic formula

To solve a quadratic equation such as $ax^2 + bx + c = 0$, you use:

$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$

### 2x2 matrix

$$
A = \begin{pmatrix}
 a_{11} & a_{12} \\
 a_{21} & a_{22}
\end{pmatrix}
$$

### Other delimiters

As well as `$...$` and `$$...$$`, you can use LaTeX's own delimiters: \(E = mc^2\) inline, and as a block:

\[
\nabla \cdot \vec{E} = \frac{\rho}{\varepsilon_0}
\]

### Sums, limits and integrals

The sum of the first $n$ natural numbers is $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ and the integral $\int_0^1 x^2\,dx = \frac{1}{3}$. The number $e$ is defined as a limit:

$$
e = \lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n
$$

### Systems of equations

$$
\begin{cases}
2x + y = 5 \\
x - y = 1
\end{cases}
$$

### Assorted symbols

Greek letters ($\alpha$, $\beta$, $\Omega$), subscripts ($H_2O$), comparisons ($a \neq b$, $x \leq y$) and sets ($\mathbb{R}$, $A \subseteq B$).

If you prefer to build them visually, select the text in the editor and open **EdiCuaTeX**: the formula will come back inserted automatically.

---

## Ideas for teachers

* **Notes and summaries**: combine text with formulas and links to share them in your virtual classroom.
* **Exams and exercises**: export to DOCX/ODT to print or edit later.
* **Reusable templates**: save documents as self-contained HTML to upload to Moodle, blogs or GitHub Pages.
* **Student work**: invite them to write in Markdown; with autosave they will not lose their progress.

---

## Licence and contributions

EdiMarkWeb is free software under the [GNU Affero General Public License v3.0](LICENSE). This means you can use the application in your classroom, adapt it and deploy it on your own servers, as long as you share any improvements under the same licence and offer the source code to whoever uses your version. If you find a problem or want to propose changes, open an issue on [GitHub](https://github.com/edimarkweb/edimarkweb.github.io/issues) or send a pull request.
