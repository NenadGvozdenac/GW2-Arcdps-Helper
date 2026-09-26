import { useI18n } from "../../controllers/I18nController";
import type { Language } from "../../i18n/i18n.types";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";

export default function LanguageSwitcher() {
  const { lang, setLang, languages, t } = useI18n();
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={lang}
      onValueChange={(v) => v && setLang(v as Language)}
      aria-label={t("nav.language")}
    >
      {languages.map((l) => (
        <ToggleGroupItem key={l.code} value={l.code} title={l.label} className="px-2.5 text-xs font-semibold">
          {l.code.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
