import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission, isSuperAdminUser } from "../../../shared/security/require-permission.middleware";
import { CreatePurchaseRequestUseCase, GetPurchaseRequestUseCase, ListPurchaseRequestsUseCase, ApprovePurchaseRequestUseCase, RejectPurchaseRequestUseCase } from "../application/purchase-request.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import { SelfApprovalError, ApprovalAlreadyResolvedError, ApprovalRequestNotFoundError } from "../../../shared/approval/approval.service";

export function createPurchaseRequestRouter(deps: {
  createPurchaseRequestUseCase: CreatePurchaseRequestUseCase;
  getPurchaseRequestUseCase: GetPurchaseRequestUseCase;
  listPurchaseRequestsUseCase: ListPurchaseRequestsUseCase;
  approvePurchaseRequestUseCase: ApprovePurchaseRequestUseCase;
  rejectPurchaseRequestUseCase: RejectPurchaseRequestUseCase;
}): Router {
  const router = Router();

  router.post("/purchase-requests", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { requestNumber, branchId, lines } = req.body ?? {};
    if (typeof requestNumber !== "string" || typeof branchId !== "string" || !Array.isArray(lines) || lines.length === 0) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "requestNumber, branchId, and at least one line are required." });
      return;
    }
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      const result = await deps.createPurchaseRequestUseCase.execute(
        { requestNumber, branchId, requestedById: req.user!.sub, lines },
        isSuperAdmin
      );
      sendData(res, result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create purchase request";
      sendError(res, 500, { code: "CREATE_FAILED", message });
    }
  });

  router.get("/purchase-requests", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    const { branchId, status, skip, take } = req.query;
    const result = await deps.listPurchaseRequestsUseCase.execute(
      { branchId: typeof branchId === "string" ? branchId : undefined, status: typeof status === "string" ? status : undefined },
      { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 100) }
    );
    sendData(res, result);
  });

  router.get("/purchase-requests/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getPurchaseRequestUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/purchase-requests/:id/approve", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      await deps.approvePurchaseRequestUseCase.execute(req.params.id!, req.user!.sub, isSuperAdmin);
      sendData(res, { approved: true });
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError || err instanceof ApprovalRequestNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof SelfApprovalError) {
        sendError(res, 409, { code: "SELF_APPROVAL", message: err.message });
        return;
      }
      if (err instanceof ApprovalAlreadyResolvedError) {
        sendError(res, 409, { code: "ALREADY_RESOLVED", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/purchase-requests/:id/reject", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      await deps.rejectPurchaseRequestUseCase.execute(req.params.id!, req.user!.sub, isSuperAdmin);
      sendData(res, { rejected: true });
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError || err instanceof ApprovalRequestNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof SelfApprovalError) {
        sendError(res, 409, { code: "SELF_APPROVAL", message: err.message });
        return;
      }
      if (err instanceof ApprovalAlreadyResolvedError) {
        sendError(res, 409, { code: "ALREADY_RESOLVED", message: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
