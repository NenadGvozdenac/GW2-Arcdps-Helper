import { Link } from "react-router-dom";
import { HomeIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";

/** Any address the website doesn't know (inside the app Layout when signed in, the guest frame otherwise). */
export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-6xl font-semibold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild className="mt-2">
        <Link to="/">
          <HomeIcon /> {t("notFound.home")}
        </Link>
      </Button>
    </div>
  );
}
