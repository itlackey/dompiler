# Vanilla Wafer 🍪

A lightweight, framework-free static site generator that brings the power of server-side includes to your development workflow. Build maintainable static sites by composing HTML partials—no more copying and pasting headers, footers, and navigation across multiple pages!

## ✨ Perfect for Frontend Developers

- **Zero Learning Curve**: Uses familiar Apache SSI syntax (`<!--#include file="header.html" -->`)
- **Modern Tooling**: Built with ESM modules, works on Node.js, Deno, and Bun
- **Live Development**: Hot reload server watches your files and refreshes automatically
- **Framework-Free**: Pure HTML and CSS—no build complexity or JavaScript frameworks required
- **Minimal Dependencies**: Lightweight with just the essentials

## 🚀 Quick Start

```bash
# Install globally
npm install -g vanilla-wafer

# Or use with npx
npx vanilla-wafer build --source src --output dist

# Start development server with live reload
npx vanilla-wafer serve --source src
```

## 📁 Project Structure

```
my-site/
├── src/
│   ├── includes/
│   │   ├── header.html
│   │   ├── footer.html
│   │   └── head.html
│   ├── index.html
│   ├── about.html
│   └── css/
│       └── style.css
└── dist/ (generated)
```

## 🔧 How It Works

### HTML Includes

Use Apache SSI syntax to include partials:

```html
<!-- index.html -->
<html>
  <head>
    <!--/includes/head.html automatically injected here -->
    <title>My Site</title>
  </head>
  <body>
    <!--#include virtual="/includes/header.html" -->
    <main>
      <h1>Welcome!</h1>
    </main>
    <!--#include virtual="/includes/footer.html" -->
  </body>
</html>
```

### Automatic Head Injection

Place common meta tags, CSS, and scripts in `head.html` and they'll be automatically injected into every page's `<head>` section.

### Live Development

Use `vanilla-wafer watch` to automatically rebuild your site when files change. For live reloading in the browser, combine with your favorite development server like `live-server`:

```bash
# Terminal 1: Watch and rebuild on changes
vanilla-wafer watch --source src --output dist

# Terminal 2: Serve with live reload
npx live-server dist --port=3000 --watch=dist
```

## 📖 Documentation

### Commands

- **`vanilla-wafer build [options]`** - Build your static site
- **`vanilla-wafer watch [options]`** - Watch files and rebuild on changes

### Options

- `--source, -s`: Source directory (default: `src`)
- `--output, -o`: Output directory (default: `dist`)
- `--includes, -i`: Includes directory name (default: `includes`)
- `--head`: Custom head include file path
- `--help, -h`: Show help message
- `--version, -v`: Show version

### Live Development Setup

For the best development experience with automatic browser refresh:

```bash
# Install live-server globally or use npx
npm install -g live-server

# Option 1: Use two terminals
vanilla-wafer watch --source src --output dist
live-server dist --port=3000

# Option 2: Use npm scripts in package.json
{
  "scripts": {
    "dev": "vanilla-wafer watch --source src --output dist & live-server dist --port=3000 --wait=500",
    "build": "vanilla-wafer build --source src --output dist"
  }
}
```

## 🌟 Why Vanilla Wafer?

Perfect for:

- **Static websites** that need shared components
- **HTML prototypes** with reusable elements
- **Documentation sites** with consistent layouts
- **Landing pages** with modular sections
- **Portfolio sites** with template consistency

## 🔗 Cross-Platform Support

- **Node.js** 14+ (native ESM support)
- **Bun**: `bun run vanilla-wafer watch`
- **Deno**: `deno run --allow-read --allow-write npm:vanilla-wafer`

---

_Built with ❤️ for frontend developers who love simple, powerful tools._
