import { existsSync } from "node:fs";
import { environment } from "../config/environment";
import { settingsRepository } from "../repositories/settingsRepository";
import { uploadsRepository } from "../repositories/uploadsRepository";
import type { AppState, SessionState } from "../../shared/app.types";
import type { BackendUser, WeeklyClears } from "../../shared/backend.types";
import type { Settings } from "../../shared/settings.types";
import type { UpdateState } from "../../shared/update.types";
import type { UploadEntry } from "../../shared/upload.types";
import type { WatchState } from "../../shared/watch.types";

type Listener = (state: AppState) => void;

/** Single source of truth for the main process. Every change is persisted and pushed to listeners. */
function createStateStore() {
  let user: BackendUser | null = null;
  let settings = {} as Settings;
  let uploads: UploadEntry[] = [];
  let watch: WatchState = { watching: false, startedAt: null };
  let session: SessionState = { active: null, ending: false, resumable: null };
  let clears: WeeklyClears | null = null;
  let update: UpdateState = { status: "idle", version: null, progress: null, downloadUrl: null };

  const listeners = new Set<Listener>();
  let saveUploadsTimer: NodeJS.Timeout | undefined;

  const snapshot = (): AppState => ({
    environment,
    user,
    settings,
    logFolderExists: !!settings.logFolder && existsSync(settings.logFolder),
    watch,
    session,
    clears,
    uploads,
    update,
  });

  const emit = () => {
    const state = snapshot();
    for (const l of listeners) l(state);
  };

  /** Emits immediately; writes to disk at most every 500 ms. */
  const persistUploads = () => {
    emit();
    clearTimeout(saveUploadsTimer);
    saveUploadsTimer = setTimeout(() => uploadsRepository.save(uploads), 500);
  };

  return {
    /** Loads persisted state; call once after Electron's `ready` event. */
    init() {
      settings = settingsRepository.load();
      uploads = uploadsRepository.load();
    },

    get: snapshot,
    getSettings: () => settings,
    getUser: () => user,
    getWatch: () => watch,
    getSession: () => session,
    getUpdate: () => update,
    getUpload: (id: string) => uploads.find((u) => u.id === id),

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setUser(next: BackendUser | null) {
      user = next;
      emit();
    },

    setSettings(next: Settings) {
      settings = next;
      settingsRepository.save(settings);
      emit();
    },

    setWatch(next: WatchState) {
      watch = next;
      emit();
    },

    setSession(next: SessionState) {
      session = next;
      emit();
    },

    setClears(next: WeeklyClears | null) {
      clears = next;
      emit();
    },

    setUpdate(next: UpdateState) {
      update = next;
      emit();
    },

    addUpload(entry: UploadEntry) {
      uploads = [entry, ...uploads];
      persistUploads();
    },

    updateUpload(id: string, patch: Partial<UploadEntry>): UploadEntry | undefined {
      uploads = uploads.map((u) => (u.id === id ? { ...u, ...patch } : u));
      persistUploads();
      return uploads.find((u) => u.id === id);
    },

    removeUploads(predicate: (u: UploadEntry) => boolean) {
      uploads = uploads.filter((u) => !predicate(u));
      persistUploads();
    },

    /** Writes pending changes to disk immediately (call before quitting). */
    flush() {
      clearTimeout(saveUploadsTimer);
      uploadsRepository.save(uploads);
    },
  };
}

export const stateStore = createStateStore();
