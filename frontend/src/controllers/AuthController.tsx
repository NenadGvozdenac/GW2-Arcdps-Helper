import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import type { ProfileUpdate, RegisterInput, User } from "../domain/types/user.types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
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

  const register = useCallback(async (input: RegisterInput) => {
    setUser(await authService.register(input));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    setUser(await profileService.save(data));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  // Users are shown by their GW2 account; accounts created before it was required fall back to the email.
  return { ...ctx, accountLabel: ctx.user?.gw2Account || ctx.user?.email || "" };
}
