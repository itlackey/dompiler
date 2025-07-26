/**
 * Development Server for vanilla-wafer
 * HTTP server with live reload capabilities
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { build, getMimeType } from '../core/file-processor.js';
import { DependencyTracker } from '../core/dependency-tracker.js';
import { FileWatcher } from './file-watcher.js';
import { 
  handleSSEConnection, 
  injectReloadScript, 
  isSSEEndpoint,
  getConnectedClientCount,
  closeAllConnections 
} from './live-reload.js';
import { isHtmlFile, getOutputPath } from '../utils/path-resolver.js';
import { logger } from '../utils/logger.js';
import { ServerError } from '../utils/errors.js';

/**
 * Development server configuration
 */
const DEFAULT_SERVER_OPTIONS = {
  source: 'src',
  output: 'dist',
  includes: 'includes', 
  head: null,
  port: 3000,
  host: 'localhost'
};

/**
 * Start development server
 * @param {Object} options - Server options
 * @returns {Promise<Object>} Server instance
 */
export async function serve(options = {}) {
  const config = { ...DEFAULT_SERVER_OPTIONS, ...options };
  
  try {
    // Resolve paths
    const sourceRoot = path.resolve(config.source);
    const outputRoot = path.resolve(config.output);
    
    // Validate source directory
    try {
      await fs.access(sourceRoot);
    } catch (error) {
      throw new ServerError(`Source directory not found: ${sourceRoot}`);
    }
    
    // Initial build
    logger.info('Performing initial build...');
    const buildResult = await build({
      source: sourceRoot,
      output: outputRoot,
      includes: config.includes,
      head: config.head
    });
    
    // Set up file watcher
    const fileWatcher = new FileWatcher(sourceRoot, outputRoot, config.includes);
    fileWatcher.setDependencyTracker(buildResult.dependencyTracker);
    
    // Set up rebuilder function for selective rebuilds
    fileWatcher.setRebuilder(async (changedFilePath) => {
      if (changedFilePath) {
        // Rebuild specific file
        await rebuildSingleFile(changedFilePath, sourceRoot, outputRoot, config);
      } else {
        // Full rebuild
        await build({
          source: sourceRoot,
          output: outputRoot,
          includes: config.includes,
          head: config.head
        });
      }
    });
    
    // Start file watching
    fileWatcher.start();
    
    // Create HTTP server
    const server = http.createServer(async (req, res) => {
      try {
        await handleRequest(req, res, outputRoot);
      } catch (error) {
        logger.error('Request error:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
    
    // Start server
    await new Promise((resolve, reject) => {
      server.listen(config.port, config.host, () => {
        const serverUrl = `http://${config.host}:${config.port}`;
        logger.success(`Development server running at ${serverUrl}`);
        logger.info('Press Ctrl+C to stop');
        resolve();
      });
      
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new ServerError(`Port ${config.port} is already in use`, config.port));
        } else {
          reject(new ServerError(`Failed to start server: ${error.message}`, config.port));
        }
      });
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down development server...');
      
      closeAllConnections();
      await fileWatcher.stop();
      
      server.close(() => {
        logger.success('Development server stopped');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    return {
      server,
      fileWatcher,
      config,
      shutdown
    };
    
  } catch (error) {
    logger.error('Failed to start development server:', error.message);
    throw error;
  }
}

/**
 * Handle HTTP requests
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 * @param {string} outputRoot - Output directory root
 */
async function handleRequest(req, res, outputRoot) {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Handle Server-Sent Events endpoint
  if (isSSEEndpoint(pathname)) {
    handleSSEConnection(req, res);
    return;
  }
  
  // Resolve file path
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(outputRoot, filePath);
  
  // Security check - ensure path is within output directory
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(outputRoot);
  
  if (!resolvedPath.startsWith(resolvedRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  try {
    // Check if file exists
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = path.join(resolvedPath, 'index.html');
      try {
        await fs.access(indexPath);
        await serveFile(indexPath, res, true);
      } catch (error) {
        await serveDirectoryListing(resolvedPath, pathname, res);
      }
    } else {
      // Serve file
      const isHtml = isHtmlFile(resolvedPath);
      await serveFile(resolvedPath, res, isHtml);
    }
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body>
          <h1>404 Not Found</h1>
          <p>The requested file <code>${pathname}</code> was not found.</p>
          <p><a href="/">← Back to home</a></p>
        </body>
        </html>
      `);
    } else {
      throw error;
    }
  }
}

/**
 * Serve a file
 * @param {string} filePath - File to serve
 * @param {ServerResponse} res - HTTP response
 * @param {boolean} injectReload - Whether to inject reload script
 */
async function serveFile(filePath, res, injectReload = false) {
  const mimeType = getMimeType(filePath);
  let content = await fs.readFile(filePath);
  
  // Inject live reload script for HTML files
  if (injectReload && mimeType.includes('text/html')) {
    const htmlContent = content.toString('utf-8');
    const injectedContent = injectReloadScript(htmlContent);
    content = Buffer.from(injectedContent, 'utf-8');
  }
  
  res.writeHead(200, { 
    'Content-Type': mimeType,
    'Content-Length': content.length
  });
  res.end(content);
}

/**
 * Serve directory listing
 * @param {string} dirPath - Directory path
 * @param {string} urlPath - URL path
 * @param {ServerResponse} res - HTTP response
 */
async function serveDirectoryListing(dirPath, urlPath, res) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Directory: ${urlPath}</title>
      <style>
        body { font-family: monospace; margin: 2rem; }
        .dir { color: #0066cc; }
        .file { color: #333; }
        a { text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Directory: ${urlPath}</h1>
      <ul>
        ${urlPath !== '/' ? '<li><a href="../" class="dir">../</a></li>' : ''}
        ${entries
          .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) {
              return a.isDirectory() ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          })
          .map(entry => {
            const href = path.join(urlPath, entry.name);
            const className = entry.isDirectory() ? 'dir' : 'file';
            const suffix = entry.isDirectory() ? '/' : '';
            return `<li><a href="${href}" class="${className}">${entry.name}${suffix}</a></li>`;
          })
          .join('')}
      </ul>
      <hr>
      <p><small>Vanilla Wafer Development Server</small></p>
    </body>
    </html>
  `;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

/**
 * Rebuild a single file (for file watcher)
 * @param {string} filePath - File to rebuild
 * @param {string} sourceRoot - Source root
 * @param {string} outputRoot - Output root
 * @param {Object} config - Server config
 */
async function rebuildSingleFile(filePath, sourceRoot, outputRoot, config) {
  if (isHtmlFile(filePath)) {
    // Use the build system to process just this file
    const { processIncludes } = await import('../core/include-processor.js');
    const { getHeadSnippet, injectHeadContent } = await import('../core/head-injector.js');
    
    const htmlContent = await fs.readFile(filePath, 'utf-8');
    const processedContent = await processIncludes(htmlContent, filePath, sourceRoot);
    
    const headSnippet = await getHeadSnippet(sourceRoot, config.includes, config.head);
    const finalContent = headSnippet ? 
      injectHeadContent(processedContent, headSnippet) : 
      processedContent;
    
    const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, finalContent, 'utf-8');
  } else {
    // Copy asset file
    const outputPath = getOutputPath(filePath, sourceRoot, outputRoot);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(filePath, outputPath);
  }
}