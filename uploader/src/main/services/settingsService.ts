import type { Settings } from "../../shared/settings.types";
import { stateStore } from "./stateStore";
import { watchService } from "./watchService";

export const settingsService = {
  save(patch: Partial<Settings>): void {
    const current = stateStore.getSettings();
    const next: Settings = { ...current, ...patch };
    next.logFolder = next.logFolder.trim();

    stateStore.setSettings(next);
    if (next.logFolder !== current.logFolder) watchService.restartIfWatching();
  },
};
