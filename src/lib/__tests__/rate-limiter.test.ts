import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS } from '../../constants';
import { rateLimit, resetRateLimiter } from '../rate-limiter';

describe('rate limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('resolves immediately when under the rate limit', async () => {
    const start = Date.now();
    await rateLimit();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('resolves immediately for each request up to the limit', async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      // Each call should resolve without delay
      const start = Date.now();
      await rateLimit();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    }
  });

  it('delays when the sliding window is full', async () => {
    vi.useFakeTimers();

    // Fill up all allowed requests in the current window
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await rateLimit();
    }

    // The next request must wait for the window to slide
    const deferred = rateLimit();

    // Should not resolve before the window expires
    let resolved = false;
    void deferred.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    // Advance past the window — oldest request now falls outside
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_SECONDS * 1000 + 1);
    await deferred;

    vi.useRealTimers();
  });

  it('allows a new request after the window slides', async () => {
    vi.useFakeTimers();

    // Exhaust the window
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await rateLimit();
    }

    // Advance time past the window
    vi.advanceTimersByTime(RATE_LIMIT_WINDOW_SECONDS * 1000 + 1);

    // Should resolve immediately now
    const start = Date.now();
    await rateLimit();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);

    vi.useRealTimers();
  });
});
