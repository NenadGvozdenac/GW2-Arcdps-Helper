import { Router } from "express";
import { authController } from "../controllers/authController";
import { logController } from "../controllers/logController";
import { profileController } from "../controllers/profileController";
import { requireAuth } from "../middleware/requireAuth";

// Express 5 forwards rejected promises from async handlers to the error handler.
export function createRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  router.post("/auth/register", authController.register);
  router.post("/auth/login", authController.login);
  router.get("/auth/me", requireAuth, authController.me);

  router.patch("/profile", requireAuth, profileController.update);

  router.get("/logs", requireAuth, logController.list);
  router.post("/logs", requireAuth, logController.submit);
  router.get("/logs/:id", requireAuth, logController.get);
  router.delete("/logs/:id", requireAuth, logController.remove);

  return router;
}
