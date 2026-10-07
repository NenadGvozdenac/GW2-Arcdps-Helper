import { useState, type ReactNode } from "react";
import { useI18n } from "../../../controllers/I18nController";
import type { CustomBuildData } from "../../../domain/types/customBuild.types";
import type { Gw2Skill, ProfessionData } from "../../../domain/types/gw2.types";
import { customBuildService } from "../../../services/customBuildService";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { cn } from "@/presentation/lib/utils";
import CatalogPicker from "./CatalogPicker";

const skillTitle = (skill: Gw2Skill | undefined) =>
  skill ? `${skill.name}\n${customBuildService.plainText(skill.description)}` : undefined;

/** A skill's icon in a square slot (empty when there is none). */
function SkillIcon({ skill, size = "md" }: { skill: Gw2Skill | undefined; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-9" : "size-11";
  return skill?.icon ? (
    <img src={skill.icon} alt={skill.name} title={skillTitle(skill)} className={cn(box, "rounded-sm")} />
  ) : (
    <span className={cn(box, "block rounded-sm border border-dashed bg-muted/40")} />
  );
}

/** A slot of the utility bar: its skill, and a grid of the skills it can take. */
function SkillSlot({
  skill,
  options,
  onChange,
  label,
}: {
  skill: Gw2Skill | undefined;
  options: Gw2Skill[];
  onChange: (id: number) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    // Modal, so the grid scrolls inside the editor's dialog (see CatalogPicker).
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={skill ? `${label}: ${skill.name}` : label}
          className="rounded-sm ring-offset-2 ring-offset-background transition hover:brightness-125 focus-visible:ring-2"
        >
          <SkillIcon skill={skill} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground uppercase">{label}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              title={skillTitle(o)}
              aria-label={o.name}
              className={cn("rounded-sm hover:brightness-125", o.id === skill?.id && "ring-2 ring-amber-400")}
            >
              <SkillIcon skill={o} size="sm" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * The skill bar: the active weapon set's skills (1–5, from the weapons), then heal, utilities and elite to choose —
 * for revenants their two legends instead (the skills are the first legend's); rangers also choose two pets.
 */
export default function SkillBar({
  data,
  pd,
  weaponSet,
  onChange,
}: {
  data: CustomBuildData;
  pd: ProfessionData;
  weaponSet: number;
  onChange: (patch: Partial<CustomBuildData>) => void;
}) {
  const { t } = useI18n();
  const skillsOfType = (type: string) =>
    pd.profession.skills
      .filter((s) => s.type === type)
      .map((s) => pd.skills[s.id])
      .filter((s): s is Gw2Skill => !!s && customBuildService.fitsElite(data, s.specialization));
  const weaponSkills = customBuildService.weaponSkills(pd, data.weapons[weaponSet]);
  const revenant = data.profession === "Revenant";
  const legends = pd.legends.filter((l) => customBuildService.fitsElite(data, pd.skills[l.swap]?.specialization));
  const firstLegend = pd.legends.find((l) => l.id === data.legends[0]);

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
      <Group label={t("builds.editor.weaponSkills", { set: weaponSet + 1 })}>
        {weaponSkills.map((id, i) => (
          <SkillIcon key={i} skill={id ? pd.skills[id] : undefined} />
        ))}
      </Group>

      {revenant ? (
        <>
          <Group label={t("builds.editor.legends")}>
            {[0, 1].map((i) => (
              <CatalogPicker
                key={i}
                className="w-44"
                allowNone={false}
                value={Number(data.legends[i]?.replace("Legend", "")) || null}
                placeholder={t("builds.editor.chooseLegend")}
                options={legends.map((l) => ({
                  id: Number(l.id.replace("Legend", "")),
                  name: pd.skills[l.swap]?.name ?? l.id,
                  icon: pd.skills[l.swap]?.icon ?? null,
                }))}
                onChange={(n) => {
                  const next = [...data.legends];
                  next[i] = n ? `Legend${n}` : null;
                  onChange({ legends: next });
                }}
              />
            ))}
          </Group>
          <Group label={t("builds.editor.legendSkills")}>
            {[firstLegend?.heal, ...(firstLegend?.utilities ?? [null, null, null]), firstLegend?.elite].map((id, i) => (
              <SkillIcon key={i} skill={id ? pd.skills[id] : undefined} />
            ))}
          </Group>
        </>
      ) : (
        <Group label={t("builds.editor.utilitySkills")}>
          <SkillSlot
            label={t("builds.editor.heal")}
            skill={data.skills.heal ? pd.skills[data.skills.heal] : undefined}
            options={skillsOfType("Heal")}
            onChange={(id) => onChange({ skills: { ...data.skills, heal: id } })}
          />
          {[0, 1, 2].map((i) => (
            <SkillSlot
              key={i}
              label={t("builds.editor.utility")}
              skill={data.skills.utilities[i] ? pd.skills[data.skills.utilities[i]!] : undefined}
              options={skillsOfType("Utility").filter(
                (s) => !data.skills.utilities.includes(s.id) || data.skills.utilities[i] === s.id,
              )}
              onChange={(id) => {
                const utilities = [...data.skills.utilities];
                utilities[i] = id;
                onChange({ skills: { ...data.skills, utilities } });
              }}
            />
          ))}
          <SkillSlot
            label={t("builds.editor.elite")}
            skill={data.skills.elite ? pd.skills[data.skills.elite] : undefined}
            options={skillsOfType("Elite")}
            onChange={(id) => onChange({ skills: { ...data.skills, elite: id } })}
          />
        </Group>
      )}

      {data.profession === "Ranger" && (
        <Group label={t("builds.editor.pets")}>
          {[0, 1].map((i) => (
            <CatalogPicker
              key={i}
              className="w-44"
              value={data.pets[i] ?? null}
              placeholder={t("builds.editor.choosePet")}
              options={pd.pets.map((p) => ({ id: p.id, name: p.name, icon: p.icon }))}
              onChange={(id) => {
                const pets = [...data.pets];
                pets[i] = id;
                onChange({ pets });
              }}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
