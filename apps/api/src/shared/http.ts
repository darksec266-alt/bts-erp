import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

// Standard response envelope (architecture.md §43, api-spec.md §7):
//   { "data": {...}, "meta": { "requestId": "..." }, "error": null }
// Every endpoint from Phase 2 onward responds through these two helpers so
// the shape never drifts per-module.

export function sendData(res: Response, data: unknown, status = 200): void {
  res.status(status).json({
    data,
    meta: { requestId: res.locals.requestId },
    error: null,
  });
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export function sendError(res: Response, status: number, error: ApiErrorBody): void {
  res.status(status).json({
    data: null,
    meta: { requestId: res.locals.requestId },
    error,
  });
}

// X-Request-Id (architecture.md §38.10): normally generated at the Nginx
// edge and echoed here. In local dev (no Nginx in front, e.g. `npm run dev`
// against apps/api directly) we generate one so the envelope is never
// missing requestId.
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("X-Request-Id");
  const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
