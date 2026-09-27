import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { Badge } from "@/presentation/components/ui/badge";
// Same dragon logo as the web app (frontend/public/logo.png).
import logoUrl from "../../../../../resources/icon.png";

export default function Brand() {
  const { environment } = useAppState();
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      {/* Drawn as a CSS mask, like in the web app, so it uses a lighter purple that stays readable in dark mode. */}
      <span
        role="img"
        aria-label="GW2 ArcDPS Helper"
        className="size-8 bg-[oklch(0.7_0.2_340)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
        style={{ maskImage: `url(${logoUrl})` }}
      />
      GW2 ArcDPS Helper
      {environment.name === "development" && (
        <Badge variant="outline" className="border-sky-400/40 bg-sky-400/10 text-sky-400" title={environment.apiUrl}>
          {t("header.devBadge")}
        </Badge>
      )}
    </span>
  );
}
