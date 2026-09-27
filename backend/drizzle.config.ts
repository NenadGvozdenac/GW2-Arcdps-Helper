import { defineConfig } from "drizzle-kit";

// Used by `npm run migration:new` (drizzle-kit generate). Migrations are applied by src/db/migrate.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
});
