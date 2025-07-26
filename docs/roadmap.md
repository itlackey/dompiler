## 🧇 **dompile Product Roadmap**

> **Tagline:** *A build tool for the web we were promised — fast, portable, no nonsense.*

---

### ✅ **v0.1 – Initial MVP**

> 🔰 Foundation: simple static site build and legacy support

* Basic CLI to copy and build HTML from includes
* Static assets copied to `dist/`
* Full rebuild on change
* Apache-style includes supported:

  * `<!--#include virtual="header.html" -->`
* External Live Server for preview
* Convention over config — no config file required

---

### 🔧 **v0.2 – Live Server + Docker Dev**

> 🔁 Dev flow optimization and preview server

* Fix hot reload bugs (CSS/HTML changes)
* File watching with debounce
* Auto-rebuild on file change
* Official **Docker image**:

  * Mount `/site`
  * Build to `/var/www/html`
  * Serve with NGINX
  * Auto-rebuild in container

---

### 🚀 **v0.3 – Incremental Build + SSI Enhancements**

> ⚡️ Performance and rock-solid legacy mode

* Incremental build: only rebuild changed files
* Include dependency tracking
* Enhanced Apache-style support:

  * Parse and resolve nested `<!--#include -->`
* Auto-copy only referenced assets
* Detect common build-time errors (missing includes, circular includes, etc.)

---

### 📘 **v0.4 – Markdown Content Support**

> 📝 Content-first sites, minimal setup

* Convert `.md` files to HTML using `markdown-it`
* Frontmatter support for metadata (e.g. `title`, `layout`)
* Auto-injected into default or custom layout
* Optional: Pretty URL output: `/docs/getting-started/`
* Markdown files can include Apache-style includes

---

### 🎨 **v0.5 – DOM Mode & Layout System**

> 🧱 Modern HTML composition, no JS runtime

* Add DOM Mode:

  * `<template src="...">` for includes
  * Layouts using `<slot>` or `{{ content }}`
* Token replacement via `{{ title }}` and `data-*` attributes
* Layout chaining and nested partials
* Multiple slots (`<slot name="main">`, `data-slot="main"`)
* Optional conditional includes based on frontmatter or attributes

---

### 🔄 **v0.6 – Routing + Sitemap + Canonical URLs**

> 🌐 Smart site structure & SEO

* Auto sitemap generation
* Canonical URL support
* Optional Internal link rewriting: `.md → .html` or `/pretty/`
* Dead link detection and reporting

---

### 🏁 **v1.0 – Production Ready**

> ✅ Stability, docs, CLI polish

* CLI commands: `dompile build`, `dompile watch`, `dompile serve`
* Stable Docker image
* File watching with minimal CPU usage
* Full documentation
* Real-world templates:

  * `dompile-dompile-site`
  * `dompile-htmx-blog`
  * `dompile-minsite`
* Minimal size, zero config, fast builds
* Built-in markdown-it remains default (engine swap possible post-1.0)

---

## 🐳 Docker Dev Flow

```bash
docker run --rm -p 8080:80 \
  -v $(pwd)/site:/site \
  dompile
```

* Rebuilds site on change
* Serves from `/var/www/html`
* No configuration needed

---

## 🧱 Modes Overview

| Feature    | Apache Mode                      | DOM Mode (v0.5+)                |
| ---------- | -------------------------------- | ------------------------------- |
| Includes   | `<!--#include virtual="..." -->` | `<template src="...">`          |
| Layouts    | No                               | Yes (`<slot>`, `{{ content }}`) |
| Markdown   | Static includes                  | Routed + slotted content        |
