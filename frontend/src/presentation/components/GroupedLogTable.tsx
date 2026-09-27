import { useMemo } from "react";
import { useI18n } from "../../controllers/I18nController";
import { sessionService } from "../../services/sessionService";
import type { Log } from "../../domain/types/log.types";
import { Badge } from "@/presentation/components/ui/badge";
import LogTable from "./LogTable";
import { failBadge, successBadge } from "./ResultBadge";

function useGroupedLogTableController(logs: Log[]) {
  return { sections: useMemo(() => sessionService.byGroup(logs), [logs]) };
}

interface Props {
  logs: Log[];
  /** Rows open the log on dps.report instead of the (sign-in only) log page — for shared sessions. */
  openOnDpsReport?: boolean;
}

/** A session's logs split by wing / fractal / strike (W1, W2, …), each with its own kills / wipes. */
export default function GroupedLogTable({ logs, openOnDpsReport = false }: Props) {
  const { sections } = useGroupedLogTableController(logs);
  const { t } = useI18n();
  if (!logs.length) return <LogTable logs={logs} />;

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ group, logs: groupLogs, kills, wipes }) => (
        <section key={group?.id ?? "other"} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {group?.short ?? t("sessions.otherGroup")}
            </Badge>
            {group && <h3 className="font-semibold">{group.name}</h3>}
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <Badge variant="outline" className={successBadge}>
              {t("sessions.killsCount", { count: kills })}
            </Badge>
            {wipes > 0 && (
              <Badge variant="outline" className={failBadge}>
                {t("sessions.wipesCount", { count: wipes })}
              </Badge>
            )}
          </div>
          <LogTable logs={groupLogs} openOnDpsReport={openOnDpsReport} />
        </section>
      ))}
    </div>
  );
}
