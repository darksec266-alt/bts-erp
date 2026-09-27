import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { RecordSupplierPaymentUseCase } from "../application/supplier-payment.use-case";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

// api-spec.md §14: "POST /purchase-invoices/:id/payments — requires
// Idempotency-Key (§7) since it's a financial write."
export function createSupplierPaymentRouter(deps: { recordSupplierPaymentUseCase: RecordSupplierPaymentUseCase }): Router {
  const router = Router();

  router.post("/purchase-invoices/:id/payments", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { amount, method } = req.body ?? {};
    const idempotencyKey = req.header("Idempotency-Key");
    if (typeof amount !== "string" || typeof method !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "amount and method are required." });
      return;
    }
    if (!idempotencyKey) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "Idempotency-Key header is required for this financial write (api-spec.md §7)." });
      return;
    }
    try {
      const payment = await deps.recordSupplierPaymentUseCase.execute({ purchaseInvoiceId: req.params.id!, amount, method, idempotencyKey });
      sendData(res, payment, 201);
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
