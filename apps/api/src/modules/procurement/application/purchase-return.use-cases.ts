import type { PurchaseReturnRepository, PurchaseReturnRecord, CreatePurchaseReturnInput } from "./purchase-return-repository.port";
import type { GrnRepository } from "./grn-repository.port";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

// prd.md §9.7: creating a Purchase Return immediately files a
// PURCHASE_RETURN ApprovalRequest — same create-then-file pattern as
// CreatePurchaseRequestUseCase, reusing the same shared ApprovalService.
export class CreatePurchaseReturnUseCase {
  constructor(
    private readonly purchaseReturns: PurchaseReturnRepository,
    private readonly grns: GrnRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(input: CreatePurchaseReturnInput, requestedByIsSuperAdmin: boolean): Promise<PurchaseReturnRecord> {
    const grn = await this.grns.findById(input.grnId);
    if (!grn) throw new SimpleMasterDataNotFoundError("goods receipt note");

    const purchaseReturn = await this.purchaseReturns.create(input);
    const approval = await this.approvalService.createRequest({
      approvalType: "PURCHASE_RETURN",
      entityType: "PurchaseReturn",
      entityId: purchaseReturn.id,
      requestedById: input.createdById,
      requestedByIsSuperAdmin,
      reason: input.reason,
    });

    if (approval.status === "APPROVED") {
      await this.purchaseReturns.updateStatus(purchaseReturn.id, "APPROVED");
      return { ...purchaseReturn, approvalStatus: "APPROVED" };
    }
    return purchaseReturn;
  }
}

export class GetPurchaseReturnUseCase {
  constructor(private readonly purchaseReturns: PurchaseReturnRepository) {}

  async execute(id: string): Promise<PurchaseReturnRecord> {
    const purchaseReturn = await this.purchaseReturns.findById(id);
    if (!purchaseReturn) throw new SimpleMasterDataNotFoundError("purchase return");
    return purchaseReturn;
  }
}

export class ApprovePurchaseReturnUseCase {
  constructor(
    private readonly purchaseReturns: PurchaseReturnRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(purchaseReturnId: string, approverId: string, approverIsSuperAdmin = false): Promise<void> {
    const existing = await this.purchaseReturns.findById(purchaseReturnId);
    if (!existing) throw new SimpleMasterDataNotFoundError("purchase return");
    await this.approvalService.approveByEntity("PurchaseReturn", purchaseReturnId, approverId, approverIsSuperAdmin);
    await this.purchaseReturns.updateStatus(purchaseReturnId, "APPROVED");
  }
}

export class RejectPurchaseReturnUseCase {
  constructor(
    private readonly purchaseReturns: PurchaseReturnRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(purchaseReturnId: string, approverId: string, approverIsSuperAdmin = false): Promise<void> {
    const existing = await this.purchaseReturns.findById(purchaseReturnId);
    if (!existing) throw new SimpleMasterDataNotFoundError("purchase return");
    await this.approvalService.rejectByEntity("PurchaseReturn", purchaseReturnId, approverId, approverIsSuperAdmin);
    await this.purchaseReturns.updateStatus(purchaseReturnId, "REJECTED");
  }
}
