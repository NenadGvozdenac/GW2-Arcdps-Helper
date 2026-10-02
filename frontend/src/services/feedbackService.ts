import { FEEDBACK_DESCRIPTION_MAX, FEEDBACK_TITLE_MAX } from "../config/constants";
import type { Feedback } from "../domain/types/feedback.types";
import { ValidationError } from "../domain/types/validation.types";
import { feedbackRepository } from "../repositories/feedbackRepository";

export const feedbackService = {
  /** Sends feedback to the developer (saved and emailed); title and description are required. */
  send(feedback: Feedback): Promise<void> {
    const title = feedback.title.trim();
    const description = feedback.description.trim();
    if (!title) throw new ValidationError("validation.feedbackTitleRequired");
    if (!description) throw new ValidationError("validation.feedbackDescriptionRequired");
    return feedbackRepository.send({
      category: feedback.category,
      title: title.slice(0, FEEDBACK_TITLE_MAX),
      description: description.slice(0, FEEDBACK_DESCRIPTION_MAX),
      contactEmail: feedback.contactEmail?.trim() || undefined,
    });
  },
};
