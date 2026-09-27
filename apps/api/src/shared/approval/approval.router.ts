import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../http";
import { ApprovalService, SelfApprovalError, ApprovalRequestNotFoundError, ApprovalAlreadyResolvedError } from "./approval.service";
import { isSuperAdminUser } from "../security/require-permission.middleware";

// api-spec.md §18: "POST /approvals/:id/approve" / "/reject" — the generic
// actions every domain's approval flow resolves through. The full inbox
// endpoint (`GET /approvals`, filtered to the calling user's own queue) is
// Phase 9's job (prompt.md §193); these two actions can't wait that long
// since Phase 4's PurchaseRequest/GRN-discrepancy flows need them now.
export function createApprovalRouter(approvalService: ApprovalService): Router {
  const router = Router();

  router.post("/approvals/:id/approve", async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      const result = await approvalService.approve(req.params.id!, req.user!.sub, isSuperAdmin);
      sendData(res, result);
    } catch (err) {
      if (err instanceof SelfApprovalError) {
        sendError(res, 409, { code: "SELF_APPROVAL", message: err.message });
        return;
      }
      if (err instanceof ApprovalRequestNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof ApprovalAlreadyResolvedError) {
        sendError(res, 409, { code: "ALREADY_RESOLVED", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/approvals/:id/reject", async (req: Request, res: Response) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user);
      const result = await approvalService.reject(req.params.id!, req.user!.sub, isSuperAdmin);
      sendData(res, result);
    } catch (err) {
      if (err instanceof SelfApprovalError) {
        sendError(res, 409, { code: "SELF_APPROVAL", message: err.message });
        return;
      }
      if (err instanceof ApprovalRequestNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
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
