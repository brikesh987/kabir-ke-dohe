/**
 * A single couplet post returned by the live API.
 *
 * @type {ApiPost}
 * @property {number} number - Sequential post number.
 * @property {string} slug - URL-friendly slug.
 * @property {string} text_hi - Hindi text of the couplet.
 * @property {string} text_en - English transliteration of the couplet.
 * @property {string | null} meaning_hi - Hindi meaning/translation, may be null.
 * @property {string | null} meaning_en - English meaning/translation, may be null.
 * @property {{ name: string; slug: string } | null} category - Category info, or null when unassigned.
 * @property {Array<{ name: string; slug: string }>} tags - Tags associated with the couplet.
 * @property {string} created_at - Creation timestamp.
 * @property {string} updated_at - Last update timestamp.
 */
export interface ApiPost {
  number: number;
  slug: string;
  text_hi: string;
  text_en: string;
  meaning_hi: string | null;
  meaning_en: string | null;
  category: { name: string; slug: string } | null;
  tags: Array<{ name: string; slug: string }>;
  created_at: string;
  updated_at: string;
}

/**
 * The response envelope returned by the couplets API.
 *
 * @type {ApiResponse}
 * @property {boolean} success - Whether the API request succeeded.
 * @property {{ posts: ApiPost[]; total: number; totalPages: number; page: number; per_page: number; pagination: boolean }} data - The response data containing posts and pagination info.
 */
export interface ApiResponse {
  success: boolean;
  data: { posts: ApiPost[]; total: number; totalPages: number; page: number; per_page: number; pagination: boolean };
}

/**
 * An entry prepared for markdown generation.
 *
 * @type {CollectionEntry}
 * @property {string} couplet_hindi - Hindi text of the couplet.
 * @property {string} translation_hindi - Hindi meaning/translation of the couplet.
 */
export interface CollectionEntry {
  couplet_hindi: string;
  translation_hindi: string;
}
