/**
 * Build Collections Script
 *
 * Fetches couplets from the live Kabir Dohe API (50 per page) and generates
 * markdown collection files in docs/, one file per page of 50 couplets.
 *
 * Usage:
 *   bun run build
 *   bun run build:test
 *   bun run src/build.ts --limit 2
 *   MAX_FILES=2 bun run src/build.ts
 *
 * Data source: https://kabirdoheapi.vercel.app/api/couplets
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

import ora from 'ora';
import { format } from 'prettier';

import { ENTRIES_PER_FILE } from './constants';
import { fetchPage, padNumber, generateMarkdownContent, generateSeoKeywordsSection, parseFileLimit } from './lib';
import type { CollectionEntry } from './types';

/**
 * Main entry point.
 * Fetches couplets from the API page by page and generates markdown collections.
 */
async function main(): Promise<void> {
  const maxFiles = parseFileLimit();
  const spinner = ora(
    `Fetching couplets from API${maxFiles !== undefined ? ` (limit: ${maxFiles} file${maxFiles > 1 ? 's' : ''})` : ''}...`
  ).start();

  try {
    const docsDir = resolve(process.cwd(), 'docs');

    // Ensure the docs directory exists
    await mkdir(docsDir, { recursive: true });

    let fileCount = 0;

    for (let page = 1; ; page += 1) {
      if (maxFiles !== undefined && fileCount >= maxFiles) {
        break;
      }

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
