export interface Formatters {
  duration: (ms: number) => string;
  time: (iso: string) => string;
  dateTime: (iso: string) => string;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function createFormatters(locale: string): Formatters {
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  return {
    duration: formatDuration,
    time: (iso) => timeFmt.format(new Date(iso)),
    dateTime: (iso) => {
      const d = new Date(iso);
      return isToday(d) ? timeFmt.format(d) : dateTimeFmt.format(d);
    },
  };
}
