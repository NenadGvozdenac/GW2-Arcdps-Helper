import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import type { Gw2Specialization, Gw2Trait, ProfessionData } from "../../../domain/types/gw2.types";
import { customBuildService } from "../../../services/customBuildService";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { cn } from "@/presentation/lib/utils";

/** Width of a specialization's background texture and of the artwork in it (bottom left). */
const BACKGROUND_SIZE = { width: 1024 };
const BACKGROUND_ART = { width: 647 };

// The line's layout, in px, as in the game's hero panel: the specialization's hexagon, then per tier a minor trait and
// a column of three major traits; a dashed path runs from the hexagon through the minors to each chosen major.
const HEIGHT = 150;
const MAJOR = 40;
const MAJOR_GAP = 8;
const MINOR = 34;
const HEX = { x: 24, width: 96, height: 108 };
const COLUMNS = [
  { minor: 168, major: 250 },
  { minor: 340, major: 422 },
  { minor: 512, major: 594 },
];
const WIDTH = COLUMNS[2].major + MAJOR + 24;
const MID = HEIGHT / 2;
/** Vertical center of the n-th major trait of a column. */
const majorY = (n: number) => MID + (n - 1) * (MAJOR + MAJOR_GAP);

/** Pointy-top hexagon. */
const HEXAGON = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";
/** Flat-top hexagon, as minor traits are framed. */
const MINOR_HEXAGON = "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)";

const traitTitle = (trait: Gw2Trait) => `${trait.name}\n${customBuildService.plainText(trait.description)}`;

/** A major trait: dark unless it's the chosen one; click to choose it. */
function MajorTrait({ trait, selected, onClick }: { trait: Gw2Trait | undefined; selected: boolean; onClick: () => void }) {
  if (!trait) return <span style={{ width: MAJOR, height: MAJOR }} />;
  return (
    <button
      type="button"
      onClick={onClick}
      title={traitTitle(trait)}
      aria-label={trait.name}
      aria-pressed={selected}
      className={cn(
        "group block overflow-hidden rounded-[3px] border transition",
        selected ? "border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.35)]" : "border-black/60",
      )}
      style={{ width: MAJOR, height: MAJOR }}
    >
      <img
        src={trait.icon}
        alt=""
        className={cn(
          "size-full transition",
          !selected && "opacity-50 brightness-50 grayscale group-hover:opacity-80 group-hover:brightness-90 group-hover:grayscale-0",
        )}
      />
    </button>
  );
}

/** A minor trait (always active), in a hexagon. */
function MinorTrait({ trait }: { trait: Gw2Trait | undefined }) {
  if (!trait) return null;
  return (
    <span
      title={traitTitle(trait)}
      className="block bg-black/70 p-[3px]"
      style={{ width: MINOR, height: MINOR, clipPath: MINOR_HEXAGON }}
    >
      <img src={trait.icon} alt={trait.name} className="size-full" style={{ clipPath: MINOR_HEXAGON }} />
    </span>
  );
}

/** The specialization's hexagon: its emblem, or a "+" to choose one; opens the list of specializations. */
function SpecializationHex({
  spec,
  options,
  onChoose,
}: {
  spec: Gw2Specialization | undefined;
  options: Gw2Specialization[];
  onChoose: (id: number) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={spec?.name ?? t("builds.editor.chooseSpecialization")}
          aria-label={spec ? `${t("builds.editor.specialization")}: ${spec.name}` : t("builds.editor.chooseSpecialization")}
          className="absolute grid place-items-center bg-white/45 transition hover:bg-white/70"
          style={{ left: HEX.x, top: MID - HEX.height / 2, width: HEX.width, height: HEX.height, clipPath: HEXAGON }}
        >
          <span
            className="grid place-items-center bg-neutral-950/90"
            style={{ width: HEX.width - 4, height: HEX.height - 4, clipPath: HEXAGON }}
          >
            {spec ? (
              <img src={spec.icon} alt="" className="size-14" />
            ) : (
              <PlusIcon className="size-8 text-muted-foreground" />
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        {options.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onChoose(s.id);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
              s.id === spec?.id && "bg-accent",
            )}
          >
            <img src={s.icon} alt="" className="size-6" />
            {s.name}
            {s.elite && <span className="ml-auto text-xs text-amber-400">{t("builds.editor.elite")}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * One specialization line, drawn like the game's hero panel: the specialization's artwork, its hexagon (click to
 * choose; elite specializations only in the third line, which gets a golden frame), the minor traits, the three
 * columns of major traits (the chosen one lit) and the dashed path through them.
 */
export default function SpecializationLine({
  line,
  index,
  pd,
  taken,
  onChange,
}: {
  line: { id: number | null; traits: (number | null)[] };
  index: number;
  pd: ProfessionData;
  /** Specializations chosen in the other lines (not offered here). */
  taken: (number | null)[];
  onChange: (line: { id: number | null; traits: (number | null)[] }) => void;
}) {
  const spec = pd.specializations.find((s) => s.id === line.id);
  const options = pd.specializations.filter(
    (s) => (index === 2 || !s.elite) && (!taken.includes(s.id) || s.id === line.id),
  );

  // The dashed path: hexagon → minor → chosen major → next minor…; it stops where no major is chosen.
  const path: [number, number][] = [[HEX.x + HEX.width, MID]];
  if (spec) {
    for (const [tier, col] of COLUMNS.entries()) {
      path.push([col.minor + MINOR / 2, MID]);
      const chosen = line.traits[tier];
      const n = chosen ? spec.major_traits.slice(tier * 3, tier * 3 + 3).indexOf(chosen) : -1;
      if (n < 0) break;
      path.push([col.major + MAJOR / 2, majorY(n)]);
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-x-auto overflow-y-hidden rounded-md border bg-neutral-950",
        spec?.elite ? "border-amber-500/70 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]" : "border-black/60",
      )}
      style={{ height: HEIGHT }}
    >
      {spec && (
        // The API's backgrounds are 1024×256 textures with the artwork in their bottom-left 647×136 (above it: black or
        // transparent): scale that part to the panel's width, aligned to the bottom (the rest stays off-panel).
        <div
          aria-hidden
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${spec.background})`,
            backgroundSize: `calc(100% * ${BACKGROUND_SIZE.width} / ${BACKGROUND_ART.width}) auto`,
            backgroundPosition: "0 100%",
          }}
        />
      )}
      {/* The layout keeps its size (like the game's); a narrow screen scrolls it sideways. */}
      <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
        <span
          aria-hidden
          className="absolute size-0 border-y-[6px] border-l-[8px] border-y-transparent border-l-amber-200/80"
          style={{ left: 6, top: MID - 6 }}
        />
        <svg aria-hidden className="pointer-events-none absolute inset-0" width={WIDTH} height={HEIGHT}>
          <polyline
            points={path.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="white"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        </svg>

        <SpecializationHex
          spec={spec}
          options={options}
          onChoose={(id) => onChange({ id, traits: [null, null, null] })}
        />

        {spec &&
          COLUMNS.map((col, tier) => (
            <div key={tier}>
              <div className="absolute" style={{ left: col.minor, top: MID - MINOR / 2 }}>
                <MinorTrait trait={pd.traits[spec.minor_traits[tier]]} />
              </div>
              {spec.major_traits.slice(tier * 3, tier * 3 + 3).map((id, n) => (
                <div key={id} className="absolute" style={{ left: col.major, top: majorY(n) - MAJOR / 2 }}>
                  <MajorTrait
                    trait={pd.traits[id]}
                    selected={line.traits[tier] === id}
                    onClick={() => {
                      const traits = [...line.traits];
                      traits[tier] = id;
                      onChange({ ...line, traits });
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
