import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOutIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SettingsIcon, UploadIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useLogs } from "../../controllers/LogsController";
import { useSessions } from "../../controllers/SessionsController";
import { useI18n } from "../../controllers/I18nController";
import { sidebarStorage } from "../../storage/sidebarStorage";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "./Brand";
import MobileMenu from "./MobileMenu";
import { FullPageSpinner } from "./Spinner";
import { NAV_SECTIONS } from "./navigation";

/** A sidebar link or button; collapsed, only its icon (its label on hover). */
const itemClass = (collapsed: boolean, isActive = false) =>
  cn(
    "flex items-center gap-2.5 whitespace-nowrap rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
    collapsed ? "justify-center px-0" : "px-3",
    isActive && "bg-accent text-accent-foreground",
  );

/**
 * App shell for signed-in pages: a sidebar on the left (brand, the logs section with upload, the builds section; the
 * account, settings and sign-out at the bottom), the page on the right. The sidebar collapses to the logo and icons
 * (remembered in this browser). On a phone it is a bar on top with the hamburger menu instead. Renders `children` when
 * given (the "/" route), otherwise the nested route. `wide`: the page takes all the room beside the sidebar instead of
 * the usual reading width (the dashboard).
 */
export default function Layout({ children, wide = false }: { children?: ReactNode; wide?: boolean }) {
  const { user, accountLabel, logout } = useAuth();
  const { loading: logsLoading } = useLogs();
  const { loading: sessionsLoading } = useSessions();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(sidebarStorage.getCollapsed);
  const toggleCollapsed = () => {
    sidebarStorage.setCollapsed(!collapsed);
    setCollapsed(!collapsed);
  };

  // One spinner for the whole screen until the user, their logs and sessions are loaded, then everything at once.
  if (logsLoading || sessionsLoading) return <FullPageSpinner />;

  /** Collapsed, the label is only a tooltip (and for screen readers). */
  const label = (text: string) => (collapsed ? <span className="sr-only">{text}</span> : text);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Phone: a bar on top. */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/">
          <Brand />
        </Link>
        <MobileMenu />
      </header>

      {/* Desktop: the sidebar. */}
      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-svh shrink-0 flex-col gap-5 border-r bg-background/95 py-5 backdrop-blur md:flex",
          collapsed ? "w-16 px-2" : "w-64 px-3",
        )}
      >
        <div className={cn("flex items-center justify-between gap-2", collapsed && "flex-col")}>
          <Link to="/" title={collapsed ? "GW2 ArcDPS Helper" : undefined}>
            <Brand compact={collapsed} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={toggleCollapsed}
            title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* Logs (with their upload), then builds: sections apart, divided by a line. */}
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className={cn("flex flex-col gap-1", i > 0 && "border-t pt-4")}>
              {section.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  title={collapsed ? t(n.label) : undefined}
                  className={({ isActive }) => itemClass(collapsed, isActive)}
                >
                  <n.icon className="size-4 shrink-0" aria-hidden="true" />
                  {label(t(n.label))}
                </NavLink>
              ))}
              {i === 0 && (
                <Button
                  asChild
                  size={collapsed ? "icon" : "sm"}
                  className={cn("mt-2", collapsed ? "w-full" : "justify-start")}
                >
                  <Link to="/upload" title={collapsed ? t("nav.upload") : undefined}>
                    <UploadIcon /> {label(t("nav.upload"))}
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t pt-4">
          {/* The account, centered between two hairlines; collapsed, only in the settings link's tooltip. */}
          {user && !collapsed && (
            <div className="mb-2 flex items-center gap-3" title={user.email}>
              <span className="h-px flex-1 bg-linear-to-r from-transparent to-primary/50" />
              <span className="min-w-0 truncate text-base font-semibold tracking-tight">{accountLabel}</span>
              <span className="h-px flex-1 bg-linear-to-l from-transparent to-primary/50" />
            </div>
          )}
          <NavLink
            to="/profile"
            title={collapsed ? `${t("nav.settings")} · ${accountLabel}` : undefined}
            className={({ isActive }) => itemClass(collapsed, isActive)}
          >
            <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />
            {label(t("nav.settings"))}
          </NavLink>
          <button
            type="button"
            onClick={() => logout()}
            title={collapsed ? t("nav.logout") : undefined}
            className={cn(itemClass(collapsed), "cursor-pointer")}
          >
            <LogOutIcon className="size-4 shrink-0" aria-hidden="true" />
            {label(t("nav.logout"))}
          </button>
        </div>
      </aside>

      <main className={cn("mx-auto w-full min-w-0 flex-1 px-4 py-6 md:px-8", !wide && "max-w-6xl")}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
