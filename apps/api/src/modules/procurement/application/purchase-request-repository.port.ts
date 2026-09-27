// prd.md §8.6 / api-spec.md §14. The approval step delegates to
// shared/approval/approval.service.ts (api-spec.md §14's own note) —
// this repository only handles the PurchaseRequest record itself.

export interface PurchaseRequestLineInput {
  productId: string;
  quantity: string;
  notes?: string;
}

export interface PurchaseRequestRecord {
  id: string;
  requestNumber: string;
  branchId: string;
  requestedById: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: Date | string;
  branch?: { id: string; code: string; name: string };
  purchaseOrder?: { id: string; poNumber: string; createdAt?: Date | string } | null;
  lines: {
    id: string;
    productId: string;
    quantity: string;
    notes: string | null;
    product?: { id: string; sku: string; name: string };
  }[];
}

export interface CreatePurchaseRequestInput {
  requestNumber: string;
  branchId: string;
  requestedById: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  lines: PurchaseRequestLineInput[];
}

export interface PurchaseRequestRepository {
  create(input: CreatePurchaseRequestInput): Promise<PurchaseRequestRecord>;
  findById(id: string): Promise<PurchaseRequestRecord | null>;
  list(filter: { branchId?: string; status?: string }, page: { skip: number; take: number }): Promise<{ items: PurchaseRequestRecord[]; total: number }>;
  updateStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void>;
}
