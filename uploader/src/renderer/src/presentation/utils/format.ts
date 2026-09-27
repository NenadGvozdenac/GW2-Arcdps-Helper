export interface Formatters {
  /** Fight length, "m:ss" (like dps.report). */
  duration: (ms: number) => string;
  /** Longer spans with units: "23s", "4m 12s", "1h 05m". */
  span: (ms: number) => string;
  time: (iso: string) => string;
  dateTime: (iso: string) => string;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
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

export function createFormatters(locale: string): Formatters {
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  return {
    duration: formatDuration,
    span: formatSpan,
    time: (iso) => timeFmt.format(new Date(iso)),
    dateTime: (iso) => {
      const d = new Date(iso);
      return isToday(d) ? timeFmt.format(d) : dateTimeFmt.format(d);
    },
  };
}
