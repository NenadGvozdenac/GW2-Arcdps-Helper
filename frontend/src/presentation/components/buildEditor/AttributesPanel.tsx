import { useI18n } from "../../../controllers/I18nController";
import type { BuildAttributes } from "../../../domain/types/customBuild.types";
import type { TranslationKey } from "../../../i18n/i18n.types";
import { cn } from "@/presentation/lib/utils";

const ATTRIBUTES: { key: keyof BuildAttributes; label: TranslationKey }[] = [
  { key: "power", label: "builds.attributes.power" },
  { key: "precision", label: "builds.attributes.precision" },
  { key: "toughness", label: "builds.attributes.toughness" },
  { key: "vitality", label: "builds.attributes.vitality" },
  { key: "ferocity", label: "builds.attributes.ferocity" },
  { key: "conditionDamage", label: "builds.attributes.conditionDamage" },
  { key: "expertise", label: "builds.attributes.expertise" },
  { key: "concentration", label: "builds.attributes.concentration" },
  { key: "healingPower", label: "builds.attributes.healingPower" },
  { key: "agonyResistance", label: "builds.attributes.agonyResistance" },
];

const DERIVED: { key: keyof BuildAttributes; label: TranslationKey; percent?: boolean }[] = [
  { key: "armor", label: "builds.attributes.armor" },
  { key: "health", label: "builds.attributes.health" },
  { key: "critChance", label: "builds.attributes.critChance", percent: true },
  { key: "critDamage", label: "builds.attributes.critDamage", percent: true },
  { key: "conditionDuration", label: "builds.attributes.conditionDuration", percent: true },
  { key: "boonDuration", label: "builds.attributes.boonDuration", percent: true },
];

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

/**
 * The build's attributes as the hero panel shows them out of combat (gear only: no traits or boons), for the active
 * weapon set (chosen here). Crit chance is shown up to 100%.
 */
export default function AttributesPanel({
  attributes,
  weaponSet,
  onWeaponSet,
}: {
  attributes: BuildAttributes;
  weaponSet: number;
  onWeaponSet: (set: number) => void;
}) {
  const { t, fmt } = useI18n();
  const percent = (key: keyof BuildAttributes, n: number) =>
    `${fmt.number(Math.round((key === "critChance" ? Math.min(100, n) : n) * 10) / 10)}%`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("builds.attributes.title")}</h3>
        <div className="flex rounded-md border p-0.5 text-xs">
          {[0, 1].map((set) => (
            <button
              key={set}
              type="button"
              aria-pressed={weaponSet === set}
              onClick={() => onWeaponSet(set)}
              className={cn(
                "rounded px-2 py-0.5 text-muted-foreground",
                weaponSet === set && "bg-accent text-accent-foreground",
              )}
            >
              {t("builds.editor.weaponSet", { set: set + 1 })}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y rounded-md border px-3">
        <div className="py-1.5">
          {ATTRIBUTES.map((a) => (
            <Line key={a.key} label={t(a.label)} value={fmt.number(attributes[a.key])} />
          ))}
        </div>
        <div className="py-1.5">
          {DERIVED.map((a) => (
            <Line
              key={a.key}
              label={t(a.label)}
              strong
              value={a.percent ? percent(a.key, attributes[a.key]) : fmt.number(attributes[a.key])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
