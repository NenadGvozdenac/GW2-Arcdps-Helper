import { useState } from "react";
import { AlertCircleIcon, CircleHelpIcon, ListPlusIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import type { Log } from "../../domain/types/log.types";
import type { Session } from "../../domain/types/session.types";
import { sessionService } from "../../services/sessionService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";
import ResultBadge from "./ResultBadge";

function useAddSessionLogsController(session: Session) {
  const { refresh } = useLogs();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Log[] | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function load() {
    setCandidates(null);
    setSelected(new Set());
    setError(null);
    try {
      setCandidates(await sessionService.addableLogs(session.id));
    } catch (err) {
      setError(err);
      setCandidates([]);
    }
  }

  return {
    open,
    candidates,
    selected,
    busy,
    error,
    /** Opening loads the logs recorded after the session ended. */
    setOpen(next: boolean) {
      setOpen(next);
      if (next) void load();
    },
    toggle(id: string) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    allSelected: !!candidates?.length && selected.size === candidates.length,
    toggleAll() {
      setSelected((prev) =>
        candidates && prev.size !== candidates.length ? new Set(candidates.map((l) => l.id)) : new Set(),
      );
    },
    /** Adds the picked logs (the server rewrites / posts the session's Discord summary), then reloads the logs. */
    async add() {
      setBusy(true);
      setError(null);
      try {
        await sessionService.addLogs(session.id, [...selected]);
        await refresh();
        setOpen(false);
      } catch (err) {
        setError(err);
      } finally {
        setBusy(false);
      }
    },
  };
}

/** The logs to pick from: when each fight started and ended, how long after the session's end it started, and its length. */
function CandidateTable({
  logs,
  endedAt,
  selected,
  onToggle,
}: {
  logs: Log[];
  endedAt: Date;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const { t, fmt } = useI18n();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>{t("logTable.boss")}</TableHead>
          <TableHead>{t("logTable.result")}</TableHead>
          <TableHead className="text-right">{t("sessions.addLogsStarted")}</TableHead>
          <TableHead className="text-right">{t("sessions.addLogsEnded")}</TableHead>
          <TableHead className="text-right">{t("sessions.addLogsAfterEnd")}</TableHead>
          <TableHead className="text-right">{t("logTable.duration")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((l) => {
          const end = new Date(l.encounterTime.getTime() + l.durationMs);
          return (
            <TableRow
              key={l.id}
              className={cn("cursor-pointer", selected.has(l.id) && "bg-accent/40 hover:bg-accent/50")}
              onClick={() => onToggle(l.id)}
              data-state={selected.has(l.id) ? "selected" : undefined}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(l.id)} onCheckedChange={() => onToggle(l.id)} aria-label={l.bossName} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-2.5">
                  {l.bossIcon && <img src={l.bossIcon} alt="" className="size-7 shrink-0 rounded-md" loading="lazy" />}
                  <span className="min-w-0 font-medium break-words">{l.bossName}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-normal">
                <ResultBadge log={l} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt.time(l.encounterTime)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt.time(end)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                +{fmt.span(l.encounterTime.getTime() - endedAt.getTime())}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmt.duration(l.durationMs)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * "Add logs" of an ended session (e.g. it was ended too early): pick logs recorded in the 6 hours after it ended and
 * add them to it — and to its Discord summary. The button's "?" explains it.
 */
export default function AddSessionLogsDialog({ session, endedAt }: { session: Session; endedAt: Date }) {
  const c = useAddSessionLogsController(session);
  const { t, fmt } = useI18n();
  const inOtherSessions = c.candidates?.filter((l) => l.sessionId).length ?? 0;

  return (
    <>
      {/* One button in two parts: "Add logs", and its "?" (a button can't hold another button). */}
      <div className="inline-flex items-stretch overflow-hidden rounded-md border bg-background shadow-xs dark:border-input dark:bg-input/30">
        <Button variant="ghost" className="rounded-none border-0" onClick={() => c.setOpen(true)}>
          <ListPlusIcon /> {t("sessions.addLogs")}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-none border-0 border-l text-muted-foreground dark:border-input"
              aria-label={t("sessions.addLogsHelpToggle")}
              title={t("sessions.addLogsHelpToggle")}
            >
              <CircleHelpIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 text-sm text-pretty">
            {t("sessions.addLogsHelp")}
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("sessions.addLogsTitle")}</DialogTitle>
            <DialogDescription>{t("sessions.addLogsBody", { time: fmt.dateTime(endedAt) })}</DialogDescription>
          </DialogHeader>

          {c.candidates === null ? (
            <div className="grid place-items-center py-10" role="status">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : c.candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("sessions.addLogsNone")}</p>
          ) : (
            <div className="flex max-h-[60svh] flex-col gap-2 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Button variant="ghost" size="sm" onClick={c.toggleAll}>
                  {c.allSelected ? t("sessions.addLogsSelectNone") : t("sessions.addLogsSelectAll")}
                </Button>
                {inOtherSessions > 0 && (
                  <span className="text-muted-foreground">
                    {t("sessions.addLogsMoved", { count: inOtherSessions })}
                  </span>
                )}
              </div>
              <CandidateTable
                logs={c.candidates}
                endedAt={endedAt}
                selected={c.selected}
                onToggle={c.toggle}
              />
            </div>
          )}

          {c.error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => c.setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={c.add} disabled={!c.selected.size || c.busy}>
              {c.busy ? <Loader2Icon className="animate-spin" /> : <ListPlusIcon />}
              {t("sessions.addSelected", { count: c.selected.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
