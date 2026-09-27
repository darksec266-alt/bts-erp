import type { NextFunction, Request, Response } from "express";
import { sendError } from "../http";

// Phase 0 stub: catches anything unhandled and returns 500 through the
// standard envelope. The full status-code taxonomy (api-spec.md §8 —
// 400/401/403/404/409/422/429) and typed domain error classes land with
// Phase 2 onward, one error type at a time as each module needs it.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  req.log?.error({ err }, "Unhandled error");
  sendError(res, 500, {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, {
    code: "NOT_FOUND",
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
}
