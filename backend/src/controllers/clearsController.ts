import type { Request, Response } from "express";
import { clearsService } from "../services/clearsService";
import type { AuthLocals } from "../types/auth.types";

export const clearsController = {
  async weekly(_req: Request, res: Response<unknown, AuthLocals>) {
    res.json(await clearsService.weekly(res.locals.userId));
  },
};
