import { Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { UploadEntry } from "../../../../shared/upload.types";
import { Badge } from "@/presentation/components/ui/badge";
import { describeError } from "../utils/describeError";

const CLASS_BY_STAGE: Record<UploadEntry["stage"], string> = {
  queued: "",
  uploading: "border-warning/30 bg-warning/10 text-warning",
  syncing: "border-warning/30 bg-warning/10 text-warning",
  done: "border-success/30 bg-success/10 text-success",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

export default function StageBadge({ entry }: { entry: UploadEntry }) {
  const { t } = useI18n();
  const title =
    entry.stage === "failed" && entry.errorCode
      ? `${describeError(entry.errorCode, t)}${entry.errorDetail ? `\n${entry.errorDetail}` : ""}`
      : undefined;
  const busy = entry.stage === "uploading" || entry.stage === "syncing";
  return (
    <Badge variant={entry.stage === "queued" ? "secondary" : "outline"} className={CLASS_BY_STAGE[entry.stage]} title={title}>
      {busy && <Loader2Icon className="animate-spin" />}
      {t(`stage.${entry.stage}`)}
    </Badge>
  );
}
