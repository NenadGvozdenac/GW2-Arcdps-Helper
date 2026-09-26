import type { Request, Response } from "express";
import { userService } from "../services/userService";
import type { AuthLocals } from "../types/auth.types";
import { profileUpdateSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const profileController = {
  async update(req: Request, res: Response<unknown, AuthLocals>) {
    const patch = validate(profileUpdateSchema, req.body);
    res.json({ user: await userService.updateProfile(res.locals.userId, patch) });
  },
};
