import { environment } from "../config/environment";
import { credentialsRepository } from "../repositories/credentialsRepository";
import type { LoginRequest } from "../../shared/app.types";
import type { Credentials } from "../types/storage.types";
import { AppError } from "../utils/appError";
import { backendClient } from "./clients/backendClient";
import { logger } from "./logger";
import { stateStore } from "./stateStore";

let credentials: Credentials | null = null;
const signOutListeners = new Set<() => void>();

function signOut() {
  credentials = null;
  credentialsRepository.clear();
  stateStore.setUser(null);
  for (const l of signOutListeners) l();
}

export const authService = {
  /** Restores the saved sign-in and re-validates it in the background. */
  restore(): void {
    credentials = credentialsRepository.load();
    // A sign-in made against another server (e.g. dev vs production) is not valid here.
    if (credentials && credentials.apiUrl !== environment.apiUrl) {
      credentials = null;
      credentialsRepository.clear();
    }
    if (!credentials) return;
    stateStore.setUser(credentials.user);
    const { apiUrl, token } = credentials;
    backendClient
      .me(apiUrl, token)
      .then((user) => {
        if (!credentials) return;
        credentials = { ...credentials, user };
        credentialsRepository.save(credentials);
        stateStore.setUser(user);
      })
      .catch((err) => {
        // Offline is fine (uploads will retry); an invalid/expired token is not.
        if (err instanceof AppError && err.status === 401) {
          logger.warn("Saved session expired");
          signOut();
        }
      });
  },

  async login(req: LoginRequest): Promise<void> {
    const { apiUrl } = environment;
    const { token, user } = await backendClient.login(apiUrl, req.email.trim(), req.password);
    credentials = { apiUrl, token, user };
    credentialsRepository.save(credentials);
    stateStore.setUser(user);
    logger.info("Signed in", user.email);
  },

  logout: signOut,

  /** Called when the backend rejects the token (401). */
  handleUnauthorized(): void {
    logger.warn("Token rejected by backend, signing out");
    signOut();
  },

  getCredentials: () => credentials,

  onSignOut(listener: () => void): void {
    signOutListeners.add(listener);
  },
};
