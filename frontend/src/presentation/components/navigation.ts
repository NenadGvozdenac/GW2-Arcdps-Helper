import { CalendarClockIcon, GemIcon, LayoutDashboardIcon, ListIcon, SwordsIcon, TargetIcon, type LucideIcon } from "lucide-react";
import type { TranslationKey } from "../../i18n/i18n.types";

/** Main navigation of the signed-in app — the top bar on desktop, the hamburger menu on phones. */
export const NAV: { to: string; label: TranslationKey; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "nav.overview", icon: LayoutDashboardIcon, end: true },
  { to: "/raids", label: "nav.raids", icon: SwordsIcon },
  { to: "/fractals", label: "nav.fractals", icon: GemIcon },
  { to: "/strikes", label: "nav.strikes", icon: TargetIcon },
  { to: "/sessions", label: "nav.sessions", icon: CalendarClockIcon },
  { to: "/logs", label: "nav.allLogs", icon: ListIcon },
];
