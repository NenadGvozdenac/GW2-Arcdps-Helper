import { useState } from "react";
import { useAppState } from "../controllers/AppStateController";
import { cn } from "@/presentation/lib/utils";
import Header, { type Tab } from "./components/Header";
import UpdateBanner from "./components/UpdateBanner";
import ClearsPage from "./pages/ClearsPage";
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
    // The weekly clear fills exactly the window height (no scrolling); the other pages scroll as usual.
    <div className={cn("flex flex-col", tab === "clears" ? "h-svh" : "min-h-svh")}>
      <UpdateBanner />
      <Header tab={tab} onTabChange={setTab} />
      <main
        className={cn(
          "mx-auto w-full max-w-5xl flex-1 px-5 py-6",
          tab === "clears" && "min-h-0 [@media(max-height:700px)]:py-4",
        )}
      >
        {tab === "uploads" ? <UploadsPage /> : tab === "clears" ? <ClearsPage /> : <SettingsPage />}
      </main>
    </div>
  );
}
