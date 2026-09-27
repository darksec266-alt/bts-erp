// api-spec.md §14: "POST /purchase-invoices." Represents the supplier's
// bill against a PO (optionally linked to the GRN that received the
// goods) — no line items of its own, since the PO already has them; the
// invoice states what the supplier is actually billing, which reconciles
// against — but does not have to exactly equal — the PO's own grandTotal.

export interface PurchaseInvoiceRecord {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  grnId: string | null;
  grandTotal: string;
}

export interface CreatePurchaseInvoiceInput {
  invoiceNumber: string;
  purchaseOrderId: string;
  grnId?: string;
  grandTotal: string;
  idempotencyKey: string;
}

export interface PurchaseInvoiceRepository {
  create(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoiceRecord>;
  findByIdempotencyKey(key: string): Promise<PurchaseInvoiceRecord | null>;
  findById(id: string): Promise<PurchaseInvoiceRecord | null>;
}
