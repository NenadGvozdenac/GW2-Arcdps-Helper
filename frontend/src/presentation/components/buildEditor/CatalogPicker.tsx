import { useMemo, useState } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { cn } from "@/presentation/lib/utils";

export interface PickerOption {
  id: number;
  name: string;
  icon: string | null;
  /** Shown under the name in the list (a rune's bonuses, a relic's effect…). */
  detail?: string;
}

/** Rune / sigil names without the "Superior " every one of them has. */
const shortName = (name: string) => name.replace(/^Superior /, "");

/**
 * Picks one item of a long list (runes, sigils, relics, food…): a button with the chosen item, opening a searchable
 * list. `allowNone` adds a way to clear it.
 */
export default function CatalogPicker({
  options,
  value,
  onChange,
  placeholder,
  allowNone = true,
  className,
}: {
  options: PickerOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder: string;
  allowNone?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.id === value) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function pick(id: number | null) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    // Modal: inside the build editor's dialog, which blocks scrolling outside itself, the list (portaled out of it)
    // takes over the scroll lock, so it scrolls.
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 w-full min-w-0 justify-between gap-2 font-normal", className)}
          title={selected?.detail ? `${selected.name}\n${selected.detail}` : selected?.name}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected?.icon && <img src={selected.icon} alt="" className="size-5 shrink-0 rounded-sm" />}
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? shortName(selected.name) : placeholder}
            </span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("builds.editor.search")}
          className="mb-2 h-8"
        />
        <div className="max-h-72 overflow-y-auto">
          {allowNone && value !== null && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
            >
              <XIcon className="size-4" /> {t("builds.editor.none")}
            </button>
          )}
          {shown.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pick(o.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                o.id === value && "bg-accent",
              )}
            >
              {o.icon && <img src={o.icon} alt="" className="mt-0.5 size-6 shrink-0 rounded-sm" loading="lazy" />}
              <span className="min-w-0">
                <span className="block font-medium">{shortName(o.name)}</span>
                {o.detail && <span className="block text-xs text-muted-foreground line-clamp-2">{o.detail}</span>}
              </span>
            </button>
          ))}
          {shown.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("builds.editor.noMatches")}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
