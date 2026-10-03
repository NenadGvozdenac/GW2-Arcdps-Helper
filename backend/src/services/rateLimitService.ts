import type { RateLimit } from "../config/constants";
import { rateLimitRepository } from "../repositories/rateLimitRepository";

/** Share of hits that also delete expired rows - there is no background job (the API also runs serverless). */
const CLEANUP_CHANCE = 0.02;

/**
 * Throttling shared by every limit (wrong passwords, emails, Discord tests, feedback): one counter per key in
 * `rate_limits`, e.g. "discord-test:<userId>". The limits themselves are RATE_LIMITS in config/constants.ts.
 */
export const rateLimitService = {
  /** Counts one hit; false when the limit is reached already (then nothing is counted). */
  async take(key: string, limit: RateLimit): Promise<boolean> {
    if (Math.random() < CLEANUP_CHANCE) await rateLimitRepository.deleteExpired();
    return rateLimitRepository.hit(key, limit.max, limit.windowMs);
  },

  /** Whether the limit is reached, without counting a hit. */
  isLimited: (key: string, limit: RateLimit) => rateLimitRepository.isLimited(key, limit.max),

  clear: (key: string) => rateLimitRepository.clear(key),
  clearPrefix: (prefix: string) => rateLimitRepository.clearPrefix(prefix),
};
