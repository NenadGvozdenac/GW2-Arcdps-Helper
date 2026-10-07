import { useEffect, useState } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircleIcon,
  FilterXIcon,
  GripVerticalIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import {
  BOON_TYPES,
  DAMAGE_TYPES,
  ROLE_CATEGORIES,
  type BoonType,
  type DamageType,
  type BuildCategory,
  type BuildDetails,
  type BuildSearchResult,
  type FavoriteBuild,
  type FavoritesRefresh,
} from "../../domain/types/build.types";
import { buildService } from "../../services/buildService";
import { customBuildService } from "../../services/customBuildService";
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
} from "@/presentation/components/ui/alert-dialog";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { cn } from "@/presentation/lib/utils";
import BuildCard from "../components/BuildCard";
import BuildEditorDialog, { type EditorTarget } from "../components/buildEditor/BuildEditorDialog";
import PageHeader from "../components/PageHeader";
import ProfessionIcon from "../components/ProfessionIcon";
import { describeError } from "../utils/describeError";

type Filter = BuildCategory | "all";

/** With DPS or boon DPS builds shown, they can be narrowed to power / condition and sorted by their benchmark DPS. */
const dpsFiltersOffered = (filter: Filter) => filter === "dps" || filter === "bdps";
/** Healers and boon DPS give boons: they can be narrowed to alacrity or quickness. */
const boonFilterOffered = (filter: Filter) => filter === "healer" || filter === "bdps";

/** Highest benchmark first, builds without one last (in their order); `sort` false keeps the user's order. */
const byDps = (builds: FavoriteBuild[], sort: boolean): FavoriteBuild[] =>
  sort ? [...builds].sort((a, b) => (b.benchmark?.max ?? -1) - (a.benchmark?.max ?? -1)) : builds;

function useBuildsController() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BuildSearchResult[] | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, BuildDetails>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchError, setSearchError] = useState<unknown>(null);

  const [favorites, setFavorites] = useState<FavoriteBuild[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  /** Only power or condition builds, and sorted by benchmark DPS instead of the user's order (DPS / boon DPS only). */
  const [damage, setDamage] = useState<DamageType | "all">("all");
  /** Only builds giving alacrity or quickness (healers / boon DPS only). */
  const [boon, setBoon] = useState<BoonType | "all">("all");
  const [sortByDps, setSortByDps] = useState(false);
  /** Profession ("Mesmer"…) to show; null = all. */
  const [profession, setProfession] = useState<string | null>(null);
  /** Url of the build being added to / removed from the favorites. */
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  /** The build editor, when open: what it edits. */
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  /** A custom build waiting for its deletion to be confirmed. */
  const [pendingDelete, setPendingDelete] = useState<FavoriteBuild | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<FavoritesRefresh | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    buildService
      .listFavorites()
      .then(setFavorites)
      .catch(setError)
      .finally(() => setFavoritesLoading(false));
  }, []);

  async function select(url: string) {
    setSelectedUrl(url);
    setSearchError(null);
    if (details[url]) return;
    setDetailsLoading(true);
    try {
      const build = await buildService.details(url);
      setDetails((d) => ({ ...d, [url]: build }));
    } catch (err) {
      setSearchError(err);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function search() {
    setSearching(true);
    setSearchError(null);
    setResults(null);
    setSelectedUrl(null);
    try {
      const found = await buildService.search(query);
      setResults(found);
      if (found[0]) await select(found[0].url);
    } catch (err) {
      setSearchError(err);
    } finally {
      setSearching(false);
    }
  }

  async function run(url: string, action: () => Promise<void>) {
    setBusyUrl(url);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusyUrl(null);
    }
  }

  // The damage type and DPS sort apply only while DPS or boon DPS builds are shown.
  const activeDamage = dpsFiltersOffered(filter) ? damage : "all";
  const activeBoon = boonFilterOffered(filter) ? boon : "all";
  const sortingByDps = dpsFiltersOffered(filter) && sortByDps;

  /** Professions of the favorites, alphabetically (the class filter offers only these). */
  const professions = [...new Set(favorites.map((f) => f.profession))].sort();
  // A filter for a class that has no favorites left (the last one was removed) shows everything again.
  const activeProfession = profession && professions.includes(profession) ? profession : null;

  const favoriteOf = (url: string) => favorites.find((f) => f.url === url);

  return {
    query,
    setQuery,
    searching,
    results,
    selectedUrl,
    selected: selectedUrl ? (details[selectedUrl] ?? null) : null,
    detailsLoading,
    searchError,
    search,
    select,
    favorites,
    favoritesLoading,
    visibleFavorites: byDps(
      favorites.filter(
        (f) =>
          (filter === "all" || f.categories.includes(filter)) &&
          (activeBoon === "all" || f.categories.includes(activeBoon)) &&
          (activeDamage === "all" || f.categories.includes(activeDamage)) &&
          (!activeProfession || f.profession === activeProfession),
      ),
      sortingByDps,
    ),
    filter,
    setFilter,
    dpsFiltersOffered: dpsFiltersOffered(filter),
    boonFilterOffered: boonFilterOffered(filter),
    boon: activeBoon,
    setBoon,
    damage: activeDamage,
    setDamage,
    sortingByDps,
    setSortByDps,
    professions,
    profession: activeProfession,
    setProfession,
    /** Whether any filter or the DPS sort is set (the clear button). */
    filtered: profession !== null || filter !== "all" || boon !== "all" || damage !== "all" || sortByDps,
    clearFilters() {
      setProfession(null);
      setFilter("all");
      setBoon("all");
      setDamage("all");
      setSortByDps(false);
    },

    /** Empties the search box and its results. */
    clearSearch() {
      setQuery("");
      setResults(null);
      setSelectedUrl(null);
      setSearchError(null);
    },
    favoriteOf,
    busyUrl,
    error,
    refreshing,
    refreshResult,
    dismissRefreshResult: () => setRefreshResult(null),

    toggleFavorite(url: string) {
      const favorite = favoriteOf(url);
      run(url, async () => {
        if (favorite) {
          await buildService.removeFavorite(favorite.id);
          setFavorites((list) => list.filter((f) => f.id !== favorite.id));
        } else {
          const added = await buildService.addFavorite(url);
          setFavorites((list) => [added, ...list.filter((f) => f.id !== added.id)]);
        }
      });
    },

    editor,
    closeEditor: () => setEditor(null),
    /** A new build from scratch. */
    newBuild: () => setEditor({ draft: { name: "", categories: ["dps"], data: customBuildService.empty("Guardian") } }),
    /** The editor on a copy of `build` (a Snow Crows build: its template and gear), or on the user's own build. */
    async openEditor(build: BuildDetails | FavoriteBuild, editOwn: boolean) {
      setError(null);
      try {
        // A search result brings its suggested categories (a favorite has its own).
        const suggested = results?.find((r) => r.url === build.url)?.categories;
        const draft = await customBuildService.fromBuild(build, build.name, suggested);
        if (draft) setEditor({ draft, id: editOwn && "id" in build ? build.id : undefined });
      } catch (err) {
        setError(err);
      }
    },
    /** A saved build replaces its old version, or (new) goes first. */
    onSaved(build: FavoriteBuild) {
      setFavorites((list) =>
        list.some((f) => f.id === build.id) ? list.map((f) => (f.id === build.id ? build : f)) : [build, ...list],
      );
      setEditor(null);
    },
    pendingDelete,
    askDelete: setPendingDelete,
    /** Deletes the custom build waiting for confirmation. */
    confirmDelete() {
      const build = pendingDelete;
      setPendingDelete(null);
      if (!build) return;
      run(build.id, async () => {
        await buildService.removeFavorite(build.id);
        setFavorites((list) => list.filter((f) => f.id !== build.id));
      });
    },

    /** Drag & drop: shown right away, then saved; on failure the saved order is loaded again. */
    move(activeId: string, overId: string) {
      const from = favorites.findIndex((f) => f.id === activeId);
      const to = favorites.findIndex((f) => f.id === overId);
      if (from < 0 || to < 0 || from === to) return;
      setFavorites((list) => arrayMove(list, from, to));
      buildService.moveFavorite(activeId, overId).catch(async (err) => {
        setError(err);
        setFavorites(await buildService.listFavorites());
      });
    },

    async refreshAll() {
      setRefreshing(true);
      setRefreshResult(null);
      setError(null);
      try {
        const result = await buildService.refreshFavorites();
        setFavorites(result.builds);
        setRefreshResult(result);
      } catch (err) {
        setError(err);
      } finally {
        setRefreshing(false);
      }
    },
  };
}

type Controller = ReturnType<typeof useBuildsController>;

/** What the last "Refresh all" found: which builds changed on Snow Crows, which could not be fetched. */
function RefreshResult({
  result,
  favorites,
  onDismiss,
}: {
  result: FavoritesRefresh;
  favorites: FavoriteBuild[];
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const names = (ids: string[]) =>
    ids
      .map((id) => favorites.find((f) => f.id === id))
      .filter((f): f is FavoriteBuild => !!f)
      .map((f) => `${f.name} (${f.weapons})`)
      .join(", ");
  return (
    <div className="relative flex flex-col gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        title={t("common.close")}
        aria-label={t("common.close")}
        className="absolute top-1.5 right-1.5 z-10 size-7"
      >
        <XIcon />
      </Button>
      <Alert className="pr-10">
        <SparklesIcon />
        <AlertDescription>
          {result.changed.length
            ? t("builds.refreshChanged", { names: names(result.changed) })
            : t("builds.refreshNothingChanged")}
        </AlertDescription>
      </Alert>
      {result.failed.length > 0 && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{t("builds.refreshFailed", { names: names(result.failed) })}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function SearchSection({ c }: { c: Controller }) {
  const { t } = useI18n();
  const others = c.results?.filter((r) => r.url !== c.selectedUrl) ?? [];

  return (
    <section className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          c.search();
        }}
      >
        <div className="relative w-full max-w-md">
          <Input
            value={c.query}
            onChange={(e) => c.setQuery(e.target.value)}
            placeholder={t("builds.searchPlaceholder")}
            aria-label={t("builds.searchLabel")}
            maxLength={80}
            className="pr-9"
          />
          {(c.query || c.results || c.searchError != null) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={c.clearSearch}
              title={t("builds.clearSearch")}
              aria-label={t("builds.clearSearch")}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
            >
              <XIcon />
            </Button>
          )}
        </div>
        <Button type="submit" disabled={c.searching}>
          {c.searching ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
          {t("builds.search")}
        </Button>
      </form>

      {c.searchError != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.searchError, t)}</AlertDescription>
        </Alert>
      )}

      {c.results?.length === 0 && <p className="text-sm text-muted-foreground">{t("builds.noResults")}</p>}

      {c.selected ? (
        <BuildCard
          build={c.selected}
          favorite={c.favoriteOf(c.selected.url)}
          onToggleFavorite={() => c.toggleFavorite(c.selected!.url)}
          onMakeCustom={() => c.openEditor(c.selected!, false)}
          busy={c.busyUrl === c.selected.url}
        />
      ) : (
        c.detailsLoading && (
          <div className="grid place-items-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("builds.otherResults", { spec: others[0].specialization })}
          </p>
          {others.map((r) => (
            <button
              key={r.url}
              type="button"
              onClick={() => c.select(r.url)}
              disabled={c.detailsLoading}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <ProfessionIcon profession={r.specialization} className="size-5" />
              <span className="font-medium">{r.name}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.weapons}</span>
              {c.favoriteOf(r.url) && <span className="text-amber-400">★</span>}
              <span className="hidden gap-1 sm:flex">
                {r.categories.map((cat) => (
                  <Badge key={cat} variant="outline">
                    {t(`builds.categories.${cat}`)}
                  </Badge>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** A favorite's card, sortable by its grip handle (not while sorted by DPS). */
function SortableBuildCard({ build, c }: { build: FavoriteBuild; c: Controller }) {
  const { t } = useI18n();
  // Sorted by DPS, the order isn't the user's: no dragging (and no handle).
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: build.id,
    disabled: c.sortingByDps,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative min-w-0", isDragging && "z-10")}
    >
      <BuildCard
        build={build}
        favorite={build}
        {...(build.kind === "custom"
          ? { onEdit: () => c.openEditor(build, true), onDelete: () => c.askDelete(build) }
          : { onToggleFavorite: () => c.toggleFavorite(build.url!), onMakeCustom: () => c.openEditor(build, false) })}
        busy={c.busyUrl === (build.url ?? build.id)}
        className={cn(isDragging && "shadow-lg shadow-black/40 ring-1 ring-foreground/20")}
        dragHandle={
          !c.sortingByDps && (
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="-ml-1 mt-1.5 flex shrink-0 cursor-grab touch-none items-center rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
              aria-label={t("builds.dragHandle")}
              title={t("builds.dragHandle")}
            >
              <GripVerticalIcon className="size-4" />
            </button>
          )
        }
      />
    </div>
  );
}

function FavoritesSection({ c }: { c: Controller }) {
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) c.move(String(active.id), String(over.id));
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t("builds.myBuilds")} <span className="text-muted-foreground tabular-nums">({c.favorites.length})</span>
        </h2>
        {/* Class → role → boon → damage type → sort. On a phone the class on its own row, then two per row. */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
          <Select value={c.profession ?? "all"} onValueChange={(v) => c.setProfession(v === "all" ? null : v)}>
            <SelectTrigger size="sm" className="col-span-2 w-full sm:w-44" aria-label={t("builds.classFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("builds.allClasses")}</SelectItem>
              {c.professions.map((p) => (
                <SelectItem key={p} value={p}>
                  <ProfessionIcon profession={p} className="size-4" />
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={c.filter} onValueChange={(v) => c.setFilter(v as Filter)}>
            <SelectTrigger size="sm" className="w-full sm:w-44" aria-label={t("builds.categoryFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("builds.all")}</SelectItem>
              {ROLE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {t(`builds.categories.${cat}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Always shown (the bar doesn't jump); usable only for the roles they apply to. */}
          <Select
            value={c.boon}
            disabled={!c.boonFilterOffered}
            onValueChange={(v) => c.setBoon(v as BoonType | "all")}
          >
            <SelectTrigger size="sm" className="w-full sm:w-44" aria-label={t("builds.boonFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("builds.allBoons")}</SelectItem>
              {BOON_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {t(`builds.categories.${b}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={c.damage}
            disabled={!c.dpsFiltersOffered}
            onValueChange={(v) => c.setDamage(v as DamageType | "all")}
          >
            <SelectTrigger size="sm" className="w-full sm:w-44" aria-label={t("builds.damageFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("builds.allDamage")}</SelectItem>
              {DAMAGE_TYPES.map((d) => (
                <SelectItem key={d} value={d}>
                  {t(`builds.categories.${d}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={c.sortingByDps ? "dps" : "own"}
            disabled={!c.dpsFiltersOffered}
            onValueChange={(v) => c.setSortByDps(v === "dps")}
          >
            <SelectTrigger size="sm" className="w-full sm:w-48" aria-label={t("builds.sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="own">{t("builds.sortOwn")}</SelectItem>
              <SelectItem value="dps">{t("builds.sortDps")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="col-span-2 sm:col-span-1"
            disabled={!c.filtered}
            onClick={c.clearFilters}
          >
            <FilterXIcon /> {t("builds.clearFilters")}
          </Button>
        </div>
      </div>

      {c.favoritesLoading ? (
        <div className="grid place-items-center py-8">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : c.visibleFavorites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {c.favorites.length ? t("builds.noFavoritesInCategory") : t("builds.noFavorites")}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={c.visibleFavorites.map((f) => f.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {c.visibleFavorites.map((f) => (
                <SortableBuildCard key={f.id} build={f} c={c} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

/**
 * Snow Crows builds: search one by specialization ("Power Virtuoso") to see its template and gear at a glance, and
 * keep favorites with the user's own categories. "Refresh all" fetches every favorite again and says which changed.
 */
export default function BuildsPage() {
  const c = useBuildsController();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("builds.title")}
        description={t("builds.description")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={c.newBuild}>
              <PlusIcon /> {t("builds.custom.new")}
            </Button>
            <Button variant="outline" onClick={c.refreshAll} disabled={c.refreshing || c.favorites.length === 0}>
              <RefreshCwIcon className={cn(c.refreshing && "animate-spin")} />
              {t("builds.refreshAll")}
            </Button>
          </div>
        }
      />
      {c.editor && <BuildEditorDialog target={c.editor} onClose={c.closeEditor} onSaved={c.onSaved} />}
      <AlertDialog open={!!c.pendingDelete} onOpenChange={(open) => !open && c.askDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builds.custom.deleteTitle", { name: c.pendingDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("builds.custom.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={c.confirmDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {c.refreshResult && (
        <RefreshResult result={c.refreshResult} favorites={c.favorites} onDismiss={c.dismissRefreshResult} />
      )}
      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}
      <SearchSection c={c} />
      <FavoritesSection c={c} />
    </div>
  );
}
