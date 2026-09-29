export interface ClearBoss {
  key: string;
  name: string;
  /** Killed (any mode) since the reset. */
  cleared: boolean;
}

export interface ClearGroup {
  id: string;
  /** Raid wings come first, then strike groups. */
  category: "raid" | "strike";
  /** "W1", "VoE", … */
  short: string;
  name: string;
  bosses: ClearBoss[];
}

/** Raid and strike bosses killed since the weekly reset — shown by the desktop uploader and the Nexus addon. */
export interface WeeklyClears {
  /** Last weekly reset (Monday 07:30 UTC), ISO string. */
  resetAt: string;
  /** Next weekly reset, ISO string. */
  nextResetAt: string;
  groups: ClearGroup[];
}
