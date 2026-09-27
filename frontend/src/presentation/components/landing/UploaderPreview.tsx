import { CheckIcon, FolderOpenIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";

/** Illustrative uploads for the landing page. */
const UPLOADS = [
  { file: "20260927-213845.zevtc", boss: "Ura", done: false },
  { file: "20260927-212011.zevtc", boss: "Decima", done: true },
  { file: "20260927-210432.zevtc", boss: "Greer", done: true },
];

export default function UploaderPreview() {
  const { t } = useI18n();
  return (
    <div className="landing-border overflow-hidden rounded-2xl bg-card/90 shadow-2xl shadow-black/40" aria-hidden="true">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span
          className="size-5 bg-[var(--brand)] [mask-image:url(/logo.png)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
        />
        <span className="text-xs font-semibold">{t("landing.uploader.windowTitle")}</span>
        <span className="ml-auto flex gap-3 text-muted-foreground">
          <span className="h-px w-2.5 translate-y-1.5 bg-current" />
          <span className="size-2.5 border border-current" />
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-lg border bg-background/40 px-3 py-2.5">
          <FolderOpenIcon className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            {t("landing.uploader.watching")}
          </span>
        </div>
        <ul className="space-y-1.5">
          {UPLOADS.map((u) => (
            <li key={u.file} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs odd:bg-muted/40">
              <span className="w-10 font-medium">{u.boss}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{u.file}</span>
              {u.done ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckIcon className="size-3.5" /> {t("landing.uploader.uploaded")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[var(--brand)]">
                  <Loader2Icon className="size-3.5 animate-spin" /> {t("landing.uploader.uploading")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
