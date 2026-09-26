import { useNavigate } from "react-router-dom";
import { ExternalLinkIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import type { Log } from "../../domain/types/log.types";
import { Button } from "@/presentation/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import ResultBadge from "./ResultBadge";

function useLogTableController() {
  const navigate = useNavigate();
  const { freshIds } = useLogs();
  return {
    isFresh: (log: Log) => freshIds.has(log.id),
    openLog: (log: Log) => navigate(`/logs/${log.id}`),
    groupLabel: (log: Log) => encounterService.groupById(log.groupId)?.short ?? "—",
  };
}

export default function LogTable({ logs, showGroup = false }: { logs: Log[]; showGroup?: boolean }) {
  const { openLog, groupLabel, isFresh } = useLogTableController();
  const { t, fmt } = useI18n();
  if (!logs.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noLogs")}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("logTable.boss")}</TableHead>
          {showGroup && <TableHead className="hidden sm:table-cell">{t("logTable.group")}</TableHead>}
          <TableHead>{t("logTable.result")}</TableHead>
          <TableHead className="text-right">{t("logTable.duration")}</TableHead>
          <TableHead className="hidden md:table-cell">{t("logTable.date")}</TableHead>
          <TableHead className="hidden sm:table-cell" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((l) => (
          <TableRow key={l.id} className={cn("cursor-pointer", isFresh(l) && "row-fresh")} onClick={() => openLog(l)}>
            <TableCell>
              <div className="flex items-center gap-2.5">
                {l.bossIcon && <img src={l.bossIcon} alt="" className="size-7 rounded-md" loading="lazy" />}
                <span className="font-medium">{l.bossName}</span>
              </div>
            </TableCell>
            {showGroup && <TableCell className="hidden text-muted-foreground sm:table-cell">{groupLabel(l)}</TableCell>}
            <TableCell>
              <ResultBadge log={l} />
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmt.duration(l.durationMs)}</TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{fmt.dateTime(l.encounterTime)}</TableCell>
            <TableCell className="hidden text-right sm:table-cell">
              <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  dps.report <ExternalLinkIcon />
                </a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
