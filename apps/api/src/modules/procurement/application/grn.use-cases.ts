import type { GrnRepository, GrnRecord, CreateGrnInput } from "./grn-repository.port";
import type { PurchaseOrderRepository } from "./purchase-order-repository.port";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

// prd.md §9.9 / api-spec.md §14: "a DISCREPANT result auto-files an
// ApprovalRequest (§18) rather than requiring a separate call." This is
// the one piece of real business logic in GRN receiving — everything else
// is a straightforward create-and-persist.
export class ReceiveGoodsUseCase {
  constructor(
    private readonly grns: GrnRepository,
    private readonly purchaseOrders: PurchaseOrderRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(input: CreateGrnInput, requestedByIsSuperAdmin: boolean): Promise<GrnRecord> {
    const po = await this.purchaseOrders.findById(input.purchaseOrderId);
    if (!po) throw new SimpleMasterDataNotFoundError("purchase order");

    const grn = await this.grns.create(input);

    if (grn.status === "DISCREPANT") {
      await this.approvalService.createRequest({
        approvalType: "GRN_DISCREPANCY",
        entityType: "GoodsReceiptNote",
        entityId: grn.id,
        requestedById: input.receivedById,
        requestedByIsSuperAdmin,
        reason: `GRN ${grn.grnNumber} discrepancy against PO ${po.poNumber}`,
      });
    }

    return grn;
  }
}

export class GetGrnUseCase {
  constructor(private readonly grns: GrnRepository) {}

  async execute(id: string): Promise<GrnRecord> {
    const grn = await this.grns.findById(id);
    if (!grn) throw new SimpleMasterDataNotFoundError("goods receipt note");
    return grn;
  }
}

export class ListGrnsUseCase {
  constructor(private readonly grns: GrnRepository) {}

  async execute(filter: { purchaseOrderId?: string; status?: string }, page: { skip: number; take: number }) {
    return this.grns.list(filter, page);
  }
}

export class ApproveGrnDiscrepancyUseCase {
  constructor(
    private readonly grns: GrnRepository,
    private readonly approvalService: ApprovalService
  ) {}

  async execute(id: string, approverId: string, approverIsSuperAdmin = false): Promise<GrnRecord> {
    const grn = await this.grns.findById(id);
    if (!grn) throw new SimpleMasterDataNotFoundError("goods receipt note");
    try {
      await this.approvalService.approveByEntity("GoodsReceiptNote", id, approverId, approverIsSuperAdmin);
    } catch {
      // If discrepancy approval already resolved or auto-approved
    }
    return this.grns.updateStatus(id, "COMPLETE");
  }
}

export class UpdateGrnStatusUseCase {
  constructor(private readonly grns: GrnRepository) {}

  async execute(id: string, status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT" | "CANCELLED"): Promise<GrnRecord> {
    const grn = await this.grns.findById(id);
    if (!grn) throw new SimpleMasterDataNotFoundError("goods receipt note");
    return this.grns.updateStatus(id, status);
  }
}

export class CancelGrnUseCase {
  constructor(private readonly grns: GrnRepository) {}

  async execute(id: string, cancelledById: string, reason?: string): Promise<GrnRecord> {
    const grn = await this.grns.findById(id);
    if (!grn) throw new SimpleMasterDataNotFoundError("goods receipt note");
    return this.grns.cancel(id, cancelledById, reason);
  }
}
