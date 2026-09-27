// prd.md §9.9 / api-spec.md §14: "records a GoodsReceiptNote... a
// DISCREPANT result auto-files an ApprovalRequest rather than requiring a
// separate call." The GRN's own `status` (COMPLETE/PARTIAL/DISCREPANT) is
// supplied by the caller (the person physically receiving goods reports
// what they saw), not derived here — this repository/use case pair trusts
// that report and reacts to it, it doesn't independently recompute
// "does received match ordered" from the two records.

export interface GrnLineInput {
  purchaseOrderLineId: string;
  productId: string;
  quantityReceived: string;
  condition: "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU";
  serialNumberId?: string;
  batchId?: string;
}

export interface GrnRecord {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT" | "CANCELLED";
  receivedById: string;
  receivedAt?: Date | string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    branchId?: string;
    branch?: { id: string; name: string; code: string };
    supplier?: { id: string; companyName: string };
    lines?: {
      id: string;
      productId: string;
      quantity: string;
      unitPrice: string;
      product?: { id: string; sku: string; name: string };
    }[];
  };
  lines: {
    id: string;
    purchaseOrderLineId: string;
    productId: string;
    quantityReceived: string;
    condition: string;
    product?: { id: string; sku: string; name: string };
    purchaseOrderLine?: {
      id: string;
      quantity: string;
      unitPrice?: string;
    };
  }[];
}

export interface CreateGrnInput {
  grnNumber: string;
  purchaseOrderId: string;
  status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT";
  receivedById: string;
  warehouseId?: string;
  lines: GrnLineInput[];
}

export interface GrnRepository {
  create(input: CreateGrnInput): Promise<GrnRecord>;
  findById(id: string): Promise<GrnRecord | null>;
  list(filter: { purchaseOrderId?: string; status?: string }, page: { skip: number; take: number }): Promise<{ items: GrnRecord[]; total: number }>;
  updateStatus(id: string, status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT" | "CANCELLED"): Promise<GrnRecord>;
  cancel(id: string, cancelledById: string, reason?: string): Promise<GrnRecord>;
}
