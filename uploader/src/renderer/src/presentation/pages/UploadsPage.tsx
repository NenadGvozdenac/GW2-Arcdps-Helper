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
  const { uploads: all } = useAppState();
  // Logs that could not be uploaded are not shown at all.
  const uploads = useMemo(() => all.filter((u) => u.stage !== "failed"), [all]);
  const stats = useMemo(() => {
    const done = uploads.filter((u) => u.stage === "done");
    return {
      uploaded: done.length,
      kills: done.filter((u) => u.success === true).length,
      wipes: done.filter((u) => u.success === false).length,
    };
  }, [uploads]);

  return {
    uploads,
    stats,
    hasFinished: uploads.some((u) => u.stage === "done"),
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
      <div className="grid grid-cols-3 gap-4">
        <Stat label={t("uploads.uploaded")} value={c.stats.uploaded} />
        <Stat label={t("uploads.kills")} value={c.stats.kills} className="text-success" />
        <Stat label={t("uploads.wipes")} value={c.stats.wipes} className="text-destructive" />
      </div>

      <WatchPanel />
      <SessionPanel />

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
