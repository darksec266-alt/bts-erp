import type { PurchaseRequestRepository, PurchaseRequestRecord, CreatePurchaseRequestInput } from "../application/purchase-request-repository.port";

export interface PurchaseRequestPrismaClient {
  purchaseRequest: {
    create(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args: any): Promise<number>;
    update(args: any): Promise<any>;
  };
}

const prInclude = {
  lines: { include: { product: true } },
  branch: true,
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      createdAt: true,
      lines: {
        include: {
          grnLines: {
            include: {
              grn: true,
            },
          },
        },
      },
    },
  },
};

function toRecord(row: any): PurchaseRequestRecord {
  let totalRequested = 0;
  let totalOrdered = 0;
  let totalReceived = 0;

  const lines = (row.lines || []).map((l: any) => {
    const reqQty = Number(l.quantity) || 0;
    totalRequested += reqQty;

    let poQty = 0;
    let rcvdQty = 0;

    if (row.purchaseOrder?.lines) {
      const matchingPoLines = row.purchaseOrder.lines.filter(
        (pl: any) => pl.productId === l.productId
      );
      for (const pl of matchingPoLines) {
        poQty += Number(pl.quantity) || 0;
        const validGrnQty = (pl.grnLines || [])
          .filter((gl: any) => gl.grn && gl.grn.status !== "CANCELLED" && gl.condition !== "DAMAGED" && gl.condition !== "WRONG_SKU")
          .reduce((sum: number, gl: any) => sum + (Number(gl.quantityReceived) || 0), 0);
        rcvdQty += validGrnQty;
      }
    }

    totalOrdered += poQty;
    totalReceived += rcvdQty;
    const remaining = Math.max(0, reqQty - rcvdQty);

    let lineFulfillment: "PENDING_APPROVAL" | "REJECTED" | "AWAITING_PO" | "ORDERED" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED" | "CANCELLED" = "PENDING_APPROVAL";
    if (row.status === "REJECTED" || row.status === "CANCELLED") {
      lineFulfillment = "REJECTED";
    } else if (row.status === "PENDING") {
      lineFulfillment = "PENDING_APPROVAL";
    } else if (!row.purchaseOrder) {
      lineFulfillment = "AWAITING_PO";
    } else if (rcvdQty >= reqQty && reqQty > 0) {
      lineFulfillment = "FULLY_RECEIVED";
    } else if (rcvdQty > 0) {
      lineFulfillment = "PARTIALLY_RECEIVED";
    } else {
      lineFulfillment = "ORDERED";
    }

    return {
      id: l.id,
      productId: l.productId,
      quantity: l.quantity.toString(),
      requestedQuantity: reqQty,
      poQuantity: poQty,
      receivedQuantity: rcvdQty,
      remainingQuantity: remaining,
      fulfillmentStatus: lineFulfillment,
      notes: l.notes,
      product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : undefined,
    };
  });

  const totalRemaining = Math.max(0, totalRequested - totalReceived);
  let overallFulfillment = "PENDING_APPROVAL";
  if (row.status === "REJECTED" || row.status === "CANCELLED") {
    overallFulfillment = "REJECTED";
  } else if (row.status === "PENDING") {
    overallFulfillment = "PENDING_APPROVAL";
  } else if (!row.purchaseOrder) {
    overallFulfillment = "AWAITING_PO";
  } else if (totalReceived >= totalRequested && totalRequested > 0) {
    overallFulfillment = "FULLY_RECEIVED";
  } else if (totalReceived > 0) {
    overallFulfillment = "PARTIALLY_RECEIVED";
  } else {
    overallFulfillment = "ORDERED";
  }

  return {
    id: row.id,
    requestNumber: row.requestNumber,
    branchId: row.branchId,
    requestedById: row.requestedById,
    status: row.status as PurchaseRequestRecord["status"],
    createdAt: row.createdAt,
    branch: row.branch ? { id: row.branch.id, code: row.branch.code, name: row.branch.name } : undefined,
    purchaseOrder: row.purchaseOrder
      ? {
          id: row.purchaseOrder.id,
          poNumber: row.purchaseOrder.poNumber,
          createdAt: row.purchaseOrder.createdAt,
        }
      : null,
    totalRequestedQuantity: totalRequested,
    totalOrderedQuantity: totalOrdered,
    totalReceivedQuantity: totalReceived,
    totalRemainingQuantity: totalRemaining,
    fulfillmentStatus: overallFulfillment,
    lines,
  };
}

export class PrismaPurchaseRequestRepository implements PurchaseRequestRepository {
  constructor(private readonly prisma: any) {}

  async create(input: CreatePurchaseRequestInput): Promise<PurchaseRequestRecord> {
    const { lines, status = "PENDING", ...rest } = input;
    const row = await this.prisma.purchaseRequest.create({
      data: {
        ...rest,
        status,
        lines: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes })) },
      },
      include: prInclude,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<PurchaseRequestRecord | null> {
    const row = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: prInclude,
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: { branchId?: string; status?: string }, page: { skip: number; take: number }): Promise<{ items: PurchaseRequestRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.status) where.status = filter.status;
    const [rows, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: prInclude,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async updateStatus(id: string, status: "APPROVED" | "REJECTED" | "CANCELLED"): Promise<void> {
    const dbStatus = status === "CANCELLED" ? "REJECTED" : status;
    await this.prisma.purchaseRequest.update({ where: { id }, data: { status: dbStatus } });
  }

  async cancel(id: string, cancelledById: string): Promise<PurchaseRequestRecord> {
    const existing = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: prInclude,
    });
    if (!existing) throw new Error("Purchase requisition not found");
    if (existing.purchaseOrder) {
      throw new Error(`Cannot cancel Purchase Requisition ${existing.requestNumber} because it is already fulfilled by Purchase Order ${existing.purchaseOrder.poNumber}.`);
    }
    const updated = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: "REJECTED" },
      include: prInclude,
    });
    return toRecord(updated);
  }
}
