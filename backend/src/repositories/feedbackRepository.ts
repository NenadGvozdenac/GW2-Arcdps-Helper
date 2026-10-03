import { getDb } from "../db/pool";
import { feedback } from "../db/schema";
import type { FeedbackInput } from "../types/feedback.types";

export const feedbackRepository = {
  /** `userId`: the signed-in sender, null for guests. */
  async create(userId: string | null, input: FeedbackInput): Promise<string> {
    const [row] = await getDb()
      .insert(feedback)
      .values({ ...input, contactEmail: input.contactEmail ?? null, userId })
      .returning({ id: feedback.id });
    return row.id;
  },
};
