/**
 * Live reload functionality using Server-Sent Events
 * Provides real-time browser refresh on file changes
 */

import { logger } from '../utils/logger.js';

class LiveReloadServer {
  constructor() {
    this.clients = new Set();
    this.isEnabled = false;
  }

  /**
   * Enable live reload and inject script into HTML
   * @param {boolean} enabled - Whether live reload is enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Add SSE client connection
   * @param {Response} response - HTTP response object for SSE
   */
  addClient(response) {
    this.clients.add(response);
    logger.debug(`Live reload client connected. Total clients: ${this.clients.size}`);

    // Remove client when connection closes
    response.on('close', () => {
      this.clients.delete(response);
      logger.debug(`Live reload client disconnected. Total clients: ${this.clients.size}`);
    });
  }

  /**
   * Notify all connected clients to reload
   * @param {string} eventType - Type of change (added, changed, removed)
   * @param {string} filePath - Path of changed file
   */
  notifyReload(eventType, filePath) {
    if (!this.isEnabled || this.clients.size === 0) {
      return;
    }

    const message = {
      type: 'reload',
      eventType,
      filePath,
      timestamp: Date.now()
    };

    const sseData = `data: ${JSON.stringify(message)}\n\n`;

    this.clients.forEach(client => {
      try {
        client.write(sseData);
      } catch (error) {
        logger.debug('Error sending reload event to client:', error.message);
        this.clients.delete(client);
      }
    });

    logger.info(`📡 Live reload sent to ${this.clients.size} client(s): ${eventType} ${filePath}`);
  }

  /**
   * Inject live reload script into HTML content
   * @param {string} html - HTML content
   * @returns {string} HTML with live reload script injected
   */
  injectScript(html) {
    if (!this.isEnabled) {
      return html;
    }

    const script = `
<script>
(function() {
  const eventSource = new EventSource('/__events');
  
  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'reload') {
        console.log('🔄 Live reload: ' + data.eventType + ' ' + data.filePath);
        window.location.reload();
      }
    } catch (error) {
      console.error('Live reload error:', error);
    }
  };
  
  eventSource.onerror = function(error) {
    console.warn('Live reload connection lost. Retrying in 5 seconds...');
    eventSource.close();
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };
  
  console.log('🚀 Live reload connected');
})();
</script>`;

    // Inject before closing body tag, or before closing html tag if no body
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}\n</body>`);
    } else if (html.includes('</html>')) {
      return html.replace('</html>', `${script}\n</html>`);
    } else {
      return html + script;
    }
  }

  /**
   * Close all client connections
   */
  close() {
    this.clients.forEach(client => {
      try {
        client.end();
      } catch (error) {
        // Ignore errors when closing
      }
    });
    this.clients.clear();
    logger.debug('Live reload server closed');
  }
}

// Export singleton instance
export const liveReload = new LiveReloadServer();