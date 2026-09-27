import { useState } from "react";
import { useAppState } from "../controllers/AppStateController";
import Header, { type Tab } from "./components/Header";
import UpdateBanner from "./components/UpdateBanner";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import UploadsPage from "./pages/UploadsPage";

export default function App() {
  const { user } = useAppState();
  const [tab, setTab] = useState<Tab>("uploads");

  if (!user) {
    return (
      <>
        <UpdateBanner />
        <LoginPage />
      </>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <UpdateBanner />
      <Header tab={tab} onTabChange={setTab} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        {tab === "uploads" ? <UploadsPage /> : <SettingsPage />}
      </main>
    </div>
  );
}
