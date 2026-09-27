import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreateEmployeeUseCase, DuplicateNidError, GetEmployeeUseCase, EmployeeNotFoundError, GetMyEmployeeUseCase, ListEmployeesUseCase, UpdateEmployeeUseCase } from "../application/employee.use-cases";
import { ProvisionUserUseCase, DeactivateUserUseCase, RoleNotFoundError, UserAlreadyProvisionedError } from "../application/provision-and-deactivate-user.use-case";

// api-spec.md §12 — User & Employee API. `authenticate` (app.ts mounts it
// ahead of every /api/v1 route once wired — see server.ts) has already run
// by the time any handler here executes, so req.user is always present.
export function createEmployeeRouter(deps: {
  createEmployeeUseCase: CreateEmployeeUseCase;
  getEmployeeUseCase: GetEmployeeUseCase;
  getMyEmployeeUseCase: GetMyEmployeeUseCase;
  listEmployeesUseCase: ListEmployeesUseCase;
  updateEmployeeUseCase: UpdateEmployeeUseCase;
  provisionUserUseCase: ProvisionUserUseCase;
  deactivateUserUseCase: DeactivateUserUseCase;
}): Router {
  const router = Router();

  // api-spec.md §12: "Roles: HR/Payroll Officer, Admin, Super Admin" — the
  // seed's hrWorkforce.manage code is exactly that set (prompt.md/prd.md
  // §6.1's matrix: HR_PAYROLL and ADMIN both get F on hrWorkforce, Super
  // Admin has the wildcard).
  router.post("/employees", requirePermission("hrWorkforce.manage"), async (req: Request, res: Response) => {
    const { employeeCode, fullName, nidNumber, branchId, departmentId } = req.body ?? {};
    if (![employeeCode, fullName, nidNumber, branchId].every((v) => typeof v === "string" && v.length > 0)) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "employeeCode, fullName, nidNumber, and branchId are required." });
      return;
    }
    try {
      const employee = await deps.createEmployeeUseCase.execute({ employeeCode, fullName, nidNumber, branchId, departmentId });
      sendData(res, employee, 201);
    } catch (err) {
      if (err instanceof DuplicateNidError) {
        sendError(res, 409, { code: "DUPLICATE_NID", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/employees", requirePermission("hrWorkforce.manage", "hrWorkforce.view"), async (req: Request, res: Response) => {
    const { branchId, departmentId, isActive, skip, take } = req.query;
    const result = await deps.listEmployeesUseCase.execute(
      {
        branchId: typeof branchId === "string" ? branchId : undefined,
        departmentId: typeof departmentId === "string" ? departmentId : undefined,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      },
      { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 100) }
    );
    sendData(res, result);
  });

  // Must be registered before "/employees/:id" — otherwise Express would
  // try to look up an employee literally named "me".
  router.get("/employees/me", async (req: Request, res: Response) => {
    const employee = await deps.getMyEmployeeUseCase.execute(req.user!.sub);
    sendData(res, employee); // null is a valid, expected response here — see GetMyEmployeeUseCase's own comment
  });

  router.get("/employees/:id", requirePermission("hrWorkforce.manage", "hrWorkforce.view"), async (req: Request, res: Response) => {
    try {
      const employee = await deps.getEmployeeUseCase.execute(req.params.id!);
      sendData(res, employee);
    } catch (err) {
      if (err instanceof EmployeeNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  // api-spec.md §12's own note: PATCH after the record leaves draft should
  // route through the Edit Request flow (§18) once Phase 9 exists — see
  // UpdateEmployeeUseCase's own comment for why this is still a direct
  // write today.
  router.patch("/employees/:id", requirePermission("hrWorkforce.manage"), async (req: Request, res: Response) => {
    try {
      const employee = await deps.updateEmployeeUseCase.execute(req.params.id!, req.body ?? {}, req.user!.sub);
      sendData(res, employee);
    } catch (err) {
      if (err instanceof EmployeeNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  // api-spec.md §12: "Roles: Admin, Super Admin" — identity.manage (not
  // hrWorkforce) since provisioning a login is Identity & Access territory,
  // distinct from owning the Employee record itself.
  router.post("/employees/:id/provision-user", requirePermission("identity.manage"), async (req: Request, res: Response) => {
    const { email, roleName } = req.body ?? {};
    if (typeof email !== "string" || typeof roleName !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "email and roleName are required." });
      return;
    }
    try {
      const result = await deps.provisionUserUseCase.execute(req.params.id!, email, roleName, req.user!.sub);
      sendData(res, result, 201);
    } catch (err) {
      if (err instanceof EmployeeNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof UserAlreadyProvisionedError) {
        sendError(res, 409, { code: "ALREADY_PROVISIONED", message: err.message });
        return;
      }
      if (err instanceof RoleNotFoundError) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.patch("/users/:id/deactivate", requirePermission("identity.manage"), async (req: Request, res: Response) => {
    await deps.deactivateUserUseCase.execute(req.params.id!, req.user!.sub);
    sendData(res, { deactivated: true });
  });

  return router;
}
