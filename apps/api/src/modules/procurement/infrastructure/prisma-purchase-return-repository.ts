import type { PurchaseReturnRepository, PurchaseReturnRecord, CreatePurchaseReturnInput } from "../application/purchase-return-repository.port";

export interface PurchaseReturnPrismaClient {
  purchaseReturn: {
    create(args: { data: Record<string, unknown>; include: { lines: true } }): Promise<PurchaseReturnRow>;
    findUnique(args: { where: { id: string }; include: { lines: true } }): Promise<PurchaseReturnRow | null>;
    update(args: { where: { id: string }; data: { approvalStatus: string } }): Promise<unknown>;
  };
}

interface PurchaseReturnRow {
  id: string;
  returnNumber: string;
  grnId: string;
  reason: string;
  approvalStatus: string;
  createdById: string;
  lines: { id: string; goodsReceiptNoteLineId: string; quantity: { toString(): string } }[];
}

function toRecord(row: PurchaseReturnRow): PurchaseReturnRecord {
  return {
    id: row.id,
    returnNumber: row.returnNumber,
    grnId: row.grnId,
    reason: row.reason,
    approvalStatus: row.approvalStatus as PurchaseReturnRecord["approvalStatus"],
    createdById: row.createdById,
    lines: row.lines.map((l) => ({ id: l.id, goodsReceiptNoteLineId: l.goodsReceiptNoteLineId, quantity: l.quantity.toString() })),
  };
}

export class PrismaPurchaseReturnRepository implements PurchaseReturnRepository {
  constructor(private readonly prisma: any) {}

  async create(input: CreatePurchaseReturnInput): Promise<PurchaseReturnRecord> {
    const { lines, ...rest } = input;
    const row = await this.prisma.purchaseReturn.create({
      data: { ...rest, lines: { create: lines.map((l) => ({ goodsReceiptNoteLineId: l.goodsReceiptNoteLineId, quantity: l.quantity })) } },
      include: { lines: true },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<PurchaseReturnRecord | null> {
    const row = await this.prisma.purchaseReturn.findUnique({ where: { id }, include: { lines: true } });
    return row ? toRecord(row) : null;
  }

  async updateStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<void> {
    const execute = async (tx: any) => {
      const returnDoc = await tx.purchaseReturn.findUnique({
        where: { id },
        include: {
          lines: {
            include: {
              goodsReceiptNoteLine: {
                include: {
                  product: true,
                  grn: {
                    include: {
                      purchaseOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (returnDoc && status === "APPROVED" && tx.stockLedger) {
        // Resolve warehouse
        let targetWarehouseId: string | undefined;
        const branchId = returnDoc.lines?.[0]?.goodsReceiptNoteLine?.grn?.purchaseOrder?.branchId;
        if (branchId && tx.warehouse) {
          const wh = await tx.warehouse.findFirst({
            where: { branchId, isActive: true },
          });
          if (wh) targetWarehouseId = wh.id;
        }
        if (!targetWarehouseId && tx.warehouse) {
          const wh = await tx.warehouse.findFirst({
            where: { isActive: true },
            orderBy: { code: "asc" },
          });
          if (wh) targetWarehouseId = wh.id;
        }

        if (targetWarehouseId) {
          for (const line of returnDoc.lines) {
            const qty = Number(line.quantity) || 0;
            const productId = line.goodsReceiptNoteLine?.productId;
            if (qty > 0 && productId) {
              const stock = await tx.stockLedger.findUnique({
                where: {
                  productId_warehouseId: {
                    productId,
                    warehouseId: targetWarehouseId,
                  },
                },
              });
              const currentQty = Number(stock?.quantityOnHand) || 0;
              const newQty = Math.max(0, currentQty - qty);

              await tx.stockLedger.upsert({
                where: {
                  productId_warehouseId: {
                    productId,
                    warehouseId: targetWarehouseId,
                  },
                },
                update: { quantityOnHand: newQty },
                create: {
                  productId,
                  warehouseId: targetWarehouseId,
                  quantityOnHand: 0,
                },
              });

              if (tx.sKULifecycleEvent) {
                await tx.sKULifecycleEvent
                  .create({
                    data: {
                      productId,
                      eventType: "RETURNED_TO_SUPPLIER",
                      quantityDelta: -qty,
                      referenceId: returnDoc.id,
                      notes: `Purchase Return ${returnDoc.returnNumber} approved: -${qty} returned to supplier`,
                    },
                  })
                  .catch(() => {});
              }
            }
          }
        }
      }

      await tx.purchaseReturn.update({ where: { id }, data: { approvalStatus: status } });
    };

    if (this.prisma.$transaction) {
      await this.prisma.$transaction(execute);
    } else {
      await execute(this.prisma);
    }
  }
}
