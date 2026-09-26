import type { EiJson, EiPlayer, UploadMetadata } from "../types/dpsreport.types";
import type { LogSummary, PlayerSummary } from "../types/log.types";
import { parseEiDate } from "../utils/date";
import { classifyEncounter } from "./encounterClassifier";

function toPlayerSummary(p: EiPlayer): PlayerSummary {
  return {
    account: p.account,
    name: p.name,
    profession: p.profession,
    group: p.group,
    dps: Math.round((p.dpsTargets ?? []).reduce((sum, t) => sum + (t[0]?.dps ?? 0), 0)),
    totalDps: Math.round(p.dpsAll?.[0]?.dps ?? 0),
    downs: p.defenses?.[0]?.downCount ?? 0,
    deaths: p.defenses?.[0]?.deadCount ?? 0,
    commander: !!p.hasCommanderTag,
  };
}

/** Builds a summary from the full Elite Insights JSON. */
export function parseFromEliteInsights(permalink: string, url: string, ei: EiJson, meta: UploadMetadata): LogSummary {
  const players = (ei.players ?? [])
    .filter((p) => !p.isFake && !p.friendlyNPC)
    .map(toPlayerSummary)
    .sort((a, b) => b.dps - a.dps);

  const mainTarget = (ei.targets ?? []).find((t) => !t.isFake && !t.enemyPlayer);
  const burned = mainTarget?.healthPercentBurned;
  const triggerId = ei.triggerID ?? meta.encounter.bossId ?? null;

  return {
    permalink,
    url,
    bossName: ei.fightName,
    bossIcon: ei.fightIcon ?? null,
    triggerId,
    ...classifyEncounter(triggerId, ei.fightName),
    success: ei.success,
    isCM: !!ei.isCM,
    isLegendaryCM: !!ei.isLegendaryCM,
    durationMs: ei.durationMS ?? meta.encounter.duration * 1000,
    bossHealthLeft: burned != null ? Math.max(0, Math.round((100 - burned) * 100) / 100) : null,
    encounterTime: parseEiDate(ei.timeStartStd) ?? new Date(meta.encounterTime * 1000),
    recordedBy: ei.recordedAccountBy ?? ei.recordedBy ?? null,
    gw2Build: ei.gW2Build ?? meta.encounter.gw2Build ?? null,
    eliteInsightsVersion: ei.eliteInsightsVersion ?? null,
    players,
    accounts: players.map((p) => p.account),
  };
}

/** Builds a (less detailed) summary from dps.report upload metadata only. */
export function parseFromMetadata(permalink: string, url: string, meta: UploadMetadata): LogSummary {
  const e = meta.encounter;
  const players: PlayerSummary[] = Object.entries(meta.players ?? {}).map(([account, p]) => ({
    account: p.display_name || account,
    name: p.character_name,
    profession: "",
    group: 0,
    dps: 0,
    totalDps: 0,
    downs: 0,
    deaths: 0,
    commander: false,
  }));

  return {
    permalink,
    url,
    bossName: e.boss,
    bossIcon: null,
    triggerId: e.bossId ?? null,
    ...classifyEncounter(e.bossId ?? null, e.boss),
    success: e.success,
    isCM: e.isCm,
    isLegendaryCM: false,
    durationMs: e.duration * 1000,
    bossHealthLeft: null,
    encounterTime: new Date(meta.encounterTime * 1000),
    recordedBy: null,
    gw2Build: e.gw2Build ?? null,
    eliteInsightsVersion: null,
    players,
    accounts: players.map((p) => p.account),
  };
}
