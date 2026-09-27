import type { PurchaseRequestRepository, PurchaseRequestRecord, CreatePurchaseRequestInput } from "../application/purchase-request-repository.port";

export interface PurchaseRequestPrismaClient {
  purchaseRequest: {
    create(args: { data: Record<string, unknown>; include: { lines: { include: { product: true } }; branch: true; purchaseOrder: { select: { id: true; poNumber: true; createdAt: true } } } }): Promise<PurchaseRequestRow>;
    findUnique(args: { where: { id: string }; include: { lines: { include: { product: true } }; branch: true; purchaseOrder: { select: { id: true; poNumber: true; createdAt: true } } } }): Promise<PurchaseRequestRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: { lines: { include: { product: true } }; branch: true; purchaseOrder: { select: { id: true; poNumber: true; createdAt: true } } }; orderBy?: Record<string, string> }): Promise<PurchaseRequestRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: { status: string } }): Promise<unknown>;
  };
}

interface PurchaseRequestRow {
  id: string;
  requestNumber: string;
  branchId: string;
  requestedById: string;
  status: string;
  createdAt?: Date;
  branch?: { id: string; code: string; name: string };
  purchaseOrder?: { id: string; poNumber: string; createdAt?: Date } | null;
  lines: {
    id: string;
    productId: string;
    quantity: { toString(): string };
    notes: string | null;
    product?: { id: string; sku: string; name: string };
  }[];
}

function toRecord(row: PurchaseRequestRow): PurchaseRequestRecord {
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
    lines: row.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      quantity: l.quantity.toString(),
      notes: l.notes,
      product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : undefined,
    })),
  };
}

export class PrismaPurchaseRequestRepository implements PurchaseRequestRepository {
  constructor(private readonly prisma: PurchaseRequestPrismaClient) {}

  async create(input: CreatePurchaseRequestInput): Promise<PurchaseRequestRecord> {
    const { lines, status = "PENDING", ...rest } = input;
    const row = await this.prisma.purchaseRequest.create({
      data: {
        ...rest,
        status,
        lines: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes })) },
      },
      include: { lines: { include: { product: true } }, branch: true, purchaseOrder: { select: { id: true, poNumber: true, createdAt: true } } },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<PurchaseRequestRecord | null> {
    const row = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      include: { lines: { include: { product: true } }, branch: true, purchaseOrder: { select: { id: true, poNumber: true, createdAt: true } } },
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
        include: { lines: { include: { product: true } }, branch: true, purchaseOrder: { select: { id: true, poNumber: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async updateStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void> {
    await this.prisma.purchaseRequest.update({ where: { id }, data: { status } });
  }
}
