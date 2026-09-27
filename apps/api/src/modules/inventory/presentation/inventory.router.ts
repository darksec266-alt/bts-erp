import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import type {
  ListStockUseCase,
  GetInventoryStatsUseCase,
  CreateStockAdjustmentUseCase,
  ListStockAdjustmentsUseCase,
  CreateStockTransferUseCase,
  ReceiveStockTransferUseCase,
  ListStockTransfersUseCase,
  CreateBatchUseCase,
  ListBatchesUseCase,
  CreateSerialNumberUseCase,
  GetSerialHistoryUseCase,
  ListSerialNumbersUseCase,
  ScanBarcodeUseCase,
  CreateDamageLossReportUseCase,
  ApproveDamageLossReportUseCase,
  ListDamageLossReportsUseCase,
} from "../application/inventory.use-cases";

export interface InventoryRouterDependencies {
  listStockUseCase: ListStockUseCase;
  getInventoryStatsUseCase: GetInventoryStatsUseCase;
  createStockAdjustmentUseCase: CreateStockAdjustmentUseCase;
  listStockAdjustmentsUseCase: ListStockAdjustmentsUseCase;
  createStockTransferUseCase: CreateStockTransferUseCase;
  receiveStockTransferUseCase: ReceiveStockTransferUseCase;
  listStockTransfersUseCase: ListStockTransfersUseCase;
  createBatchUseCase: CreateBatchUseCase;
  listBatchesUseCase: ListBatchesUseCase;
  createSerialNumberUseCase: CreateSerialNumberUseCase;
  getSerialHistoryUseCase: GetSerialHistoryUseCase;
  listSerialNumbersUseCase: ListSerialNumbersUseCase;
  scanBarcodeUseCase: ScanBarcodeUseCase;
  createDamageLossReportUseCase: CreateDamageLossReportUseCase;
  approveDamageLossReportUseCase: ApproveDamageLossReportUseCase;
  listDamageLossReportsUseCase: ListDamageLossReportsUseCase;
}

export function createInventoryRouter(deps: InventoryRouterDependencies): Router {
  const router = Router();

  // -------------------------------------------------------------
  // 1. Stock Overview & Stats
  // -------------------------------------------------------------
  router.get(
    "/inventory/stock",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { warehouseId, productId, belowReorderPoint, search, skip, take } = req.query;
        const result = await deps.listStockUseCase.execute({
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          productId: typeof productId === "string" ? productId : undefined,
          belowReorderPoint: belowReorderPoint === "true",
          search: typeof search === "string" ? search : undefined,
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 50, 100),
        });
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list stock",
        });
      }
    }
  );

  router.get(
    "/inventory/stats",
    requirePermission("inventory.view", "inventory.manage"),
    async (_req: Request, res: Response) => {
      try {
        const stats = await deps.getInventoryStatsUseCase.execute();
        sendData(res, stats);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch inventory stats",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // 2. Stock Adjustments
  // -------------------------------------------------------------
  router.get(
    "/inventory/stock-adjustments",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { warehouseId, productId, skip, take } = req.query;
        const result = await deps.listStockAdjustmentsUseCase.execute({
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          productId: typeof productId === "string" ? productId : undefined,
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        });
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list stock adjustments",
        });
      }
    }
  );

  router.post(
    "/inventory/stock-adjustments",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.sub || "system";
        const created = await deps.createStockAdjustmentUseCase.execute(userId, req.body);
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "ADJUSTMENT_FAILED",
          message: err instanceof Error ? err.message : "Failed to create stock adjustment",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // 3. Stock Transfers
  // -------------------------------------------------------------
  router.get(
    "/inventory/stock-transfers",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { status, warehouseId, skip, take } = req.query;
        const result = await deps.listStockTransfersUseCase.execute({
          status: typeof status === "string" ? status : undefined,
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        });
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list stock transfers",
        });
      }
    }
  );

  router.post(
    "/inventory/stock-transfers",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const created = await deps.createStockTransferUseCase.execute(req.body);
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "TRANSFER_FAILED",
          message: err instanceof Error ? err.message : "Failed to create stock transfer",
        });
      }
    }
  );

  router.post(
    "/inventory/stock-transfers/:id/receive",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const received = await deps.receiveStockTransferUseCase.execute(req.params.id!, req.body);
        sendData(res, received, 200);
      } catch (err) {
        sendError(res, 400, {
          code: "RECEIVE_FAILED",
          message: err instanceof Error ? err.message : "Failed to receive stock transfer",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // 4. Batches
  // -------------------------------------------------------------
  router.get(
    "/inventory/batches",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { productId } = req.query;
        const result = await deps.listBatchesUseCase.execute(
          typeof productId === "string" ? productId : undefined
        );
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list batches",
        });
      }
    }
  );

  router.post(
    "/inventory/batches",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const created = await deps.createBatchUseCase.execute(req.body);
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "BATCH_CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create batch",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Unified Barcode & Serial Scanner Engine
  // -------------------------------------------------------------
  router.post(
    "/inventory/scan",
    requirePermission("inventory.view", "inventory.manage", "sales.manage", "procurement.manage"),
    async (req: Request, res: Response) => {
      try {
        const { code, barcode, warehouseId, intendedOperation, operationType } = req.body ?? {};
        const queryCode = (code || barcode)?.toString().trim();
        if (!queryCode) {
          sendError(res, 422, {
            code: "VALIDATION_ERROR",
            message: "code or barcode is required",
          });
          return;
        }

        const result = await deps.scanBarcodeUseCase.execute({
          code: queryCode,
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          intendedOperation: typeof intendedOperation === "string" ? (intendedOperation as any) : undefined,
        });

        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to scan barcode",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // 5. Serial Numbers & Lifecycle History
  // -------------------------------------------------------------
  router.get(
    "/inventory/serial-numbers",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { productId, warehouseId, stage, search, skip, take } = req.query;
        const result = await deps.listSerialNumbersUseCase.execute({
          productId: typeof productId === "string" ? productId : undefined,
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          stage: typeof stage === "string" ? stage : undefined,
          search: typeof search === "string" ? search : undefined,
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 50, 100),
        });
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list serial numbers",
        });
      }
    }
  );

  router.post(
    "/inventory/serial-numbers",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const created = await deps.createSerialNumberUseCase.execute(req.body);
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "SERIAL_CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create serial number",
        });
      }
    }
  );

  router.get(
    "/inventory/serial-numbers/:serial/history",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.getSerialHistoryUseCase.execute(req.params.serial!);
        if (!result) {
          sendError(res, 404, { code: "NOT_FOUND", message: "Serial number not found" });
          return;
        }
        sendData(res, result);
      } catch (err) {
        sendError(res, 404, {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Serial number not found",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // 6. Damage & Loss Reports
  // -------------------------------------------------------------
  router.get(
    "/inventory/damage-loss-reports",
    requirePermission("inventory.view", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const { warehouseId, status, skip, take } = req.query;
        const result = await deps.listDamageLossReportsUseCase.execute({
          warehouseId: typeof warehouseId === "string" ? warehouseId : undefined,
          status: typeof status === "string" ? status : undefined,
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        });
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list damage loss reports",
        });
      }
    }
  );

  router.post(
    "/inventory/damage-loss-reports",
    requirePermission("inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const reportedById = req.user?.sub || "system";
        const created = await deps.createDamageLossReportUseCase.execute(reportedById, req.body);
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "REPORT_CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create damage loss report",
        });
      }
    }
  );

  router.post(
    "/inventory/damage-loss-reports/:id/approve",
    requirePermission("inventory.approve", "inventory.manage"),
    async (req: Request, res: Response) => {
      try {
        const approvedById = req.user?.sub || "system";
        const approved = await deps.approveDamageLossReportUseCase.execute(req.params.id!, approvedById, req.body);
        sendData(res, approved, 200);
      } catch (err) {
        sendError(res, 400, {
          code: "APPROVAL_FAILED",
          message: err instanceof Error ? err.message : "Failed to approve damage loss report",
        });
      }
    }
  );

  return router;
}
