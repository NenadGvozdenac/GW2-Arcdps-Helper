import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOutIcon, MenuIcon, SettingsIcon, UploadIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/presentation/components/ui/sheet";
import { cn } from "@/presentation/lib/utils";
import { NAV_SECTIONS } from "./navigation";

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4",
    isActive && "bg-accent text-accent-foreground",
  );

/** Hamburger menu with every navigation option, shown instead of the top bar on phones. */
export default function MobileMenu() {
  const { user, accountLabel, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Links close the sheet themselves: SheetClose asChild can't merge NavLink's function className.
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 md:hidden" aria-label={t("nav.menu")}>
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 gap-0" closeLabel={t("nav.closeMenu")}>
        <SheetHeader className="border-b pr-10">
          <SheetTitle className="truncate">{accountLabel}</SheetTitle>
          {user?.email && user.email !== accountLabel && (
            <SheetDescription className="truncate">{user.email}</SheetDescription>
          )}
        </SheetHeader>

        {NAV_SECTIONS.map((section, i) => (
          <nav key={i} className={cn("flex flex-col gap-1 p-3", i > 0 && "border-t")}>
            {section.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={itemClass} onClick={close}>
                <n.icon /> {t(n.label)}
              </NavLink>
            ))}
            {i === 0 && (
              <Button asChild className="mt-2 justify-start">
                <Link to="/upload" onClick={close}>
                  <UploadIcon /> {t("nav.upload")}
                </Link>
              </Button>
            )}
          </nav>
        ))}

        <div className="flex flex-col gap-1 border-t p-3">
          <NavLink to="/profile" className={itemClass} onClick={close}>
            <SettingsIcon /> {t("nav.settings")}
          </NavLink>
        </div>

        <SheetFooter className="border-t">
          <Button variant="outline" className="justify-start text-destructive" onClick={() => logout()}>
            <LogOutIcon /> {t("nav.logout")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
