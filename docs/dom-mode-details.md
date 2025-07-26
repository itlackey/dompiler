# 🧱 DOMpile-Compatible Static Site Generator: Final Design

---

## 🧠 Guiding Principles

| Goal                               | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| **HTML-centric**                   | No templating language, just HTML                         |
| **Single custom element**          | Only `<include />` is introduced                          |
| **No wrappers or special roots**   | Pages and components are just HTML                        |
| **Minimal configuration**          | Layouts are inferred by convention                        |
| **Scoped assets**                  | Styles/scripts stay inside components                     |
| **Pure build-time transformation** | No runtime JavaScript or dynamic templating               |
| **Learn-by-reading-HTML**          | Authoring experience matches mental model of HTML and web |

---

## 🧩 Components

### ✅ Definition Rules

* **One component per file**
* **No `<template>` or wrapper required**
* File content is injected **as-is**
* Use `data-token="..."` for token replacement with `<include />`
* Components can contain their own `<style>` and `<script>`

### 🔹 `components/alert.html`

```html
<style>
  .alert { color: red; padding: 1rem; border: 1px solid red; }
</style>

<div class="alert">
  <strong data-token="title">Title</strong>
  <p data-token="message">Message</p>
</div>

<script>
  console.log("Alert component loaded");
</script>
```

### 🔹 Page usage

```html
<include src="/components/alert.html"
         data-title="Warning"
         data-message="This is a DOMpile component." />
```

---

## 🏗 Layouts

### ✅ Layout Behavior

* Layouts are raw HTML files, no `<template>` tag required
* Layout content includes **`<slot>`** elements to define replaceable content regions
* `<slot>`s with `name="..."` are filled with matching `<template data-slot="...">`
* `<slot>`s without names receive the **default page content**
* Layout files can contain `<style>` or `<script>` as needed

### 🔹 `layouts/default.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title><slot name="title">Untitled</slot></title>
    <link rel="stylesheet" href="/styles/site.css">
  </head>
  <body>
    <header>
      <slot name="header"><h1>Default Header</h1></slot>
    </header>
    <main>
      <slot></slot> <!-- unnamed slot receives default content -->
    </main>
    <footer>
      <slot name="footer">© 2025</slot>
    </footer>
  </body>
</html>
```

---

## 📄 Pages

### ✅ Rules for Pages

* Any `.html` file is a valid page
* **No wrapper tags** required (e.g., no `<page>` or `<template>`)
* The **root element** (e.g. `<html>`, `<body>`, `<div>`) may have `data-layout`
* If not present:

  * Use `default.html` from the layouts directory
* Use `<template data-slot="name">` for named slots
* All **non-template root-level content** is injected into the unnamed layout slot

### 🔹 `pages/index.html`

```html
<body data-layout="/layouts/blog.html">
  <template data-slot="title">Welcome</template>
  <template data-slot="header"><h1>My Blog</h1></template>

  <h2>Hello!</h2>
  <p>This is a blog post rendered with the DOMpile layout engine.</p>

  <include src="/components/alert.html"
           data-title="Note"
           data-message="This site uses 100% declarative HTML." />
</body>
```

---

## 🧠 Content Injection Rules

| Part                             | Behavior                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| `<template data-slot="x">`       | Injects into `<slot name="x">` in layout                    |
| Page root content (non-template) | Injects into unnamed `<slot>`                               |
| `<include />`                    | Injects content of referenced file at position              |
| `data-token="..."`               | Replaced with value from matching `data-...` on `<include>` |

---

## 🔄 Build-Time Processing Flow

1. **Read all pages**
2. **Detect root element**

   * If `data-layout`, load that layout
   * If none, load `/layouts/default.html`
3. **Parse layout HTML**
4. **Inject named slots**

   * Match `<template data-slot="X">` → `<slot name="X">`
5. **Inject default slot**

   * All page root content outside of templates → into `<slot></slot>`
6. **Process all `<include />` tags**

   * Load referenced component file
   * Replace all `data-token="X"` with `data-X` from `<include>`
   * Inline `<style>` tags into `<head>` (deduplicated)
   * Append `<script>` tags to end of body (deduplicated)
7. **Emit HTML to `dist/` or output dir**

---

## ✅ Output Example

Given `pages/index.html` + `layouts/blog.html` + `components/alert.html`, output:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome</title>
    <link rel="stylesheet" href="/styles/site.css">
    <style>
      .alert { color: red; padding: 1rem; border: 1px solid red; }
    </style>
  </head>
  <body>
    <header>
      <h1>My Blog</h1>
    </header>
    <main>
      <h2>Hello!</h2>
      <p>This is a blog post rendered with the DOMpile layout engine.</p>
      <div class="alert">
        <strong>Note</strong>
        <p>This site uses 100% declarative HTML.</p>
      </div>
    </main>
    <footer>© 2025</footer>
    <script>
      console.log("Alert component loaded");
    </script>
  </body>
</html>
```

---

## 📦 Project Structure

```txt
.
├── pages/
│   ├── index.html
│   └── about.html
├── components/
│   └── alert.html
├── layouts/
│   ├── default.html
│   └── blog.html
├── styles/
│   └── site.css
└── dist/
    └── index.html
```

---

## 🧰 Future CLI (Optional)

```bash
# Build all pages from /pages using layouts and components
dompile build --input ./pages --output ./dist --layouts ./layouts --components ./components

# Watch for changes
dompile watch
```

---

## ✅ Key Takeaways

| Requirement                                  | ✅ Satisfied |
| -------------------------------------------- | ----------- |
| Only one custom element (`<include />`)      | ✅           |
| No need for template wrappers                | ✅           |
| Root elements inject into unnamed slot       | ✅           |
| Named slots via `<template data-slot="...">` | ✅           |
| Token replacement using `data-token="..."`   | ✅           |
| Inline styles/scripts inside components      | ✅           |
| Default layout fallback                      | ✅           |
| Self-closing `<include />` works like SSI    | ✅           |
| Pure HTML authoring model                    | ✅           |


## Reference Implementation

Here is a prototype of how to implement this design. Use is an example/reference as we add this functionality to dompile.

```js
// dompile-builder.mjs
// ESM-based reference implementation of DOMpile static site generator

import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_DIR = path.join(__dirname, "pages");
const OUTPUT_DIR = path.join(__dirname, "dist");
const LAYOUT_DIR = path.join(__dirname, "layouts");
const COMPONENT_DIR = path.join(__dirname, "components");
const DEFAULT_LAYOUT = "default.html";

function readFileSyncSafe(filepath) {
  return fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf-8") : null;
}

function loadLayout(file) {
  const raw = readFileSyncSafe(file);
  if (!raw) throw new Error(`Missing layout file: ${file}`);
  return new JSDOM(raw).window.document;
}

function applyLayout(pageDom, layoutDom) {
  const layout = layoutDom.cloneNode(true);
  const slotTemplates = [...pageDom.querySelectorAll("template[data-slot]")];

  for (const tpl of slotTemplates) {
    const name = tpl.getAttribute("data-slot");
    const slot = layout.querySelector(`slot[name='${name}']`);
    if (slot) slot.replaceWith(...tpl.content.childNodes);
  }

  const defaultSlot = layout.querySelector("slot:not([name])");
  if (defaultSlot) {
    const content = [...pageDom.body ? pageDom.body.childNodes : pageDom.documentElement.childNodes]
      .filter((n) => n.nodeName !== "TEMPLATE");
    defaultSlot.replaceWith(...content);
  }

  return layout;
}

function processIncludes(dom) {
  const includes = dom.querySelectorAll("include[src]");
  includes.forEach((inc) => {
    const src = inc.getAttribute("src");
    const filepath = path.join(COMPONENT_DIR, path.basename(src));
    const raw = readFileSyncSafe(filepath);
    if (!raw) return;

    const includeDom = new JSDOM(raw).window.document;
    const fragment = includeDom.body || includeDom;
    const tokens = inc.attributes;

    fragment.querySelectorAll("[data-token]").forEach((el) => {
      const token = el.getAttribute("data-token");
      const val = tokens[`data-${token}`]?.value;
      if (val) el.textContent = val;
    });

    const styles = fragment.querySelectorAll("style");
    const scripts = fragment.querySelectorAll("script");

    const head = dom.querySelector("head");
    styles.forEach((style) => head?.appendChild(style.cloneNode(true)));

    const body = dom.querySelector("body");
    scripts.forEach((script) => body?.appendChild(script.cloneNode(true)));

    inc.replaceWith(...(fragment.body ? fragment.body.childNodes : fragment.childNodes));
  });
}

function renderPage(filepath) {
  const raw = fs.readFileSync(filepath, "utf-8");
  const dom = new JSDOM(raw);
  const doc = dom.window.document;
  const root = doc.body || doc.documentElement;

  let layoutFile = root.getAttribute("data-layout") || DEFAULT_LAYOUT;
  layoutFile = path.join(LAYOUT_DIR, path.basename(layoutFile));
  const layoutDom = loadLayout(layoutFile);

  const finalDom = applyLayout(doc, layoutDom);
  processIncludes(finalDom);

  return "<!DOCTYPE html>\n" + finalDom.documentElement.outerHTML;
}

function build() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".html"));
  files.forEach((file) => {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    const html = renderPage(inputPath);
    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`✔ Built ${file}`);
  });
}

build();
```

