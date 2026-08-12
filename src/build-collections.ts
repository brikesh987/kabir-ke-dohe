/**
 * Build Collections Script
 *
 * Fetches couplets from the live Kabir Dohe API (50 per page) and generates
 * markdown collection files in docs/, one file per page of 50 couplets.
 *
 * Usage:
 *   bun run build
 *
 * Data source: https://kabirdoheapi.vercel.app/api/couplets
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

import ora from 'ora';
import { format } from 'prettier';

import type { ApiPost, ApiResponse, CollectionEntry } from './types';

const ENTRIES_PER_FILE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Base URL of the Kabir Dohe API. Overridable via the COUPLETS_API_URL env var.
 */
const API_BASE_URL = process.env.COUPLETS_API_URL ?? 'https://kabirdoheapi.vercel.app';

/**
 * SEO keywords appended to each collection file.
 */
const KABIR_KEYWORDS = [
  // Educational/Student Intent
  'Kabir ke dohe with meaning in English',
  'कबीर के दोहे अर्थ सहित English में',
  'Kabir ke dohe for students',
  'छात्रों के लिए कबीर के दोहे',
  'Kabir Das dohe and arth in Hindi',
  'कबीर दास के दोहे और उनका अर्थ',
  'Easy Kabir dohe for school project',
  'स्कूल प्रोजेक्ट के लिए आसान कबीर के दोहे',

  // Thematic/Life-Lesson Intent
  'Kabir ke dohe on truth and honesty',
  'सत्य और ईमानदारी पर कबीर के दोहे',
  'Kabir quotes on spirituality and God',
  'अध्यात्म और ईश्वर पर कबीर के विचार',
  'Kabir ke dohe on friendship (Mitrata)',
  'मित्रता पर कबीर के दोहे',
  'Kabir Das couplets on ego and pride',
  'अहंकार और घमंड पर कबीर के दोहे',

  // Format-Specific Intent
  'Kabir ke dohe PDF download',
  'कबीर के दोहे PDF डाउनलोड',
  'Best Kabir Das quotes for WhatsApp status',
  'व्हाट्सएप स्टेटस के लिए कबीर दास के विचार',
  'Kabir Amritvani lyrics in Hindi',
  'कबीर अमृतवाणी लिरिक्स हिंदी में',
];

/**
 * Generates an SEO keywords section appended to each collection file.
 * Uses HTML comments so they are invisible to readers but indexed by search engines.
 *
 * @returns {string} The SEO keywords comment block.
 */
function generateSeoKeywordsSection(): string {
  const listItems = KABIR_KEYWORDS.map((kw) => `-${kw}`).join('\n');
  return `\n---\n\n## Tags\n\n${listItems}\n`;
}

/**
 * Hindi digits for converting Latin numbers to Devanagari numerals.
 */
const HINDI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts a Latin number to Hindi (Devanagari) numerals.
 *
 * @param {number | string} latinNumber - The number to convert.
 *
 * @returns {string} The number in Hindi numerals.
 */
function latinToHindiNumber(latinNumber: number | string): string {
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
function formatMarkdownBreaks(text: string): string {
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
function padNumber(number: number, width: number): string {
  return number.toString().padStart(width, '0');
}

/**
 * Fetches a single page of couplets from the API.
 *
 * @param {number} page - The page number to fetch (1-based).
 *
 * @returns {Promise<ApiPost[]>} The posts on the page, empty when the page has no posts.
 *
 * @throws {Error} When the request fails after MAX_RETRIES attempts or the response is invalid.
 */
async function fetchPage(page: number): Promise<ApiPost[]> {
  const url = `${API_BASE_URL}/api/couplets?per_page=${ENTRIES_PER_FILE}&page=${page}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const json: unknown = await response.json();
      const body = json as ApiResponse;

      if (!body?.success || !Array.isArray(body.data?.posts)) {
        throw new Error('API response shape is invalid');
      }

      return body.data.posts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < MAX_RETRIES) {
        console.warn(`Page ${page} fetch failed (attempt ${attempt}/${MAX_RETRIES}): ${message}. Retrying...`);
        await new Promise((resolveTimeout) => setTimeout(resolveTimeout, RETRY_DELAY_MS));
        continue;
      }

      throw new Error(`Page ${page} fetch failed after ${MAX_RETRIES} attempts: ${message}`);
    }
  }

  throw new Error(`Page ${page} fetch failed after ${MAX_RETRIES} attempts`);
}

/**
 * Generates markdown content for a batch of couplet entries.
 *
 * @param {CollectionEntry[]} entries - The entries to render.
 * @param {number} startNum - The starting index (1-based) for numbering.
 *
 * @returns {string} The markdown content string.
 */
function generateMarkdownContent(entries: CollectionEntry[], startNum: number): string {
  return entries
    .map((entry, index) => {
      const entryIndex = startNum + index;
      let content = '';

      // Couplet text: split at danda (।) into separate lines with markdown breaks
      const coupletLines = entry.couplet_hindi
        .split('।')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const coupletText = coupletLines
        .map((line, i) => {
          if (i < coupletLines.length - 1) {
            return line + '।';
          }
          // Last line: couplet-ending ।। + numeral + marker ।।
          return line + '।।' + latinToHindiNumber(entryIndex) + '।।';
        })
        .join('\n');
      content += formatMarkdownBreaks(coupletText);
      content += '\n\n';

      // Meaning (Hindi)
      if (entry.translation_hindi) {
        content += '**अर्थ:** ' + formatMarkdownBreaks(entry.translation_hindi) + '\n\n';
      }

      return content;
    })
    .join('\n\n---\n\n');
}

/**
 * Main entry point.
 * Fetches couplets from the API page by page and generates markdown collections.
 */
async function main(): Promise<void> {
  const spinner = ora('Fetching couplets from API...').start();

  try {
    const docsDir = resolve(process.cwd(), 'docs');

    // Ensure the docs directory exists
    await mkdir(docsDir, { recursive: true });

    let fileCount = 0;

    for (let page = 1; ; page += 1) {
      const posts = await fetchPage(page);

      // Stop when a page returns no posts
      if (posts.length === 0) {
        break;
      }

      const startNum = (page - 1) * ENTRIES_PER_FILE + 1;
      const entries: CollectionEntry[] = posts.map((post) => ({
        couplet_hindi: post.text_hi,
        translation_hindi: post.meaning_hi ?? '',
      }));

      const startNumber = padNumber(startNum, 2);
      const endNumber = padNumber(startNum + ENTRIES_PER_FILE - 1, 2);

      const heading = `# संत कबीर जी के दोहे — ${startNumber} to ${endNumber}`;
      const content = `${heading}\n\n${generateMarkdownContent(entries, startNum)}`;

      const fileName = `collection-${startNumber}-to-${endNumber}.md`;
      const filePath = resolve(docsDir, fileName);

      let finalContent = await format(content, { parser: 'markdown' });
      // Append SEO keywords after formatting to avoid prettier stripping HTML comments
      finalContent += generateSeoKeywordsSection();
      await writeFile(filePath, finalContent, 'utf-8');

      fileCount += 1;
      spinner.text = `File created: ${basename(filePath)}`;
    }

    spinner.succeed(`Created ${fileCount} collection files in docs/`);
  } catch (error) {
    spinner.fail('Error fetching or generating collections:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
