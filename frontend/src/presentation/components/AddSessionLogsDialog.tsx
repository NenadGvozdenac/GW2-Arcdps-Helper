import { useState } from "react";
import { AlertCircleIcon, CircleHelpIcon, ListPlusIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import type { Log } from "../../domain/types/log.types";
import type { Session } from "../../domain/types/session.types";
import { sessionService } from "../../services/sessionService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { describeError } from "../utils/describeError";
import LogTable from "./LogTable";

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

/**
 * "Add logs" of an ended session (e.g. it was ended too early): pick logs recorded in the 6 hours after it ended and
 * add them to it — and to its Discord summary. A help popover explains it.
 */
export default function AddSessionLogsDialog({ session }: { session: Session }) {
  const c = useAddSessionLogsController(session);
  const { t } = useI18n();
  const inOtherSessions = c.candidates?.filter((l) => l.sessionId).length ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="outline" onClick={() => c.setOpen(true)}>
        <ListPlusIcon /> {t("sessions.addLogs")}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
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

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("sessions.addLogsTitle")}</DialogTitle>
            <DialogDescription>{t("sessions.addLogsBody")}</DialogDescription>
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
              <LogTable logs={c.candidates} showGroup selection={{ selected: c.selected, onToggle: c.toggle }} />
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
    </div>
  );
}
