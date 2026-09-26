import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JWT_EXPIRES_IN } from "../config/constants";
import type { TokenPayload } from "../types/auth.types";

export const tokenService = {
  sign(userId: string): string {
    const payload: TokenPayload = { sub: userId };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" });
  },

  /** Returns the user id, or null for a missing/invalid/expired token. */
  verify(token: string): string | null {
    try {
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as TokenPayload;
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  },
};
