import type { NextFunction, Request, Response } from "express";
import type { ErrorResponse } from "../types/error.types";
import { HttpError } from "../utils/httpError";

export function notFoundHandler(_req: Request, res: Response<ErrorResponse>) {
  res.status(404).json({ error: "Route not found.", code: "ROUTE_NOT_FOUND" });
}

export function errorHandler(err: unknown, _req: Request, res: Response<ErrorResponse>, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body.", code: "INVALID_JSON" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error.", code: "INTERNAL_ERROR" });
}
