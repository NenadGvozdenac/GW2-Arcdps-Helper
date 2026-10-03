import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import {
  FileChartColumnIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "../Brand";
import { FullPageSpinner } from "../Spinner";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboardIcon, end: true },
  { to: "/admin/users", label: "Users", icon: UsersIcon },
  { to: "/admin/logs", label: "Logs", icon: FileChartColumnIcon },
  { to: "/admin/sessions", label: "Sessions", icon: HistoryIcon },
  { to: "/admin/webhooks", label: "Webhooks", icon: MessageSquareIcon },
  { to: "/admin/security", label: "Security", icon: ShieldAlertIcon },
];

/**
 * Frame of the admin pages: a sidebar on the left (brand, "Admin portal", sections, sign-out), the page on the
 * right. On a phone the sidebar becomes a bar on top whose sections scroll sideways. Sends anyone without a valid
 * admin sign-in to /admin/login.
 */
export default function AdminShell() {
  const { status, logout } = useAdmin();
  if (status === "checking") return <FullPageSpinner />;
  if (status === "signedOut") return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="sticky top-0 z-20 flex shrink-0 flex-col gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:h-svh md:w-60 md:border-r md:border-b-0 md:py-5">
        <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch md:gap-4">
          <Link to="/admin" className="md:self-start">
            <Brand />
          </Link>
          {/* Centered under the brand, between two hairlines (on a phone: at the right of the bar). */}
          <div className="flex items-center gap-3">
            <span className="hidden h-px flex-1 bg-linear-to-r from-transparent to-destructive/50 md:block" />
            <span className="text-[11px] font-semibold tracking-[0.3em] text-destructive">ADMIN PORTAL</span>
            <span className="hidden h-px flex-1 bg-linear-to-l from-transparent to-destructive/50 md:block" />
          </div>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-1 md:flex-col md:overflow-visible" aria-label="Admin">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              <n.icon className="size-4 shrink-0" aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t pt-4 md:block">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOutIcon /> Sign out
          </Button>
        </div>
      </aside>

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        {/* On a phone the sidebar's footer is hidden: sign out from here. */}
        <div className="flex justify-end md:hidden">
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOutIcon /> Sign out
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
