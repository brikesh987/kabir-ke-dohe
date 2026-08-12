import { describe, expect, it } from 'vitest';

import { KABIR_KEYWORDS } from '../../constants';
import { generateSeoKeywordsSection } from '../seo';

describe('seo module', () => {
  describe('generateSeoKeywordsSection', () => {
    it('should generate SEO keywords formatted as markdown list inside HTML comments', () => {
      const section = generateSeoKeywordsSection();
      expect(section).toContain('## Tags');
      KABIR_KEYWORDS.forEach((kw) => {
        expect(section).toContain(`-${kw}`);
      });
    });
  });
});
