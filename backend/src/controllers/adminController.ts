import type { Request, Response } from "express";
import { adminAuthService } from "../services/adminAuthService";
import { adminService } from "../services/adminService";
import { clientIpHash } from "../utils/clientIp";
import {
  adminBlockIpSchema,
  adminBlockUserSchema,
  adminIdsSchema,
  adminIpParamSchema,
  adminListSchema,
  adminLogSessionSchema,
  adminLoginSchema,
  adminRateLimitEventsSchema,
  adminSharedSchema,
  adminVerifySchema,
  adminWebhookPatchSchema,
  idParamSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";

/** One admin list page: `{ rows, total, page, pageSize }`. */
function listQuery(req: Request) {
  const { page, pageSize, ...filter } = validate(adminListSchema, req.query);
  return { filter, page, pageSize };
}

/** The administrator's API (/api/admin/*). Everything but `login` sits behind requireAdmin. */
export const adminController = {
  /** POST /admin/auth/login `{ email, password }` -> `{ challenge }` (step 1) */
  async login(req: Request, res: Response) {
    const { email, password } = validate(adminLoginSchema, req.body);
    res.json(await adminAuthService.login(email, password, clientIpHash(req)));
  },

  /** POST /admin/auth/verify `{ challenge, code }` -> `{ token }` (step 2) */
  async verify(req: Request, res: Response) {
    const { challenge, code } = validate(adminVerifySchema, req.body);
    res.json(await adminAuthService.verify(challenge, code, clientIpHash(req)));
  },

  me(_req: Request, res: Response) {
    res.json(adminAuthService.me());
  },

  async overview(_req: Request, res: Response) {
    res.json(await adminService.overview());
  },

  // ---------- users

  async users(req: Request, res: Response) {
    const { filter, page, pageSize } = listQuery(req);
    res.json({ ...(await adminService.users(filter, page, pageSize)), page, pageSize });
  },

  async user(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    res.json({ user: await adminService.user(id) });
  },

  async blockUser(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const { reason } = validate(adminBlockUserSchema, req.body ?? {});
    await adminService.blockUser(id, reason);
    res.status(204).end();
  },

  async unblockUser(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    await adminService.unblockUser(id);
    res.status(204).end();
  },

  async signOutUser(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    await adminService.signOutUser(id);
    res.status(204).end();
  },

  async deleteUser(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    await adminService.deleteUser(id);
    res.status(204).end();
  },

  // ---------- logs

  async logs(req: Request, res: Response) {
    const { filter, page, pageSize } = listQuery(req);
    res.json({ ...(await adminService.logs(filter, page, pageSize)), page, pageSize });
  },

  async deleteLogs(req: Request, res: Response) {
    const { ids } = validate(adminIdsSchema, req.body);
    res.json({ deleted: await adminService.deleteLogs(ids) });
  },

  async setLogShared(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const { shared } = validate(adminSharedSchema, req.body);
    await adminService.setLogShared(id, shared);
    res.status(204).end();
  },

  async setLogSession(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const { sessionId } = validate(adminLogSessionSchema, req.body);
    await adminService.setLogSession(id, sessionId);
    res.status(204).end();
  },

  // ---------- sessions

  async sessions(req: Request, res: Response) {
    const { filter, page, pageSize } = listQuery(req);
    res.json({ ...(await adminService.sessions(filter, page, pageSize)), page, pageSize });
  },

  async deleteSessions(req: Request, res: Response) {
    const { ids } = validate(adminIdsSchema, req.body);
    res.json({ deleted: await adminService.deleteSessions(ids) });
  },

  async setSessionShared(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const { shared } = validate(adminSharedSchema, req.body);
    await adminService.setSessionShared(id, shared);
    res.status(204).end();
  },

  // ---------- Discord webhooks

  async webhooks(req: Request, res: Response) {
    const { filter, page, pageSize } = listQuery(req);
    res.json({ ...(await adminService.webhooks(filter, page, pageSize)), page, pageSize });
  },

  async updateWebhook(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    const patch = validate(adminWebhookPatchSchema, req.body);
    await adminService.updateWebhook(id, patch);
    res.status(204).end();
  },

  async deleteWebhook(req: Request, res: Response) {
    const { id } = validate(idParamSchema, req.params);
    await adminService.deleteWebhook(id);
    res.status(204).end();
  },

  // ---------- blocked addresses

  async blockedIps(_req: Request, res: Response) {
    res.json({ ips: await adminService.blockedIps() });
  },

  async blockIp(req: Request, res: Response) {
    const { ipHash, note } = validate(adminBlockIpSchema, req.body);
    await adminService.blockIp(ipHash, note);
    res.status(204).end();
  },

  async unblockIp(req: Request, res: Response) {
    const { ipHash } = validate(adminIpParamSchema, req.params);
    await adminService.unblockIp(ipHash);
    res.status(204).end();
  },

  // ---------- rate limits

  async rateLimits(_req: Request, res: Response) {
    res.json(await adminService.rateLimits());
  },

  async rateLimitEvents(req: Request, res: Response) {
    const { kind, page, pageSize } = validate(adminRateLimitEventsSchema, req.query);
    res.json({ ...(await adminService.rateLimitEvents(kind ?? null, page, pageSize)), page, pageSize });
  },
};
