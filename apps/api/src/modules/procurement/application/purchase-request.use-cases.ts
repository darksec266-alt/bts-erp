import type { PurchaseRequestRepository, PurchaseRequestRecord, CreatePurchaseRequestInput } from "./purchase-request-repository.port";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

export class CreatePurchaseRequestUseCase {
  constructor(
    private readonly purchaseRequests: PurchaseRequestRepository,
    private readonly approvalService: ApprovalService
  ) {}

  // prd.md §8.6: creating a requisition immediately files the ApprovalRequest
  // that routes it for approval — a PurchaseRequest never sits without one.
  // When created by Super Admin, it is immediately created as APPROVED (no approval required).
  async execute(input: CreatePurchaseRequestInput, requestedByIsSuperAdmin: boolean): Promise<PurchaseRequestRecord> {
    const initialStatus = requestedByIsSuperAdmin ? "APPROVED" : "PENDING";
    const request = await this.purchaseRequests.create({
      ...input,
      status: initialStatus,
    });
    const approval = await this.approvalService.createRequest({
      approvalType: "PURCHASE_REQUEST",
      entityType: "PurchaseRequest",
      entityId: request.id,
      requestedById: input.requestedById,
      requestedByIsSuperAdmin,
      reason: `Purchase requisition ${request.requestNumber}`,
    });
    // A Super Admin's own requisition is auto-approved (ApprovalService's
    // own resolved rule) — reflect that immediately on the PurchaseRequest
    // itself rather than leaving it shown as PENDING when the approval
    // record says otherwise.
    if (approval.status === "APPROVED" && request.status !== "APPROVED") {
      await this.purchaseRequests.updateStatus(request.id, "APPROVED");
      return { ...request, status: "APPROVED" };
    }
    return { ...request, status: initialStatus };
  }
}

export class GetPurchaseRequestUseCase {
  constructor(private readonly purchaseRequests: PurchaseRequestRepository) {}

  async execute(id: string): Promise<PurchaseRequestRecord> {
    const request = await this.purchaseRequests.findById(id);
    if (!request) throw new SimpleMasterDataNotFoundError("purchase requisition");
    return request;
  }
}

export class ListPurchaseRequestsUseCase {
  constructor(private readonly purchaseRequests: PurchaseRequestRepository) {}

  async execute(filter: { branchId?: string; status?: string }, page: { skip: number; take: number }) {
    return this.purchaseRequests.list(filter, page);
  }
}

// api-spec.md §14: "the last one delegates to §18's Approval API rather
// than being a bespoke approval action." This use case is that delegation
// point — it resolves the ApprovalRequest via the shared service, then
// mirrors the outcome onto PurchaseRequest.status so the requisition's own
// record and its approval trail can never drift apart.
export class ApprovePurchaseRequestUseCase {
  constructor(
    private readonly purchaseRequests: PurchaseRequestRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(purchaseRequestId: string, approverId: string, approverIsSuperAdmin = false): Promise<void> {
    const request = await this.purchaseRequests.findById(purchaseRequestId);
    if (!request) throw new SimpleMasterDataNotFoundError("purchase requisition");
    await this.approvalService.approveByEntity("PurchaseRequest", purchaseRequestId, approverId, approverIsSuperAdmin);
    await this.purchaseRequests.updateStatus(purchaseRequestId, "APPROVED");
  }
}

export class RejectPurchaseRequestUseCase {
  constructor(
    private readonly purchaseRequests: PurchaseRequestRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(purchaseRequestId: string, approverId: string, approverIsSuperAdmin = false): Promise<void> {
    const request = await this.purchaseRequests.findById(purchaseRequestId);
    if (!request) throw new SimpleMasterDataNotFoundError("purchase requisition");
    await this.approvalService.rejectByEntity("PurchaseRequest", purchaseRequestId, approverId, approverIsSuperAdmin);
    await this.purchaseRequests.updateStatus(purchaseRequestId, "REJECTED");
  }
}

export class CancelPurchaseRequestUseCase {
  constructor(private readonly purchaseRequests: PurchaseRequestRepository) {}

  async execute(purchaseRequestId: string, cancelledById: string): Promise<PurchaseRequestRecord> {
    const request = await this.purchaseRequests.findById(purchaseRequestId);
    if (!request) throw new SimpleMasterDataNotFoundError("purchase requisition");
    if (!this.purchaseRequests.cancel) {
      throw new Error("Cancellation is not supported by the purchase request repository.");
    }
    return this.purchaseRequests.cancel(purchaseRequestId, cancelledById);
  }
}

