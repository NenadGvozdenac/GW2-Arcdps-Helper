import type { Request, Response } from "express";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import { discordWebhookSchema, discordWebhookTestSchema, profileUpdateSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const profileController = {
  async update(req: Request, res: Response<unknown, AuthLocals>) {
    const patch = validate(profileUpdateSchema, req.body);
    res.json({ user: await userService.updateProfile(res.locals.userId, patch) });
  },

  async setDiscordWebhook(req: Request, res: Response<unknown, AuthLocals>) {
    const { url } = validate(discordWebhookSchema, req.body);
    res.json({ user: await userService.setDiscordWebhook(res.locals.userId, url) });
  },

  /** Sends a test message to the given URL, so it can be checked before saving. */
  async testDiscordWebhook(req: Request, res: Response) {
    const { url } = validate(discordWebhookTestSchema, req.body);
    await userService.testDiscordWebhook(url);
    res.status(204).end();
  },
};
