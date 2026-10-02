import { useState } from "react";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { FEEDBACK_DESCRIPTION_MAX, FEEDBACK_TITLE_MAX } from "../../config/constants";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "../../domain/types/feedback.types";
import { feedbackService } from "../../services/feedbackService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardFooter } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import PageHeader from "../components/PageHeader";
import { describeError } from "../utils/describeError";

function useFeedbackController() {
  const { user } = useAuth();
  // Sent from the website, so that is the likeliest topic.
  const [category, setCategory] = useState<FeedbackCategory>("website");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await feedbackService.send({ category, title, description, contactEmail: user ? undefined : contactEmail });
      setSent(true);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return {
    user,
    category,
    setCategory,
    title,
    setTitle,
    description,
    setDescription,
    contactEmail,
    setContactEmail,
    busy,
    sent,
    error,
    send,
    sendMore: () => setSent(false),
  };
}

/**
 * Feedback to the developer: saved and emailed. Anyone may send it; a signed-in user's feedback is linked to their
 * account (and answered at its email), a guest may leave an email.
 */
export default function FeedbackPage() {
  const c = useFeedbackController();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("feedback.title")} description={t("feedback.description")} />
      <Card>
        {c.sent ? (
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2Icon className="size-10 text-success" />
            <p className="text-lg font-semibold">{t("feedback.sentTitle")}</p>
            <p className="max-w-md text-sm text-muted-foreground text-pretty">
              {c.user ? t("feedback.sentBodyUser", { email: c.user.email }) : t("feedback.sentBodyGuest")}
            </p>
            <Button variant="outline" onClick={c.sendMore}>
              {t("feedback.sendMore")}
            </Button>
          </CardContent>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              c.send();
            }}
          >
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="feedbackCategory">{t("feedback.category")}</Label>
                <Select value={c.category} onValueChange={(v) => c.setCategory(v as FeedbackCategory)}>
                  <SelectTrigger id="feedbackCategory" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((cat) => (
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
                  maxLength={FEEDBACK_TITLE_MAX}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="feedbackDescription">{t("feedback.descriptionLabel")}</Label>
                <Textarea
                  id="feedbackDescription"
                  rows={8}
                  value={c.description}
                  onChange={(e) => c.setDescription(e.target.value)}
                  placeholder={t("feedback.descriptionPlaceholder")}
                  maxLength={FEEDBACK_DESCRIPTION_MAX}
                  required
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {c.description.length} / {FEEDBACK_DESCRIPTION_MAX}
                </p>
              </div>
              {!c.user && (
                <div className="grid gap-2">
                  <Label htmlFor="feedbackEmail">{t("feedback.contactEmail")}</Label>
                  <Input
                    id="feedbackEmail"
                    type="email"
                    value={c.contactEmail}
                    onChange={(e) => c.setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                  <p className="text-sm text-muted-foreground">{t("feedback.contactEmailHint")}</p>
                </div>
              )}
              {c.error != null && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{describeError(c.error, t)}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={c.busy || !c.title.trim() || !c.description.trim()}>
                {c.busy && <Loader2Icon className="animate-spin" />}
                {c.busy ? t("feedback.sending") : t("feedback.send")}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
