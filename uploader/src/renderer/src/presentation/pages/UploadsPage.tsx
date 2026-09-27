import { useMemo } from "react";
import { Trash2Icon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";
import SessionPanel from "../components/SessionPanel";
import UploadTable from "../components/UploadTable";
import WatchPanel from "../components/WatchPanel";

function useUploadsPageController() {
  const { uploads } = useAppState();
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      today: uploads.filter((u) => u.stage === "done" && new Date(u.detectedAt).toDateString() === today).length,
      failed: uploads.filter((u) => u.stage === "failed").length,
      inProgress: uploads.filter((u) => u.stage === "queued" || u.stage === "uploading" || u.stage === "syncing").length,
    };
  }, [uploads]);

  return {
    uploads,
    stats,
    hasFinished: uploads.some((u) => u.stage === "done" || u.stage === "failed"),
    clearFinished: () => uploaderBridge.clearFinished(),
  };
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-5">
        <div className={cn("text-2xl font-semibold tracking-tight", className)}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function UploadsPage() {
  const c = useUploadsPageController();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <WatchPanel />
      <SessionPanel />

      <div className="grid grid-cols-3 gap-4">
        <Stat label={t("uploads.todayUploaded")} value={c.stats.today} className="text-success" />
        <Stat label={t("uploads.inProgress")} value={c.stats.inProgress} />
        <Stat label={t("uploads.failed")} value={c.stats.failed} className="text-destructive" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("uploads.title")}</CardTitle>
          {c.hasFinished && (
            <Button variant="outline" size="sm" onClick={c.clearFinished}>
              <Trash2Icon /> {t("uploads.clearFinished")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <UploadTable uploads={c.uploads} />
        </CardContent>
      </Card>
    </div>
  );
}
