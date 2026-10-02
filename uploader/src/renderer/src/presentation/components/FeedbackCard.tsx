import { ExternalLinkIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";

/** Settings: opens the website's feedback page in the browser (with "Desktop app" chosen). */
export default function FeedbackCard() {
  const { environment } = useAppState();
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feedback.title")}</CardTitle>
        <CardDescription>{t("feedback.description")}</CardDescription>
        <CardAction>
          <Button variant="outline" onClick={() => uploaderBridge.openExternal(`${environment.webUrl}/feedback?category=uploader`)}>
            {t("feedback.open")} <ExternalLinkIcon />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
