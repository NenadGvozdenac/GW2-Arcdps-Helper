import type { NextFunction, Request, Response } from "express";
import { userRepository } from "../repositories/userRepository";
import { tokenService } from "../services/tokenService";
import type { AuthLocals } from "../types/auth.types";
import { unauthenticated } from "../utils/httpError";

/**
 * The user id of a valid `Authorization: Bearer <jwt>`, or null. A valid token of a deleted or blocked account is
 * rejected too, and so is one issued before the account's password was reset (tokensValidAfter; `iat` has whole
 * seconds).
 */
async function authenticate(req: Request): Promise<string | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const verified = token ? tokenService.verify(token) : null;
  if (!verified) return null;
  const state = await userRepository.findTokenState(verified.userId);
  if (!state || state.blockedAt) return null;
  const validAfter = state.tokensValidAfter ? Math.floor(state.tokensValidAfter.getTime() / 1000) * 1000 : 0;
  return verified.issuedAt.getTime() >= validAfter ? verified.userId : null;
}

/**
 * Stores the signed-in user's id in res.locals.userId, or answers 401 - so the desktop uploader and the Nexus addon
 * sign out instead of failing on every request.
 */
export async function requireAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
  const userId = await authenticate(req);
  if (!userId) return next(unauthenticated());
  res.locals.userId = userId;
  next();
}

/** Like requireAuth, but lets guests through: res.locals.userId is set only for a valid sign-in. */
export async function optionalAuth(req: Request, res: Response<unknown, Partial<AuthLocals>>, next: NextFunction) {
  const userId = await authenticate(req);
  if (userId) res.locals.userId = userId;
  next();
}
