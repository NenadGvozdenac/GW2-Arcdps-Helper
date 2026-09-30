import { cn } from "@/presentation/lib/utils";

/** The squad commander's tag, shaped like the in-game one: a blue, downward-pointing triangle. */
export default function CommanderIcon({ label, className }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={label} className={cn("size-4 shrink-0", className)}>
      <title>{label}</title>
      <path
        d="M3.2 4.5h17.6a1.2 1.2 0 0 1 1 1.8l-8.8 14.1a1.2 1.2 0 0 1-2 0L2.2 6.3a1.2 1.2 0 0 1 1-1.8Z"
        fill="#2d8cf0"
        stroke="#d6ebff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7.5 7.8h9L12 15.2Z" fill="#9fd0ff" opacity="0.55" />
    </svg>
  );
}
