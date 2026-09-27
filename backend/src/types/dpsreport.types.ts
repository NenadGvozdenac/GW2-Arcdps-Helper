/** Response of dps.report's /uploadContent?json=1 (only what we read). */
export interface DpsReportUploadResponse {
  permalink?: string;
  error?: string | null;
}

/** Subset of the Elite Insights JSON returned by `https://dps.report/getJson`. */
export interface EiJson {
  fightName: string;
  fightIcon?: string;
  triggerID?: number;
  eiEncounterID?: number;
  isCM?: boolean;
  isLegendaryCM?: boolean;
  success: boolean;
  durationMS?: number;
  timeStartStd?: string;
  recordedBy?: string;
  recordedAccountBy?: string;
  gW2Build?: number;
  eliteInsightsVersion?: string;
  targets?: EiTarget[];
  players?: EiPlayer[];
}

export interface EiTarget {
  name: string;
  healthPercentBurned?: number;
  isFake?: boolean;
  enemyPlayer?: boolean;
}

export interface EiPlayer {
  account: string;
  name: string;
  profession: string;
  group: number;
  hasCommanderTag?: boolean;
  isFake?: boolean;
  friendlyNPC?: boolean;
  dpsAll?: { dps: number }[];
  dpsTargets?: { dps: number }[][];
  defenses?: { downCount?: number; deadCount?: number }[];
}

/** Response of `https://dps.report/getUploadMetadata` (fallback when the JSON isn't available). */
export interface UploadMetadata {
  permalink: string;
  encounterTime: number;
  evtc?: { type?: string };
  encounter: {
    boss: string;
    bossId: number;
    success: boolean;
    isCm: boolean;
    duration: number;
    gw2Build?: number;
  };
  players?: Record<string, UploadMetadataPlayer>;
}

export interface UploadMetadataPlayer {
  display_name: string;
  character_name: string;
  profession: number;
  elite_spec: number;
}
