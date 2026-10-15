import type { Request, Response } from "express";
import { raidService } from "../services/raidService";
import { raidWeekliesSchema } from "../validation/schemas";
import { validate } from "../validation/validate";

export const raidController = {
  /** GET /raids/weeklies?weeks=6 — which wings have Emboldened and Call of the Mists this week and the next ones. */
  weeklies(req: Request, res: Response) {
    const { weeks } = validate(raidWeekliesSchema, req.query);
    res.json(raidService.weeklies(weeks));
  },
};
