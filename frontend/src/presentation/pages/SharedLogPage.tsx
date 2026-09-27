import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { logService } from "../../services/logService";
import type { SharedLog } from "../../domain/types/log.types";
import { Button } from "@/presentation/components/ui/button";
import LogView from "../components/LogView";

function useSharedLogController(token: string | undefined) {
  const [data, setData] = useState<SharedLog | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound">("loading");

  useEffect(() => {
    if (!token) {
      setState("notFound");
      return;
    }
    let cancelled = false;
    setState("loading");
    logService
      .getShared(token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("notFound");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // The sharing player's rows are highlighted, like on their own log page.
  const isOwnAccount = (account: string) => !!data?.owner && account.toLowerCase() === data.owner.toLowerCase();

  return { state, data, isOwnAccount };
}

/** Public, read-only view of a log opened through its share link (no sign-in needed). */
export default function SharedLogPage() {
  const { token } = useParams();
  const c = useSharedLogController(token);
  const { t } = useI18n();

  if (c.state === "loading") {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (c.state === "notFound" || !c.data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("logDetail.sharedNotFound")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("logDetail.sharedNotFoundHint")}</p>
      </div>
    );
  }

  const { log, owner } = c.data;
  return (
    <div className="flex flex-col gap-6">
      <LogView
        log={log}
        isOwnAccount={c.isOwnAccount}
        meta={owner && <span>· {t("logDetail.sharedBy", { name: owner })}</span>}
        actions={
          <Button asChild>
            <a href={log.url} target="_blank" rel="noreferrer">
              dps.report <ExternalLinkIcon />
            </a>
          </Button>
        }
      />
    </div>
  );
}
