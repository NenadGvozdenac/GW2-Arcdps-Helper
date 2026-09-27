export interface User {
  id: string;
  email: string;
  gw2Account: string;
  /** Discord webhook new logs are posted to; null = not connected. */
  discordWebhookUrl: string | null;
  /** dps.report user token for this account's uploads (website, desktop uploader, Nexus addon); null = not set. */
  dpsReportToken: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  gw2Account: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileUpdate {
  gw2Account: string;
}
