import type { Request, Response } from "express";
import { appLoginService } from "../services/appLoginService";
import type { AuthLocals } from "../types/auth.types";
import { appLoginCreateSchema, appLoginPollSchema, idParamSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

/** "Sign in with the browser" for the desktop uploader and the Nexus addon (see appLoginService). */
export const appLoginController = {
  /** Public: the app starts a request -> `{ id, secret, code, expiresAt }`. */
  async create(req: Request, res: Response) {
    const { client } = validate(appLoginCreateSchema, req.body);
    res.status(201).json(await appLoginService.create(client));
  },

  /** Public (needs the secret): the app polls -> `{ status }`, plus `token` and `user` once approved. */
  async poll(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const { secret } = validate(appLoginPollSchema, req.body);
    res.json(await appLoginService.poll(id, secret));
  },

  /** Signed in: what the website's confirmation page shows (the code and which app). */
  async info(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ request: await appLoginService.info(id) });
  },

  async approve(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await appLoginService.approve(id, res.locals.userId);
    res.status(204).end();
  },

  async deny(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await appLoginService.deny(id);
    res.status(204).end();
  },
};
