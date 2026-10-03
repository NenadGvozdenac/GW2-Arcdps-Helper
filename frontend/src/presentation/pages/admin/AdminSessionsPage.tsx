import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CopyIcon, LinkIcon, Trash2Icon, XIcon } from "lucide-react";
import { ADMIN_PAGE_SIZE } from "../../../config/constants";
import { useI18n } from "../../../controllers/I18nController";
import type { AdminSession } from "../../../domain/types/admin.types";
import { useAdminList } from "../../../hooks/useAdminList";
import { adminService } from "../../../services/adminService";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { ConfirmButton, ErrorAlert, SearchBox, shareUrl, useAdminAction } from "../../components/admin/AdminKit";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";

function useSessionsController() {
  const [params, setParams] = useSearchParams();
  const userId = params.get("userId") ?? undefined;
  const list = useAdminList(adminService.sessions, { userId });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const action = useAdminAction(list.reload, list.setError);

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
    clearFilter: () => setParams({}),
    selected,
    toggle,
    allSelected: list.rows.length > 0 && selected.size === list.rows.length,
    toggleAll: () => setSelected(selected.size === list.rows.length ? new Set() : new Set(list.rows.map((s) => s.id))),
    busy: action.busy,
    deleteSelected: () => action.run("bulk", () => adminService.deleteSessions([...selected])),
    deleteOne: (id: string) => action.run(`delete-${id}`, () => adminService.deleteSessions([id])),
    setShared: (s: AdminSession, shared: boolean) => action.run(`share-${s.id}`, () => adminService.setSessionShared(s.id, shared)),
  };
}

export default function AdminSessionsPage() {
  const c = useSessionsController();
  const { fmt } = useI18n();
  const list = c.list;

  return (
    <>
      <PageHeader
        title="Sessions"
        description={`${list.total} sessions`}
        actions={
          <ConfirmButton
            label={`Delete selected (${c.selected.size})`}
            icon={<Trash2Icon />}
            title={`Delete ${c.selected.size} sessions?`}
            description="Their logs are kept; they just no longer belong to a session."
            disabled={!c.selected.size}
            busy={c.busy === "bulk"}
            onConfirm={c.deleteSelected}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="Session name, email or GW2 account" />
        {c.userId && (
          <Button variant="secondary" size="sm" onClick={c.clearFilter}>
            Only one user <XIcon />
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
            <TableHead>Name</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Logs</TableHead>
            <TableHead>Shared</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.rows.map((s) => (
            <TableRow key={s.id} data-state={c.selected.has(s.id) ? "selected" : undefined}>
              <TableCell>
                <Checkbox checked={c.selected.has(s.id)} onCheckedChange={() => c.toggle(s.id)} aria-label={`Select ${s.name || "session"}`} />
              </TableCell>
              <TableCell className="font-medium">
                <Link to={`/admin/logs?sessionId=${s.id}`} className="hover:underline">
                  {s.name || "Session"}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/admin/users/${s.ownerId}`} className="hover:underline">
                  {s.ownerEmail}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{fmt.dateTime(s.startedAt)}</TableCell>
              <TableCell>
                {s.endedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Ended {s.endReason === "expired" ? "automatically" : ""} {fmt.dateTime(s.endedAt)}
                  </span>
                ) : (
                  <Badge variant="outline" className="border-success/40 text-success">
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{s.logCount}</TableCell>
              <TableCell>
                {s.shareToken ? (
                  <span className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Copy public link"
                      onClick={() => navigator.clipboard.writeText(shareUrl("sessions", s.shareToken!))}
                    >
                      <CopyIcon />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={c.busy === `share-${s.id}`} onClick={() => c.setShared(s, false)}>
                      Revoke
                    </Button>
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" disabled={c.busy === `share-${s.id}`} onClick={() => c.setShared(s, true)}>
                    <LinkIcon /> Share
                  </Button>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ConfirmButton
                  label="Delete"
                  icon={<Trash2Icon />}
                  title={`Delete “${s.name || "Session"}”?`}
                  description="Its logs are kept, without a session."
                  busy={c.busy === `delete-${s.id}`}
                  onConfirm={() => c.deleteOne(s.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!list.loading && !list.rows.length && <p className="text-center text-sm text-muted-foreground">No sessions found.</p>}
      <Pagination page={list.page} pageSize={ADMIN_PAGE_SIZE} total={list.total} onPageChange={list.setPage} />
    </>
  );
}
