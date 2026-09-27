import pino from "pino";

// Structured logging (architecture.md §52). Every log line correlates to a
// requestId via pino-http (app.ts) so a single request's story can be
// reconstructed across the modular monolith — the same correlation the
// Nginx-generated X-Request-Id (architecture_nginx.md) carries end to end.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
