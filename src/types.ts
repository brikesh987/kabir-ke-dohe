/**
 * A single couplet post returned by the live API.
 */
export interface ApiPost {
  /** Sequential post number. */
  number: number;
  /** URL-friendly slug. */
  slug: string;
  /** Hindi text of the couplet. */
  text_hi: string;
  /** English transliteration of the couplet. */
  text_en: string;
  /** Hindi meaning/translation, may be null. */
  meaning_hi: string | null;
  /** English meaning/translation, may be null. */
  meaning_en: string | null;
  /** Category info, or null when unassigned. */
  category: { name: string; slug: string } | null;
  /** Tags associated with the couplet. */
  tags: Array<{ name: string; slug: string }>;
  /** Creation timestamp. */
  created_at: string;
  /** Last update timestamp. */
  updated_at: string;
}

/**
 * The response envelope returned by the couplets API.
 */
export interface ApiResponse {
  success: boolean;
  data: { posts: ApiPost[]; total: number; totalPages: number; page: number; per_page: number; pagination: boolean };
}

/**
 * An entry prepared for markdown generation.
 */
export interface CollectionEntry {
  couplet_hindi: string;
  translation_hindi: string;
}
