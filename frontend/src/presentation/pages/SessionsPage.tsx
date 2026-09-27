import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  GripVerticalIcon,
  ListOrderedIcon,
  Loader2Icon,
  PinIcon,
  PinOffIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { SESSIONS_PAGE_SIZE } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { useSessions } from "../../controllers/SessionsController";
import { sessionService } from "../../services/sessionService";
import type { SessionListItem, SessionPage } from "../../domain/types/session.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { cn } from "@/presentation/lib/utils";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { failBadge, successBadge } from "../components/ResultBadge";
import { describeError } from "../utils/describeError";

/**
 * One page of the sessions list. It is drawn right away from the sessions and logs the website already has, then
 * replaced by the server's page (GET /sessions/page) when that arrives. Re-fetched when the page changes, or when the
 * shared session list / logs change (polling, pin, rename, delete, move).
 */
function useSessionPage(page: number) {
  const { sessions } = useSessions();
  const { logs } = useLogs();
  const [fetched, setFetched] = useState<{ key: string; page: SessionPage } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);

  const local = useMemo(() => sessionService.localPage(sessions, logs, page, SESSIONS_PAGE_SIZE), [sessions, logs, page]);
  const signature =
    sessions.map((s) => `${s.id}:${s.pinned}:${s.name}:${s.endedAt?.getTime()}:${s.shareToken}`).join("|") +
    `#${logs.length}`;
  const key = `${page}#${version}#${signature}`;

  useEffect(() => {
    const request = ++latest.current;
    sessionService
      .page(page, SESSIONS_PAGE_SIZE)
      .then((next) => {
        if (request !== latest.current) return;
        setFetched({ key, page: next });
        setError(null);
      })
      .catch((err) => request === latest.current && setError(err));
  }, [page, key]);

  const shown = fetched?.key === key ? fetched.page : local;
  return {
    ...shown,
    /** Changes what is shown right away (drag & drop), until the next load. */
    update: (change: (current: SessionPage) => SessionPage) => setFetched({ key, page: change(shown) }),
    reload: () => setVersion((v) => v + 1),
    error,
  };
}

function useSessionsController() {
  const { sessions, updateSession, removeSessions, moveSession } = useSessions();
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const result = useSessionPage(page);
  const pinned = result.sessions.filter((v) => v.session.pinned);
  const others = result.sessions.filter((v) => !v.session.pinned);
  const lastPage = Math.max(1, Math.ceil(result.total / SESSIONS_PAGE_SIZE));
  // Deleting can leave you past the last page — step back to it.
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [page, lastPage]);
  // Nothing left to organize (e.g. every session was just deleted): leave organizing, whose "Done" button is gone.
  useEffect(() => {
    if (result.total > 0) return;
    setOrganizing(false);
    setSelected(new Set());
  }, [result.total]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    }
  }

  /** Drag & drop within a group (pinned or not): shown right away, then saved; the list reloads either way. */
  function move(activeId: string, overId: string) {
    const from = result.sessions.findIndex((v) => v.session.id === activeId);
    const to = result.sessions.findIndex((v) => v.session.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    result.update((current) => ({ ...current, sessions: arrayMove(current.sessions, from, to) }));
    void run(async () => {
      try {
        await moveSession(activeId, overId);
      } finally {
        // Also reloads when saving failed, so the list shows the real order again.
        result.reload();
      }
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    setDeleting(true);
    await run(async () => {
      await removeSessions([...selected]);
      setSelected(new Set());
    });
    setDeleting(false);
  }

  return {
    empty: result.total === 0,
    pinned,
    others,
    anyPinned: sessions.some((s) => s.pinned),
    total: result.total,
    page,
    setPage: (p: number) => {
      setPage(p);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    error: error ?? result.error,
    organizing,
    selected,
    deleting,
    // "Select all" covers every session, also the ones on other pages (the shared list has all their ids).
    allSelected: sessions.length > 0 && selected.size === sessions.length,
    move,
    toggleSelected,
    deleteSelected,
    toggleAll: () =>
      setSelected((prev) => (prev.size === sessions.length ? new Set() : new Set(sessions.map((s) => s.id)))),
    startOrganizing: () => setOrganizing(true),
    stopOrganizing: () => {
      setOrganizing(false);
      setSelected(new Set());
    },
    togglePin: (v: SessionListItem) => run(() => updateSession(v.session.id, { pinned: !v.session.pinned })),
  };
}

export default function SessionsPage() {
  const c = useSessionsController();
  const { t } = useI18n();

  const actions = c.empty ? null : c.organizing ? (
    <div className="flex flex-wrap items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-destructive" disabled={!c.selected.size || c.deleting}>
            {c.deleting ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            {t("sessions.deleteSelected", { count: c.selected.size })}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sessions.confirmDeleteMany", { count: c.selected.size })}</AlertDialogTitle>
            <AlertDialogDescription>{t("sessions.deleteHint")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={c.deleteSelected}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button onClick={c.stopOrganizing}>
        <CheckIcon /> {t("sessions.done")}
      </Button>
    </div>
  ) : (
    <Button variant="outline" onClick={c.startOrganizing}>
      <ListOrderedIcon /> {t("sessions.organize")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("sessions.title")}
        description={
          <>
            {t("sessions.subtitle")}{" "}
            <Link
              to="/guide/sessions"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              <CircleHelpIcon className="size-3.5" /> {t("sessions.howTo")}
            </Link>
          </>
        }
        actions={actions}
      />

      {c.organizing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <Checkbox checked={c.allSelected} onCheckedChange={c.toggleAll} />
            {t("sessions.selectAll", { count: c.total })}
          </label>
          <span className="text-muted-foreground">{t("sessions.organizeHint")}</span>
        </div>
      )}

      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}

      {c.empty ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">{t("sessions.empty")}</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {c.pinned.length > 0 && <SessionSection title={t("sessions.pinned")} views={c.pinned} c={c} />}
          {c.others.length > 0 && (
            <SessionSection title={c.anyPinned ? t("sessions.others") : null} views={c.others} c={c} />
          )}
          <Pagination page={c.page} pageSize={SESSIONS_PAGE_SIZE} total={c.total} onPageChange={c.setPage} />
        </div>
      )}
    </div>
  );
}

type Controller = ReturnType<typeof useSessionsController>;

/** A list of session cards; while organizing it is drag & drop sortable (pinned and other sessions separately). */
function SessionSection({ title, views, c }: { title: string | null; views: SessionListItem[]; c: Controller }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) c.move(String(active.id), String(over.id));
  };

  const cards = (
    <div className="flex flex-col gap-3">
      {views.map((v) => (
        <SessionCard key={v.session.id} view={v} c={c} />
      ))}
    </div>
  );

  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>}
      {c.organizing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={views.map((v) => v.session.id)} strategy={verticalListSortingStrategy}>
            {cards}
          </SortableContext>
        </DndContext>
      ) : (
        cards
      )}
    </section>
  );
}

function SessionCard({ view: v, c }: { view: SessionListItem; c: Controller }) {
  const { t, fmt } = useI18n();
  const id = v.session.id;
  const active = !v.session.endedAt;
  const checked = c.selected.has(id);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !c.organizing,
  });

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="min-w-0 truncate font-semibold">{v.session.name || t("sessions.unnamed")}</h3>
        {v.logCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span aria-hidden className="mr-1.5 text-muted-foreground">
              ·
            </span>
            <Badge variant="outline" className={successBadge}>
              {t("sessions.killsCount", { count: v.kills })}
            </Badge>
            {v.wipes > 0 && (
              <Badge variant="outline" className={failBadge}>
                {t("sessions.wipesCount", { count: v.wipes })}
              </Badge>
            )}
            {v.groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="font-mono" title={g.name}>
                {g.short}
              </Badge>
            ))}
          </div>
        )}
        {active && (
          <Badge variant="outline" className={successBadge}>
            {t("sessions.active")}
          </Badge>
        )}
        {v.session.shareToken && (
          <Badge variant="outline" title={t("sessions.sharedHint")}>
            {t("sessions.shared")}
          </Badge>
        )}
        {v.session.endReason === "expired" && (
          <Badge variant="secondary" title={t("sessions.expiredHint")}>
            {t("sessions.expired")}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{fmt.dateTime(v.span?.start ?? v.session.startedAt)}</span>
        {v.span && (
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-foreground">
            <TimerIcon className="size-3.5" /> {fmt.span(v.span.durationMs)}
          </span>
        )}
        <span>{v.logCount ? t("sessions.logsCount", { count: v.logCount }) : t("sessions.noLogsYet")}</span>
      </div>
    </>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <Card
        className={cn(
          "group flex-row items-stretch gap-0 py-0 transition-colors hover:border-foreground/20",
          checked && "border-primary/60 bg-accent/30",
          isDragging && "shadow-lg shadow-black/40 ring-1 ring-foreground/20",
        )}
      >
        {c.organizing ? (
          <>
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground hover:bg-accent/50 hover:text-foreground active:cursor-grabbing"
              aria-label={t("sessions.dragHandle")}
              title={t("sessions.dragHandle")}
            >
              <GripVerticalIcon className="size-4" />
            </button>
            {/* While organizing, clicking the card selects it instead of opening it. */}
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-5 pr-5">
              <div className="flex min-w-0 flex-1 flex-col gap-3">{body}</div>
              <Checkbox checked={checked} onCheckedChange={() => c.toggleSelected(id)} />
            </label>
          </>
        ) : (
          <>
            <Link to={`/sessions/${id}`} className="flex min-w-0 flex-1 flex-col gap-3 py-5 pr-2 pl-5">
              {body}
            </Link>
            <div className="flex shrink-0 items-start gap-1 py-4 pr-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-8", v.session.pinned ? "text-foreground" : "text-muted-foreground")}
                onClick={() => c.togglePin(v)}
                aria-label={v.session.pinned ? t("sessions.unpin") : t("sessions.pin")}
                title={v.session.pinned ? t("sessions.unpin") : t("sessions.pin")}
                aria-pressed={v.session.pinned}
              >
                {v.session.pinned ? <PinOffIcon /> : <PinIcon />}
              </Button>
              <Link
                to={`/sessions/${id}`}
                className="grid size-8 place-items-center text-muted-foreground"
                tabIndex={-1}
                aria-hidden="true"
              >
                <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
