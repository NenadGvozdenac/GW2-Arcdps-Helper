import type { FavoriteBuild, GearItem, GearPiece, GearWeapon } from "../domain/types/build.types";
import { ValidationError } from "../domain/types/validation.types";
import { buildRepository } from "../repositories/buildRepository";

/** One stat combination of an armor / trinket set: "Berserker's" ×5, or the odd one out with its slots. */
export interface StatGroup {
  stat: string;
  count: number;
  slots: string[];
}

/** Items of the same id counted once: six identical runes → one rune ×6. */
export interface ItemCount {
  item: GearItem;
  count: number;
}

export const buildService = {
  search(query: string) {
    const q = query.trim();
    if (!q) throw new ValidationError("validation.buildQueryRequired");
    return buildRepository.search(q);
  },

  details: buildRepository.details,
  listFavorites: buildRepository.listFavorites,
  addFavorite: buildRepository.addFavorite,
  refreshFavorites: buildRepository.refreshFavorites,
  moveFavorite: buildRepository.moveFavorite,
  removeFavorite: buildRepository.removeFavorite,
  share: buildRepository.share,
  unshare: buildRepository.unshare,
  getShared: buildRepository.getShared,

  /** Whether the latest refresh found the build changed on Snow Crows. */
  changedByLastRefresh: (build: FavoriteBuild): boolean =>
    !!build.changedAt && build.changedAt.getTime() === build.fetchedAt.getTime(),

  /** Pieces grouped by stat, the most common first. */
  statGroups(pieces: GearPiece[]): StatGroup[] {
    const groups = new Map<string, StatGroup>();
    for (const p of pieces) {
      const g = groups.get(p.stat) ?? { stat: p.stat, count: 0, slots: [] };
      g.count++;
      g.slots.push(p.slot);
      groups.set(p.stat, g);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  },

  /** Same items counted once, in first-seen order. */
  countItems(items: GearItem[]): ItemCount[] {
    const counts = new Map<number, ItemCount>();
    for (const item of items) {
      const c = counts.get(item.id);
      if (c) c.count++;
      else counts.set(item.id, { item, count: 1 });
    }
    return [...counts.values()];
  },

  /** Weapons by set ("Primary", "Secondary"), in page order. */
  weaponSets(weapons: GearWeapon[]): { set: string; weapons: GearWeapon[] }[] {
    const sets = new Map<string, GearWeapon[]>();
    for (const w of weapons) sets.set(w.set, [...(sets.get(w.set) ?? []), w]);
    return [...sets].map(([set, list]) => ({ set, weapons: list }));
  },

  /**
   * "Superior Sigil of Force" → "Sigil of Force" (every rune / sigil in builds is Superior), "Relic of the Fractal" →
   * "Fractal" (it's on the "Relic" row).
   */
  shortItemName: (name: string): string => name.replace(/^Superior /, "").replace(/^Relic of (the )?/, ""),
};
