import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs } from "../db/schema";
import type { Log, LogSummary } from "../types/log.types";

const ownedBy = (ownerId: string) => eq(logs.ownerId, ownerId);

export const logRepository = {
  listByOwner(ownerId: string): Promise<Log[]> {
    return getDb().select().from(logs).where(ownedBy(ownerId)).orderBy(desc(logs.encounterTime));
  },

  async findById(ownerId: string, id: string): Promise<Log | null> {
    const [row] = await getDb()
      .select()
      .from(logs)
      .where(and(ownedBy(ownerId), eq(logs.id, id)))
      .limit(1);
    return row ?? null;
  },

  async findByPermalink(ownerId: string, permalink: string): Promise<Log | null> {
    const [row] = await getDb()
      .select()
      .from(logs)
      .where(and(ownedBy(ownerId), eq(logs.permalink, permalink)))
      .limit(1);
    return row ?? null;
  },

  /** Returns the new id, or null if this owner already has the permalink (e.g. concurrent submit). */
  async create(ownerId: string, summary: LogSummary): Promise<string | null> {
    const [row] = await getDb()
      .insert(logs)
      .values({ ...summary, ownerId })
      .onConflictDoNothing({ target: [logs.ownerId, logs.permalink] })
      .returning({ id: logs.id });
    return row?.id ?? null;
  },

  async delete(ownerId: string, id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(logs)
      .where(and(ownedBy(ownerId), eq(logs.id, id)))
      .returning({ id: logs.id });
    return deleted.length > 0;
  },
};
