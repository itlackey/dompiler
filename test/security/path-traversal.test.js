/**
 * Security tests for path traversal prevention
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveIncludePath, isPathWithinDirectory } from '../../src/utils/path-resolver.js';
import { PathTraversalError } from '../../src/utils/errors.js';

describe('path-traversal security', () => {
  const sourceRoot = '/safe/source';
  const currentFile = '/safe/source/index.html';
  
  describe('resolveIncludePath', () => {
    it('should prevent file include path traversal with ../', () => {
      assert.throws(() => {
        resolveIncludePath('file', '../../../etc/passwd', currentFile, sourceRoot);
      }, PathTraversalError);
    });
    
    it('should prevent virtual include path traversal with ../', () => {
      assert.throws(() => {
        resolveIncludePath('virtual', '/../../../etc/passwd', currentFile, sourceRoot);
      }, PathTraversalError);
    });
    
    it('should prevent Windows-style path traversal', () => {
      // On Unix systems, backslashes are treated as literal characters, not path separators
      // But we should still prevent obvious traversal attempts
      const result = resolveIncludePath('file', '..\\..\\..\\windows\\system32\\config', currentFile, sourceRoot);
      // This should resolve to a safe path within source root
      assert(result.startsWith(sourceRoot));
    });
    
    it('should prevent encoded path traversal attempts', () => {
      // URL encoding should be treated as literal characters, not decoded
      const result = resolveIncludePath('file', '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', currentFile, sourceRoot);
      // This should resolve to a safe path within source root
      assert(result.startsWith(sourceRoot));
    });
    
    it('should allow safe relative paths', () => {
      const result = resolveIncludePath('file', 'safe/header.html', currentFile, sourceRoot);
      assert(result.includes('safe/header.html'));
      assert(result.startsWith(sourceRoot));
    });
    
    it('should allow safe virtual paths', () => {
      const result = resolveIncludePath('virtual', '/includes/header.html', currentFile, sourceRoot);
      assert(result.includes('includes/header.html'));
      assert(result.startsWith(sourceRoot));
    });
  });
  
  describe('isPathWithinDirectory', () => {
    it('should return true for paths within directory', () => {
      assert.strictEqual(isPathWithinDirectory('/safe/source/file.html', '/safe/source'), true);
      assert.strictEqual(isPathWithinDirectory('/safe/source/sub/file.html', '/safe/source'), true);
    });
    
    it('should return false for paths outside directory', () => {
      assert.strictEqual(isPathWithinDirectory('/etc/passwd', '/safe/source'), false);
      assert.strictEqual(isPathWithinDirectory('/safe/other/file.html', '/safe/source'), false);
    });
    
    it('should return true for exact directory match', () => {
      assert.strictEqual(isPathWithinDirectory('/safe/source', '/safe/source'), true);
    });
    
    it('should handle relative paths correctly', () => {
      const result = isPathWithinDirectory('./src/file.html', './src');
      assert.strictEqual(result, true);
    });
    
    it('should prevent path traversal in directory check', () => {
      assert.strictEqual(isPathWithinDirectory('/safe/source/../../../etc/passwd', '/safe/source'), false);
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty paths', () => {
      assert.throws(() => {
        resolveIncludePath('file', '', currentFile, sourceRoot);
      });
    });
    
    it('should handle null/undefined paths', () => {
      assert.throws(() => {
        resolveIncludePath('file', null, currentFile, sourceRoot);
      });
    });
    
    it('should handle paths with multiple slashes', () => {
      const result = resolveIncludePath('virtual', '//includes///header.html', currentFile, sourceRoot);
      assert(result.startsWith(sourceRoot));
      assert(result.includes('includes/header.html')); // Should normalize to single slashes
    });
    
    it('should handle Windows and Unix path separators', () => {
      // This should work on both systems
      const result = resolveIncludePath('file', 'includes/header.html', currentFile, sourceRoot);
      assert(result.includes('header.html'));
    });
  });
  
  describe('include type validation', () => {
    it('should reject invalid include types', () => {
      assert.throws(() => {
        resolveIncludePath('invalid', 'header.html', currentFile, sourceRoot);
      }, /Invalid include type/);
    });
    
    it('should only accept file and virtual types', () => {
      // These should work
      const fileResult = resolveIncludePath('file', 'header.html', currentFile, sourceRoot);
      const virtualResult = resolveIncludePath('virtual', '/header.html', currentFile, sourceRoot);
      
      assert(fileResult.includes('header.html'));
      assert(virtualResult.includes('header.html'));
    });
  });
});