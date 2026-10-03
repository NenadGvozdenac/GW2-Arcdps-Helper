import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { blockedIps } from "../db/schema";

export interface BlockedIp {
  ipHash: string;
  note: string;
  blockedAt: Date;
  /** Emails of the accounts that signed in from this address. */
  users: string[];
}

export const blockedIpRepository = {
  async isBlocked(ipHash: string): Promise<boolean> {
    const [row] = await getDb()
      .select({ ipHash: blockedIps.ipHash })
      .from(blockedIps)
      .where(eq(blockedIps.ipHash, ipHash))
      .limit(1);
    return !!row;
  },

  /** Newest first, each with the accounts known to have used the address. */
  list(): Promise<BlockedIp[]> {
    return getDb()
      .select({
        ipHash: blockedIps.ipHash,
        note: blockedIps.note,
        blockedAt: blockedIps.blockedAt,
        // Plain SQL with the outer column spelled out: drizzle would leave ${blockedIps.ipHash} unqualified here.
        users: sql<string[]>`coalesce((
          SELECT array_agg(u.email ORDER BY u.email)
          FROM user_ips ui JOIN users u ON u.id = ui.user_id
          WHERE ui.ip_hash = blocked_ips.ip_hash
        ), '{}')`,
      })
      .from(blockedIps)
      .orderBy(desc(blockedIps.blockedAt));
  },

  /** Blocks the address; blocking it again only updates the note. */
  async block(ipHash: string, note: string): Promise<void> {
    await getDb()
      .insert(blockedIps)
      .values({ ipHash, note })
      .onConflictDoUpdate({ target: blockedIps.ipHash, set: { note } });
  },

  async unblock(ipHash: string): Promise<boolean> {
    const rows = await getDb().delete(blockedIps).where(eq(blockedIps.ipHash, ipHash)).returning({ ipHash: blockedIps.ipHash });
    return rows.length > 0;
  },
};
