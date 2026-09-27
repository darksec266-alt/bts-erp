import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreateSupplierUseCase, GetSupplierUseCase, ListSuppliersUseCase, UpdateSupplierUseCase, AddSupplierContactUseCase, DeleteSupplierUseCase } from "../application/supplier.use-cases";
import { SimpleMasterDataNotFoundError, EntityInUseError, DuplicateKeyError } from "../../master-data/domain/simple-master-data.types";

// prd.md §8.3 / api-spec.md §13. procurement.manage / procurement.view —
// prd.md §6.1's matrix places Supplier under Procurement, not Master Data,
// unlike Customer/Product.
export function createSupplierRouter(deps: {
  createSupplierUseCase: CreateSupplierUseCase;
  getSupplierUseCase: GetSupplierUseCase;
  listSuppliersUseCase: ListSuppliersUseCase;
  updateSupplierUseCase: UpdateSupplierUseCase;
  addSupplierContactUseCase: AddSupplierContactUseCase;
  deleteSupplierUseCase: DeleteSupplierUseCase;
}): Router {
  const router = Router();

  router.post("/suppliers", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { supplierCode, companyName, contacts } = req.body ?? {};
    if (![supplierCode, companyName].every((v) => typeof v === "string" && v.length > 0)) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "supplierCode and companyName are required." });
      return;
    }
    try {
      sendData(res, await deps.createSupplierUseCase.execute({ supplierCode, companyName, contacts }), 201);
    } catch (err) {
      if (err instanceof DuplicateKeyError) {
        sendError(res, 409, { code: "DUPLICATE", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.get("/suppliers", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    const { isActive, search, skip, take } = req.query;
    const result = await deps.listSuppliersUseCase.execute(
      {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        search: typeof search === "string" ? search : undefined,
      },
      { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 100) }
    );
    sendData(res, result);
  });

  router.get("/suppliers/:id", requirePermission("procurement.view", "procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getSupplierUseCase.execute(req.params.id!));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.patch("/suppliers/:id", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.updateSupplierUseCase.execute(req.params.id!, req.body ?? {}));
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.post("/suppliers/:id/contacts", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    const { name, phone, isPrimary } = req.body ?? {};
    if (typeof name !== "string" || typeof phone !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "name and phone are required." });
      return;
    }
    try {
      sendData(res, await deps.addSupplierContactUseCase.execute(req.params.id!, { name, phone, isPrimary }), 201);
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      throw err;
    }
  });

  router.delete("/suppliers/:id", requirePermission("procurement.manage"), async (req: Request, res: Response) => {
    try {
      await deps.deleteSupplierUseCase.execute(req.params.id!);
      sendData(res, { deleted: true });
    } catch (err) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof EntityInUseError) {
        sendError(res, 422, { code: "ENTITY_IN_USE", message: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
