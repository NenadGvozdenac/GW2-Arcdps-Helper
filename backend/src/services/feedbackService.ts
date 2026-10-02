import { FEEDBACK_COOLDOWN_MS } from "../config/constants";
import { feedbackRepository } from "../repositories/feedbackRepository";
import { userRepository } from "../repositories/userRepository";
import type { FeedbackInput, FeedbackSender } from "../types/feedback.types";
import { feedbackTooSoon } from "../utils/httpError";
import { emailService } from "./emailService";

export const feedbackService = {
  /**
   * Saves the feedback and emails it to the developer. At most once per FEEDBACK_COOLDOWN_MS per IP (signed in or
   * not). It is saved even if the email fails, so it is never lost; that failure is only logged.
   */
  async send(sender: FeedbackSender, input: FeedbackInput): Promise<void> {
    const since = new Date(Date.now() - FEEDBACK_COOLDOWN_MS);
    if (await feedbackRepository.sentFromIpSince(sender.ipHash, since)) throw feedbackTooSoon();
    const user = sender.userId ? await userRepository.findById(sender.userId) : null;
    // A signed-in user is answered at their account email.
    const saved = { ...input, contactEmail: user ? null : (input.contactEmail ?? null) };
    await feedbackRepository.create({ ...sender, userId: user?.id ?? null }, saved);
    try {
      await emailService.sendFeedback(user, saved);
    } catch (err) {
      console.error("Feedback saved, but emailing it failed", err);
    }
  },
};
