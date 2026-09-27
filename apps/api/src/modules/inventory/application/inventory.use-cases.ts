import type {
  StockLedgerDto,
  StockAdjustmentDto,
  CreateStockAdjustmentRequest,
  StockTransferDto,
  CreateStockTransferRequest,
  ReceiveStockTransferRequest,
  BatchDto,
  CreateBatchRequest,
  SerialNumberDto,
  CreateSerialNumberRequest,
  DamageLossReportDto,
  CreateDamageLossReportRequest,
  ApproveDamageLossReportRequest,
  InventoryStatsDto,
  BarcodeScanRequest,
  BarcodeScanResultDto,
} from "../domain/inventory.types";
import { PrismaInventoryRepository } from "../infrastructure/prisma-inventory-repository";

export class ListStockUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(filters?: {
    warehouseId?: string;
    productId?: string;
    belowReorderPoint?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockLedgerDto[]; total: number }> {
    return this.repo.listStock(filters);
  }
}

export class GetInventoryStatsUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(): Promise<InventoryStatsDto> {
    return this.repo.getInventoryStats();
  }
}

export class CreateStockAdjustmentUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(userId: string, input: CreateStockAdjustmentRequest): Promise<StockAdjustmentDto> {
    if (!input.warehouseId || !input.productId) {
      throw new Error("warehouseId and productId are required");
    }
    if (input.quantityDelta === undefined || input.quantityDelta === 0) {
      throw new Error("quantityDelta must be a non-zero number");
    }
    if (!input.reason) {
      throw new Error("reason is required");
    }
    return this.repo.createStockAdjustment({ ...input, createdById: userId });
  }
}

export class ListStockAdjustmentsUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(filters?: {
    warehouseId?: string;
    productId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockAdjustmentDto[]; total: number }> {
    return this.repo.listStockAdjustments(filters);
  }
}

export class CreateStockTransferUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(input: CreateStockTransferRequest): Promise<StockTransferDto> {
    if (!input.productId || !input.fromWarehouseId || !input.toWarehouseId) {
      throw new Error("productId, fromWarehouseId and toWarehouseId are required");
    }
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new Error("Source and destination warehouses cannot be the same");
    }
    if (!input.quantity || input.quantity <= 0) {
      throw new Error("quantity must be greater than 0");
    }
    return this.repo.createStockTransfer(input);
  }
}

export class ReceiveStockTransferUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(transferId: string, input?: ReceiveStockTransferRequest): Promise<StockTransferDto> {
    if (!transferId) {
      throw new Error("transferId is required");
    }
    return this.repo.receiveStockTransfer(transferId, input?.receivedQuantity);
  }
}

export class ListStockTransfersUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(filters?: {
    status?: string;
    warehouseId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockTransferDto[]; total: number }> {
    return this.repo.listStockTransfers(filters);
  }
}

export class CreateBatchUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(input: CreateBatchRequest): Promise<BatchDto> {
    if (!input.productId || !input.batchCode) {
      throw new Error("productId and batchCode are required");
    }
    return this.repo.createBatch(input);
  }
}

export class ListBatchesUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(productId?: string): Promise<BatchDto[]> {
    return this.repo.listBatches(productId);
  }
}

export class CreateSerialNumberUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(input: CreateSerialNumberRequest): Promise<SerialNumberDto> {
    if (!input.productId || !input.serial) {
      throw new Error("productId and serial are required");
    }
    return this.repo.createSerialNumber(input);
  }
}

export class GetSerialHistoryUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(serial: string): Promise<SerialNumberDto | null> {
    if (!serial) {
      throw new Error("serial is required");
    }
    return this.repo.getSerialHistory(serial);
  }
}

export class ListSerialNumbersUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(filters?: {
    productId?: string;
    warehouseId?: string;
    stage?: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: SerialNumberDto[]; total: number }> {
    return this.repo.listSerialNumbers(filters);
  }
}

export class ScanBarcodeUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(input: BarcodeScanRequest): Promise<BarcodeScanResultDto> {
    if (!input.code || !input.code.trim()) {
      throw new Error("code is required");
    }
    return this.repo.scanBarcode(input);
  }
}

export class CreateDamageLossReportUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(reportedById: string, input: CreateDamageLossReportRequest): Promise<DamageLossReportDto> {
    if (!input.warehouseId || !input.branchId || !input.reason) {
      throw new Error("warehouseId, branchId and reason are required");
    }
    if (!input.lines || input.lines.length === 0) {
      throw new Error("At least one item is required in the damage/loss report");
    }
    return this.repo.createDamageLossReport({ ...input, reportedById });
  }
}

export class ApproveDamageLossReportUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(reportId: string, approvedById: string, input: ApproveDamageLossReportRequest): Promise<DamageLossReportDto> {
    if (!reportId) {
      throw new Error("reportId is required");
    }
    return this.repo.approveDamageLossReport(reportId, approvedById, input.disposition);
  }
}

export class ListDamageLossReportsUseCase {
  constructor(private readonly repo: PrismaInventoryRepository) {}

  async execute(filters?: {
    warehouseId?: string;
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: DamageLossReportDto[]; total: number }> {
    return this.repo.listDamageLossReports(filters);
  }
}
