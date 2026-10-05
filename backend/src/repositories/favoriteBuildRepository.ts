import { and, asc, count, desc, eq, min } from "drizzle-orm";
import { getDb } from "../db/pool";
import { favoriteBuilds } from "../db/schema";
import type { BuildCategory, BuildDetails, FavoriteBuild } from "../types/build.types";

const columns = {
  id: favoriteBuilds.id,
  url: favoriteBuilds.url,
  name: favoriteBuilds.name,
  weapons: favoriteBuilds.weapons,
  profession: favoriteBuilds.profession,
  specialization: favoriteBuilds.specialization,
  template: favoriteBuilds.template,
  updated: favoriteBuilds.updated,
  gear: favoriteBuilds.gear,
  categories: favoriteBuilds.categories,
  fetchedAt: favoriteBuilds.fetchedAt,
  changedAt: favoriteBuilds.changedAt,
  createdAt: favoriteBuilds.createdAt,
};

/** The user's manual order (drag & drop), newest first among equal places. */
const displayOrder = [asc(favoriteBuilds.sortOrder), desc(favoriteBuilds.createdAt), desc(favoriteBuilds.id)];

const own = (userId: string, id: string) => and(eq(favoriteBuilds.userId, userId), eq(favoriteBuilds.id, id));

/** The snapshot columns of a build page, taken at `fetchedAt`. */
const snapshot = (build: BuildDetails, fetchedAt = new Date()) => ({
  name: build.name,
  weapons: build.weapons,
  profession: build.profession,
  specialization: build.specialization,
  template: build.template,
  updated: build.updated,
  gear: build.gear,
  fetchedAt,
});

export const favoriteBuildRepository = {
  /** In the user's order. */
  async list(userId: string): Promise<FavoriteBuild[]> {
    return getDb()
      .select(columns)
      .from(favoriteBuilds)
      .where(eq(favoriteBuilds.userId, userId))
      .orderBy(...displayOrder);
  },

  async count(userId: string): Promise<number> {
    const [row] = await getDb().select({ n: count() }).from(favoriteBuilds).where(eq(favoriteBuilds.userId, userId));
    return row.n;
  },

  async existsByUrl(userId: string, url: string): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: favoriteBuilds.id })
      .from(favoriteBuilds)
      .where(and(eq(favoriteBuilds.userId, userId), eq(favoriteBuilds.url, url)));
    return !!row;
  },

  /**
   * Adds the build at the top of the user's order, or (already a favorite) refreshes its snapshot and categories,
   * keeping its place.
   */
  async upsert(userId: string, build: BuildDetails, categories: BuildCategory[]): Promise<FavoriteBuild> {
    const db = getDb();
    const [{ lowest }] = await db
      .select({ lowest: min(favoriteBuilds.sortOrder) })
      .from(favoriteBuilds)
      .where(eq(favoriteBuilds.userId, userId));
    const [row] = await db
      .insert(favoriteBuilds)
      .values({ userId, url: build.url, categories, sortOrder: (lowest ?? 1) - 1, ...snapshot(build) })
      .onConflictDoUpdate({
        target: [favoriteBuilds.userId, favoriteBuilds.url],
        set: { categories, ...snapshot(build) },
      })
      .returning(columns);
    return row;
  },

  /** Takes a new snapshot; `changed` (it differs from the previous one) marks the build as changed by this refresh. */
  async refresh(
    userId: string,
    id: string,
    build: BuildDetails,
    categories: BuildCategory[],
    changed: boolean,
  ): Promise<FavoriteBuild | null> {
    const fetchedAt = new Date();
    const [row] = await getDb()
      .update(favoriteBuilds)
      .set({ ...snapshot(build, fetchedAt), categories, ...(changed && { changedAt: fetchedAt }) })
      .where(own(userId, id))
      .returning(columns);
    return row ?? null;
  },

  /**
   * Moves favorite `id` to where `overId` is in the user's order (drag & drop) and stores the whole order: each
   * favorite gets its index. False if either isn't the user's.
   */
  async move(userId: string, id: string, overId: string): Promise<boolean> {
    return getDb().transaction(async (tx) => {
      const rows = await tx
        .select({ id: favoriteBuilds.id })
        .from(favoriteBuilds)
        .where(eq(favoriteBuilds.userId, userId))
        .orderBy(...displayOrder);
      const ids = rows.map((r) => r.id);
      const from = ids.indexOf(id);
      const to = ids.indexOf(overId);
      if (from < 0 || to < 0) return false;
      ids.splice(to, 0, ...ids.splice(from, 1));
      for (const [index, buildId] of ids.entries()) {
        await tx.update(favoriteBuilds).set({ sortOrder: index }).where(own(userId, buildId));
      }
      return true;
    });
  },

  /** false if the user has no such favorite. */
  async remove(userId: string, id: string): Promise<boolean> {
    const rows = await getDb().delete(favoriteBuilds).where(own(userId, id)).returning({ id: favoriteBuilds.id });
    return rows.length > 0;
  },
};
