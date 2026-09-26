import type { UploaderApi } from "../shared/app.types";

declare global {
  interface Window {
    /** Exposed by src/preload/index.ts */
    uploader: UploaderApi;
  }
}

export {};
