import { describe, it, expect } from 'vitest';
import { Normalizer } from '../../../src/core/normalization/Normalizer.js';

describe('Normalizer', () => {
  describe('url()', () => {
    it('removes trailing slashes', () => {
      expect(Normalizer.url('https://example.com/')).toBe('example.com/');
    });

    it('strips https:// and www.', () => {
      expect(Normalizer.url('https://www.example.com/path')).toBe('example.com/path');
      expect(Normalizer.url('http://www.example.com/path')).toBe('example.com/path');
    });

    it('converts to lowercase', () => {
      expect(Normalizer.url('HTTPS://EXamPle.COM/PAth')).toBe('example.com/path');
    });

    it('removes common tracking parameters', () => {
      expect(Normalizer.url('https://example.com/?utm_source=google&fbclid=123&keep=this'))
        .toBe('example.com/?keep=this');
    });

    it('handles malformed URLs gracefully', () => {
      expect(Normalizer.url('not-a-valid-url')).toBe('not-a-valid-url');
    });
  });

  describe('name()', () => {
    it('removes accents and converts to lowercase', () => {
      expect(Normalizer.name('João da Silva')).toBe('joao da silva');
      expect(Normalizer.name('ÁÉÍÓÚ âêîôû')).toBe('aeiou aeiou');
    });

    it('collapses multiple spaces', () => {
      expect(Normalizer.name('  Maria   de  Lourdes  ')).toBe('maria de lourdes');
    });
  });

  describe('nameVariants()', () => {
    it('generates useful name forms and keeps explicit aliases', () => {
      expect(Normalizer.nameVariants('João da Silva', ['Joca'])).toEqual([
        'joao da silva',
        'silva da joao',
        'jds',
        'joaodasilva',
        'joca',
      ]);
    });
  });

  describe('username()', () => {
    it('removes leading @', () => {
      expect(Normalizer.username('@username')).toBe('username');
      expect(Normalizer.username('username')).toBe('username');
    });

    it('converts to lowercase and trims', () => {
      expect(Normalizer.username(' @User_Name  ')).toBe('user_name');
    });
  });

  describe('email()', () => {
    it('converts to lowercase and trims', () => {
      expect(Normalizer.email(' Test@Example.COM  ')).toBe('test@example.com');
    });
  });

  describe('domain()', () => {
    it('extracts domain from raw string', () => {
      expect(Normalizer.domain('example.com')).toBe('example.com');
      expect(Normalizer.domain('www.example.com')).toBe('example.com');
      expect(Normalizer.domain('https://www.example.com/path')).toBe('example.com');
    });
  });
});
