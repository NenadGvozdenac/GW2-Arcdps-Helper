import type { Request, Response } from "express";
import { buildService } from "../services/buildService";
import type { AuthLocals } from "../types/auth.types";
import type { CustomBuildInput } from "../types/build.types";
import {
  buildDetailsSchema,
  buildSearchSchema,
  customBuildSchema,
  favoriteBuildSchema,
  idParamSchema,
  moveFavoriteBuildSchema,
  shareTokenParamSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";

export const buildController = {
  /** GET /builds/search?q=power+virtuoso — Snow Crows builds of the specialization named, best matches first. */
  async search(req: Request, res: Response<unknown, AuthLocals>) {
    const { q } = validate(buildSearchSchema, req.query);
    res.json({ builds: await buildService.search(q) });
  },

  /** GET /builds/details?url=https://snowcrows.com/builds/… — template and gear of one build. */
  async details(req: Request, res: Response<unknown, AuthLocals>) {
    const { url } = validate(buildDetailsSchema, req.query);
    res.json({ build: await buildService.details(url) });
  },

  async listFavorites(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ builds: await buildService.listFavorites(res.locals.userId) });
  },

  /** POST /builds/favorites `{ url }` — fetched from Snow Crows and saved, categories from its Snow Crows roles. */
  async addFavorite(req: Request, res: Response<unknown, AuthLocals>) {
    const { url } = validate(favoriteBuildSchema, req.body);
    res.status(201).json({ build: await buildService.addFavorite(res.locals.userId, url) });
  },

  /** POST /builds/favorites/refresh — fetches every favorite again; `changed` / `failed` are favorite ids. */
  async refreshFavorites(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json(await buildService.refreshFavorites(res.locals.userId));
  },

  /** POST /builds/favorites/:id/move `{ overId }` — drag & drop: the favorite takes the place of `overId`. */
  async moveFavorite(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    const { overId } = validate(moveFavoriteBuildSchema, req.body);
    await buildService.moveFavorite(res.locals.userId, id, overId);
    res.status(204).end();
  },

  /** POST /builds/custom — saves a build made in the website's editor. */
  async createCustom(req: Request, res: Response<unknown, AuthLocals>) {
    const input: CustomBuildInput = validate(customBuildSchema, req.body);
    res.status(201).json({ build: await buildService.createCustom(res.locals.userId, input) });
  },

  /** PUT /builds/custom/:id — saves the editor's changes. */
  async updateCustom(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    const input: CustomBuildInput = validate(customBuildSchema, req.body);
    res.json({ build: await buildService.updateCustom(res.locals.userId, id, input) });
  },

  /** POST /builds/favorites/:id/share — creates the public link (or returns the existing one). */
  async share(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ build: await buildService.share(res.locals.userId, id) });
  },

  async unshare(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ build: await buildService.unshare(res.locals.userId, id) });
  },

  /** GET /shared/builds/:token — public: anyone with the link. */
  async shared(req: Request, res: Response) {
    const { token } = validate(shareTokenParamSchema, req.params);
    res.json(await buildService.getShared(token));
  },

  async removeFavorite(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await buildService.removeFavorite(res.locals.userId, id);
    res.status(204).end();
  },
};
