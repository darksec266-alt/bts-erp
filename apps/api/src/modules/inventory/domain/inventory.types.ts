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
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  fromStage?: SKULifecycleStage | null;
  toStage?: SKULifecycleStage | null;
  notes?: string | null;
  performedById?: string | null;
  occurredAt: string | Date;
}

export interface SerialNumberDto {
  id: string;
  productId: string;
  serial: string;
  barcode?: string | null;
  warehouseId?: string | null;
  purchaseOrderId?: string | null;
  grnId?: string | null;
  grnLineId?: string | null;
  notes?: string | null;
  currentStage: SKULifecycleStage;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  product?: {
    id: string;
    sku: string;
    name: string;
    trackingType?: "SERIALIZED" | "NON_SERIALIZED";
    modelNumber?: string | null;
    barcode?: string | null;
  } | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  events?: SKULifecycleEventDto[];
}

export interface CreateSerialNumberRequest {
  productId: string;
  serial: string;
  barcode?: string;
  warehouseId?: string;
  purchaseOrderId?: string;
  grnId?: string;
  grnLineId?: string;
  notes?: string;
  currentStage?: SKULifecycleStage;
}

export type BarcodeScanEntityType = "SERIALIZED_UNIT" | "BULK_PRODUCT" | "UNKNOWN";

export interface BarcodeScanRequest {
  code: string;
  warehouseId?: string;
  intendedOperation?: "RECEIVE" | "DISPATCH" | "TRANSFER" | "SELL" | "VERIFY";
}

export interface BarcodeScanResultDto {
  matchedType: BarcodeScanEntityType;
  query: string;
  isValid: boolean;
  validationMessage?: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    trackingType: "SERIALIZED" | "NON_SERIALIZED";
    modelNumber?: string | null;
    barcode?: string | null;
    costPrice?: string;
    sellingPrice?: string;
    category?: { id: string; name: string } | null;
  } | null;
  unit?: {
    id: string;
    serial: string;
    barcode?: string | null;
    currentStage: SKULifecycleStage;
    warehouseId?: string | null;
    warehouseName?: string | null;
    warehouse?: { id: string; name: string } | null;
    notes?: string | null;
  } | null;
  availableStock?: number;
  found?: boolean;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED";
  serialNumber?: {
    id: string;
    serial: string;
    barcode?: string | null;
    currentStage: SKULifecycleStage;
    warehouseId?: string | null;
    warehouseName?: string | null;
    warehouse?: { id: string; name: string } | null;
    notes?: string | null;
  } | null;
  availableStockInWarehouse?: number;
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
