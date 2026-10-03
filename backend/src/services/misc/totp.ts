import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time passwords (RFC 6238) as authenticator apps make them: HMAC-SHA1, 6 digits, a new code every
 * 30 seconds. Used for the administrator's sign-in.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 character in the TOTP secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** The code of one time step (RFC 4226 HOTP with the step as counter). */
function codeAt(key: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return String(binary).padStart(DIGITS, "0");
}

export const totp = {
  /** A new random secret (160 bits, base32) for an authenticator app. */
  generateSecret: (): string => base32Encode(randomBytes(20)),

  /**
   * The time step `code` belongs to, or null when it matches none. The steps just before and after now count too, so
   * a phone clock that is a little off still works. Callers remember used steps so a code can't be used twice.
   */
  matchingStep(secret: string, code: string, now = Date.now()): number | null {
    if (!/^\d{6}$/.test(code)) return null;
    const key = base32Decode(secret);
    const current = Math.floor(now / 1000 / STEP_SECONDS);
    for (const step of [current, current - 1, current + 1]) {
      if (timingSafeEqual(Buffer.from(codeAt(key, step)), Buffer.from(code))) return step;
    }
    return null;
  },

  /** otpauth:// link an authenticator app imports (most also accept the secret typed in by hand). */
  uri(secret: string, account: string, issuer: string): string {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${params}`;
  },

  /** For tests: the code of the step containing `now`. */
  codeAt: (secret: string, now: number): string => codeAt(base32Decode(secret), Math.floor(now / 1000 / STEP_SECONDS)),
};
