import type { ApprovalRequestRepository, ApprovalRequestRecord, ApprovalType } from "./approval.service";

export interface ApprovalRequestPrismaClient {
  approvalRequest: {
    create(args: {
      data: { approvalType: ApprovalType; entityType: string; entityId: string; requestedById: string; reason: string; status: string; approvedById: string | null; resolvedAt: Date | null };
    }): Promise<ApprovalRequestRow>;
    findUnique(args: { where: { id: string } }): Promise<ApprovalRequestRow | null>;
    findFirst(args: { where: { entityType: string; entityId: string; status: string } }): Promise<ApprovalRequestRow | null>;
    update(args: { where: { id: string }; data: { status: string; approvedById: string | null; resolvedAt: Date } }): Promise<ApprovalRequestRow>;
  };
}

interface ApprovalRequestRow {
  id: string;
  approvalType: ApprovalType;
  entityType: string;
  entityId: string;
  requestedById: string;
  approvedById: string | null;
  status: string;
  reason: string;
}

function toRecord(row: ApprovalRequestRow): ApprovalRequestRecord {
  return { ...row, status: row.status as ApprovalRequestRecord["status"] };
}

export class PrismaApprovalRequestRepository implements ApprovalRequestRepository {
  constructor(private readonly prisma: ApprovalRequestPrismaClient) {}

  async create(input: { approvalType: ApprovalType; entityType: string; entityId: string; requestedById: string; reason: string; autoApproved: boolean }): Promise<ApprovalRequestRecord> {
    // Resolved (Phase 0, prd.md §14): a Super Admin's own request skips
    // the approval gate entirely — created already APPROVED with
    // approvedById left null (see
    // Accounting_and_Finance_Full_Specification.md §67.2 and
    // shared/approval/approval.service.ts's own comment on why NULL, not
    // the Super Admin's own id, is what goes here: it satisfies the
    // no_self_approval CHECK trivially and correctly records that no one
    // else reviewed it).
    const row = await this.prisma.approvalRequest.create({
      data: {
        approvalType: input.approvalType,
        entityType: input.entityType,
        entityId: input.entityId,
        requestedById: input.requestedById,
        reason: input.reason,
        status: input.autoApproved ? "APPROVED" : "PENDING",
        approvedById: null,
        resolvedAt: input.autoApproved ? new Date() : null,
      },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<ApprovalRequestRecord | null> {
    const row = await this.prisma.approvalRequest.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findPendingByEntity(entityType: string, entityId: string): Promise<ApprovalRequestRecord | null> {
    const row = await this.prisma.approvalRequest.findFirst({ where: { entityType, entityId, status: "PENDING" } });
    return row ? toRecord(row) : null;
  }

  async resolve(id: string, approvedById: string | null, status: "APPROVED" | "REJECTED"): Promise<ApprovalRequestRecord> {
    const row = await this.prisma.approvalRequest.update({ where: { id }, data: { status, approvedById, resolvedAt: new Date() } });
    return toRecord(row);
  }
}
