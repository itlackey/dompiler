/**
 * Asset Reference Tracker for dompile
 * Tracks which assets are actually referenced in HTML content
 */

import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Asset tracker for managing asset references and dependencies
 */
export class AssetTracker {
  constructor() {
    // Maps asset file path to array of pages that reference it
    this.assetReferences = new Map();
    
    // Set of all referenced assets for quick lookup
    this.referencedAssets = new Set();
    
    // Cache of parsed asset references from HTML content
    this.htmlAssetCache = new Map();
  }

  /**
   * Extract asset references from HTML content
   * @param {string} htmlContent - HTML content to analyze
   * @param {string} pagePath - Path to the page file
   * @param {string} sourceRoot - Source root directory
   * @returns {string[]} Array of referenced asset paths
   */
  extractAssetReferences(htmlContent, pagePath, sourceRoot) {
    const references = new Set();
    
    // Patterns to match asset references
    const patterns = [
      // CSS files
      /<link[^>]+href=["']([^"']+\.css)["']/gi,
      // JavaScript files
      /<script[^>]+src=["']([^"']+\.js)["']/gi,
      // Images
      /<img[^>]+src=["']([^"']+\.(png|jpg|jpeg|gif|svg|webp|ico))["']/gi,
      // Background images in style attributes
      /style=["'][^"']*background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
      // Fonts
      /@font-face[^}]*url\(["']?([^"')]+\.(woff2?|ttf|eot|otf))["']?\)/gi,
      // Video/audio sources
      /<(?:video|audio)[^>]+src=["']([^"']+\.(mp4|webm|ogg|mp3|wav))["']/gi,
      // Source elements
      /<source[^>]+src=["']([^"']+)["']/gi,
      // Generic href/src attributes for other files
      /(?:href|src)=["']([^"']+\.(pdf|zip|doc|docx|txt))["']/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        const assetPath = match[1];
        
        // Skip external URLs
        if (assetPath.startsWith('http://') || 
            assetPath.startsWith('https://') || 
            assetPath.startsWith('//')) {
          continue;
        }
        
        // Skip data URLs
        if (assetPath.startsWith('data:')) {
          continue;
        }
        
        // Resolve relative paths
        const resolvedPath = this.resolveAssetPath(assetPath, pagePath, sourceRoot);
        if (resolvedPath) {
          references.add(resolvedPath);
        }
      }
    }

    return Array.from(references);
  }

  /**
   * Resolve asset path relative to page and source root
   * @param {string} assetPath - Asset path from HTML
   * @param {string} pagePath - Path to the page file
   * @param {string} sourceRoot - Source root directory
   * @returns {string|null} Resolved asset path or null if invalid
   */
  resolveAssetPath(assetPath, pagePath, sourceRoot) {
    
    try {
      let resolvedPath;
      
      if (assetPath.startsWith('/')) {
        // Absolute path from source root
        resolvedPath = path.join(sourceRoot, assetPath.slice(1));
      } else {
        // Relative path from current page
        const pageDir = path.dirname(pagePath);
        resolvedPath = path.resolve(pageDir, assetPath);
      }
      
      // Ensure the resolved path is within source root
      const relativePath = path.relative(sourceRoot, resolvedPath);
      if (relativePath.startsWith('../')) {
        logger.debug(`Asset path outside source root: ${assetPath}`);
        return null;
      }
      
      return resolvedPath;
    } catch (error) {
      logger.debug(`Could not resolve asset path: ${assetPath} from ${pagePath}`);
      return null;
    }
  }

  /**
   * Record asset references for a page
   * @param {string} pagePath - Path to the page file
   * @param {string} htmlContent - HTML content to analyze
   * @param {string} sourceRoot - Source root directory
   */
  recordAssetReferences(pagePath, htmlContent, sourceRoot) {
    // Clear existing references for this page
    this.clearPageAssetReferences(pagePath);
    
    // Extract new references
    const assets = this.extractAssetReferences(htmlContent, pagePath, sourceRoot);
    
    // Record new references
    for (const assetPath of assets) {
      if (!this.assetReferences.has(assetPath)) {
        this.assetReferences.set(assetPath, []);
      }
      this.assetReferences.get(assetPath).push(pagePath);
      this.referencedAssets.add(assetPath);
    }
    
    // Cache for this page
    this.htmlAssetCache.set(pagePath, assets);
    
    if (assets.length > 0) {
      logger.debug(`Found ${assets.length} asset references in ${pagePath}`);
    }
  }

  /**
   * Clear asset references for a specific page
   * @param {string} pagePath - Path to the page file
   */
  clearPageAssetReferences(pagePath) {
    const cachedAssets = this.htmlAssetCache.get(pagePath);
    
    if (cachedAssets) {
      for (const assetPath of cachedAssets) {
        const pages = this.assetReferences.get(assetPath);
        if (pages) {
          const index = pages.indexOf(pagePath);
          if (index > -1) {
            pages.splice(index, 1);
          }
          
          // Clean up empty arrays
          if (pages.length === 0) {
            this.assetReferences.delete(assetPath);
            this.referencedAssets.delete(assetPath);
          }
        }
      }
      
      this.htmlAssetCache.delete(pagePath);
    }
  }

  /**
   * Check if an asset is referenced by any page
   * @param {string} assetPath - Path to the asset file
   * @returns {boolean} True if asset is referenced
   */
  isAssetReferenced(assetPath) {
    return this.referencedAssets.has(assetPath);
  }

  /**
   * Get all pages that reference a specific asset
   * @param {string} assetPath - Path to the asset file
   * @returns {string[]} Array of page paths that reference the asset
   */
  getPagesThatReference(assetPath) {
    return this.assetReferences.get(assetPath) || [];
  }

  /**
   * Get all referenced assets
   * @returns {string[]} Array of all referenced asset paths
   */
  getAllReferencedAssets() {
    return Array.from(this.referencedAssets);
  }

  /**
   * Get all assets referenced by a specific page
   * @param {string} pagePath - Path to the page file
   * @returns {string[]} Array of asset paths referenced by the page
   */
  getPageAssets(pagePath) {
    return this.htmlAssetCache.get(pagePath) || [];
  }

  /**
   * Remove all records of a page (when page is deleted)
   * @param {string} pagePath - Path to the deleted page
   */
  removePage(pagePath) {
    this.clearPageAssetReferences(pagePath);
    logger.debug(`Removed page from asset tracking: ${pagePath}`);
  }

  /**
   * Get asset reference statistics for debugging
   * @returns {Object} Statistics about tracked asset references
   */
  getStats() {
    return {
      totalReferencedAssets: this.referencedAssets.size,
      totalAssetReferences: Array.from(this.assetReferences.values())
        .reduce((sum, pages) => sum + pages.length, 0),
      pagesWithAssets: this.htmlAssetCache.size
    };
  }

  /**
   * Clear all asset reference data
   */
  clear() {
    this.assetReferences.clear();
    this.referencedAssets.clear();
    this.htmlAssetCache.clear();
    logger.debug('Cleared all asset reference data');
  }

  /**
   * Export asset reference data for debugging or persistence
   * @returns {Object} Serializable asset reference data
   */
  export() {
    return {
      assetReferences: Object.fromEntries(this.assetReferences),
      referencedAssets: Array.from(this.referencedAssets),
      htmlAssetCache: Object.fromEntries(this.htmlAssetCache)
    };
  }

  /**
   * Import asset reference data
   * @param {Object} data - Asset reference data to import
   */
  import(data) {
    this.clear();
    
    if (data.assetReferences) {
      this.assetReferences = new Map(Object.entries(data.assetReferences));
    }
    
    if (data.referencedAssets) {
      this.referencedAssets = new Set(data.referencedAssets);
    }
    
    if (data.htmlAssetCache) {
      this.htmlAssetCache = new Map(Object.entries(data.htmlAssetCache));
    }
  }
}