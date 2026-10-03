import { useNavigate } from "react-router-dom";
import { ExternalLinkIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import type { Log } from "../../domain/types/log.types";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import ResultBadge from "./ResultBadge";

function useLogTableController() {
  const navigate = useNavigate();
  const { freshIds } = useLogs();
  return {
    isFresh: (log: Log) => freshIds.has(log.id),
    openLog: (log: Log, external: boolean) =>
      external ? window.open(log.url, "_blank", "noopener,noreferrer") : navigate(`/logs/${log.id}`),
    groupLabel: (log: Log) => encounterService.groupById(log.groupId)?.short ?? "—",
  };
}

export interface LogSelection {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

interface Props {
  logs: Log[];
  showGroup?: boolean;
  /** Rows open the log on dps.report instead of the (sign-in only) log page — for shared sessions. */
  openOnDpsReport?: boolean;
  /** Selection mode (organizing): a checkbox per row, and clicking a row toggles it instead of opening the log. */
  selection?: LogSelection;
}

export default function LogTable({ logs, showGroup = false, openOnDpsReport = false, selection }: Props) {
  const { openLog, groupLabel, isFresh } = useLogTableController();
  const { t, fmt } = useI18n();
  if (!logs.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noLogs")}</p>;

  return (
    // Fixed layout with set column widths, so tables shown one under another (a session's wings, …) line up.
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          {selection && <TableHead className="w-10" />}
          <TableHead>{t("logTable.boss")}</TableHead>
          {showGroup && <TableHead className="hidden w-16 sm:table-cell">{t("logTable.group")}</TableHead>}
          <TableHead className="w-28 sm:w-44">{t("logTable.result")}</TableHead>
          <TableHead className="w-24 text-right">{t("logTable.duration")}</TableHead>
          <TableHead className="hidden w-44 md:table-cell">{t("logTable.date")}</TableHead>
          <TableHead className="hidden w-32 sm:table-cell" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((l) => (
          <TableRow
            key={l.id}
            className={cn(
              "cursor-pointer",
              isFresh(l) && "row-fresh",
              selection?.selected.has(l.id) && "bg-accent/40 hover:bg-accent/50",
            )}
            onClick={() => (selection ? selection.onToggle(l.id) : openLog(l, openOnDpsReport))}
            data-state={selection?.selected.has(l.id) ? "selected" : undefined}
          >
            {selection && (
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selection.selected.has(l.id)}
                  onCheckedChange={() => selection.onToggle(l.id)}
                  aria-label={l.bossName}
                />
              </TableCell>
            )}
            <TableCell className="whitespace-normal">
              <div className="flex items-center gap-2.5">
                {l.bossIcon && <img src={l.bossIcon} alt="" className="size-7 shrink-0 rounded-md" loading="lazy" />}
                <span className="min-w-0 font-medium break-words">{l.bossName}</span>
              </div>
            </TableCell>
            {showGroup && <TableCell className="hidden text-muted-foreground sm:table-cell">{groupLabel(l)}</TableCell>}
            <TableCell className="whitespace-normal">
              <ResultBadge log={l} />
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmt.duration(l.durationMs)}</TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {fmt.dateTime(l.encounterTime)}
            </TableCell>
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
