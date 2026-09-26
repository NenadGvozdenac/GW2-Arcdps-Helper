import type { Request, Response } from "express";
import { importLogs } from "../services/logImportService";
import { logService } from "../services/logService";
import type { AuthLocals } from "../types/auth.types";
import type { SubmitLogsResponse } from "../types/submit.types";
import { idParamSchema, submitLogsSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const logController = {
  async list(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ logs: await logService.list(res.locals.userId) });
  },

  async get(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ log: await logService.get(res.locals.userId, id) });
  },

  /** Accepts dps.report links, fetches each log's Elite Insights JSON and stores a summary. */
  async submit(req: Request, res: Response<unknown, AuthLocals>) {
    const { urls } = validate(submitLogsSchema, req.body);
    const body: SubmitLogsResponse = { results: await importLogs(res.locals.userId, urls) };
    res.json(body);
  },

  async remove(req: Request, res: Response<unknown, AuthLocals>) {
    const { id } = validate(idParamSchema, req.params);
    await logService.delete(res.locals.userId, id);
    res.status(204).end();
  },
};
