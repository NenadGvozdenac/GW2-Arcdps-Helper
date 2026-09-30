import type { Cell, Row, Workbook, Worksheet } from "exceljs";
import { BOON_PROVIDER_MIN_GENERATION, BOON_STACK_MAX, BOONS, PROVIDED_BOONS } from "../domain/data/boons";
import type { Boon, LogDetail, PlayerSummary } from "../domain/types/log.types";
import type { Session } from "../domain/types/session.types";
import type { Translate, TranslationKey } from "../i18n/i18n.types";
import { sessionRepository } from "../repositories/sessionRepository";
import { encounterService } from "./encounterService";

type Mode = "nm" | "cm" | "lcm";

/** Every pull of one boss (normal mode and CM counted separately), in the order the session reached it. */
interface BossSummary {
  bossName: string;
  groupName: string;
  mode: Mode;
  /** Oldest first. */
  pulls: LogDetail[];
  /** The first kill, or null. */
  kill: LogDetail | null;
  /** The log shown on the DPS sheet: the kill, else the pull that brought the boss lowest. */
  featured: LogDetail;
}

const COLORS = {
  headerFill: "FFE7E6F0",
  titleKill: "FFD9F2DE",
  titleWipe: "FFF8DCDC",
  topDps: "FFFFE08A",
  link: "FF2563EB",
  scaleLow: "FFF8696B",
  scaleMid: "FFFFEB84",
  scaleHigh: "FF63BE7B",
};

const FMT = {
  int: "#,##0",
  one: "0.0",
  percent: '0.0"%"',
  fight: "[m]:ss",
  span: "[h]:mm:ss",
  dateTime: "yyyy-mm-dd hh:mm",
};

const STACK_BOONS = BOON_STACK_MAX;

const BOON_LABEL: Record<Boon, TranslationKey> = {
  might: "sessionExport.boons.might",
  fury: "sessionExport.boons.fury",
  quickness: "sessionExport.boons.quickness",
  alacrity: "sessionExport.boons.alacrity",
  protection: "sessionExport.boons.protection",
  regeneration: "sessionExport.boons.regeneration",
  vigor: "sessionExport.boons.vigor",
  aegis: "sessionExport.boons.aegis",
  stability: "sessionExport.boons.stability",
  swiftness: "sessionExport.boons.swiftness",
  resistance: "sessionExport.boons.resistance",
  resolution: "sessionExport.boons.resolution",
};

// ---------- Numbers from the logs ----------

const modeOf = (log: LogDetail): Mode => (log.isLegendaryCM ? "lcm" : log.isCM ? "cm" : "nm");
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const avg = (values: number[]) => (values.length ? sum(values) / values.length : null);
const deathsOf = (log: LogDetail) => sum(log.players.map((p) => p.deaths));
const downsOf = (log: LogDetail) => sum(log.players.map((p) => p.downs));
const squadDps = (log: LogDetail) => sum(log.players.map((p) => p.dps));
const byDps = (players: PlayerSummary[]) => [...players].sort((a, b) => b.dps - a.dps);
const topPlayer = (log: LogDetail): PlayerSummary | null => byDps(log.players)[0] ?? null;
/** A wipe without the HP left recorded counts as 100%. */
const hpLeft = (log: LogDetail) => log.bossHealthLeft ?? 100;
/** Logs without Elite Insights data (or whose boons couldn't be read) have no uptimes at all. */
const hasBoonData = (log: LogDetail) => log.players.some((p) => p.boons && Object.keys(p.boons).length > 0);

function summarizeBosses(logs: LogDetail[]): BossSummary[] {
  const byBoss = new Map<string, LogDetail[]>();
  for (const log of logs) {
    const key = `${log.encounterKey ?? log.bossName}|${modeOf(log)}`;
    byBoss.set(key, [...(byBoss.get(key) ?? []), log]);
  }
  return [...byBoss.values()].map((pulls) => {
    const kill = pulls.find((l) => l.success) ?? null;
    // Among wipes: the lowest boss HP, and the later pull on a tie.
    const best = pulls.reduce((a, b) => (hpLeft(b) <= hpLeft(a) ? b : a));
    return {
      bossName: pulls[0].bossName,
      groupName: encounterService.groupById(pulls[0].groupId)?.name ?? "",
      mode: modeOf(pulls[0]),
      pulls,
      kill,
      featured: kill ?? best,
    };
  });
}

// ---------- Excel helpers ----------

/** ExcelJS writes dates as UTC; shift them so Excel shows the player's local time. */
const excelDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
/** Durations as Excel time (fraction of a day), so they sort and add up in Excel. */
const excelDuration = (ms: number) => ms / 86_400_000;

function styleHeader(row: Row) {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerFill } };
    cell.border = { bottom: { style: "thin" } };
  });
}

function fill(row: Row, argb: string, columns: number) {
  for (let c = 1; c <= columns; c++) row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function link(cell: Cell, text: string, url: string) {
  cell.value = { text, hyperlink: url };
  cell.font = { color: { argb: COLORS.link }, underline: true };
}

function colorScale(ws: Worksheet, ref: string, max: number) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      {
        type: "colorScale",
        priority: 1,
        cfvo: [
          { type: "num", value: 0 },
          { type: "num", value: max / 2 },
          { type: "num", value: max },
        ],
        color: [{ argb: COLORS.scaleLow }, { argb: COLORS.scaleMid }, { argb: COLORS.scaleHigh }],
      },
    ],
  });
}

const columnLetter = (n: number): string =>
  n <= 26 ? String.fromCharCode(64 + n) : columnLetter(Math.floor((n - 1) / 26)) + columnLetter(((n - 1) % 26) + 1);

// ---------- Sheets ----------

interface Ctx {
  t: Translate;
  number: Intl.NumberFormat;
  modeLabel: (mode: Mode) => string;
  playerLabel: (p: PlayerSummary) => string;
}

function overviewSheet(wb: Workbook, ctx: Ctx, session: Session, logs: LogDetail[], bosses: BossSummary[]) {
  const { t } = ctx;
  const ws = wb.addWorksheet(t("sessionExport.sheetOverview"));
  ws.columns = [
    { width: 26 },
    { width: 26 },
    { width: 12 },
    { width: 12 },
    { width: 8 },
    { width: 8 },
    { width: 8 },
    { width: 11 },
    { width: 12 },
    { width: 13 },
    { width: 9 },
    { width: 9 },
    { width: 12 },
    { width: 34 },
    { width: 17 },
    { width: 17 },
    { width: 10 },
  ];

  const title = ws.addRow([session.name || t("sessions.unnamed")]);
  title.font = { bold: true, size: 14 };
  ws.addRow([]);

  const start = logs.length ? Math.min(...logs.map((l) => l.encounterTime.getTime())) : null;
  const end = logs.length ? Math.max(...logs.map((l) => l.encounterTime.getTime() + l.durationMs)) : null;
  const info: [TranslationKey, Cell["value"], string?][] = [
    ["sessionExport.start", start != null ? excelDate(new Date(start)) : "", FMT.dateTime],
    ["sessionExport.end", end != null ? excelDate(new Date(end)) : "", FMT.dateTime],
    ["sessions.duration", start != null && end != null ? excelDuration(end - start) : "", FMT.span],
    ["sessionExport.combatTime", excelDuration(sum(logs.map((l) => l.durationMs))), FMT.span],
    ["sessionExport.pulls", logs.length],
    ["sessions.kills", logs.filter((l) => l.success).length],
    ["sessions.wipes", logs.filter((l) => !l.success).length],
    ["sessionExport.bossesKilled", `${bosses.filter((b) => b.kill).length} / ${bosses.length}`],
    ["sessionExport.deaths", sum(logs.map(deathsOf))],
    ["sessionExport.downs", sum(logs.map(downsOf))],
  ];
  for (const [label, value, numFmt] of info) {
    const row = ws.addRow([t(label), value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: "left" };
    if (numFmt) row.getCell(2).numFmt = numFmt;
  }

  ws.addRow([]);
  ws.addRow([t("sessionExport.bossesTitle")]).font = { bold: true, size: 12 };
  const header = ws.addRow([
    t("sessionExport.colBoss"),
    t("sessionExport.colGroup"),
    t("sessionExport.colMode"),
    t("sessionExport.colResult"),
    t("sessionExport.pulls"),
    t("sessions.kills"),
    t("sessions.wipes"),
    t("sessionExport.colKillTime"),
    t("sessionExport.colTimeSpent"),
    t("sessionExport.colBestHp"),
    t("sessionExport.deaths"),
    t("sessionExport.downs"),
    t("sessionExport.colSquadDps"),
    t("sessionExport.colTopDps"),
    t("sessionExport.colFirstPull"),
    t("sessionExport.colKilledAt"),
    t("sessionExport.colLink"),
  ]);
  styleHeader(header);

  for (const b of bosses) {
    const top = topPlayer(b.featured);
    const row = ws.addRow([
      b.bossName,
      b.groupName,
      ctx.modeLabel(b.mode),
      b.kill ? t("sessionExport.killed") : t("sessionExport.notKilled"),
      b.pulls.length,
      b.pulls.filter((l) => l.success).length,
      b.pulls.filter((l) => !l.success).length,
      b.kill ? excelDuration(b.kill.durationMs) : "",
      excelDuration(sum(b.pulls.map((l) => l.durationMs))),
      b.kill ? "" : hpLeft(b.featured),
      sum(b.pulls.map(deathsOf)),
      sum(b.pulls.map(downsOf)),
      squadDps(b.featured) || "",
      top && top.dps ? `${ctx.playerLabel(top)} — ${ctx.number.format(top.dps)}` : "",
      excelDate(b.pulls[0].encounterTime),
      b.kill ? excelDate(b.kill.encounterTime) : "",
      "",
    ]);
    row.getCell(8).numFmt = FMT.fight;
    row.getCell(9).numFmt = FMT.span;
    row.getCell(10).numFmt = FMT.percent;
    row.getCell(13).numFmt = FMT.int;
    row.getCell(15).numFmt = FMT.dateTime;
    row.getCell(16).numFmt = FMT.dateTime;
    link(row.getCell(17), t("sessionExport.openLog"), b.featured.url);
    fill(row, b.kill ? COLORS.titleKill : COLORS.titleWipe, 4);
  }
  ws.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number, column: 17 } };
}

function dpsSheet(wb: Workbook, ctx: Ctx, bosses: BossSummary[]) {
  const { t } = ctx;
  const ws = wb.addWorksheet(t("sessionExport.sheetDps"));
  const fixed = [
    { header: t("sessionExport.colCharacter"), width: 22 },
    { header: t("sessionExport.colAccount"), width: 22 },
    { header: t("sessionExport.colProfession"), width: 14 },
    { header: t("sessionExport.colSubgroup"), width: 9 },
    { header: t("sessionExport.colBossDps"), width: 11 },
    { header: t("sessionExport.colAllDps"), width: 11 },
    { header: t("sessionExport.colBreakbar"), width: 10 },
    { header: t("sessionExport.colDamageTaken"), width: 12 },
    { header: t("sessionExport.downs"), width: 8 },
    { header: t("sessionExport.deaths"), width: 8 },
  ];
  const boonStart = fixed.length + 1;
  const columns = [
    ...fixed,
    ...BOONS.map((b) => ({ header: t(BOON_LABEL[b]), width: 11 })),
    { header: t("sessionExport.colNote"), width: 14 },
  ];
  ws.columns = columns.map((c) => ({ width: c.width }));
  const total = columns.length;

  for (const b of bosses) {
    const log = b.featured;
    const mode = b.mode === "nm" ? "" : ` (${ctx.modeLabel(b.mode)})`;
    const titleText = b.kill
      ? t("sessionExport.blockKill", { boss: b.bossName + mode, time: formatFight(log.durationMs) })
      : t("sessionExport.blockBest", { boss: b.bossName + mode, hp: hpLeft(log) });
    const title = ws.addRow([titleText]);
    ws.mergeCells(title.number, 1, title.number, total);
    title.font = { bold: true, size: 12 };
    fill(title, b.kill ? COLORS.titleKill : COLORS.titleWipe, 1);
    link(ws.getCell(title.number, total + 1), t("sessionExport.openLog"), log.url);

    styleHeader(ws.addRow(columns.map((c) => c.header)));

    const boons = hasBoonData(log);
    const players = byDps(log.players);
    const firstRow = ws.rowCount + 1;
    players.forEach((p, i) => {
      const isTop = i === 0 && p.dps > 0;
      const row = ws.addRow([
        p.name,
        p.account,
        p.profession,
        p.group || "",
        p.dps,
        p.totalDps,
        p.breakbar ?? "",
        p.damageTaken ?? "",
        p.downs,
        p.deaths,
        ...BOONS.map((boon) => (boons ? (p.boons?.[boon] ?? 0) : "")),
        [
          isTop ? t("sessionExport.topDps") : "",
          p.commander ? t("sessionExport.commander") : "",
          ...PROVIDED_BOONS.filter((b) => (p.generation?.[b] ?? 0) >= BOON_PROVIDER_MIN_GENERATION).map((b) =>
            t("logDetail.providesBoon", { boon: t(BOON_LABEL[b]), value: Math.round(p.generation![b]!) }),
          ),
        ]
          .filter(Boolean)
          .join(", "),
      ]);
      formatPlayerRow(row, boonStart);
      if (isTop) {
        fill(row, COLORS.topDps, total);
        row.font = { bold: true };
      }
    });
    const lastRow = ws.rowCount;

    if (players.length) {
      const average = ws.addRow([
        t("sessionExport.squadAverage"),
        "",
        "",
        "",
        avg(players.map((p) => p.dps)),
        avg(players.map((p) => p.totalDps)),
        "",
        "",
        sum(players.map((p) => p.downs)),
        sum(players.map((p) => p.deaths)),
        ...BOONS.map((boon) => (boons ? avg(players.map((p) => p.boons?.[boon] ?? 0)) : "")),
        "",
      ]);
      formatPlayerRow(average, boonStart);
      average.font = { italic: true };
      average.getCell(1).border = { top: { style: "thin" } };
      if (boons) {
        BOONS.forEach((boon, i) => {
          const col = columnLetter(boonStart + i);
          colorScale(ws, `${col}${firstRow}:${col}${lastRow}`, STACK_BOONS.get(boon) ?? 100);
        });
      }
    }
    ws.addRow([]);
  }
}

function formatPlayerRow(row: Row, boonStart: number) {
  [5, 6, 8].forEach((c) => (row.getCell(c).numFmt = FMT.int));
  row.getCell(7).numFmt = FMT.one;
  BOONS.forEach((boon, i) => (row.getCell(boonStart + i).numFmt = STACK_BOONS.has(boon) ? FMT.one : FMT.percent));
}

function playersSheet(wb: Workbook, ctx: Ctx, logs: LogDetail[], bosses: BossSummary[]) {
  const { t } = ctx;
  const ws = wb.addWorksheet(t("sessionExport.sheetPlayers"));
  interface Stats {
    account: string;
    names: Set<string>;
    professions: Set<string>;
    dps: number[];
    top: number;
    downs: number;
    deaths: number;
    boons: Record<Boon, number[]>;
  }
  const stats = new Map<string, Stats>();
  const statsOf = (p: PlayerSummary) => {
    let s = stats.get(p.account);
    if (!s) {
      s = {
        account: p.account,
        names: new Set(),
        professions: new Set(),
        dps: [],
        top: 0,
        downs: 0,
        deaths: 0,
        boons: Object.fromEntries(BOONS.map((b) => [b, []])) as unknown as Record<Boon, number[]>,
      };
      stats.set(p.account, s);
    }
    return s;
  };
  // DPS and boons from the featured log of each boss (the kill), downs and deaths from every pull.
  for (const b of bosses) {
    const top = topPlayer(b.featured);
    const boons = hasBoonData(b.featured);
    for (const p of b.featured.players) {
      const s = statsOf(p);
      s.names.add(p.name);
      if (p.profession) s.professions.add(p.profession);
      s.dps.push(p.dps);
      if (top && top.dps > 0 && top.account === p.account) s.top++;
      if (boons) BOONS.forEach((boon) => s.boons[boon].push(p.boons?.[boon] ?? 0));
    }
  }
  for (const log of logs) {
    for (const p of log.players) {
      const s = statsOf(p);
      s.downs += p.downs;
      s.deaths += p.deaths;
    }
  }

  const shownBoons: Boon[] = ["might", "quickness", "alacrity", "fury"];
  ws.columns = [
    { width: 22 },
    { width: 30 },
    { width: 26 },
    { width: 9 },
    { width: 13 },
    { width: 13 },
    { width: 11 },
    { width: 8 },
    { width: 8 },
    ...shownBoons.map(() => ({ width: 12 })),
  ];
  styleHeader(
    ws.addRow([
      t("sessionExport.colAccount"),
      t("sessionExport.colCharacters"),
      t("sessionExport.colProfessions"),
      t("sessionExport.colBosses"),
      t("sessionExport.colAvgDps"),
      t("sessionExport.colBestDps"),
      t("sessionExport.colTopCount"),
      t("sessionExport.downs"),
      t("sessionExport.deaths"),
      ...shownBoons.map((b) => t("sessionExport.average", { value: t(BOON_LABEL[b]) })),
    ]),
  );
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const rows = [...stats.values()].sort((a, b) => (avg(b.dps) ?? 0) - (avg(a.dps) ?? 0));
  rows.forEach((s, i) => {
    const row = ws.addRow([
      s.account,
      [...s.names].join(", "),
      [...s.professions].join(", "),
      s.dps.length,
      avg(s.dps) ?? "",
      s.dps.length ? Math.max(...s.dps) : "",
      s.top,
      s.downs,
      s.deaths,
      ...shownBoons.map((b) => avg(s.boons[b]) ?? ""),
    ]);
    [5, 6].forEach((c) => (row.getCell(c).numFmt = FMT.int));
    shownBoons.forEach((b, j) => (row.getCell(10 + j).numFmt = STACK_BOONS.has(b) ? FMT.one : FMT.percent));
    if (i === 0 && (avg(s.dps) ?? 0) > 0) {
      fill(row, COLORS.topDps, 9 + shownBoons.length);
      row.font = { bold: true };
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 + shownBoons.length } };
}

function pullsSheet(wb: Workbook, ctx: Ctx, logs: LogDetail[]) {
  const { t } = ctx;
  const ws = wb.addWorksheet(t("sessionExport.sheetPulls"));
  ws.columns = [
    { width: 5 },
    { width: 17 },
    { width: 26 },
    { width: 24 },
    { width: 10 },
    { width: 9 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 34 },
    { width: 8 },
    { width: 8 },
    { width: 20 },
    { width: 10 },
  ];
  styleHeader(
    ws.addRow([
      "#",
      t("sessionExport.colTime"),
      t("sessionExport.colBoss"),
      t("sessionExport.colGroup"),
      t("sessionExport.colMode"),
      t("sessionExport.colResult"),
      t("sessions.duration"),
      t("sessionExport.colHpLeft"),
      t("sessionExport.colSquadDps"),
      t("sessionExport.colTopDps"),
      t("sessionExport.downs"),
      t("sessionExport.deaths"),
      t("sessionExport.colRecordedBy"),
      t("sessionExport.colLink"),
    ]),
  );
  ws.views = [{ state: "frozen", ySplit: 1 }];

  logs.forEach((log, i) => {
    const top = topPlayer(log);
    const row = ws.addRow([
      i + 1,
      excelDate(log.encounterTime),
      log.bossName,
      encounterService.groupById(log.groupId)?.name ?? "",
      ctx.modeLabel(modeOf(log)),
      log.success ? t("common.kill") : t("common.wipe"),
      excelDuration(log.durationMs),
      log.success ? 0 : hpLeft(log),
      squadDps(log) || "",
      top && top.dps ? `${ctx.playerLabel(top)} — ${ctx.number.format(top.dps)}` : "",
      downsOf(log),
      deathsOf(log),
      log.recordedBy ?? "",
      "",
    ]);
    row.getCell(2).numFmt = FMT.dateTime;
    row.getCell(7).numFmt = FMT.fight;
    row.getCell(8).numFmt = FMT.percent;
    row.getCell(9).numFmt = FMT.int;
    fill(row, log.success ? COLORS.titleKill : COLORS.titleWipe, 1);
    link(row.getCell(14), t("sessionExport.openLog"), log.url);
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 14 } };
}

function formatFight(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** "<session name> dd-MM-yyyy.xlsx", dated by the first fight (the player's local day). */
function fileName(session: Session, logs: LogDetail[]): string {
  const d = logs[0]?.encounterTime ?? session.startedAt;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  const name = (session.name || "session").replace(/[\\/:*?"<>|]+/g, "").trim() || "session";
  return `${name} ${day}.xlsx`;
}

function saveFile(data: ArrayBuffer, name: string) {
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const sessionExportService = {
  /**
   * Builds and downloads the session's Excel workbook: overview per boss, DPS & boons of every player per boss,
   * totals per player and every pull.
   */
  async export(session: Session, t: Translate, locale: string) {
    const [logs, mod] = await Promise.all([sessionRepository.logs(session.id), import("exceljs")]);
    // The browser build is a CommonJS bundle: its API arrives as the default export.
    const ExcelJS = mod.default;

    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const ctx: Ctx = {
      t,
      number,
      modeLabel: (mode) =>
        mode === "lcm" ? t("common.lcm") : mode === "cm" ? t("common.cm") : t("sessionExport.normalMode"),
      playerLabel: (p) => (p.account && p.account !== p.name ? `${p.name} (${p.account})` : p.name),
    };
    const bosses = summarizeBosses(logs);

    const wb = new ExcelJS.Workbook();
    wb.creator = "GW2 ArcDPS Helper";
    wb.created = new Date();
    overviewSheet(wb, ctx, session, logs, bosses);
    dpsSheet(wb, ctx, bosses);
    playersSheet(wb, ctx, logs, bosses);
    pullsSheet(wb, ctx, logs);

    saveFile((await wb.xlsx.writeBuffer()) as ArrayBuffer, fileName(session, logs));
  },
};
