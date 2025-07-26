/**
 * Head Injection System for vanilla-wafer
 * Automatically injects common head content into HTML pages
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { FileSystemError } from '../utils/errors.js';

/**
 * Inject head content into HTML
 * @param {string} htmlContent - HTML content to process
 * @param {string} headSnippet - Content to inject into head
 * @returns {string} HTML with injected head content
 */
export function injectHeadContent(htmlContent, headSnippet) {
  if (!headSnippet || headSnippet.trim() === '') {
    return htmlContent;
  }
  
  // Find the opening <head> tag
  const headOpenMatch = htmlContent.match(/<head[^>]*>/i);
  
  if (!headOpenMatch) {
    logger.warn('No <head> tag found, skipping head injection');
    return htmlContent;
  }
  
  const headOpenIndex = headOpenMatch.index + headOpenMatch[0].length;
  
  // Inject content right after opening <head> tag
  const beforeHead = htmlContent.slice(0, headOpenIndex);
  const afterHead = htmlContent.slice(headOpenIndex);
  
  // Add some formatting for readability
  const formattedSnippet = `\n  ${headSnippet.trim()}\n`;
  
  return beforeHead + formattedSnippet + afterHead;
}

/**
 * Load head snippet from file
 * @param {string} headFilePath - Path to head snippet file
 * @returns {Promise<string|null>} Head snippet content or null if not found
 */
export async function loadHeadSnippet(headFilePath) {
  if (!headFilePath) {
    return null;
  }
  
  try {
    const content = await fs.readFile(headFilePath, 'utf-8');
    logger.debug(`Loaded head snippet from: ${headFilePath}`);
    return content.trim();
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn(`Head snippet file not found: ${headFilePath}`);
      return null;
    }
    throw new FileSystemError('read', headFilePath, error);
  }
}

/**
 * Find head snippet file using conventions
 * @param {string} sourceRoot - Source root directory
 * @param {string} includesDir - Includes directory name
 * @returns {Promise<string|null>} Path to head snippet file or null
 */
export async function findHeadSnippetFile(sourceRoot, includesDir = 'includes') {
  const possiblePaths = [
    // In includes directory
    path.join(sourceRoot, includesDir, 'head.html'),
    path.join(sourceRoot, includesDir, '_head.html'),
    // In source root
    path.join(sourceRoot, 'head.html'),
    path.join(sourceRoot, '_head.html')
  ];
  
  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      logger.debug(`Found head snippet file: ${filePath}`);
      return filePath;
    } catch (error) {
      // File doesn't exist, try next one
      continue;
    }
  }
  
  logger.debug('No head snippet file found using conventions');
  return null;
}

/**
 * Get head snippet content (from file or custom path)
 * @param {string} sourceRoot - Source root directory
 * @param {string} includesDir - Includes directory name
 * @param {string|null} customHeadPath - Custom head file path from CLI
 * @returns {Promise<string|null>} Head snippet content or null
 */
export async function getHeadSnippet(sourceRoot, includesDir = 'includes', customHeadPath = null) {
  let headFilePath;
  
  if (customHeadPath) {
    // Use custom path if provided
    headFilePath = path.isAbsolute(customHeadPath) ? 
      customHeadPath : 
      path.resolve(sourceRoot, customHeadPath);
  } else {
    // Find using conventions
    headFilePath = await findHeadSnippetFile(sourceRoot, includesDir);
  }
  
  if (!headFilePath) {
    return null;
  }
  
  return await loadHeadSnippet(headFilePath);
}

/**
 * Check if HTML content has a valid <head> section
 * @param {string} htmlContent - HTML content to check
 * @returns {boolean} True if HTML has head section
 */
export function hasHeadSection(htmlContent) {
  return /<head[^>]*>/i.test(htmlContent);
}

/**
 * Extract existing head content for analysis
 * @param {string} htmlContent - HTML content
 * @returns {string|null} Existing head content or null
 */
export function extractHeadContent(htmlContent) {
  const headMatch = htmlContent.match(/<head[^>]*>(.*?)<\/head>/is);
  return headMatch ? headMatch[1].trim() : null;
}

/**
 * Validate head snippet content
 * @param {string} headSnippet - Head snippet to validate
 * @returns {Object} Validation result with warnings
 */
export function validateHeadSnippet(headSnippet) {
  const warnings = [];
  
  if (!headSnippet || headSnippet.trim() === '') {
    return { valid: true, warnings };
  }
  
  // Check for potentially problematic content
  if (headSnippet.includes('<head>') || headSnippet.includes('</head>')) {
    warnings.push('Head snippet contains <head> tags - these will be nested inside existing head');
  }
  
  if (headSnippet.includes('<body>') || headSnippet.includes('</body>')) {
    warnings.push('Head snippet contains <body> tags - this may cause invalid HTML');
  }
  
  if (headSnippet.includes('<html>') || headSnippet.includes('</html>')) {
    warnings.push('Head snippet contains <html> tags - this may cause invalid HTML');
  }
  
  // Check for common head elements
  const hasTitle = headSnippet.includes('<title>');
  const hasMeta = headSnippet.includes('<meta');
  const hasLink = headSnippet.includes('<link');
  const hasScript = headSnippet.includes('<script');
  
  if (hasTitle) {
    warnings.push('Head snippet contains <title> - this may conflict with page-specific titles');
  }
  
  return {
    valid: true,
    warnings,
    hasTitle,
    hasMeta,
    hasLink,
    hasScript
  };
}