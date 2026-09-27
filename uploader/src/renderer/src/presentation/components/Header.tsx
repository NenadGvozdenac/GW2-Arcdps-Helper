import { LogOutIcon, SettingsIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "./Brand";

export type Tab = "uploads" | "settings";

export default function Header({ tab, onTabChange }: { tab: Tab; onTabChange: (tab: Tab) => void }) {
  const { user, watch } = useAppState();
  const { t } = useI18n();

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
      active && "bg-accent text-accent-foreground",
    );

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3">
        <Brand />
        <nav className="flex flex-1 gap-1">
          <button className={tabClass(tab === "uploads")} onClick={() => onTabChange("uploads")}>
            <span className={cn("size-2 rounded-full", watch.watching ? "bg-success" : "bg-muted-foreground/40")} />
            {t("header.tabUploads")}
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <span className="max-w-40 truncate px-2 text-sm font-medium" title={user?.email}>
            {user?.displayName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", tab === "settings" && "bg-accent text-accent-foreground")}
            onClick={() => onTabChange(tab === "settings" ? "uploads" : "settings")}
            title={t("header.tabSettings")}
            aria-pressed={tab === "settings"}
          >
            <SettingsIcon />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => uploaderBridge.logout()} title={t("header.signOut")}>
            <LogOutIcon />
          </Button>
        </div>
      </div>
    </header>
  );
}
