import { Router } from "express";
import { authController } from "../controllers/authController";
import { clearsController } from "../controllers/clearsController";
import { logController } from "../controllers/logController";
import { profileController } from "../controllers/profileController";
import { sessionController } from "../controllers/sessionController";
import { logFileUpload } from "../middleware/logFileUpload";
import { requireAuth } from "../middleware/requireAuth";

// Express 5 forwards rejected promises from async handlers to the error handler.
export function createRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/auth/register", authController.register);
  router.post("/auth/login", authController.login);
  router.post("/auth/verify-email", authController.verifyEmail);
  router.post("/auth/resend-verification", authController.resendVerification);
  router.post("/auth/forgot-password", authController.forgotPassword);
  router.post("/auth/reset-password", authController.resetPassword);
  router.get("/auth/me", requireAuth, authController.me);

  // Raid and strike bosses killed since the weekly reset (desktop uploader and Nexus addon).
  router.get("/clears/weekly", requireAuth, clearsController.weekly);

  router.patch("/profile", requireAuth, profileController.update);
  router.put("/profile/discord-webhook", requireAuth, profileController.setDiscordWebhook);
  router.post("/profile/discord-webhook/test", requireAuth, profileController.testDiscordWebhook);
  router.put("/profile/dps-report-token", requireAuth, profileController.setDpsReportToken);

  router.get("/logs", requireAuth, logController.list);
  router.get("/logs/search", requireAuth, logController.search);
  router.post("/logs", requireAuth, logController.submit);
  router.post("/logs/upload", requireAuth, logFileUpload, logController.upload);
  router.post("/logs/bulk-delete", requireAuth, logController.removeMany);
  router.get("/logs/:id", requireAuth, logController.get);
  router.delete("/logs/:id", requireAuth, logController.remove);
  router.post("/logs/:id/share", requireAuth, logController.share);
  router.delete("/logs/:id/share", requireAuth, logController.unshare);
  // Public: anyone with the link can view a shared log.
  router.get("/shared/logs/:token", logController.shared);

  router.get("/sessions", requireAuth, sessionController.list);
  router.post("/sessions", requireAuth, sessionController.start);
  router.get("/sessions/page", requireAuth, sessionController.page);
  router.get("/sessions/active", requireAuth, sessionController.active);
  router.post("/sessions/bulk-delete", requireAuth, sessionController.removeMany);
  router.get("/sessions/:id/logs", requireAuth, sessionController.logs);
  router.patch("/sessions/:id", requireAuth, sessionController.update);
  router.post("/sessions/:id/end", requireAuth, sessionController.end);
  router.post("/sessions/:id/move", requireAuth, sessionController.move);
  router.post("/sessions/:id/resume", requireAuth, sessionController.resume);
  router.post("/sessions/:id/share", requireAuth, sessionController.share);
  router.delete("/sessions/:id/share", requireAuth, sessionController.unshare);
  // Public: anyone with the link can view a shared session.
  router.get("/shared/sessions/:token", sessionController.shared);
  router.delete("/sessions/:id", requireAuth, sessionController.remove);

  return router;
}
