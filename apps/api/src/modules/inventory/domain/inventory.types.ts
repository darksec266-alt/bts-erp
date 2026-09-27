export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type StockTransferStatus = "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "DISCREPANT";

export type SKULifecycleStage =
  | "RECEIVED"
  | "IN_STOCK"
  | "RESERVED"
  | "SOLD"
  | "ISSUED_TO_TECHNICIAN"
  | "INSTALLED"
  | "RETURNED_TO_SUPPLIER"
  | "RETURNED_BY_CUSTOMER"
  | "RETIRED_WARRANTY"
  | "DAMAGED_WRITTEN_OFF"
  | "WARRANTY_CLAIM_RAISED"
  | "REPLACED"
  | "REPAIRED";

export type DamageLossDisposition =
  | "SCRAP"
  | "RETURN_TO_STOCK"
  | "REPAIR"
  | "RMA"
  | "WRITE_OFF";

export type DamageLossStatus =
  | "REPORTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "DISPOSED";

export interface StockLedgerDto {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  updatedAt: string | Date;
  product?: {
    id: string;
    sku: string;
    name: string;
    costPrice?: number;
    sellingPrice?: number;
    reorderLevel?: number;
    unit?: { id: string; name: string; code: string } | null;
    category?: { id: string; name: string } | null;
  } | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface StockAdjustmentDto {
  id: string;
  productId: string;
  warehouseId: string;
  quantityDelta: number;
  reason: string;
  approvalStatus: ApprovalStatus;
  createdById: string;
  createdAt: string | Date;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface CreateStockAdjustmentRequest {
  productId: string;
  warehouseId: string;
  quantityDelta: number;
  reason: string;
}

export interface StockTransferDto {
  id: string;
  productId: string;
  quantity: number;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: StockTransferStatus;
  dispatchedAt: string | Date;
  receivedAt?: string | Date | null;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  fromWarehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  toWarehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface CreateStockTransferRequest {
  productId: string;
  quantity: number;
  fromWarehouseId: string;
  toWarehouseId: string;
}

export interface ReceiveStockTransferRequest {
  receivedQuantity?: number;
  notes?: string;
}

export interface BatchDto {
  id: string;
  productId: string;
  batchCode: string;
  expiryDate?: string | Date | null;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface CreateBatchRequest {
  productId: string;
  batchCode: string;
  expiryDate?: string | Date | null;
}

export interface SKULifecycleEventDto {
  id: string;
  serialNumberId: string;
  eventType: SKULifecycleStage;
  sourceModule: string;
  sourceId: string;
  occurredAt: string | Date;
}

export interface SerialNumberDto {
  id: string;
  productId: string;
  serial: string;
  currentStage: SKULifecycleStage;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  events?: SKULifecycleEventDto[];
}

export interface CreateSerialNumberRequest {
  productId: string;
  serial: string;
  currentStage?: SKULifecycleStage;
}

export interface DamageLossLineDto {
  id: string;
  reportId: string;
  productId: string;
  serialNumberId?: string | null;
  quantity: number;
  costBasis: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  serialNumber?: {
    id: string;
    serial: string;
  } | null;
}

export interface DamageLossReportDto {
  id: string;
  reportNumber: string;
  branchId: string;
  warehouseId: string;
  reason: string;
  evidenceFileId?: string | null;
  status: DamageLossStatus;
  disposition?: DamageLossDisposition | null;
  grossLoss: number;
  recovery: number;
  netLoss: number;
  reportedById: string;
  approvedById?: string | null;
  createdAt: string | Date;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  lines: DamageLossLineDto[];
}

export interface CreateDamageLossReportRequest {
  warehouseId: string;
  branchId: string;
  reason: string;
  evidenceFileId?: string;
  lines: {
    productId: string;
    serialNumberId?: string;
    quantity: number;
    costBasis: number;
  }[];
}

export interface ApproveDamageLossReportRequest {
  disposition: DamageLossDisposition;
}

export interface InventoryStatsDto {
  totalItemsInStock: number;
  totalValuation: number;
  lowStockItemsCount: number;
  activeTransfersCount: number;
  damageLossReportsCount: number;
}
