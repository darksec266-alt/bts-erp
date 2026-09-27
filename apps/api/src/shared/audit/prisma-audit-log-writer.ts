import type { AuditLogEntry, AuditLogWriter } from "./audit-log.port";

// Structural, not the generated PrismaClient — same reasoning as every
// other Prisma-touching class in this codebase (prisma generate cannot
// run in this sandbox).
export interface AuditLogPrismaClient {
  auditLog: {
    create(args: {
      data: {
        entityType: string;
        entityId: string;
        action: string;
        actorId: string | null;
        beforeJson?: unknown;
        afterJson?: unknown;
        ipAddress?: string | null;
      };
    }): Promise<unknown>;
  };
}

export class PrismaAuditLogWriter implements AuditLogWriter {
  constructor(private readonly prisma: AuditLogPrismaClient) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: entry.actorId,
        beforeJson: entry.beforeJson,
        afterJson: entry.afterJson,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }
}
