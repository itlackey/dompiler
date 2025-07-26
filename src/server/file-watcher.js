/**
 * File Watching System for vanilla-wafer
 * Handles file system events and selective rebuilds
 */

import chokidar from 'chokidar';
import path from 'path';
import { logger } from '../utils/logger.js';
import { isHtmlFile, isPartialFile } from '../utils/path-resolver.js';
import { broadcastReload } from './live-reload.js';

/**
 * File watcher for development server
 */
export class FileWatcher {
  constructor(sourceRoot, outputRoot, includesDir = 'includes') {
    this.sourceRoot = path.resolve(sourceRoot);
    this.outputRoot = path.resolve(outputRoot);
    this.includesDir = includesDir;
    this.watcher = null;
    this.dependencyTracker = null;
    this.rebuilder = null;
    this.debounceTimeout = null;
    this.debounceDelay = 100; // ms
  }
  
  /**
   * Set dependency tracker for impact analysis
   * @param {DependencyTracker} dependencyTracker - Dependency tracker instance
   */
  setDependencyTracker(dependencyTracker) {
    this.dependencyTracker = dependencyTracker;
  }
  
  /**
   * Set rebuilder function for processing files
   * @param {Function} rebuilder - Function to rebuild files
   */
  setRebuilder(rebuilder) {
    this.rebuilder = rebuilder;
  }
  
  /**
   * Start watching files
   */
  start() {
    const watchOptions = {
      ignored: [
        this.outputRoot,
        '**/node_modules/**',
        '**/.git/**',
        '**/.*',
        '**/*.tmp'
      ],
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false
    };
    
    this.watcher = chokidar.watch(this.sourceRoot, watchOptions);
    
    this.watcher
      .on('change', (filePath) => this.handleFileChange(filePath, 'changed'))
      .on('add', (filePath) => this.handleFileChange(filePath, 'added'))
      .on('unlink', (filePath) => this.handleFileChange(filePath, 'removed'))
      .on('error', (error) => {
        logger.error('File watcher error:', error.message);
      })
      .on('ready', () => {
        logger.success(`Watching ${this.sourceRoot} for changes...`);
      });
    
    return this;
  }
  
  /**
   * Stop watching files
   */
  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
  
  /**
   * Handle file system events
   * @param {string} filePath - Path to changed file
   * @param {string} eventType - Type of change (changed, added, removed)
   */
  handleFileChange(filePath, eventType) {
    // Debounce rapid changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      this.processFileChange(filePath, eventType);
    }, this.debounceDelay);
  }
  
  /**
   * Process individual file changes
   * @param {string} filePath - Path to changed file
   * @param {string} eventType - Type of change
   */
  async processFileChange(filePath, eventType) {
    const relativePath = path.relative(this.sourceRoot, filePath);
    
    try {
      if (eventType === 'removed') {
        await this.handleFileRemoval(filePath, relativePath);
      } else if (isHtmlFile(filePath)) {
        await this.handleHtmlFileChange(filePath, relativePath, eventType);
      } else {
        await this.handleAssetChange(filePath, relativePath, eventType);
      }
      
      // Broadcast reload to browsers
      broadcastReload(`${relativePath} ${eventType}`);
      
    } catch (error) {
      logger.error(`Error processing file change for ${relativePath}:`, error.message);
    }
  }
  
  /**
   * Handle HTML file changes
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   * @param {string} eventType - Event type
   */
  async handleHtmlFileChange(filePath, relativePath, eventType) {
    if (isPartialFile(filePath, this.includesDir)) {
      // Partial file changed - rebuild all pages that depend on it
      await this.handlePartialChange(filePath, relativePath, eventType);
    } else {
      // Main page file changed - rebuild just this page
      await this.handlePageChange(filePath, relativePath, eventType);
    }
  }
  
  /**
   * Handle partial file changes
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   * @param {string} eventType - Event type
   */
  async handlePartialChange(filePath, relativePath, eventType) {
    if (!this.dependencyTracker || !this.rebuilder) {
      logger.warn('Dependency tracker or rebuilder not set, rebuilding all pages');
      await this.rebuilder?.();
      logger.info(`Partial ${eventType}: ${relativePath} (rebuilt all pages)`);
      return;
    }
    
    // Find all pages that depend on this partial
    const affectedPages = this.dependencyTracker.getAffectedPages(filePath);
    
    if (affectedPages.length === 0) {
      logger.info(`Partial ${eventType}: ${relativePath} (no dependent pages found)`);
      return;
    }
    
    // Rebuild affected pages
    let rebuiltCount = 0;
    for (const pagePath of affectedPages) {
      try {
        await this.rebuilder(pagePath);
        rebuiltCount++;
      } catch (error) {
        logger.error(`Failed to rebuild ${pagePath}:`, error.message);
      }
    }
    
    logger.info(`Partial ${eventType}: ${relativePath} (rebuilt ${rebuiltCount}/${affectedPages.length} pages)`);
  }
  
  /**
   * Handle main page file changes
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   * @param {string} eventType - Event type
   */
  async handlePageChange(filePath, relativePath, eventType) {
    if (!this.rebuilder) {
      logger.warn('Rebuilder not set, skipping page rebuild');
      return;
    }
    
    try {
      await this.rebuilder(filePath);
      logger.info(`Page ${eventType}: ${relativePath} (rebuilt)`);
    } catch (error) {
      logger.error(`Failed to rebuild page ${relativePath}:`, error.message);
    }
  }
  
  /**
   * Handle static asset changes
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   * @param {string} eventType - Event type
   */
  async handleAssetChange(filePath, relativePath, eventType) {
    if (!this.rebuilder) {
      logger.warn('Rebuilder not set, skipping asset copy');
      return;
    }
    
    try {
      await this.rebuilder(filePath);
      logger.info(`Asset ${eventType}: ${relativePath} (copied)`);
    } catch (error) {
      logger.error(`Failed to copy asset ${relativePath}:`, error.message);
    }
  }
  
  /**
   * Handle file removal
   * @param {string} filePath - Full file path
   * @param {string} relativePath - Relative file path
   */
  async handleFileRemoval(filePath, relativePath) {
    // Remove from dependency tracking
    if (this.dependencyTracker) {
      this.dependencyTracker.removeFile(filePath);
    }
    
    // Remove corresponding output file
    const outputPath = path.resolve(this.outputRoot, relativePath);
    try {
      await import('fs/promises').then(fs => fs.unlink(outputPath));
      logger.info(`File removed: ${relativePath} (deleted from output)`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn(`Failed to delete output file ${relativePath}:`, error.message);
      }
    }
  }
  
  /**
   * Get watch statistics
   * @returns {Object} Watch statistics
   */
  getStats() {
    if (!this.watcher) {
      return { watching: false };
    }
    
    const watched = this.watcher.getWatched();
    const fileCount = Object.values(watched).reduce((total, files) => total + files.length, 0);
    
    return {
      watching: true,
      watchedDirectories: Object.keys(watched).length,
      watchedFiles: fileCount,
      sourceRoot: this.sourceRoot,
      outputRoot: this.outputRoot
    };
  }
}