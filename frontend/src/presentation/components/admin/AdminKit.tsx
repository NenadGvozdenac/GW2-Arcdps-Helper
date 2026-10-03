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

/** The list's search field; `busy` shows a small spinner in it while results load. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  busy = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  busy?: boolean;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-8 pl-8" aria-label={placeholder} />
      {busy && (
        <Loader2Icon
          className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      )}
    </div>
  );
}

/** Stands in for a page's content until its first data arrives. */
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
      <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

/** A small spinner next to controls while data reloads (the old data stays on screen, dimmed). */
export function InlineSpinner({ show }: { show: boolean }) {
  if (!show) return null;
  return <Loader2Icon role="status" aria-label="Loading" className="size-4 animate-spin text-muted-foreground" />;
}

/**
 * Content that loads: a spinner instead of it the first time, then the content itself - dimmed while it reloads, so
 * nothing jumps.
 */
export function Loadable({ firstLoad, loading, children }: { firstLoad: boolean; loading: boolean; children: ReactNode }) {
  if (firstLoad) return <LoadingBlock />;
  return (
    <div className={cn("flex flex-col gap-6 transition-opacity", loading && "pointer-events-none opacity-60")} aria-busy={loading}>
      {children}
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

/** What each rate limit guards (the key prefixes of the backend's RATE_LIMITS). */
export const RATE_LIMIT_KIND_LABELS: Record<string, string> = {
  login: "Wrong passwords — one email from one address",
  "login-ip": "Wrong passwords — one address, any email",
  "verification-email": "Confirmation emails",
  "password-reset-email": "Password-reset emails",
  "discord-test": "Discord test messages",
  feedback: "Feedback",
  "admin-login-ip": "Admin sign-in — one address",
  "admin-login": "Admin sign-in — everywhere",
  "admin-totp": "Admin code used twice",
};
export const rateLimitKindLabel = (kind: string) => RATE_LIMIT_KIND_LABELS[kind] ?? kind;
