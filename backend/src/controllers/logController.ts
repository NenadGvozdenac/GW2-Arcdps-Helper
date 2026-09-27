import type { Request, Response } from "express";
import { discordService } from "../services/discordService";
import { importLogFile, importLogs } from "../services/logImportService";
import { logService } from "../services/logService";
import { sessionService } from "../services/sessionService";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import type { SubmitLogsResponse, SubmitResult, UploadLogFileResponse } from "../types/submit.types";
import { invalidLogFile } from "../utils/httpError";
import {
  deleteLogsSchema,
  idParamSchema,
  searchLogsSchema,
  shareTokenParamSchema,
  submitLogsSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";

/**
 * Posts newly added logs to the user's Discord webhook before responding (serverless functions may be frozen
 * right after the response, so this can't run in the background).
 */
async function notifyDiscord(userId: string, results: SubmitResult[], sessionActive = false) {
  // Logs of an active session are posted together when the session ends.
  if (sessionActive) return;
  const added = results.flatMap((r) => (r.status === "ok" ? [r.log] : []));
  if (!added.length) return;
  const user = await userService.get(userId);
  await discordService.notifyNewLogs(user.discordWebhookUrl, added);
}

export const logController = {
  async list(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ logs: await logService.list(res.locals.userId) });
  },

  /** GET /logs/search?search=&category=&groupId=&result=&page=&pageSize= — one page, or with idsOnly=true every id. */
  async search(req: Request, res: Response<unknown, AuthLocals>) {
    const { page, pageSize, idsOnly, ...filter } = validate(searchLogsSchema, req.query);
    if (idsOnly) {
      res.json({ ids: await logService.searchIds(res.locals.userId, filter) });
      return;
    }
    res.json({ ...(await logService.search(res.locals.userId, filter, page, pageSize)), page, pageSize });
  },

  async get(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ log: await logService.get(res.locals.userId, id) });
  },

  /** Accepts dps.report links, fetches each log's Elite Insights JSON and stores a summary. */
  async submit(req: Request, res: Response<unknown, AuthLocals>) {
    const { urls, sessionId } = validate(submitLogsSchema, req.body);
    // Also checks that the session belongs to this user. A log that arrives after its session ended still joins it.
    const session = sessionId ? await sessionService.get(res.locals.userId, sessionId) : null;
    const results = await importLogs(res.locals.userId, urls, session?.id ?? null);
    await notifyDiscord(res.locals.userId, results, !!session && !session.endedAt);
    const body: SubmitLogsResponse = { results };
    res.json(body);
  },

  /** Accepts one ArcDPS log file (multipart field "file"), uploads it to dps.report and imports it. */
  async upload(req: Request, res: Response<unknown, AuthLocals>) {
    if (!req.file) throw invalidLogFile();
    const fileName = req.file.originalname;
    const { dpsReportToken } = await userService.get(res.locals.userId);
    const result = await importLogFile(res.locals.userId, req.file.buffer, fileName, dpsReportToken);
    await notifyDiscord(res.locals.userId, [result]);
    const body: UploadLogFileResponse = { fileName, result };
    res.json(body);
  },

  async share(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ log: await logService.share(res.locals.userId, id) });
  },

  async unshare(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ log: await logService.unshare(res.locals.userId, id) });
  },

  /** Public (no sign-in): a shared log. */
  async shared(req: Request, res: Response) {
    const { token } = validate(shareTokenParamSchema, req.params);
    res.json(await logService.getShared(token));
  },

  /** Bulk delete: `{ ids }`. */
  async removeMany(req: Request, res: Response<unknown, AuthLocals>) {
    const { ids } = validate(deleteLogsSchema, req.body);
    res.json({ deleted: await logService.deleteMany(res.locals.userId, ids) });
  },

  async remove(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await logService.delete(res.locals.userId, id);
    res.status(204).end();
  },
};
