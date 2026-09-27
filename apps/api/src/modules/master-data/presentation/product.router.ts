import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import { CreateProductUseCase, GetProductUseCase, ListProductsUseCase, UpdateProductUseCase, DeleteProductUseCase } from "../application/product.use-cases";
import { SimpleMasterDataNotFoundError, EntityInUseError, DuplicateKeyError } from "../domain/simple-master-data.types";

function isPrismaUniqueConstraint(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

export function createProductRouter(deps: {
  createProductUseCase: CreateProductUseCase;
  getProductUseCase: GetProductUseCase;
  listProductsUseCase: ListProductsUseCase;
  updateProductUseCase: UpdateProductUseCase;
  deleteProductUseCase: DeleteProductUseCase;
}): Router {
  const router = Router();

  router.post("/products", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    const { sku, name, categoryId, subCategoryId, brandId, unitId, costPrice, sellingPrice, isServiceItem, trackingType, modelNumber, barcode } = req.body ?? {};
    if (![sku, name, costPrice, sellingPrice].every((v) => typeof v === "string" && v.length > 0)) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "sku, name, costPrice, and sellingPrice are required." });
      return;
    }
    try {
      const product = await deps.createProductUseCase.execute({
        sku,
        name,
        categoryId,
        subCategoryId,
        brandId,
        unitId,
        costPrice,
        sellingPrice,
        isServiceItem,
        trackingType: trackingType === "SERIALIZED" ? "SERIALIZED" : "NON_SERIALIZED",
        modelNumber: typeof modelNumber === "string" ? modelNumber : undefined,
        barcode: typeof barcode === "string" ? barcode : undefined,
      });
      sendData(res, product, 201);
    } catch (err: unknown) {
      if (err instanceof DuplicateKeyError) {
        sendError(res, 409, { code: "DUPLICATE_SKU", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE_SKU", message: "A product with this SKU or barcode already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create product";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/products", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { categoryId, subCategoryId, brandId, trackingType, isActive, isServiceItem, search, skip, take } = req.query;
      const result = await deps.listProductsUseCase.execute(
        {
          categoryId: typeof categoryId === "string" ? categoryId : undefined,
          subCategoryId: typeof subCategoryId === "string" ? subCategoryId : undefined,
          brandId: typeof brandId === "string" ? brandId : undefined,
          trackingType: trackingType === "SERIALIZED" || trackingType === "NON_SERIALIZED" ? trackingType : undefined,
          isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
          isServiceItem: isServiceItem === "true" ? true : isServiceItem === "false" ? false : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 500) }
      );
      sendData(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list products";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/products/:id", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getProductUseCase.execute(req.params.id!));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to get product";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.patch("/products/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.updateProductUseCase.execute(req.params.id!, req.body ?? {}));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof DuplicateKeyError) {
        sendError(res, 409, { code: "DUPLICATE_SKU", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE_SKU", message: "A product with this SKU already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update product";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.delete("/products/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      await deps.deleteProductUseCase.execute(req.params.id!);
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
      const message = err instanceof Error ? err.message : "Failed to delete product";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  return router;
}
