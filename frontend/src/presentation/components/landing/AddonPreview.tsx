import { CheckIcon, XIcon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import { cn } from "@/presentation/lib/utils";

/** Illustrative logs, drawn like the addon's in-game ImGui window (nexus-addon/src/ui.cpp). */
const LOGS = [
  { boss: "Ura (CM)", kill: true, time: "6:48" },
  { boss: "Decima", kill: false, time: "7:15" },
  { boss: "Greer", kill: true, time: "5:02" },
];

export default function AddonPreview() {
  const { t } = useI18n();
  return (
    <div className="landing-border overflow-hidden rounded-lg bg-[#1b1b1f]/95 font-sans shadow-2xl shadow-black/40" aria-hidden="true">
      <div className="flex items-center gap-2 bg-[#2a2a31] px-3 py-1.5 text-xs font-medium">
        {t("landing.addon.windowTitle")}
        <XIcon className="ml-auto size-3.5 text-muted-foreground" />
      </div>
      <div className="space-y-3 p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-destructive">REC</span>
          <span>{t("landing.addon.sessionName")}</span>
          <span className="font-mono text-muted-foreground">1:42:07</span>
        </div>
        <div className="rounded bg-[#3a3a44] py-1.5 text-center">{t("landing.addon.stop")}</div>
        <div className="flex items-center gap-2 border-t border-white/10 pt-3">
          <span className="grid size-3.5 place-items-center rounded-sm bg-[#3a3a44]">
            <CheckIcon className="size-3" />
          </span>
          {t("landing.addon.autoUpload")}
          <span className="text-success">{t("landing.addon.watching")}</span>
        </div>
        <table className="w-full">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              <th className="pb-1.5 font-normal">{t("landing.addon.colBoss")}</th>
              <th className="pb-1.5 font-normal">{t("landing.addon.colResult")}</th>
              <th className="pb-1.5 font-normal">{t("landing.addon.colTime")}</th>
              <th className="pb-1.5 font-normal">{t("landing.addon.colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l) => (
              <tr key={l.boss} className="odd:bg-white/[0.04]">
                <td className="py-1.5 pl-1">{l.boss}</td>
                <td className={cn("py-1.5", l.kill ? "text-success" : "text-destructive")}>
                  {t(l.kill ? "landing.addon.kill" : "landing.addon.wipe")}
                </td>
                <td className="py-1.5 font-mono">{l.time}</td>
                <td className="py-1.5 text-success">{t("landing.addon.done")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
