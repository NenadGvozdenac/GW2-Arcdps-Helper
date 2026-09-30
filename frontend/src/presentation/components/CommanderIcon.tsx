import { cn } from "@/presentation/lib/utils";

/** The squad commander's tag (blue commander icon from the GW2 wiki, public/icons/commander.png). */
export default function CommanderIcon({ label, className }: { label: string; className?: string }) {
  return <img src="/icons/commander.png" alt={label} title={label} className={cn("size-4 shrink-0", className)} />;
}
