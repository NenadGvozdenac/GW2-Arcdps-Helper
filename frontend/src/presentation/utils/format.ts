export interface Formatters {
  /** Fight length, "m:ss" (like dps.report). */
  duration: (ms: number) => string;
  /** Longer spans (sessions) with units: "23s", "4m 12s", "1h 05m" — same as the desktop uploader. */
  span: (ms: number) => string;
  dateTime: (d: Date) => string;
  date: (d: Date) => string;
  number: (n: number) => string;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function formatSpan(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** Date/number formatters for a BCP 47 locale such as "en-GB" or "sr-Latn-RS". */
export function createFormatters(locale: string): Formatters {
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const numberFmt = new Intl.NumberFormat(locale);
  return {
    duration: formatDuration,
    span: formatSpan,
    dateTime: (d) => dateTimeFmt.format(d),
    date: (d) => dateFmt.format(d),
    number: (n) => numberFmt.format(n),
  };
}
