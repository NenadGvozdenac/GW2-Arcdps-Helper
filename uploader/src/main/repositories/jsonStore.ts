import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Reads/writes one JSON file in the app's userData folder. Writes are atomic (temp file + rename). */
export function createJsonStore<T>(fileName: string, fallback: () => T) {
  const path = () => join(app.getPath("userData"), fileName);

  return {
    read(): T {
      try {
        if (!existsSync(path())) return fallback();
        return JSON.parse(readFileSync(path(), "utf8")) as T;
      } catch {
        return fallback();
      }
    },

    write(value: T): void {
      const file = path();
      mkdirSync(dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
      renameSync(tmp, file);
    },
  };
}
