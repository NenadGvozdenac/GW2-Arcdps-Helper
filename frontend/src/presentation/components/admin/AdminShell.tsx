import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { LogOutIcon, ShieldIcon } from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";
import Brand from "../Brand";
import { FullPageSpinner } from "../Spinner";

const NAV = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/logs", label: "Logs" },
  { to: "/admin/sessions", label: "Sessions" },
  { to: "/admin/webhooks", label: "Webhooks" },
  { to: "/admin/security", label: "Security" },
];

/** Frame of the admin pages; sends anyone without a valid admin sign-in to /admin/login. */
export default function AdminShell() {
  const { status, email, logout } = useAdmin();
  if (status === "checking") return <FullPageSpinner />;
  if (status === "signedOut") return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <Brand />
            <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
              <ShieldIcon className="size-3" /> Admin
            </Badge>
          </Link>
          <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1" aria-label="Admin">
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
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOutIcon /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
