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
  
  it('should parse watch command', () => {
    const args = parseArgs(['watch']);
    assert.strictEqual(args.command, 'watch');
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
  
  it('should use default values', () => {
    const args = parseArgs(['build']);
    assert.strictEqual(args.source, 'src');
    assert.strictEqual(args.output, 'dist');
  });
  
  it('should throw error for unknown option', () => {
    assert.throws(() => {
      parseArgs(['build', '--unknown']);
    }, /Unknown option/);
  });
});