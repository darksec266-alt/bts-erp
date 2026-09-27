import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import type { PrismaClient } from "@prisma/client";

export function createProcurementStatsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/procurement/stats", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      const { branchId } = req.query;
      const branchFilter = typeof branchId === "string" ? { branchId } : {};

      const [
        totalSuppliers,
        activeSuppliers,
        totalPRs,
        pendingPRs,
        totalPOs,
        totalGRNs,
        spendAgg,
        purchasedQtyAgg,
        receivedQtyAgg,
        posWithLines,
      ] = await Promise.all([
        prisma.supplier.count(),
        prisma.supplier.count({ where: { isActive: true } }),
        prisma.purchaseRequest.count({ where: branchFilter }),
        prisma.purchaseRequest.count({ where: { ...branchFilter, status: "PENDING" } }),
        prisma.purchaseOrder.count({ where: branchFilter }),
        prisma.goodsReceiptNote.count({
          where: {
            status: { not: "CANCELLED" },
            purchaseOrder: branchFilter,
          },
        }),
        prisma.purchaseOrder.aggregate({
          where: branchFilter,
          _sum: { grandTotal: true },
        }),
        prisma.purchaseOrderLine.aggregate({
          where: { purchaseOrder: branchFilter },
          _sum: { quantity: true },
        }),
        prisma.goodsReceiptNoteLine.aggregate({
          where: {
            grn: {
              status: { not: "CANCELLED" },
              purchaseOrder: branchFilter,
            },
            condition: { notIn: ["DAMAGED", "WRONG_SKU"] },
          },
          _sum: { quantityReceived: true },
        }),
        prisma.purchaseOrder.findMany({
          where: branchFilter,
          select: {
            id: true,
            lines: {
              select: {
                quantity: true,
                grnLines: {
                  select: {
                    quantityReceived: true,
                    condition: true,
                    grn: { select: { status: true } },
                  },
                },
              },
            },
            grns: {
              select: {
                grnNumber: true,
                status: true,
                lines: { select: { id: true } },
              },
            },
          },
        }),
      ]);

      const totalSpend = Number(spendAgg._sum.grandTotal || 0);
      const totalPurchasedQuantity = Number(purchasedQtyAgg._sum.quantity || 0);
      const totalReceivedQuantity = Number(receivedQtyAgg._sum.quantityReceived || 0);
      const outstandingQuantity = Math.max(0, totalPurchasedQuantity - totalReceivedQuantity);

      let pendingPOs = 0;
      let partiallyReceivedPOs = 0;
      let fullyReceivedPOs = 0;
      let cancelledPOs = 0;

      for (const po of posWithLines) {
        let poOrdered = 0;
        let poReceived = 0;

        for (const line of po.lines) {
          poOrdered += Number(line.quantity) || 0;
          for (const gl of line.grnLines) {
            if (gl.grn && gl.grn.status !== "CANCELLED" && gl.condition !== "DAMAGED" && gl.condition !== "WRONG_SKU") {
              poReceived += Number(gl.quantityReceived) || 0;
            }
          }
        }

        const isCancelledMarker = (po.grns || []).some(
          (g) => g.status === "CANCELLED" && (g.grnNumber.startsWith("CANCEL-") || !g.lines || g.lines.length === 0)
        );

        if (isCancelledMarker && poReceived === 0) {
          cancelledPOs++;
        } else if (poReceived >= poOrdered && poOrdered > 0) {
          fullyReceivedPOs++;
        } else if (poReceived > 0) {
          partiallyReceivedPOs++;
        } else {
          pendingPOs++;
        }
      }

      sendData(res, {
        totalSpend,
        totalPOs,
        pendingPRs,
        totalPRs,
        activeSuppliers,
        totalSuppliers,
        totalGRNs,
        pendingPOs,
        partiallyReceivedPOs,
        fullyReceivedPOs,
        cancelledPOs,
        totalPurchasedQuantity,
        totalReceivedQuantity,
        outstandingQuantity,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load procurement stats";
      sendError(res, 500, { code: "STATS_FAILED", message });
    }
  });

  return router;
}
