import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { SharedBuild } from "../../domain/types/build.types";
import type { CustomBuildDraft } from "../../domain/types/customBuild.types";
import { buildService } from "../../services/buildService";
import { customBuildService } from "../../services/customBuildService";
import { BuildSheet, useBuildEditorController } from "../components/buildEditor/BuildEditorDialog";
import PageHeader from "../components/PageHeader";

function useSharedBuildController(token: string | undefined) {
  const [shared, setShared] = useState<{ data: SharedBuild; draft: CustomBuildDraft } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound">("loading");

  useEffect(() => {
    if (!token) {
      setState("notFound");
      return;
    }
    let cancelled = false;
    setState("loading");
    buildService
      .getShared(token)
      .then(async (data) => {
        const draft = await customBuildService.fromBuild(data.build, data.build.name);
        if (cancelled) return;
        if (!draft) throw new Error("Unknown profession");
        setShared({ data, draft });
        setState("ready");
      })
      .catch(() => !cancelled && setState("notFound"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return { shared, state };
}

/** The build's sheet, read-only (its own component: the editor's controller needs the draft from the start). */
function SharedBuildSheet({ draft }: { draft: CustomBuildDraft }) {
  const c = useBuildEditorController({ draft });
  return (
    <div className="flex h-[calc(100svh-10rem)] min-h-[40rem] flex-col gap-4">
      <BuildSheet c={c} readOnly />
    </div>
  );
}

/** Public, read-only view of a build opened through its share link (no sign-in needed). */
export default function SharedBuildPage() {
  const { token } = useParams();
  const c = useSharedBuildController(token);
  const { t } = useI18n();

  if (c.state === "loading") {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (c.state === "notFound" || !c.shared) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("builds.sharedNotFound")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("builds.sharedNotFoundHint")}</p>
      </div>
    );
  }

  const { data, draft } = c.shared;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.build.name}
        description={data.owner ? t("builds.sharedBy", { name: data.owner }) : undefined}
      />
      <SharedBuildSheet draft={draft} />
    </div>
  );
}
