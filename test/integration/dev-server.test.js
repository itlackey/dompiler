/**
 * Integration tests for development server
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { serve } from '../../src/server/dev-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFixturesDir = path.join(__dirname, '../fixtures/dev-server');

describe('dev-server integration', () => {
  let sourceDir;
  let outputDir;
  let server;
  let testPort = 3002;
  
  beforeEach(async () => {
    // Create test directories
    sourceDir = path.join(testFixturesDir, 'src');
    outputDir = path.join(testFixturesDir, 'dist');
    
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(path.join(sourceDir, 'includes'), { recursive: true });
    
    // Create simple test files
    await fs.writeFile(
      path.join(sourceDir, 'includes', 'head.html'),
      '<meta charset="UTF-8">'
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'includes', 'header.html'),
      '<header><h1>Dev Server Test</h1></header>'
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'index.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>Dev Server Test</title>
</head>
<body>
  <!--#include virtual="/includes/header.html" -->
  <main><p>Hello from dev server!</p></main>
</body>
</html>`
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'test.txt'),
      'Plain text file for testing'
    );
  });
  
  afterEach(async () => {
    // Stop server
    if (server && server.shutdown) {
      await server.shutdown();
    }
    
    // Clean up test fixtures
    try {
      await fs.rm(testFixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should start server and serve static files', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort,
      host: 'localhost'
    });
    
    // Test HTML file serving
    const htmlResponse = await makeRequest(`http://localhost:${testPort}/index.html`);
    assert.strictEqual(htmlResponse.statusCode, 200);
    assert(htmlResponse.headers['content-type'].includes('text/html'));
    
    // Should include processed content
    assert(htmlResponse.body.includes('<header><h1>Dev Server Test</h1></header>'));
    assert(htmlResponse.body.includes('<meta charset="UTF-8">'));
    
    // Should include live reload script
    assert(htmlResponse.body.includes('__events'));
    assert(htmlResponse.body.includes('location.reload'));
  });
  
  it('should serve root path as index.html', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.body.includes('<title>Dev Server Test</title>'));
  });
  
  it('should serve static assets without live reload script', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/test.txt`);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.body, 'Plain text file for testing');
    assert(!response.body.includes('__events'));
  });
  
  it('should handle 404 errors gracefully', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/nonexistent.html`);
    assert.strictEqual(response.statusCode, 404);
    assert(response.body.includes('404 Not Found'));
    assert(response.body.includes('nonexistent.html'));
  });
  
  it('should serve Server-Sent Events endpoint', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/__events`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.headers['content-type'].includes('text/event-stream'));
    assert(response.headers['cache-control'].includes('no-cache'));
  });
  
  it('should set proper MIME types', async () => {
    // Add CSS file for MIME type testing
    await fs.mkdir(path.join(sourceDir, 'css'), { recursive: true });
    await fs.writeFile(
      path.join(sourceDir, 'css', 'style.css'),
      'body { margin: 0; }'
    );
    
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    // Wait for build to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const cssResponse = await makeRequest(`http://localhost:${testPort}/css/style.css`);
    assert.strictEqual(cssResponse.statusCode, 200);
    assert(cssResponse.headers['content-type'].includes('text/css'));
    
    const htmlResponse = await makeRequest(`http://localhost:${testPort}/index.html`);
    assert(htmlResponse.headers['content-type'].includes('text/html'));
    
    const txtResponse = await makeRequest(`http://localhost:${testPort}/test.txt`);
    assert(txtResponse.headers['content-type'].includes('text/plain'));
  });
  
  it('should prevent path traversal attacks', async () => {
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/../../../etc/passwd`);
    assert.strictEqual(response.statusCode, 403);
  });
  
  it('should handle initial build errors gracefully', async () => {
    // Create source with invalid include
    await fs.writeFile(
      path.join(sourceDir, 'broken.html'),
      '<!--#include file="missing.html" -->'
    );
    
    // Server should still start despite build errors
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    const response = await makeRequest(`http://localhost:${testPort}/broken.html`);
    assert.strictEqual(response.statusCode, 200);
    assert(response.body.includes('<!-- ERROR:'));
  });
  
  it('should reject requests when port is in use', async () => {
    // Start first server
    server = await serve({
      source: sourceDir,
      output: outputDir,
      port: testPort
    });
    
    // Try to start second server on same port
    await assert.rejects(async () => {
      await serve({
        source: sourceDir,
        output: outputDir,
        port: testPort
      });
    }, /Port.*already in use/);
  });
});

/**
 * Helper function to make HTTP requests
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout to prevent hanging tests
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}