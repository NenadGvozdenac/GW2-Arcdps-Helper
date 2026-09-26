import type { BackendUser } from "./backend.types";
import type { AppEnvironment } from "./environment.types";
import type { Settings } from "./settings.types";
import type { UploadEntry } from "./upload.types";
import type { WatchState } from "./watch.types";

/** Everything the renderer needs to draw the UI; pushed on every change. */
export interface AppState {
  environment: AppEnvironment;
  user: BackendUser | null;
  settings: Settings;
  logFolderExists: boolean;
  watch: WatchState;
  uploads: UploadEntry[]; // newest first
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

  uploadFiles(): Promise<void>;
  retryUpload(id: string): Promise<void>;
  clearFinished(): Promise<void>;
  openExternal(url: string): Promise<void>;
}
