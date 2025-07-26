/**
 * DOM Mode Processor v2 for dompile
 * String-based approach to handle slot replacement properly
 */

import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import { logger } from '../utils/logger.js';
import { isPathWithinDirectory } from '../utils/path-resolver.js';
import { FileSystemError } from '../utils/errors.js';

/**
 * Process a page using DOM mode templating with string-based slot replacement
 * @param {string} pageContent - Raw HTML content of the page
 * @param {string} pagePath - Path to the page file
 * @param {string} sourceRoot - Source root directory
 * @param {Object} config - DOM processor configuration
 * @returns {Promise<string>} Processed HTML content
 */
export async function processDOMMode(pageContent, pagePath, sourceRoot, config = {}) {
  const domConfig = { 
    layoutsDir: 'layouts',
    componentsDir: 'components', 
    defaultLayout: 'default.html',
    sourceRoot, 
    ...config 
  };
  
  try {
    // Parse the page HTML
    const dom = new JSDOM(pageContent, { contentType: "text/html" });
    const document = dom.window.document;
    
    // Detect layout from root element
    const layoutPath = await detectLayout(document, sourceRoot, domConfig);
    logger.debug(`Using layout: ${layoutPath}`);
    
    // Load layout content as string
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    
    // Extract slot content from page
    const slotData = extractSlotData(document);
    
    // Apply slots to layout using string replacement
    let processedHTML = applySlots(layoutContent, slotData);
    
    // Process includes in the result
    processedHTML = await processIncludesInHTML(processedHTML, sourceRoot, domConfig);
    
    return processedHTML;
    
  } catch (error) {
    logger.error(`DOM processing failed for ${pagePath}: ${error.message}`);
    throw new FileSystemError('dom-process', pagePath, error);
  }
}

/**
 * Detect which layout to use for a page
 */
async function detectLayout(document, sourceRoot, config) {
  const rootElements = [
    document.documentElement,
    document.body,
    document.querySelector('[data-layout]')
  ].filter(Boolean);
  
  for (const element of rootElements) {
    const layoutAttr = element.getAttribute('data-layout');
    if (layoutAttr) {
      let layoutPath = layoutAttr;
      let actualSourceRoot = sourceRoot;
      
      if (layoutPath.startsWith('/')) {
        actualSourceRoot = await findActualSourceRoot(sourceRoot, layoutPath.substring(1));
        layoutPath = path.join(actualSourceRoot, layoutPath.substring(1));
      } else {
        layoutPath = path.join(sourceRoot, config.layoutsDir, layoutPath);
      }
      
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
 * Extract slot data from page document
 */
function extractSlotData(document) {
  const slots = {};
  
  // Extract named slots
  const slotTemplates = document.querySelectorAll('template[data-slot]');
  slotTemplates.forEach(template => {
    const slotName = template.getAttribute('data-slot');
    slots[slotName] = template.innerHTML;
  });
  
  // Extract default slot content (everything not in a template)
  const body = document.body || document.documentElement;
  const defaultContent = [];
  
  // Clone the body and remove template elements
  const bodyClone = body.cloneNode(true);
  const templates = bodyClone.querySelectorAll('template[data-slot]');
  templates.forEach(template => template.remove());
  
  // Also remove the data-layout attribute from the root element
  const rootElement = bodyClone.querySelector('[data-layout]');
  if (rootElement) {
    rootElement.removeAttribute('data-layout');
  }
  
  slots['default'] = bodyClone.innerHTML;
  
  return slots;
}

/**
 * Apply slot content to layout using string replacement
 */
function applySlots(layoutContent, slotData) {
  let result = layoutContent;
  
  // Replace named slots
  for (const [slotName, content] of Object.entries(slotData)) {
    if (slotName === 'default') continue;
    
    const slotRegex = new RegExp(`<slot\\s+name=["']${slotName}["'][^>]*>.*?</slot>`, 'gi');
    const simpleSlotRegex = new RegExp(`<slot\\s+name=["']${slotName}["'][^>]*\\s*/?>`, 'gi');
    
    result = result.replace(slotRegex, content);
    result = result.replace(simpleSlotRegex, content);
  }
  
  // Replace default slot
  const defaultSlotRegex = /<slot(?:\s+[^>]*)?>(.*?)<\/slot>/gi;
  const defaultSlotSelfClosing = /<slot(?:\s+[^>]*)?\/>/gi;
  
  result = result.replace(defaultSlotRegex, slotData.default || '$1');
  result = result.replace(defaultSlotSelfClosing, slotData.default || '');
  
  return result;
}

/**
 * Process includes in HTML content
 */
async function processIncludesInHTML(htmlContent, sourceRoot, config) {
  const includeRegex = /<include\s+([^>]+)\/?\s*>/gi;
  let result = htmlContent;
  const allStyles = [];
  const allScripts = [];
  
  const matches = [...htmlContent.matchAll(includeRegex)];
  
  for (const match of matches) {
    try {
      const includeTag = match[0];
      const attributes = match[1];
      
      // Parse attributes
      const srcMatch = attributes.match(/src=["']([^"']+)["']/);
      if (!srcMatch) continue;
      
      const src = srcMatch[1];
      const dataAttrs = {};
      
      // Extract data attributes
      const dataMatches = attributes.matchAll(/data-(\w+)=["']([^"']+)["']/g);
      for (const dataMatch of dataMatches) {
        dataAttrs[dataMatch[1]] = dataMatch[2];
      }
      
      // Load and process component
      const componentResult = await loadAndProcessComponent(src, dataAttrs, sourceRoot, config);
      
      // Collect styles and scripts
      allStyles.push(...componentResult.styles);
      allScripts.push(...componentResult.scripts);
      
      // Replace include tag with component content
      result = result.replace(includeTag, componentResult.content);
      
    } catch (error) {
      logger.error(`Failed to process include: ${error.message}`);
      result = result.replace(match[0], `<!-- Error: ${error.message} -->`);
    }
  }
  
  // Clean up any remaining artifacts
  result = cleanupDOMOutput(result);
  
  // Move styles to head and scripts to end of body
  if (allStyles.length > 0) {
    const headEndRegex = /<\/head>/i;
    const dedupedStyles = [...new Set(allStyles)]; // Remove duplicates
    const stylesHTML = dedupedStyles.join('\n');
    result = result.replace(headEndRegex, `${stylesHTML}\n</head>`);
  }
  
  if (allScripts.length > 0) {
    const bodyEndRegex = /<\/body>/i;
    const dedupedScripts = [...new Set(allScripts)]; // Remove duplicates  
    const scriptsHTML = dedupedScripts.join('\n');
    result = result.replace(bodyEndRegex, `${scriptsHTML}\n</body>`);
  }
  
  return result;
}

/**
 * Load and process a component
 */
async function loadAndProcessComponent(src, dataAttrs, sourceRoot, config) {
  // Resolve component path
  let componentPath = src;
  let actualSourceRoot = sourceRoot;
  
  if (componentPath.startsWith('/')) {
    actualSourceRoot = await findActualSourceRoot(sourceRoot, componentPath.substring(1));
    componentPath = path.join(actualSourceRoot, componentPath.substring(1));
  } else {
    actualSourceRoot = await findActualSourceRoot(sourceRoot, path.join(config.componentsDir, componentPath));
    componentPath = path.join(actualSourceRoot, config.componentsDir, componentPath);
  }
  
  if (!isPathWithinDirectory(componentPath, actualSourceRoot)) {
    throw new Error(`Component path outside source directory: ${src}`);
  }
  
  // Load component
  const componentContent = await fs.readFile(componentPath, 'utf-8');
  
  // Process token replacement
  let processedContent = componentContent;
  for (const [token, value] of Object.entries(dataAttrs)) {
    // Replace the actual content of elements with data-token
    // Use a more flexible regex that handles multiline content
    const elementRegex = new RegExp(`(<[^>]+data-token=["']${token}["'][^>]*>)(.*?)(</[^>]+>)`, 'gs');
    const beforeReplace = processedContent;
    processedContent = processedContent.replace(elementRegex, `$1${value}$3`);
    
    if (beforeReplace !== processedContent) {
      logger.debug(`Token replacement for ${token}: ${value} -> content replaced`);
    } else {
      logger.debug(`No token replacement for ${token} with value ${value}`);
    }
  }
  
  // Extract and remove styles and scripts
  const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const scriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  
  const styles = [...processedContent.matchAll(styleRegex)].map(match => match[0]);
  const scripts = [...processedContent.matchAll(scriptRegex)].map(match => match[0]);
  
  // Remove styles and scripts from component content
  processedContent = processedContent.replace(styleRegex, '');
  processedContent = processedContent.replace(scriptRegex, '');
  
  return {
    content: processedContent,
    styles,
    scripts
  };
}

/**
 * Find actual source root by looking for files
 */
async function findActualSourceRoot(sourceRoot, relativePath) {
  const candidates = [
    sourceRoot,
    path.dirname(sourceRoot),
    path.dirname(path.dirname(sourceRoot))
  ];
  
  for (const candidate of candidates) {
    const testPath = path.join(candidate, relativePath);
    try {
      await fs.access(testPath);
      return candidate;
    } catch {}
  }
  
  return sourceRoot;
}

/**
 * Check if DOM mode should be used for a file
 */
export function shouldUseDOMMode(content) {
  return content.includes('<include ') || 
         content.includes('<slot') || 
         content.includes('data-slot=') ||
         content.includes('data-layout=') ||
         content.includes('data-token=');
}

/**
 * Get DOM mode configuration from CLI args or defaults
 */
export function getDOMConfig(args = {}) {
  return {
    layoutsDir: args.layoutsDir || 'layouts',
    componentsDir: args.componentsDir || 'components',
    defaultLayout: args.defaultLayout || 'default.html'
  };
}

/**
 * Clean up DOM output by removing stray tags and artifacts
 */
function cleanupDOMOutput(html) {
  let result = html;
  
  // Remove stray closing include tags
  result = result.replace(/<\/include>/gi, '');
  
  // Remove stray closing slot tags
  result = result.replace(/<\/slot>/gi, '');
  
  // Remove any remaining self-closing include tags that weren't processed
  result = result.replace(/<include[^>]*\/>/gi, '');
  
  // Remove any remaining opening include tags that weren't processed
  result = result.replace(/<include[^>]*>/gi, '');
  
  // Clean up multiple consecutive empty lines
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return result;
}