import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { ListRolesUseCase, GetRolePermissionsUseCase, ListPermissionsUseCase, UpdateRolePermissionsUseCase, RoleNotFoundForPermissionsError, UnknownPermissionCodeError } from "../application/role-permission.use-cases";

// api-spec.md §11 — Role/Permission administration, "Roles: Super Admin"
// (every endpoint here, no exceptions) — systemAdmin.manage is the one
// code only Super Admin's wildcard covers among this platform's roles
// (prd.md §6.1's matrix: every other role has at most `systemAdmin: R`,
// i.e. systemAdmin.view, never .manage).
export function createRoleRouter(deps: {
  listRolesUseCase: ListRolesUseCase;
  getRolePermissionsUseCase: GetRolePermissionsUseCase;
  listPermissionsUseCase: ListPermissionsUseCase;
  updateRolePermissionsUseCase: UpdateRolePermissionsUseCase;
}): Router {
  const router = Router();

  router.get("/roles", requirePermission("systemAdmin.manage"), async (_req: Request, res: Response) => {
    const roles = await deps.listRolesUseCase.execute();
    sendData(res, roles);
  });

  router.get("/roles/:id/permissions", requirePermission("systemAdmin.manage"), async (req: Request, res: Response) => {
    const codes = await deps.getRolePermissionsUseCase.execute(req.params.id!);
    sendData(res, { roleId: req.params.id, permissionCodes: codes });
  });

  router.patch("/roles/:id/permissions", requirePermission("systemAdmin.manage"), async (req: Request, res: Response) => {
    const { permissionCodes } = req.body ?? {};
    if (!Array.isArray(permissionCodes) || !permissionCodes.every((c) => typeof c === "string")) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "permissionCodes must be an array of strings." });
      return;
    }
    try {
      await deps.updateRolePermissionsUseCase.execute(req.params.id!, permissionCodes, req.user!.sub);
      sendData(res, { roleId: req.params.id, permissionCodes });
    } catch (err) {
      if (err instanceof RoleNotFoundForPermissionsError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof UnknownPermissionCodeError) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/permissions", requirePermission("systemAdmin.manage"), async (_req: Request, res: Response) => {
    const codes = await deps.listPermissionsUseCase.execute();
    sendData(res, codes);
  });

  return router;
}
