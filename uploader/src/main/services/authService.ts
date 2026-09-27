import { environment } from "../config/environment";
import { credentialsRepository } from "../repositories/credentialsRepository";
import type { BackendUser } from "../../shared/backend.types";
import type { LoginRequest } from "../../shared/app.types";
import type { Credentials } from "../types/storage.types";
import { AppError } from "../utils/appError";
import { backendClient } from "./clients/backendClient";
import { logger } from "./logger";
import { stateStore } from "./stateStore";

let credentials: Credentials | null = null;
const signOutListeners = new Set<() => void>();
/** Called once a sign-in is confirmed by the backend (restored on start-up or a fresh login). */
const signInListeners = new Set<() => void>();

function signOut() {
  credentials = null;
  credentialsRepository.clear();
  stateStore.setUser(null);
  for (const l of signOutListeners) l();
}

/** Keeps the latest user from the backend (e.g. a dps.report token changed on the website). */
function applyUser(user: BackendUser): void {
  if (!credentials) return;
  credentials = { ...credentials, user };
  credentialsRepository.save(credentials);
  stateStore.setUser(user);
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
        applyUser(user);
        for (const l of signInListeners) l();
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
    for (const l of signInListeners) l();
  },

  /**
   * The dps.report token to upload with, read fresh from the account so a change on the website applies right away.
   * Offline, the last known one is used; "" when signed out or not set (anonymous upload).
   */
  async currentDpsReportToken(): Promise<string> {
    if (!credentials) return "";
    try {
      applyUser(await backendClient.me(credentials.apiUrl, credentials.token));
    } catch (err) {
      logger.warn("Could not refresh the dps.report token, using the last known one", err);
    }
    return credentials?.user.dpsReportToken ?? "";
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

  onSignIn(listener: () => void): void {
    signInListeners.add(listener);
  },
};
