import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/pool";
import { discordWebhooks } from "../db/schema";
import type { DiscordWebhook } from "../types/discord.types";

const columns = { url: discordWebhooks.url, content: discordWebhooks.content, enabled: discordWebhooks.enabled };

export const discordWebhookRepository = {
  /** The user's webhooks in order (first, second). */
  async list(userId: string): Promise<DiscordWebhook[]> {
    return getDb()
      .select(columns)
      .from(discordWebhooks)
      .where(eq(discordWebhooks.userId, userId))
      .orderBy(asc(discordWebhooks.position));
  },

  /** Replaces all of the user's webhooks with `webhooks` (in order); an empty list removes them. */
  async replace(userId: string, webhooks: DiscordWebhook[]): Promise<DiscordWebhook[]> {
    return getDb().transaction(async (tx) => {
      await tx.delete(discordWebhooks).where(eq(discordWebhooks.userId, userId));
      if (!webhooks.length) return [];
      return tx
        .insert(discordWebhooks)
        .values(webhooks.map((w, position) => ({ ...w, userId, position })))
        .returning(columns);
    });
  },
};
