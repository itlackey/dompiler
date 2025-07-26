# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**DOMpile** is a fully implemented, working static site generator that processes HTML files with Apache SSI-style includes. The core functionality is complete and tested, with ~80% implementation finished.

## Development Commands

```bash
# Install dependencies and link globally for development
npm install && npm link

# Run all tests
npm test

# Test specific module (example)
node --test test/unit/include-processor.test.js

# Build example project
npm run build

# Start development server with live reload  
npm run dev

# Direct CLI usage (after npm link)
dompile build --source examples/basic/src --output dist
dompile serve --source examples/basic/src --port 3001
```

## Architecture Overview

DOMpile operates in two modes with a sophisticated processing pipeline:

### Build Mode Architecture
```
Source HTML → Include Processor → Head Injector → Static Files → Output
     ↓              ↓                 ↓              ↓           ↓
Dependencies → Dependency Tracker → File Processor → Assets → Complete Site
```

### Development Mode Architecture  
```
Initial Build → File Watcher → Selective Rebuild → SSE Broadcast → Browser Reload
     ↓              ↓              ↓                 ↓              ↓
Dependency Tracker → Change Analysis → Targeted Updates → Live Reload Script
```

## Core Processing Flow

### Include Processing (`src/core/include-processor.js`)
- Regex-based SSI directive parsing: `/<!--#include\s+(virtual|file)="([^"]+)"\s*-->/gi`
- **File includes**: `<!--#include file="header.html" -->` (relative to current file)
- **Virtual includes**: `<!--#include virtual="/includes/nav.html" -->` (relative to source root)
- Recursive processing with circular dependency detection using Set-based tracking
- 10-level depth limit prevents runaway recursion
- Security: Path traversal prevention, files must be within source tree

### Head Injection (`src/core/head-injector.js`)  
- Convention-based discovery: looks for `head.html`, `_head.html` in includes/ or source root
- CLI override: `--head custom/path.html`
- Injection point: immediately after `<head>` opening tag
- Preserves existing title/meta tags while adding global styles/scripts

### Dependency Tracking (`src/core/dependency-tracker.js`)
- Bidirectional mapping: `includesInPage` (page → includes) and `pagesByInclude` (include → pages)
- Change impact analysis: when partial changes, rebuild only dependent pages
- Handles nested dependencies: if A includes B and B includes C, change to C rebuilds pages using A

## Development Server Components

### File Watching (`src/server/file-watcher.js`)
- Chokidar-based with debouncing (100ms delay)
- Selective rebuild logic: 
  - Main page change → rebuild that page only
  - Partial change → rebuild all dependent pages via dependency tracker
  - Asset change → copy file to output
- Ignores: output directory, node_modules, .git, hidden files

### Live Reload (`src/server/live-reload.js`)
- Server-Sent Events on `/__events` endpoint
- Script injection only during development (not in static build output)
- Connection management with cleanup on client disconnect
- Broadcasts reload reason for debugging

### HTTP Server (`src/server/dev-server.js`)
- Node.js built-in HTTP module, no external server dependencies
- Static file serving with MIME type detection
- Security: path traversal prevention, files must be within output directory
- Directory listings for debugging
- Graceful shutdown handling

## Testing Architecture

Using Node.js built-in test runner (Node 14+):
- **Unit tests**: Core processing logic with temp file fixtures
- **File fixtures**: `test/fixtures/` with cleanup in afterEach hooks
- **38 tests passing** covering include processing, head injection, CLI parsing
- Test isolation: each test creates/destroys its own temp directories

## Code Organization Principles

### Error Handling Strategy
- Custom error classes in `src/utils/errors.js` with file context
- Graceful degradation: missing includes become error comments in output
- Build failures throw with descriptive messages and file locations

### Security Model
- Path resolution always validates against source/output boundaries
- `isPathWithinDirectory()` prevents `../` escapes
- CLI argument validation prevents injection attacks
- File serving restricted to output directory only

### ESM Module Design
- Native ES modules throughout (`"type": "module"` in package.json)
- No transpilation required, direct Node.js execution
- Import paths always include `.js` extensions for compatibility
- Cross-platform path handling via Node.js `path` module

## Key Implementation Details

### Performance Optimizations
- Selective rebuilds during development based on dependency analysis
- Debounced file watching to handle rapid changes
- Streaming file operations, no full-site loading into memory
- Parallel processing capability (single-threaded currently)

### Logging Strategy
- Configurable log levels via `LOG_LEVEL` environment variable
- Context-aware messages with emoji prefixes for CLI UX
- Debug mode shows detailed processing information
- Error messages include file paths and suggested fixes

## Extension Points

The architecture supports future enhancements:
- **Plugin system**: Processor functions can be composed/extended
- **Asset pipeline**: File processor has hooks for transformation
- **Template engines**: Include processor can be adapted for other syntaxes
- **Deployment**: Build system produces standard static files

## Current Limitations

- Single dependency: chokidar for file watching
- No built-in minification/optimization  
- Full page reload only (no hot module replacement)
- Synchronous include processing (could be parallelized)

## Documentation References

- `README.md`: User-facing documentation with examples
- `docs/ARCHITECTURE.md`: Detailed technical specifications  
- `docs/implementation-plan.md`: Complete task breakdown with status
- `examples/basic/`: Working demonstration project