import { useState } from "react";
import { CheckIcon, Loader2Icon, PencilIcon, XIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useSessions } from "../../controllers/SessionsController";
import type { Session } from "../../domain/types/session.types";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";

const NAME_MAX = 80;

/** The session name as page title, with a pencil to rename it in place (Enter saves, Escape cancels). */
export default function SessionTitle({ session, onError }: { session: Session; onError: (err: unknown) => void }) {
  const { updateSession } = useSessions();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [saving, setSaving] = useState(false);

  function start() {
    setName(session.name);
    setEditing(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (trimmed === session.name) return setEditing(false);
    setSaving(true);
    try {
      await updateSession(session.id, { name: trimmed });
      setEditing(false);
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{session.name || t("sessions.unnamed")}</h1>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={start}
          aria-label={t("sessions.rename")}
          title={t("sessions.rename")}
        >
          <PencilIcon />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input
        autoFocus
        value={name}
        maxLength={NAME_MAX}
        placeholder={t("sessions.namePlaceholder")}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="h-10 max-w-md text-lg font-semibold"
        aria-label={t("sessions.rename")}
        disabled={saving}
      />
      <Button type="submit" size="icon" className="size-9" disabled={saving} aria-label={t("common.save")}>
        {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={() => setEditing(false)}
        disabled={saving}
        aria-label={t("common.cancel")}
      >
        <XIcon />
      </Button>
    </form>
  );
}
