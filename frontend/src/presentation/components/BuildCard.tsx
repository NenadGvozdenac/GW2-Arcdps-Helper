import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, SparklesIcon, StarIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import {
  type BuildDetails,
  type FavoriteBuild,
  type GearItem,
  type GearPiece,
} from "../../domain/types/build.types";
import { buildService } from "../../services/buildService";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";
import ProfessionIcon from "./ProfessionIcon";

interface Props {
  build: BuildDetails;
  /** The saved favorite of this build, if it is one: shows when it was fetched and whether it changed. */
  favorite?: FavoriteBuild;
  onToggleFavorite: () => void;
  busy?: boolean;
  /** Drag & drop handle of a sortable favorite, shown before the icon. */
  dragHandle?: ReactNode;
  className?: string;
}

/** A GW2 item as its icon and name (the full name on hover). */
function Item({ item, count }: { item: GearItem; count?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1" title={item.name}>
      {item.icon && <img src={item.icon} alt="" className="size-4 shrink-0 rounded-sm" loading="lazy" />}
      {buildService.shortItemName(item.name)}
      {count && count > 1 && <span className="text-muted-foreground">×{count}</span>}
    </span>
  );
}

/** "Berserker's ×5 · Assassin's (Leggings)". */
function Stats({ pieces }: { pieces: GearPiece[] }) {
  const groups = buildService.statGroups(pieces);
  return (
    <>
      {groups.map((g, i) => (
        <span key={g.stat}>
          {i > 0 && <span className="text-muted-foreground"> · </span>}
          <span className="font-medium">{g.stat}</span>
          <span className="text-muted-foreground">
            {i === 0 && groups.length > 1 ? ` ×${g.count}` : i > 0 ? ` (${g.slots.join(", ")})` : ""}
          </span>
        </span>
      ))}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">{children}</dd>
    </>
  );
}

function TemplateCode({ template }: { template: string | null }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!template) return <p className="text-sm text-muted-foreground">{t("builds.noTemplate")}</p>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(template!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the code is still selectable.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs select-all" title={template}>
        {template}
      </code>
      <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? t("builds.copied") : t("builds.copy")}
      </Button>
    </div>
  );
}

/** A Snow Crows build at a glance: template, gear, link and the favorite star. */
export default function BuildCard({ build, favorite, onToggleFavorite, busy, dragHandle, className }: Props) {
  const { t, fmt } = useI18n();
  const { gear } = build;
  const runes = buildService.countItems(gear.armor.flatMap((p) => p.upgrades));
  const changed = favorite && buildService.changedByLastRefresh(favorite);

  return (
    <Card className={cn("h-full gap-4 py-4", changed && "border-primary/60", className)}>
      <CardContent className="flex flex-1 flex-col gap-4 px-4">
        <div className="flex items-start gap-3">
          {dragHandle}
          <ProfessionIcon profession={build.specialization || build.profession} className="mt-0.5 size-8" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-semibold">{build.name}</h3>
              {changed && (
                <Badge title={t("builds.changedTitle", { time: fmt.dateTime(favorite.fetchedAt) })}>
                  <SparklesIcon /> {t("builds.changed")}
                </Badge>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">{build.weapons}</p>
          </div>
          <Button asChild variant="ghost" size="icon" className="size-8 shrink-0">
            <a
              href={build.url}
              target="_blank"
              rel="noreferrer"
              title={t("builds.openOnSnowCrows")}
              aria-label={t("builds.openOnSnowCrows")}
            >
              <ExternalLinkIcon />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onToggleFavorite}
            disabled={busy}
            title={favorite ? t("builds.removeFavorite") : t("builds.addFavorite")}
            aria-label={favorite ? t("builds.removeFavorite") : t("builds.addFavorite")}
            aria-pressed={!!favorite}
          >
            {busy ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <StarIcon className={cn(favorite && "fill-amber-400 text-amber-400")} />
            )}
          </Button>
        </div>

        <TemplateCode template={build.template} />

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          {gear.armor.length > 0 && (
            <Row label={t("builds.gear.armor")}>
              <span>
                <Stats pieces={gear.armor} />
              </span>
              {runes.map((r) => (
                <Item key={r.item.id} item={r.item} count={runes.length > 1 ? r.count : undefined} />
              ))}
            </Row>
          )}
          {gear.trinkets.length > 0 && (
            <Row label={t("builds.gear.trinkets")}>
              <span>
                <Stats pieces={gear.trinkets} />
              </span>
            </Row>
          )}
          {gear.weapons.length > 0 && (
            <Row label={t("builds.gear.weapons")}>
              <div className="flex flex-col gap-1">
                {buildService.weaponSets(gear.weapons).map(({ set, weapons }) => (
                  <div key={set} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{weapons.map((w) => w.name).join(" + ")}</span>
                    {buildService.countItems(weapons.flatMap((w) => w.sigils)).map((s) => (
                      <Item key={s.item.id} item={s.item} />
                    ))}
                  </div>
                ))}
              </div>
            </Row>
          )}
          {gear.relic && (
            <Row label={t("builds.gear.relic")}>
              <Item item={gear.relic} />
            </Row>
          )}
          {gear.infusions.length > 0 && (
            <Row label={t("builds.gear.infusions")}>
              {gear.infusions.map((i) => (
                <Item key={i.item.id} item={i.item} count={i.count} />
              ))}
            </Row>
          )}
          {gear.food && (
            <Row label={t("builds.gear.food")}>
              <Item item={gear.food} />
            </Row>
          )}
          {gear.utility && (
            <Row label={t("builds.gear.utility")}>
              <Item item={gear.utility} />
            </Row>
          )}
        </dl>

        {(build.updated || favorite) && (
          <p className="mt-auto text-xs text-muted-foreground">
            {[
              build.updated && t("builds.snowCrowsUpdated", { date: build.updated }),
              favorite && t("builds.fetchedAt", { time: fmt.dateTime(favorite.fetchedAt) }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
