import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import type { SimpleMasterDataUseCases } from "../application/simple-master-data.use-cases";
import { DuplicateKeyError, SimpleMasterDataNotFoundError, EntityInUseError } from "../domain/simple-master-data.types";
import type { SimpleMasterDataRecord } from "../domain/simple-master-data.types";

export interface SimpleMasterDataRouterConfig {
  path: string; // e.g. "categories" -> mounted at /categories
  requiresCode: boolean; // true for Unit/Warehouse
  managePermission: string; // required for POST/PATCH/DELETE
  viewPermission: string; // required for GET (list/one) — a role with only "R" on this functional area (e.g. Sales Executive on masterData, prd.md §6.1) can still look products up without being able to edit them
}

// api-spec.md §13's one CRUD template, applied by every call site in
// index.ts to a different (useCases, config) pair — see that file for the
// six resources instantiated this way (Category, Brand, Unit, Warehouse,
// Department, TaxRate). Customer and Product are NOT built from this
// factory — they're richer than this shape and get their own routers.
export function createSimpleMasterDataRouter<T extends SimpleMasterDataRecord>(
  useCases: SimpleMasterDataUseCases<T>,
  config: SimpleMasterDataRouterConfig
): Router {
  const router = Router();
  const base = `/${config.path}`;

  router.post(base, requirePermission(config.managePermission), async (req: Request, res: Response) => {
    try {
      const { name, code, ratePercent } = req.body ?? {};
      if (typeof name !== "string" || name.length === 0) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: "name is required." });
        return;
      }
      if (config.requiresCode && (typeof code !== "string" || code.length === 0)) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: "code is required." });
        return;
      }
      const record = await useCases.create({
        name,
        code,
        ratePercent: ratePercent !== undefined ? Number(ratePercent) : undefined,
      });
      sendData(res, record, 201);
    } catch (err: unknown) {
      if (err instanceof DuplicateKeyError) {
        sendError(res, 409, { code: "DUPLICATE", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create record";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get(base, requirePermission(config.viewPermission, config.managePermission), async (req: Request, res: Response) => {
    try {
      const { isActive, skip, take } = req.query;
      const result = await useCases.list(
        isActive === "true" ? true : isActive === "false" ? false : undefined,
        { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 100) }
      );
      sendData(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list records";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get(`${base}/:id`, requirePermission(config.viewPermission, config.managePermission), async (req: Request, res: Response) => {
    try {
      sendData(res, await useCases.get(req.params.id!));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to get record";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.patch(`${base}/:id`, requirePermission(config.managePermission), async (req: Request, res: Response) => {
    try {
      sendData(res, await useCases.update(req.params.id!, req.body ?? {}));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof DuplicateKeyError) {
        sendError(res, 409, { code: "DUPLICATE", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update record";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.delete(`${base}/:id`, requirePermission(config.managePermission), async (req: Request, res: Response) => {
    try {
      await useCases.delete(req.params.id!);
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
      const message = err instanceof Error ? err.message : "Failed to delete record";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  return router;
}
