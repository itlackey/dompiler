# DOMpile Architecture

This document provides a detailed technical overview of the DOMpile static site generator implementation, based on the comprehensive design plan.

## Overview

DOMpile is a lightweight static site generator that processes HTML files with server-side include (SSI) directives at build time. It transforms HTML templates with include statements into complete, standalone HTML files while providing a file watcher for automatic rebuilds during development.

## Core Design Principles

- **Minimal Dependencies**: Leverages Node.js built-in modules where possible

- **ESM-First**: Native ES module support for modern JavaScript environments

- **Cross-Platform**: Compatible with Node.js, Deno, and Bun

- **Framework-Free**: Pure HTML processing without templating engines

- **Apache SSI Compatible**: Uses familiar `<!--#include -->` syntax

## System Architecture

### High-Level Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Source HTML   │───▶│  Include Engine  │───▶│  Output HTML    │
│   + Partials    │    │  + Head Injector │    │  (Complete)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  File Watcher   │───▶│  Selective       │───▶│  Live Reload    │
│  (Development)  │    │  Rebuild Logic   │    │  via SSE        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Module Structure

### Core Modules

```
src/
├── cli/
│   ├── index.js           # Main CLI entry point
│   └── args-parser.js     # Command-line argument parsing

├── core/
│   ├── include-processor.js  # HTML include expansion logic
│   ├── head-injector.js     # Global head content injection
│   ├── file-processor.js   # File system operations and build logic
│   └── dependency-tracker.js # Include dependency mapping

├── utils/
    ├── path-resolver.js    # Path resolution utilities
    └── logger.js          # Logging utilities
```

## Detailed Implementation

### 1. Project Initialization (ESM Support)

**File**: `package.json`

```json
{
  "type": "module",
  "bin": {
    "dompile": "bin/cli.js"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

**Key Features**:

- Native ESM support with `"type": "module"`

- CLI executable via `bin` field

- Node 14+ requirement for stable ESM support

- Cross-platform compatibility (Windows, macOS, Linux)

### 2. CLI Design and Argument Parsing

**File**: `src/cli/index.js`

```javascript
#!/usr/bin/env node
import { parseArgs } from './args-parser.js';
import { build } from '../core/file-processor.js';

const args = parseArgs(process.argv.slice(2));

switch (args.command) {
  case 'build':
    await build(args);
    break;
  case 'watch':
    console.log('Watching for file changes...');
    break;
  default:
    console.log('Usage: dompile <build|watch> [options]');
}
```

**Supported Commands**:

- `build`: Generate static site

- `watch`: Watch files and rebuild on changes

**Command Options**:

- `--source, -s`: Source directory (default: src)

- `--includes, -i`: Includes directory containing partials.

- `--output, -o`: Output directory (default: `dist`)

- `--head`: Custom head include file path

### 3. HTML Include Processing Engine

**File**: `src/core/include-processor.js`

#### Include Directive Syntax

- **File includes**: `<!--#include file="relative/path.html" -->`

- **Virtual includes**: `<!--#include virtual="/absolute/path.html" -->`

#### Processing Algorithm

```javascript
async function processIncludes(htmlContent, filePath, sourceRoot, processedFiles = new Set()) {
  // 1. Cycle detection - prevent infinite recursion
  if (processedFiles.has(filePath)) {
    throw new Error(`Circular dependency detected: ${filePath}`);
  }

  processedFiles.add(filePath);

  // 2. Find include directives using regex
  const includeRegex = /<!--#include\s+(virtual|file)="([^"]+)"\s*-->/gi;

  // 3. Replace each include directive
  return await htmlContent.replace(includeRegex, async (match, type, includePath) => {
    const resolvedPath = resolveIncludePath(type, includePath, filePath, sourceRoot);
    const includeContent = await fs.readFile(resolvedPath, 'utf-8');

    // 4. Recursively process nested includes
    return await processIncludes(includeContent, resolvedPath, sourceRoot, new Set(processedFiles));
  });
}
```

#### Path Resolution Logic

- **File includes**: Resolved relative to the including file's directory

- **Virtual includes**: Resolved relative to the source root directory

- **Security**: Prevents path traversal attacks (`../` escaping source root)

#### Error Handling

- Missing include files throw descriptive errors

- Circular dependencies detected and prevented

- Malformed directives logged as warnings

### 4. Global Head Injection

**File**: `src/core/head-injector.js`

#### Head Content Sources

1. **Convention-based**: Look for `head.html`, `_head.html` in includes folder root

2. **CLI option**: Custom file via `--head` parameter

#### Injection Process

```javascript
function injectHeadContent(htmlContent, headSnippet) {
  const openingHeadIndex = htmlContent.indexOf('<head>');

  if (openingHeadIndex !== -1 && headSnippet) {
    return htmlContent.slice(0, openingHeadIndex) 
         + headSnippet 
         + htmlContent.slice(openingHeadIndex);
  }

  return htmlContent;
}
```

- Injects content just after `<head>` opening tag

- Preserves existing `<title>` and meta tags

- Graceful handling when no `</head>` is found

### 5. File Processing Workflow

**File**: `src/core/file-processor.js`

#### Build Process

1. **Directory Scanning**: Recursively traverse source directory

2. **File Type Detection**: Handle HTML files vs static assets differently

3. **HTML Processing**: Apply includes and head injection

4. **Asset Copying**: Copy CSS, JS, images as-is to output

5. **Output Generation**: Maintain directory structure in output

#### File Type Handling

```javascript
async function processFile(filePath, sourceRoot, outputRoot) {
  const ext = path.extname(filePath);

  if (ext === '.html') {
    // Process HTML with includes and head injection
    let content = await fs.readFile(filePath, 'utf-8');
    content = await processIncludes(content, filePath, sourceRoot);
    content = injectHeadContent(content, headSnippet);

    const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
    await fs.writeFile(outputPath, content, 'utf-8');
  } else {
    // Copy static assets as-is
    const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
    await fs.copyFile(filePath, outputPath);
  }
}
```

#### Partial File Handling

- Files in `includes/` directory not copied to output

- Files starting with `_` treated as partials (convention)

- Configurable via CLI options or project settings

### 6. Dependency Tracking System

**File**: `src/core/dependency-tracker.js`

#### Dependency Maps

```javascript
class DependencyTracker {
  constructor() {
    this.includesInPage = new Map();     // page -> [includes]
    this.pagesByInclude = new Map();     // include -> [pages]
  }

  recordDependency(pagePath, includePath) {
    // Update both maps for efficient lookups
  }

  getAffectedPages(changedFile) {
    // Return pages that need rebuilding when file changes
  }
}
```

#### Change Impact Analysis

- Track which pages use which includes

- Handle nested include dependencies

- Efficient selective rebuilding during development

### 7. Live Reload System

**File**: `src/server/live-reload.js`

#### Recommendation for Hot Reload

We recommend using `live-server` or similar solutions along with the `watch` flag to enable hot reload functionality during development. This approach ensures a lightweight and efficient development experience without the need for a dedicated HTTP server.

#### Client-Side Script Injection

```javascript
function injectReloadScript(htmlContent) {
  const script = `
    <script>
      new EventSource('/__events').onmessage = () => location.reload();
    </script>
  `;

  return htmlContent.replace('</body>', script + '</body>');
}
```

- Minimal client code injected only during development

- No external dependencies or libraries required

- Full page reload on any file change (simple and reliable)

### 8. File Watching and Change Detection

**File**: `src/server/file-watcher.js`

#### Chokidar Integration

```javascript
import chokidar from 'chokidar';

const watcher = chokidar.watch(sourceDir, {
  ignored: [outputDir, 'node_modules/**'],
  ignoreInitial: true,
  persistent: true
});

watcher
  .on('change', handleFileChange)
  .on('add', handleFileAdd)
  .on('unlink', handleFileRemove);
```

#### Selective Rebuild Logic

```javascript
async function handleFileChange(filePath) {
  const ext = path.extname(filePath);

  if (ext === '.html') {
    if (isPartialFile(filePath)) {
      // Rebuild all pages that include this partial
      const affectedPages = dependencyTracker.getAffectedPages(filePath);
      await Promise.all(affectedPages.map(rebuildPage));
    } else {
      // Rebuild just this page
      await rebuildPage(filePath);
    }
  } else {
    // Copy static asset
    await copyAsset(filePath);
  }

  // Trigger browser reload
  broadcastReload();
}
```

#### Change Detection Optimization

- Only rebuild affected pages, not entire site

- Handle nested include dependencies correctly

- Efficient for large sites with many pages

### 8. Cross-Platform Compatibility

#### Node.js Support

- **Minimum Version**: Node.js 14+ (stable ESM support)

- **Built-in Modules**: `fs/promises`, `path`, `http`, `url`

- **No transpilation**: Direct ES module execution

#### Bun Compatibility

```bash
# Direct execution
bun run dompile serve

# Package installation
bunx dompile build
```

- High Node.js API compatibility

- Fast startup and execution

- Native TypeScript support (future enhancement)

#### Deno Support

```bash
# With npm package
deno run --allow-read --allow-write --allow-net npm:dompile

# Direct execution (with permissions)
deno run --allow-read --allow-write path/to/cli.js
```

- Node.js compatibility layer

- Explicit permission system

- ESM-native environment

### 9. Error Handling and Logging

#### Comprehensive Error Messages

```javascript
class IncludeError extends Error {
  constructor(message, filePath, lineNumber) {
    super(`${message} in ${filePath}:${lineNumber}`);
    this.filePath = filePath;
    this.lineNumber = lineNumber;
  }
}
```

#### Logging Levels

- **Info**: Build progress, file processing

- **Warn**: Missing includes, potential issues

- **Error**: Fatal errors, build failures

- **Debug**: Detailed processing information

#### Graceful Degradation

- Continue processing on non-fatal errors

- Provide helpful suggestions for common issues

- Clear error messages with file paths and line numbers

### 10. Testing Strategy

#### Unit Tests

- **Include Processing**: Test various include scenarios

- **Path Resolution**: Virtual vs file includes

- **Circular Dependencies**: Error detection and handling

- **Head Injection**: Various HTML structures

#### Integration Tests

- **Full Build Process**: End-to-end site generation

- **File Watching**: Change detection and rebuilding

- **Cross-Platform**: Node.js, Bun, Deno compatibility

#### Test Structure

```
test/
├── unit/
│   ├── include-processor.test.js
│   ├── head-injector.test.js
│   └── path-resolver.test.js

├── integration/
│   ├── build-process.test.js

└── fixtures/
    └── sample-site/
        ├── src/
        └── expected-output/
```

## Performance Considerations

### Build Performance

- **Selective Processing**: Only process changed files during development

- **Dependency Caching**: Cache include relationships

- **Parallel Processing**: Process independent files concurrently

- **Memory Efficiency**: Stream large files, avoid loading entire site in memory

### File Watching Performance

- **Full Rebuilds**: Simple approach avoids complex dependency tracking

- **Fast Builds**: Optimized build process typically under 50ms

- **Efficient Watching**: Use chokidar for cross-platform file watching

- **Debounced Rebuilds**: Prevent rapid successive builds

## Security Considerations

### Path Traversal Prevention

- Validate all include paths before resolution

- Restrict includes to source directory tree

- Sanitize user-provided paths

## Conclusion

DOMpile's architecture prioritizes simplicity, performance, and maintainability while providing powerful static site generation capabilities. The modular design allows for easy testing, extension, and cross-platform compatibility, making it an ideal tool for frontend developers who need the power of includes without framework complexity.