![EdiMarkWeb logo](logo_100px.png)

# EdiMarkWeb manual

Welcome to EdiMarkWeb, a **Markdown text editor** designed for teachers and content creators who need to work quickly, export to several formats and add LaTeX maths without complications. Everything runs directly in the browser and your documents are stored safely on your own computer.

## Highlights

- Dual editing: work either in Markdown or straight in the HTML preview, always in sync.
- Export and import menus supporting DOCX, ODT, EPUB, HTML and LaTeX, including options to copy directly to the clipboard.
- Search and replace that highlights matches and ignores accents and letter case.
- A **Settings** menu gathering the language, font size, theme, working width and separate window in one place.
- Interface theme with three options — System, Light and Dark — remembered between sessions.
- Redesigned formula menu and direct access to EdiCuaTeX for building complex expressions.
- Open several files by dragging them onto the editor (each in its own tab): Markdown and also DOCX, ODT, EPUB, HTML or TEX, converted on the fly with Pandoc.

## Paste anything

> **Important:** you can paste **any object from the clipboard**: plain text, fragments from Word or LibreOffice, full HTML, formulas produced by a chatbot and even images copied directly. Use `Ctrl+V`/`Cmd+V` or the toolbar button with the clipboard icon (`Paste`) and EdiMarkWeb will place the content in the appropriate pane:

- Markdown or unformatted text is inserted in the left pane exactly at the cursor position.
- Rich content (HTML, DOCX, pasted from the browser, etc.) is re-rendered in the right pane and, at the same time, the matching Markdown is generated so both views stay in sync.

This removes any intermediate steps: copy from your source of choice and click **Paste** to carry on editing.

## Videos

The following videos, **without sound and looping**, show some common actions.

### Copying content straight from a chat

You can copy the output of any chat and paste it into EdiMarkWeb to edit, save or export it. This works with any chatbot except ChatGPT, which needs an extra step (see below).

![Copying content straight from a chat](imagenes/googledocs.gif)

### ChatGPT

ChatGPT no longer uses standard LaTeX, so you have to ask it for the formulas inside a Markdown box. The video also shows how to export to DOCX and upload to Google Drive:

![ChatGPT and Google](imagenes/chatgpt_google.gif)

### Writing formulas in EdiMarkWeb

![Writing formulas in EdiMarkWeb](imagenes/formulas.gif)

### LaTeX produced by Gemini

When working on a canvas you can ask Gemini for a PDF. That PDF uses LaTeX code you can paste straight into EdiMarkWeb.

![Writing formulas in EdiMarkWeb](imagenes/gemini_pdf.gif)

---

## Managing documents (tabs)

Work on several documents at once, each in its own tab.

* **New tabs**: press the `+` button (or `Ctrl+T`) to open a blank document.
* **Switching tabs**: click the name to show its contents.
* **Renaming**: double-click the title to give it a more descriptive name (e.g. “Unit 3 – Equations”).
* **Closing tabs**: press the `X`. If there are unsaved changes, the application will warn you.
* **Unsaved changes**: a red dot (`●`) marks pending modifications.
* **Autosave**: each tab automatically keeps a copy in your browser; if you reload the page, the content reappears.

---

## Top control bar

The bar next to the logo holds the application's global options and gathers every file action under a single drop-down button:

* **File**: groups the document actions in two families. First the ones that bring content in — `Open (Ctrl+O)`, `Import` and `Paste LaTeX (Ctrl+Shift+V)` — and then the ones that take it out: `Save (Ctrl+S)` and the **Export** submenu, which opens to the right with DOCX, ODT, EPUB, HTML and TEX. Each option shows its keyboard shortcut.
* **Settings**: gathers every application setting, each one in a submenu showing the current value.
  * **Language**: changes the interface language.
  * **Font size**: small, normal, large or very large.
  * **Theme**: `System` follows your computer's setting and changes with it; `Light` and `Dark` fix it. Your choice is remembered next time you open the application.
  * **Expanded width**: widens the working area.
  * **Separate window**: opens EdiMarkWeb in a window of its own, like a desktop application.
* **Print (Ctrl+P)**: produces a view ready for paper or PDF using the current styles.
* **Search (Ctrl+F)** and **Manual (Ctrl+H)**: open the advanced search panel or this very document.
* **Clear all**: empties the active document after asking for confirmation.

The pane layout is changed with `Ctrl+L` or with the arrows in each pane's header.

---

## Toolbar

The grey strip below the top bar holds quick access to formatting and elements:

* **Basic styles**: bold, italic and a headings menu (H1…H6).
* **Lists and quotes**: bullets, numbering and quote blocks with their own shortcuts.
* **Code, links, images and tables**: guided insertion through dialogs.
* **LaTeX formulas**: a menu for inserting inline or block commands with the correct syntax.
* **EdiCuaTeX**: opens the external assistant in a new window. On accepting, the formula comes back inserted in the editor.

Each button shows a description on hover and states the equivalent keyboard shortcut.

---

## Search and replace

The magnifying glass button (or `Ctrl+F`) opens an advanced search panel:

* The search box highlights every match, even if you ignore accents or capitals.
* Use `Enter` to jump to the next match and `Shift+Enter` to go back.
* Press the side arrow to show the replace panel. You can replace matches one by one or all at once (with confirmation).
* The `current / total` counter helps you follow your progress.

Search works both in the Markdown view and in the HTML view, depending on where the focus is.

---

## Main interface

The working area is split into two resizable panes:

* **Markdown** (left): text editor with highlighting, optional line numbers and copy controls. Everything you type here is immediately reflected in the right pane.
* **HTML / Preview** (right): shows the final result and also lets you edit the content directly. Use the code icon button to switch between the rich preview and the generated HTML.
* **Copying content**: dedicated buttons to copy the Markdown or the generated HTML (including formulas converted to LaTeX when copying HTML).

You can drag the central bar to give more room to either pane.

---

## Interactive preview

* Click the right pane to edit the result directly: changes are synced back to the Markdown, keeping the formatting whenever the edit allows it.
* The preview supports selections, copy and paste, and basic shortcuts (Ctrl+B/I, headings, etc.) just like the Markdown editor.
* Hold `Ctrl` (or `Cmd` on macOS) and click to open links in a new browser tab.
* LaTeX formulas are rendered automatically with KaTeX; when you edit them they return to their original syntax.

---

## Main actions

* **Open (`Ctrl+O`)**: imports `.md` or `.markdown` files.
* **Import**: converts documents in other formats to Markdown using Pandoc: `.docx`, `.odt`, `.epub`, `.html` and `.tex`. Headings, lists, tables and links are recovered, and so are the images: when they come from a `.docx`, `.odt` or `.epub` they are extracted from the file itself and embedded in the Markdown, so they show up in the preview and travel with you when exporting.
* **Save (`Ctrl+S`)**: downloads the current document to your computer.
* **Copying content**: the left pane has a button to copy the Markdown; in the preview you can choose what gets copied (rendered HTML or LaTeX variants) from the drop-down next to the copy icon.
* **Clear all**: resets the document after a confirmation.
* **Changing theme, layout or width**: from the **Settings** menu (theme and width) and with `Ctrl+L` (pane layout) you can adapt the interface to each situation: interactive whiteboard, laptop, and so on.
* **Manual**: this document is always available and up to date with `Ctrl+H`.

---

## Exporting

Open the **File** button and choose `Export` to download versions ready to hand in or publish:

* **DOCX (Microsoft Word)**: ideal for sharing with students or colleagues who use Word, and compatible with Google Docs.
* **ODT (LibreOffice)**: intended for free suites such as LibreOffice or OnlyOffice.
* **EPUB (e-book)**: creates an e-book compatible with EPUB 3 readers (Calibre, Apple Books, Thorium, e-ink devices…). The title comes from the first level-1 heading (or from the document name) and the language from the one selected in the application.
* **HTML (web page)**: produces a self-contained file with embedded styles and formulas, ready to host on the web.
* **TEX (LaTeX)**: creates a complete `.tex` document with a preamble ready to compile.

While exporting, the top bar shows status messages (progress, success or errors).

---

## Copying and sharing without downloading

* **Copy Markdown**: a direct button in the left pane sends the source text to the clipboard.
* **Copy from the preview**: the copy button in the right pane remembers your last choice among:
  * *Copy HTML* (rendered exactly as you see it).
  * *Copy LaTeX* (only the current fragment).
  * *Copy LaTeX – full document* (includes preamble and environment ready to compile).

Each option shows a success notice and, where appropriate, prepares the LaTeX markup automatically from the rendered preview.

---

## Drag and drop files

Drag one or more files onto the application. `.md` and `.markdown` open as they are, while `.docx`, `.odt`, `.epub`, `.html` and `.tex` are converted to Markdown with Pandoc before opening:

* A highlighted frame confirms that you can drop them.
* Each file opens in its own tab, under its original name.
* The content stays available offline thanks to autosave. You can also drag whole folders from your file manager; every compatible file opens in its own tab.

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
| Code | `Ctrl` + `` ` `` | `Cmd` + `` ` `` |
| **Managing documents** | | |
| New tab | `Ctrl` + `T` | `Cmd` + `T` |
| Close tab | `Ctrl` + `W` | `Cmd` + `W` |
| Save | `Ctrl` + `S` | `Cmd` + `S` |
| Open file | `Ctrl` + `O` | `Cmd` + `O` |
| Paste LaTeX (open dialog) | `Ctrl` + `Shift` + `V` | `Cmd` + `Shift` + `V` |
| **Interface** | | |
| Change layout | `Ctrl` + `L` | `Cmd` + `L` |
| Search | `Ctrl` + `F` | `Cmd` + `F` |
| Manual | `Ctrl` + `H` | `Cmd` + `H` |
| Print | `Ctrl` + `P` | `Cmd` + `P` |

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
