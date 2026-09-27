import type { ProfileUpdate, User } from "../domain/types/user.types";
import { http } from "./httpClient";

export const userRepository = {
  async updateProfile(patch: ProfileUpdate): Promise<User> {
    return (await http.patch<{ user: User }>("/profile", patch)).user;
  },

  /** null disconnects the webhook. */
  async setDiscordWebhook(url: string | null): Promise<User> {
    return (await http.put<{ user: User }>("/profile/discord-webhook", { url })).user;
  },

  testDiscordWebhook: (url: string) => http.post<void>("/profile/discord-webhook/test", { url }),

  /** null removes the token. */
  async setDpsReportToken(token: string | null): Promise<User> {
    return (await http.put<{ user: User }>("/profile/dps-report-token", { token })).user;
  },
};
