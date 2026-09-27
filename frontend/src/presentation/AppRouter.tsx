import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { HomeRoute, PublicRoute, RequireAuth, RequireGuest } from "./components/RouteGuards";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import CategoryPage from "./pages/CategoryPage";
import AllLogsPage from "./pages/AllLogsPage";
import LogDetailPage from "./pages/LogDetailPage";
import ProfilePage from "./pages/ProfilePage";
import DiscordGuidePage from "./pages/DiscordGuidePage";
import SessionDetailPage from "./pages/SessionDetailPage";
import SessionsPage from "./pages/SessionsPage";
import SessionsGuidePage from "./pages/SessionsGuidePage";
import SharedSessionPage from "./pages/SharedSessionPage";
import GuestGuideShell from "./components/GuestGuideShell";

/** A public guide page: inside the app Layout for signed-in users, a minimal frame for guests. */
const guide = (page: ReactNode) => (
  <PublicRoute signedIn={<Layout>{page}</Layout>} guest={<GuestGuideShell>{page}</GuestGuideShell>} />
);

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
        </Route>
        <Route
          index
          element={
            <HomeRoute
              guest={<LandingPage />}
              signedIn={
                <Layout>
                  <DashboardPage />
                </Layout>
              }
            />
          }
        />
        {/* Guides are public (opened from the desktop uploader too), in the app layout when signed in. */}
        <Route path="guide/sessions" element={guide(<SessionsGuidePage />)} />
        <Route path="guide/discord" element={guide(<DiscordGuidePage />)} />
        <Route path="shared/sessions/:token" element={guide(<SharedSessionPage />)} />
        <Route path="settings/discord" element={<Navigate to="/guide/discord" replace />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="upload" element={<UploadPage />} />
            <Route path="raids" element={<CategoryPage key="raid" category="raid" />} />
            <Route path="fractals" element={<CategoryPage key="fractal" category="fractal" />} />
            <Route path="strikes" element={<CategoryPage key="strike" category="strike" />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="logs" element={<AllLogsPage />} />
            <Route path="logs/:id" element={<LogDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
