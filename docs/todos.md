# 📋 **dompile TODOs and Missing Features**

> Status: v0.4.0 implemented, reviewing roadmap gaps and future features

## 🔍 **Analysis Summary**

Current implementation has successfully delivered v0.1 through v0.4 features with high quality. However, there are some missing features from v0.4 and all of v0.5+ remains to be implemented.

---

## ❗ **Critical Missing Features (v0.4 gaps)**

### 🔗 **Pretty URL Output**
- **Status**: Not implemented 
- **Current**: `.md` → `.html` (e.g., `about.md` → `about.html`)
- **Expected**: `.md` → `/about/` (e.g., `about.md` → `about/index.html`)
- **Action**: Add CLI option `--pretty-urls` and implement directory-based output
- **Files**: `src/core/file-processor.js`, `src/cli/args-parser.js`

### 🐳 **Docker Polish**
- **Status**: Basic implementation complete
- **Missing**: 
  - Docker image not published to registry
  - No Docker Compose example
  - No multi-stage build optimization
- **Action**: Publish to Docker Hub, add docker-compose.yml example

---

## 🚀 **v0.5 - DOM Mode & Layout System** (Not Started)

### 🎨 **Modern Template Syntax**
- **Priority**: High
- **Features**:
  - `<template src="...">` for includes (alternative to Apache SSI)
  - `<slot>` and `{{ content }}` for layouts
  - Token replacement: `{{ title }}`, `{{ description }}`
  - Data attributes: `data-slot="main"`
- **Files to create**: 
  - `src/core/dom-processor.js`
  - `src/core/template-engine.js`

### 🔄 **Layout System Enhancements**
- **Priority**: High
- **Features**:
  - Layout chaining (layout can extend another layout)
  - Nested partials with multiple slots
  - Conditional includes based on frontmatter
- **Files to modify**: `src/core/file-processor.js`


---

## 🌐 **v0.6 - Routing + Sitemap + Canonical URLs** (Not Started)

### 🗺️ **Sitemap Generation**
- **Priority**: High
- **Features**:
  - Auto-generate `sitemap.xml`
  - Include all HTML and converted markdown pages
  - Support for lastmod, changefreq, priority
- **Files to create**: `src/core/sitemap-generator.js`

### 🔗 **URL Management**
- **Priority**: High
- **Features**:
  - Canonical URL support in HTML head
  - Internal link rewriting (`.md` → `.html` or pretty URLs)
  - Dead link detection and reporting
- **Files to create**: 
  - `src/core/url-processor.js`
  - `src/core/link-checker.js`

### 🎯 **SEO Enhancements**
- **Priority**: Medium
- **Features**:
  - Auto-generate meta descriptions from content
  - Open Graph tags from frontmatter
  - JSON-LD structured data support
- **Files to create**: `src/core/seo-processor.js`

---

## 🏁 **v1.0 - Production Ready** (Partially Complete)

### ✅ **Already Complete**
- CLI commands: `build`, `watch`, `serve` ✅
- File watching ✅
- Zero config ✅
- Fast builds ✅

### ❌ **Missing Features**

#### 📚 **Documentation**
- **Priority**: High
- **Missing**:
  - Complete user documentation
  - API documentation
  - Tutorial/getting started guide
  - Migration guide from other SSGs
- **Action**: Create comprehensive docs in `docs/` directory

#### 🎨 **Real-world Examples**
- **Priority**: Medium
- **Missing**: All Examples projects
- **Action**: Create example projects:
  - `Examples/dompile-site/` - Documentation site template
  - `Examples/htmx-blog/` - Blog with HTMX interactions
  - `Examples/minsite/` - Minimal starter template

#### ⚡ **Performance Optimizations**
- **Priority**: Medium
- **Missing**:
  - CPU usage optimization for file watching
  - Memory usage profiling and optimization
  - Build time benchmarking
- **Action**: Profile and optimize hot paths

#### 🧪 **Testing & Quality**
- **Priority**: High
- **Issues**:
  - 2 failing CLI tests (version display)
  - No integration tests for new markdown features
  - No performance tests
- **Action**: Fix failing tests, add comprehensive test coverage

---

## 🐛 **Bug Fixes & Technical Debt**

### 🔧 **CLI Issues**
- **Priority**: High
- **Issue**: Version display tests failing
- **Files**: `test/integration/cli.test.js`, `bin/cli.js`

### 📝 **Markdown Edge Cases**
- **Priority**: Medium
- **Issues**:
  - No tests for markdown with includes
  - Frontmatter parsing errors not handled gracefully
  - Layout file discovery could be more robust
- **Files**: `src/core/markdown-processor.js`, `test/`

### 🔄 **Asset Tracker Improvements**
- **Priority**: Low
- **Issues**:
  - Asset references in CSS files not tracked
  - No support for dynamic imports in JS
  - Background images in CSS not detected
- **Files**: `src/core/asset-tracker.js`

---

## 📈 **Quality Improvements**

### 🧪 **Test Coverage**
- **Current**: ~97% core functionality
- **Missing**: 
  - Markdown processing tests
  - Asset tracking tests
  - Docker integration tests
  - Performance regression tests
- **Target**: 100% core functionality, 90% integration

### 📊 **Performance Metrics**
- **Missing**: 
  - Build time benchmarks
  - Memory usage monitoring
  - File watching efficiency metrics
- **Action**: Add performance test suite

### 🛡️ **Security & Robustness**
- **Current**: Good (path traversal protection, input validation)
- **Improvements**:
  - Content Security Policy generation
  - HTML sanitization options
  - Rate limiting for dev server
- **Priority**: Low (security is already solid)

---

## 🎯 **Implementation Priority**

### **Phase 1: Complete v0.4 (High Priority)**
1. Fix CLI version display bug
2. Integrate table of contents generation
3. Implement pretty URL output option
4. Publish Docker image

### **Phase 2: Foundation for v0.5 (Medium Priority)**
1. Create DOM mode processor
2. Implement template engine with slots
3. Add layout chaining system

### **Phase 3: SEO & Production (Medium Priority)**
1. Sitemap generation
2. Canonical URL support
3. Link checking and rewriting
4. Complete documentation

### **Phase 4: Polish & Templates (Low Priority)**
1. Real-world template projects
2. Performance optimizations
3. Advanced SEO features
4. Community examples

---

## 🎉 **Current Status Summary**

**✅ Completed**: v0.1, v0.2, v0.3, v0.4 (95% complete)
**🚧 In Progress**: v0.4 polish (pretty URLs)
**📋 Next**: v0.5 DOM Mode planning
**🎯 Goal**: Feature-complete v1.0 by implementing all roadmap items

The current implementation is **production-ready** for basic to intermediate use cases. The missing features are primarily about **developer experience**, **advanced templating**, and **SEO optimization** rather than core functionality gaps.