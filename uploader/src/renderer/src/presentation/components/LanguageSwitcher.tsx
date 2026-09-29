import { useI18n } from "../../controllers/I18nController";
import type { Language } from "../../../../shared/languages";
import { cn } from "@/presentation/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import LanguageFlag from "./LanguageFlag";

/**
 * Flag dropdown for the app language. `compact` (headers) shows only the flag in the button, otherwise flag + name
 * (settings); the list always shows the full names.
 */
export default function LanguageSwitcher({ compact = true, className }: { compact?: boolean; className?: string }) {
  const { lang, setLang, languages, t } = useI18n();
  const current = languages.find((l) => l.code === lang)!;
  return (
    <Select value={lang} onValueChange={(v) => setLang(v as Language)}>
      <SelectTrigger size="sm" className={cn(compact ? "gap-1.5 px-2" : "w-48", className)} aria-label={t("header.language")}>
        <SelectValue>
          <LanguageFlag lang={lang} />
          {!compact && current.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {languages.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <LanguageFlag lang={l.code} />
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
