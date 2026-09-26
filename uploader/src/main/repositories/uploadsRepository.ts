import { MAX_UPLOADS_KEPT } from "../config/constants";
import type { UploadEntry } from "../../shared/upload.types";
import { createJsonStore } from "./jsonStore";

const store = createJsonStore<UploadEntry[]>("uploads.json", () => []);

export const uploadsRepository = {
  /** Entries interrupted mid-pipeline by an app exit are marked failed so they can be retried. */
  load(): UploadEntry[] {
    return store.read().map((e) =>
      e.stage === "done" || e.stage === "failed"
        ? e
        : { ...e, stage: "failed", errorCode: e.permalink ? "SYNC_FAILED" : "DPS_REPORT_FAILED", errorDetail: "Interrupted" },
    );
  },
  save(entries: UploadEntry[]): void {
    store.write(entries.slice(0, MAX_UPLOADS_KEPT));
  },
};
