import type { Request, Response } from "express";
import { sessionService } from "../services/sessionService";
import type { AuthLocals } from "../types/auth.types";
import { idParamSchema, shareTokenParamSchema, startSessionSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const sessionController = {
  async list(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ sessions: await sessionService.list(res.locals.userId) });
  },

  /** The active session, plus (when there is none) the last session if it expired and can be resumed. */
  async active(_req: Request, res: Response<unknown, AuthLocals>) {
    const session = await sessionService.getActive(res.locals.userId);
    const resumable = session ? null : await sessionService.getResumable(res.locals.userId);
    res.json({ session, resumable });
  },

  async start(req: Request, res: Response<unknown, AuthLocals>) {
    const { name } = validate(startSessionSchema, req.body ?? {});
    res.status(201).json({ session: await sessionService.start(res.locals.userId, name) });
  },

  async end(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ session: await sessionService.end(res.locals.userId, id) });
  },

  async resume(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ session: await sessionService.resume(res.locals.userId, id) });
  },

  async share(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ session: await sessionService.share(res.locals.userId, id) });
  },

  async unshare(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ session: await sessionService.unshare(res.locals.userId, id) });
  },

  /** Public (no sign-in): a shared session with all of its logs. */
  async shared(req: Request, res: Response) {
    const { token } = validate(shareTokenParamSchema, req.params);
    res.json(await sessionService.getShared(token));
  },

  async remove(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await sessionService.delete(res.locals.userId, id);
    res.status(204).end();
  },
};
