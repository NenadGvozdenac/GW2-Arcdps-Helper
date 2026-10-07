import type { ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import {
  ARMOR_SLOTS,
  INFUSION_SLOTS,
  TRINKET_SLOTS,
  type CustomBuildData,
  type WeaponPick,
} from "../../../domain/types/customBuild.types";
import type { ProfessionData } from "../../../domain/types/gw2.types";
import { catalog } from "../../../services/attributeService";
import { customBuildService } from "../../../services/customBuildService";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import CatalogPicker, { type PickerOption } from "./CatalogPicker";

const STATS = Object.keys(catalog.stats);
const DEFAULT_STAT = "Berserker's";
/** No weapon in a hand. */
const NONE = "-";

const runeOptions: PickerOption[] = catalog.runes.map((r) => ({ ...r, detail: r.bonuses.join(" · ") }));
const sigilOptions: PickerOption[] = catalog.sigils.map((s) => ({ ...s, detail: s.description }));
const relicOptions: PickerOption[] = catalog.relics.map((r) => ({
  ...r,
  detail: customBuildService.plainText(r.description),
}));
const foodOptions: PickerOption[] = catalog.food.map((f) => ({ ...f, detail: f.bonuses.join(" · ") }));
const utilityOptions: PickerOption[] = catalog.utility.map((u) => ({ ...u, detail: u.bonuses.join(" · ") }));
const infusionOptions: PickerOption[] = catalog.infusions.map((i) => ({
  ...i,
  detail: i.attributes.map((a) => `+${a.value} ${a.attribute}`).join(" · "),
}));

function StatSelect({ value, onChange, label }: { value: string; onChange: (stat: string) => void; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full min-w-0" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {STATS.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** A labelled row of the gear tables: the slot, then its pickers. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Capped widths: on a wide editor the pickers don't stretch across it.
    <div className="grid grid-cols-[5.5rem_minmax(0,10rem)_minmax(0,13rem)] items-center gap-2 text-sm">
      <span className="truncate text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * The gear: two weapon sets (type, stats and sigils per hand; a two-handed weapon takes both), armor (stats and rune
 * per piece, or all at once), trinkets, relic, food, utility and infusions.
 */
export default function GearEditor({
  data,
  pd,
  onChange,
}: {
  data: CustomBuildData;
  pd: ProfessionData;
  onChange: (patch: Partial<CustomBuildData>) => void;
}) {
  const { t } = useI18n();
  // Weapon mastery: every specialization of a profession wields its elite specializations' weapons too.
  const weapons = customBuildService.weaponOptions(pd);
  const infusionCount = data.infusions.reduce((n, i) => n + i.count, 0);

  function setWeapon(setIndex: number, hand: "main" | "off", pick: WeaponPick | null) {
    const sets = data.weapons.map((s) => ({ ...s }));
    sets[setIndex][hand] = pick;
    // A two-handed main weapon leaves no off hand.
    if (hand === "main" && pick && customBuildService.isTwoHanded(pd, pick.type)) sets[setIndex].off = null;
    onChange({ weapons: sets });
  }

  function weaponHand(setIndex: number, hand: "main" | "off") {
    const set = data.weapons[setIndex];
    const pick = set[hand];
    const twoHandedMain = !!set.main && customBuildService.isTwoHanded(pd, set.main.type);
    // The weapon in the hand stays listed even if the hand wouldn't offer it (e.g. from an imported build).
    const options = weapons.filter((w) => (hand === "main" ? w.mainHand : w.offHand) || w.type === pick?.type);
    const sigilCount = pick && customBuildService.isTwoHanded(pd, pick.type) ? 2 : 1;
    return (
      <div className="flex flex-col gap-1.5 rounded-md border p-2">
        <Select
          value={pick?.type ?? NONE}
          disabled={hand === "off" && twoHandedMain}
          onValueChange={(type) =>
            setWeapon(
              setIndex,
              hand,
              type === NONE ? null : { type, stat: pick?.stat ?? DEFAULT_STAT, sigils: pick?.sigils.slice(0, 2) ?? [] },
            )
          }
        >
          <SelectTrigger
            size="sm"
            className="w-full"
            aria-label={t(hand === "main" ? "builds.editor.mainHand" : "builds.editor.offHand")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>
              {t(hand === "main" ? "builds.editor.mainHand" : "builds.editor.offHand")}: {t("builds.editor.none")}
            </SelectItem>
            {options.map((w) => (
              <SelectItem key={w.type} value={w.type}>
                {w.type}
                {w.twoHanded && <span className="text-muted-foreground">({t("builds.editor.twoHanded")})</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pick && (
          <>
            <StatSelect
              value={pick.stat}
              label={t("builds.editor.stats")}
              onChange={(stat) => setWeapon(setIndex, hand, { ...pick, stat })}
            />
            {Array.from({ length: sigilCount }, (_, i) => (
              <CatalogPicker
                key={i}
                options={sigilOptions}
                value={pick.sigils[i] ?? null}
                placeholder={t("builds.editor.sigil")}
                onChange={(id) => {
                  const sigils = [...pick.sigils];
                  sigils[i] = id;
                  setWeapon(setIndex, hand, { ...pick, sigils: sigils.slice(0, sigilCount) });
                }}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    // Sized by its own width (container queries): the weapon sets side by side only when there's room.
    <div className="@container flex flex-col gap-6">
      <Section title={t("builds.gear.weapons")}>
        <div className="grid max-w-[64rem] gap-3 @2xl:grid-cols-2">
          {[0, 1].map((setIndex) => (
            <div key={setIndex} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("builds.editor.weaponSet", { set: setIndex + 1 })}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {weaponHand(setIndex, "main")}
                {weaponHand(setIndex, "off")}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Armor and trinkets side by side, then upgrades and infusions. */}
      <div className="grid grid-cols-2 gap-6">
        <Section title={t("builds.gear.armor")}>
          <Row label={t("builds.editor.allPieces")}>
            <StatSelect
              value={data.armor.Helm.stat}
              label={t("builds.editor.stats")}
              onChange={(stat) =>
                onChange({
                  armor: Object.fromEntries(ARMOR_SLOTS.map((s) => [s, { ...data.armor[s], stat }])) as CustomBuildData["armor"],
                })
              }
            />
            <CatalogPicker
              options={runeOptions}
              value={data.armor.Helm.rune}
              placeholder={t("builds.editor.rune")}
              onChange={(rune) =>
                onChange({
                  armor: Object.fromEntries(ARMOR_SLOTS.map((s) => [s, { ...data.armor[s], rune }])) as CustomBuildData["armor"],
                })
              }
            />
          </Row>
          {ARMOR_SLOTS.map((slot) => (
            <Row key={slot} label={t(`builds.editor.slots.${slot}`)}>
              <StatSelect
                value={data.armor[slot].stat}
                label={t("builds.editor.stats")}
                onChange={(stat) => onChange({ armor: { ...data.armor, [slot]: { ...data.armor[slot], stat } } })}
              />
              <CatalogPicker
                options={runeOptions}
                value={data.armor[slot].rune}
                placeholder={t("builds.editor.rune")}
                onChange={(rune) => onChange({ armor: { ...data.armor, [slot]: { ...data.armor[slot], rune } } })}
              />
            </Row>
          ))}
        </Section>

        <Section title={t("builds.gear.trinkets")}>
          <Row label={t("builds.editor.allPieces")}>
            <StatSelect
              value={data.trinkets.Amulet.stat}
              label={t("builds.editor.stats")}
              onChange={(stat) =>
                onChange({
                  trinkets: Object.fromEntries(TRINKET_SLOTS.map((s) => [s, { stat }])) as CustomBuildData["trinkets"],
                })
              }
            />
            <span />
          </Row>
          {TRINKET_SLOTS.map((slot) => (
            <Row key={slot} label={t(`builds.editor.slots.${slot}`)}>
              <StatSelect
                value={data.trinkets[slot].stat}
                label={t("builds.editor.stats")}
                onChange={(stat) => onChange({ trinkets: { ...data.trinkets, [slot]: { stat } } })}
              />
              <span />
            </Row>
          ))}
        </Section>

      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section title={t("builds.editor.upgrades")}>
          <Row label={t("builds.gear.relic")}>
            <CatalogPicker
              className="col-span-2"
              options={relicOptions}
              value={data.relic}
              placeholder={t("builds.gear.relic")}
              onChange={(relic) => onChange({ relic })}
            />
          </Row>
          <Row label={t("builds.gear.food")}>
            <CatalogPicker
              className="col-span-2"
              options={foodOptions}
              value={data.food}
              placeholder={t("builds.gear.food")}
              onChange={(food) => onChange({ food })}
            />
          </Row>
          <Row label={t("builds.gear.utility")}>
            <CatalogPicker
              className="col-span-2"
              options={utilityOptions}
              value={data.utility}
              placeholder={t("builds.gear.utility")}
              onChange={(utility) => onChange({ utility })}
            />
          </Row>
        </Section>

        <Section title={t("builds.editor.infusionsCount", { count: infusionCount, max: INFUSION_SLOTS })}>
          {data.infusions.map((inf, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,18rem)_5rem_auto] items-center gap-2">
              <CatalogPicker
                options={infusionOptions}
                value={inf.id}
                allowNone={false}
                placeholder={t("builds.gear.infusions")}
                onChange={(id) => {
                  const infusions = [...data.infusions];
                  infusions[i] = { ...inf, id: id ?? inf.id };
                  onChange({ infusions });
                }}
              />
              <Input
                type="number"
                min={1}
                max={INFUSION_SLOTS}
                value={inf.count}
                aria-label={t("builds.editor.count")}
                className="h-8"
                onChange={(e) => {
                  const infusions = [...data.infusions];
                  infusions[i] = { ...inf, count: Math.max(0, Math.min(INFUSION_SLOTS, Number(e.target.value) || 0)) };
                  onChange({ infusions });
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("builds.editor.remove")}
                title={t("builds.editor.remove")}
                onClick={() => onChange({ infusions: data.infusions.filter((_, j) => j !== i) })}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={infusionCount >= INFUSION_SLOTS}
            onClick={() =>
              onChange({
                infusions: [
                  ...data.infusions,
                  { id: infusionOptions[0].id, count: Math.max(1, INFUSION_SLOTS - infusionCount) },
                ],
              })
            }
          >
            <PlusIcon /> {t("builds.editor.addInfusion")}
          </Button>
        </Section>
      </div>
    </div>
  );
}
