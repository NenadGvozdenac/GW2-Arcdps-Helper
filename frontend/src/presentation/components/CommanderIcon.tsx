import { cn } from "@/presentation/lib/utils";

/** The blue commander tag from the GW2 wiki. */
export const COMMANDER_ICON = "/icons/commander.png";

/** The squad commander's tag, shown next to their name. */
export default function CommanderIcon({ label, className }: { label: string; className?: string }) {
  return <img src={COMMANDER_ICON} alt={label} title={label} className={cn("size-4 shrink-0", className)} />;
}
