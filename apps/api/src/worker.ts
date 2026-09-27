import { loadEnv } from "@bts/config";
import { logger } from "./shared/logger";

// Phase 0 placeholder. Real BullMQ queue consumers (architecture.md §46)
// register here starting Phase 15 (Notifications & Realtime, prompt.md
// §199) — this process shares apps/api's modules/domain code rather than
// being a separate app, so a queue handler can reuse the same
// Application-layer use cases the HTTP router calls (prompt.md §133).
const env = loadEnv();

logger.info(`[worker] started (env=${env.NODE_ENV}) — no queues registered yet, Phase 0 placeholder`);

// Keep the process alive; replace with actual BullMQ Worker instances
// (one per queue) once Phase 15 defines them.
setInterval(() => {
  logger.debug("[worker] heartbeat — idle, no queues yet");
}, 60_000);

function shutdown(signal: string): void {
  logger.info(`[worker] received ${signal}, shutting down`);
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
