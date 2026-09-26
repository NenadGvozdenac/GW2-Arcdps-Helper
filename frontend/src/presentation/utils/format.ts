export interface Formatters {
  duration: (ms: number) => string;
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

/** Date/number formatters for a BCP 47 locale such as "en-GB" or "sr-Latn-RS". */
export function createFormatters(locale: string): Formatters {
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const numberFmt = new Intl.NumberFormat(locale);
  return {
    duration: formatDuration,
    dateTime: (d) => dateTimeFmt.format(d),
    date: (d) => dateFmt.format(d),
    number: (n) => numberFmt.format(n),
  };
}
