import { useMemo, useState } from "react";
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
import { sessionService } from "../../services/sessionService";
import type { SessionView } from "../../domain/types/session.types";
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

function useSessionsController() {
  const { logs, sessions, updateSession, reorderSessions, removeSessions } = useLogs();
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const views = useMemo(() => sessionService.views(sessions, logs), [sessions, logs]);
  const pinned = views.filter((v) => v.session.pinned);
  const others = views.filter((v) => !v.session.pinned);
  // Pinned sessions come first, so a page can hold some of each. Clamped when deleting shrinks the list.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(views.length / SESSIONS_PAGE_SIZE)));
  const onPage = new Set(
    views.slice((currentPage - 1) * SESSIONS_PAGE_SIZE, currentPage * SESSIONS_PAGE_SIZE).map((v) => v.session.id),
  );

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    }
  }

  /** Moves a session within its own group (pinned or not, across all pages) and saves the whole order. */
  function move(activeId: string, overId: string) {
    const group = pinned.some((v) => v.session.id === activeId) ? pinned : others;
    const from = group.findIndex((v) => v.session.id === activeId);
    const to = group.findIndex((v) => v.session.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const moved = arrayMove(group, from, to).map((v) => v.session.id);
    const ids =
      group === pinned
        ? [...moved, ...others.map((v) => v.session.id)]
        : [...pinned.map((v) => v.session.id), ...moved];
    void run(() => reorderSessions(ids));
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
    empty: views.length === 0,
    pinned: pinned.filter((v) => onPage.has(v.session.id)),
    others: others.filter((v) => onPage.has(v.session.id)),
    anyPinned: pinned.length > 0,
    total: views.length,
    page: currentPage,
    setPage: (p: number) => {
      setPage(p);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    error,
    organizing,
    selected,
    deleting,
    allSelected: views.length > 0 && selected.size === views.length,
    move,
    toggleSelected,
    deleteSelected,
    toggleAll: () =>
      setSelected((prev) => (prev.size === views.length ? new Set() : new Set(views.map((v) => v.session.id)))),
    startOrganizing: () => setOrganizing(true),
    stopOrganizing: () => {
      setOrganizing(false);
      setSelected(new Set());
    },
    togglePin: (v: SessionView) => run(() => updateSession(v.session.id, { pinned: !v.session.pinned })),
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
        <>
          {c.pinned.length > 0 && <SessionSection title={t("sessions.pinned")} views={c.pinned} c={c} />}
          {c.others.length > 0 && (
            <SessionSection title={c.anyPinned ? t("sessions.others") : null} views={c.others} c={c} />
          )}
          <Pagination page={c.page} pageSize={SESSIONS_PAGE_SIZE} total={c.total} onPageChange={c.setPage} />
        </>
      )}
    </div>
  );
}

type Controller = ReturnType<typeof useSessionsController>;

/** A list of session cards; while organizing it is drag & drop sortable (pinned and other sessions separately). */
function SessionSection({ title, views, c }: { title: string | null; views: SessionView[]; c: Controller }) {
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

function SessionCard({ view: v, c }: { view: SessionView; c: Controller }) {
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
      <div className="flex items-center gap-3">
        <h3 className="truncate font-semibold">{v.session.name || t("sessions.unnamed")}</h3>
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
        <span>{v.logs.length ? t("sessions.logsCount", { count: v.logs.length }) : t("sessions.noLogsYet")}</span>
      </div>
      {v.logs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={successBadge}>
            {v.kills} {t("sessions.kills")}
          </Badge>
          {v.wipes > 0 && (
            <Badge variant="outline" className={failBadge}>
              {v.wipes} {t("sessions.wipes")}
            </Badge>
          )}
          {v.groups.map((g) => (
            <Badge key={g.id} variant="secondary" className="font-mono" title={g.name}>
              {g.short}
            </Badge>
          ))}
        </div>
      )}
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
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-5 pr-4">
              <Checkbox className="mt-1" checked={checked} onCheckedChange={() => c.toggleSelected(id)} />
              <div className="flex min-w-0 flex-1 flex-col gap-3">{body}</div>
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
