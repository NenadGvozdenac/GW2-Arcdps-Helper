import { RATE_LIMIT_EVENT_RETENTION_MS, type RateLimit } from "../config/constants";
import { rateLimitEventRepository } from "../repositories/rateLimitEventRepository";
import { rateLimitRepository } from "../repositories/rateLimitRepository";

/** Share of hits that also delete expired rows - there is no background job (the API also runs serverless). */
const CLEANUP_CHANCE = 0.02;

/** "login-ip:<hash>" → "login-ip": what the administrator's overview groups refused requests by. */
const kindOf = (key: string) => key.split(":")[0];

/** Remembers a refused request for the administrator. */
async function recordRefused(key: string): Promise<void> {
  if (Math.random() < CLEANUP_CHANCE) {
    await rateLimitEventRepository.deleteBefore(new Date(Date.now() - RATE_LIMIT_EVENT_RETENTION_MS));
  }
  await rateLimitEventRepository.record(key, kindOf(key));
}

/**
 * Throttling shared by every limit (wrong passwords, emails, Discord tests, feedback): one counter per key in
 * `rate_limits`, e.g. "discord-test:<userId>". The limits themselves are RATE_LIMITS in config/constants.ts. Every
 * refused request is also logged in `rate_limit_events` for the admin area.
 */
export const rateLimitService = {
  /** Counts one hit; false when the limit is reached already (then nothing is counted). */
  async take(key: string, limit: RateLimit): Promise<boolean> {
    if (Math.random() < CLEANUP_CHANCE) await rateLimitRepository.deleteExpired();
    const allowed = await rateLimitRepository.hit(key, limit.max, limit.windowMs);
    if (!allowed) await recordRefused(key);
    return allowed;
  },

  /** Whether the limit is reached, without counting a hit (a reached limit is logged as a refused request). */
  async isLimited(key: string, limit: RateLimit): Promise<boolean> {
    const limited = await rateLimitRepository.isLimited(key, limit.max);
    if (limited) await recordRefused(key);
    return limited;
  },

  clear: (key: string) => rateLimitRepository.clear(key),
  clearPrefix: (prefix: string) => rateLimitRepository.clearPrefix(prefix),
};
