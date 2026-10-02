/** What the feedback is about (backend: FEEDBACK_CATEGORIES). */
export type FeedbackCategory = "addon" | "uploader" | "website" | "other";

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["addon", "uploader", "website", "other"];

export interface Feedback {
  category: FeedbackCategory;
  title: string;
  description: string;
  /** Guests only (optional): where to answer them. Signed-in users are answered at their account email. */
  contactEmail?: string;
}
