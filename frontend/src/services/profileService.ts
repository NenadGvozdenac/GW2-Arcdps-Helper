import { userRepository } from "../repositories/userRepository";
import { ValidationError } from "../domain/types/validation.types";
import type { DiscordContent, DiscordWebhook, ProfileUpdate, User } from "../domain/types/user.types";
import { DISCORD_MAX_FILTER_ACCOUNTS, DISCORD_WEBHOOK_RE, DPS_REPORT_TOKEN_RE } from "../config/constants";
import { authService } from "./authService";

export const profileService = {
  async save(data: ProfileUpdate): Promise<User> {
    const gw2Account = data.gw2Account.trim();
    if (!authService.isValidGw2Account(gw2Account)) throw new ValidationError("validation.invalidGw2Account");
    return userRepository.updateProfile({ gw2Account });
  },

  isValidDiscordWebhook: (url: string) => DISCORD_WEBHOOK_RE.test(url.trim()),

  getDiscordWebhooks: (): Promise<DiscordWebhook[]> => userRepository.getDiscordWebhooks(),

  /**
   * Adds a GW2 account to a webhook filter (its group or its excluded accounts); throws when it isn't one, is already
   * listed, is on the webhook's other list (`other`) or the list is full.
   */
  addFilterAccount(accounts: string[], account: string, other: string[] = []): string[] {
    const trimmed = account.trim();
    const same = (a: string) => a.toLowerCase() === trimmed.toLowerCase();
    if (!authService.isValidGw2Account(trimmed)) throw new ValidationError("validation.invalidGw2Account");
    if (accounts.some(same)) throw new ValidationError("validation.filterAccountExists");
    if (other.some(same)) throw new ValidationError("validation.filterAccountOtherList");
    if (accounts.length >= DISCORD_MAX_FILTER_ACCOUNTS) throw new ValidationError("validation.tooManyFilterAccounts");
    return [...accounts, trimmed];
  },

  /** Saves the webhooks in order (an empty list disconnects them); every URL must be a Discord webhook. */
  setDiscordWebhooks(webhooks: DiscordWebhook[]): Promise<DiscordWebhook[]> {
    const trimmed = webhooks.map((w) => ({ ...w, url: w.url.trim() }));
    if (trimmed.some((w) => !profileService.isValidDiscordWebhook(w.url))) {
      throw new ValidationError("validation.invalidDiscordWebhook");
    }
    if (new Set(trimmed.map((w) => w.url)).size !== trimmed.length) {
      throw new ValidationError("validation.duplicateDiscordWebhook");
    }
    const lists = trimmed.flatMap((w) => [w.accounts, w.excludedAccounts]);
    if (lists.some((list) => list.some((a) => !authService.isValidGw2Account(a)))) {
      throw new ValidationError("validation.invalidGw2Account");
    }
    if (lists.some((list) => list.length > DISCORD_MAX_FILTER_ACCOUNTS)) {
      throw new ValidationError("validation.tooManyFilterAccounts");
    }
    return userRepository.setDiscordWebhooks(trimmed);
  },

  testDiscordWebhook(url: string, content: DiscordContent): Promise<void> {
    const trimmed = url.trim();
    if (!profileService.isValidDiscordWebhook(trimmed)) throw new ValidationError("validation.invalidDiscordWebhook");
    return userRepository.testDiscordWebhook(trimmed, content);
  },

  /** Saves the dps.report user token, or removes it when `token` is empty. */
  setDpsReportToken(token: string): Promise<User> {
    const trimmed = token.trim();
    if (trimmed && !DPS_REPORT_TOKEN_RE.test(trimmed)) throw new ValidationError("validation.invalidDpsReportToken");
    return userRepository.setDpsReportToken(trimmed || null);
  },

  setSkipEmptyLogs: (enabled: boolean): Promise<User> => userRepository.setSkipEmptyLogs(enabled),

  deleteAccount: (password: string): Promise<void> => userRepository.deleteAccount(password),

  isOwnAccount: (user: User | null, account: string) =>
    !!user?.gw2Account && user.gw2Account.toLowerCase() === account.toLowerCase(),
};
