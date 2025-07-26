/**
 * Live Reload System for vanilla-wafer
 * Server-Sent Events implementation for browser refresh
 */

import { logger } from '../utils/logger.js';

// Track connected SSE clients
const connectedClients = new Set();

/**
 * Handle Server-Sent Events connection
 * @param {IncomingMessage} req - HTTP request
 * @param {ServerResponse} res - HTTP response
 */
export function handleSSEConnection(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send initial connection message
  res.write('data: connected\n\n');
  
  // Add to connected clients
  connectedClients.add(res);
  logger.debug('SSE client connected');
  
  // Handle client disconnect
  req.on('close', () => {
    connectedClients.delete(res);
    logger.debug('SSE client disconnected');
  });
  
  req.on('error', () => {
    connectedClients.delete(res);
    logger.debug('SSE client error');
  });
}

/**
 * Broadcast reload message to all connected clients
 * @param {string} reason - Reason for reload (optional)
 */
export function broadcastReload(reason = 'file changed') {
  if (connectedClients.size === 0) {
    return;
  }
  
  const message = `data: reload:${reason}\n\n`;
  
  // Send to all connected clients
  for (const client of connectedClients) {
    try {
      client.write(message);
    } catch (error) {
      // Remove dead connections
      connectedClients.delete(client);
      logger.debug('Removed dead SSE connection');
    }
  }
  
  logger.debug(`Broadcast reload to ${connectedClients.size} clients: ${reason}`);
}

/**
 * Get count of connected clients
 * @returns {number} Number of connected clients
 */
export function getConnectedClientCount() {
  return connectedClients.size;
}

/**
 * Inject live reload script into HTML content
 * @param {string} htmlContent - HTML content
 * @returns {string} HTML with injected script
 */
export function injectReloadScript(htmlContent) {
  const reloadScript = `
  <script>
    (function() {
      console.log('🍪 Vanilla Wafer live reload connected');
      const eventSource = new EventSource('/__events');
      
      eventSource.onmessage = function(event) {
        if (event.data.startsWith('reload:')) {
          const reason = event.data.substring(7);
          console.log('🔄 Reloading page:', reason);
          location.reload();
        }
      };
      
      eventSource.onerror = function() {
        console.log('❌ Vanilla Wafer live reload disconnected');
      };
    })();
  </script>`;
  
  // Try to inject before closing </body> tag
  const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    return htmlContent.slice(0, bodyCloseIndex) + reloadScript + htmlContent.slice(bodyCloseIndex);
  }
  
  // If no </body>, inject before closing </html>  
  const htmlCloseIndex = htmlContent.lastIndexOf('</html>');
  if (htmlCloseIndex !== -1) {
    return htmlContent.slice(0, htmlCloseIndex) + reloadScript + htmlContent.slice(htmlCloseIndex);
  }
  
  // If no closing tags, append to end
  return htmlContent + reloadScript;
}

/**
 * Check if URL is the SSE endpoint
 * @param {string} url - Request URL
 * @returns {boolean} True if SSE endpoint
 */
export function isSSEEndpoint(url) {
  return url === '/__events' || url === '/__events/';
}

/**
 * Close all SSE connections
 */
export function closeAllConnections() {
  for (const client of connectedClients) {
    try {
      client.end();
    } catch (error) {
      // Ignore errors when closing
    }
  }
  connectedClients.clear();
  logger.debug('Closed all SSE connections');
}