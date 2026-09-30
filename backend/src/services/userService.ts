import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/userRepository";
import type { ProfileUpdate, User } from "../types/user.types";
import { discordWebhookRepository } from "../repositories/discordWebhookRepository";
import type { DiscordContent, DiscordWebhook } from "../types/discord.types";
import { discordService } from "./discordService";
import { userNotFound, wrongPassword } from "../utils/httpError";

export const userService = {
  async get(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw userNotFound();
    return user;
  },

  /**
   * Permanently deletes the account with all of its logs and sessions, after checking the password. Reports already
   * uploaded to dps.report stay there (they aren't ours to delete).
   */
  async deleteAccount(id: string, password: string): Promise<void> {
    const row = await userRepository.findRowById(id);
    if (!row) throw userNotFound();
    if (!(await bcrypt.compare(password, row.passwordHash))) throw wrongPassword();
    await userRepository.delete(id);
  },

  async updateProfile(id: string, patch: ProfileUpdate): Promise<User> {
    const user = await userRepository.update(id, patch);
    if (!user) throw userNotFound();
    return user;
  },

  /** The user's Discord webhooks in order (first, second). */
  getDiscordWebhooks: (id: string): Promise<DiscordWebhook[]> => discordWebhookRepository.list(id),

  /** Replaces the user's Discord webhooks (an empty list disconnects them). */
  async setDiscordWebhooks(id: string, webhooks: DiscordWebhook[]): Promise<DiscordWebhook[]> {
    if (!(await userRepository.exists(id))) throw userNotFound();
    return discordWebhookRepository.replace(id, webhooks);
  },

  testDiscordWebhook: (url: string, content: DiscordContent) => discordService.sendTest(url, content),

  /** Saves (or with null, removes) the dps.report user token used for this user's uploads. */
  async setDpsReportToken(id: string, token: string | null): Promise<User> {
    const user = await userRepository.update(id, { dpsReportToken: token });
    if (!user) throw userNotFound();
    return user;
  },
};
