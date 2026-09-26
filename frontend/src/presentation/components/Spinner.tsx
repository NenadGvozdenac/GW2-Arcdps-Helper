import { Loader2Icon } from "lucide-react";
import { cn } from "@/presentation/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-10", className)}>
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Spinner />
    </div>
  );
}
