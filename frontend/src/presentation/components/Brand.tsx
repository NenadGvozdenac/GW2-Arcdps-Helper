/**
 * Same dragon logo as the desktop uploader (uploader/resources/icon.png).
 * Drawn as a CSS mask so it can use a lighter shade of its purple that stays readable in dark mode.
 */
export default function Brand() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        role="img"
        aria-label="GW2 ArcDPS Helper"
        className="size-8 bg-[oklch(0.7_0.2_340)] [mask-image:url(/logo.png)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
      />
      GW2 ArcDPS Helper
    </span>
  );
}
