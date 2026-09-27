// prd.md §9.7: Purchase Return — returning received goods to a supplier
// (damaged, wrong item, etc.), routed through an approval since it
// reverses a receipt already recorded. References specific
// GoodsReceiptNoteLine rows (this session's own schema fix), not just a
// bare quantity, so a multi-line GRN's return always says exactly which
// product/line is being sent back.

export interface PurchaseReturnLineInput {
  goodsReceiptNoteLineId: string;
  quantity: string;
}

export interface PurchaseReturnRecord {
  id: string;
  returnNumber: string;
  grnId: string;
  reason: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdById: string;
  lines: { id: string; goodsReceiptNoteLineId: string; quantity: string }[];
}

export interface CreatePurchaseReturnInput {
  returnNumber: string;
  grnId: string;
  reason: string;
  createdById: string;
  lines: PurchaseReturnLineInput[];
}

export interface PurchaseReturnRepository {
  create(input: CreatePurchaseReturnInput): Promise<PurchaseReturnRecord>;
  findById(id: string): Promise<PurchaseReturnRecord | null>;
  updateStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void>;
}
