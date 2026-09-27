import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { HomeRoute, RequireAuth, RequireGuest } from "./components/RouteGuards";
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

export default function AppRouter() {
  return (
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
          <Route path="settings/discord" element={<DiscordGuidePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
