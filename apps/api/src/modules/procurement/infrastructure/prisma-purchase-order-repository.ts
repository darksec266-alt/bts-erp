import type { PurchaseOrderRepository, PurchaseOrderRecord, CreatePurchaseOrderInput } from "../application/purchase-order-repository.port";

export interface PurchaseOrderPrismaClient {
  purchaseOrder: {
    create(args: { data: Record<string, unknown>; include: Record<string, unknown> }): Promise<any>;
    findUnique(args: { where: { id: string }; include: Record<string, unknown> }): Promise<any>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<any[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
}

const poInclude = {
  lines: {
    include: {
      product: true,
      grnLines: {
        include: {
          grn: true,
        },
      },
    },
  },
  grns: {
    include: {
      lines: true,
    },
    orderBy: { receivedAt: "desc" },
  },
  supplier: true,
  branch: true,
  purchaseRequest: true,
};

function toRecord(row: any): PurchaseOrderRecord {
  let poTotalOrdered = 0;
  let poTotalReceived = 0;

  const lines = (row.lines || []).map((l: any) => {
    const ordered = Number(l.quantity) || 0;
    poTotalOrdered += ordered;

    // Sum all valid non-cancelled, non-damaged receipts for this line
    const received = (l.grnLines || [])
      .filter((gl: any) => gl.grn && gl.grn.status !== "CANCELLED" && gl.condition !== "DAMAGED" && gl.condition !== "WRONG_SKU")
      .reduce((sum: number, gl: any) => sum + (Number(gl.quantityReceived) || 0), 0);

    poTotalReceived += received;
    const remaining = Math.max(0, ordered - received);

    let lineStatus: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" = "PENDING_RECEIPT";
    if (received >= ordered && ordered > 0) {
      lineStatus = "FULLY_RECEIVED";
    } else if (received > 0) {
      lineStatus = "PARTIALLY_RECEIVED";
    }

    return {
      id: l.id,
      productId: l.productId,
      quantity: l.quantity.toString(),
      unitPrice: l.unitPrice.toString(),
      lineTotal: l.lineTotal.toString(),
      receivedQuantity: received,
      remainingQuantity: remaining,
      fulfillmentStatus: lineStatus,
      product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : undefined,
    };
  });

  const poRemaining = Math.max(0, poTotalOrdered - poTotalReceived);
  let poStatus: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" = "PENDING_RECEIPT";
  if (poTotalReceived >= poTotalOrdered && poTotalOrdered > 0) {
    poStatus = "FULLY_RECEIVED";
  } else if (poTotalReceived > 0) {
    poStatus = "PARTIALLY_RECEIVED";
  }

  const grns = (row.grns || []).map((g: any) => ({
    id: g.id,
    grnNumber: g.grnNumber,
    status: g.status,
    receivedAt: g.receivedAt,
  }));

  return {
    id: row.id,
    poNumber: row.poNumber,
    purchaseRequestId: row.purchaseRequestId,
    supplierId: row.supplierId,
    branchId: row.branchId,
    grandTotal: row.grandTotal.toString(),
    createdAt: row.createdAt,
    fulfillmentStatus: poStatus,
    totalOrderedQuantity: poTotalOrdered,
    totalReceivedQuantity: poTotalReceived,
    totalRemainingQuantity: poRemaining,
    supplier: row.supplier ? { id: row.supplier.id, supplierCode: row.supplier.supplierCode, companyName: row.supplier.companyName } : undefined,
    branch: row.branch ? { id: row.branch.id, code: row.branch.code, name: row.branch.name } : undefined,
    purchaseRequest: row.purchaseRequest ? { id: row.purchaseRequest.id, requestNumber: row.purchaseRequest.requestNumber } : null,
    lines,
    grns,
  };
}

export class PrismaPurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly prisma: PurchaseOrderPrismaClient) {}

  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderRecord> {
    const row = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: input.poNumber,
        purchaseRequestId: input.purchaseRequestId,
        supplierId: input.supplierId,
        branchId: input.branchId,
        grandTotal: input.grandTotal,
        lines: {
          create: input.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: poInclude,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<PurchaseOrderRecord | null> {
    const row = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: poInclude,
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: { branchId?: string; supplierId?: string }, page: { skip: number; take: number }): Promise<{ items: PurchaseOrderRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.supplierId) where.supplierId = filter.supplierId;
    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: poInclude,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }
}
