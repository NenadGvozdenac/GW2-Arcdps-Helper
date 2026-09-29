import { useId } from "react";
import type { Language } from "../../../../shared/settings.types";
import { cn } from "@/presentation/lib/utils";

/** Union Jack; clip-path ids are unique per instance, since several flags can be on the page at once. */
function UnitedKingdom() {
  const id = useId();
  return (
    <>
      <clipPath id={`${id}-s`}>
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <clipPath id={`${id}-t`}>
        <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
      </clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </>
  );
}

function Serbia() {
  return (
    <>
      <path d="M0 0h60v10H0z" fill="#C6363C" />
      <path d="M0 10h60v10H0z" fill="#0C4076" />
      <path d="M0 20h60v10H0z" fill="#fff" />
    </>
  );
}

/** Inline SVG flags: Windows doesn't render flag emoji (it shows the letters "GB" / "RS"). */
export default function LanguageFlag({ lang, className }: { lang: Language; className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      aria-hidden="true"
      className={cn("h-3 w-6 shrink-0 rounded-[2px] ring-1 ring-border", className)}
    >
      {lang === "sr" ? <Serbia /> : <UnitedKingdom />}
    </svg>
  );
}
