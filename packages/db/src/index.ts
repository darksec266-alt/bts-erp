// Re-exports the generated Prisma client for use across apps/api's
// Infrastructure-layer repositories (prompt.md §132-133). No repositories
// live here yet — this package is schema + generated client only; the
// Repository pattern itself belongs in apps/api/src/modules/<context>/infrastructure.

export { PrismaClient, Prisma } from "@prisma/client";
export type * from "@prisma/client";
