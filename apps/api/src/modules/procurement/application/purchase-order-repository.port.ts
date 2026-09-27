// prd.md §8.7 / api-spec.md §14: "POST /purchase-orders (from an approved
// PR or standalone)." Creating from a PR copies that PR's lines rather
// than requiring the caller to resupply them — the PurchaseRequestLine
// data already says what's needed; a standalone PO supplies its own lines
// directly when there's no PR behind it.

export interface PurchaseOrderLineInput {
  productId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string; // computed by the Application layer (CreatePurchaseOrderUseCase), never by the repository — prompt.md §134's Use Case Rule
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  purchaseRequestId: string | null;
  supplierId: string;
  branchId: string;
  grandTotal: string;
  createdAt?: Date | string;
  fulfillmentStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED";
  totalOrderedQuantity?: number;
  totalReceivedQuantity?: number;
  totalRemainingQuantity?: number;
  supplier?: { id: string; supplierCode: string; companyName: string };
  branch?: { id: string; code: string; name: string };
  purchaseRequest?: { id: string; requestNumber: string } | null;
  lines: {
    id: string;
    productId: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    receivedQuantity?: number;
    remainingQuantity?: number;
    fulfillmentStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED";
    product?: { id: string; sku: string; name: string; trackingType?: "SERIALIZED" | "NON_SERIALIZED"; modelNumber?: string | null; barcode?: string | null };
  }[];
  grns?: {
    id: string;
    grnNumber: string;
    status: string;
    receivedAt?: Date | string;
  }[];
}

export interface CreatePurchaseOrderInput {
  poNumber: string;
  purchaseRequestId?: string;
  supplierId: string;
  branchId: string;
  grandTotal: string; // computed by the Application layer, never by the repository
  lines: PurchaseOrderLineInput[];
}

export interface PurchaseOrderRepository {
  create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord>;
  findById(id: string): Promise<PurchaseOrderRecord | null>;
  list(filter: { branchId?: string; supplierId?: string }, page: { skip: number; take: number }): Promise<{ items: PurchaseOrderRecord[]; total: number }>;
}
