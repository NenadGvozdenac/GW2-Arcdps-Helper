import { DownloadIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import { Button } from "@/presentation/components/ui/button";

function useUpdateBannerController() {
  const { update } = useAppState();
  return {
    update,
    install: () => uploaderBridge.installUpdate(),
    openDownload: () => update.downloadUrl && uploaderBridge.openExternal(update.downloadUrl),
  };
}

/** A thin bar above the app while a new version downloads, is ready to install, or (portable exe) can be downloaded. */
export default function UpdateBanner() {
  const { update, install, openDownload } = useUpdateBannerController();
  const { t } = useI18n();
  if (update.status === "idle" || !update.version) return null;

  return (
    <div className="border-b bg-accent/40">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-2 text-sm">
        {update.status === "downloading" && (
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            {t("update.downloading", { version: update.version, progress: update.progress ?? 0 })}
          </span>
        )}
        {update.status === "ready" && (
          <>
            <span>{t("update.ready", { version: update.version })}</span>
            <Button size="sm" className="ml-auto" onClick={install}>
              <RefreshCwIcon /> {t("update.restart")}
            </Button>
          </>
        )}
        {update.status === "available" && (
          <>
            <span>{t("update.available", { version: update.version })}</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={openDownload}>
              <DownloadIcon /> {t("update.download")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
