import type { Boon } from "../types/log.types";

/** Boons stored per player (same set as the server's BOON_IDS), in the order the session export shows them. */
export const BOONS = [
  "might",
  "fury",
  "quickness",
  "alacrity",
  "protection",
  "regeneration",
  "vigor",
  "aegis",
  "stability",
  "swiftness",
  "resistance",
  "resolution",
] as const;

/**
 * Boons measured in average stacks rather than % uptime (intensity buffs), with the value that counts as "full" for
 * coloring. Every other boon is a % uptime with 100 as full.
 */
export const BOON_STACK_MAX: ReadonlyMap<Boon, number> = new Map<Boon, number>([
  ["might", 25],
  ["stability", 10],
]);
