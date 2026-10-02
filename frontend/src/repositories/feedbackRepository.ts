import type { Feedback } from "../domain/types/feedback.types";
import { http } from "./httpClient";

export const feedbackRepository = {
  /** Saved and emailed to the developer (signed in or not); 429 FEEDBACK_TOO_SOON within a minute from the same IP. */
  send: (feedback: Feedback) => http.post<void>("/feedback", feedback),
};
