import type { GrnRepository, GrnRecord, CreateGrnInput } from "../application/grn-repository.port";

export interface GrnPrismaClient {
  goodsReceiptNote: {
    create(args: { data: Record<string, unknown>; include: Record<string, unknown> }): Promise<GrnRow>;
    findUnique(args: { where: { id: string }; include: Record<string, unknown> }): Promise<GrnRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<GrnRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: { status: string }; include: Record<string, unknown> }): Promise<GrnRow>;
  };
  purchaseOrder?: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean>; include?: Record<string, unknown> }): Promise<any>;
  };
  warehouse?: {
    findUnique(args: { where: { id: string } }): Promise<any>;
    findFirst(args: { where: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<any>;
    create(args: { data: Record<string, unknown> }): Promise<any>;
  };
  stockLedger?: {
    upsert(args: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<any>;
    findUnique(args: { where: Record<string, unknown> }): Promise<any>;
  };
  sKULifecycleEvent?: {
    create(args: { data: Record<string, unknown> }): Promise<any>;
  };
  $transaction?<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}

const grnInclude = {
  lines: {
    include: {
      product: true,
      purchaseOrderLine: true,
    },
  },
  purchaseOrder: {
    include: {
      supplier: true,
      branch: true,
      lines: { include: { product: true } },
    },
  },
};

interface GrnRow {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  status: string;
  receivedById: string;
  receivedAt?: Date;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    branchId?: string;
    branch?: { id: string; name: string; code: string };
    supplier?: { id: string; companyName: string };
    lines?: {
      id: string;
      productId: string;
      quantity: { toString(): string };
      unitPrice: { toString(): string };
      product?: { id: string; sku: string; name: string };
    }[];
  };
  lines: {
    id: string;
    purchaseOrderLineId: string;
    productId: string;
    quantityReceived: { toString(): string };
    condition: string;
    product?: { id: string; sku: string; name: string };
    purchaseOrderLine?: {
      id: string;
      quantity: { toString(): string };
      unitPrice?: { toString(): string };
    };
  }[];
}

function toRecord(row: GrnRow): GrnRecord {
  return {
    id: row.id,
    grnNumber: row.grnNumber,
    purchaseOrderId: row.purchaseOrderId,
    status: row.status as GrnRecord["status"],
    receivedById: row.receivedById,
    receivedAt: row.receivedAt,
    purchaseOrder: row.purchaseOrder ? {
      id: row.purchaseOrder.id,
      poNumber: row.purchaseOrder.poNumber,
      branchId: row.purchaseOrder.branchId,
      branch: row.purchaseOrder.branch ? {
        id: row.purchaseOrder.branch.id,
        name: row.purchaseOrder.branch.name,
        code: row.purchaseOrder.branch.code,
      } : undefined,
      supplier: row.purchaseOrder.supplier ? {
        id: row.purchaseOrder.supplier.id,
        companyName: row.purchaseOrder.supplier.companyName,
      } : undefined,
      lines: row.purchaseOrder.lines?.map((l) => ({
        id: l.id,
        productId: l.productId,
        quantity: l.quantity.toString(),
        unitPrice: l.unitPrice.toString(),
        product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : undefined,
      })),
    } : undefined,
    lines: row.lines.map((l) => ({
      id: l.id,
      purchaseOrderLineId: l.purchaseOrderLineId,
      productId: l.productId,
      quantityReceived: l.quantityReceived.toString(),
      condition: l.condition,
      product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : undefined,
      purchaseOrderLine: l.purchaseOrderLine ? {
        id: l.purchaseOrderLine.id,
        quantity: l.purchaseOrderLine.quantity.toString(),
        unitPrice: l.purchaseOrderLine.unitPrice?.toString(),
      } : undefined,
    })),
  };
}

export class PrismaGrnRepository implements GrnRepository {
  constructor(private readonly prisma: GrnPrismaClient) {}

  async create(input: CreateGrnInput): Promise<GrnRecord> {
    const { lines, warehouseId: explicitWarehouseId, ...rest } = input;

    // Validate negative quantities up front
    for (const l of lines) {
      const qty = Number(l.quantityReceived);
      if (isNaN(qty) || qty < 0) {
        throw new Error(`Invalid received quantity: ${l.quantityReceived}. Negative quantities are not allowed.`);
      }
    }

    // Resolve target warehouse for receiving stock
    let targetWarehouseId = explicitWarehouseId;
    if (!targetWarehouseId && this.prisma.warehouse) {
      const po = await this.prisma.purchaseOrder?.findUnique({
        where: { id: input.purchaseOrderId },
        select: { branchId: true },
      });
      if (po?.branchId) {
        const wh = await this.prisma.warehouse.findFirst({
          where: { branchId: po.branchId, isActive: true },
        });
        if (wh) targetWarehouseId = wh.id;
      }
      if (!targetWarehouseId) {
        const wh = await this.prisma.warehouse.findFirst({
          where: { isActive: true },
          orderBy: { code: "asc" },
        });
        if (wh) targetWarehouseId = wh.id;
      }
    }

    const executeCreation = async (tx: any) => {
      // Validate against target PO and existing cumulative receipts
      if (tx.purchaseOrder) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: {
            lines: {
              include: {
                product: true,
                grnLines: {
                  include: { grn: true },
                },
              },
            },
          },
        });

        if (!po) {
          throw new Error(`Target Purchase Order (${input.purchaseOrderId}) not found.`);
        }

        // Validate each received line against its PO line remaining quantity
        for (const line of lines) {
          const poLine = po.lines?.find(
            (pl: any) => pl.id === line.purchaseOrderLineId || pl.productId === line.productId
          );
          if (poLine) {
            const alreadyReceived = (poLine.grnLines || [])
              .filter(
                (gl: any) =>
                  gl.grn &&
                  gl.grn.status !== "CANCELLED" &&
                  gl.condition !== "DAMAGED" &&
                  gl.condition !== "WRONG_SKU"
              )
              .reduce((sum: number, gl: any) => sum + (Number(gl.quantityReceived) || 0), 0);

            const orderedQty = Number(poLine.quantity) || 0;
            const remainingDue = Math.max(0, orderedQty - alreadyReceived);
            const currentQty = Number(line.quantityReceived) || 0;

            if (
              currentQty > remainingDue &&
              input.status !== "DISCREPANT"
            ) {
              throw new Error(
                `Over-receiving prevented: Attempted to receive ${currentQty} units for item "${
                  poLine.product?.name || line.productId
                }". Only ${remainingDue} units remaining due on this PO line (Ordered: ${orderedQty}, Previously Received: ${alreadyReceived}).`
              );
            }
          }
        }
      }

      const row = await tx.goodsReceiptNote.create({
        data: {
          ...rest,
          lines: {
            create: lines.map((l) => ({
              purchaseOrderLineId: l.purchaseOrderLineId,
              productId: l.productId,
              quantityReceived: l.quantityReceived,
              condition: l.condition,
              serialNumberId: l.serialNumberId,
              batchId: l.batchId,
            })),
          },
        },
        include: grnInclude,
      });

      // Credit stock into StockLedger for items received in hand in good condition
      // Note: Draft GRNs NEVER increment inventory! Only posted/received GRNs touch stock.
      if (input.status !== "DRAFT" && targetWarehouseId && tx.stockLedger) {
        for (const line of lines) {
          const qty = Number(line.quantityReceived) || 0;
          if (qty > 0 && line.condition !== "DAMAGED" && line.condition !== "WRONG_SKU") {
            await tx.stockLedger.upsert({
              where: {
                productId_warehouseId: {
                  productId: line.productId,
                  warehouseId: targetWarehouseId,
                },
              },
              update: {
                quantityOnHand: { increment: qty },
              },
              create: {
                productId: line.productId,
                warehouseId: targetWarehouseId,
                quantityOnHand: qty,
              },
            });

            if (tx.sKULifecycleEvent) {
              await tx.sKULifecycleEvent
                .create({
                  data: {
                    productId: line.productId,
                    eventType: "GOODS_RECEIPT_POSTED",
                    quantityDelta: qty,
                    referenceId: row.id,
                    notes: `Received ${qty} units via ${row.grnNumber} at warehouse ${targetWarehouseId}`,
                  },
                })
                .catch(() => {});
            }
          }
        }
      }

      return row;
    };

    const row = this.prisma.$transaction
      ? await this.prisma.$transaction(executeCreation)
      : await executeCreation(this.prisma);

    return toRecord(row);
  }

  async findById(id: string): Promise<GrnRecord | null> {
    const row = await this.prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: grnInclude,
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: { purchaseOrderId?: string; status?: string }, page: { skip: number; take: number }): Promise<{ items: GrnRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.purchaseOrderId) where.purchaseOrderId = filter.purchaseOrderId;
    if (filter.status) where.status = filter.status;
    const [rows, total] = await Promise.all([
      this.prisma.goodsReceiptNote.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: grnInclude,
        orderBy: { receivedAt: "desc" },
      }),
      this.prisma.goodsReceiptNote.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async updateStatus(id: string, status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT" | "CANCELLED"): Promise<GrnRecord> {
    if (status === "CANCELLED") {
      return this.cancel(id, "SYSTEM");
    }

    const executeUpdate = async (tx: any) => {
      const existing = await tx.goodsReceiptNote.findUnique({
        where: { id },
        include: grnInclude,
      });
      if (!existing) throw new Error("Goods receipt note not found");

      // If transitioning from DRAFT to an active posted status, credit stock now
      if (existing.status === "DRAFT" && status !== "DRAFT" && tx.stockLedger) {
        let targetWarehouseId: string | undefined;
        if (existing.purchaseOrder?.branchId && this.prisma.warehouse) {
          const wh = await this.prisma.warehouse.findFirst({
            where: { branchId: existing.purchaseOrder.branchId, isActive: true },
          });
          if (wh) targetWarehouseId = wh.id;
        }
        if (!targetWarehouseId && this.prisma.warehouse) {
          const wh = await this.prisma.warehouse.findFirst({
            where: { isActive: true },
            orderBy: { code: "asc" },
          });
          if (wh) targetWarehouseId = wh.id;
        }

        if (targetWarehouseId) {
          for (const line of existing.lines) {
            const qty = Number(line.quantityReceived) || 0;
            if (qty > 0 && line.condition !== "DAMAGED" && line.condition !== "WRONG_SKU") {
              await tx.stockLedger.upsert({
                where: {
                  productId_warehouseId: {
                    productId: line.productId,
                    warehouseId: targetWarehouseId,
                  },
                },
                update: { quantityOnHand: { increment: qty } },
                create: {
                  productId: line.productId,
                  warehouseId: targetWarehouseId,
                  quantityOnHand: qty,
                },
              });
            }
          }
        }
      }

      const row = await tx.goodsReceiptNote.update({
        where: { id },
        data: { status },
        include: grnInclude,
      });
      return row;
    };

    const row = this.prisma.$transaction
      ? await this.prisma.$transaction(executeUpdate)
      : await executeUpdate(this.prisma);

    return toRecord(row);
  }

  async cancel(id: string, cancelledById: string, reason?: string): Promise<GrnRecord> {
    const executeCancel = async (tx: any) => {
      const existing = await tx.goodsReceiptNote.findUnique({
        where: { id },
        include: grnInclude,
      });
      if (!existing) throw new Error("Goods receipt note not found");
      if (existing.status === "CANCELLED") {
        return existing;
      }

      // If this GRN was posted (not draft), reverse its stock addition
      if (existing.status !== "DRAFT" && tx.stockLedger) {
        let targetWarehouseId: string | undefined;
        if (existing.purchaseOrder?.branchId && this.prisma.warehouse) {
          const wh = await this.prisma.warehouse.findFirst({
            where: { branchId: existing.purchaseOrder.branchId, isActive: true },
          });
          if (wh) targetWarehouseId = wh.id;
        }
        if (!targetWarehouseId && this.prisma.warehouse) {
          const wh = await this.prisma.warehouse.findFirst({
            where: { isActive: true },
            orderBy: { code: "asc" },
          });
          if (wh) targetWarehouseId = wh.id;
        }

        if (targetWarehouseId) {
          for (const line of existing.lines) {
            const qty = Number(line.quantityReceived) || 0;
            if (qty > 0 && line.condition !== "DAMAGED" && line.condition !== "WRONG_SKU") {
              const currentStock = await tx.stockLedger.findUnique({
                where: {
                  productId_warehouseId: {
                    productId: line.productId,
                    warehouseId: targetWarehouseId,
                  },
                },
              });
              const currentQty = Number(currentStock?.quantityOnHand) || 0;
              const newQty = Math.max(0, currentQty - qty);

              await tx.stockLedger.upsert({
                where: {
                  productId_warehouseId: {
                    productId: line.productId,
                    warehouseId: targetWarehouseId,
                  },
                },
                update: { quantityOnHand: newQty },
                create: {
                  productId: line.productId,
                  warehouseId: targetWarehouseId,
                  quantityOnHand: 0,
                },
              });

              if (tx.sKULifecycleEvent) {
                await tx.sKULifecycleEvent
                  .create({
                    data: {
                      productId: line.productId,
                      eventType: "GOODS_RECEIPT_CANCELLED",
                      quantityDelta: -qty,
                      referenceId: existing.id,
                      notes: `GRN ${existing.grnNumber} cancelled by ${cancelledById}: -${qty} units. Reason: ${reason || "N/A"}`,
                    },
                  })
                  .catch(() => {});
              }
            }
          }
        }
      }

      const updated = await tx.goodsReceiptNote.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: grnInclude,
      });

      return updated;
    };

    const row = this.prisma.$transaction
      ? await this.prisma.$transaction(executeCancel)
      : await executeCancel(this.prisma);

    return toRecord(row);
  }
}
