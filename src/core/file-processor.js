/**
 * File Processing System for vanilla-wafer
 * Handles the build workflow and file operations
 */

import fs from 'fs/promises';
import path from 'path';
import { processIncludes } from './include-processor.js';
import { getHeadSnippet, injectHeadContent } from './head-injector.js';
import { DependencyTracker } from './dependency-tracker.js';
import { 
  isHtmlFile, 
  isPartialFile, 
  getOutputPath, 
  getFileExtension 
} from '../utils/path-resolver.js';
import { FileSystemError, BuildError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Build configuration options
 */
const DEFAULT_OPTIONS = {
  source: 'src',
  output: 'dist',
  includes: 'includes',
  head: null,
  clean: true
};

/**
 * Build the static site from source files
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Build results
 */
export async function build(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  
  logger.info(`Building site from ${config.source} to ${config.output}`);
  
  try {
    // Resolve paths
    const sourceRoot = path.resolve(config.source);
    const outputRoot = path.resolve(config.output);
    
    // Validate source directory exists
    try {
      await fs.access(sourceRoot);
    } catch (error) {
      throw new BuildError(`Source directory not found: ${sourceRoot}`);
    }
    
    // Clean output directory if requested
    if (config.clean) {
      await cleanOutputDirectory(outputRoot);
    }
    
    // Ensure output directory exists
    await fs.mkdir(outputRoot, { recursive: true });
    
    // Load head snippet
    const headSnippet = await getHeadSnippet(sourceRoot, config.includes, config.head);
    if (headSnippet) {
      logger.info('Loaded global head snippet');
    }
    
    // Initialize dependency tracker
    const dependencyTracker = new DependencyTracker();
    
    // Scan source directory
    const sourceFiles = await scanDirectory(sourceRoot);
    logger.info(`Found ${sourceFiles.length} source files`);
    
    // Process files
    const results = {
      processed: 0,
      copied: 0,
      skipped: 0,
      errors: []
    };
    
    for (const filePath of sourceFiles) {
      try {
        const relativePath = path.relative(sourceRoot, filePath);
        
        if (isHtmlFile(filePath)) {
          if (isPartialFile(filePath, config.includes)) {
            // Skip partial files in output
            logger.debug(`Skipping partial file: ${relativePath}`);
            results.skipped++;
          } else {
            // Process HTML file
            await processHtmlFile(
              filePath, 
              sourceRoot, 
              outputRoot, 
              headSnippet,
              dependencyTracker
            );
            results.processed++;
            logger.debug(`Processed: ${relativePath}`);
          }
        } else {
          // Copy static asset
          await copyAsset(filePath, sourceRoot, outputRoot);
          results.copied++;
          logger.debug(`Copied: ${relativePath}`);
        }
      } catch (error) {
        logger.error(`Error processing ${filePath}: ${error.message}`);
        results.errors.push({ file: filePath, error: error.message });
      }
    }
    
    // Build summary
    const duration = Date.now() - startTime;
    logger.success(`Build completed in ${duration}ms`);
    logger.info(`Processed: ${results.processed} pages, Copied: ${results.copied} assets, Skipped: ${results.skipped} partials`);
    
    if (results.errors.length > 0) {
      logger.warn(`Build completed with ${results.errors.length} errors`);
    }
    
    return {
      ...results,
      duration,
      dependencyTracker
    };
    
  } catch (error) {
    logger.error('Build failed:', error.message);
    throw error;
  }
}

/**
 * Process a single HTML file
 * @param {string} filePath - Path to HTML file
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 * @param {string|null} headSnippet - Head snippet to inject
 * @param {DependencyTracker} dependencyTracker - Dependency tracker instance
 */
async function processHtmlFile(filePath, sourceRoot, outputRoot, headSnippet, dependencyTracker) {
  // Read HTML content
  let htmlContent;
  try {
    htmlContent = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FileSystemError('read', filePath, error);
  }
  
  // Track dependencies before processing
  dependencyTracker.analyzePage(filePath, htmlContent, sourceRoot);
  
  // Process includes
  const processedContent = await processIncludes(htmlContent, filePath, sourceRoot);
  
  // Inject head content
  const finalContent = headSnippet ? 
    injectHeadContent(processedContent, headSnippet) : 
    processedContent;
  
  // Write to output
  const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
  await ensureDirectoryExists(path.dirname(outputPath));
  
  try {
    await fs.writeFile(outputPath, finalContent, 'utf-8');
  } catch (error) {
    throw new FileSystemError('write', outputPath, error);
  }
}

/**
 * Copy a static asset file
 * @param {string} filePath - Path to asset file
 * @param {string} sourceRoot - Source root directory
 * @param {string} outputRoot - Output root directory
 */
async function copyAsset(filePath, sourceRoot, outputRoot) {
  const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
  await ensureDirectoryExists(path.dirname(outputPath));
  
  try {
    await fs.copyFile(filePath, outputPath);
  } catch (error) {
    throw new FileSystemError('copy', filePath, error);
  }
}

/**
 * Recursively scan directory for files
 * @param {string} dirPath - Directory to scan
 * @param {string[]} files - Accumulated file list
 * @returns {Promise<string[]>} Array of file paths
 */
async function scanDirectory(dirPath, files = []) {
  let entries;
  
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    throw new FileSystemError('readdir', dirPath, error);
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip hidden directories and common build/dependency directories
      if (!entry.name.startsWith('.') && 
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' && 
          entry.name !== 'build') {
        await scanDirectory(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Skip hidden files
      if (!entry.name.startsWith('.')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Clean output directory
 * @param {string} outputRoot - Output directory to clean
 */
async function cleanOutputDirectory(outputRoot) {
  try {
    const stats = await fs.stat(outputRoot);
    if (stats.isDirectory()) {
      logger.debug(`Cleaning output directory: ${outputRoot}`);
      await fs.rm(outputRoot, { recursive: true, force: true });
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new FileSystemError('clean', outputRoot, error);
    }
    // Directory doesn't exist, nothing to clean
  }
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileSystemError('mkdir', dirPath, error);
  }
}

/**
 * Get MIME type for file extension
 * @param {string} filePath - File path
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = getFileExtension(filePath);
  
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file should be processed as HTML
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file should be processed
 */
export function shouldProcessFile(filePath, includesDir = 'includes') {
  return isHtmlFile(filePath) && !isPartialFile(filePath, includesDir);
}

/**
 * Get build statistics
 * @param {string} sourceRoot - Source root directory
 * @returns {Promise<Object>} Build statistics
 */
export async function getBuildStats(sourceRoot) {
  const files = await scanDirectory(sourceRoot);
  
  const stats = {
    total: files.length,
    html: 0,
    partials: 0,
    assets: 0
  };
  
  for (const filePath of files) {
    if (isHtmlFile(filePath)) {
      if (isPartialFile(filePath)) {
        stats.partials++;
      } else {
        stats.html++;
      }
    } else {
      stats.assets++;
    }
  }
  
  return stats;
}