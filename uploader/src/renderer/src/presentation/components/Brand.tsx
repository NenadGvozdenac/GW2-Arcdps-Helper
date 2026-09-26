import { UploadCloudIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { Badge } from "@/presentation/components/ui/badge";

export default function Brand() {
  const { environment } = useAppState();
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <UploadCloudIcon className="size-4" />
      </span>
      GW2 ArcDPS Helper <span className="font-normal text-muted-foreground">Uploader</span>
      {environment.name === "development" && (
        <Badge variant="outline" className="border-sky-400/40 bg-sky-400/10 text-sky-400" title={environment.apiUrl}>
          {t("header.devBadge")}
        </Badge>
      )}
    </span>
  );
}
