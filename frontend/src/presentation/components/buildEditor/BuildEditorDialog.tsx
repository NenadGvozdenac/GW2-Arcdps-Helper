import { useEffect, useMemo, useState } from "react";
import { AlertCircleIcon, CheckIcon, CopyIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import {
  BOON_TYPES,
  DAMAGE_TYPES,
  ROLE_CATEGORIES,
  type BuildCategory,
  type FavoriteBuild,
} from "../../../domain/types/build.types";
import {
  PROFESSIONS,
  type CustomBuildData,
  type CustomBuildDraft,
  type Profession,
} from "../../../domain/types/customBuild.types";
import type { ProfessionData } from "../../../domain/types/gw2.types";
import { attributeService } from "../../../services/attributeService";
import { buildTemplateService } from "../../../services/buildTemplateService";
import { customBuildService } from "../../../services/customBuildService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Input } from "@/presentation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import { cn } from "@/presentation/lib/utils";
import ProfessionIcon from "../ProfessionIcon";
import { describeError } from "../../utils/describeError";
import AttributesPanel from "./AttributesPanel";
import GearEditor from "./GearEditor";
import SkillBar from "./SkillBar";
import SpecializationLine from "./SpecializationLine";

/** What the editor opens with: a draft, and the custom build it edits (none = a new build). */
export interface EditorTarget {
  draft: CustomBuildDraft;
  id?: string;
}

function useBuildEditorController(target: EditorTarget, onSaved: (build: FavoriteBuild) => void) {
  const [draft, setDraft] = useState(target.draft);
  const [pd, setPd] = useState<ProfessionData | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [weaponSet, setWeaponSet] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const profession = draft.data.profession;

  useEffect(() => {
    let cancelled = false;
    setPd(null);
    setLoadError(null);
    customBuildService
      .professionData(profession)
      .then((data) => !cancelled && setPd(data))
      .catch((err) => !cancelled && setLoadError(err));
    return () => {
      cancelled = true;
    };
  }, [profession]);

  const attributes = useMemo(() => attributeService.compute(draft.data, weaponSet), [draft.data, weaponSet]);
  const template = useMemo(() => (pd ? buildTemplateService.encode(draft.data, pd) : null), [draft.data, pd]);

  return {
    draft,
    pd,
    loadError,
    weaponSet,
    setWeaponSet,
    attributes,
    template,
    saving,
    error,
    setName: (name: string) => setDraft((d) => ({ ...d, name })),
    /** Another profession starts the build over (its traits, skills and weapons don't carry over). */
    setProfession: (p: Profession) =>
      setDraft((d) => ({ ...d, data: { ...customBuildService.empty(p), armor: d.data.armor, trinkets: d.data.trinkets } })),
    update: (patch: Partial<CustomBuildData>) => setDraft((d) => ({ ...d, data: { ...d.data, ...patch } })),
    toggleCategory: (category: BuildCategory) =>
      setDraft((d) => {
        const on = d.categories.includes(category);
        // One role at a time; boons and damage types are independent.
        const others = (ROLE_CATEGORIES as BuildCategory[]).includes(category)
          ? d.categories.filter((c) => !(ROLE_CATEGORIES as BuildCategory[]).includes(c))
          : d.categories.filter((c) => c !== category);
        return { ...d, categories: on ? d.categories.filter((c) => c !== category) : [...others, category] };
      }),
    async save() {
      if (!pd) return;
      setSaving(true);
      setError(null);
      try {
        onSaved(await customBuildService.save(draft, pd, target.id));
      } catch (err) {
        setError(err);
      } finally {
        setSaving(false);
      }
    },
  };
}

function CategoryChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        on ? "border-primary/50 bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function TemplateBox({ template }: { template: string | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold">{t("builds.template")}</h3>
      {template ? (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs select-all" title={template}>
            {template}
          </code>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            aria-label={t("builds.copy")}
            title={t("builds.copy")}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(template);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // The code is still selectable.
              }
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("builds.editor.templateNeedsSpecs")}</p>
      )}
    </div>
  );
}

/**
 * The build editor, in a large dialog: name, profession and categories; specializations and traits, skills (legends,
 * pets) and weapon skills; weapons, armor, trinkets, runes, sigils, relic, food, utility and infusions — with the
 * attributes they add up to and the build template code, kept up to date.
 */
export default function BuildEditorDialog({
  target,
  onClose,
  onSaved,
}: {
  target: EditorTarget;
  onClose: () => void;
  onSaved: (build: FavoriteBuild) => void;
}) {
  const c = useBuildEditorController(target, onSaved);
  const { t } = useI18n();
  const { data } = c.draft;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92svh] max-w-[calc(100%-1rem)] flex-col gap-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{target.id ? t("builds.editor.editTitle") : t("builds.editor.newTitle")}</DialogTitle>
          <DialogDescription>{t("builds.editor.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <Input
            value={c.draft.name}
            onChange={(e) => c.setName(e.target.value)}
            placeholder={t("builds.editor.namePlaceholder")}
            aria-label={t("builds.editor.name")}
            maxLength={80}
            className="w-full sm:w-72"
          />
          <Select value={data.profession} onValueChange={(v) => c.setProfession(v as Profession)}>
            <SelectTrigger className="w-full sm:w-48" aria-label={t("builds.editor.profession")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFESSIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  <ProfessionIcon profession={p} className="size-5" />
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-1.5">
            {[...ROLE_CATEGORIES, ...BOON_TYPES, ...DAMAGE_TYPES].map((cat) => (
              <CategoryChip
                key={cat}
                label={t(`builds.categories.${cat}`)}
                on={c.draft.categories.includes(cat)}
                onClick={() => c.toggleCategory(cat)}
              />
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-h-0 overflow-y-auto pr-1">
            {c.loadError != null ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{t("builds.editor.loadFailed")}</AlertDescription>
              </Alert>
            ) : !c.pd ? (
              <div className="grid h-full place-items-center" role="status">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="traits">
                <TabsList>
                  <TabsTrigger value="traits">{t("builds.editor.tabTraits")}</TabsTrigger>
                  <TabsTrigger value="gear">{t("builds.editor.tabGear")}</TabsTrigger>
                </TabsList>
                <TabsContent value="traits" className="flex flex-col gap-4 pt-2">
                  {data.specializations.map((line, i) => (
                    <SpecializationLine
                      key={i}
                      index={i}
                      line={line}
                      pd={c.pd!}
                      taken={data.specializations.filter((_, j) => j !== i).map((l) => l.id)}
                      onChange={(next) => {
                        const specializations = data.specializations.map((l, j) => (j === i ? next : l));
                        c.update({ specializations });
                      }}
                    />
                  ))}
                  <SkillBar data={data} pd={c.pd} weaponSet={c.weaponSet} onChange={c.update} />
                </TabsContent>
                <TabsContent value="gear" className="pt-2">
                  <GearEditor data={data} pd={c.pd} onChange={c.update} />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
            <AttributesPanel attributes={c.attributes} weaponSet={c.weaponSet} onWeaponSet={c.setWeaponSet} />
            <TemplateBox template={c.template} />
          </aside>
        </div>

        {c.error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={c.save} disabled={!c.pd || c.saving || !c.draft.name.trim()}>
            {c.saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
