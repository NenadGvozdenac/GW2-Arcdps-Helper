import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  FileIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { LOG_FILE_EXTENSIONS, PARALLEL_FILE_UPLOADS } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { logService } from "../../services/logService";
import type { FileUpload } from "../../domain/types/upload.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";
import { failBadge, successBadge } from "./ResultBadge";

/** The file list shows this many rows, then scrolls. */
const VISIBLE_ROWS = 5;
/** Fixed row height (px) so the list can be sized to exactly VISIBLE_ROWS rows. */
const ROW_HEIGHT = 56;

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Files start uploading as soon as they are picked or dropped; more can be added while others are in flight. */
function useFileUploadController() {
  const { refresh } = useLogs();
  const [items, setItems] = useState<FileUpload[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Ids already handed to an upload, so a re-render can never start the same file twice. */
  const started = useRef(new Set<string>());
  /** Whether this round of uploads added a new log (the log list is refreshed once the queue is empty). */
  const addedAny = useRef(false);

  const update = (id: string, patch: Partial<FileUpload>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  async function upload(item: FileUpload) {
    try {
      const result = await logService.uploadFile(item.file);
      if (result.status === "ok") addedAny.current = true;
      update(item.id, { stage: result.status === "error" ? "failed" : "done", result });
    } catch (error) {
      update(item.id, { stage: "failed", error });
    }
  }

  const uploading = items.filter((it) => it.stage === "uploading").length;
  const queued = items.filter((it) => it.stage === "queued").length;
  const busy = uploading + queued > 0;

  // Keep up to PARALLEL_FILE_UPLOADS uploads running while files are waiting.
  useEffect(() => {
    const free = PARALLEL_FILE_UPLOADS - uploading;
    const next = items.filter((it) => it.stage === "queued" && !started.current.has(it.id)).slice(0, Math.max(0, free));
    for (const it of next) {
      started.current.add(it.id);
      update(it.id, { stage: "uploading" });
      void upload(it);
    }
  }, [items, uploading]);

  // Refresh the log list once everything has finished.
  useEffect(() => {
    if (busy || !addedAny.current) return;
    addedAny.current = false;
    void refresh();
  }, [busy, refresh]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const files = logService.logFilesOnly(list);
    setSkipped(list.length - files.length);
    setItems((prev) => {
      const known = new Set(prev.map((it) => it.id));
      const added = files
        .filter((f) => !known.has(fileKey(f)))
        .map((file): FileUpload => ({ id: fileKey(file), file, stage: "queued" }));
      return [...prev, ...added];
    });
  }

  const results = useMemo(() => items.flatMap((it) => (it.result ? [it.result] : [])), [items]);
  const failedWithoutResult = items.filter((it) => it.stage === "failed" && !it.result).length;
  const summary = useMemo(() => {
    if (!items.some((it) => it.stage === "done" || it.stage === "failed")) return null;
    const s = logService.summarize(results);
    return { ...s, failed: s.failed + failedWithoutResult };
  }, [items, results, failedWithoutResult]);

  return {
    items,
    skipped,
    busy,
    dragging,
    setDragging,
    addFiles,
    summary,
    finished: items.filter((it) => it.stage === "done" || it.stage === "failed").length,
    /** Removes finished files from the list. */
    clear: () => {
      setItems((prev) => prev.filter((it) => it.stage === "queued" || it.stage === "uploading"));
      setSkipped(0);
    },
  };
}

export default function FileUploadBox() {
  const c = useFileUploadController();
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    c.setDragging(false);
    c.addFiles(e.dataTransfer.files);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("upload.filesTitle")}</CardTitle>
        <CardDescription>{t("upload.filesHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            c.setDragging(true);
          }}
          onDragLeave={() => c.setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
            c.dragging ? "border-primary bg-accent/60" : "border-border",
          )}
        >
          <UploadCloudIcon className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t("upload.dropHere")}</p>
          <p className="text-xs text-muted-foreground">{t("upload.or")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            {t("upload.browse")}
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={LOG_FILE_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => {
              c.addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {c.skipped > 0 && <p className="text-sm text-warning">{t("upload.notLogFiles", { count: c.skipped })}</p>}

        {c.summary && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={successBadge}>
              {t("upload.added", { count: c.summary.added })}
            </Badge>
            {c.summary.duplicates > 0 && (
              <Badge variant="secondary">{t("upload.duplicates", { count: c.summary.duplicates })}</Badge>
            )}
            {c.summary.failed > 0 && (
              <Badge variant="outline" className={failBadge}>
                {t("upload.failed", { count: c.summary.failed })}
              </Badge>
            )}
          </div>
        )}

        {c.items.length > 0 && (
          <ul
            className="divide-y overflow-y-auto rounded-md border text-sm"
            // + 2px for the list's own top and bottom border.
            style={{ maxHeight: VISIBLE_ROWS * ROW_HEIGHT + 2 }}
          >
            {c.items.map((it) => (
              <li key={it.id} className="flex shrink-0 items-center gap-3 px-3" style={{ height: ROW_HEIGHT }}>
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={it.file.name}>
                    {it.file.name}
                  </p>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0">{formatSize(it.file.size)}</span>
                    <span>·</span>
                    <FileStatus item={it} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {c.items.length > 0 && (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            {c.busy && <Loader2Icon className="size-4 animate-spin" />}
            {c.busy
              ? t("upload.uploadingFiles", { done: c.finished, total: c.items.length })
              : t("upload.filesSelected", { count: c.items.length })}
          </span>
          {c.finished > 0 && (
            <Button type="button" variant="ghost" onClick={c.clear}>
              {t("upload.clearFiles")}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function FileStatus({ item }: { item: FileUpload }) {
  const { t } = useI18n();
  const r = item.result;

  if (item.stage === "queued")
    return (
      <span className="inline-flex items-center gap-1">
        <ClockIcon className="size-3" /> {t("upload.stageQueued")}
      </span>
    );
  if (item.stage === "uploading")
    return (
      <span className="inline-flex items-center gap-1 text-foreground">
        <Loader2Icon className="size-3 animate-spin" />
        {t("upload.stageUploading")}
      </span>
    );
  if (r?.status === "ok")
    return (
      <Link to={`/logs/${r.logId}`} className="inline-flex min-w-0 items-center gap-1 font-medium hover:underline">
        {r.success ? (
          <CheckCircle2Icon className="size-3 shrink-0 text-success" />
        ) : (
          <XCircleIcon className="size-3 shrink-0 text-destructive" />
        )}
        <span className="truncate text-foreground">{r.bossName}</span>
      </Link>
    );
  if (r?.status === "duplicate")
    return (
      <Link to={`/logs/${r.logId}`} className="inline-flex items-center gap-1 hover:underline">
        <CircleDotIcon className="size-3" /> {t("upload.alreadyAdded")}
      </Link>
    );
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-destructive">
      <AlertCircleIcon className="size-3 shrink-0" />
      <span className="truncate">{r?.status === "error" ? t(`errors.${r.code}`) : describeError(item.error, t)}</span>
    </span>
  );
}
