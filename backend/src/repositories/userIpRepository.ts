import { desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { userIps } from "../db/schema";

export interface UserIp {
  ipHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export const userIpRepository = {
  /** Remembers that the user signed in from this address (hash) now. */
  async record(userId: string, ipHash: string): Promise<void> {
    await getDb()
      .insert(userIps)
      .values({ userId, ipHash })
      .onConflictDoUpdate({ target: [userIps.userId, userIps.ipHash], set: { lastSeenAt: sql`now()` } });
  },

  /** The user's addresses, most recently seen first. */
  listForUser(userId: string): Promise<UserIp[]> {
    return getDb()
      .select({ ipHash: userIps.ipHash, firstSeenAt: userIps.firstSeenAt, lastSeenAt: userIps.lastSeenAt })
      .from(userIps)
      .where(eq(userIps.userId, userId))
      .orderBy(desc(userIps.lastSeenAt));
  },

  async deleteSeenBefore(before: Date): Promise<void> {
    await getDb().delete(userIps).where(lt(userIps.lastSeenAt, before));
  },
};
