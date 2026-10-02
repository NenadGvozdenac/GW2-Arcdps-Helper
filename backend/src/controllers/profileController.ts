import type { Request, Response } from "express";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import {
  deleteAccountSchema,
  discordWebhooksSchema,
  discordWebhookTestSchema,
  dpsReportTokenSchema,
  profileUpdateSchema,
  skipEmptyLogsSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";

export const profileController = {
  async update(req: Request, res: Response<unknown, AuthLocals>) {
    const patch = validate(profileUpdateSchema, req.body);
    res.json({ user: await userService.updateProfile(res.locals.userId, patch) });
  },

  async getDiscordWebhooks(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ webhooks: await userService.getDiscordWebhooks(res.locals.userId) });
  },

  async setDiscordWebhooks(req: Request, res: Response<unknown, AuthLocals>) {
    const { webhooks } = validate(discordWebhooksSchema, req.body);
    res.json({ webhooks: await userService.setDiscordWebhooks(res.locals.userId, webhooks) });
  },

  /** The desktop uploader and the Nexus addon read it back from GET /auth/me. */
  async setDpsReportToken(req: Request, res: Response<unknown, AuthLocals>) {
    const { token } = validate(dpsReportTokenSchema, req.body);
    res.json({ user: await userService.setDpsReportToken(res.locals.userId, token) });
  },

  /** PUT /profile/skip-empty-logs `{ enabled }` — whether empty logs from the ArcDPS bug are skipped on import. */
  async setSkipEmptyLogs(req: Request, res: Response<unknown, AuthLocals>) {
    const { enabled } = validate(skipEmptyLogsSchema, req.body);
    res.json({ user: await userService.setSkipEmptyLogs(res.locals.userId, enabled) });
  },

  /** DELETE /profile `{ password }` — deletes the account and everything in it. */
  async deleteAccount(req: Request, res: Response<unknown, AuthLocals>) {
    const { password } = validate(deleteAccountSchema, req.body);
    await userService.deleteAccount(res.locals.userId, password);
    res.status(204).end();
  },

  /** Sends a test message to the given URL, so it can be checked before saving. */
  async testDiscordWebhook(req: Request, res: Response) {
    const { url, content } = validate(discordWebhookTestSchema, req.body);
    await userService.testDiscordWebhook(url, content);
    res.status(204).end();
  },
};
