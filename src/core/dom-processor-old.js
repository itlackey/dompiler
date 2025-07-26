/**
 * DOM Mode Processor for dompile
 * Implements the modern DOM-based templating system with <include> and <slot> elements
 * 
 * Key features:
 * - <include src="/components/alert.html" data-title="Value" /> for component inclusion
 * - <slot name="title">Default</slot> for layout content areas
 * - <template data-slot="title">Content</template> for slot content
 * - data-token="field" for token replacement within components
 * - data-layout="/layouts/blog.html" for layout specification
 */

import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import { logger } from '../utils/logger.js';
import { isPathWithinDirectory } from '../utils/path-resolver.js';
import { FileSystemError } from '../utils/errors.js';

/**
 * Default configuration for DOM mode processor
 */
const DEFAULT_CONFIG = {
  layoutsDir: 'layouts',
  componentsDir: 'components',
  defaultLayout: 'default.html',
  sourceRoot: 'src'
};

/**
 * Process a page using DOM mode templating
 * @param {string} pageContent - Raw HTML content of the page
 * @param {string} pagePath - Path to the page file
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 * @returns {Promise<string>} Processed HTML content
 */
export async function processDOMMode(pageContent, pagePath, sourceRoot, config = {}) {
  const domConfig = { ...DEFAULT_CONFIG, sourceRoot, ...config };
  
  try {
    // Parse the page HTML
    const dom = new JSDOM(pageContent, { 
      contentType: "text/html",
      includeNodeLocations: true 
    });
    const document = dom.window.document;
    
    // Detect layout from root element
    const layoutPath = await detectLayout(document, sourceRoot, domConfig);
    logger.debug(`Using layout: ${layoutPath}`);
    
    // Load and parse layout
    const layoutDom = await loadLayout(layoutPath);
    
    // Apply page content to layout
    const resultDom = await applyLayout(document, layoutDom, sourceRoot, domConfig);
    
    // Process all <include> elements
    await processIncludes(resultDom, sourceRoot, domConfig);
    
    // Return final HTML
    return '<!DOCTYPE html>\n' + resultDom.documentElement.outerHTML;
    
  } catch (error) {
    logger.error(`DOM processing failed for ${pagePath}: ${error.message}`);
    throw new FileSystemError('dom-process', pagePath, error);
  }
}

/**
 * Detect which layout to use for a page
 * @param {Document} document - Page DOM document
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 * @returns {Promise<string>} Absolute path to layout file
 */
async function detectLayout(document, sourceRoot, config) {
  // Check for data-layout attribute on root elements
  const rootElements = [
    document.documentElement,
    document.body,
    document.querySelector('[data-layout]')
  ].filter(Boolean);
  
  for (const element of rootElements) {
    const layoutAttr = element.getAttribute('data-layout');
    if (layoutAttr) {
      // Resolve layout path
      let layoutPath = layoutAttr;
      
      // Handle relative vs absolute paths
      let actualSourceRoot = sourceRoot;
      if (layoutPath.startsWith('/')) {
        // Absolute path from source root - need to find the actual source root
        // The sourceRoot might be just the pages directory, so go up to find layouts
        actualSourceRoot = await findActualSourceRoot(sourceRoot, layoutPath.substring(1));
        layoutPath = path.join(actualSourceRoot, layoutPath.substring(1));
      } else {
        // Relative to layouts directory
        layoutPath = path.join(sourceRoot, config.layoutsDir, layoutPath);
      }
      
      // Security check
      if (!isPathWithinDirectory(layoutPath, actualSourceRoot)) {
        throw new Error(`Layout path outside source directory: ${layoutAttr}`);
      }
      
      return layoutPath;
    }
  }
  
  // Fall back to default layout
  const defaultLayoutPath = path.join(sourceRoot, config.layoutsDir, config.defaultLayout);
  return defaultLayoutPath;
}

/**
 * Load a layout file and return its DOM
 * @param {string} layoutPath - Path to layout file
 * @returns {Promise<Document>} Layout DOM document
 */
async function loadLayout(layoutPath) {
  try {
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    const dom = new JSDOM(layoutContent, { contentType: "text/html" });
    return dom.window.document;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Layout file not found: ${layoutPath}`);
    }
    throw error;
  }
}

/**
 * Apply page content to layout using slot system
 * @param {Document} pageDoc - Page DOM document
 * @param {Document} layoutDoc - Layout DOM document
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 * @returns {Promise<Document>} Result DOM with page content applied to layout
 */
async function applyLayout(pageDoc, layoutDoc, sourceRoot, config) {
  // Clone layout to avoid modifying original
  const resultDoc = layoutDoc.cloneNode(true);
  
  // Find all slot templates in the page
  const slotTemplates = [...pageDoc.querySelectorAll('template[data-slot]')];
  
  // Process named slots
  for (const template of slotTemplates) {
    const slotName = template.getAttribute('data-slot');
    const slot = resultDoc.querySelector(`slot[name="${slotName}"]`);
    
    if (slot) {
      // Get template content - for JSDOM, we need to get innerHTML
      const templateHTML = template.innerHTML;
      
      // Create a temporary div to parse the content
      const tempDiv = resultDoc.createElement('div');
      tempDiv.innerHTML = templateHTML;
      
      // Replace slot with template content
      slot.replaceWith(...tempDiv.childNodes);
      logger.debug(`Filled named slot: ${slotName}`);
    } else {
      logger.warn(`No slot found for template data-slot="${slotName}"`);
    }
  }
  
  // Process default (unnamed) slot
  const defaultSlot = resultDoc.querySelector('slot:not([name])');
  if (defaultSlot) {
    // Get all root-level content from page that's not a template
    const pageBody = pageDoc.body || pageDoc.documentElement;
    const rootContent = [...pageBody.childNodes].filter(node => {
      return node.nodeName !== 'TEMPLATE' || !node.hasAttribute('data-slot');
    });
    
    if (rootContent.length > 0) {
      // Create HTML string from content and parse it
      let contentHTML = '';
      rootContent.forEach(node => {
        if (node.nodeType === 1) { // Element node
          contentHTML += node.outerHTML;
        } else if (node.nodeType === 3) { // Text node
          contentHTML += node.textContent;
        }
      });
      
      // Create temp div and parse content
      const tempDiv = resultDoc.createElement('div');
      tempDiv.innerHTML = contentHTML;
      
      defaultSlot.replaceWith(...tempDiv.childNodes);
      logger.debug('Filled default slot with page content');
    }
  }
  
  return resultDoc;
}

/**
 * Process all <include> elements in the document
 * @param {Document} document - DOM document to process
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 */
async function processIncludes(document, sourceRoot, config) {
  const includes = document.querySelectorAll('include[src]');
  
  for (const include of includes) {
    try {
      await processIncludeElement(include, document, sourceRoot, config);
    } catch (error) {
      logger.error(`Failed to process include: ${error.message}`);
      // Replace with error comment
      const comment = document.createComment(`Error processing include: ${error.message}`);
      include.replaceWith(comment);
    }
  }
}

/**
 * Process a single <include> element
 * @param {Element} include - The include element
 * @param {Document} document - Parent document
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 */
async function processIncludeElement(include, document, sourceRoot, config) {
  const src = include.getAttribute('src');
  if (!src) {
    throw new Error('Include element missing src attribute');
  }
  
  // Resolve component path
  let componentPath = src;
  let actualSourceRoot = sourceRoot;
  
  if (componentPath.startsWith('/')) {
    // Absolute path from source root - find the actual source root
    actualSourceRoot = await findActualSourceRoot(sourceRoot, componentPath.substring(1));
    componentPath = path.join(actualSourceRoot, componentPath.substring(1));
  } else {
    // Relative to components directory - also need to find actual source root
    actualSourceRoot = await findActualSourceRoot(sourceRoot, path.join(config.componentsDir, componentPath));
    componentPath = path.join(actualSourceRoot, config.componentsDir, componentPath);
  }
  
  // Security check
  if (!isPathWithinDirectory(componentPath, actualSourceRoot)) {
    throw new Error(`Component path outside source directory: ${src}`);
  }
  
  // Load component content
  let componentContent;
  try {
    componentContent = await fs.readFile(componentPath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Component file not found: ${componentPath}`);
    }
    throw error;
  }
  
  // Parse component
  const componentDom = new JSDOM(componentContent, { contentType: "text/html" });
  const componentDoc = componentDom.window.document;
  
  // Extract data attributes from include element for token replacement
  const dataAttributes = {};
  for (const attr of include.attributes) {
    if (attr.name.startsWith('data-')) {
      const tokenName = attr.name.substring(5); // Remove 'data-' prefix
      dataAttributes[tokenName] = attr.value;
    }
  }
  
  // Process token replacement
  processTokenReplacement(componentDoc, dataAttributes);
  
  // Extract and move styles to head
  const styles = componentDoc.querySelectorAll('style');
  const head = document.querySelector('head');
  if (head) {
    styles.forEach(style => {
      // Check for duplicates by content
      const existingStyles = head.querySelectorAll('style');
      const isDuplicate = [...existingStyles].some(existing => 
        existing.textContent.trim() === style.textContent.trim()
      );
      
      if (!isDuplicate) {
        const importedStyle = document.importNode(style, true);
        head.appendChild(importedStyle);
      }
    });
  }
  
  // Extract and move scripts to end of body
  const scripts = componentDoc.querySelectorAll('script');
  const body = document.querySelector('body');
  if (body) {
    scripts.forEach(script => {
      // Check for duplicates by content or src
      const existingScripts = body.querySelectorAll('script');
      const isDuplicate = [...existingScripts].some(existing => {
        if (script.src && existing.src) {
          return script.src === existing.src;
        }
        return existing.textContent.trim() === script.textContent.trim();
      });
      
      if (!isDuplicate) {
        const importedScript = document.importNode(script, true);
        body.appendChild(importedScript);
      }
    });
  }
  
  // Get component body content (excluding styles and scripts)
  const componentBody = componentDoc.body || componentDoc.documentElement;
  const contentNodes = [...componentBody.childNodes].filter(node => {
    return node.nodeName !== 'STYLE' && node.nodeName !== 'SCRIPT';
  });
  
  // Create fragment and import content
  const fragment = document.createDocumentFragment();
  contentNodes.forEach(node => {
    const importedNode = document.importNode(node, true);
    fragment.appendChild(importedNode);
  });
  
  // Replace include element with component content
  include.replaceWith(fragment);
  
  logger.debug(`Processed include: ${src}`);
}

/**
 * Process token replacement in component content
 * @param {Document} componentDoc - Component DOM document
 * @param {Object} dataAttributes - Data attributes from include element
 */
function processTokenReplacement(componentDoc, dataAttributes) {
  const tokenElements = componentDoc.querySelectorAll('[data-token]');
  
  tokenElements.forEach(element => {
    const tokenName = element.getAttribute('data-token');
    const tokenValue = dataAttributes[tokenName];
    
    if (tokenValue !== undefined) {
      // Replace element content with token value
      element.textContent = tokenValue;
      logger.debug(`Replaced token ${tokenName} with: ${tokenValue}`);
    }
  });
}

/**
 * Find the actual source root by looking for layout directories
 * @param {string} sourceRoot - Current source root (might be pages directory)
 * @param {string} layoutPath - Layout path to resolve
 * @returns {Promise<string>} Actual source root that contains the layout
 */
async function findActualSourceRoot(sourceRoot, layoutPath) {
  // Check if the layout exists in the current source root
  const directPath = path.join(sourceRoot, layoutPath);
  try {
    await fs.access(directPath);
    return sourceRoot;
  } catch {}
  
  // Try going up one directory level (common case: pages/ directory)
  const parentDir = path.dirname(sourceRoot);
  const parentPath = path.join(parentDir, layoutPath);
  try {
    await fs.access(parentPath);
    return parentDir;
  } catch {}
  
  // Try going up two levels
  const grandParentDir = path.dirname(parentDir);
  const grandParentPath = path.join(grandParentDir, layoutPath);
  try {
    await fs.access(grandParentPath);
    return grandParentDir;
  } catch {}
  
  // Default to original source root
  return sourceRoot;
}

/**
 * Check if DOM mode should be used for a file
 * @param {string} content - File content to check
 * @returns {boolean} True if file contains DOM mode elements
 */
export function shouldUseDOMMode(content) {
  // Check for DOM mode indicators
  return content.includes('<include ') || 
         content.includes('<slot') || 
         content.includes('data-slot=') ||
         content.includes('data-layout=') ||
         content.includes('data-token=');
}

/**
 * Get DOM mode configuration from CLI args or defaults
 * @param {Object} args - CLI arguments
 * @returns {Object} DOM mode configuration
 */
export function getDOMConfig(args = {}) {
  return {
    layoutsDir: args.layoutsDir || DEFAULT_CONFIG.layoutsDir,
    componentsDir: args.componentsDir || DEFAULT_CONFIG.componentsDir,
    defaultLayout: args.defaultLayout || DEFAULT_CONFIG.defaultLayout
  };
}