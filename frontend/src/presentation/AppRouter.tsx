import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AdminProvider } from "../controllers/AdminController";
import Layout from "./components/Layout";
import { HomeRoute, PublicRoute, RequireAuth, RequireGuest } from "./components/RouteGuards";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AppLoginPage from "./pages/AppLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import CategoryPage, { RaidsStrikesPage } from "./pages/CategoryPage";
import AllLogsPage from "./pages/AllLogsPage";
import LogDetailPage from "./pages/LogDetailPage";
import ProfilePage from "./pages/ProfilePage";
import DiscordGuidePage from "./pages/DiscordGuidePage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SessionsPage from "./pages/SessionsPage";
import SessionsGuidePage from "./pages/SessionsGuidePage";
import SharedSessionPage from "./pages/SharedSessionPage";
import SharedLogPage from "./pages/SharedLogPage";
import LegalPage from "./pages/LegalPage";
import FeedbackPage from "./pages/FeedbackPage";
import BuildsPage from "./pages/BuildsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminShell from "./components/admin/AdminShell";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserPage from "./pages/admin/AdminUserPage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
import AdminSessionsPage from "./pages/admin/AdminSessionsPage";
import AdminWebhooksPage from "./pages/admin/AdminWebhooksPage";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import GuestGuideShell from "./components/GuestGuideShell";

/** A public guide page: inside the app Layout for signed-in users, a minimal frame for guests. */
const guide = (page: ReactNode) => (
  <PublicRoute signedIn={<Layout>{page}</Layout>} guest={<GuestGuideShell>{page}</GuestGuideShell>} />
);

/** Sends an old address to its new one, keeping the query (e.g. ?boss= from a log's "back" link). */
function MovedTo({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

/** A new page starts at the top (the SPA would otherwise keep the previous page's scroll position). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<RequireGuest />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        {/* Link from the confirmation email; signs in, so it works whether or not someone is signed in already. */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        {/* Link from the password-reset email; also usable while signed in. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          index
          element={
            <HomeRoute
              guest={<LandingPage />}
              signedIn={
                <Layout wide>
                  <DashboardPage />
                </Layout>
              }
            />
          }
        />
        <Route path="guide/sessions" element={guide(<SessionsGuidePage />)} />
        <Route path="guide/discord" element={guide(<DiscordGuidePage />)} />
        <Route path="privacy" element={guide(<LegalPage key="privacy" kind="privacy" />)} />
        <Route path="terms" element={guide(<LegalPage key="terms" kind="terms" />)} />
        {/* Anyone can send feedback; signed in, it is linked to the account. */}
        <Route path="feedback" element={guide(<FeedbackPage />)} />
        <Route path="shared/sessions/:token" element={guide(<SharedSessionPage />)} />
        <Route path="shared/logs/:token" element={guide(<SharedLogPage />)} />
        <Route path="settings/discord" element={<Navigate to="/guide/discord" replace />} />
        <Route element={<RequireAuth />}>
          {/* "Sign in with the browser" of the desktop uploader / Nexus addon — a page of its own, outside the app layout. */}
          <Route path="app-login/:id" element={<AppLoginPage />} />
          <Route element={<Layout />}>
            <Route path="upload" element={<UploadPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="logs/:id" element={<LogDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          {/* Pages that use all the room beside the sidebar. */}
          <Route element={<Layout wide />}>
            <Route path="raids-strikes" element={<RaidsStrikesPage />} />
            <Route path="fractals" element={<CategoryPage key="fractal" category="fractal" />} />
            <Route path="logs" element={<AllLogsPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="builds" element={<BuildsPage />} />
          </Route>
          {/* Raids and strikes used to be pages of their own. */}
          <Route path="raids" element={<MovedTo to="/raids-strikes" />} />
          <Route path="strikes" element={<MovedTo to="/raids-strikes" />} />
        </Route>
        {/* The administrator's area: its own sign-in (password + authenticator code), independent of a user's. */}
        <Route
          path="admin"
          element={
            <AdminProvider>
              <Outlet />
            </AdminProvider>
          }
        >
          <Route path="login" element={<AdminLoginPage />} />
          <Route element={<AdminShell />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:id" element={<AdminUserPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="sessions" element={<AdminSessionsPage />} />
            <Route path="webhooks" element={<AdminWebhooksPage />} />
            <Route path="security" element={<AdminSecurityPage />} />
          </Route>
        </Route>
        <Route path="*" element={guide(<NotFoundPage />)} />
      </Routes>
    </>
  );
}
