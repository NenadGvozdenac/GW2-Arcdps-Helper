import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Reused across invocations of a warm serverless instance.
let pool: Pool | undefined;
let db: Database | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.isProduction ? 3 : 10,
      idleTimeoutMillis: 10_000,
    });
    // An idle client can be dropped by the server (restart, serverless DB suspending). Without a listener
    // pg re-throws that as an uncaught error and kills the process; the pool replaces the client on its own.
    pool.on("error", (err) => console.error("Idle database connection lost:", err.message));
  }
  return pool;
}

/** Drizzle ORM instance over the shared connection pool. */
export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
  db = undefined;
}
