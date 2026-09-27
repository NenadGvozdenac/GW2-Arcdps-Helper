/** A file attached to a GitHub Release of this repository. */
export interface Download {
  url: string;
  version: string;
  fileName: string;
}

/** Latest downloads: the desktop uploader installer and the in-game Nexus addon. null = not released yet. */
export interface Downloads {
  uploader: Download | null;
  addon: Download | null;
}
