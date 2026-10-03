import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useI18n } from "../../../controllers/I18nController";
import { localeFor } from "../../../i18n/translate";

/**
 * Charts of the dashboard and the admin overview, drawn as plain SVG. Colors are the dataviz categorical slots for the app's dark card
 * surface (#171717), validated as a set (CVD ΔE ≥ 9.4, normal ΔE ≥ 26.5, all ≥ 3:1): always used in this order, never
 * cycled; a fourth series folds into "Other" (gray). Text never wears a series color.
 */
export const SERIES = { s1: "#3987e5", s2: "#d95926", s3: "#199e70", other: "#898781" } as const;
const INK = { muted: "#898781", grid: "#2c2c2a", axis: "#383835", surface: "#171717" } as const;

export interface ChartSeries {
  name: string;
  color: string;
}

/** One x position: a UTC day ("2026-10-03") and a value per series. */
export interface ChartPoint {
  date: string;
  values: number[];
}

/** Day and number formats in the reader's language ("3 Oct" / "3. okt"). Days are UTC, like the resets. */
function useChartFormat() {
  const { lang } = useI18n();
  return useMemo(() => {
    const locale = localeFor(lang);
    const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return {
      day: (date: string, isLong = false) => (isLong ? long : short).format(new Date(`${date}T00:00:00Z`)),
      number: (n: number) => n.toLocaleString(locale),
    };
  }, [lang]);
}

/** Width of an element, kept up to date (charts are drawn in real pixels, so text never stretches). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/** The axis maximum: four equal, whole-number steps of 1, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ - round ticks, little empty space. */
function niceMax(value: number): number {
  const raw = Math.max(1, value / 4);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * pow).find((s) => s >= raw && Number.isInteger(s))!;
  return step * 4;
}

/** A rect whose top corners are rounded (the data end) and whose bottom sits square on the baseline. */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function Legend({ series, kind }: { series: ChartSeries[]; kind: "columns" | "line" }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          {kind === "columns" ? (
            <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
          ) : (
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
          )}
          {s.name}
        </li>
      ))}
    </ul>
  );
}

/** The same numbers as the chart, as a table (the accessible twin; tooltips never gate a value). */
function TableView({ data, series }: { data: ChartPoint[]; series: ChartSeries[] }) {
  const { t } = useI18n();
  const f = useChartFormat();
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{t("charts.showTable")}</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b">
              <th className="px-2 py-1.5 text-left font-medium">{t("charts.day")}</th>
              {series.map((s) => (
                <th key={s.name} className="px-2 py-1.5 text-right font-medium">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.date} className="border-b last:border-0">
                <td className="px-2 py-1">{f.day(p.date, true)}</td>
                {p.values.map((v, i) => (
                  <td key={series[i].name} className="px-2 py-1 text-right tabular-nums">
                    {f.number(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const MARGIN = { top: 10, right: 12, bottom: 24, left: 40 };

/**
 * A per-day chart: stacked columns (series = parts of each day) or one line with a light area wash. Hover, or focus
 * and the arrow keys, show every series of that day in a tooltip; the table view below has all values.
 */
export function TimeChart({
  kind,
  data,
  series,
  label,
  height = 200,
}: {
  kind: "columns" | "line";
  data: ChartPoint[];
  series: ChartSeries[];
  /** What the chart shows, for screen readers. */
  label: string;
  height?: number;
}) {
  const { t } = useI18n();
  const f = useChartFormat();
  const { ref, width } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const right = kind === "line" ? 44 : MARGIN.right;
  const plotW = Math.max(0, width - MARGIN.left - right);
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const n = data.length;
  const band = n ? plotW / n : 0;
  const totals = data.map((p) => (kind === "columns" ? p.values.reduce((a, b) => a + b, 0) : p.values[0]));
  const max = niceMax(Math.max(0, ...totals));
  const x = (i: number) => MARGIN.left + band * (i + 0.5);
  const y = (v: number) => MARGIN.top + plotH - (v / max) * plotH;
  const ticks = [0, 1, 2, 3, 4].map((t) => (max / 4) * t);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 64))));
  const xLabels = data.map((_, i) => i).filter((i) => (n - 1 - i) % labelEvery === 0);

  function onPointer(clientX: number, target: Element) {
    const left = target.getBoundingClientRect().left;
    const i = Math.floor((clientX - left - MARGIN.left) / band);
    setActive(i >= 0 && i < n ? i : null);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
  }

  const barW = Math.max(2, Math.min(24, band - 2));
  const linePath = data.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.values[0])}`).join("");
  const last = n - 1;

  return (
    <div className="flex flex-col gap-3">
      <Legend series={series} kind={kind} />
      <div
        ref={ref}
        className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="group"
        aria-label={t("charts.keyboardHint", { label })}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? last)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="block touch-none select-none"
            onPointerMove={(e) => onPointer(e.clientX, e.currentTarget)}
            onPointerLeave={() => setActive(null)}
            aria-hidden="true"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? INK.axis : INK.grid} strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {f.number(tick)}
                </text>
              </g>
            ))}
            {xLabels.map((i) => (
              <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={11} fill={INK.muted}>
                {f.day(data[i].date)}
              </text>
            ))}

            {active !== null && kind === "columns" && (
              <rect x={x(active) - band / 2} y={MARGIN.top} width={band} height={plotH} fill="#ffffff" opacity={0.05} />
            )}

            {kind === "columns" &&
              data.map((p, i) => {
                // Bottom-up stack; a 2px surface gap between segments, the top one rounded.
                const parts: { color: string; y: number; h: number }[] = [];
                let cursor = y(0);
                p.values.forEach((v, j) => {
                  if (v <= 0) return;
                  const h = (v / max) * plotH;
                  const gap = parts.length ? 2 : 0;
                  parts.push({ color: series[j].color, y: cursor - h, h: Math.max(0, h - gap) });
                  cursor -= h;
                });
                return parts.map((s, k) =>
                  k === parts.length - 1 ? (
                    <path key={k} d={roundedTop(x(i) - barW / 2, s.y, barW, s.h, 4)} fill={s.color} />
                  ) : (
                    <rect key={k} x={x(i) - barW / 2} y={s.y} width={barW} height={s.h} fill={s.color} />
                  ),
                );
              })}

            {kind === "line" && n > 0 && (
              <>
                <path d={`${linePath}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`} fill={series[0].color} opacity={0.1} />
                <path d={linePath} fill="none" stroke={series[0].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {active !== null && (
                  <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} stroke={INK.muted} strokeWidth={1} />
                )}
                {[active ?? last].map((i) => (
                  <circle key={i} cx={x(i)} cy={y(data[i].values[0])} r={4} fill={series[0].color} stroke={INK.surface} strokeWidth={2} />
                ))}
                <text x={x(last) + 8} y={y(data[last].values[0])} dy="0.32em" fontSize={12} fontWeight={600} fill="currentColor">
                  {f.number(data[last].values[0])}
                </text>
              </>
            )}
          </svg>
        )}

        {active !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(x(active) + 12, 0), Math.max(0, width - 168)),
            }}
          >
            <div className="mb-1 font-medium text-muted-foreground">{f.day(data[active].date, true)}</div>
            {kind === "columns" && series.length > 1 && (
              <div className="mb-1 flex justify-between gap-4">
                <span className="text-muted-foreground">{t("charts.total")}</span>
                <span className="font-semibold tabular-nums">{f.number(totals[active])}</span>
              </div>
            )}
            {series.map((s, j) => (
              <div key={s.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold tabular-nums">{f.number(data[active].values[j])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <TableView data={data} series={series} />
    </div>
  );
}

/** Horizontal bars of one series (nominal categories: one color), the value at each bar's tip. */
export function BarList({
  rows,
  color = SERIES.s1,
  empty,
}: {
  rows: { key: string; label: ReactNode; value: number; detail?: string }[];
  color?: string;
  /** Shown when there are no rows (default: "Nothing in this period."). */
  empty?: string;
}) {
  const { t } = useI18n();
  const f = useChartFormat();
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty ?? t("charts.empty")}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 text-sm" title={r.detail}>
          <span className="truncate">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 flex-1">
              <span
                className="block h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{ width: `${max ? Math.max(2, (r.value / max) * 100) : 0}%`, background: color }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {f.number(r.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
