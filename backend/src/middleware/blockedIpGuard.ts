import type { NextFunction, Request, Response } from "express";
import { blockedIpService } from "../services/blockedIpService";
import { clientIpHash } from "../utils/clientIp";
import { ipBlocked } from "../utils/httpError";

/**
 * Refuses every API request from an address the administrator blocked (403 IP_BLOCKED), signed in or not. The admin
 * area and the health check stay reachable, so the administrator can't lock themselves out.
 */
export async function blockedIpGuard(req: Request, _res: Response, next: NextFunction) {
  if (req.path.startsWith("/admin") || req.path === "/health") return next();
  if (await blockedIpService.isBlocked(clientIpHash(req))) return next(ipBlocked());
  next();
}
