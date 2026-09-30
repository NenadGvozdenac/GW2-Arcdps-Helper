import { shell } from "electron";
import { BROWSER_LOGIN_POLL_MS } from "../config/constants";
import { environment } from "../config/environment";
import { credentialsRepository } from "../repositories/credentialsRepository";
import type { BackendUser } from "../../shared/backend.types";
import type { BrowserLoginMode, LoginRequest } from "../../shared/app.types";
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

/** Stores a fresh sign-in (password or browser) and tells everyone who waits for one. */
function signIn(apiUrl: string, token: string, user: BackendUser): void {
  credentials = { apiUrl, token, user };
  credentialsRepository.save(credentials);
  stateStore.setUser(user);
  logger.info("Signed in", user.email);
  for (const l of signInListeners) l();
}

/** The "Sign in with the browser" request being waited for (its secret never leaves the app). */
let browserRequest: { id: string; secret: string; timer: NodeJS.Timeout; polling: boolean } | null = null;

function stopBrowserLogin(): void {
  if (browserRequest) clearInterval(browserRequest.timer);
  browserRequest = null;
}

/** One check of the request; network errors are ignored (the next tick tries again until the request expires). */
async function pollBrowserLogin(): Promise<void> {
  const req = browserRequest;
  if (!req || req.polling) return;
  req.polling = true;
  const { apiUrl } = environment;
  try {
    const res = await backendClient.pollAppLogin(apiUrl, req.id, req.secret);
    if (browserRequest !== req) return; // cancelled or restarted meanwhile
    if (res.status === "pending") return;
    stopBrowserLogin();
    if (res.status === "approved") {
      stateStore.setBrowserLogin(null);
      signIn(apiUrl, res.token, res.user);
    } else {
      const current = stateStore.get().browserLogin;
      if (current) stateStore.setBrowserLogin({ ...current, status: res.status });
    }
  } catch (err) {
    logger.warn("Could not check the browser sign-in", err);
  } finally {
    req.polling = false;
  }
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
    stopBrowserLogin();
    stateStore.setBrowserLogin(null);
    signIn(apiUrl, token, user);
  },

  /**
   * "Sign in with the browser": opens the website on a new sign-in request — straight on its confirmation page, or on
   * the password reset (someone already signed in there is sent on to the confirmation) — and waits until it is
   * approved there, then signs in as that user without a password.
   */
  async startBrowserLogin(mode: BrowserLoginMode): Promise<void> {
    stopBrowserLogin();
    const { apiUrl, webUrl } = environment;
    const created = await backendClient.createAppLogin(apiUrl);
    const id = encodeURIComponent(created.id);
    const url = mode === "forgotPassword" ? `${webUrl}/forgot-password?app=${id}` : `${webUrl}/app-login/${id}`;
    browserRequest = {
      id: created.id,
      secret: created.secret,
      timer: setInterval(() => void pollBrowserLogin(), BROWSER_LOGIN_POLL_MS),
      polling: false,
    };
    stateStore.setBrowserLogin({ status: "waiting", code: created.code, url });
    await shell.openExternal(url);
  },

  cancelBrowserLogin(): void {
    stopBrowserLogin();
    stateStore.setBrowserLogin(null);
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
