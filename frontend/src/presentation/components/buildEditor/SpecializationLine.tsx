import { useI18n } from "../../../controllers/I18nController";
import type { Gw2Specialization, Gw2Trait, ProfessionData } from "../../../domain/types/gw2.types";
import { customBuildService } from "../../../services/customBuildService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { cn } from "@/presentation/lib/utils";

/** Width of a specialization's background texture and of the artwork in it (bottom left). */
const BACKGROUND_SIZE = { width: 1024 };
const BACKGROUND_ART = { width: 647 };

/** A trait's icon; the name and description on hover. A major trait is dark unless it's the chosen one. */
function TraitIcon({
  trait,
  size,
  selected,
  onClick,
}: {
  trait: Gw2Trait | undefined;
  size: "minor" | "major";
  selected?: boolean;
  onClick?: () => void;
}) {
  if (!trait) return <span className={size === "minor" ? "size-7" : "size-10"} />;
  const title = `${trait.name}\n${customBuildService.plainText(trait.description)}`;
  const img = (
    <img
      src={trait.icon}
      alt={trait.name}
      className={cn(
        "rounded-sm transition",
        size === "minor" ? "size-7" : "size-10",
        // Major traits are dark until chosen; the chosen one shows in color.
        size === "major" && !selected && "opacity-40 brightness-75 grayscale",
      )}
    />
  );
  if (!onClick) return <span title={title}>{img}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={trait.name}
      aria-pressed={selected}
      className="rounded-sm transition hover:[&>img]:opacity-75 hover:[&>img]:grayscale-0"
    >
      {img}
    </button>
  );
}

/**
 * One specialization line, as in the game's hero panel: the specialization (a select; elite ones only in the third
 * line), then per tier its minor trait and three major traits to choose from, over the specialization's artwork.
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
  const { t } = useI18n();
  const spec: Gw2Specialization | undefined = pd.specializations.find((s) => s.id === line.id);
  const options = pd.specializations.filter((s) => (index === 2 || !s.elite) && (!taken.includes(s.id) || s.id === line.id));

  return (
    <div className="relative overflow-hidden rounded-lg border bg-muted/30">
      {spec && (
        // The API's backgrounds are 1024×256 textures with the artwork in their bottom-left 647×136 (above it: black or
        // transparent): scale that part to the panel's width, aligned to the bottom (the rest stays off-panel).
        <div
          aria-hidden
          className="absolute inset-0 bg-no-repeat opacity-50"
          style={{
            backgroundImage: `url(${spec.background})`,
            backgroundSize: `calc(100% * ${BACKGROUND_SIZE.width} / ${BACKGROUND_ART.width}) auto`,
            backgroundPosition: "0 100%",
          }}
        />
      )}
      <div className="relative flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <Select
          value={line.id ? String(line.id) : ""}
          onValueChange={(v) => onChange({ id: Number(v), traits: [null, null, null] })}
        >
          <SelectTrigger className="w-full bg-background/80 sm:w-48" aria-label={t("builds.editor.specialization")}>
            <SelectValue placeholder={t("builds.editor.chooseSpecialization")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                <img src={s.icon} alt="" className="size-5" />
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {spec ? (
          // As in the game: minor, three majors, minor, three majors… evenly spaced, the minors between the columns.
          <div className="flex flex-1 items-center justify-between gap-2 sm:px-4">
            {[0, 1, 2].flatMap((tier) => [
              <TraitIcon key={`minor-${tier}`} trait={pd.traits[spec.minor_traits[tier]]} size="minor" />,
              <div key={`major-${tier}`} className="flex flex-col gap-1.5">
                {spec.major_traits.slice(tier * 3, tier * 3 + 3).map((id) => (
                  <TraitIcon
                    key={id}
                    trait={pd.traits[id]}
                    size="major"
                    selected={line.traits[tier] === id}
                    onClick={() => {
                      const traits = [...line.traits];
                      traits[tier] = id;
                      onChange({ ...line, traits });
                    }}
                  />
                ))}
              </div>,
            ])}
          </div>
        ) : (
          <p className="flex-1 text-center text-sm text-muted-foreground">{t("builds.editor.chooseSpecialization")}</p>
        )}
      </div>
    </div>
  );
}
