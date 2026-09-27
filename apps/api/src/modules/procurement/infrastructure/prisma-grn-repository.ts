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
  product?: {
    findUnique(args: { where: { id: string }; select?: Record<string, boolean> }): Promise<any>;
    findMany(args: { where: Record<string, unknown> }): Promise<any[]>;
  };
  serialNumber?: {
    findFirst(args: { where: Record<string, unknown> }): Promise<any>;
    findMany(args: { where: Record<string, unknown> }): Promise<any[]>;
    create(args: { data: Record<string, unknown> }): Promise<any>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<any>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<any>;
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
      // Prevent duplicate GRN numbers
      if (tx.goodsReceiptNote) {
        const existingGrn = await tx.goodsReceiptNote.findUnique({
          where: { grnNumber: input.grnNumber },
        });
        if (existingGrn) {
          throw new Error(`A Goods Receipt Note with number "${input.grnNumber}" already exists. Duplicate GRN submission prevented.`);
        }
      }

      // Validate against target PO and existing cumulative receipts
      if (tx.purchaseOrder) {
        const po = await tx.purchaseOrder.findUnique({
          where: { id: input.purchaseOrderId },
          include: {
            grns: true,
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

        const isCancelled = (po.grns || []).some(
          (g: any) => g.status === "CANCELLED" && (g.grnNumber.startsWith("CANCEL-") || !g.lines || g.lines.length === 0)
        );
        if (isCancelled) {
          throw new Error(`Cannot receive goods against Purchase Order ${po.poNumber} because it is CANCELLED.`);
        }

        // Validate each received line against its PO line remaining quantity
        for (const line of lines) {
          const poLine = po.lines?.find(
            (pl: any) => pl.id === line.purchaseOrderLineId || pl.productId === line.productId
          );
          if (!poLine) {
            throw new Error(`Invalid line item: Product ${line.productId} is not part of Purchase Order ${po.poNumber}.`);
          }

          // Auto-align line IDs
          line.purchaseOrderLineId = poLine.id;
          line.productId = poLine.productId;

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

      // Validate serialized inventory lines (1-to-1 exact serial count, no duplicates, no existing in DB)
      for (const line of lines) {
        const prod = tx.product
          ? await tx.product.findUnique({ where: { id: line.productId } })
          : null;
        const isSerialized = prod?.trackingType === "SERIALIZED";
        const qty = Number(line.quantityReceived) || 0;
        const rawSerials = (line as any).serials || [];
        const normalizedSerials = rawSerials
          .map((s: any) =>
            typeof s === "string"
              ? { serial: s.trim() }
              : { serial: (s.serial || "").trim(), barcode: s.barcode?.trim(), notes: s.notes?.trim() }
          )
          .filter((s: any) => s.serial.length > 0);

        if (isSerialized && line.condition !== "DAMAGED" && line.condition !== "WRONG_SKU") {
          if (qty > 0 && normalizedSerials.length !== qty) {
            throw new Error(
              `Product "${prod?.name || line.productId}" (${prod?.sku || "SKU"}) is SERIALIZED. Quantity received is ${qty}, but ${normalizedSerials.length} serial number(s) were provided. An exact 1-to-1 serial number list is required.`
            );
          }

          const seen = new Set<string>();
          for (const s of normalizedSerials) {
            const lower = s.serial.toLowerCase();
            if (seen.has(lower)) {
              throw new Error(`Duplicate serial number "${s.serial}" detected in submission for product "${prod?.name || line.productId}".`);
            }
            seen.add(lower);
          }

          if (tx.serialNumber && normalizedSerials.length > 0) {
            const existingSerials = await tx.serialNumber.findMany({
              where: {
                serial: { in: normalizedSerials.map((s: any) => s.serial), mode: "insensitive" },
              },
            });
            if (existingSerials && existingSerials.length > 0) {
              throw new Error(
                `Serial number "${existingSerials[0].serial}" is already registered in the system (Stage: ${existingSerials[0].currentStage}). Duplicate serial numbers are strictly prohibited.`
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

      // Credit stock into StockLedger and create physical SerialNumber records
      // Note: Draft GRNs NEVER increment inventory! Only posted/received GRNs touch stock.
      for (const line of lines) {
        const qty = Number(line.quantityReceived) || 0;
        const prod = tx.product
          ? await tx.product.findUnique({ where: { id: line.productId } })
          : null;
        const isSerialized = prod?.trackingType === "SERIALIZED";
        const rawSerials = (line as any).serials || [];
        const normalizedSerials = rawSerials
          .map((s: any) =>
            typeof s === "string"
              ? { serial: s.trim() }
              : { serial: (s.serial || "").trim(), barcode: s.barcode?.trim(), notes: s.notes?.trim() }
          )
          .filter((s: any) => s.serial.length > 0);

        const grnLine = row.lines?.find((gl: any) => gl.productId === line.productId);

        if (isSerialized && tx.serialNumber && normalizedSerials.length > 0) {
          for (const s of normalizedSerials) {
            const createdUnit = await tx.serialNumber.create({
              data: {
                productId: line.productId,
                serial: s.serial,
                barcode: s.barcode || null,
                warehouseId: input.status !== "DRAFT" ? targetWarehouseId : null,
                purchaseOrderId: input.purchaseOrderId,
                grnId: row.id,
                grnLineId: grnLine?.id || null,
                notes: s.notes || null,
                currentStage: input.status !== "DRAFT" ? "IN_STOCK" : "RECEIVED",
              },
            });

            if (tx.sKULifecycleEvent) {
              await tx.sKULifecycleEvent.create({
                data: {
                  serialNumberId: createdUnit.id,
                  eventType: input.status !== "DRAFT" ? "IN_STOCK" : "RECEIVED",
                  sourceModule: "GRN",
                  sourceId: row.id,
                  toWarehouseId: input.status !== "DRAFT" ? targetWarehouseId : null,
                  toStage: input.status !== "DRAFT" ? "IN_STOCK" : "RECEIVED",
                  notes: `Received via GRN ${row.grnNumber} from PO`,
                  performedById: input.receivedById,
                },
              });
            }
          }
        }

        if (input.status !== "DRAFT" && targetWarehouseId && tx.stockLedger) {
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
          if (tx.serialNumber) {
            const existingSerials = await tx.serialNumber.findMany({ where: { grnId: id } });
            if (existingSerials && existingSerials.length > 0) {
              await tx.serialNumber.updateMany({
                where: { grnId: id },
                data: { currentStage: "IN_STOCK", warehouseId: targetWarehouseId },
              });
              if (tx.sKULifecycleEvent) {
                for (const s of existingSerials) {
                  await tx.sKULifecycleEvent.create({
                    data: {
                      serialNumberId: s.id,
                      eventType: "IN_STOCK",
                      sourceModule: "GRN",
                      sourceId: id,
                      toWarehouseId: targetWarehouseId,
                      toStage: "IN_STOCK",
                      notes: `GRN posted from DRAFT to ${status}`,
                    },
                  }).catch(() => {});
                }
              }
            }
          }

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

      // If this GRN had serial numbers, transition them to DAMAGED_WRITTEN_OFF or remove from active stock
      if (tx.serialNumber) {
        const existingSerials = await tx.serialNumber.findMany({ where: { grnId: existing.id } });
        if (existingSerials && existingSerials.length > 0) {
          await tx.serialNumber.updateMany({
            where: { grnId: existing.id },
            data: { currentStage: "DAMAGED_WRITTEN_OFF", warehouseId: null },
          });
          if (tx.sKULifecycleEvent) {
            for (const s of existingSerials) {
              await tx.sKULifecycleEvent.create({
                data: {
                  serialNumberId: s.id,
                  eventType: "DAMAGED_WRITTEN_OFF",
                  sourceModule: "GRN_CANCEL",
                  sourceId: existing.id,
                  notes: `GRN cancelled by ${cancelledById}: ${reason || "N/A"}`,
                  performedById: cancelledById,
                },
              }).catch(() => {});
            }
          }
        }
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
