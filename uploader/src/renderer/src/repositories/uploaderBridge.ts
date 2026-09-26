import type { UploaderApi } from "../../../shared/app.types";

/** The main-process API exposed by the preload script. The only way the UI talks to the outside world. */
export const uploaderBridge: UploaderApi = window.uploader;
