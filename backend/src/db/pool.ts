import { Pool } from "pg";
import { env } from "../config/env";

// Reused across invocations of a warm serverless instance.
let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: env.isProduction ? 3 : 10,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
