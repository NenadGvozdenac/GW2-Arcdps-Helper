import { USER_IP_RETENTION_MS } from "../config/constants";
import { userIpRepository } from "../repositories/userIpRepository";

/** Share of recordings that also delete addresses not seen for USER_IP_RETENTION_MS (no background job). */
const CLEANUP_CHANCE = 0.02;

/** The (hashed) addresses users sign in from, so the administrator can block one. */
export const userIpService = {
  /** Called wherever a sign-in token is issued (password, email link, password reset, the apps' browser sign-in). */
  async record(userId: string, ipHash: string): Promise<void> {
    if (Math.random() < CLEANUP_CHANCE) await userIpRepository.deleteSeenBefore(new Date(Date.now() - USER_IP_RETENTION_MS));
    await userIpRepository.record(userId, ipHash);
  },

  listForUser: (userId: string) => userIpRepository.listForUser(userId),
};
