import { useState } from "react";
import { AlertCircleIcon, FolderOpenIcon, InfoIcon, PlayIcon, SquareIcon, UploadIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";

function useWatchPanelController() {
  const { settings, watch, logFolderExists } = useAppState();
  const [error, setError] = useState<IpcError | null>(null);

  async function toggle() {
    setError(null);
    if (watch.watching) return uploaderBridge.stopWatching();
    const res = await uploaderBridge.startWatching();
    if (!res.ok) setError(res.error);
  }

  async function chooseFolder() {
    setError(null);
    const folder = await uploaderBridge.chooseLogFolder();
    if (!folder) return;
    const res = await uploaderBridge.saveSettings({ logFolder: folder });
    if (!res.ok) setError(res.error);
  }

  return {
    folder: settings.logFolder,
    logFolderExists,
    needsFolder: !settings.logFolder || !logFolderExists,
    watch,
    error,
    toggle,
    chooseFolder,
    uploadFiles: () => uploaderBridge.uploadFiles(),
  };
}

function StatusDot({ watching }: { watching: boolean }) {
  return (
    <span className="relative flex size-3 shrink-0">
      {watching && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
      <span
        className={cn("relative inline-flex size-3 rounded-full", watching ? "bg-success" : "bg-muted-foreground/40")}
      />
    </span>
  );
}

export default function WatchPanel() {
  const c = useWatchPanelController();
  const { t, fmt } = useI18n();

  const buttons = (
    <>
      <Button
        size={c.needsFolder ? "default" : "sm"}
        variant={c.watch.watching ? "outline" : "default"}
        className={c.watch.watching ? "text-destructive" : undefined}
        onClick={c.toggle}
        disabled={!c.watch.watching && !c.logFolderExists}
      >
        {c.watch.watching ? <SquareIcon /> : <PlayIcon />}
        {c.watch.watching ? t("watch.stop") : t("watch.start")}
      </Button>
      <Button size={c.needsFolder ? "default" : "sm"} variant="outline" onClick={c.uploadFiles}>
        <UploadIcon /> {t("watch.uploadFiles")}
      </Button>
    </>
  );
  const error = c.error && (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{describeError(c.error, t)}</AlertDescription>
    </Alert>
  );

  // Folder is set: a compact row with the status and the two actions (the folder itself lives in Settings).
  if (!c.needsFolder) {
    return (
      <Card className="gap-3 py-4">
        <CardContent className="flex flex-col gap-3 px-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusDot watching={c.watch.watching} />
            <span className="font-semibold" title={t("watch.howItWorks")}>
              {c.watch.watching ? t("watch.watching") : t("watch.notWatching")}
            </span>
            {c.watch.startedAt && (
              <span className="text-sm text-muted-foreground">
                {t("watch.since", { time: fmt.time(c.watch.startedAt) })}
              </span>
            )}
            <div className="ml-auto flex gap-2">{buttons}</div>
          </div>
          {error}
        </CardContent>
      </Card>
    );
  }

  // No (existing) folder yet: explain what the app does and let the user choose one.
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4">
        <span className="mt-1.5">
          <StatusDot watching={c.watch.watching} />
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-lg">{c.watch.watching ? t("watch.watching") : t("watch.notWatching")}</CardTitle>
          <CardDescription>{t("watch.howItWorks")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground">{t("watch.title")}</span>
          <code
            className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs"
            title={c.folder}
          >
            {c.folder || "—"}
          </code>
          <Button variant="outline" size="sm" onClick={c.chooseFolder}>
            <FolderOpenIcon /> {t("watch.chooseFolder")}
          </Button>
        </div>
        {!c.folder && (
          <Alert>
            <InfoIcon />
            <AlertDescription>{t("watch.noFolder")}</AlertDescription>
          </Alert>
        )}
        {c.folder && !c.logFolderExists && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{t("watch.folderMissing")}</AlertDescription>
          </Alert>
        )}
        {error}
      </CardContent>
      <CardFooter className="gap-2">{buttons}</CardFooter>
    </Card>
  );
}
