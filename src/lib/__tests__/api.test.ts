import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { API_BASE_URL, ENTRIES_PER_FILE, RATE_LIMIT_WINDOW_MS } from '../../constants';
import type { ApiPost, ApiResponse } from '../../types';
import { fetchPage, getCoupletsApiUrl } from '../api';
import { resetRateLimiter } from '../rate-limiter';

/**
 * Minimal valid ApiPost factory for tests.
 *
 * @param {Partial<ApiPost>} overrides - Optional partial overrides for ApiPost fields.
 *
 * @returns {ApiPost} A fully populated ApiPost with default values and overrides applied.
 */
function makePost(overrides: Partial<ApiPost> = {}): ApiPost {
  return {
    number: 1,
    slug: 'test-doha',
    text_hi: 'कबीर दोहा',
    text_en: 'Kabir doha',
    meaning_hi: 'अर्थ',
    meaning_en: 'meaning',
    category: null,
    tags: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('api module', () => {
  describe('getCoupletsApiUrl', () => {
    it('should construct API URL with default perPage', () => {
      const url = getCoupletsApiUrl(1);
      expect(url).toBe(`${API_BASE_URL}/api/couplets?per_page=${ENTRIES_PER_FILE}&page=1`);
    });

    it('should construct API URL with custom perPage', () => {
      const url = getCoupletsApiUrl(2, 10);
      expect(url).toBe(`${API_BASE_URL}/api/couplets?per_page=10&page=2`);
    });
  });

  describe('fetchPage', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
      resetRateLimiter();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch posts successfully on first attempt', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: {
          posts: [makePost({ number: 1, text_hi: 'कबीर दोहा १' }), makePost({ number: 2, text_hi: 'कबीर दोहा २' })],
          total: 2,
          totalPages: 1,
          page: 1,
          per_page: 50,
          pagination: false,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockResponse } as Response);

      const posts = await fetchPage(1);

      expect(posts).toHaveLength(2);
      expect(posts[0].text_hi).toBe('कबीर दोहा १');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { posts: [makePost()], total: 1, totalPages: 1, page: 1, per_page: 50, pagination: false },
      };

      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse } as Response);

      const posts = await fetchPage(1);

      expect(posts).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when HTTP response is not ok after retries', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);

      await expect(fetchPage(1)).rejects.toThrow('Page 1 fetch failed after 3 attempts: API responded with status 500');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error when API response shape is invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) } as Response);

      await expect(fetchPage(1)).rejects.toThrow('Page 1 fetch failed after 3 attempts: API response shape is invalid');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle non-Error thrown values in catch branch', async () => {
      // Covers the `error instanceof Error ? ... : String(error)` false branch
      global.fetch = vi.fn().mockRejectedValue('plain string error');

      await expect(fetchPage(1)).rejects.toThrow('Page 1 fetch failed after 3 attempts: plain string error');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should wait the full rate limit window and retry on 429', async () => {
      vi.useFakeTimers();

      const mockResponse: ApiResponse = {
        success: true,
        data: { posts: [makePost()], total: 1, totalPages: 1, page: 1, per_page: 50, pagination: false },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => null } } as unknown as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse } as Response);

      const promise = fetchPage(1);
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_WINDOW_MS);
      const posts = await promise;

      expect(posts).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should use Retry-After header value when provided on 429', async () => {
      vi.useFakeTimers();

      const mockResponse: ApiResponse = {
        success: true,
        data: { posts: [makePost()], total: 1, totalPages: 1, page: 1, per_page: 50, pagination: false },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => '30' } } as unknown as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse } as Response);

      const promise = fetchPage(1);
      await vi.advanceTimersByTimeAsync(30_000);
      const posts = await promise;

      expect(posts).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should throw after exhausting retries on 429', async () => {
      vi.useFakeTimers();

      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 429, headers: { get: () => null } } as unknown as Response);

      const promise = fetchPage(1);
      // Attach the rejection handler before advancing timers to avoid
      // an unhandled promise rejection warning
      const expectation = expect(promise).rejects.toThrow(
        'Page 1 fetch failed after 3 attempts: API responded with status 429'
      );

      await vi.advanceTimersByTimeAsync(RATE_LIMIT_WINDOW_MS);
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_WINDOW_MS);
      await expectation;
      expect(global.fetch).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });
  });
});
