import type { BackendSession, BackendUser, WeeklyClears } from "./backend.types";
import type { AppEnvironment } from "./environment.types";
import type { Settings } from "./settings.types";
import type { UpdateState } from "./update.types";
import type { UploadEntry } from "./upload.types";
import type { WatchState } from "./watch.types";

export interface SessionState {
  /** The session new logs are attached to, or null. */
  active: BackendSession | null;
  /** True while waiting for the session's uploads to finish before ending it. */
  ending: boolean;
  /** The last session, when it ended automatically after 6 hours and can be resumed. */
  resumable: BackendSession | null;
}

/**
 * "Sign in with the browser": the website was opened on a sign-in request and the app waits for it to be approved
 * there. `waiting` until then; `denied` / `expired` stay shown until the user retries or cancels.
 */
export interface BrowserLoginState {
  status: "waiting" | "denied" | "expired";
  /** Shown here and on the website, so the user can check they approve this app. */
  code: string;
  /** The page that was opened (to open it again). */
  url: string;
}

/** Everything the renderer needs to draw the UI; pushed on every change. */
export interface AppState {
  environment: AppEnvironment;
  user: BackendUser | null;
  /** A "Sign in with the browser" in progress (or just failed), else null. */
  browserLogin: BrowserLoginState | null;
  settings: Settings;
  logFolderExists: boolean;
  watch: WatchState;
  session: SessionState;
  /** Raid and strike bosses killed since the weekly reset; null while signed out or not loaded yet. */
  clears: WeeklyClears | null;
  uploads: UploadEntry[]; // newest first
  update: UpdateState;
}

/** Error returned from an IPC call; `code` is translated in the renderer. */
export interface IpcError {
  code: string;
  message: string;
}

export type IpcResult<T = void> = { ok: true; value: T } | { ok: false; error: IpcError };

export interface LoginRequest {
  email: string;
  password: string;
}

/** API exposed to the renderer by the preload script as `window.uploader`. */
export interface UploaderApi {
  getState(): Promise<AppState>;
  onStateChanged(listener: (state: AppState) => void): () => void;

  login(req: LoginRequest): Promise<IpcResult>;
  /** Opens the website to approve this app's sign-in there and waits for it. */
  startBrowserLogin(): Promise<IpcResult>;
  cancelBrowserLogin(): Promise<void>;
  logout(): Promise<void>;

  saveSettings(patch: Partial<Settings>): Promise<IpcResult>;
  chooseLogFolder(): Promise<string | null>;

  startWatching(): Promise<IpcResult>;
  stopWatching(): Promise<void>;

  /** Starts a session (name is optional); logs detected from now on belong to it. */
  startSession(name: string): Promise<IpcResult>;
  /** Renames the active session. */
  renameSession(name: string): Promise<IpcResult>;
  /** Waits for the session's uploads, then ends it and posts one Discord summary. */
  endSession(): Promise<IpcResult>;
  /** Re-opens the last session if it ended automatically after 6 hours. */
  resumeSession(): Promise<IpcResult>;

  uploadFiles(): Promise<void>;
  retryUpload(id: string): Promise<void>;
  clearFinished(): Promise<void>;
  openExternal(url: string): Promise<void>;

  /** Quits and installs a downloaded update (update.status === "ready"). */
  installUpdate(): Promise<void>;
}
