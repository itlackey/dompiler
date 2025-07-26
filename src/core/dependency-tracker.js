/**
 * Dependency Tracking System for dompile
 * Tracks include relationships for selective rebuilds
 */

import { logger } from '../utils/logger.js';
import { extractIncludeDependencies } from './include-processor.js';

/**
 * Dependency tracker for managing include relationships
 */
export class DependencyTracker {
  constructor() {
    // Maps page file path to array of include file paths it depends on
    this.includesInPage = new Map();
    
    // Maps include file path to array of page file paths that depend on it
    this.pagesByInclude = new Map();
    
    // Cache of all known files for efficient lookups
    this.knownFiles = new Set();
  }
  
  /**
   * Record dependencies for a page
   * @param {string} pagePath - Path to the page file
   * @param {string[]} includePaths - Array of include file paths
   */
  recordDependencies(pagePath, includePaths) {
    // Clear existing dependencies for this page
    this.clearPageDependencies(pagePath);
    
    // Record new dependencies
    if (includePaths.length > 0) {
      this.includesInPage.set(pagePath, [...includePaths]);
      
      // Update reverse mapping
      for (const includePath of includePaths) {
        if (!this.pagesByInclude.has(includePath)) {
          this.pagesByInclude.set(includePath, []);
        }
        this.pagesByInclude.get(includePath).push(pagePath);
      }
      
      logger.debug(`Recorded ${includePaths.length} dependencies for ${pagePath}`);
    }
    
    // Track all known files
    this.knownFiles.add(pagePath);
    includePaths.forEach(path => this.knownFiles.add(path));
  }
  
  /**
   * Clear dependencies for a specific page
   * @param {string} pagePath - Path to the page file
   */
  clearPageDependencies(pagePath) {
    const existingIncludes = this.includesInPage.get(pagePath);
    
    if (existingIncludes) {
      // Remove from reverse mapping
      for (const includePath of existingIncludes) {
        const pages = this.pagesByInclude.get(includePath);
        if (pages) {
          const index = pages.indexOf(pagePath);
          if (index > -1) {
            pages.splice(index, 1);
          }
          
          // Clean up empty arrays
          if (pages.length === 0) {
            this.pagesByInclude.delete(includePath);
          }
        }
      }
      
      this.includesInPage.delete(pagePath);
    }
  }
  
  /**
   * Get all pages that depend on a specific include file
   * @param {string} includePath - Path to the include file
   * @returns {string[]} Array of page paths that depend on the include
   */
  getAffectedPages(includePath) {
    const directlyAffected = this.pagesByInclude.get(includePath) || [];
    const allAffected = new Set(directlyAffected);
    
    // Check for nested dependencies - if this include is included by other includes
    const includesUsingThis = [];
    for (const [page, includes] of this.includesInPage.entries()) {
      if (includes.includes(includePath) && this.isIncludeFile(page)) {
        includesUsingThis.push(page);
      }
    }
    
    // Recursively find pages affected by nested includes
    for (const nestedInclude of includesUsingThis) {
      const nestedAffected = this.getAffectedPages(nestedInclude);
      nestedAffected.forEach(page => allAffected.add(page));
    }
    
    const result = Array.from(allAffected);
    logger.debug(`Include ${includePath} affects ${result.length} pages: ${result.join(', ')}`);
    
    return result;
  }
  
  /**
   * Get all includes used by a specific page
   * @param {string} pagePath - Path to the page file
   * @returns {string[]} Array of include paths used by the page
   */
  getPageDependencies(pagePath) {
    return this.includesInPage.get(pagePath) || [];
  }
  
  /**
   * Check if a file is an include (used by other files but not a main page)
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file is used as an include
   */
  isIncludeFile(filePath) {
    return this.pagesByInclude.has(filePath);
  }
  
  /**
   * Check if a file is a main page (not used as an include by others)
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file is a main page
   */
  isMainPage(filePath) {
    return this.includesInPage.has(filePath) && !this.pagesByInclude.has(filePath);
  }
  
  /**
   * Get all known files
   * @returns {string[]} Array of all known file paths
   */
  getAllFiles() {
    return Array.from(this.knownFiles);
  }
  
  /**
   * Get all main pages (files that are not includes)
   * @returns {string[]} Array of main page paths
   */
  getMainPages() {
    return this.getAllFiles().filter(file => !this.isIncludeFile(file) || this.includesInPage.has(file));
  }
  
  /**
   * Get all include files (files used by other files)
   * @returns {string[]} Array of include file paths
   */
  getIncludeFiles() {
    return Array.from(this.pagesByInclude.keys());
  }
  
  /**
   * Analyze and record dependencies from HTML content
   * @param {string} pagePath - Path to the page file
   * @param {string} htmlContent - HTML content to analyze
   * @param {string} sourceRoot - Source root directory
   */
  analyzePage(pagePath, htmlContent, sourceRoot) {
    const dependencies = extractIncludeDependencies(htmlContent, pagePath, sourceRoot);
    this.recordDependencies(pagePath, dependencies);
  }
  
  /**
   * Remove all records of a file (when file is deleted)
   * @param {string} filePath - Path to the deleted file
   */
  removeFile(filePath) {
    // Clear if it's a page
    this.clearPageDependencies(filePath);
    
    // Clear if it's an include
    if (this.pagesByInclude.has(filePath)) {
      const affectedPages = this.pagesByInclude.get(filePath);
      this.pagesByInclude.delete(filePath);
      
      // Update affected pages
      for (const pagePath of affectedPages) {
        const includes = this.includesInPage.get(pagePath);
        if (includes) {
          const index = includes.indexOf(filePath);
          if (index > -1) {
            includes.splice(index, 1);
          }
        }
      }
    }
    
    this.knownFiles.delete(filePath);
    logger.debug(`Removed file from dependency tracking: ${filePath}`);
  }
  
  /**
   * Get dependency statistics for debugging
   * @returns {Object} Statistics about tracked dependencies
   */
  getStats() {
    return {
      totalFiles: this.knownFiles.size,
      pagesWithDependencies: this.includesInPage.size,
      includeFiles: this.pagesByInclude.size,
      totalDependencyRelationships: Array.from(this.includesInPage.values())
        .reduce((sum, deps) => sum + deps.length, 0)
    };
  }
  
  /**
   * Clear all dependency data
   */
  clear() {
    this.includesInPage.clear();
    this.pagesByInclude.clear();
    this.knownFiles.clear();
    logger.debug('Cleared all dependency data');
  }
  
  /**
   * Export dependency data for debugging or persistence
   * @returns {Object} Serializable dependency data
   */
  export() {
    return {
      includesInPage: Object.fromEntries(this.includesInPage),
      pagesByInclude: Object.fromEntries(this.pagesByInclude),
      knownFiles: Array.from(this.knownFiles)
    };
  }
  
  /**
   * Import dependency data
   * @param {Object} data - Dependency data to import
   */
  import(data) {
    this.clear();
    
    if (data.includesInPage) {
      this.includesInPage = new Map(Object.entries(data.includesInPage));
    }
    
    if (data.pagesByInclude) {
      this.pagesByInclude = new Map(Object.entries(data.pagesByInclude));
    }
    
    if (data.knownFiles) {
      this.knownFiles = new Set(data.knownFiles);
    }
  }
}