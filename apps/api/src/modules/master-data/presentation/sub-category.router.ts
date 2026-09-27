import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import type {
  CreateSubCategoryUseCase,
  GetSubCategoryUseCase,
  ListSubCategoriesUseCase,
  UpdateSubCategoryUseCase,
  DeleteSubCategoryUseCase,
} from "../application/sub-category.use-cases";
import {
  DuplicateSubCategoryError,
  SubCategoryNotFoundError,
  SubCategoryInUseError,
} from "../domain/sub-category.types";

function isPrismaUniqueConstraint(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

export function createSubCategoryRouter(deps: {
  createSubCategoryUseCase: CreateSubCategoryUseCase;
  getSubCategoryUseCase: GetSubCategoryUseCase;
  listSubCategoriesUseCase: ListSubCategoriesUseCase;
  updateSubCategoryUseCase: UpdateSubCategoryUseCase;
  deleteSubCategoryUseCase: DeleteSubCategoryUseCase;
}): Router {
  const router = Router();

  router.post("/sub-categories", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { name, categoryId } = req.body ?? {};
      if (typeof name !== "string" || name.trim().length === 0) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: "name is required." });
        return;
      }
      if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
        sendError(res, 422, { code: "VALIDATION_ERROR", message: "categoryId is required." });
        return;
      }
      const record = await deps.createSubCategoryUseCase.execute({ name: name.trim(), categoryId: categoryId.trim() });
      sendData(res, record, 201);
    } catch (err: unknown) {
      if (err instanceof DuplicateSubCategoryError || isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: err instanceof Error ? err.message : "A sub-category with this name already exists in this category." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create sub-category";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/sub-categories", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { categoryId, isActive, search, skip, take } = req.query;
      const result = await deps.listSubCategoriesUseCase.execute(
        {
          categoryId: typeof categoryId === "string" ? categoryId : undefined,
          isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        { skip: Number(skip) || 0, take: Math.min(Number(take) || 50, 200) }
      );
      sendData(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list sub-categories";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/sub-categories/:id", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getSubCategoryUseCase.execute(req.params.id!));
    } catch (err: unknown) {
      if (err instanceof SubCategoryNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to get sub-category";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.patch("/sub-categories/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { name, categoryId, isActive } = req.body ?? {};
      const record = await deps.updateSubCategoryUseCase.execute(req.params.id!, {
        name: typeof name === "string" ? name : undefined,
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      });
      sendData(res, record);
    } catch (err: unknown) {
      if (err instanceof SubCategoryNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof DuplicateSubCategoryError || isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: err instanceof Error ? err.message : "A sub-category with this name already exists in this category." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update sub-category";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.delete("/sub-categories/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      await deps.deleteSubCategoryUseCase.execute(req.params.id!);
      sendData(res, { deleted: true });
    } catch (err: unknown) {
      if (err instanceof SubCategoryNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof SubCategoryInUseError) {
        sendError(res, 422, { code: "ENTITY_IN_USE", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to delete sub-category";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  return router;
}
