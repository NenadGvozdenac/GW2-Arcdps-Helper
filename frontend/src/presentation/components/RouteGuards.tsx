import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../controllers/AuthController";

/**
 * While a saved sign-in is being restored the page is rendered anyway: it shows a spinner
 * (LogsController reports loading until the user is known), so every page has exactly one loading state.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Outlet />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** "/" shows the landing page to guests and `signedIn` to signed-in users (also while their session is restored). */
export function HomeRoute({ guest, signedIn }: { guest: ReactNode; signedIn: ReactNode }) {
  const { user, loading } = useAuth();
  return <>{user || loading ? signedIn : guest}</>;
}

/** A page anyone may open: inside the app layout for signed-in users (also while restoring), `guest` otherwise. */
export function PublicRoute({ signedIn, guest }: { signedIn: ReactNode; guest: ReactNode }) {
  const { user, loading } = useAuth();
  return <>{user || loading ? signedIn : guest}</>;
}

export function RequireGuest() {
  const { user, loading } = useAuth();
  const location = useLocation();
  // A saved sign-in is being restored and will most likely redirect away — don't flash the form.
  if (loading) return null;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}
