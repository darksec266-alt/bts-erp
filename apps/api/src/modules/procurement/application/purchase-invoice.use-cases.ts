import type { PurchaseInvoiceRepository, PurchaseInvoiceRecord, CreatePurchaseInvoiceInput } from "./purchase-invoice-repository.port";
import type { PurchaseOrderRepository } from "./purchase-order-repository.port";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

// api-spec.md §7: an Idempotency-Key on a financial write means a retried
// request (e.g. a network timeout the client resent) returns the SAME
// invoice it already created, not a second one and not an error — true
// idempotent replay, not just duplicate prevention.
export class CreatePurchaseInvoiceUseCase {
  constructor(
    private readonly purchaseInvoices: PurchaseInvoiceRepository,
    private readonly purchaseOrders: PurchaseOrderRepository
  ) {}

  async execute(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoiceRecord> {
    const existing = await this.purchaseInvoices.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const po = await this.purchaseOrders.findById(input.purchaseOrderId);
    if (!po) throw new SimpleMasterDataNotFoundError("purchase order");

    return this.purchaseInvoices.create(input);
  }
}

export class GetPurchaseInvoiceUseCase {
  constructor(private readonly purchaseInvoices: PurchaseInvoiceRepository) {}

  async execute(id: string): Promise<PurchaseInvoiceRecord> {
    const invoice = await this.purchaseInvoices.findById(id);
    if (!invoice) throw new SimpleMasterDataNotFoundError("purchase invoice");
    return invoice;
  }
}
