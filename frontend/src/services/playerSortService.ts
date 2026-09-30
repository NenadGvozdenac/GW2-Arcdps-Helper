import type { PlayerSummary } from "../domain/types/log.types";
import { playerSortStorage } from "../storage/playerSortStorage";

export type PlayerSortField = "bossDps" | "group" | "totalDps" | "downs" | "deaths";
export type PlayerSortDirection = "asc" | "desc";
export interface PlayerSort {
  field: PlayerSortField;
  direction: PlayerSortDirection;
}

const FIELDS: { field: PlayerSortField; value: (p: PlayerSummary) => number }[] = [
  { field: "bossDps", value: (p) => p.dps },
  { field: "group", value: (p) => p.group },
  { field: "totalDps", value: (p) => p.totalDps },
  { field: "downs", value: (p) => p.downs },
  { field: "deaths", value: (p) => p.deaths },
];

export const DEFAULT_PLAYER_SORT: PlayerSort = { field: "bossDps", direction: "desc" };

export const playerSortService = {
  /** Every option of the sort menu, in menu order: Boss DPS first, then the subgroup, then the rest. */
  options(): PlayerSort[] {
    return FIELDS.flatMap(({ field }): PlayerSort[] => [
      { field, direction: "desc" },
      { field, direction: "asc" },
    ]);
  },

  toKey: (sort: PlayerSort) => `${sort.field}-${sort.direction}`,

  fromKey(key: string): PlayerSort {
    const [field, direction] = key.split("-");
    const known = FIELDS.some((f) => f.field === field) && (direction === "asc" || direction === "desc");
    return known ? { field: field as PlayerSortField, direction } : DEFAULT_PLAYER_SORT;
  },

  /** A sorted copy; ties (e.g. players of the same subgroup) are ordered by boss DPS, highest first. */
  sort(players: readonly PlayerSummary[], sort: PlayerSort): PlayerSummary[] {
    const { value } = FIELDS.find((f) => f.field === sort.field)!;
    const sign = sort.direction === "asc" ? 1 : -1;
    return [...players].sort((a, b) => sign * (value(a) - value(b)) || b.dps - a.dps);
  },

  /** The last choice in this browser, or Boss DPS highest first. */
  saved: (): PlayerSort => {
    const key = playerSortStorage.get();
    return key ? playerSortService.fromKey(key) : DEFAULT_PLAYER_SORT;
  },

  save: (sort: PlayerSort) => playerSortStorage.set(playerSortService.toKey(sort)),
};
