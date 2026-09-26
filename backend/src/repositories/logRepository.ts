import { getPool } from "../db/pool";
import type { Log, LogRow, LogSummary } from "../types/log.types";

const toLog = (r: LogRow): Log => ({
  id: r.id,
  ownerId: r.owner_id,
  permalink: r.permalink,
  url: r.url,
  bossName: r.boss_name,
  bossIcon: r.boss_icon,
  triggerId: r.trigger_id,
  encounterKey: r.encounter_key,
  groupId: r.group_id,
  category: r.category,
  success: r.success,
  isCM: r.is_cm,
  isLegendaryCM: r.is_legendary_cm,
  durationMs: r.duration_ms,
  bossHealthLeft: r.boss_health_left,
  encounterTime: r.encounter_time,
  recordedBy: r.recorded_by,
  gw2Build: r.gw2_build,
  eliteInsightsVersion: r.elite_insights_version,
  players: r.players,
  accounts: r.accounts,
  uploadedAt: r.uploaded_at,
});

export const logRepository = {
  async listByOwner(ownerId: string): Promise<Log[]> {
    const { rows } = await getPool().query<LogRow>(
      "SELECT * FROM logs WHERE owner_id = $1 ORDER BY encounter_time DESC",
      [ownerId],
    );
    return rows.map(toLog);
  },

  async findById(ownerId: string, id: string): Promise<Log | null> {
    const { rows } = await getPool().query<LogRow>("SELECT * FROM logs WHERE owner_id = $1 AND id = $2", [
      ownerId,
      id,
    ]);
    return rows[0] ? toLog(rows[0]) : null;
  },

  async findByPermalink(ownerId: string, permalink: string): Promise<Log | null> {
    const { rows } = await getPool().query<LogRow>("SELECT * FROM logs WHERE owner_id = $1 AND permalink = $2", [
      ownerId,
      permalink,
    ]);
    return rows[0] ? toLog(rows[0]) : null;
  },

  /** Returns the new id, or null if this owner already has the permalink (e.g. concurrent submit). */
  async create(ownerId: string, s: LogSummary): Promise<string | null> {
    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO logs (
         owner_id, permalink, url, boss_name, boss_icon, trigger_id, encounter_key, group_id, category,
         success, is_cm, is_legendary_cm, duration_ms, boss_health_left, encounter_time, recorded_by,
         gw2_build, elite_insights_version, players, accounts
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (owner_id, permalink) DO NOTHING
       RETURNING id`,
      [
        ownerId, s.permalink, s.url, s.bossName, s.bossIcon, s.triggerId, s.encounterKey, s.groupId, s.category,
        s.success, s.isCM, s.isLegendaryCM, s.durationMs, s.bossHealthLeft, s.encounterTime, s.recordedBy,
        s.gw2Build, s.eliteInsightsVersion, JSON.stringify(s.players), s.accounts,
      ],
    );
    return rows[0]?.id ?? null;
  },

  async delete(ownerId: string, id: string): Promise<boolean> {
    const res = await getPool().query("DELETE FROM logs WHERE owner_id = $1 AND id = $2", [ownerId, id]);
    return (res.rowCount ?? 0) > 0;
  },
};
