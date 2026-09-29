import type { AuthResponse, User } from "../domain/types/user.types";
import type { Language } from "../i18n/i18n.types";
import { http } from "./httpClient";
import { tokenStorage } from "../storage/tokenStorage";

export const authRepository = {
  /** Creates an unconfirmed account and returns its email; the server emails a confirmation link to it. */
  async register(body: { email: string; password: string; gw2Account: string; language: Language }): Promise<string> {
    return (await http.post<{ email: string }>("/auth/register", body)).email;
  },

  /** Confirms the email with the token from the emailed link and signs in. */
  async verifyEmail(token: string): Promise<User> {
    const res = await http.post<AuthResponse>("/auth/verify-email", { token });
    tokenStorage.set(res.token);
    return res.user;
  },

  resendVerification: (email: string, language: Language): Promise<void> =>
    http.post<void>("/auth/resend-verification", { email, language }),

  forgotPassword: (email: string, language: Language): Promise<void> =>
    http.post<void>("/auth/forgot-password", { email, language }),

  /** Sets a new password with the token from the emailed link and signs in. */
  async resetPassword(token: string, password: string): Promise<User> {
    const res = await http.post<AuthResponse>("/auth/reset-password", { token, password });
    tokenStorage.set(res.token);
    return res.user;
  },

  async login(email: string, password: string): Promise<User> {
    const res = await http.post<AuthResponse>("/auth/login", { email, password });
    tokenStorage.set(res.token);
    return res.user;
  },

  hasToken: (): boolean => !!tokenStorage.get(),

  /** Returns the current user, or null if there is no valid session. */
  async me(): Promise<User | null> {
    if (!tokenStorage.get()) return null;
    try {
      return (await http.get<{ user: User }>("/auth/me")).user;
    } catch {
      tokenStorage.clear();
      return null;
    }
  },

  logout: () => tokenStorage.clear(),
};
