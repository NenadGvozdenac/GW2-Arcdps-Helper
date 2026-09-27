import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOutIcon, SettingsIcon, UploadIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "./Brand";

const NAV: { to: string; label: TranslationKey; end?: boolean }[] = [
  { to: "/", label: "nav.overview", end: true },
  { to: "/raids", label: "nav.raids" },
  { to: "/fractals", label: "nav.fractals" },
  { to: "/strikes", label: "nav.strikes" },
  { to: "/logs", label: "nav.allLogs" },
];

/** App shell for signed-in pages; renders `children` when given (the "/" route), otherwise the nested route. */
export default function Layout({ children }: { children?: ReactNode }) {
  const { user, accountLabel, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/">
            <Brand />
          </Link>
          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                  )
                }
              >
                {t(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/upload">
                <UploadIcon /> {t("nav.upload")}
              </Link>
            </Button>
            <span className="max-w-40 truncate px-2 text-sm font-medium" title={user?.email ?? ""}>
              {accountLabel}
            </span>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <NavLink
                to="/profile"
                title={t("nav.settings")}
                aria-label={t("nav.settings")}
                className={({ isActive }) => cn(isActive && "bg-accent text-accent-foreground")}
              >
                <SettingsIcon />
              </NavLink>
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => logout()} title={t("nav.logout")}>
              <LogOutIcon />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
