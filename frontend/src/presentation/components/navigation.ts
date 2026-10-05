import {
  BookMarkedIcon,
  CalendarClockIcon,
  GemIcon,
  LayoutDashboardIcon,
  ListIcon,
  SwordsIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "../../i18n/i18n.types";

export interface NavItem {
  to: string;
  label: TranslationKey;
  icon: LucideIcon;
  end?: boolean;
}

/**
 * Main navigation of the signed-in app — the sidebar on desktop, the hamburger menu on phones — in sections shown
 * apart: the logs, then the builds (not logs).
 */
export const NAV_SECTIONS: NavItem[][] = [
  [
    { to: "/", label: "nav.overview", icon: LayoutDashboardIcon, end: true },
    { to: "/raids", label: "nav.raids", icon: SwordsIcon },
    { to: "/fractals", label: "nav.fractals", icon: GemIcon },
    { to: "/strikes", label: "nav.strikes", icon: TargetIcon },
    { to: "/sessions", label: "nav.sessions", icon: CalendarClockIcon },
    { to: "/logs", label: "nav.allLogs", icon: ListIcon },
  ],
  [{ to: "/builds", label: "nav.builds", icon: BookMarkedIcon }],
];
