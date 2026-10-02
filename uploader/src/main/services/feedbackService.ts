import type { FeedbackInput } from "../../shared/backend.types";
import { AppError } from "../utils/appError";
import { authService } from "./authService";
import { backendClient } from "./clients/backendClient";

export const feedbackService = {
  /** Sends feedback to the developer through GW2 ArcDPS Helper (linked to the signed-in account). */
  async send(feedback: FeedbackInput): Promise<void> {
    const credentials = authService.getCredentials();
    if (!credentials) throw new AppError("NOT_SIGNED_IN", "Sign in to send feedback.");
    const title = String(feedback.title ?? "").trim();
    const description = String(feedback.description ?? "").trim();
    if (!title || !description) throw new AppError("VALIDATION_ERROR", "Title and description are required.");
    try {
      await backendClient.sendFeedback(credentials.apiUrl, credentials.token, { category: feedback.category, title, description });
    } catch (err) {
      if (err instanceof AppError && err.status === 401) authService.handleUnauthorized();
      throw err;
    }
  },
};
