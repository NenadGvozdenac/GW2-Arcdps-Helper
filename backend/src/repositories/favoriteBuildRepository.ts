import { and, asc, count, desc, eq, min, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { favoriteBuilds } from "../db/schema";
import type { BuildCategory, BuildDetails, BuildGear, CustomBuildInput, FavoriteBuild } from "../types/build.types";

const columns = {
  id: favoriteBuilds.id,
  kind: favoriteBuilds.kind,
  url: favoriteBuilds.url,
  custom: favoriteBuilds.custom,
  name: favoriteBuilds.name,
  weapons: favoriteBuilds.weapons,
  profession: favoriteBuilds.profession,
  specialization: favoriteBuilds.specialization,
  template: favoriteBuilds.template,
  updated: favoriteBuilds.updated,
  benchmark: favoriteBuilds.benchmark,
  gear: favoriteBuilds.gear,
  categories: favoriteBuilds.categories,
  fetchedAt: favoriteBuilds.fetchedAt,
  changedAt: favoriteBuilds.changedAt,
  shareToken: favoriteBuilds.shareToken,
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
  benchmark: build.benchmark,
  gear: build.gear,
  fetchedAt,
});

/** The columns of a custom build (its "snapshot" is what the editor rendered). */
const customColumns = (input: CustomBuildInput) => ({
  name: input.name,
  weapons: input.weapons,
  profession: input.profession,
  specialization: input.specialization,
  template: input.template,
  updated: null,
  benchmark: null,
  gear: input.gear as unknown as BuildGear,
  categories: input.categories,
  custom: input.custom,
  fetchedAt: sql`now()`,
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

  /** Saves a build made in the editor at the top of the user's order. */
  async createCustom(userId: string, input: CustomBuildInput): Promise<FavoriteBuild> {
    const db = getDb();
    const [{ lowest }] = await db
      .select({ lowest: min(favoriteBuilds.sortOrder) })
      .from(favoriteBuilds)
      .where(eq(favoriteBuilds.userId, userId));
    const [row] = await db
      .insert(favoriteBuilds)
      .values({ userId, kind: "custom", url: null, sortOrder: (lowest ?? 1) - 1, ...customColumns(input) })
      .returning(columns);
    return row;
  },

  /** Saves the editor's changes to a custom build; null if the user has no such custom build. */
  async updateCustom(userId: string, id: string, input: CustomBuildInput): Promise<FavoriteBuild | null> {
    const [row] = await getDb()
      .update(favoriteBuilds)
      .set(customColumns(input))
      .where(and(own(userId, id), eq(favoriteBuilds.kind, "custom")))
      .returning(columns);
    return row ?? null;
  },

  async findById(userId: string, id: string): Promise<FavoriteBuild | null> {
    const [row] = await getDb().select(columns).from(favoriteBuilds).where(own(userId, id));
    return row ?? null;
  },

  /** Creates (a token) or revokes (null) the build's public link; null if the user has no such build. */
  async setShareToken(userId: string, id: string, shareToken: string | null): Promise<FavoriteBuild | null> {
    const [row] = await getDb().update(favoriteBuilds).set({ shareToken }).where(own(userId, id)).returning(columns);
    return row ?? null;
  },

  /** The shared build of this link, with its owner; null for an unknown (or revoked) link. */
  async findByShareToken(shareToken: string): Promise<(FavoriteBuild & { userId: string }) | null> {
    const [row] = await getDb()
      .select({ ...columns, userId: favoriteBuilds.userId })
      .from(favoriteBuilds)
      .where(eq(favoriteBuilds.shareToken, shareToken))
      .limit(1);
    return row ?? null;
  },

  /** false if the user has no such favorite. */
  async remove(userId: string, id: string): Promise<boolean> {
    const rows = await getDb().delete(favoriteBuilds).where(own(userId, id)).returning({ id: favoriteBuilds.id });
    return rows.length > 0;
  },
};
