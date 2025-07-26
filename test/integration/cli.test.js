/**
 * Integration tests for CLI functionality
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFixturesDir = path.join(__dirname, '../fixtures/cli');
const cliPath = path.resolve(__dirname, '../../bin/cli.js');

describe('CLI integration', () => {
  let sourceDir;
  let outputDir;
  
  beforeEach(async () => {
    // Create test directories
    sourceDir = path.join(testFixturesDir, 'src');
    outputDir = path.join(testFixturesDir, 'dist');
    
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(path.join(sourceDir, 'includes'), { recursive: true });
    
    // Create test files
    await fs.writeFile(
      path.join(sourceDir, 'includes', 'head.html'),
      '<meta charset="UTF-8">'
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'includes', 'header.html'),
      '<header><h1>CLI Test</h1></header>'
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'index.html'),
      `<!DOCTYPE html>
<html>
<head>
  <title>CLI Test</title>
  <link rel="stylesheet" href="main.css">
</head>
<body>
  <!--#include virtual="/includes/header.html" -->
  <main><p>Testing CLI</p></main>
</body>
</html>`
    );
    
    await fs.writeFile(
      path.join(sourceDir, 'main.css'),
      'body { margin: 0; }'
    );
  });
  
  afterEach(async () => {
    // Clean up test fixtures
    try {
      await fs.rm(testFixturesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  it('should show version with --version flag', async () => {
    const result = await runCLI(['--version']);
    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('dompile v0.4.0'));
  });
  
  it('should show help with --help flag', async () => {
    const result = await runCLI(['--help']);
    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('Usage: dompile'));
    assert(result.stdout.includes('Commands:'));
    assert(result.stdout.includes('build'));
    assert(result.stdout.includes('watch'));
  });
  
  it('should show help when no command provided', async () => {
    const result = await runCLI([]);
    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('Usage: dompile'));
  });
  
  it('should build site with build command', async () => {
    const result = await runCLI([
      'build',
      '--source', sourceDir,
      '--output', outputDir
    ]);
    
    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('Building static site'));
    assert(result.stdout.includes('Build completed successfully'));
    
    // Verify output files
    await fs.access(path.join(outputDir, 'index.html'));
    await fs.access(path.join(outputDir, 'main.css'));
    
    // Verify content processing
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    assert(indexContent.includes('<header><h1>CLI Test</h1></header>'));
    assert(indexContent.includes('<meta charset="UTF-8">'));
  });
  
  it('should handle build errors gracefully', async () => {
    const result = await runCLI([
      'build',
      '--source', '/nonexistent/directory',
      '--output', outputDir
    ]);
    
    assert.strictEqual(result.exitCode, 1);
    assert(result.stderr.includes('Source directory not found'));
  });
  
  it('should fail build when includes are missing', async () => {
    // Create a source file with missing include
    await fs.writeFile(
      path.join(sourceDir, 'broken.html'),
      '<!DOCTYPE html><html><body><!--#include file="missing.html" --></body></html>'
    );
    
    const result = await runCLI([
      'build',
      '--source', sourceDir,
      '--output', outputDir
    ]);
    
    assert.strictEqual(result.exitCode, 1);
    assert(result.stderr.includes('Build failed'));
    assert(result.stderr.includes('Include file not found'));
  });
  
  it('should validate CLI arguments', async () => {
    const result = await runCLI([
      'build',
      '--unknown-option'
    ]);
    
    assert.strictEqual(result.exitCode, 1);
    assert(result.stderr.includes('Unknown option'));
  });
  
  it('should handle unknown commands', async () => {
    const result = await runCLI(['unknown-command']);
    
    assert.strictEqual(result.exitCode, 1);
    assert(result.stderr.includes('Unknown command'));
  });
  
  it('should handle unknown options', async () => {
    const result = await runCLI([
      'build',
      '--unknown-option'
    ]);
    
    assert.strictEqual(result.exitCode, 1);
    assert(result.stderr.includes('Unknown option'));
  });
  
  it('should work with short option flags', async () => {
    const result = await runCLI([
      'build',
      '-s', sourceDir,
      '-o', outputDir
    ]);
    
    assert.strictEqual(result.exitCode, 0);
    assert(result.stdout.includes('Build completed successfully'));
    
    // Verify output
    await fs.access(path.join(outputDir, 'index.html'));
  });
  
  it('should work with custom head file', async () => {
    // Create custom head file
    const customHeadPath = path.join(sourceDir, 'custom-head.html');
    await fs.writeFile(customHeadPath, '<meta name="custom" content="test">');
    
    const result = await runCLI([
      'build',
      '--source', sourceDir,
      '--output', outputDir,
      '--head', customHeadPath
    ]);
    
    assert.strictEqual(result.exitCode, 0);
    
    const indexContent = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    assert(indexContent.includes('<meta name="custom" content="test">'));
  });
  
 
});

/**
 * Helper function to run CLI commands
 */
function runCLI(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      stdio: 'pipe',
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    let resolved = false;
    
    child.on('close', (exitCode) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          exitCode,
          stdout,
          stderr
        });
      }
    });
    
    child.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\nProcess error: ' + error.message
        });
      }
    });
    
    // Prevent hanging tests
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGTERM');
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr + '\nTest timeout'
        });
      }
    }, 10000);
  });
}