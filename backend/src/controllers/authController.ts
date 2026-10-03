import type { Request, Response } from "express";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validation/schemas";
import { validate } from "../validation/validate";
import { clientIpHash } from "../utils/clientIp";

export const authController = {
  async register(req: Request, res: Response) {
    const input = validate(registerSchema, req.body);
    res.status(201).json(await authService.register(input));
  },

  async login(req: Request, res: Response) {
    const { email, password } = validate(loginSchema, req.body);
    res.json(await authService.login(email, password, clientIpHash(req)));
  },

  async verifyEmail(req: Request, res: Response) {
    const { token } = validate(verifyEmailSchema, req.body);
    res.json(await authService.verifyEmail(token));
  },

  async resendVerification(req: Request, res: Response) {
    const { email, language } = validate(resendVerificationSchema, req.body);
    await authService.resendVerification(email, language);
    res.status(204).end();
  },

  async forgotPassword(req: Request, res: Response) {
    const { email, language } = validate(resendVerificationSchema, req.body);
    await authService.forgotPassword(email, language);
    res.status(204).end();
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = validate(resetPasswordSchema, req.body);
    res.json(await authService.resetPassword(token, password));
  },

  async me(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ user: await userService.get(res.locals.userId) });
  },
};
