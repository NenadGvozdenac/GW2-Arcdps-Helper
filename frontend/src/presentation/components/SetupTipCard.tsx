import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, BellIcon, KeyRoundIcon, XIcon, type LucideIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { profileService } from "../../services/profileService";
import { setupTipStorage } from "../../storage/setupTipStorage";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";

function useSetupTipController() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => (user ? setupTipStorage.isDismissed(user.id) : true));
  /** Whether a Discord webhook is connected; null until loaded (or when loading failed), then it isn't nudged. */
  const [hasWebhook, setHasWebhook] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || dismissed) return;
    let cancelled = false;
    profileService
      .getDiscordWebhooks()
      .then((webhooks) => !cancelled && setHasWebhook(webhooks.length > 0))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, dismissed]);

  const missing: { icon: LucideIcon; text: TranslationKey }[] = [];
  if (user && !user.dpsReportToken) missing.push({ icon: KeyRoundIcon, text: "setupTip.dpsReportToken" });
  if (user && hasWebhook === false) missing.push({ icon: BellIcon, text: "setupTip.discordWebhook" });

  return {
    missing,
    visible: !!user && !dismissed && missing.length > 0,
    dismiss: () => {
      if (user) setupTipStorage.dismiss(user.id);
      setDismissed(true);
    },
  };
}

/**
 * Nudge on the overview to add the dps.report token and the Discord webhook (Settings). Lists only what is still
 * missing, disappears once both are set, and never comes back once closed (per account, in this browser).
 */
export default function SetupTipCard() {
  const c = useSetupTipController();
  const { t } = useI18n();
  if (!c.visible) return null;

  return (
    <Card className="relative bg-accent/40">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-8 text-muted-foreground"
        onClick={c.dismiss}
        title={t("setupTip.dismiss")}
        aria-label={t("setupTip.dismiss")}
      >
        <XIcon />
      </Button>
      <CardContent className="flex flex-col gap-3 pr-12">
        <div>
          <p className="font-semibold">{t("setupTip.title")}</p>
          <p className="text-sm text-muted-foreground">{t("setupTip.body", { count: c.missing.length })}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {c.missing.map((m) => (
            <li key={m.text} className="flex items-start gap-2.5 text-sm text-pretty">
              <m.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {t(m.text)}
            </li>
          ))}
        </ul>
        <Button asChild size="sm" className="self-start">
          <Link to="/profile">
            {t("setupTip.open")} <ArrowRightIcon />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
