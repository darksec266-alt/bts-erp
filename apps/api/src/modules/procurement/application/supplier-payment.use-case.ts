import type { SupplierPaymentRepository, SupplierPaymentRecord, CreateSupplierPaymentInput } from "./supplier-payment-repository.port";
import type { PurchaseInvoiceRepository } from "./purchase-invoice-repository.port";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

export class RecordSupplierPaymentUseCase {
  constructor(
    private readonly supplierPayments: SupplierPaymentRepository,
    private readonly purchaseInvoices: PurchaseInvoiceRepository
  ) {}

  async execute(input: CreateSupplierPaymentInput): Promise<SupplierPaymentRecord> {
    const existing = await this.supplierPayments.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing; // idempotent replay — see this module's repository port comment

    const invoice = await this.purchaseInvoices.findById(input.purchaseInvoiceId);
    if (!invoice) throw new SimpleMasterDataNotFoundError("purchase invoice");

    return this.supplierPayments.create(input);
  }
}
