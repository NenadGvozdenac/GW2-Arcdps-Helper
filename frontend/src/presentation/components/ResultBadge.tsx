import { useI18n } from "../../controllers/I18nController";
import type { Log } from "../../domain/types/log.types";
import { Badge } from "@/presentation/components/ui/badge";

export const successBadge = "border-success/30 bg-success/10 text-success";
export const failBadge = "border-destructive/30 bg-destructive/10 text-destructive";
export const cmBadge = "border-cm/30 bg-cm/10 text-cm";

export default function ResultBadge({ log }: { log: Log }) {
  const { t, fmt } = useI18n();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {log.success ? (
        <Badge variant="outline" className={successBadge}>
          {t("common.kill")}
        </Badge>
      ) : (
        <Badge variant="outline" className={failBadge}>
          {t("common.wipe")}
          {log.bossHealthLeft != null ? ` · ${fmt.number(Math.round(log.bossHealthLeft * 10) / 10)}%` : ""}
        </Badge>
      )}
      {(log.isCM || log.isLegendaryCM) && (
        <Badge variant="outline" className={cmBadge}>
          {log.isLegendaryCM ? t("common.lcm") : t("common.cm")}
        </Badge>
      )}
    </span>
  );
}
