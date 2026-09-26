import type { BackendUser } from "../../shared/backend.types";

/** Persisted sign-in. The token is encrypted with Electron safeStorage when available. */
export interface StoredCredentials {
  apiUrl: string;
  user: BackendUser;
  token: string;
  encrypted: boolean;
}

/** Decrypted sign-in as used by the app. */
export interface Credentials {
  apiUrl: string;
  user: BackendUser;
  token: string;
}
