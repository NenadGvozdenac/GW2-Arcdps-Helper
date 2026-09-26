import type { Request, Response } from "express";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import { loginSchema, registerSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const authController = {
  async register(req: Request, res: Response) {
    const input = validate(registerSchema, req.body);
    res.status(201).json(await authService.register(input));
  },

  async login(req: Request, res: Response) {
    const { email, password } = validate(loginSchema, req.body);
    res.json(await authService.login(email, password));
  },

  async me(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json({ user: await userService.get(res.locals.userId) });
  },
};
