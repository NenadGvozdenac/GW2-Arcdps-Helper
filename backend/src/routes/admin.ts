import { Router } from "express";
import { adminController as admin } from "../controllers/adminController";
import { requireAdmin } from "../middleware/requireAdmin";

/** /api/admin/* - the administrator's area. Only the two sign-in steps are reachable without the admin token. */
export function createAdminRouter(): Router {
  const router = Router();

  router.post("/auth/login", admin.login);
  router.post("/auth/verify", admin.verify);
  router.use(requireAdmin);

  router.get("/auth/me", admin.me);
  router.get("/overview", admin.overview);
  router.get("/stats", admin.stats);

  router.get("/users", admin.users);
  router.get("/users/:id", admin.user);
  router.post("/users/:id/block", admin.blockUser);
  router.post("/users/:id/unblock", admin.unblockUser);
  router.post("/users/:id/sign-out", admin.signOutUser);
  router.delete("/users/:id", admin.deleteUser);

  router.get("/logs", admin.logs);
  router.post("/logs/delete", admin.deleteLogs);
  router.put("/logs/:id/shared", admin.setLogShared);
  router.put("/logs/:id/session", admin.setLogSession);

  router.get("/sessions", admin.sessions);
  router.post("/sessions/delete", admin.deleteSessions);
  router.put("/sessions/:id/shared", admin.setSessionShared);

  router.get("/webhooks", admin.webhooks);
  router.patch("/webhooks/:id", admin.updateWebhook);
  router.delete("/webhooks/:id", admin.deleteWebhook);

  router.get("/blocked-ips", admin.blockedIps);
  router.post("/blocked-ips", admin.blockIp);
  router.delete("/blocked-ips/:ipHash", admin.unblockIp);

  router.get("/rate-limits", admin.rateLimits);
  router.get("/rate-limits/events", admin.rateLimitEvents);

  return router;
}
