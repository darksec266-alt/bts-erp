import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission, isSuperAdminUser } from "../../../shared/security/require-permission.middleware";
import { CreatePurchaseReturnUseCase, GetPurchaseReturnUseCase, ApprovePurchaseReturnUseCase, RejectPurchaseReturnUseCase } from "../application/purchase-return.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import { SelfApprovalError, ApprovalAlreadyResolvedError, ApprovalRequestNotFoundError } from "../../../shared/approval/approval.service";

export function createPurchaseReturnRouter(deps: {
  createPurchaseReturnUseCase: CreatePurchaseReturnUseCase;
  getPurchaseReturnUseCase: GetPurchaseReturnUseCase;
  approvePurchaseReturnUseCase: ApprovePurchaseReturnUseCase;
  rejectPurchaseReturnUseCase: RejectPurchaseReturnUseCase;
}): Router {
  const router = Router();

  router.post("/purchase-returns", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { returnNumber, grnId, reason, lines } = req.body ?? {};
    if (typeof returnNumber !== "string" || typeof grnId !== "string" || typeof reason !== "string" || !Array.isArray(lines) || lines.length === 0) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "returnNumber, grnId, reason, and at least one line are required." });
      return;
    }
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      const result = await deps.createPurchaseReturnUseCase.execute(
        { returnNumber, grnId, reason, createdById: req.user!.sub, lines },
        isSuperAdmin
      );
      sendData(res, result, 201);
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/purchase-returns/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getPurchaseReturnUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/purchase-returns/:id/approve", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      await deps.approvePurchaseReturnUseCase.execute(req.params.id!, req.user!.sub, isSuperAdmin);
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

  router.post("/purchase-returns/:id/reject", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      await deps.rejectPurchaseReturnUseCase.execute(req.params.id!, req.user!.sub, isSuperAdmin);
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
