import { useEffect, useState } from "react";
import { AlertCircleIcon, CheckIcon, FolderOpenIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import type { Settings } from "../../../../shared/settings.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Switch } from "@/presentation/components/ui/switch";
import { describeError } from "../utils/describeError";

type EditableSettings = Omit<Settings, "language">;

function useSettingsController() {
  const { settings, user, environment } = useAppState();
  const [form, setForm] = useState<EditableSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<IpcError | null>(null);

  // Keep the form in sync when settings change elsewhere (e.g. folder chosen on the uploads tab).
  useEffect(() => setForm(settings), [settings]);

  const set = <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function browseFolder() {
    const folder = await uploaderBridge.chooseLogFolder();
    if (folder) set("logFolder", folder);
  }

  async function save() {
    setError(null);
    const res = await uploaderBridge.saveSettings(form);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return { form, set, user, environment, saved, error, browseFolder, save };
}

export default function SettingsPage() {
  const c = useSettingsController();
  const { t, lang, setLang, languages } = useI18n();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        {c.user && (
          <p className="text-sm text-muted-foreground">
            {t("settings.account", { name: c.user.gw2Account || c.user.email, email: c.user.email })}
          </p>
        )}
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("settings.server", { url: c.environment.webUrl })}
          {c.environment.name === "development" && (
            <Badge variant="outline" className="border-sky-400/40 bg-sky-400/10 text-sky-400">
              {t("header.devBadge")}
            </Badge>
          )}
        </p>
      </div>

      <Card>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            c.save();
          }}
        >
          <CardHeader>
            <CardTitle>{t("settings.logFolder")}</CardTitle>
            <CardDescription>{t("settings.logFolderHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex gap-2">
              <Input value={c.form.logFolder} onChange={(e) => c.set("logFolder", e.target.value)} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={c.browseFolder}>
                <FolderOpenIcon /> {t("common.browse")}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dpsReportToken">{t("settings.dpsReportToken")}</Label>
              <Input
                id="dpsReportToken"
                value={c.form.dpsReportToken}
                onChange={(e) => c.set("dpsReportToken", e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-xs"
              />
              <p className="text-sm text-muted-foreground">{t("settings.dpsReportTokenHint")}</p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <Label htmlFor="watchOnStartup" className="font-normal">
                {t("settings.watchOnStartup")}
              </Label>
              <Switch
                id="watchOnStartup"
                checked={c.form.watchOnStartup}
                onCheckedChange={(v) => c.set("watchOnStartup", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <Label htmlFor="desktopNotifications" className="font-normal">
                {t("settings.desktopNotifications")}
              </Label>
              <Switch
                id="desktopNotifications"
                checked={c.form.desktopNotifications}
                onCheckedChange={(v) => c.set("desktopNotifications", v)}
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("settings.language")}</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as Settings["language"])}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {c.error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{describeError(c.error, t)}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit">{t("common.save")}</Button>
            {c.saved && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <CheckIcon className="size-4" /> {t("common.saved")}
              </span>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
