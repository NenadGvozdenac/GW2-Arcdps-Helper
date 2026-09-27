import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import Brand from "./Brand";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Frame for the public guide pages (/guide/*) when nobody is signed in: logo, language and sign-in links.
 * Signed-in users see the same pages inside the normal app Layout.
 */
export default function GuestGuideShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/">
            <Brand />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{t("landing.nav.signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">{t("landing.nav.getStarted")}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
