import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreatePurchaseOrderUseCase, GetPurchaseOrderUseCase, ListPurchaseOrdersUseCase, CancelPurchaseOrderUseCase, PurchaseRequestNotApprovedError, PurchaseRequestAlreadyOrderedError } from "../application/purchase-order.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

export function createPurchaseOrderRouter(deps: {
  createPurchaseOrderUseCase: CreatePurchaseOrderUseCase;
  getPurchaseOrderUseCase: GetPurchaseOrderUseCase;
  listPurchaseOrdersUseCase: ListPurchaseOrdersUseCase;
  cancelPurchaseOrderUseCase?: CancelPurchaseOrderUseCase;
}): Router {
  const router = Router();

  router.post("/purchase-orders", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { poNumber, purchaseRequestId, supplierId, branchId, lines } = req.body ?? {};
    if (
      typeof poNumber !== "string" ||
      typeof supplierId !== "string" ||
      typeof branchId !== "string" ||
      !Array.isArray(lines) ||
      lines.length === 0
    ) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "poNumber, supplierId, branchId, and at least one line are required." });
      return;
    }
    try {
      const po = await deps.createPurchaseOrderUseCase.execute({ poNumber, purchaseRequestId, supplierId, branchId, lines });
      sendData(res, po, 201);
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof PurchaseRequestNotApprovedError) {
        sendError(res, 422, { code: "PR_NOT_APPROVED", message: err.message });
        return;
      }
      if (err instanceof PurchaseRequestAlreadyOrderedError) {
        sendError(res, 409, { code: "PR_ALREADY_ORDERED", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/purchase-orders", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    const { branchId, supplierId, status, search, skip, take } = req.query;
    const result = await deps.listPurchaseOrdersUseCase.execute(
      {
        branchId: typeof branchId === "string" ? branchId : undefined,
        supplierId: typeof supplierId === "string" ? supplierId : undefined,
        status: typeof status === "string" ? status : undefined,
        search: typeof search === "string" ? search : undefined,
      },
      { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 500) }
    );
    sendData(res, result);
  });

  router.get("/purchase-orders/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getPurchaseOrderUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/purchase-orders/:id/cancel", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      if (!deps.cancelPurchaseOrderUseCase) {
        sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Cancel purchase order not configured" });
        return;
      }
      const { reason } = req.body ?? {};
      const updated = await deps.cancelPurchaseOrderUseCase.execute(req.params.id!, req.user!.sub, reason);
      sendData(res, updated);
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to cancel purchase order";
      sendError(res, 400, { code: "CANCEL_FAILED", message });
    }
  });

  return router;
}

