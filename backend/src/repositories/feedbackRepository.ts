import { and, eq, gte } from "drizzle-orm";
import { getDb } from "../db/pool";
import { feedback } from "../db/schema";
import type { FeedbackInput, FeedbackSender } from "../types/feedback.types";

export const feedbackRepository = {
  async create(sender: FeedbackSender, input: FeedbackInput): Promise<string> {
    const [row] = await getDb()
      .insert(feedback)
      .values({ ...input, contactEmail: input.contactEmail ?? null, ...sender })
      .returning({ id: feedback.id });
    return row.id;
  },

  /** Whether feedback came from this IP (by its hash) at or after `since`. */
  async sentFromIpSince(ipHash: string, since: Date): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: feedback.id })
      .from(feedback)
      .where(and(eq(feedback.ipHash, ipHash), gte(feedback.createdAt, since)))
      .limit(1);
    return !!row;
  },
};
