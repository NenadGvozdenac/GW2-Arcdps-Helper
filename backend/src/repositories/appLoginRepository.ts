import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../db/pool";
import { appLoginRequests } from "../db/schema";
import type { AppLoginClient, AppLoginRequestRow } from "../types/appLogin.types";

type Decision = { status: "approved"; userId: string } | { status: "denied" };

export const appLoginRepository = {
  async create(values: {
    secretHash: string;
    code: string;
    client: AppLoginClient;
    expiresAt: Date;
  }): Promise<AppLoginRequestRow> {
    const [row] = await getDb().insert(appLoginRequests).values(values).returning();
    return row;
  },

  async findById(id: string): Promise<AppLoginRequestRow | null> {
    const [row] = await getDb().select().from(appLoginRequests).where(eq(appLoginRequests.id, id)).limit(1);
    return row ?? null;
  },

  /** Approves / declines a request that is still pending and not expired; null when it isn't. */
  async decide(id: string, decision: Decision, now = new Date()): Promise<AppLoginRequestRow | null> {
    const [row] = await getDb()
      .update(appLoginRequests)
      .set(decision)
      .where(
        and(eq(appLoginRequests.id, id), eq(appLoginRequests.status, "pending"), gt(appLoginRequests.expiresAt, now)),
      )
      .returning();
    return row ?? null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(appLoginRequests).where(eq(appLoginRequests.id, id));
  },

  /** Removes requests nobody finished (the table only ever holds a few minutes' worth). */
  async deleteExpired(now = new Date()): Promise<void> {
    await getDb().delete(appLoginRequests).where(lt(appLoginRequests.expiresAt, now));
  },
};
