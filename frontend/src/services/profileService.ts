import { userRepository } from "../repositories/userRepository";
import { ValidationError } from "../domain/types/validation.types";
import type { ProfileUpdate, User } from "../domain/types/user.types";
import { DISCORD_WEBHOOK_RE } from "../config/constants";
import { authService } from "./authService";

export const profileService = {
  async save(data: ProfileUpdate): Promise<User> {
    const gw2Account = data.gw2Account.trim();
    if (!authService.isValidGw2Account(gw2Account)) throw new ValidationError("validation.invalidGw2Account");
    return userRepository.updateProfile({ gw2Account });
  },

  isValidDiscordWebhook: (url: string) => DISCORD_WEBHOOK_RE.test(url.trim()),

  /** Saves the webhook, or disconnects it when `url` is empty. */
  setDiscordWebhook(url: string): Promise<User> {
    const trimmed = url.trim();
    if (trimmed && !profileService.isValidDiscordWebhook(trimmed)) {
      throw new ValidationError("validation.invalidDiscordWebhook");
    }
    return userRepository.setDiscordWebhook(trimmed || null);
  },

  testDiscordWebhook(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!profileService.isValidDiscordWebhook(trimmed)) throw new ValidationError("validation.invalidDiscordWebhook");
    return userRepository.testDiscordWebhook(trimmed);
  },

  isOwnAccount: (user: User | null, account: string) =>
    !!user?.gw2Account && user.gw2Account.toLowerCase() === account.toLowerCase(),
};
