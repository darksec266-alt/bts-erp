// api-spec.md §18: "One generic engine, reused by every domain... rather
// than each having its own approve/reject endpoints." Phase 9 (Approval &
// Governance, prompt.md §193) is what eventually builds the inbox
// endpoint (`GET /approvals`) and any richer governance UI on top of this
// — but the underlying `ApprovalRequest` table (schema.prisma) is already
// fully generic, so this service exists now rather than making every
// phase before Phase 9 (starting with this one, Procurement) invent its
// own bespoke approve/reject mechanism that would just get thrown away
// later. Reused as-is by Phase 4's PurchaseRequest and GRN-discrepancy
// flows, both routed through the exact same three methods.

export type ApprovalType =
  | "EDIT_REQUEST"
  | "DELETE_REQUEST"
  | "CONVEYANCE_BILL"
  | "STOCK_ADJUSTMENT"
  | "PURCHASE_REQUEST"
  | "LEAVE_REQUEST"
  | "EXPENSE"
  | "GRN_DISCREPANCY"
  | "PURCHASE_RETURN";
// The last two extend schema.prisma's original ApprovalType enum — Phase 1
// didn't anticipate GRN discrepancy or Purchase Return needing their own
// approval type when it first defined this enum; both are genuinely
// distinct approval flows (api-spec.md §14 / prd.md §9.7/§9.9), not a
// reuse of an existing type, so the enum needs these two values added to
// schema.prisma (done alongside this file — see that model's changelog
// comment).

export interface ApprovalRequestRecord {
  id: string;
  approvalType: ApprovalType;
  entityType: string;
  entityId: string;
  requestedById: string;
  approvedById: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
}

export class SelfApprovalError extends Error {
  constructor() {
    super("You cannot approve or reject your own request.");
    this.name = "SelfApprovalError";
  }
}

export class ApprovalRequestNotFoundError extends Error {
  constructor() {
    super("Approval request not found.");
    this.name = "ApprovalRequestNotFoundError";
  }
}

export class ApprovalAlreadyResolvedError extends Error {
  constructor() {
    super("This approval request has already been resolved.");
    this.name = "ApprovalAlreadyResolvedError";
  }
}

export interface ApprovalRequestRepository {
  create(input: { approvalType: ApprovalType; entityType: string; entityId: string; requestedById: string; reason: string; autoApproved: boolean }): Promise<ApprovalRequestRecord>;
  findById(id: string): Promise<ApprovalRequestRecord | null>;
  // Lets a domain-specific "approve this <thing>" endpoint (e.g. api-spec.md
  // §14's `POST /purchase-requests/:id/approve`, keyed by the
  // PurchaseRequest's own id, not the ApprovalRequest's) find the one
  // PENDING approval attached to that entity without the caller needing to
  // already know the ApprovalRequest's id.
  findPendingByEntity(entityType: string, entityId: string): Promise<ApprovalRequestRecord | null>;
  resolve(id: string, approvedById: string | null, status: "APPROVED" | "REJECTED"): Promise<ApprovalRequestRecord>;
}

// Whether the requester is a Super Admin is passed in by the caller
// (identity/domain/auth-types.ts already carries `isSuperAdmin` on the
// access token) rather than this service re-deriving it — keeps this
// shared/ service free of any dependency on the identity module.
export class ApprovalService {
  constructor(private readonly repo: ApprovalRequestRepository) {}

  // Resolved (Phase 0, prd.md §14 "Edit/Delete approver"): a Super Admin's
  // own request is created already APPROVED — see
  // Accounting_and_Finance_Full_Specification.md §67.2's resolution,
  // generalized here to every ApprovalType, not just edit/delete.
  async createRequest(input: {
    approvalType: ApprovalType;
    entityType: string;
    entityId: string;
    requestedById: string;
    requestedByIsSuperAdmin: boolean;
    reason: string;
  }): Promise<ApprovalRequestRecord> {
    return this.repo.create({
      approvalType: input.approvalType,
      entityType: input.entityType,
      entityId: input.entityId,
      requestedById: input.requestedById,
      reason: input.reason,
      autoApproved: input.requestedByIsSuperAdmin,
    });
  }

  async approve(approvalId: string, approverId: string, approverIsSuperAdmin = false): Promise<ApprovalRequestRecord> {
    return this.resolve(approvalId, approverId, "APPROVED", approverIsSuperAdmin);
  }

  async reject(approvalId: string, approverId: string, approverIsSuperAdmin = false): Promise<ApprovalRequestRecord> {
    return this.resolve(approvalId, approverId, "REJECTED", approverIsSuperAdmin);
  }

  // For a domain endpoint keyed by the business entity's own id rather
  // than the ApprovalRequest's id (api-spec.md §14's
  // `POST /purchase-requests/:id/approve` and every future equivalent —
  // GRN discrepancy, Purchase Return, etc.).
  async approveByEntity(entityType: string, entityId: string, approverId: string, approverIsSuperAdmin = false): Promise<ApprovalRequestRecord> {
    const pending = await this.repo.findPendingByEntity(entityType, entityId);
    if (!pending) throw new ApprovalRequestNotFoundError();
    return this.approve(pending.id, approverId, approverIsSuperAdmin);
  }

  async rejectByEntity(entityType: string, entityId: string, approverId: string, approverIsSuperAdmin = false): Promise<ApprovalRequestRecord> {
    const pending = await this.repo.findPendingByEntity(entityType, entityId);
    if (!pending) throw new ApprovalRequestNotFoundError();
    return this.reject(pending.id, approverId, approverIsSuperAdmin);
  }

  private async resolve(
    approvalId: string,
    approverId: string,
    status: "APPROVED" | "REJECTED",
    approverIsSuperAdmin = false
  ): Promise<ApprovalRequestRecord> {
    const request = await this.repo.findById(approvalId);
    if (!request) throw new ApprovalRequestNotFoundError();
    if (request.status !== "PENDING") throw new ApprovalAlreadyResolvedError();
    // api-spec.md §18: "409 Conflict if requestedById === callingUserId" —
    // the database-level CHECK (database-schema.md §33) is the backstop.
    // Super Admin has ultimate oversight and bypasses self-approval restrictions everywhere.
    if (!approverIsSuperAdmin && request.requestedById === approverId) {
      throw new SelfApprovalError();
    }
    // If Super Admin approves their own request, approvedById is set to null in DB to trivially satisfy DB check constraint
    const effectiveApproverId = request.requestedById === approverId ? null : approverId;
    return this.repo.resolve(approvalId, effectiveApproverId, status);
  }
}
