import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { blockedIpGuard } from "./middleware/blockedIpGuard";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { createRouter } from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // JSON only: nothing here may be rendered as a page or framed.
  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
    });
    next();
  });
  // Sign-in is a Bearer token, never a cookie, so other sites can't make requests as the user (no CSRF); CORS
  // additionally keeps other websites from reading responses. In production only the website itself is allowed
  // (CORS_ORIGIN, else APP_URL); the desktop uploader and the Nexus addon aren't browsers, so CORS doesn't apply.
  const origins = env.corsOrigins.length ? env.corsOrigins : env.isProduction ? [env.appUrl] : true;
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", blockedIpGuard, createRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Default export is what Vercel's zero-config Express support deploys as a serverless function.
// server.ts reuses it for Docker / local development.
const app = createApp();
export default app;
