import { safeStorage } from "electron";
import type { Credentials, StoredCredentials } from "../types/storage.types";
import { createJsonStore } from "./jsonStore";

const store = createJsonStore<StoredCredentials | null>("credentials.json", () => null);

export const credentialsRepository = {
  load(): Credentials | null {
    const stored = store.read();
    if (!stored) return null;
    try {
      const token = stored.encrypted
        ? safeStorage.decryptString(Buffer.from(stored.token, "base64"))
        : stored.token;
      return { apiUrl: stored.apiUrl, user: stored.user, token };
    } catch {
      return null; // e.g. copied to another Windows account — sign in again
    }
  },

  save(credentials: Credentials): void {
    const encrypted = safeStorage.isEncryptionAvailable();
    store.write({
      apiUrl: credentials.apiUrl,
      user: credentials.user,
      token: encrypted ? safeStorage.encryptString(credentials.token).toString("base64") : credentials.token,
      encrypted,
    });
  },

  clear(): void {
    store.write(null);
  },
};
