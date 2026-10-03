/** What the feedback is about. */
export const FEEDBACK_CATEGORIES = ["addon", "uploader", "website", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

/** POST /feedback */
export interface FeedbackInput {
  category: FeedbackCategory;
  title: string;
  description: string;
  /** Guests only (optional): where to answer them. */
  contactEmail?: string | null;
}

/** Who sent it: the signed-in user (null for guests) and a hash of their IP (throttling; not stored with it). */
export interface FeedbackSender {
  userId: string | null;
  ipHash: string;
}
