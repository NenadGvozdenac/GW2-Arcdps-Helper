import type { Request, Response } from "express";
import { sessionService } from "../services/sessionService";
import type { AuthLocals } from "../types/auth.types";
import {
  deleteSessionsSchema,
  idParamSchema,
  moveSessionSchema,
  removeSessionLogsSchema,
  sessionPageSchema,
  shareTokenParamSchema,
  startSessionSchema,
  updateSessionSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";

export const sessionController = {
  async list(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ sessions: await sessionService.list(res.locals.userId) });
  },

  async logs(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ logs: await sessionService.logs(res.locals.userId, id) });
  },

  /** GET /sessions/page?page=&pageSize= — one page of the sessions list with each session's totals. */
  async page(req: Request, res: Response<unknown, AuthLocals>) {
    const { page, pageSize } = validate(sessionPageSchema, req.query);
    res.json({ ...(await sessionService.page(res.locals.userId, page, pageSize)), page, pageSize });
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

  /** Rename and / or pin. */
  async update(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    const patch = validate(updateSessionSchema, req.body);
    res.json({ session: await sessionService.update(res.locals.userId, id, patch) });
  },

  /** Drag & drop: the session takes the place of `overId`. */
  async move(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    const { overId } = validate(moveSessionSchema, req.body);
    await sessionService.move(res.locals.userId, id, overId);
    res.status(204).end();
  },

  /** `{ ids, deleteLogs? }`: takes logs out of an ended session; with `deleteLogs` they are deleted altogether. */
  async removeLogs(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    const { ids, deleteLogs } = validate(removeSessionLogsSchema, req.body);
    res.json({ removed: await sessionService.removeLogs(res.locals.userId, id, ids, deleteLogs) });
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

  /** Bulk delete: `{ ids }`; the sessions' logs are kept. */
  async removeMany(req: Request, res: Response<unknown, AuthLocals>) {
    const { ids } = validate(deleteSessionsSchema, req.body);
    res.json({ deleted: await sessionService.deleteMany(res.locals.userId, ids) });
  },

  async remove(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await sessionService.delete(res.locals.userId, id);
    res.status(204).end();
  },
};
