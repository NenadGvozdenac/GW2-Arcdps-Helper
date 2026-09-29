import type { Language } from "./languages";

export type { Language } from "./languages";

/** User-editable settings. Server URLs are not here — they come from the build environment. */
export interface Settings {
  /** ArcDPS log folder (arcdps.cbtlogs); watched recursively. */
  logFolder: string;
  /** Start watching the log folder as soon as the app starts (when signed in). */
  watchOnStartup: boolean;
  language: Language;
  desktopNotifications: boolean;
}
