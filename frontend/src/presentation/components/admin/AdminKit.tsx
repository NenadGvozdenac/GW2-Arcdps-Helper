import { useState, type ReactNode } from "react";
import { AlertCircleIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { cn } from "@/presentation/lib/utils";

/** Small building blocks shared by the admin pages (English only, like the rest of the admin area). */

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" aria-label={placeholder} />
    </div>
  );
}

/**
 * Runs an admin action with a busy state; errors go to `onError` (a rejected admin token signs out), success to
 * `onDone` (usually a reload).
 */
export function useAdminAction(onDone: () => void, onError: (message: string) => void) {
  const { handleError } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    try {
      await action();
      onDone();
    } catch (err) {
      onError(handleError(err));
    } finally {
      setBusy(null);
    }
  }
  return { busy, run };
}

/** A button that asks before doing something that can't be undone. */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  busy = false,
  disabled = false,
  destructive = true,
  size = "sm",
  icon,
  children,
}: {
  label: string;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  size?: "sm" | "default";
  icon?: ReactNode;
  /** Extra content inside the dialog (e.g. a reason field). */
  children?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={size} className={cn(destructive && "text-destructive")} disabled={disabled || busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : icon}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function YesNo({ value, yes, no, tone = "neutral" }: { value: boolean; yes: string; no: string; tone?: "neutral" | "danger" }) {
  return value ? (
    <Badge variant="outline" className={tone === "danger" ? "border-destructive/40 text-destructive" : "border-success/40 text-success"}>
      {yes}
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">{no}</span>
  );
}

/** A long hash cut to its start (the full value in the tooltip). */
export function ShortHash({ value }: { value: string }) {
  return (
    <span className="font-mono text-xs" title={value}>
      {value.slice(0, 12)}…
    </span>
  );
}

/** Copies the public link of a shared log / session. */
export function shareUrl(kind: "logs" | "sessions", token: string) {
  return `${window.location.origin}/shared/${kind}/${token}`;
}
