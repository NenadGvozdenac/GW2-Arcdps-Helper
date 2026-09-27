import { app } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Settings } from "../../shared/settings.types";
import { createJsonStore } from "./jsonStore";

/** Default ArcDPS folder: Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs (if it exists). */
function defaultLogFolder(): string {
  const candidate = join(app.getPath("documents"), "Guild Wars 2", "addons", "arcdps", "arcdps.cbtlogs");
  return existsSync(candidate) ? candidate : "";
}

function defaults(): Settings {
  const locale = app.getLocale().toLowerCase().split("-")[0];
  return {
    logFolder: defaultLogFolder(),
    watchOnStartup: true,
    language: ["sr", "sh", "hr", "bs", "me"].includes(locale) ? "sr" : "en",
    desktopNotifications: true,
  };
}

/** Older versions also stored the dps.report token here; it now lives on the account (website). */
type StoredSettings = Partial<Settings> & { dpsReportToken?: string };

const store = createJsonStore<StoredSettings>("settings.json", () => ({}));

export const settingsRepository = {
  /** Stored values merged over defaults, so newly added settings always have a value. */
  load(): Settings {
    const stored = store.read();
    const merged = { ...defaults(), ...stored };
    // Only known keys, so settings removed in newer versions (e.g. apiUrl) disappear.
    const { logFolder, watchOnStartup, language, desktopNotifications } = merged;
    return { logFolder, watchOnStartup, language, desktopNotifications };
  },
  save(settings: Settings): void {
    store.write(settings);
  },

  /** A dps.report token saved by an older version ("" if none), for the one-time move to the account. */
  legacyDpsReportToken(): string {
    return store.read().dpsReportToken?.trim() ?? "";
  },
  /** Rewrites settings.json with the known keys only, which drops the legacy token. */
  clearLegacyDpsReportToken(): void {
    store.write(settingsRepository.load());
  },
};
