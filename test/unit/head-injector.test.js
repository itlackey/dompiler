/**
 * Tests for head injector
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { injectHeadContent, hasHeadSection, extractHeadContent, validateHeadSnippet } from '../../src/core/head-injector.js';

describe('head-injector', () => {
  describe('injectHeadContent', () => {
    it('should inject content after opening head tag', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const snippet = '<meta charset="UTF-8">';
      
      const result = injectHeadContent(html, snippet);
      
      assert(result.includes('<head>\n  <meta charset="UTF-8">\n<title>Test</title>'));
    });
    
    it('should handle head with attributes', () => {
      const html = '<html><head lang="en"><title>Test</title></head><body></body></html>';
      const snippet = '<meta charset="UTF-8">';
      
      const result = injectHeadContent(html, snippet);
      
      assert(result.includes('<head lang="en">\n  <meta charset="UTF-8">\n<title>Test</title>'));
    });
    
    it('should return original HTML if no head tag', () => {
      const html = '<html><body></body></html>';
      const snippet = '<meta charset="UTF-8">';
      
      const result = injectHeadContent(html, snippet);
      
      assert.strictEqual(result, html);
    });
    
    it('should return original HTML if no snippet', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const snippet = null;
      
      const result = injectHeadContent(html, snippet);
      
      assert.strictEqual(result, html);
    });
    
    it('should handle empty snippet', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const snippet = '';
      
      const result = injectHeadContent(html, snippet);
      
      assert.strictEqual(result, html);
    });
  });
  
  describe('hasHeadSection', () => {
    it('should detect head section', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      assert.strictEqual(hasHeadSection(html), true);
    });
    
    it('should detect head section with attributes', () => {
      const html = '<html><head lang="en"><title>Test</title></head><body></body></html>';
      assert.strictEqual(hasHeadSection(html), true);
    });
    
    it('should not detect missing head section', () => {
      const html = '<html><body></body></html>';
      assert.strictEqual(hasHeadSection(html), false);
    });
  });
  
  describe('extractHeadContent', () => {
    it('should extract head content', () => {
      const html = '<html><head><title>Test</title><meta charset="UTF-8"></head><body></body></html>';
      const content = extractHeadContent(html);
      
      assert.strictEqual(content, '<title>Test</title><meta charset="UTF-8">');
    });
    
    it('should return null if no head section', () => {
      const html = '<html><body></body></html>';
      const content = extractHeadContent(html);
      
      assert.strictEqual(content, null);
    });
    
    it('should handle empty head', () => {
      const html = '<html><head></head><body></body></html>';
      const content = extractHeadContent(html);
      
      assert.strictEqual(content, '');
    });
  });
  
  describe('validateHeadSnippet', () => {
    it('should validate normal snippet', () => {
      const snippet = '<meta charset="UTF-8"><link rel="stylesheet" href="style.css">';
      const result = validateHeadSnippet(snippet);
      
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.warnings.length, 0);
      assert.strictEqual(result.hasMeta, true);
      assert.strictEqual(result.hasLink, true);
    });
    
    it('should warn about nested head tags', () => {
      const snippet = '<head><meta charset="UTF-8"></head>';
      const result = validateHeadSnippet(snippet);
      
      assert.strictEqual(result.valid, true);
      assert(result.warnings.some(w => w.includes('<head>')));
    });
    
    it('should warn about body tags', () => {
      const snippet = '<body><script></script></body>';
      const result = validateHeadSnippet(snippet);
      
      assert.strictEqual(result.valid, true);
      assert(result.warnings.some(w => w.includes('<body>')));
    });
    
    it('should warn about title tags', () => {
      const snippet = '<title>Global Title</title>';
      const result = validateHeadSnippet(snippet);
      
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.hasTitle, true);
      assert(result.warnings.some(w => w.includes('<title>')));
    });
    
    it('should handle empty snippet', () => {
      const result = validateHeadSnippet('');
      
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.warnings.length, 0);
    });
  });
});