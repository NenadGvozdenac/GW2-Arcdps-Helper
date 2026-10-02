import { useState } from "react";
import { AlertCircleIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import type { FeedbackCategory } from "../../../../shared/backend.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { describeError } from "../utils/describeError";

const CATEGORIES: FeedbackCategory[] = ["addon", "uploader", "website", "other"];
// Same limits as the backend.
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 5000;

function useFeedbackController() {
  // Sent from the desktop app, so that is the likeliest topic.
  const [category, setCategory] = useState<FeedbackCategory>("uploader");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<IpcError | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    setSent(false);
    const res = await uploaderBridge.sendFeedback({ category, title, description });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setTitle("");
    setDescription("");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return { category, setCategory, title, setTitle, description, setDescription, busy, sent, error, send };
}

/** Settings: feedback to the developer, emailed through the website and linked to the signed-in account. */
export default function FeedbackCard() {
  const c = useFeedbackController();
  const { t } = useI18n();

  return (
    <Card>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          c.send();
        }}
      >
        <CardHeader>
          <CardTitle>{t("feedback.title")}</CardTitle>
          <CardDescription>{t("feedback.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="feedbackCategory">{t("feedback.category")}</Label>
            <Select value={c.category} onValueChange={(v) => c.setCategory(v as FeedbackCategory)}>
              <SelectTrigger id="feedbackCategory" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`feedback.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="feedbackTitle">{t("feedback.titleLabel")}</Label>
            <Input
              id="feedbackTitle"
              value={c.title}
              onChange={(e) => c.setTitle(e.target.value)}
              placeholder={t("feedback.titlePlaceholder")}
              maxLength={TITLE_MAX}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="feedbackDescription">{t("feedback.descriptionLabel")}</Label>
            <Textarea
              id="feedbackDescription"
              rows={6}
              value={c.description}
              onChange={(e) => c.setDescription(e.target.value)}
              placeholder={t("feedback.descriptionPlaceholder")}
              maxLength={DESCRIPTION_MAX}
            />
          </div>
          {c.error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="submit" disabled={c.busy || !c.title.trim() || !c.description.trim()}>
            {c.busy && <Loader2Icon className="animate-spin" />}
            {c.busy ? t("feedback.sending") : t("feedback.send")}
          </Button>
          {c.sent && (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckIcon className="size-4" /> {t("feedback.sent")}
            </span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
