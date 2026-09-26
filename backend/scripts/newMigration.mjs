// Creates the next numbered SQL migration: node scripts/newMigration.mjs add_some_column
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "db", "migrations");
const name = (process.argv[2] ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

if (!name) {
  console.error("Usage: npm run migration:new -- <name>   (e.g. add_notes_to_logs)");
  process.exit(1);
}

const numbers = readdirSync(dir)
  .map((f) => /^(\d+)_.*\.sql$/.exec(f)?.[1])
  .filter(Boolean)
  .map(Number);
const next = String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, "0");
const file = join(dir, `${next}_${name}.sql`);

writeFileSync(file, `-- ${next}_${name}\n-- Runs once, inside a transaction. Write forward-only SQL.\n\n`, { flag: "wx" });
console.log(`created ${file}`);
