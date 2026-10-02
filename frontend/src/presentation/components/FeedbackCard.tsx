import { Link } from "react-router-dom";
import { MessageSquareIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";

/** Settings: the way to the feedback page. */
export default function FeedbackCard() {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("feedback.settingsTitle")}</CardTitle>
        <CardDescription>{t("feedback.settingsDescription")}</CardDescription>
        <CardAction>
          <Button asChild variant="outline">
            <Link to="/feedback">
              <MessageSquareIcon /> {t("feedback.settingsButton")}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
