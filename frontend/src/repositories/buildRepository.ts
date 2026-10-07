import type {
  BuildCategory,
  BuildDetails,
  BuildGear,
  BuildSearchResult,
  FavoriteBuild,
  FavoritesRefresh,
} from "../domain/types/build.types";
import { http } from "./httpClient";

/** POST / PUT /builds/custom: a build made in the editor, its gear and template rendered here. */
export interface CustomBuildInput {
  name: string;
  profession: string;
  specialization: string;
  weapons: string;
  template: string | null;
  gear: BuildGear;
  categories: BuildCategory[];
  custom: unknown;
}

/** Favorite build as serialized over JSON (dates are ISO strings). */
type FavoriteBuildDto = Omit<FavoriteBuild, "fetchedAt" | "changedAt" | "createdAt"> & {
  fetchedAt: string;
  changedAt: string | null;
  createdAt: string;
};

const toFavorite = (dto: FavoriteBuildDto): FavoriteBuild => ({
  ...dto,
  fetchedAt: new Date(dto.fetchedAt),
  changedAt: dto.changedAt ? new Date(dto.changedAt) : null,
  createdAt: new Date(dto.createdAt),
});

const favoritePath = (id: string) => `/builds/favorites/${encodeURIComponent(id)}`;

export const buildRepository = {
  /** 400 BUILD_SPEC_UNKNOWN when the query names no specialization; 502 SNOW_CROWS_UNAVAILABLE. */
  async search(query: string): Promise<BuildSearchResult[]> {
    const { builds } = await http.get<{ builds: BuildSearchResult[] }>(
      `/builds/search?q=${encodeURIComponent(query)}`,
    );
    return builds;
  },

  async details(url: string): Promise<BuildDetails> {
    const { build } = await http.get<{ build: BuildDetails }>(`/builds/details?url=${encodeURIComponent(url)}`);
    return build;
  },

  async listFavorites(): Promise<FavoriteBuild[]> {
    const { builds } = await http.get<{ builds: FavoriteBuildDto[] }>("/builds/favorites");
    return builds.map(toFavorite);
  },

  /** Categories come from the build's Snow Crows roles. */
  async addFavorite(url: string): Promise<FavoriteBuild> {
    const { build } = await http.post<{ build: FavoriteBuildDto }>("/builds/favorites", { url });
    return toFavorite(build);
  },

  async refreshFavorites(): Promise<FavoritesRefresh> {
    const res = await http.post<Omit<FavoritesRefresh, "builds"> & { builds: FavoriteBuildDto[] }>(
      "/builds/favorites/refresh",
    );
    return { ...res, builds: res.builds.map(toFavorite) };
  },

  /** Saves a build made in the editor. */
  async createCustom(input: CustomBuildInput): Promise<FavoriteBuild> {
    const { build } = await http.post<{ build: FavoriteBuildDto }>("/builds/custom", input);
    return toFavorite(build);
  },

  async updateCustom(id: string, input: CustomBuildInput): Promise<FavoriteBuild> {
    const { build } = await http.put<{ build: FavoriteBuildDto }>(`/builds/custom/${encodeURIComponent(id)}`, input);
    return toFavorite(build);
  },

  /** Drag & drop: the favorite takes the place of `overId`. */
  moveFavorite: (id: string, overId: string) => http.post<void>(`${favoritePath(id)}/move`, { overId }),

  removeFavorite: (id: string) => http.delete(favoritePath(id)),
};
