import { Loader2Icon } from "lucide-react";

/** Shown below the header while a page's data loads; the page renders once everything is there. */
export function PageSpinner() {
  return (
    <div className="flex justify-center py-24" role="status" aria-busy="true">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
