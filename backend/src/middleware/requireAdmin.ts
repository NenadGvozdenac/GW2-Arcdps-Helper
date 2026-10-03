import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { tokenService } from "../services/tokenService";
import { adminDisabled, unauthenticated } from "../utils/httpError";

/** Lets through only `Authorization: Bearer <admin token>` (see adminAuthService); user tokens are refused. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const admin = env.admin;
  if (!admin) return next(adminDisabled());
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !tokenService.verifyAdmin(token, admin)) return next(unauthenticated());
  next();
}
