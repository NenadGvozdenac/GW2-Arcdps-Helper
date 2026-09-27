import { DISCORD_MAX_EMBEDS, DISCORD_USERNAME } from "../config/constants";
import { GROUPS } from "../data/encounters";
import type { DiscordEmbed } from "../types/discord.types";
import type { Log } from "../types/log.types";
import { discordWebhookFailed } from "../utils/httpError";
import { postToWebhook } from "./clients/discordClient";

const GREEN = 0x22c55e;
const RED = 0xef4444;

const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

function toEmbed(log: Log): DiscordEmbed {
  const mode = log.isLegendaryCM ? " (LCM)" : log.isCM ? " (CM)" : "";
  const result = log.success
    ? "✅ Kill"
    : `❌ Wipe${log.bossHealthLeft != null ? ` · ${Math.round(log.bossHealthLeft * 10) / 10}% left` : ""}`;
  const group = GROUPS.find((g) => g.id === log.groupId);
  return {
    title: `${log.bossName}${mode}`,
    url: log.url,
    color: log.success ? GREEN : RED,
    fields: [
      { name: "Result", value: result, inline: true },
      { name: "Duration", value: formatDuration(log.durationMs), inline: true },
      ...(group ? [{ name: "Group", value: `${group.short} · ${group.name}`, inline: true }] : []),
    ],
    ...(log.bossIcon ? { thumbnail: { url: log.bossIcon } } : {}),
    ...(log.recordedBy ? { footer: { text: `Recorded by ${log.recordedBy}` } } : {}),
    timestamp: log.encounterTime.toISOString(),
  };
}

export const discordService = {
  /**
   * Posts newly imported logs to the user's webhook (up to 10 per message).
   * Never throws: a broken webhook must not make the import itself fail.
   */
  async notifyNewLogs(webhookUrl: string | null, logs: Log[]): Promise<void> {
    if (!webhookUrl || !logs.length) return;
    const sorted = [...logs].sort((a, b) => a.encounterTime.getTime() - b.encounterTime.getTime());
    for (let i = 0; i < sorted.length; i += DISCORD_MAX_EMBEDS) {
      const embeds = sorted.slice(i, i + DISCORD_MAX_EMBEDS).map(toEmbed);
      try {
        await postToWebhook(webhookUrl, { username: DISCORD_USERNAME, embeds });
      } catch (err) {
        console.warn("Discord webhook failed:", err instanceof Error ? err.message : err);
        return;
      }
    }
  },

  /** Sends a test message; throws DISCORD_WEBHOOK_FAILED so the user sees that the URL doesn't work. */
  async sendTest(webhookUrl: string): Promise<void> {
    try {
      await postToWebhook(webhookUrl, {
        username: DISCORD_USERNAME,
        content: "✅ GW2 ArcDPS Helper is connected — new logs will be posted in this channel.",
      });
    } catch (err) {
      console.warn("Discord webhook test failed:", err instanceof Error ? err.message : err);
      throw discordWebhookFailed();
    }
  },
};
