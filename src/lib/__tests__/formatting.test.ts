import { describe, expect, it } from 'vitest';

import type { CollectionEntry } from '../../types';
import {
  latinToHindiNumber,
  formatMarkdownBreaks,
  padNumber,
  splitCoupletLines,
  formatCoupletTextLines,
  generateMarkdownContent,
} from '../formatting';

describe('formatting module', () => {
  describe('latinToHindiNumber', () => {
    it('should convert single digits to Hindi numerals', () => {
      expect(latinToHindiNumber(0)).toBe('०');
      expect(latinToHindiNumber(5)).toBe('५');
      expect(latinToHindiNumber(9)).toBe('९');
    });

    it('should convert multi-digit numbers to Hindi numerals', () => {
      expect(latinToHindiNumber(123)).toBe('१२३');
      expect(latinToHindiNumber('2050')).toBe('२०५०');
    });
  });

  describe('formatMarkdownBreaks', () => {
    it('should replace newlines with trailing backslashes for markdown breaks', () => {
      const input = 'line1\nline2\nline3';
      const output = formatMarkdownBreaks(input);
      expect(output).toBe('line1\\\nline2\\\nline3');
    });

    it('should return the same string when there are no newlines', () => {
      const input = 'no newlines here';
      expect(formatMarkdownBreaks(input)).toBe('no newlines here');
    });
  });

  describe('padNumber', () => {
    it('should pad numbers with leading zeros', () => {
      expect(padNumber(1, 2)).toBe('01');
      expect(padNumber(50, 2)).toBe('50');
      expect(padNumber(5, 3)).toBe('005');
    });

    it('should not pad when number length exceeds width', () => {
      expect(padNumber(1234, 2)).toBe('1234');
    });
  });

  describe('splitCoupletLines', () => {
    it('should split couplet at danda (।) and trim whitespace', () => {
      const text = 'गुरु गोविंद दोऊ खड़े। काके लागूं पांय। ';
      const lines = splitCoupletLines(text);
      expect(lines).toEqual(['गुरु गोविंद दोऊ खड़े', 'काके लागूं पांय']);
    });

    it('should filter out empty lines after splitting', () => {
      const text = 'पहली पंक्ति।।दूसरी पंक्ति।';
      const lines = splitCoupletLines(text);
      // Two dandas in a row produce an empty segment which is filtered
      expect(lines.every((l) => l.length > 0)).toBe(true);
    });
  });

  describe('formatCoupletTextLines', () => {
    it('should append single danda to all but the last line', () => {
      const lines = ['पहली', 'दूसरी', 'तीसरी'];
      const formatted = formatCoupletTextLines(lines, 3);
      const resultLines = formatted.split('\n');
      expect(resultLines[0]).toBe('पहली।');
      expect(resultLines[1]).toBe('दूसरी।');
    });

    it('should format couplet lines with double danda and Devanagari numeral on last line', () => {
      const lines = ['गुरु गोविंद दोऊ खड़े', 'काके लागूं पांय'];
      const formatted = formatCoupletTextLines(lines, 1);
      expect(formatted).toBe('गुरु गोविंद दोऊ खड़े।\nकाके लागूं पांय।।१।।');
    });
  });

  describe('generateMarkdownContent', () => {
    it('should format a batch of collection entries with meaning into markdown', () => {
      const entries: CollectionEntry[] = [
        {
          couplet_hindi: 'गुरु गोविंद दोऊ खड़े। काके लागूं पांय।',
          translation_hindi: 'गुरु और गोविंद दोनों सामने खड़े हैं।',
        },
        { couplet_hindi: 'बलिहारी गुरु आपने। गोबिंद दियो बताय।', translation_hindi: 'गुरु की महिमा अपरंपार है।' },
      ];

      const markdown = generateMarkdownContent(entries, 1);
      expect(markdown).toContain('गुरु गोविंद दोऊ खड़े।\\\nकाके लागूं पांय।।१।।');
      expect(markdown).toContain('**अर्थ:** गुरु और गोविंद दोनों सामने खड़े हैं।');
      expect(markdown).toContain('---');
      expect(markdown).toContain('बलिहारी गुरु आपने।\\\nगोबिंद दियो बताय।।२।।');
    });

    it('should skip meaning line when translation_hindi is empty', () => {
      // Covers the `if (entry.translation_hindi)` false branch
      const entries: CollectionEntry[] = [
        { couplet_hindi: 'गुरु गोविंद दोऊ खड़े। काके लागूं पांय।', translation_hindi: '' },
      ];

      const markdown = generateMarkdownContent(entries, 1);
      expect(markdown).not.toContain('**अर्थ:**');
      expect(markdown).toContain('गुरु गोविंद दोऊ खड़े।\\\nकाके लागूं पांय।।१।।');
    });
  });
});
