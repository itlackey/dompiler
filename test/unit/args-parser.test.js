/**
 * Tests for CLI argument parser
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseArgs } from '../../src/cli/args-parser.js';

describe('parseArgs', () => {
  it('should parse build command', () => {
    const args = parseArgs(['build']);
    assert.strictEqual(args.command, 'build');
  });
  
  it('should parse serve command', () => {
    const args = parseArgs(['serve']);
    assert.strictEqual(args.command, 'serve');
  });
  
  it('should handle help flag', () => {
    const args = parseArgs(['--help']);
    assert.strictEqual(args.help, true);
  });
  
  it('should handle version flag', () => {
    const args = parseArgs(['--version']);
    assert.strictEqual(args.version, true);
  });
  
  it('should parse source option', () => {
    const args = parseArgs(['build', '--source', 'my-src']);
    assert.strictEqual(args.source, 'my-src');
  });
  
  it('should parse output option', () => {
    const args = parseArgs(['build', '--output', 'my-dist']);
    assert.strictEqual(args.output, 'my-dist');
  });
  
  it('should parse port option', () => {
    const args = parseArgs(['serve', '--port', '8080']);
    assert.strictEqual(args.port, 8080);
  });
  
  it('should use default values', () => {
    const args = parseArgs(['build']);
    assert.strictEqual(args.source, 'src');
    assert.strictEqual(args.output, 'dist');
    assert.strictEqual(args.port, 3000);
  });
  
  it('should throw error for invalid port', () => {
    assert.throws(() => {
      parseArgs(['serve', '--port', 'invalid']);
    }, /Invalid port number/);
  });
  
  it('should throw error for unknown option', () => {
    assert.throws(() => {
      parseArgs(['build', '--unknown']);
    }, /Unknown option/);
  });
});