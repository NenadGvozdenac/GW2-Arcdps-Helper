import type { Request, Response } from "express";
import { buildService } from "../services/buildService";
import type { AuthLocals } from "../types/auth.types";
import {
  buildDetailsSchema,
  buildSearchSchema,
  favoriteBuildSchema,
  idParamSchema,
  moveFavoriteBuildSchema,
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

  async removeFavorite(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await buildService.removeFavorite(res.locals.userId, id);
    res.status(204).end();
  },
};
