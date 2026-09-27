import type { AuthResponse, User } from "../domain/types/user.types";
import { http } from "./httpClient";
import { tokenStorage } from "../storage/tokenStorage";

export const authRepository = {
  async register(body: { email: string; password: string; gw2Account: string }): Promise<User> {
    const res = await http.post<AuthResponse>("/auth/register", body);
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
