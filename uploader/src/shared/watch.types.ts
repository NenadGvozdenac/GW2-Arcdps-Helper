export interface WatchState {
  /** True while the log folder is being watched for new ArcDPS logs. */
  watching: boolean;
  /** When watching started (ISO), null when stopped. */
  startedAt: string | null;
}
