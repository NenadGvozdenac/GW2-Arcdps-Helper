import type { DiscordContent, DiscordWebhook, ProfileUpdate, User } from "../domain/types/user.types";
import { http } from "./httpClient";

export const userRepository = {
  /** Deletes the signed-in user's account with all of its logs and sessions (the password confirms it). */
  deleteAccount: (password: string) => http.deleteWithBody("/profile", { password }),

  async updateProfile(patch: ProfileUpdate): Promise<User> {
    return (await http.patch<{ user: User }>("/profile", patch)).user;
  },

  async getDiscordWebhooks(): Promise<DiscordWebhook[]> {
    return (await http.get<{ webhooks: DiscordWebhook[] }>("/profile/discord-webhooks")).webhooks;
  },

  /** Replaces the whole list, in order; an empty list disconnects them. */
  async setDiscordWebhooks(webhooks: DiscordWebhook[]): Promise<DiscordWebhook[]> {
    return (await http.put<{ webhooks: DiscordWebhook[] }>("/profile/discord-webhooks", { webhooks })).webhooks;
  },

  /** `content` is what the webhook will post; the test message says so. */
  testDiscordWebhook: (url: string, content: DiscordContent) =>
    http.post<void>("/profile/discord-webhooks/test", { url, content }),

  /** null removes the token. */
  async setDpsReportToken(token: string | null): Promise<User> {
    return (await http.put<{ user: User }>("/profile/dps-report-token", { token })).user;
  },
};
