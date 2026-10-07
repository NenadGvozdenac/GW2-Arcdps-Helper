import type { ReactNode } from "react";
import { useI18n } from "../../../controllers/I18nController";
import { Button } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { BuildSheet, useBuildEditorController, type EditorTarget } from "./BuildEditorDialog";

/**
 * A build's details in a large dialog, to look at: traits & skills, the gear as text and icons, the attributes and
 * the build template code. `actions` (e.g. sharing) go next to Close.
 */
export default function BuildDetailsDialog({
  target,
  onClose,
  actions,
}: {
  target: EditorTarget;
  onClose: () => void;
  actions?: ReactNode;
}) {
  const c = useBuildEditorController(target);
  const { t } = useI18n();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[92svh] max-w-[calc(100%-1rem)] flex-col gap-4 sm:max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle>{c.draft.name}</DialogTitle>
          <DialogDescription>{t("builds.editor.detailsDescription")}</DialogDescription>
        </DialogHeader>

        <BuildSheet c={c} readOnly />

        <DialogFooter>
          {actions}
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
