import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { RequireAuth, RequireGuest } from "./components/RouteGuards";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import CategoryPage from "./pages/CategoryPage";
import AllLogsPage from "./pages/AllLogsPage";
import LogDetailPage from "./pages/LogDetailPage";
import ProfilePage from "./pages/ProfilePage";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="raids" element={<CategoryPage key="raid" category="raid" />} />
          <Route path="fractals" element={<CategoryPage key="fractal" category="fractal" />} />
          <Route path="strikes" element={<CategoryPage key="strike" category="strike" />} />
          <Route path="logs" element={<AllLogsPage />} />
          <Route path="logs/:id" element={<LogDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
