import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CopyIcon, ExternalLinkIcon, FolderInputIcon, LinkIcon, Trash2Icon, Unlink2Icon, XIcon } from "lucide-react";
import { ADMIN_PAGE_SIZE } from "../../../config/constants";
import { useAdmin } from "../../../controllers/AdminController";
import { useI18n } from "../../../controllers/I18nController";
import type { AdminLog, AdminSession } from "../../../domain/types/admin.types";
import { useAdminList } from "../../../hooks/useAdminList";
import { adminService } from "../../../services/adminService";
import { Badge } from "@/presentation/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { ConfirmButton, ErrorAlert, SearchBox, shareUrl, useAdminAction } from "../../components/admin/AdminKit";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";

/** Picks a session of the log's owner to move the log into (or takes it out of its session). */
function SessionPicker({ log, onClose, onPick }: { log: AdminLog; onClose: () => void; onPick: (sessionId: string | null) => void }) {
  const { handleError } = useAdmin();
  const { fmt } = useI18n();
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminService.sessions({ search: "", page: 1, userId: log.ownerId }).then(
      (p) => setSessions(p.rows),
      (err) => setError(handleError(err)),
    );
  }, [log.ownerId, handleError]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move “{log.bossName}” to a session</DialogTitle>
          <DialogDescription>Sessions of {log.ownerEmail}, newest first. The Discord summaries are updated.</DialogDescription>
        </DialogHeader>
        <ErrorAlert message={error} />
        {sessions && !sessions.length && <p className="text-sm text-muted-foreground">This user has no sessions.</p>}
        <ul className="flex flex-col gap-1">
          {sessions?.map((s) => (
            <li key={s.id}>
              <Button
                variant={s.id === log.sessionId ? "secondary" : "ghost"}
                className="h-auto w-full justify-between py-2"
                disabled={s.id === log.sessionId}
                onClick={() => onPick(s.id)}
              >
                <span className="truncate">{s.name || "Session"}</span>
                <span className="text-xs text-muted-foreground">
                  {fmt.dateTime(s.startedAt)} · {s.logCount} {s.logCount === 1 ? "log" : "logs"}
                </span>
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          {log.sessionId && (
            <Button variant="outline" onClick={() => onPick(null)}>
              <Unlink2Icon /> Take out of “{log.sessionName || "Session"}”
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useLogsController() {
  const [params, setParams] = useSearchParams();
  const userId = params.get("userId") ?? undefined;
  const sessionId = params.get("sessionId") ?? undefined;
  const list = useAdminList(adminService.logs, { userId, sessionId });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [moving, setMoving] = useState<AdminLog | null>(null);
  const action = useAdminAction(list.reload, list.setError);

  // Only rows on screen stay selected, so a delete never hits ones you can't see.
  useEffect(() => setSelected(new Set()), [list.rows]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    list,
    userId,
    sessionId,
    clearFilter: () => setParams({}),
    selected,
    toggle,
    allSelected: list.rows.length > 0 && selected.size === list.rows.length,
    toggleAll: () => setSelected(selected.size === list.rows.length ? new Set() : new Set(list.rows.map((l) => l.id))),
    busy: action.busy,
    deleteSelected: () => action.run("bulk", () => adminService.deleteLogs([...selected])),
    deleteOne: (id: string) => action.run(`delete-${id}`, () => adminService.deleteLogs([id])),
    setShared: (log: AdminLog, shared: boolean) => action.run(`share-${log.id}`, () => adminService.setLogShared(log.id, shared)),
    moving,
    setMoving,
    move: (sessionId: string | null) => {
      if (!moving) return;
      const id = moving.id;
      setMoving(null);
      action.run(`move-${id}`, () => adminService.setLogSession(id, sessionId));
    },
  };
}

export default function AdminLogsPage() {
  const c = useLogsController();
  const { fmt } = useI18n();
  const list = c.list;

  return (
    <>
      <PageHeader
        title="Logs"
        description={`${list.total} logs`}
        actions={
          <ConfirmButton
            label={`Delete selected (${c.selected.size})`}
            icon={<Trash2Icon />}
            title={`Delete ${c.selected.size} logs?`}
            description="They are deleted from their owners' accounts. Reports on dps.report stay."
            disabled={!c.selected.size}
            busy={c.busy === "bulk"}
            onConfirm={c.deleteSelected}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Boss, email or GW2 account" />
        {(c.userId || c.sessionId) && (
          <Button variant="secondary" size="sm" onClick={c.clearFilter}>
            {c.sessionId ? "Only one session" : "Only one user"} <XIcon />
          </Button>
        )}
      </div>
      <ErrorAlert message={list.error} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={c.allSelected} onCheckedChange={c.toggleAll} aria-label="Select all on this page" />
            </TableHead>
            <TableHead>Boss</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead>Fought</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Shared</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.rows.map((l) => (
            <TableRow key={l.id} data-state={c.selected.has(l.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox checked={c.selected.has(l.id)} onCheckedChange={() => c.toggle(l.id)} aria-label={`Select ${l.bossName}`} />
              </TableCell>
              <TableCell className="font-medium">
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {l.bossName} <ExternalLinkIcon className="size-3" />
                </a>
              </TableCell>
              <TableCell>
                <Link to={`/admin/users/${l.ownerId}`} className="hover:underline">
                  {l.ownerEmail}
                </Link>
              </TableCell>
              <TableCell>
                <span className="flex gap-1">
                  <Badge variant="outline" className={l.success ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                    {l.success ? "Kill" : "Wipe"}
                  </Badge>
                  {(l.isCM || l.isLegendaryCM) && <Badge variant="outline">{l.isLegendaryCM ? "LCM" : "CM"}</Badge>}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmt.duration(l.durationMs)}</TableCell>
              <TableCell className="text-muted-foreground">{fmt.dateTime(l.encounterTime)}</TableCell>
              <TableCell>
                {l.sessionId ? (
                  <Link to={`/admin/logs?sessionId=${l.sessionId}`} className="hover:underline">
                    {l.sessionName || "Session"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {l.shareToken ? (
                  <span className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Copy public link"
                      onClick={() => navigator.clipboard.writeText(shareUrl("logs", l.shareToken!))}
                    >
                      <CopyIcon />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={c.busy === `share-${l.id}`} onClick={() => c.setShared(l, false)}>
                      Revoke
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" disabled={c.busy === `share-${l.id}`} onClick={() => c.setShared(l, true)}>
                    <LinkIcon /> Share
                  </Button>
                )}
              </TableCell>
              <TableCell>
                <span className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" disabled={c.busy === `move-${l.id}`} onClick={() => c.setMoving(l)}>
                    <FolderInputIcon /> Session
                  </Button>
                  <ConfirmButton
                    label="Delete"
                    icon={<Trash2Icon />}
                    title={`Delete “${l.bossName}”?`}
                    description={`The log is deleted from ${l.ownerEmail}'s account.`}
                    busy={c.busy === `delete-${l.id}`}
                    onConfirm={() => c.deleteOne(l.id)}
                  />
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!list.loading && !list.rows.length && <p className="text-center text-sm text-muted-foreground">No logs found.</p>}
      <Pagination page={list.page} pageSize={ADMIN_PAGE_SIZE} total={list.total} onPageChange={list.setPage} />
      {c.moving && <SessionPicker log={c.moving} onClose={() => c.setMoving(null)} onPick={c.move} />}
    </>
  );
}
