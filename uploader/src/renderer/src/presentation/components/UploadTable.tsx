import { ExternalLinkIcon, GlobeIcon, RotateCwIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { UploadEntry } from "../../../../shared/upload.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { describeError } from "../utils/describeError";
import StageBadge from "./StageBadge";

function useUploadTableController() {
  const { environment } = useAppState();
  return {
    openDpsReport: (e: UploadEntry) => e.permalink && uploaderBridge.openExternal(e.permalink),
    openWeb: (e: UploadEntry) => e.webLogId && uploaderBridge.openExternal(`${environment.webUrl}/logs/${e.webLogId}`),
    retry: (e: UploadEntry) => uploaderBridge.retryUpload(e.id),
  };
}

export default function UploadTable({ uploads }: { uploads: UploadEntry[] }) {
  const c = useUploadTableController();
  const { t, fmt } = useI18n();

  if (!uploads.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("uploads.empty")}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("uploads.colLog")}</TableHead>
          <TableHead>{t("uploads.colGroup")}</TableHead>
          <TableHead>{t("uploads.colResult")}</TableHead>
          <TableHead className="text-right">{t("uploads.colDuration")}</TableHead>
          <TableHead>{t("uploads.colTime")}</TableHead>
          <TableHead>{t("uploads.colStatus")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploads.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="max-w-64">
              <div className="truncate font-medium">{e.bossName ?? e.fileName}</div>
              {e.bossName && <div className="truncate text-xs text-muted-foreground">{e.fileName}</div>}
              {e.stage === "failed" && e.errorCode && (
                <div className="truncate text-xs text-destructive" title={e.errorDetail ?? ""}>
                  {describeError(e.errorCode, t)}
                </div>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{e.groupName ?? "—"}</TableCell>
            <TableCell>
              {e.success != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={
                      e.success
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }
                  >
                    {e.success ? t("common.kill") : t("common.wipe")}
                  </Badge>
                  {(e.isCM || e.isLegendaryCM) && (
                    <Badge variant="outline" className="border-cm/30 bg-cm/10 text-cm">
                      {e.isLegendaryCM ? t("common.lcm") : t("common.cm")}
                    </Badge>
                  )}
                </span>
              )}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {e.durationMs != null ? fmt.duration(e.durationMs) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">{fmt.dateTime(e.encounterStart ?? e.detectedAt)}</TableCell>
            <TableCell>
              <StageBadge entry={e} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                {e.permalink && (
                  <Button variant="ghost" size="sm" onClick={() => c.openDpsReport(e)}>
                    dps.report <ExternalLinkIcon />
                  </Button>
                )}
                {e.webLogId && (
                  <Button variant="ghost" size="sm" onClick={() => c.openWeb(e)}>
                    <GlobeIcon /> {t("uploads.openWeb")}
                  </Button>
                )}
                {e.stage === "failed" && (
                  <Button variant="outline" size="sm" onClick={() => c.retry(e)}>
                    <RotateCwIcon /> {t("uploads.retry")}
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
