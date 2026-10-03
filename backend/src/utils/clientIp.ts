import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Request } from "express";

/**
 * One spelling per address, so the same IP always gives the same hash: IPv4-mapped IPv6 ("::ffff:1.2.3.4") becomes the
 * plain IPv4, and IPv6 is written in its standard short lowercase form ("2001:DB8:0::1" -> "2001:db8::1").
 */
function normalizeIp(ip: string): string {
  let value = ip.trim().toLowerCase();
  if (value.startsWith("::ffff:") && isIP(value.slice(7)) === 4) value = value.slice(7);
  if (isIP(value) === 6) return new URL(`http://[${value}]`).hostname.slice(1, -1);
  return value;
}

/** SHA-256 of an IP address (normalized) - how addresses are stored and compared, never the IP itself. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(normalizeIp(ip)).digest("hex");
}

/**
 * Hash of the client's IP, for per-IP limits and blocks. It is the first X-Forwarded-For hop: Vercel sets that header
 * itself, and the Docker nginx sends only the address it was connected from.
 */
export function clientIpHash(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  return hashIp(ip);
}
