import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import type { ProfileUpdate, RegisterInput, User } from "../domain/types/user.types";
import type { Language } from "../i18n/i18n.types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account (not signed in yet) and returns the email the confirmation link went to. */
  register: (input: RegisterInput, language: Language) => Promise<string>;
  /** Confirms the email from the emailed link and signs the user in. */
  verifyEmail: (token: string) => Promise<void>;
  /** Sets a new password from the emailed reset link and signs the user in. */
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  /** Saves the dps.report user token, or removes it when `token` is empty. */
  setDpsReportToken: (token: string) => Promise<void>;
  /** Permanently deletes the account (confirmed with the password), signs out and reloads on the landing page. */
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Holds the signed-in user for the whole app and exposes auth actions. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Without a saved sign-in there is nothing to restore, so guests are never in a loading state.
  const [loading, setLoading] = useState(authService.hasSavedSession);

  useEffect(() => {
    if (!loading) return;
    authService
      .restoreSession()
      .then(setUser)
      .finally(() => setLoading(false));
    // Runs once on start-up.
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await authService.login(email, password));
  }, []);

  const register = useCallback((input: RegisterInput, language: Language) => authService.register(input, language), []);

  const verifyEmail = useCallback(async (token: string) => {
    setUser(await authService.verifyEmail(token));
  }, []);

  const resetPassword = useCallback(async (token: string, password: string, confirmPassword: string) => {
    setUser(await authService.resetPassword(token, password, confirmPassword));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    setUser(await profileService.save(data));
  }, []);

  const setDpsReportToken = useCallback(async (token: string) => {
    setUser(await profileService.setDpsReportToken(token));
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await profileService.deleteAccount(password);
    authService.logout();
    // A fresh start as a guest on the landing page, which also drops every log and session still held in memory.
    // (Clearing `user` here instead would let the settings page's guard redirect to the sign-in page first.)
    window.location.replace("/");
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      verifyEmail,
      resetPassword,
      logout,
      updateProfile,
      setDpsReportToken,
      deleteAccount,
    }),
    [
      user,
      loading,
      login,
      register,
      verifyEmail,
      resetPassword,
      logout,
      updateProfile,
      setDpsReportToken,
      deleteAccount,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  // Users are shown by their GW2 account; accounts created before it was required fall back to the email.
  return { ...ctx, accountLabel: ctx.user?.gw2Account || ctx.user?.email || "" };
}
