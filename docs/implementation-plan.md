# DOMpile Implementation Plan

This document provides a detailed task breakdown for implementing the DOMpile static site generator from scratch. Tasks are organized by implementation phases and dependencies.

## Phase 1: Project Foundation

### 1.1 Project Initialization
- [x] Create `package.json` with ESM configuration (`"type": "module"`)
- [x] Set up basic project metadata (name, version, description, license)
- [x] Configure `engines` field to require Node.js 14+
- [x] Add `bin` field mapping `dompile` to CLI entry point
- [x] Initialize git repository and add `.gitignore`
- [x] Set up basic directory structure (`src/`, `test/`, `bin/`)

### 1.2 CLI Foundation
- [x] Create `bin/cli.js` with proper shebang (`#!/usr/bin/env node`)
- [x] Set executable permissions on CLI file
- [x] Implement basic argument parsing (manual or with minimal library)
- [x] Add support for `build` and `serve` commands
- [x] Implement `--help` and `--version` flags
- [x] Add command-line options: `--source`, `--output`, `--head`, `--port`
- [x] Test global installation (`npm link` for development)

### 1.3 Core Utilities
- [x] Create `src/utils/logger.js` for consistent logging
- [x] Create `src/utils/path-resolver.js` for path utilities
- [x] Implement security checks for path traversal prevention
- [x] Add file extension detection utilities
- [x] Create error classes for different error types

## Phase 2: Core HTML Processing

### 2.1 Include Processor
- [x] Create `src/core/include-processor.js`
- [x] Implement regex pattern for SSI directive parsing
- [x] Support both `file` and `virtual` include types
- [x] Add path resolution logic (relative vs. absolute)
- [x] Implement recursive include processing
- [x] Add circular dependency detection with proper error handling
- [x] Handle missing include files gracefully
- [x] Add support for nested includes
- [x] Implement include depth limiting for safety

### 2.2 Head Injection System
- [x] Create `src/core/head-injector.js`
- [x] Implement convention-based head file detection (`head.html`, `_head.html`)
- [x] Add CLI option support for custom head file path
- [x] Implement injection logic (insert after `<head>` opening tag)
- [x] Handle HTML files without `<head>` section gracefully
- [x] Add formatting preservation for injected content
- [x] Test with various HTML structures

### 2.3 Dependency Tracking
- [x] Create `src/core/dependency-tracker.js`
- [x] Implement `includesInPage` mapping (page → includes)
- [x] Implement `pagesByInclude` mapping (include → pages)
- [x] Add dependency recording during include processing
- [x] Implement change impact analysis for selective rebuilds
- [x] Handle nested dependency chains correctly
- [x] Add dependency graph visualization for debugging

## Phase 3: File Processing System

### 3.1 File System Operations
- [x] Create `src/core/file-processor.js`
- [x] Implement recursive directory scanning
- [x] Add file type detection and handling
- [x] Implement HTML file processing workflow
- [x] Add static asset copying functionality
- [x] Handle partial file exclusions (`includes/` directory, `_` prefix files)
- [x] Implement output directory structure preservation
- [ ] Add file permission and metadata preservation

### 3.2 Build Process
- [x] Implement full site build workflow
- [x] Add output directory cleanup before build
- [ ] Implement parallel file processing for performance
- [x] Add build progress reporting and logging
- [x] Handle build errors gracefully with detailed reporting
- [x] Add build verification and validation
- [ ] Implement incremental build optimization

### 3.3 Asset Management
- [x] Implement intelligent asset copying (only changed files)
- [x] Add MIME type detection for proper serving
- [x] Handle binary file copying correctly
- [ ] Add asset optimization hooks for future extensions
- [ ] Implement asset fingerprinting preparation

## Phase 4: Development Server

### 4.1 HTTP Server
- [x] Create `src/server/dev-server.js`
- [x] Implement basic HTTP server using Node.js built-ins
- [x] Add static file serving from output directory
- [x] Implement request routing (`/` → `/index.html`)
- [x] Add proper MIME type headers
- [x] Implement security measures (path traversal prevention)
- [x] Add custom 404 handling
- [x] Support directory listings for debugging

### 4.2 Live Reload System
- [x] Create `src/server/live-reload.js`
- [x] Implement Server-Sent Events endpoint (`/__events`)
- [x] Add client connection management
- [x] Implement reload script injection into HTML responses
- [x] Add graceful connection cleanup on client disconnect
- [x] Test browser compatibility for SSE

### 4.3 File Watching
- [x] Create `src/server/file-watcher.js`
- [x] Install and configure Chokidar dependency
- [x] Implement file change event handlers
- [x] Add selective rebuild logic based on file type
- [x] Integrate with dependency tracker for impact analysis
- [x] Handle file additions, modifications, and deletions
- [x] Add debouncing for rapid file changes
- [x] Implement ignore patterns for output directory

## Phase 5: Testing Framework

### 5.1 Test Infrastructure
- [x] Set up test framework (Node.js built-in `test` or minimal library)
- [x] Create test directory structure (`unit/`, `integration/`, `fixtures/`)
- [x] Add test fixtures with sample site structures
- [x] Implement test utilities for file system operations
- [ ] Add assertion helpers for HTML content validation
- [ ] Set up test coverage reporting

### 5.2 Unit Tests
- [x] Test include processor with various directive formats
- [x] Test path resolution for both file and virtual includes
- [x] Test circular dependency detection
- [x] Test head injection with different HTML structures
- [ ] Test dependency tracking accuracy
- [x] Test error handling for missing files
- [ ] Test security measures (path traversal prevention)
- [x] Test utility functions comprehensively

### 5.3 Integration Tests
- [ ] Test full build process with sample projects
- [ ] Test development server HTTP functionality
- [ ] Test live reload Server-Sent Events
- [ ] Test file watching and selective rebuilds
- [ ] Test CLI argument parsing and command execution
- [ ] Test cross-platform path handling
- [ ] Test error scenarios and recovery

## Phase 6: Cross-Platform Compatibility

### 6.1 Node.js Compatibility
- [ ] Verify ESM import/export functionality
- [ ] Test built-in module usage (`fs/promises`, `path`, etc.)
- [ ] Test npm package installation and global usage



## Phase 7: Documentation and Polish

### 7.1 Code Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Document complex algorithms and processing logic
- [ ] Add inline comments for security-critical sections
- [ ] Create API documentation for extensibility
- [ ] Document configuration options comprehensively

### 7.2 User Documentation
- [ ] Update README.md with actual usage examples
- [ ] Create getting started guide with sample project
- [ ] Document all CLI options and their effects
- [ ] Add troubleshooting section for common issues
- [ ] Create comparison with other static site generators

### 7.3 Examples and Demos
- [ ] Create example project demonstrating all features
- [ ] Add sample include files (header, footer, navigation)
- [ ] Create documentation site using DOMpile itself
- [ ] Add video or GIF demos of live reload functionality
- [ ] Create template repository for quick starts

## Phase 8: Quality Assurance

### 8.1 Error Handling
- [ ] Implement comprehensive error messages with file paths
- [ ] Add helpful suggestions for common mistakes
- [ ] Test all error conditions systematically
- [ ] Implement graceful degradation for non-critical errors
- [ ] Add debug mode for detailed troubleshooting

### 8.2 Performance Optimization
- [ ] Profile build performance with large sites
- [ ] Optimize file I/O operations
- [ ] Implement intelligent caching where beneficial
- [ ] Add performance benchmarks and monitoring
- [ ] Optimize development server response times

### 8.3 Security Review
- [ ] Audit all path handling for security vulnerabilities
- [ ] Review file access permissions and restrictions
- [ ] Test against malicious include directives
- [ ] Validate input sanitization
- [ ] Document security considerations

## Phase 9: Publishing and Distribution

### 9.1 Package Preparation
- [ ] Finalize package.json metadata
- [ ] Add comprehensive `.npmignore` file
- [ ] Test package installation from tarball
- [ ] Verify all required files are included
- [ ] Add licensing information

### 9.2 CI/CD Setup
- [ ] Set up GitHub Actions for automated testing
- [ ] Test across multiple Node.js versions
- [ ] Add automated security scanning
- [ ] Set up automated publishing on release
- [ ] Add badge generation for README

### 9.3 Release Management
- [ ] Create initial release (v0.1.0)
- [ ] Tag release in git repository
- [ ] Publish to npm registry
- [ ] Create GitHub release with changelog
- [ ] Announce release and gather initial feedback

## Dependencies to Install

### Production Dependencies
- [ ] `chokidar` - File watching (only dependency needed)

### Development Dependencies
- [ ] Test framework (if not using Node.js built-in)
- [ ] Code coverage tool
- [ ] Linting tools (ESLint)
- [ ] Formatting tools (Prettier)

## Success Criteria

### Functional Requirements
- [ ] Successfully processes HTML files with include directives
- [ ] Generates complete static sites in output directory
- [ ] Development server serves files with live reload
- [ ] CLI works across different platforms and environments
- [ ] Handles errors gracefully with helpful messages

### Performance Requirements
- [ ] Builds sites with 100+ pages in under 5 seconds
- [ ] Development server starts in under 1 second
- [ ] Live reload triggers within 500ms of file changes
- [ ] Memory usage remains reasonable for large sites

### Quality Requirements
- [ ] 90%+ test coverage across all modules
- [ ] Zero security vulnerabilities in dependencies
- [ ] Cross-platform compatibility verified
- [ ] Documentation is complete and accurate
- [ ] Code follows consistent style guidelines

## Estimated Timeline

- **Phase 1-2**: 1-2 weeks (Core functionality)
- **Phase 3-4**: 1-2 weeks (File processing and server)
- **Phase 5-6**: 1 week (Testing and compatibility)
- **Phase 7-9**: 1 week (Documentation and release)

**Total Estimated Time**: 4-6 weeks for complete implementation

## Notes for Implementation

- Prioritize core functionality (include processing) first
- Implement comprehensive error handling throughout
- Test continuously during development
- Keep dependency footprint minimal
- Document decisions and trade-offs
- Follow security best practices for file handling
- Ensure code is readable and maintainable
- Plan for future extensibility without over-engineering