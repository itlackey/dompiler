/**
 * Path resolution utilities for dompile
 * Handles secure path resolution and validation
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { PathTraversalError } from './errors.js';

/**
 * Resolve include path based on type (file vs virtual)
 * @param {string} type - 'file' or 'virtual'
 * @param {string} includePath - Path from include directive
 * @param {string} currentFilePath - Path of file containing the include
 * @param {string} sourceRoot - Root source directory
 * @returns {string} Resolved absolute path
 */
export function resolveIncludePath(type, includePath, currentFilePath, sourceRoot) {
  // Validate input
  if (!includePath || typeof includePath !== 'string') {
    throw new Error('Include path must be a non-empty string');
  }
  
  let resolvedPath;
  
  if (type === 'file') {
    // Relative to current file's directory
    const currentDir = path.dirname(currentFilePath);
    resolvedPath = path.resolve(currentDir, includePath);
  } else if (type === 'virtual') {
    // Relative to source root, remove all leading slashes and normalize
    let cleanPath = includePath.replace(/^\/+/, '');
    // Normalize multiple slashes
    cleanPath = cleanPath.replace(/\/+/g, '/');
    resolvedPath = path.resolve(sourceRoot, cleanPath);
  } else {
    throw new Error(`Invalid include type: ${type}`);
  }
  
  // Security check: ensure resolved path is within source root
  if (!isPathWithinDirectory(resolvedPath, sourceRoot)) {
    throw new PathTraversalError(includePath, sourceRoot);
  }
  
  return resolvedPath;
}

/**
 * Check if a path is within a directory (prevents path traversal)
 * @param {string} filePath - Path to check
 * @param {string} directory - Directory that should contain the path
 * @returns {boolean} True if path is within directory
 */
export function isPathWithinDirectory(filePath, directory) {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDirectory = path.resolve(directory);
  
  return resolvedFilePath.startsWith(resolvedDirectory + path.sep) || 
         resolvedFilePath === resolvedDirectory;
}

/**
 * Get file extension from path
 * @param {string} filePath - File path
 * @returns {string} Extension including dot (e.g., '.html')
 */
export function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file is an HTML file
 * @param {string} filePath - File path
 * @returns {boolean} True if HTML file
 */
export function isHtmlFile(filePath) {
  return getFileExtension(filePath) === '.html';
}

/**
 * Check if file is a partial (should not be output)
 * @param {string} filePath - File path
 * @param {string} includesDir - Includes directory name
 * @returns {boolean} True if file is a partial
 */
export function isPartialFile(filePath, includesDir = 'includes') {
  const fileName = path.basename(filePath);
  const dirName = path.basename(path.dirname(filePath));
  
  // Check if in includes directory
  if (dirName === includesDir || filePath.includes(`${path.sep}${includesDir}${path.sep}`)) {
    return true;
  }
  
  // Check if filename starts with underscore
  if (fileName.startsWith('_')) {
    return true;
  }
  
  return false;
}

/**
 * Get output path for a source file
 * @param {string} sourcePath - Source file path
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 * @returns {string} Output file path
 */
export function getOutputPath(sourcePath, sourceRoot, outputRoot) {
  const relativePath = path.relative(sourceRoot, sourcePath);
  return path.resolve(outputRoot, relativePath);
}

/**
 * Get current file's directory (for ES modules)
 * @param {string} importMetaUrl - import.meta.url
 * @returns {string} Directory path
 */
export function getCurrentDirectory(importMetaUrl) {
  return path.dirname(fileURLToPath(importMetaUrl));
}