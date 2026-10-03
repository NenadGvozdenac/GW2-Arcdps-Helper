import type { Request, Response } from "express";
import { feedbackService } from "../services/feedbackService";
import type { AuthLocals } from "../types/auth.types";
import { feedbackSchema } from "../validation/schemas";
import { validate } from "../validation/validate";
import { clientIpHash } from "../utils/clientIp";

export const feedbackController = {
  /**
   * POST /feedback `{ category, title, description, contactEmail? }` — saved and emailed to the developer. Signed in
   * or not (optionalAuth); a signed-in user's feedback is linked to their account.
   */
  async send(req: Request, res: Response<unknown, Partial<AuthLocals>>) {
    const input = validate(feedbackSchema, req.body);
    await feedbackService.send({ userId: res.locals.userId ?? null, ipHash: clientIpHash(req) }, input);
    res.status(204).end();
  },
};
