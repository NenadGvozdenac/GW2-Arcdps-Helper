import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  InfoIcon,
  MessageSquareIcon,
  PauseIcon,
  ShieldAlertIcon,
  SplitIcon,
  UserXIcon,
  UsersIcon,
} from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription, AlertTitle } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import PageHeader from "../components/PageHeader";

type Step = { title: TranslationKey; body: TranslationKey };

const STEPS: Step[] = [
  { title: "discordGuide.step1Title", body: "discordGuide.step1Body" },
  { title: "discordGuide.step2Title", body: "discordGuide.step2Body" },
  { title: "discordGuide.step3Title", body: "discordGuide.step3Body" },
  { title: "discordGuide.step4Title", body: "discordGuide.step4Body" },
  { title: "discordGuide.step5Title", body: "discordGuide.step5Body" },
  { title: "discordGuide.step6Title", body: "discordGuide.step6Body" },
  { title: "discordGuide.step7Title", body: "discordGuide.step7Body" },
];

const TWO_STEPS: Step[] = [
  { title: "discordGuide.two1Title", body: "discordGuide.two1Body" },
  { title: "discordGuide.two2Title", body: "discordGuide.two2Body" },
  { title: "discordGuide.two3Title", body: "discordGuide.two3Body" },
  { title: "discordGuide.two4Title", body: "discordGuide.two4Body" },
];

const FILTER_STEPS: Step[] = [
  { title: "discordGuide.filter1Title", body: "discordGuide.filter1Body" },
  { title: "discordGuide.filter2Title", body: "discordGuide.filter2Body" },
  { title: "discordGuide.filter3Title", body: "discordGuide.filter3Body" },
  { title: "discordGuide.filter4Title", body: "discordGuide.filter4Body" },
];

/** Numbered steps, each with a title and a line of explanation. */
function StepList({ steps }: { steps: Step[] }) {
  const { t } = useI18n();
  return (
    <ol className="flex flex-col gap-6">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {i + 1}
          </span>
          <div className="space-y-1 pt-1">
            <h3 className="font-semibold">{t(s.title)}</h3>
            <p className="text-sm text-muted-foreground text-pretty">{t(s.body)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * How to create a Discord webhook and connect it in Settings, plus the optional second channel, filters and pausing
 * (public page at /guide/discord).
 */
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
        <CardHeader>
          <CardTitle>{t("discordGuide.stepsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StepList steps={STEPS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SplitIcon className="size-4" /> {t("discordGuide.twoTitle")}
          </CardTitle>
          <CardDescription>{t("discordGuide.twoIntro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StepList steps={TWO_STEPS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4" /> {t("discordGuide.filterTitle")}
          </CardTitle>
          <CardDescription>{t("discordGuide.filterIntro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <StepList steps={FILTER_STEPS} />
        </CardContent>
      </Card>

      <Alert>
        <UserXIcon />
        <AlertTitle>{t("discordGuide.excludeTitle")}</AlertTitle>
        <AlertDescription>{t("discordGuide.excludeBody")}</AlertDescription>
      </Alert>

      <Alert>
        <PauseIcon />
        <AlertTitle>{t("discordGuide.pauseTitle")}</AlertTitle>
        <AlertDescription>{t("discordGuide.pauseBody")}</AlertDescription>
      </Alert>

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
