import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { feedbackService } from "../services/feedbackService";
import type { AuthLocals } from "../types/auth.types";
import { feedbackSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

/** The client's IP (first X-Forwarded-For hop behind Vercel / nginx), hashed: feedback is throttled per IP. */
function ipHash(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  return createHash("sha256").update(ip).digest("hex");
}

export const feedbackController = {
  /**
   * POST /feedback `{ category, title, description, contactEmail? }` — saved and emailed to the developer. Signed in
   * or not (optionalAuth); a signed-in user's feedback is linked to their account.
   */
  async send(req: Request, res: Response<unknown, Partial<AuthLocals>>) {
    const input = validate(feedbackSchema, req.body);
    await feedbackService.send({ userId: res.locals.userId ?? null, ipHash: ipHash(req) }, input);
    res.status(204).end();
  },
};
