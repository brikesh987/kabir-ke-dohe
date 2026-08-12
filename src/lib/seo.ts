import { KABIR_KEYWORDS } from '../constants';

/**
 * Generates an SEO keywords section appended to each collection file.
 * Uses HTML comments so they are invisible to readers but indexed by search engines.
 *
 * @returns {string} The SEO keywords comment block.
 */
export function generateSeoKeywordsSection(): string {
  const listItems = KABIR_KEYWORDS.map((kw) => `-${kw}`).join('\n');
  return `\n---\n\n## Tags\n\n${listItems}\n`;
}
