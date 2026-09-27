import { Link } from "react-router-dom";
import { ArrowLeftIcon, InfoIcon, MessageSquareIcon, ShieldAlertIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription, AlertTitle } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import PageHeader from "../components/PageHeader";

const STEPS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "discordGuide.step1Title", body: "discordGuide.step1Body" },
  { title: "discordGuide.step2Title", body: "discordGuide.step2Body" },
  { title: "discordGuide.step3Title", body: "discordGuide.step3Body" },
  { title: "discordGuide.step4Title", body: "discordGuide.step4Body" },
  { title: "discordGuide.step5Title", body: "discordGuide.step5Body" },
  { title: "discordGuide.step6Title", body: "discordGuide.step6Body" },
];

/** How to create a Discord webhook and connect it in Settings (public page at /guide/discord). */
export default function DiscordGuidePage() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      {user && (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/profile">
            <ArrowLeftIcon /> {t("discordGuide.back")}
          </Link>
        </Button>
      )}

      <PageHeader title={t("discordGuide.title")} description={t("discordGuide.intro")} />

      <Alert>
        <InfoIcon />
        <AlertTitle>{t("discordGuide.needTitle")}</AlertTitle>
        <AlertDescription>{t("discordGuide.needBody")}</AlertDescription>
      </Alert>

      <Card>
        <CardContent>
          <ol className="flex flex-col gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="space-y-1 pt-1">
                  <h2 className="font-semibold">{t(s.title)}</h2>
                  <p className="text-sm text-muted-foreground text-pretty">{t(s.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-4" /> {t("discordGuide.postedTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-pretty">{t("discordGuide.postedBody")}</p>
        </CardContent>
      </Card>

      <Alert variant="destructive">
        <ShieldAlertIcon />
        <AlertTitle>{t("discordGuide.safetyTitle")}</AlertTitle>
        <AlertDescription>{t("discordGuide.safetyBody")}</AlertDescription>
      </Alert>

      {user && (
        <Button asChild className="self-start">
          <Link to="/profile">{t("discordGuide.openSettings")}</Link>
        </Button>
      )}
    </div>
  );
}
