import { useState } from "react";
import { cn } from "@/presentation/lib/utils";

/**
 * Icon of a profession or elite specialization as Elite Insights names it ("Guardian", "Firebrand", "Amalgam"…):
 * the GW2 wiki's 48px tango icons, saved as public/icons/professions/<name>.png. Null for an unknown / empty name.
 */
export const professionIcon = (profession: string): string | null =>
  profession ? `/icons/professions/${profession.toLowerCase()}.png` : null;

/** Distinct profession icons of a squad (to preload / wait for them). */
export const squadProfessionIcons = (players: readonly { profession: string }[]): string[] => [
  ...new Set(players.flatMap((p) => professionIcon(p.profession) ?? [])),
];

/** The player's profession icon, with its name on hover; an empty square of the same size when there is none. */
export default function ProfessionIcon({ profession, className }: { profession: string; className?: string }) {
  const src = professionIcon(profession);
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span aria-hidden className={cn("inline-block size-6 shrink-0", className)} />;
  return (
    <img
      src={src}
      alt={profession}
      title={profession}
      onError={() => setBroken(true)}
      className={cn("size-6 shrink-0", className)}
    />
  );
}
