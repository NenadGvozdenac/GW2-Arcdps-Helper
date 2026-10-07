/** What can be shared through a public read-only link. */
export type ShareKind = "sessions" | "logs" | "builds";

export const shareService = {
  /** Full URL of the public page for a shared session, log or build. */
  url: (kind: ShareKind, token: string) => `${window.location.origin}/shared/${kind}/${token}`,
};
