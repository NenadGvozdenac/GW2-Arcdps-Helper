// Applies the pending drizzle-kit migrations in ./migrations (tracked in drizzle.__drizzle_migrations).
// Usage: `npm run migrate` (dev), `npm run migrate:production`, or `node dist/db/migrate.js` after a build.
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closePool, getDb } from "./pool";

migrate(getDb(), { migrationsFolder: join(__dirname, "migrations") })
  .then(() => console.log("migrations up to date"))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closePool);
