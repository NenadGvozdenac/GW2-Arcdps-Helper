import { Link } from "react-router-dom";
import { ExternalLinkIcon, TargetIcon, TrophyIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { PracticeRun } from "../../domain/types/session.types";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { professionColor } from "../utils/professionColors";

interface Props {
  practice: PracticeRun;
  /** Link the best log to dps.report (public shared page) instead of the log page (signed-in owner). */
  openOnDpsReport?: boolean;
}

/** Highlighted at the top of a golem-only session: "practice run" plus the player's best log per class. */
export default function PracticeRunCard({ practice, openOnDpsReport = false }: Props) {
  const { t, fmt } = useI18n();
  const bests = practice.bestPerSpec;

  return (
    <Card className="gap-4 border-cm/40 bg-cm/5 py-5">
      <CardContent className="flex flex-col gap-4 px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cm/15 text-cm">
            <TargetIcon className="size-5" />
          </span>
          <div className="space-y-0.5">
            <p className="font-semibold">{t("sessions.practiceTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("sessions.practiceBody")}</p>
          </div>
        </div>

        {bests.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrophyIcon className="size-4 text-warning" />
              {bests.length > 1 ? t("sessions.practiceBestPerClass") : t("sessions.practiceBest")}
            </p>
            <ul className="flex flex-col gap-2">
              {bests.map(({ log, player }) => (
                <li
                  key={player.profession}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-background/40 px-4 py-3"
                >
                  <div className="flex min-w-32 items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: professionColor(player.profession) }}
                    />
                    <span className="font-medium">{player.profession}</span>
                  </div>
                  <div className="min-w-32">
                    <span className="font-mono text-2xl font-semibold tabular-nums">{fmt.number(player.dps)}</span>
                    <span className="ml-1 text-sm text-muted-foreground">DPS</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {log.bossName} · {fmt.duration(log.durationMs)} · {fmt.dateTime(log.encounterTime)}
                  </span>
                  <Button asChild variant="outline" size="sm" className="ml-auto">
                    {openOnDpsReport ? (
                      <a href={log.url} target="_blank" rel="noreferrer">
                        dps.report <ExternalLinkIcon />
                      </a>
                    ) : (
                      <Link to={`/logs/${log.id}`}>{t("sessions.practiceOpen")}</Link>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
