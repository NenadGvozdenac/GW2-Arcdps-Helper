import { app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Appends to <userData>/logs/uploader-YYYY-MM-DD.log and mirrors to the console. */
function write(level: "info" | "warn" | "error", message: string, extra?: unknown) {
  const now = new Date();
  const line = `[${now.toISOString()}] ${level.toUpperCase()} ${message}${extra !== undefined ? ` ${formatExtra(extra)}` : ""}`;
  console[level](line);
  try {
    const dir = join(app.getPath("userData"), "logs");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, `uploader-${now.toISOString().slice(0, 10)}.log`), `${line}\n`);
  } catch {
    /* logging must never crash the app */
  }
}

function formatExtra(extra: unknown): string {
  if (extra instanceof Error) return extra.message;
  try {
    return JSON.stringify(extra);
  } catch {
    return String(extra);
  }
}

export const logger = {
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
};
