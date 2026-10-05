import { DISCORD_DESCRIPTION_LIMIT, DISCORD_MAX_EMBEDS, DISCORD_USERNAME } from "../config/constants";
import { GROUPS } from "../data/encounters";
import type { DiscordContent, DiscordEmbed, DiscordWebhook } from "../types/discord.types";
import type { Log } from "../types/log.types";
import type { LogSpan, Session } from "../types/session.types";
import { discordWebhookFailed } from "../utils/httpError";
import { deleteWebhookMessage, editWebhookMessage, postToWebhook } from "./clients/discordClient";

const GREEN = 0x22c55e;
const RED = 0xef4444;

const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** dps.report boss names already carry the mode ("Dhuum CM"), so only add it when missing. */
const modeLabel = (log: Log) => {
  const label = log.isLegendaryCM ? "LCM" : log.isCM ? "CM" : "";
  return label && !log.bossName.split(/\s+/).includes(label) ? ` ${label}` : "";
};

/** "2h 05m" / "43m 10s" for session lengths. */
const formatLongDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(total % 60).padStart(2, "0")}s`;
};

/** One line per log: "✅ [Vale Guardian CM](link) · 3:12". */
function sessionLine(log: Log): string {
  const result = log.success
    ? "✅"
    : `❌${log.bossHealthLeft != null ? ` ${Math.round(log.bossHealthLeft * 10) / 10}%` : ""}`;
  return `${result} [${log.bossName}${modeLabel(log)}](${log.url}) · ${formatDuration(log.durationMs)}`;
}

/**
 * Session body: kills grouped by content ("**W7 · The Key of Ahdashim**" followed by its logs, in GROUPS order),
 * then every wipe under "**Failed logs**" with the boss health that was left.
 */
function sessionLines(logs: Log[]): string[] {
  const sections: string[][] = [];
  const kills = logs.filter((l) => l.success);
  for (const group of GROUPS) {
    const groupKills = kills.filter((l) => l.groupId === group.id);
    if (groupKills.length) sections.push([`**${group.short} · ${group.name}**`, ...groupKills.map(sessionLine)]);
  }
  const other = kills.filter((l) => !GROUPS.some((g) => g.id === l.groupId));
  if (other.length) sections.push(["**Other**", ...other.map(sessionLine)]);
  const failed = logs.filter((l) => !l.success);
  if (failed.length) sections.push(["**Failed logs**", ...failed.map(sessionLine)]);
  return sections.flatMap((section, i) => (i ? ["", ...section] : section));
}

/** Joins lines up to Discord's description limit, ending with "… and N more" when they don't all fit. */
function fitLines(lines: string[]): string {
  const out: string[] = [];
  let length = 0;
  for (const [i, line] of lines.entries()) {
    const more = `… and ${lines.length - i} more`;
    if (length + line.length + 1 + more.length > DISCORD_DESCRIPTION_LIMIT) return [...out, more].join("\n");
    out.push(line);
    length += line.length + 1;
  }
  return out.join("\n");
}

function toEmbed(log: Log): DiscordEmbed {
  const mode = modeLabel(log);
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

/** Session summary: kills per group, failed logs, totals and how long it took. */
/** `owner`: the GW2 account of the player whose session it is ("by Name.1234" in the footer); may be empty. */
function sessionEmbed(session: Session, logs: Log[], span: LogSpan, owner: string): DiscordEmbed {
  const kills = logs.filter((l) => l.success).length;
  const groups = [...new Set(logs.map((l) => GROUPS.find((g) => g.id === l.groupId)?.short).filter(Boolean))];
  return {
    title: session.name || "Session",
    description: fitLines(sessionLines(logs)),
    color: kills ? GREEN : RED,
    fields: [
      { name: "Duration", value: formatLongDuration(span.durationMs), inline: true },
      { name: "Logs", value: String(logs.length), inline: true },
      { name: "Kills / wipes", value: `${kills} / ${logs.length - kills}`, inline: true },
      ...(groups.length ? [{ name: "Content", value: groups.join(" · ") }] : []),
    ],
    footer: {
      text: [owner ? `by ${owner}` : "Session", ...(session.endReason === "expired" ? ["ended automatically after 6 hours"] : [])].join(
        " · ",
      ),
    },
    timestamp: span.start.toISOString(),
  };
}

/** Posts logs to one webhook, oldest first, up to 10 per message; stops (without throwing) when Discord fails. */
async function postLogs(webhookUrl: string, logs: Log[]): Promise<void> {
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
}

/** Test message per webhook content, so the channel knows what it will get. */
const TEST_MESSAGES: Record<DiscordContent, string> = {
  all: "✅ GW2 ArcDPS Helper is connected — new logs and session summaries will be posted in this channel.",
  logs: "✅ GW2 ArcDPS Helper is connected — new logs will be posted in this channel.",
  sessions: "✅ GW2 ArcDPS Helper is connected — session summaries will be posted in this channel.",
};

export const discordService = {
  /** The active ("Active" checked) webhooks that post new logs or session summaries, in order; may be empty. */
  webhooksFor(webhooks: DiscordWebhook[], kind: "logs" | "sessions"): DiscordWebhook[] {
    return webhooks.filter((w) => w.enabled && (w.content === "all" || w.content === kind));
  },

  /**
   * The webhook's filters for one log: none of its excluded accounts is in the squad, and — when it lists a group —
   * at least `minAccounts` of the group (all of them, if it lists fewer) are.
   */
  passesLogFilter(
    webhook: Pick<DiscordWebhook, "accounts" | "minAccounts" | "excludedAccounts">,
    log: Pick<Log, "accounts">,
  ): boolean {
    const squad = new Set(log.accounts.map((a) => a.toLowerCase()));
    if (webhook.excludedAccounts.some((a) => squad.has(a.toLowerCase()))) return false;
    if (!webhook.accounts.length) return true;
    const needed = Math.min(webhook.minAccounts, webhook.accounts.length);
    return webhook.accounts.filter((a) => squad.has(a.toLowerCase())).length >= needed;
  },

  /**
   * The webhook's filters for a session: no log has an excluded account, and — when it lists a group — at least one
   * log has enough of the group. Then the whole summary is posted.
   */
  passesSessionFilter(
    webhook: Pick<DiscordWebhook, "accounts" | "minAccounts" | "excludedAccounts">,
    logs: Pick<Log, "accounts">[],
  ): boolean {
    const excluded = new Set(webhook.excludedAccounts.map((a) => a.toLowerCase()));
    if (logs.some((log) => log.accounts.some((a) => excluded.has(a.toLowerCase())))) return false;
    if (!webhook.accounts.length) return true;
    const groupOnly = { ...webhook, excludedAccounts: [] };
    return logs.some((log) => discordService.passesLogFilter(groupOnly, log));
  },

  /**
   * Posts newly imported logs to every webhook that posts logs (up to 10 per message), each getting only the logs
   * its filters let through. Never throws: a broken webhook must not make the import itself fail.
   */
  async notifyNewLogs(webhooks: DiscordWebhook[], logs: Log[]): Promise<void> {
    for (const webhook of discordService.webhooksFor(webhooks, "logs")) {
      await postLogs(webhook.url, logs.filter((log) => discordService.passesLogFilter(webhook, log)));
    }
  },

  /**
   * One message summarising a finished session; returns its message ID (null when nothing was posted).
   * Never throws, like notifyNewLogs.
   */
  async notifySession(
    webhookUrl: string,
    session: Session,
    logs: Log[],
    span: LogSpan,
    owner: string,
  ): Promise<string | null> {
    if (!logs.length) return null;
    try {
      return await postToWebhook(webhookUrl, { username: DISCORD_USERNAME, embeds: [sessionEmbed(session, logs, span, owner)] });
    } catch (err) {
      console.warn("Discord webhook failed:", err instanceof Error ? err.message : err);
      return null;
    }
  },

  /** Rewrites a session summary posted earlier (e.g. after a rename). Never throws: the message may be deleted. */
  async updateSession(
    webhookUrl: string,
    messageId: string,
    session: Session,
    logs: Log[],
    span: LogSpan,
    owner: string,
  ): Promise<void> {
    try {
      await editWebhookMessage(webhookUrl, messageId, { embeds: [sessionEmbed(session, logs, span, owner)] });
    } catch (err) {
      console.warn("Discord message edit failed:", err instanceof Error ? err.message : err);
    }
  },

  /** Deletes a session summary posted earlier (its session has no logs left). Never throws, like updateSession. */
  async deleteSession(webhookUrl: string, messageId: string): Promise<void> {
    try {
      await deleteWebhookMessage(webhookUrl, messageId);
    } catch (err) {
      console.warn("Discord message delete failed:", err instanceof Error ? err.message : err);
    }
  },

  /** Sends a test message; throws DISCORD_WEBHOOK_FAILED so the user sees that the URL doesn't work. */
  async sendTest(webhookUrl: string, content: DiscordContent): Promise<void> {
    try {
      await postToWebhook(webhookUrl, { username: DISCORD_USERNAME, content: TEST_MESSAGES[content] });
    } catch (err) {
      console.warn("Discord webhook test failed:", err instanceof Error ? err.message : err);
      throw discordWebhookFailed();
    }
  },
};
