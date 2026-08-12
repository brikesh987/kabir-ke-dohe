import { HINDI_DIGITS } from '../constants';
import type { CollectionEntry } from '../types';

/**
 * Converts a Latin number to Hindi (Devanagari) numerals.
 *
 * @param {number | string} latinNumber - The number to convert.
 *
 * @returns {string} The number in Hindi numerals.
 */
export function latinToHindiNumber(latinNumber: number | string): string {
  return latinNumber
    .toString()
    .split('')
    .map((digit) => {
      const num = parseInt(digit, 10);
      return HINDI_DIGITS[num];
    })
    .join('');
}

/**
 * Formats newlines in a string for Markdown compatibility by adding
 * trailing backslashes for hard line breaks.
 *
 * @param {string} text - The text to format.
 *
 * @returns {string} The formatted text with Markdown line breaks.
 */
export function formatMarkdownBreaks(text: string): string {
  return text.split('\n').join('\\\n');
}

/**
 * Pads a number with leading zeros to a given width.
 *
 * @param {number} number - The number to pad.
 * @param {number} width - The desired total width.
 *
 * @returns {string} The zero-padded number string.
 */
export function padNumber(number: number, width: number): string {
  return number.toString().padStart(width, '0');
}

/**
 * Splits raw Hindi couplet text at the danda (।) character into trimmed lines.
 *
 * @param {string} text - The raw couplet Hindi text.
 *
 * @returns {string[]} An array of trimmed couplet lines.
 */
export function splitCoupletLines(text: string): string[] {
  return text
    .split('।')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Formats couplet lines with proper single/double dandas and Devanagari numerals.
 *
 * @param {string[]} lines - The array of couplet lines.
 * @param {number} entryIndex - The 1-based index of the couplet.
 *
 * @returns {string} The joined couplet text lines.
 */
export function formatCoupletTextLines(lines: string[], entryIndex: number): string {
  return lines
    .map((line, i) => {
      if (i < lines.length - 1) {
        return line + '।';
      }
      // Last line: couplet-ending ।। + numeral + marker ।।
      return line + '।।' + latinToHindiNumber(entryIndex) + '।।';
    })
    .join('\n');
}

/**
 * Generates markdown content for a batch of couplet entries.
 *
 * @param {CollectionEntry[]} entries - The entries to render.
 * @param {number} startNum - The starting index (1-based) for numbering.
 *
 * @returns {string} The markdown content string.
 */
export function generateMarkdownContent(entries: CollectionEntry[], startNum: number): string {
  return entries
    .map((entry, index) => {
      const entryIndex = startNum + index;
      let content = '';

      // Couplet text: split at danda (।) into separate lines with markdown breaks
      const coupletLines = splitCoupletLines(entry.couplet_hindi);
      const coupletText = formatCoupletTextLines(coupletLines, entryIndex);
      content += formatMarkdownBreaks(coupletText) + '\n\n';

      // Meaning (Hindi)
      if (entry.translation_hindi) {
        content += '**अर्थ:** ' + formatMarkdownBreaks(entry.translation_hindi) + '\n\n';
      }

      return content;
    })
    .join('\n\n---\n\n');
}
