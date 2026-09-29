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
  return {
    logFolder: defaultLogFolder(),
    watchOnStartup: true,
    language: "en",
    desktopNotifications: true,
  };
}

const store = createJsonStore<Partial<Settings>>("settings.json", () => ({}));

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
};
