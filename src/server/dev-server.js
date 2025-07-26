/**
 * Development server with live reload support
 * Serves static files and provides hot reload functionality
 */

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { parse as parseUrl } from 'url';
import { liveReload } from './live-reload.js';
import { logger } from '../utils/logger.js';
import { isPathWithinDirectory } from '../utils/path-resolver.js';

/**
 * MIME type mapping for common file extensions
 */
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

/**
 * Development server class
 */
export class DevServer {
  constructor(options = {}) {
    this.outputDir = resolve(options.output || 'dist');
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.server = null;
  }

  /**
   * Start the development server
   * @returns {Promise<void>}
   */
  async start() {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch(error => {
        logger.error('Server request error:', error.message);
        this.sendError(res, 500, 'Internal Server Error');
      });
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, (error) => {
        if (error) {
          reject(error);
        } else {
          logger.success(`🚀 Dev server running at http://${this.host}:${this.port}/`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the development server
   * @returns {Promise<void>}
   */
  async stop() {
    liveReload.close();
    
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('Dev server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTP requests
   * @param {IncomingMessage} req - HTTP request
   * @param {ServerResponse} res - HTTP response
   */
  async handleRequest(req, res) {
    const url = parseUrl(req.url, true);
    const pathname = url.pathname;

    // Handle live reload event stream
    if (pathname === '/__events') {
      this.handleLiveReloadEvents(req, res);
      return;
    }

    // Serve static files
    await this.serveStaticFile(pathname, res);
  }

  /**
   * Handle Server-Sent Events for live reload
   * @param {IncomingMessage} req - HTTP request
   * @param {ServerResponse} res - HTTP response
   */
  handleLiveReloadEvents(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write('data: {"type":"connected","timestamp":' + Date.now() + '}\n\n');

    // Add client to live reload system
    liveReload.addClient(res);
  }

  /**
   * Serve static files from output directory
   * @param {string} pathname - URL pathname
   * @param {ServerResponse} res - HTTP response
   */
  async serveStaticFile(pathname, res) {
    try {
      // Resolve file path
      let filePath = this.resolveFilePath(pathname);
      
      // Security check: ensure file is within output directory
      if (!isPathWithinDirectory(filePath, this.outputDir)) {
        this.sendError(res, 403, 'Forbidden');
        return;
      }

      // Check if file exists
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        // Try to serve index.html from directory
        const indexPath = join(filePath, 'index.html');
        try {
          await stat(indexPath);
          filePath = indexPath;
        } catch {
          this.sendDirectoryListing(res, filePath, pathname);
          return;
        }
      }

      // Read and serve file
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      // Inject live reload script for HTML files
      let finalContent = content;
      if (ext === '.html') {
        finalContent = Buffer.from(liveReload.injectScript(content.toString()));
      }

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': finalContent.length
      });
      res.end(finalContent);

    } catch (error) {
      if (error.code === 'ENOENT') {
        this.sendError(res, 404, 'File Not Found');
      } else {
        logger.error('Error serving file:', error.message);
        this.sendError(res, 500, 'Internal Server Error');
      }
    }
  }

  /**
   * Resolve URL pathname to file system path
   * @param {string} pathname - URL pathname
   * @returns {string} Resolved file path
   */
  resolveFilePath(pathname) {
    // Remove leading slash and decode URI
    const relativePath = decodeURIComponent(pathname.slice(1));
    
    // Default to index.html for root
    if (relativePath === '') {
      return join(this.outputDir, 'index.html');
    }
    
    return join(this.outputDir, relativePath);
  }

  /**
   * Send error response
   * @param {ServerResponse} res - HTTP response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   */
  sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
    res.end(message);
  }

  /**
   * Send directory listing (for debugging)
   * @param {ServerResponse} res - HTTP response
   * @param {string} dirPath - Directory path
   * @param {string} urlPath - URL path
   */
  async sendDirectoryListing(res, dirPath, urlPath) {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(dirPath);
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Directory: ${urlPath}</title>
  <style>
    body { font-family: monospace; margin: 40px; }
    h1 { color: #333; }
    a { display: block; padding: 4px 0; text-decoration: none; }
    a:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Directory: ${urlPath}</h1>
  ${urlPath !== '/' ? '<a href="../">📁 ../</a>' : ''}
  ${files.map(file => `<a href="${urlPath}${urlPath.endsWith('/') ? '' : '/'}${file}">📄 ${file}</a>`).join('\n')}
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(liveReload.injectScript(html));
    } catch (error) {
      this.sendError(res, 500, 'Error reading directory');
    }
  }
}