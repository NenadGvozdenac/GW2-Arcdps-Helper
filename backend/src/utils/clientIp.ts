import { createHash } from "node:crypto";
import type { Request } from "express";

/**
 * SHA-256 of the client's IP (never the IP itself), for per-IP limits. It is the first X-Forwarded-For hop: Vercel
 * sets that header itself, and the Docker nginx sends only the address it was connected from.
 */
export function clientIpHash(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  return createHash("sha256").update(ip).digest("hex");
}
