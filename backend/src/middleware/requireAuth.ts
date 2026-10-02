import type { NextFunction, Request, Response } from "express";
import { userRepository } from "../repositories/userRepository";
import { tokenService } from "../services/tokenService";
import type { AuthLocals } from "../types/auth.types";
import { unauthenticated } from "../utils/httpError";

/**
 * Accepts `Authorization: Bearer <jwt>` and stores the user id in res.locals.userId. A valid token of a deleted account
 * is rejected too (401), so the desktop uploader and the Nexus addon sign out instead of failing on every request.
 */
export async function requireAuth(req: Request, res: Response<unknown, AuthLocals>, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token ? tokenService.verify(token) : null;
  if (!userId || !(await userRepository.exists(userId))) return next(unauthenticated());
  res.locals.userId = userId;
  next();
}

/** Like requireAuth, but lets guests through: res.locals.userId is set only for a valid sign-in. */
export async function optionalAuth(req: Request, res: Response<unknown, Partial<AuthLocals>>, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token ? tokenService.verify(token) : null;
  if (userId && (await userRepository.exists(userId))) res.locals.userId = userId;
  next();
}
