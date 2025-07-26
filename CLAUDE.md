# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is **Vanilla Wafer**, a lightweight static site generator currently in the planning phase. The project has comprehensive documentation but **no implementation yet exists**. All source code needs to be built from scratch following the detailed specifications.

## Project Architecture Overview

Vanilla Wafer processes HTML files with Apache SSI-style include directives at build time, transforming templates into complete static sites. The system has two main modes:

- **Build Mode**: Process HTML includes and generate static output
- **Serve Mode**: Development server with live reload via Server-Sent Events

### Core Components (To Be Implemented)

1. **Include Processor**: Expands `<!--#include file="header.html" -->` directives
2. **Head Injector**: Automatically injects common `<head>` content into all pages  
3. **File Processor**: Manages build workflow and asset copying
4. **Development Server**: HTTP server with live reload and file watching
5. **CLI Interface**: Command-line tool for build and serve operations

### Target Platform Support
- Node.js 14+ (primary target with native ESM)
- Bun compatibility 
- Deno support via Node.js compatibility layer

## Key Design Principles

- **ESM-first**: Native ES modules without transpilation
- **Minimal dependencies**: Leverage Node.js built-ins, only add chokidar for file watching
- **Apache SSI compatibility**: Familiar `<!--#include -->` syntax
- **Framework-free**: Pure HTML processing without templating engines

## Development Setup (When Implementing)

The project will be structured as:
```
├── package.json          # ESM project with "type": "module"
├── bin/cli.js           # Executable entry point with shebang
├── src/
│   ├── cli/             # Command-line interface
│   ├── core/            # Include processing and build logic
│   ├── server/          # Development server and live reload
│   └── utils/           # Shared utilities
└── test/
    ├── unit/            # Component tests
    ├── integration/     # End-to-end build tests
    └── fixtures/        # Sample sites for testing
```

## Command Structure (Planned)

```bash
# Build static site
vanilla-wafer build --source src --output dist

# Development server  
vanilla-wafer serve --source src --port 3000

# Options
--source, -s    # Source directory (default: src)
--includes, -i  # Includes directory for partials
--output, -o    # Output directory (default: dist)  
--head         # Custom head include file path
--port         # Development server port (default: 3000)
```

## Include Processing Logic

The core functionality centers around two include types:
- **File includes**: `<!--#include file="relative/path.html" -->` (relative to current file)
- **Virtual includes**: `<!--#include virtual="/absolute/path.html" -->` (relative to source root)

Key requirements:
- Recursive include processing with circular dependency detection
- Path traversal security (prevent `../` escaping source directory)
- Dependency tracking for selective rebuilds during development

## Development Server Architecture  

Uses Node.js built-in HTTP module with:
- Static file serving from output directory
- Server-Sent Events endpoint (`/__events`) for live reload
- Automatic script injection in HTML responses during development
- File watching via chokidar with selective rebuild logic

## Testing Strategy

Focus on:
- **Include expansion**: Various directive patterns, nested includes, error cases
- **Dependency tracking**: Change impact analysis for selective rebuilds  
- **Cross-platform compatibility**: Node.js, Bun, Deno execution
- **Integration**: Full build process with sample projects

## Implementation References

- **ARCHITECTURE.md**: Comprehensive technical specification with code examples
- **Implementation Plan PDF**: 15-page step-by-step implementation guide
- **README.md**: User-facing documentation and examples

## Getting Started

Since no code exists yet, begin by:
1. Initialize package.json with ESM configuration
2. Set up CLI entry point with executable permissions
3. Implement core include processing logic first
4. Add file system operations and build workflow
5. Integrate development server and live reload
6. Add comprehensive testing suite

The project is well-documented with clear architectural decisions, making implementation straightforward by following the existing specifications.