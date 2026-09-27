import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreateCustomerUseCase, DuplicatePhoneError, GetCustomerUseCase, ListCustomersUseCase, UpdateCustomerUseCase, AddCustomerAddressUseCase, DeleteCustomerUseCase } from "../application/customer.use-cases";
import { SimpleMasterDataNotFoundError, EntityInUseError } from "../domain/simple-master-data.types";

function isPrismaUniqueConstraint(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

// prd.md §8.2 / api-spec.md §13. "R" on masterData (e.g. Sales Executive,
// prd.md §6.1) can look customers up but not create/edit/delete them —
// same view/manage split as modules/master-data's generic six resources.
export function createCustomerRouter(deps: {
  createCustomerUseCase: CreateCustomerUseCase;
  getCustomerUseCase: GetCustomerUseCase;
  listCustomersUseCase: ListCustomersUseCase;
  updateCustomerUseCase: UpdateCustomerUseCase;
  addCustomerAddressUseCase: AddCustomerAddressUseCase;
  deleteCustomerUseCase: DeleteCustomerUseCase;
}): Router {
  const router = Router();

  router.post("/customers", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    const { customerCode, displayName, phone, branchId, isServiceOnly, addresses } = req.body ?? {};
    if (![customerCode, displayName, phone, branchId].every((v) => typeof v === "string" && v.length > 0)) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "customerCode, displayName, phone, and branchId are required." });
      return;
    }
    try {
      const customer = await deps.createCustomerUseCase.execute({ customerCode, displayName, phone, branchId, isServiceOnly, addresses });
      sendData(res, customer, 201);
    } catch (err: unknown) {
      if (err instanceof DuplicatePhoneError) {
        sendError(res, 409, { code: "DUPLICATE_PHONE", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: "A customer with this code or phone number already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/customers", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { branchId, isActive, isServiceOnly, search, skip, take } = req.query;
      const result = await deps.listCustomersUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
          isServiceOnly: isServiceOnly === "true" ? true : isServiceOnly === "false" ? false : undefined,
          search: typeof search === "string" && search.trim().length > 0 ? search.trim() : undefined,
        },
        { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 100) }
      );
      sendData(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list customers";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/customers/:id", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getCustomerUseCase.execute(req.params.id!));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to get customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.patch("/customers/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.updateCustomerUseCase.execute(req.params.id!, req.body ?? {}));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof DuplicatePhoneError) {
        sendError(res, 409, { code: "DUPLICATE_PHONE", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: "A customer with this code or phone number already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.post("/customers/:id/addresses", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    const { label, addressLine } = req.body ?? {};
    if (typeof label !== "string" || typeof addressLine !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "label and addressLine are required." });
      return;
    }
    try {
      sendData(res, await deps.addCustomerAddressUseCase.execute(req.params.id!, { label, addressLine }), 201);
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to add address";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.delete("/customers/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      await deps.deleteCustomerUseCase.execute(req.params.id!);
      sendData(res, { deleted: true });
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof EntityInUseError) {
        sendError(res, 422, { code: "ENTITY_IN_USE", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to delete customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  return router;
}
