# 🎯 DOM Mode Example

This example demonstrates **DOMpile's DOM Mode** - a modern templating system that brings component-based architecture to static site generation.

## 🚀 Features Showcased

- **Template Inheritance**: Use `<template extends="...">` for layout hierarchies
- **Component Includes**: Reusable components with `<template src="...">`
- **Slot System**: Flexible content injection with `<slot name="...">`
- **Data Binding**: Pass data via attributes and frontmatter with `{{ variable }}`
- **Fallback Support**: Default values with `{{ variable || "default" }}`

## 📁 Project Structure

```
src/
├── templates/
│   └── layout.html          # Main page layout with slots
├── components/
│   ├── header.html          # Navigation header component
│   ├── footer.html          # Site footer component  
│   ├── hero.html            # Hero section component
│   └── card.html            # Reusable card component
└── pages/
    ├── index.html           # Homepage using DOM Mode
    └── about.html           # About page demonstrating concepts
```

## 🔧 Building This Example

**Note**: DOM Mode is a planned feature for DOMpile v0.5. This example shows the intended syntax and structure.

```bash
# When DOM Mode is implemented:
dompile build --source examples/dom-mode/src --output examples/dom-mode/dist --dom-mode

# For now, this serves as a specification and design reference
```

## 🎨 Key Concepts Demonstrated

### 1. Template Inheritance

```html
<!-- pages/index.html -->
<template extends="/templates/layout.html">
  <slot name="content">
    <!-- Page-specific content goes here -->
  </slot>
</template>
```

### 2. Component with Data Binding

```html
<!-- Using a component with custom data -->
<template src="/components/card.html" 
          card_title="My Title"
          card_type="feature">
  <slot name="card-content">
    <p>Custom content for this card instance</p>
  </slot>
</template>
```

### 3. Frontmatter Integration

```html
<!-- 
data:
  title: "Page Title"
  description: "Page description"
  hero_title: "Custom Hero"
-->

<!-- Use frontmatter data in templates -->
<h1>{{ title }}</h1>
<meta name="description" content="{{ description }}">
```

## 🆚 Comparison with Current Syntax

| Feature | Current (v0.4) | DOM Mode (v0.5) |
|---------|----------------|-----------------|
| **Includes** | `<!--#include virtual="/path" -->` | `<template src="/path">` |
| **Data Passing** | ❌ Not supported | ✅ `<template src="..." title="value">` |
| **Content Injection** | ❌ Not supported | ✅ `<slot name="content">` |
| **Layout System** | ⚠️ Markdown only | ✅ Any HTML template |
| **Composition** | ❌ Limited | ✅ Full component composition |

## 🎯 Benefits

- **🧩 Modular**: Build sites from reusable components
- **🎨 Flexible**: Mix with traditional includes and markdown
- **⚡ Fast**: Compiles to pure HTML - no client-side templating
- **🔧 Maintainable**: Component-based architecture scales well
- **📱 Modern**: Web standards-inspired syntax

## 🔮 Implementation Status

**Status**: 📋 Planned for v0.5

This example serves as a **specification and design document** for the upcoming DOM Mode feature. The syntax and structure shown here represent the intended implementation.

## 🤝 Contributing

If you're interested in helping implement DOM Mode:

1. Review this example for syntax and feature completeness
2. Provide feedback on the proposed API design
3. Help with implementation planning and architecture
4. Contribute to the DOM processor and template engine

---

*This example demonstrates the future of DOMpile templating. Stay tuned for DOM Mode in v0.5!*