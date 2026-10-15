import { INSTABILITIES_GROUP_BY_STORAGE_KEY } from "../config/constants";
import type { InstabilityGroupBy } from "../domain/types/instability.types";

const VALUES: InstabilityGroupBy[] = ["fractal", "instability", "playOrder"];

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored" (per fractal).
export const instabilitiesGroupByStorage = {
  get(): InstabilityGroupBy {
    try {
      const stored = localStorage.getItem(INSTABILITIES_GROUP_BY_STORAGE_KEY);
      return VALUES.find((v) => v === stored) ?? "fractal";
    } catch {
      return "fractal";
    }
  },
  set(groupBy: InstabilityGroupBy): void {
    try {
      localStorage.setItem(INSTABILITIES_GROUP_BY_STORAGE_KEY, groupBy);
    } catch {
      /* ignore */
    }
  },
};
