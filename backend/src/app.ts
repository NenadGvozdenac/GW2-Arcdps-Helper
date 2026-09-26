import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { createRouter } from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : true }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", createRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Default export is what Vercel's zero-config Express support deploys as a serverless function.
// server.ts reuses it for Docker / local development.
const app = createApp();
export default app;
