import { useState } from "react";
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
  CalendarDaysIcon,
  CheckIcon,
  CircleHelpIcon,
  GripVerticalIcon,
  Loader2Icon,
  RotateCcwIcon,
  StarIcon,
} from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { encounterService } from "../../services/encounterService";
import { PLAY_ORDER_DAILIES, PLAY_ORDER_RECS, instabilityService } from "../../services/instabilityService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";

interface Saved {
  order: number[] | null;
  hidden: number[];
}

function useFractalPlayOrderController() {
  const { user, setFractalPlayOrder } = useAuth();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // Shown while it is being saved, so a dragged or unticked entry does not jump back until the server answers.
  const [pending, setPending] = useState<Saved | null>(null);
  const order = instabilityService.playOrder(pending ? pending.order : user?.fractalPlayOrder);
  const hidden = pending?.hidden ?? user?.fractalPlayOrderHidden ?? [];

  async function save(next: Saved) {
    setPending(next);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await setFractalPlayOrder(next.order, next.hidden);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  return {
    order,
    hidden,
    isDefault: user?.fractalPlayOrder == null && hidden.length === 0,
    busy,
    saved,
    error,
    /** Moves the entry `from` to where `to` is, and saves. */
    move(from: number, to: number) {
      void save({ order: arrayMove(order, order.indexOf(from), order.indexOf(to)), hidden });
    },
    /** Leaves an entry out of the play order, or puts it back, and saves. */
    toggle(entry: number, shown: boolean) {
      void save({ order, hidden: shown ? hidden.filter((e) => e !== entry) : [...hidden, entry] });
    },
    reset: () => void save({ order: null, hidden: [] }),
  };
}

/** One entry of the order: a CM fractal (by level), the dailies or the recommended fractals. */
function EntryRow({
  entry,
  position,
  shown,
  disabled,
  onToggle,
}: {
  entry: number;
  position: number;
  shown: boolean;
  disabled: boolean;
  onToggle: (shown: boolean) => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry,
    disabled,
  });
  const groupId = instabilityService.groupIdOf(entry);
  const group = groupId ? encounterService.groupById(groupId) : undefined;
  const label =
    entry === PLAY_ORDER_DAILIES
      ? t("fractalPlayOrder.dailies")
      : entry === PLAY_ORDER_RECS
        ? t("fractalPlayOrder.recs")
        : (group?.name ?? String(entry));
  const checkboxId = `play-order-${entry}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-3 rounded-lg border bg-card py-1.5 pr-3 pl-1",
        isDragging && "z-10 shadow-lg shadow-black/40 ring-1 ring-foreground/20",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50 hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
        aria-label={t("fractalPlayOrder.dragHandle")}
        title={t("fractalPlayOrder.dragHandle")}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="w-4 text-right text-sm text-muted-foreground tabular-nums">{position}.</span>
      {/* Unticked entries stay in the list (to tick them again), dimmed; they are left out of "Play order". */}
      <label htmlFor={checkboxId} className={cn("flex min-w-0 flex-1 items-center gap-3", !shown && "opacity-50")}>
        {group ? (
          <img
            src={encounterService.groupIcon(group.id)}
            alt=""
            className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
            loading="lazy"
          />
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
            {entry === PLAY_ORDER_RECS ? <StarIcon className="size-3.5" /> : <CalendarDaysIcon className="size-3.5" />}
          </span>
        )}
        {group && (
          <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold text-muted-foreground tabular-nums">
            {group.short}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      </label>
      <Checkbox
        id={checkboxId}
        checked={shown}
        onCheckedChange={(v) => onToggle(v === true)}
        disabled={disabled}
        aria-label={t("fractalPlayOrder.include", { name: label })}
        title={t("fractalPlayOrder.include", { name: label })}
      />
    </li>
  );
}

/**
 * The order the user plays the CM fractals, the dailies and the recs in (default 100, 99, 98, 95, 97, 96, 94, dailies,
 * recs), drag & drop sortable, each with a checkbox to leave it out; used by "Play order" on the fractals page and in
 * the instabilities dialog. Saved as soon as it changes.
 */
export default function FractalPlayOrderCard() {
  const c = useFractalPlayOrderController();
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) c.move(Number(active.id), Number(over.id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1">
          <CardTitle>{t("fractalPlayOrder.title")}</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-my-1 size-6 text-foreground"
                aria-label={t("fractalPlayOrder.whyToggle")}
                title={t("fractalPlayOrder.whyToggle")}
              >
                <CircleHelpIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 text-sm text-pretty">
              {t("fractalPlayOrder.why")}
            </PopoverContent>
          </Popover>
        </div>
        <CardDescription className="text-pretty">{t("fractalPlayOrder.hint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={c.order} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-1.5">
              {c.order.map((entry, i) => (
                <EntryRow
                  key={entry}
                  entry={entry}
                  position={i + 1}
                  shown={!c.hidden.includes(entry)}
                  disabled={c.busy}
                  onToggle={(shown) => c.toggle(entry, shown)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        {c.error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3">
        <Button variant="outline" size="sm" onClick={c.reset} disabled={c.busy || c.isDefault}>
          <RotateCcwIcon /> {t("fractalPlayOrder.reset")}
        </Button>
        {c.busy ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : (
          c.saved && (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckIcon className="size-4" /> {t("fractalPlayOrder.saved")}
            </span>
          )
        )}
      </CardFooter>
    </Card>
  );
}
