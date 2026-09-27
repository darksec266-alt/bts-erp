import type { PurchaseOrderRepository, PurchaseOrderRecord, CreatePurchaseOrderInput, PurchaseOrderLineInput } from "./purchase-order-repository.port";
import type { PurchaseRequestRepository } from "./purchase-request-repository.port";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

export class PurchaseRequestNotApprovedError extends Error {
  constructor() {
    super("Cannot create a Purchase Order from a Purchase Requisition that is not yet APPROVED.");
    this.name = "PurchaseRequestNotApprovedError";
  }
}

export class PurchaseRequestAlreadyOrderedError extends Error {
  constructor(poNumber?: string) {
    super(
      poNumber
        ? `Purchase Requisition has already been fulfilled by Purchase Order ${poNumber}.`
        : "Purchase Requisition has already been converted to a Purchase Order."
    );
    this.name = "PurchaseRequestAlreadyOrderedError";
  }
}

// The router accepts lines without a pre-computed lineTotal — callers
// supply quantity/unitPrice, this use case computes lineTotal/grandTotal
// itself (prompt.md §134's Use Case Rule: that arithmetic belongs at the
// Application layer, not left to the repository or, worse, trusted
// verbatim from client input).
export type PurchaseOrderLineRequest = Omit<PurchaseOrderLineInput, "lineTotal">;

export interface CreatePurchaseOrderRequest {
  poNumber: string;
  purchaseRequestId?: string;
  supplierId: string;
  branchId: string;
  lines: PurchaseOrderLineRequest[];
}

// prd.md §8.7 / api-spec.md §14: "from an approved PR or standalone." A PO
// always carries its own lines with real unit pricing — a
// PurchaseRequestLine only ever records what's needed, never a negotiated
// price, so linking a PR is for traceability, not for skipping the line
// input. When `purchaseRequestId` is supplied, this use case's one real
// business rule is enforcing that the linked PR is actually APPROVED —
// a PENDING or REJECTED requisition can never become a PO.
export class CreatePurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrders: PurchaseOrderRepository,
    private readonly purchaseRequests: PurchaseRequestRepository
  ) {}

  async execute(input: CreatePurchaseOrderRequest): Promise<PurchaseOrderRecord> {
    if (input.purchaseRequestId) {
      const pr = await this.purchaseRequests.findById(input.purchaseRequestId);
      if (!pr) throw new SimpleMasterDataNotFoundError("purchase requisition");
      if (pr.status !== "APPROVED") throw new PurchaseRequestNotApprovedError();
      if (pr.purchaseOrder) throw new PurchaseRequestAlreadyOrderedError(pr.purchaseOrder.poNumber);
    }

    const lines: PurchaseOrderLineInput[] = input.lines.map((l) => ({
      ...l,
      lineTotal: (Number(l.quantity) * Number(l.unitPrice)).toFixed(2),
    }));
    const grandTotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0).toFixed(2);

    const createInput: CreatePurchaseOrderInput = { ...input, grandTotal, lines };
    return this.purchaseOrders.create(createInput);
  }
}

export class GetPurchaseOrderUseCase {
  constructor(private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(id: string): Promise<PurchaseOrderRecord> {
    const po = await this.purchaseOrders.findById(id);
    if (!po) throw new SimpleMasterDataNotFoundError("purchase order");
    return po;
  }
}

export class ListPurchaseOrdersUseCase {
  constructor(private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(filter: { branchId?: string; supplierId?: string; status?: string; search?: string }, page: { skip: number; take: number }) {
    return this.purchaseOrders.list(filter, page);
  }
}

export class CancelPurchaseOrderUseCase {
  constructor(private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(id: string, cancelledById: string, reason?: string): Promise<PurchaseOrderRecord> {
    const po = await this.purchaseOrders.findById(id);
    if (!po) throw new SimpleMasterDataNotFoundError("purchase order");
    if (!this.purchaseOrders.cancel) {
      throw new Error("Cancellation is not supported by the purchase order repository.");
    }
    return this.purchaseOrders.cancel(id, cancelledById, reason);
  }
}

