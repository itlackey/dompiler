/**
 * HTML Include Processor for dompile
 * Handles expansion of Apache SSI-style include directives
 */

import fs from 'fs/promises';
import path from 'path';
import { resolveIncludePath, isPathWithinDirectory } from '../utils/path-resolver.js';
import { 
  IncludeNotFoundError, 
  CircularDependencyError, 
  MalformedDirectiveError,
  FileSystemError 
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Regex to match include directives
const INCLUDE_DIRECTIVE_REGEX = /<!--#include\s+(virtual|file)="([^"]+)"\s*-->/gi;

// Maximum include depth to prevent runaway recursion
const MAX_INCLUDE_DEPTH = 10;

/**
 * Process all include directives in HTML content with Apache SSI-style syntax.
 * Supports both file includes (relative to current file) and virtual includes (relative to source root).
 * Recursively processes nested includes with circular dependency detection and depth limiting.
 * 
 * @param {string} htmlContent - HTML content containing include directives to process
 * @param {string} filePath - Absolute path of the current file being processed
 * @param {string} sourceRoot - Absolute path to the source root directory
 * @param {Set<string>} processedFiles - Set of file paths currently being processed (for cycle detection)
 * @param {number} depth - Current recursion depth (max 10 levels)
 * @returns {Promise<string>} HTML content with all include directives expanded
 * @throws {CircularDependencyError} When circular include dependencies are detected
 * @throws {Error} When maximum include depth is exceeded
 * 
 * @example
 * // Process HTML with includes
 * const html = '<!--#include file="header.html" --><main>Content</main>';
 * const result = await processIncludes(html, '/src/index.html', '/src');
 * // Returns HTML with header.html content inserted
 */
export async function processIncludes(
  htmlContent, 
  filePath, 
  sourceRoot, 
  processedFiles = new Set(),
  depth = 0,
  dependencyTracker = null
) {
  // Prevent excessive recursion
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new Error(`Maximum include depth (${MAX_INCLUDE_DEPTH}) exceeded in ${filePath}`);
  }
  
  // Detect circular dependencies
  if (processedFiles.has(filePath)) {
    const chain = Array.from(processedFiles);
    throw new CircularDependencyError(filePath, chain);
  }
  
  // Add current file to processing set
  const newProcessedFiles = new Set(processedFiles);
  newProcessedFiles.add(filePath);
  
  // Find all include directives
  const matches = Array.from(htmlContent.matchAll(INCLUDE_DIRECTIVE_REGEX));
  
  if (matches.length === 0) {
    return htmlContent;
  }
  
  logger.debug(`Processing ${matches.length} includes in ${filePath}`);
  
  // Process includes sequentially to maintain order
  let processedContent = htmlContent;
  
  for (const match of matches) {
    const [fullMatch, type, includePath] = match;
    
    try {
      // Resolve include path
      const resolvedPath = resolveIncludePath(type, includePath, filePath, sourceRoot);
      
      // Read include file
      let includeContent;
      try {
        includeContent = await fs.readFile(resolvedPath, 'utf-8');
        logger.debug(`Loaded include: ${includePath} -> ${resolvedPath}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new IncludeNotFoundError(includePath, filePath);
        }
        throw new FileSystemError('read', resolvedPath, error);
      }
      
      // Track dependencies for this include file if tracker is provided
      if (dependencyTracker) {
        dependencyTracker.analyzePage(resolvedPath, includeContent, sourceRoot);
      }
      
      // Recursively process nested includes
      const processedInclude = await processIncludes(
        includeContent,
        resolvedPath,
        sourceRoot,
        newProcessedFiles,
        depth + 1,
        dependencyTracker
      );
      
      // Replace the directive with processed content
      processedContent = processedContent.replace(fullMatch, processedInclude);
      
    } catch (error) {
      // Log error and provide helpful context
      logger.error(`Failed to process include: ${includePath} in ${filePath}`);
      logger.error(error.message);
      
      // Re-throw all errors to fail the build
      throw error;
    }
  }
  
  return processedContent;
}

/**
 * Extract include dependencies from HTML content
 * @param {string} htmlContent - HTML content to analyze
 * @param {string} filePath - Path of the current file
 * @param {string} sourceRoot - Root source directory
 * @returns {string[]} Array of resolved include file paths
 */
export function extractIncludeDependencies(htmlContent, filePath, sourceRoot) {
  const dependencies = [];
  const matches = Array.from(htmlContent.matchAll(INCLUDE_DIRECTIVE_REGEX));
  
  for (const match of matches) {
    const [, type, includePath] = match;
    
    try {
      const resolvedPath = resolveIncludePath(type, includePath, filePath, sourceRoot);
      dependencies.push(resolvedPath);
    } catch (error) {
      // Log warning but continue - dependency tracking shouldn't break builds
      logger.warn(`Could not resolve include dependency: ${includePath} in ${filePath}`);
    }
  }
  
  return dependencies;
}

/**
 * Check if content contains include directives
 * @param {string} htmlContent - HTML content to check
 * @returns {boolean} True if content has includes
 */
export function hasIncludes(htmlContent) {
  return INCLUDE_DIRECTIVE_REGEX.test(htmlContent);
}

/**
 * Validate include directive syntax
 * @param {string} directive - Include directive to validate
 * @returns {Object|null} Parsed directive or null if invalid
 */
export function parseIncludeDirective(directive) {
  const match = directive.match(/<!--#include\s+(virtual|file)="([^"]+)"\s*-->/i);
  
  if (!match) {
    return null;
  }
  
  const [, type, path] = match;
  
  // Basic validation
  if (!type || !path) {
    return null;
  }
  
  if (type !== 'virtual' && type !== 'file') {
    return null;
  }
  
  if (path.trim() === '') {
    return null;
  }
  
  return { type, path: path.trim() };
}