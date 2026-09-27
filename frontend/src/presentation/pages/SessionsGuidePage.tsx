import { Link } from "react-router-dom";
import { ArrowLeftIcon, FlagIcon, HistoryIcon, MessageSquareIcon, PlayIcon, TimerIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription, AlertTitle } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import PageHeader from "../components/PageHeader";

const STEPS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: "sessionsGuide.step1Title", body: "sessionsGuide.step1Body" },
  { title: "sessionsGuide.step2Title", body: "sessionsGuide.step2Body" },
  { title: "sessionsGuide.step3Title", body: "sessionsGuide.step3Body" },
  { title: "sessionsGuide.step4Title", body: "sessionsGuide.step4Body" },
];

const FACTS: { icon: typeof TimerIcon; title: TranslationKey; body: TranslationKey }[] = [
  { icon: MessageSquareIcon, title: "sessionsGuide.discordTitle", body: "sessionsGuide.discordBody" },
  { icon: TimerIcon, title: "sessionsGuide.durationTitle", body: "sessionsGuide.durationBody" },
  { icon: FlagIcon, title: "sessionsGuide.endTitle", body: "sessionsGuide.endBody" },
];

/** How sessions work (public page at /guide/sessions, opened from the desktop uploader's "?" next to Session). */
export default function SessionsGuidePage() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {user && (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to="/sessions">
            <ArrowLeftIcon /> {t("sessionsGuide.back")}
          </Link>
        </Button>
      )}

      <PageHeader title={t("sessionsGuide.title")} description={t("sessionsGuide.intro")} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="size-4" /> {t("sessionsGuide.howTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-5">
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

      <div className="grid gap-4 sm:grid-cols-3">
        {FACTS.map((f) => (
          <Card key={f.title} className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <f.icon className="size-4" /> {t(f.title)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-pretty">{t(f.body)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <HistoryIcon />
        <AlertTitle>{t("sessionsGuide.expiryTitle")}</AlertTitle>
        <AlertDescription>{t("sessionsGuide.expiryBody")}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessionsGuide.faqTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {(["1", "2", "3"] as const).map((n) => (
            <div key={n} className="space-y-1">
              <p className="font-medium">{t(`sessionsGuide.q${n}`)}</p>
              <p className="text-muted-foreground text-pretty">{t(`sessionsGuide.a${n}`)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {user && (
        <Button asChild className="self-start">
          <Link to="/sessions">{t("sessionsGuide.openSessions")}</Link>
        </Button>
      )}
    </div>
  );
}
