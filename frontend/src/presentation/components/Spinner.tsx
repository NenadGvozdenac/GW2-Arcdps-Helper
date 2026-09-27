import { Loader2Icon } from "lucide-react";

/** The whole screen while the signed-in app loads (session + logs); header and page appear together afterwards. */
export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center" role="status" aria-busy="true">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
