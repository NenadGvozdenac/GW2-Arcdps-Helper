import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOutIcon, SettingsIcon, UploadIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useLogs } from "../../controllers/LogsController";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "./Brand";
import MobileMenu from "./MobileMenu";
import { FullPageSpinner } from "./Spinner";
import { NAV } from "./navigation";

/** App shell for signed-in pages; renders `children` when given (the "/" route), otherwise the nested route. */
export default function Layout({ children }: { children?: ReactNode }) {
  const { user, accountLabel, logout } = useAuth();
  const { loading } = useLogs();
  const { t } = useI18n();

  // One spinner for the whole screen until the user and their logs are loaded, then everything at once.
  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/">
            <Brand />
          </Link>
          <nav className="hidden flex-1 gap-1 md:flex">
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
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Button asChild size="sm">
              <Link to="/upload">
                <UploadIcon /> {t("nav.upload")}
              </Link>
            </Button>
            {user && (
              <span className="max-w-40 truncate px-2 text-sm font-medium" title={user.email}>
                {accountLabel}
              </span>
            )}
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
          <div className="ml-auto md:hidden">
            <MobileMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
