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
  ChevronRightIcon,
  CircleHelpIcon,
  GripVerticalIcon,
  PinIcon,
  PinOffIcon,
  TimerIcon,
} from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { sessionService } from "../../services/sessionService";
import type { SessionView } from "../../domain/types/session.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";
import PageHeader from "../components/PageHeader";
import { failBadge, successBadge } from "../components/ResultBadge";
import { describeError } from "../utils/describeError";

function useSessionsController() {
  const { logs, sessions, updateSession, reorderSessions } = useLogs();
  const [error, setError] = useState<unknown>(null);
  const views = useMemo(() => sessionService.views(sessions, logs), [sessions, logs]);
  const pinned = views.filter((v) => v.session.pinned);
  const others = views.filter((v) => !v.session.pinned);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    }
  }

  /** Moves a session within its own list (pinned or not) and saves the whole order. */
  function move(list: SessionView[], activeId: string, overId: string) {
    const from = list.findIndex((v) => v.session.id === activeId);
    const to = list.findIndex((v) => v.session.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const moved = arrayMove(list, from, to).map((v) => v.session.id);
    const ids =
      list === pinned ? [...moved, ...others.map((v) => v.session.id)] : [...pinned.map((v) => v.session.id), ...moved];
    void run(() => reorderSessions(ids));
  }

  return {
    empty: views.length === 0,
    pinned,
    others,
    error,
    move,
    togglePin: (v: SessionView) => run(() => updateSession(v.session.id, { pinned: !v.session.pinned })),
  };
}

export default function SessionsPage() {
  const c = useSessionsController();
  const { t } = useI18n();

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
      />

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
          {c.pinned.length > 0 && (
            <SessionSection title={t("sessions.pinned")} views={c.pinned} onMove={c.move} onTogglePin={c.togglePin} />
          )}
          {c.others.length > 0 && (
            <SessionSection
              title={c.pinned.length ? t("sessions.others") : null}
              views={c.others}
              onMove={c.move}
              onTogglePin={c.togglePin}
            />
          )}
        </>
      )}
    </div>
  );
}

interface SectionProps {
  title: string | null;
  views: SessionView[];
  onMove: (list: SessionView[], activeId: string, overId: string) => void;
  onTogglePin: (v: SessionView) => void;
}

/** A drag & drop sortable list; pinned and other sessions are sorted separately. */
function SessionSection({ title, views, onMove, onTogglePin }: SectionProps) {
  const sensors = useSensors(
    // A small distance keeps clicks on the card working.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) onMove(views, String(active.id), String(over.id));
  };

  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={views.map((v) => v.session.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {views.map((v) => (
              <SessionCard key={v.session.id} view={v} onTogglePin={() => onTogglePin(v)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SessionCard({ view: v, onTogglePin }: { view: SessionView; onTogglePin: () => void }) {
  const { t, fmt } = useI18n();
  const active = !v.session.endedAt;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: v.session.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <Card
        className={cn(
          "group flex-row items-stretch gap-0 py-0 transition-colors hover:border-foreground/20",
          isDragging && "shadow-lg shadow-black/40 ring-1 ring-foreground/20",
        )}
      >
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

        <Link to={`/sessions/${v.session.id}`} className="flex min-w-0 flex-1 flex-col gap-3 py-5 pr-2 pl-1">
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
        </Link>

        <div className="flex shrink-0 items-start gap-1 py-4 pr-3">
          <Button
            variant="ghost"
            size="icon"
            className={cn("size-8", v.session.pinned ? "text-foreground" : "text-muted-foreground")}
            onClick={onTogglePin}
            aria-label={v.session.pinned ? t("sessions.unpin") : t("sessions.pin")}
            title={v.session.pinned ? t("sessions.unpin") : t("sessions.pin")}
            aria-pressed={v.session.pinned}
          >
            {v.session.pinned ? <PinOffIcon /> : <PinIcon />}
          </Button>
          <Link
            to={`/sessions/${v.session.id}`}
            className="grid size-8 place-items-center text-muted-foreground"
            tabIndex={-1}
            aria-hidden="true"
          >
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
