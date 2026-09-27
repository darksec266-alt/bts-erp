import { z } from "zod";

// Phase 0 minimal env schema — just enough for the scaffold to start clean
// (docker compose up). Grows per-phase as each phase introduces new
// required config (e.g. JWT secret in Phase 2, SSLCommerz keys in Phase 7,
// SMS gateway key once selected — see docs/prd.md §14's still-open items).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  // Phase 2 — Identity & RBAC (three separate secrets: architecture.md §22 —
  // an access-token leak must never let someone mint a refresh or MFA token).
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_MFA_SECRET: z.string().min(32, "JWT_MFA_SECRET must be at least 32 characters"),
  JWT_MFA_ENROLLMENT_SECRET: z.string().min(32, "JWT_MFA_ENROLLMENT_SECRET must be at least 32 characters"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("[config] Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration — see printed field errors above.");
  }
  return parsed.data;
}
