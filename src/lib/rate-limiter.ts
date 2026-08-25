import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_WINDOW_SECONDS } from '../constants';

/**
 * Timestamps (ms since epoch) of recent API requests, kept in ascending order.
 * Used as a sliding-window log to enforce the rate limit.
 */
const requestTimestamps: number[] = [];

/**
 * Waits before a request if the rate limit is exhausted, using a sliding
 * window algorithm. If RATE_LIMIT_MAX requests have already been recorded
 * within the last RATE_LIMIT_WINDOW_SECONDS, this function pauses until the
 * oldest request falls outside the window, then records the new request and
 * resolves.
 *
 * @returns {Promise<void>} Resolves when a request may safely proceed.
 */
export async function rateLimit(): Promise<void> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  // Evict timestamps that have aged out of the sliding window
  while (requestTimestamps.length > 0 && requestTimestamps[0] <= cutoff) {
    requestTimestamps.shift();
  }

  // Still at capacity — wait for the oldest request to expire, then re-evaluate
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const oldest = requestTimestamps[0];
    const waitMs = oldest + RATE_LIMIT_WINDOW_MS - now;

    if (waitMs > 0) {
      console.warn(
        `Rate limit reached (${RATE_LIMIT_MAX} per ${RATE_LIMIT_WINDOW_SECONDS}s). Waiting ${Math.round(waitMs / 1000)}s before next request...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    return rateLimit();
  }

  requestTimestamps.push(Date.now());
}

/**
 * Clears the internal request timestamp log. Intended for use in tests to
 * ensure a clean state between test cases.
 */
export function resetRateLimiter(): void {
  requestTimestamps.length = 0;
}
