import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { APP_LOGIN_CODE_ALPHABET, APP_LOGIN_SECRET_BYTES, APP_LOGIN_TTL_MS } from "../config/constants";
import { appLoginRepository } from "../repositories/appLoginRepository";
import type {
  AppLoginClient,
  AppLoginCreated,
  AppLoginInfo,
  AppLoginPollResult,
  AppLoginRequestRow,
} from "../types/appLogin.types";
import { appLoginNotFound } from "../utils/httpError";
import { tokenService } from "./tokenService";
import { userIpService } from "./userIpService";
import { userService } from "./userService";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** "K7M-4QX": six characters that are hard to mix up, split in two for reading. */
function newCode(): string {
  const chars = Array.from({ length: 6 }, () => APP_LOGIN_CODE_ALPHABET[randomInt(APP_LOGIN_CODE_ALPHABET.length)]);
  return `${chars.slice(0, 3).join("")}-${chars.slice(3).join("")}`;
}

const isExpired = (row: AppLoginRequestRow) => row.expiresAt.getTime() <= Date.now();

/**
 * "Sign in with the browser" for the desktop uploader and the Nexus addon: the app creates a request, opens the
 * website on it and polls it; a user signed in on the website approves it (seeing the same code as the app), and the
 * app's next poll collects a token for that user. Approving always takes a click on the website - otherwise anyone
 * could send a victim a link and collect a sign-in to the victim's account.
 */
export const appLoginService = {
  async create(client: AppLoginClient): Promise<AppLoginCreated> {
    await appLoginRepository.deleteExpired();
    const secret = randomBytes(APP_LOGIN_SECRET_BYTES).toString("base64url");
    const row = await appLoginRepository.create({
      secretHash: sha256(secret).toString("hex"),
      code: newCode(),
      client,
      expiresAt: new Date(Date.now() + APP_LOGIN_TTL_MS),
    });
    return { id: row.id, secret, code: row.code, expiresAt: row.expiresAt };
  },

  /** For the website's confirmation page. */
  async info(id: string): Promise<AppLoginInfo> {
    const row = await appLoginRepository.findById(id);
    if (!row || isExpired(row)) throw appLoginNotFound();
    return { code: row.code, client: row.client, status: row.status, expiresAt: row.expiresAt };
  },

  async approve(id: string, userId: string): Promise<void> {
    if (!(await appLoginRepository.decide(id, { status: "approved", userId }))) throw appLoginNotFound();
  },

  async deny(id: string): Promise<void> {
    if (!(await appLoginRepository.decide(id, { status: "denied" }))) throw appLoginNotFound();
  },

  /** The app asks how its request is doing; an approved request hands out the sign-in once and is then removed. */
  async poll(id: string, secret: string, ipHash: string): Promise<AppLoginPollResult> {
    const row = await appLoginRepository.findById(id);
    // A wrong secret looks like a missing request: nothing to learn from guessing.
    const secretOk = !!row && timingSafeEqual(sha256(secret), Buffer.from(row.secretHash, "hex"));
    if (!row || !secretOk) return { status: "expired" };
    if (row.status === "pending") {
      if (!isExpired(row)) return { status: "pending" };
      await appLoginRepository.delete(id);
      return { status: "expired" };
    }
    await appLoginRepository.delete(id);
    if (row.status === "denied" || !row.userId) return { status: "denied" };
    const user = await userService.get(row.userId);
    // The app's address, not the browser's that approved it.
    await userIpService.record(user.id, ipHash);
    return { status: "approved", token: tokenService.sign(user.id), user };
  },
};
