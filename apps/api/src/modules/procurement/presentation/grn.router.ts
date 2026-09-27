import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission, isSuperAdminUser } from "../../../shared/security/require-permission.middleware";
import {
  ReceiveGoodsUseCase,
  GetGrnUseCase,
  ListGrnsUseCase,
  ApproveGrnDiscrepancyUseCase,
  UpdateGrnStatusUseCase,
  CancelGrnUseCase,
} from "../application/grn.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";

// api-spec.md §14: "POST /purchase-orders/:id/receive — records a
// GoodsReceiptNote." Nested under /purchase-orders (not a standalone
// POST /grns) since a GRN only ever exists in reference to one specific PO
// — the URL's :id supplies purchaseOrderId directly, the body never
// repeats it.
export function createGrnRouter(deps: {
  receiveGoodsUseCase: ReceiveGoodsUseCase;
  getGrnUseCase: GetGrnUseCase;
  listGrnsUseCase: ListGrnsUseCase;
  approveGrnDiscrepancyUseCase?: ApproveGrnDiscrepancyUseCase;
  updateGrnStatusUseCase?: UpdateGrnStatusUseCase;
  cancelGrnUseCase?: CancelGrnUseCase;
}): Router {
  const router = Router();

  router.post("/purchase-orders/:id/receive", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { grnNumber, status, lines, warehouseId } = req.body ?? {};
    if (
      typeof grnNumber !== "string" ||
      !["COMPLETE", "PARTIAL", "DISCREPANT", "DRAFT"].includes(status) ||
      !Array.isArray(lines) ||
      lines.length === 0
    ) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "grnNumber, a valid status (COMPLETE/PARTIAL/DISCREPANT/DRAFT), and at least one line are required." });
      return;
    }
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      const grn = await deps.receiveGoodsUseCase.execute(
        {
          grnNumber,
          purchaseOrderId: req.params.id!,
          status,
          receivedById: req.user!.sub,
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          lines,
        },
        isSuperAdmin
      );
      sendData(res, grn, 201);
    } catch (err: any) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      sendError(res, 422, { code: "VALIDATION_ERROR", message: err.message || "Failed to receive goods." });
    }
  });

  router.get("/grns", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    const { purchaseOrderId, status, skip, take } = req.query;
    const result = await deps.listGrnsUseCase.execute(
      { purchaseOrderId: typeof purchaseOrderId === "string" ? purchaseOrderId : undefined, status: typeof status === "string" ? status : undefined },
      { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 500) }
    );
    sendData(res, result);
  });

  router.get("/grns/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getGrnUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/grns/:id/approve", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      if (!deps.approveGrnDiscrepancyUseCase) {
        sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Discrepancy approval not available." });
        return;
      }
      const isSuperAdmin = isSuperAdminUser(req.user);
      const grn = await deps.approveGrnDiscrepancyUseCase.execute(req.params.id!, req.user!.sub, isSuperAdmin);
      sendData(res, grn);
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.patch("/grns/:id/status", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      const { status } = req.body ?? {};
      if (!status || !["COMPLETE", "PARTIAL", "DISCREPANT", "DRAFT", "CANCELLED"].includes(status)) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: "Valid status required." });
        return;
      }
      if (!deps.updateGrnStatusUseCase) {
        sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Status update not available." });
        return;
      }
      const grn = await deps.updateGrnStatusUseCase.execute(req.params.id!, status);
      sendData(res, grn);
    } catch (err: any) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      sendError(res, 422, { code: "VALIDATION_ERROR", message: err.message || "Failed to update status." });
    }
  });

  router.post("/grns/:id/cancel", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      if (!deps.cancelGrnUseCase) {
        sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Cancellation not available." });
        return;
      }
      const { reason } = req.body ?? {};
      const grn = await deps.cancelGrnUseCase.execute(req.params.id!, req.user!.sub, reason);
      sendData(res, grn);
    } catch (err: any) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      sendError(res, 400, { code: "CANCEL_FAILED", message: err.message || "Failed to cancel goods receipt note." });
    }
  });

  return router;
}
