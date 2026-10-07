import type { ReactNode } from "react";
import { useI18n } from "../../../controllers/I18nController";
import { PROFESSION_INFO } from "../../../domain/data/professions";
import { ARMOR_SLOTS, TRINKET_SLOTS, type CustomBuildData, type TrinketSlot } from "../../../domain/types/customBuild.types";
import type { CatalogItem } from "../../../domain/types/gw2.types";
import { attributeService, catalog } from "../../../services/attributeService";

const TRINKET_TYPE: Record<TrinketSlot, string> = {
  Back: "Back",
  Accessory1: "Accessory",
  Accessory2: "Accessory",
  Amulet: "Amulet",
  Ring1: "Ring",
  Ring2: "Ring",
};

/** An item of the catalog (rune, sigil, relic…) by id. */
const find = (list: CatalogItem[], id: number | null | undefined) => (id ? list.find((i) => i.id === id) : undefined);

function Icon({ src }: { src: string | null | undefined }) {
  return src ? <img src={src} alt="" className="size-6 shrink-0 rounded-sm" loading="lazy" /> : null;
}

/** An item as its icon and name ("Superior " left out); a dash when there is none. */
function ItemName({ item }: { item: CatalogItem | undefined }) {
  if (!item) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2" title={item.name}>
      <Icon src={item.icon} />
      <span className="truncate">{item.name.replace(/^Superior /, "")}</span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-col divide-y rounded-md border">{children}</div>
    </section>
  );
}

/** A row: the slot (with its icon), then what's in it. */
function Row({ icon, label, children }: { icon?: string | null; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-3 py-1.5 text-sm">
      <span className="flex w-32 shrink-0 items-center gap-2 text-muted-foreground">
        <Icon src={icon} />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">{children}</div>
    </div>
  );
}

/**
 * The build's gear to look at (the details and shared pages): weapon sets with their stats and sigils, armor with
 * stats and runes, trinkets, relic, food, utility and infusions — as text and icons, nothing to change.
 */
export default function GearView({ data }: { data: CustomBuildData }) {
  const { t } = useI18n();
  const armorIcons = catalog.slots.armor[PROFESSION_INFO[data.profession].weight] ?? {};
  const weapons = data.weapons.flatMap((set, i) =>
    [set.main, set.off].flatMap((w) => (w ? [{ set: i + 1, weapon: w }] : [])),
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title={t("builds.gear.weapons")}>
        {weapons.length === 0 && <Row label="—">{null}</Row>}
        {weapons.map(({ set, weapon }, i) => (
          <Row
            key={i}
            icon={catalog.slots.weapons[attributeService.weaponItemType(weapon.type)]?.icon}
            label={`${t("builds.editor.weaponSet", { set })} · ${weapon.type}`}
          >
            <span className="font-medium">{weapon.stat}</span>
            {weapon.sigils.map((id, j) => (
              <ItemName key={j} item={find(catalog.sigils, id)} />
            ))}
          </Row>
        ))}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("builds.gear.armor")}>
          {ARMOR_SLOTS.map((slot) => (
            <Row key={slot} icon={armorIcons[slot]?.icon} label={t(`builds.editor.slots.${slot}`)}>
              <span className="w-28 shrink-0 font-medium">{data.armor[slot].stat}</span>
              <ItemName item={find(catalog.runes, data.armor[slot].rune)} />
            </Row>
          ))}
        </Section>
        <Section title={t("builds.gear.trinkets")}>
          {TRINKET_SLOTS.map((slot) => (
            <Row
              key={slot}
              icon={catalog.slots.trinkets[TRINKET_TYPE[slot]]?.icon}
              label={t(`builds.editor.slots.${slot}`)}
            >
              <span className="font-medium">{data.trinkets[slot].stat}</span>
            </Row>
          ))}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("builds.editor.upgrades")}>
          <Row label={t("builds.gear.relic")}>
            <ItemName item={find(catalog.relics, data.relic)} />
          </Row>
          <Row label={t("builds.gear.food")}>
            <ItemName item={find(catalog.food, data.food)} />
          </Row>
          <Row label={t("builds.gear.utility")}>
            <ItemName item={find(catalog.utility, data.utility)} />
          </Row>
        </Section>
        <Section title={t("builds.gear.infusions")}>
          {data.infusions.length === 0 && <Row label="—">{null}</Row>}
          {data.infusions.map((inf, i) => (
            <div key={i} className="flex min-h-11 items-center gap-3 px-3 py-1.5 text-sm">
              <ItemName item={find(catalog.infusions, inf.id)} />
              <span className="ml-auto font-mono text-muted-foreground tabular-nums">×{inf.count}</span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
