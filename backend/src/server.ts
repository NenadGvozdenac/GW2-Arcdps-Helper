// Long-running Node server for Docker / local development. On Vercel, app.ts's default export is used instead.
import app from "./app";
import { env } from "./config/env";
import { closePool } from "./db/pool";

const server = app.listen(env.port, () => {
  console.log(`GW2 ArcDPS Helper API listening on http://localhost:${env.port}/api`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => closePool().finally(() => process.exit(0)));
  });
}
