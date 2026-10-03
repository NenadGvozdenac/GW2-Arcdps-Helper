import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminService } from "../services/adminService";
import { ApiError } from "../domain/types/api.types";

type AdminStatus = "checking" | "signedIn" | "signedOut";

interface AdminContextValue {
  status: AdminStatus;
  /** The configured administrator's email, once signed in. */
  email: string | null;
  login: (email: string, password: string, code: string) => Promise<void>;
  logout: () => void;
  /** Turns an error from an admin call into a message; a rejected token (401) signs out. */
  handleError: (err: unknown) => string;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/**
 * The administrator's sign-in, separate from a user's: its own token (sessionStorage, so it ends with the tab) and
 * its own pages under /admin. A token is checked against the server on load.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminStatus>(() => (adminService.hasToken() ? "checking" : "signedOut"));
  const [email, setEmail] = useState<string | null>(null);

  const logout = useCallback(() => {
    adminService.logout();
    setEmail(null);
    setStatus("signedOut");
  }, []);

  const loadMe = useCallback(async () => {
    try {
      setEmail((await adminService.me()).email);
      setStatus("signedIn");
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (adminService.hasToken()) loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string, code: string) => {
      await adminService.login(email, password, code);
      await loadMe();
    },
    [loadMe],
  );

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 401) logout();
        return err.message;
      }
      return err instanceof Error ? err.message : "Something went wrong.";
    },
    [logout],
  );

  const value = useMemo(() => ({ status, email, login, logout, handleError }), [status, email, login, logout, handleError]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}
