// One-off (TEMPORARY - delete this file and its step in .github/workflows/deploy-backend.yml once it ran in production):
// deletes the empty logs (ArcDPS bug) already saved, by the same rule as isEmptyLog (services/misc/logParser.ts): a wipe
// with the boss still at 100% (boss HP known). The reports stay on dps.report.
// Usage: `node dist/db/deleteEmptyLogs.js` after a build (DATABASE_URL from the environment).
import { sql } from "drizzle-orm";
import { closePool, getDb } from "./pool";

getDb()
  .execute(sql`DELETE FROM logs WHERE NOT success AND boss_health_left IS NOT NULL AND boss_health_left >= 100`)
  .then((res) => console.log(`deleted ${res.rowCount ?? 0} empty log(s)`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closePool);
