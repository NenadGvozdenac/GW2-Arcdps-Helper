// One-off (TEMPORARY - delete this file and its step in .github/workflows/deploy-backend.yml once it ran in production):
// deletes the empty logs (ArcDPS bug) saved before "Skip empty logs" existed. That setting is on for everyone by default,
// and with it on such logs are no longer saved. Same rule as isEmptyLog (services/misc/logParser.ts): a wipe, boss HP
// known and still at 100%, and no player with any DPS on the boss. The reports stay on dps.report.
// Usage: `node dist/db/deleteEmptyLogs.js` after a build (DATABASE_URL from the environment).
import { sql } from "drizzle-orm";
import { closePool, getDb } from "./pool";

getDb()
  .execute(
    sql`DELETE FROM logs
        WHERE NOT success
          AND boss_health_left IS NOT NULL
          AND boss_health_left >= 100
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(players) AS p
            WHERE coalesce((p->>'dps')::numeric, 0) <> 0
          )`,
  )
  .then((res) => console.log(`deleted ${res.rowCount ?? 0} empty log(s)`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closePool);
