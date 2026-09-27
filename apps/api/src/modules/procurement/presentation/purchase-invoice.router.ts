import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreatePurchaseInvoiceUseCase, GetPurchaseInvoiceUseCase } from "../application/purchase-invoice.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

export function createPurchaseInvoiceRouter(deps: {
  createPurchaseInvoiceUseCase: CreatePurchaseInvoiceUseCase;
  getPurchaseInvoiceUseCase: GetPurchaseInvoiceUseCase;
}): Router {
  const router = Router();

  router.post("/purchase-invoices", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { invoiceNumber, purchaseOrderId, grnId, grandTotal } = req.body ?? {};
    const idempotencyKey = req.header("Idempotency-Key");
    if (typeof invoiceNumber !== "string" || typeof purchaseOrderId !== "string" || typeof grandTotal !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "invoiceNumber, purchaseOrderId, and grandTotal are required." });
      return;
    }
    if (!idempotencyKey) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "Idempotency-Key header is required for this financial write (api-spec.md §7)." });
      return;
    }
    try {
      const invoice = await deps.createPurchaseInvoiceUseCase.execute({ invoiceNumber, purchaseOrderId, grnId, grandTotal, idempotencyKey });
      sendData(res, invoice, 201);
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/purchase-invoices/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getPurchaseInvoiceUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
