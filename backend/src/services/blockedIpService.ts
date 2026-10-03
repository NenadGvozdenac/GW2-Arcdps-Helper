import { BLOCKED_IP_CACHE_MS } from "../config/constants";
import { blockedIpRepository } from "../repositories/blockedIpRepository";

/** Answers per address, kept BLOCKED_IP_CACHE_MS so not every API request asks the database. */
const cache = new Map<string, { blocked: boolean; until: number }>();
/** Past this many cached addresses the cache starts over (it is only a shortcut). */
const CACHE_MAX = 10_000;

/** Addresses the administrator blocked: every API request from them is refused (see blockedIpGuard). */
export const blockedIpService = {
  async isBlocked(ipHash: string): Promise<boolean> {
    const hit = cache.get(ipHash);
    if (hit && hit.until > Date.now()) return hit.blocked;
    const blocked = await blockedIpRepository.isBlocked(ipHash);
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(ipHash, { blocked, until: Date.now() + BLOCKED_IP_CACHE_MS });
    return blocked;
  },

  list: () => blockedIpRepository.list(),

  /** Takes effect here at once, on other server instances within BLOCKED_IP_CACHE_MS. */
  async block(ipHash: string, note: string): Promise<void> {
    await blockedIpRepository.block(ipHash, note);
    cache.delete(ipHash);
  },

  async unblock(ipHash: string): Promise<boolean> {
    cache.delete(ipHash);
    return blockedIpRepository.unblock(ipHash);
  },
};
