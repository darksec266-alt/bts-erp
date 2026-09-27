// api-spec.md §14: "POST /purchase-invoices/:id/payments — the payment
// endpoint requires Idempotency-Key (§7) since it's a financial write."
// Same idempotent-replay semantics as CreatePurchaseInvoiceUseCase.

export interface SupplierPaymentRecord {
  id: string;
  purchaseInvoiceId: string;
  amount: string;
  method: string;
}

export interface CreateSupplierPaymentInput {
  purchaseInvoiceId: string;
  amount: string;
  method: string;
  idempotencyKey: string;
}

export interface SupplierPaymentRepository {
  create(input: CreateSupplierPaymentInput): Promise<SupplierPaymentRecord>;
  findByIdempotencyKey(key: string): Promise<SupplierPaymentRecord | null>;
}
