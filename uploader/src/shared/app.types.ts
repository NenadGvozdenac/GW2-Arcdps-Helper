import type { BackendSession, BackendUser } from "./backend.types";
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

/** Everything the renderer needs to draw the UI; pushed on every change. */
export interface AppState {
  environment: AppEnvironment;
  user: BackendUser | null;
  settings: Settings;
  logFolderExists: boolean;
  watch: WatchState;
  session: SessionState;
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
