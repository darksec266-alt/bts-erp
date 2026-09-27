// Unified DTOs and API contract types for BTS ERP

export interface ApiResponse<T> {
  data: T | null;
  meta?: {
    requestId: string;
    timestamp?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export interface CustomerAddressDto {
  id: string;
  label: string;
  addressLine: string;
}

export interface BranchSummaryDto {
  id: string;
  code: string;
  name: string;
}

export interface CustomerDto {
  id: string;
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  branch?: BranchSummaryDto;
  isServiceOnly: boolean;
  isActive: boolean;
  addresses: CustomerAddressDto[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CustomerListResponse {
  items: CustomerDto[];
  total: number;
}

export interface CreateCustomerRequest {
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  isServiceOnly?: boolean;
  addresses?: { label: string; addressLine: string }[];
}

export interface UpdateCustomerRequest {
  displayName?: string;
  phone?: string;
  branchId?: string;
  isServiceOnly?: boolean;
  isActive?: boolean;
}

export interface BranchDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// -------------------------------------------------------------
// Sales Module DTOs & Types
// -------------------------------------------------------------

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface QuotationLineDto {
  id?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface QuotationDto {
  id: string;
  quotationNumber: string;
  customerId: string;
  branchId: string;
  salesExecutiveId: string;
  status: QuotationStatus;
  validUntil: string | Date;
  grandTotal: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
    phone: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  lines: QuotationLineDto[];
  salesOrder?: {
    id: string;
    orderNumber: string;
  } | null;
}

export interface CreateQuotationRequest {
  quotationNumber?: string;
  customerId: string;
  branchId: string;
  salesExecutiveId?: string;
  validUntil: string;
  lines: {
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface UpdateQuotationStatusRequest {
  status: QuotationStatus;
}

export interface SalesOrderLineDto {
  id?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface SalesOrderDto {
  id: string;
  orderNumber: string;
  quotationId?: string | null;
  customerId: string;
  branchId: string;
  grandTotal: number;
  createdAt: string | Date;
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
    phone: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
  } | null;
  lines: SalesOrderLineDto[];
  challans?: {
    id: string;
    challanNumber: string;
    billingStatus?: "UNBILLED" | "BILLED";
    invoiceId?: string | null;
    dispatchedAt: string | Date;
  }[];
}

export interface CreateSalesOrderRequest {
  orderNumber?: string;
  quotationId?: string | null;
  customerId: string;
  branchId: string;
  lines: {
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface DeliveryChallanLineDto {
  id?: string;
  salesOrderLineId: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
}

export interface DeliveryChallanDto {
  id: string;
  challanNumber: string;
  salesOrderId: string;
  projectId?: string | null;
  invoiceId?: string | null;
  billingStatus?: "UNBILLED" | "BILLED";
  dispatchedAt: string | Date;
  salesOrder?: {
    id: string;
    orderNumber: string;
    grandTotal?: number;
    customer?: {
      displayName: string;
    };
  };
  project?: {
    id: string;
    projectCode: string;
    name: string;
  } | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    status: string;
  } | null;
  lines: DeliveryChallanLineDto[];
}

export interface CreateDeliveryChallanRequest {
  challanNumber?: string;
  salesOrderId?: string;
  projectId?: string;
  lines: {
    salesOrderLineId?: string;
    productId: string;
    quantity: number;
  }[];
}

export interface InvoiceLineItemDto {
  productId?: string | null;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  sourceType: string;
  sourceId: string;
  customerId: string;
  branchId: string;
  grandTotal: number;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  idempotencyKey?: string;
  createdAt: string | Date;
  customer?: {
    id: string;
    customerCode?: string;
    displayName: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  branch?: {
    id: string;
    name: string;
  };
  challans?: DeliveryChallanDto[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    receivedAt: string | Date;
  }[];
  lines?: InvoiceLineItemDto[];
}

export interface CreateInvoiceFromChallansRequest {
  salesOrderId: string;
  projectId?: string;
  challanIds: string[];
  invoiceNumber?: string;
}

export type ProjectStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";

export interface ProjectItemDto {
  id: string;
  projectId: string;
  productId: string;
  description?: string | null;
  plannedQty: number;
  dispatchedQty?: number;
  unitPrice: number;
  totalAmount: number;
  product?: {
    id: string;
    sku: string;
    name: string;
    unitName?: string | null;
  };
}

export interface ProjectDto {
  id: string;
  projectCode: string;
  name: string;
  description?: string | null;
  customerId: string;
  branchId: string;
  status: ProjectStatus;
  startDate: string | Date;
  endDate?: string | Date | null;
  siteLocation?: string | null;
  budgetAmount: number;
  totalDispatchedAmount?: number;
  totalInvoicedAmount?: number;
  unbilledChallanCount?: number;
  fulfillmentProgress?: number;
  salesOrderId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
    phone: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  items: ProjectItemDto[];
  challans?: DeliveryChallanDto[];
  invoices?: InvoiceDto[];
  stats?: {
    totalBudget: number;
    totalDispatchedAmount: number;
    totalInvoicedAmount: number;
    totalChallans: number;
    unbilledChallans: number;
    billedChallans: number;
    fulfillmentProgress: number;
  };
}

export interface CreateProjectRequest {
  projectCode?: string;
  name: string;
  description?: string;
  customerId: string;
  branchId: string;
  startDate?: string;
  endDate?: string;
  siteLocation?: string;
  budgetAmount?: number;
  items: {
    productId: string;
    description?: string;
    plannedQty: number;
    unitPrice: number;
  }[];
}

export interface DirectSaleRequest {
  customerId: string;
  branchId: string;
  warehouseId?: string;
  notes?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  paidAmount?: number;
  lines: {
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface DirectSaleResultDto {
  invoice: InvoiceDto;
  order: SalesOrderDto;
  payment?: {
    id: string;
    amount: number;
    method: string;
    receivedAt: string | Date;
  } | null;
}

export interface SalesStatsDto {
  totalRevenue: number;
  totalOrders: number;
  totalQuotations: number;
  pendingQuotations: number;
  acceptedQuotations: number;
  dispatchedChallans: number;
  totalInvoices?: number;
  unbilledChallans?: number;
  totalProjects?: number;
  activeProjects?: number;
}

// -------------------------------------------------------------
// Master Data Module DTOs & Types
// -------------------------------------------------------------

export interface CategoryDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BrandDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface UnitDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  branchId?: string | null;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface DepartmentDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TaxRateDto {
  id: string;
  name: string;
  ratePercent: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SubCategoryDto {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  category?: CategoryDto | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateSubCategoryRequest {
  name: string;
  categoryId: string;
}

export interface UpdateSubCategoryRequest {
  name?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface ProductStockDto {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  quantityOnHand: number;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  costPrice: number | string;
  sellingPrice: number | string;
  isServiceItem: boolean;
  isActive: boolean;
  category?: CategoryDto | null;
  subCategory?: SubCategoryDto | null;
  brand?: BrandDto | null;
  unit?: UnitDto | null;
  totalStock?: number;
  stockLedgers?: ProductStockDto[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  costPrice: string;
  sellingPrice: string;
  isServiceItem?: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  costPrice?: string;
  sellingPrice?: string;
  isServiceItem?: boolean;
  isActive?: boolean;
}

export interface ProductListResponse {
  items: ProductDto[];
  total: number;
}

// -------------------------------------------------------------
// Procurement Module DTOs & Types
// -------------------------------------------------------------

export interface SupplierContactDto {
  id?: string;
  name: string;
  phone: string;
  isPrimary?: boolean;
}

export interface SupplierDto {
  id: string;
  supplierCode: string;
  companyName: string;
  isActive: boolean;
  contacts?: SupplierContactDto[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateSupplierRequest {
  supplierCode: string;
  companyName: string;
  contacts?: {
    name: string;
    phone: string;
    isPrimary?: boolean;
  }[];
}

export interface UpdateSupplierRequest {
  companyName?: string;
  isActive?: boolean;
}

export interface PurchaseRequestLineDto {
  id: string;
  productId: string;
  quantity: number | string;
  notes?: string | null;
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface PurchaseRequestDto {
  id: string;
  requestNumber: string;
  branchId: string;
  requestedById: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string | Date;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  purchaseOrder?: {
    id: string;
    poNumber: string;
  } | null;
  lines: PurchaseRequestLineDto[];
}

export interface CreatePurchaseRequestRequest {
  requestNumber?: string;
  branchId: string;
  lines: {
    productId: string;
    quantity: number | string;
    notes?: string;
  }[];
}

export interface PurchaseOrderLineDto {
  id: string;
  productId: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  receivedQuantity?: number;
  remainingQuantity?: number;
  fulfillmentStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED";
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  purchaseRequestId?: string | null;
  supplierId: string;
  branchId: string;
  grandTotal: number | string;
  createdAt: string | Date;
  fulfillmentStatus?: "PENDING_RECEIPT" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED";
  totalOrderedQuantity?: number;
  totalReceivedQuantity?: number;
  totalRemainingQuantity?: number;
  supplier?: {
    id: string;
    supplierCode: string;
    companyName: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  purchaseRequest?: {
    id: string;
    requestNumber: string;
  } | null;
  lines: PurchaseOrderLineDto[];
  grns?: {
    id: string;
    grnNumber: string;
    status: string;
    receivedAt?: string | Date;
  }[];
}

export interface CreatePurchaseOrderRequest {
  poNumber?: string;
  purchaseRequestId?: string;
  supplierId: string;
  branchId: string;
  lines: {
    productId: string;
    quantity: number | string;
    unitPrice: number | string;
  }[];
}

export interface GoodsReceiptNoteLineDto {
  id: string;
  purchaseOrderLineId: string;
  productId: string;
  quantityReceived: number | string;
  condition: "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU";
  product?: {
    id: string;
    sku: string;
    name: string;
  } | null;
  purchaseOrderLine?: {
    id: string;
    quantity: number | string;
    unitPrice?: number | string;
  } | null;
}

export interface GoodsReceiptNoteDto {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT" | "CANCELLED";
  receivedAt: string | Date;
  receivedById: string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    branchId?: string;
    branch?: {
      id: string;
      name: string;
      code: string;
    };
    supplier?: {
      id: string;
      companyName: string;
    };
    lines?: {
      id: string;
      productId: string;
      quantity: number | string;
      unitPrice: number | string;
      product?: {
        id: string;
        sku: string;
        name: string;
      };
    }[];
  };
  lines: GoodsReceiptNoteLineDto[];
}

export interface CreateGrnRequest {
  grnNumber?: string;
  warehouseId?: string;
  status: "COMPLETE" | "PARTIAL" | "DISCREPANT" | "DRAFT";
  lines: {
    purchaseOrderLineId: string;
    productId: string;
    quantityReceived: number | string;
    condition: "GOOD" | "DAMAGED" | "SHORT" | "WRONG_SKU";
  }[];
}

export interface ProcurementStatsDto {
  totalSpend: number;
  totalPOs: number;
  pendingPRs: number;
  activeSuppliers: number;
  totalGRNs: number;
  pendingPOs?: number;
  partiallyReceivedPOs?: number;
  fullyReceivedPOs?: number;
  totalPurchasedQuantity?: number;
  totalReceivedQuantity?: number;
  outstandingQuantity?: number;
}

// -------------------------------------------------------------
// Inventory Module DTOs & Types (Phase 5 - prompt.md §189)
// -------------------------------------------------------------

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

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

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

export type StockTransferStatus = "DISPATCHED" | "IN_TRANSIT" | "RECEIVED" | "DISCREPANT";

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

// ═══════════════════════════════════════════════════════════════
// Phase 6: Delivery Challan Return & Credit Notes DTOs
// ═══════════════════════════════════════════════════════════════

export type ChallanReturnCondition = "GOOD" | "DAMAGED" | "FAULTY" | "MISSING_PARTS";

export interface DeliveryChallanReturnLineDto {
  id?: string;
  returnId?: string;
  challanLineId: string;
  quantity: number;
  condition: ChallanReturnCondition;
  damageLossReportId?: string | null;
  challanLine?: {
    id: string;
    productId: string;
    quantity: number;
    product?: {
      id: string;
      sku: string;
      name: string;
    };
  };
}

export interface DeliveryChallanReturnDto {
  id: string;
  returnNumber: string;
  challanId: string;
  branchId: string;
  createdAt: string | Date;
  challan?: {
    id: string;
    challanNumber: string;
    salesOrderId: string;
    salesOrder?: {
      id: string;
      orderNumber: string;
      customer?: {
        displayName: string;
      };
    };
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  lines: DeliveryChallanReturnLineDto[];
}

export interface CreateDeliveryChallanReturnRequest {
  challanId: string;
  branchId?: string;
  lines: {
    challanLineId: string;
    quantity: number;
    condition: ChallanReturnCondition;
  }[];
}

export interface SalesOrderFulfillmentLineDto {
  salesOrderLineId: string;
  productId: string;
  sku: string;
  productName: string;
  ordered: number;
  challaned: number;
  returned: number;
  netDelivered: number;
  remaining: number;
}

export interface SalesOrderFulfillmentDto {
  salesOrderId: string;
  orderNumber: string;
  lines: SalesOrderFulfillmentLineDto[];
}

export interface CreditNoteDto {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: string | Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    customer?: {
      displayName: string;
    };
  };
}

export interface CreateCreditNoteRequest {
  invoiceId: string;
  amount: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════
// Phase 7: Customer Advance, Payment, Bank Proof DTOs
// ═══════════════════════════════════════════════════════════════

export type AdvanceStatus =
  | "RECEIVED"
  | "PARTIALLY_ADJUSTED"
  | "FULLY_ADJUSTED"
  | "REFUNDED";

export interface AdvanceAdjustmentDto {
  id: string;
  advanceId: string;
  invoiceId: string;
  amountAdjusted: number;
  adjustedAt: string | Date;
  adjustedById: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
  };
  advance?: {
    id: string;
    amount: number;
    status: AdvanceStatus;
  };
}

export interface CustomerAdvanceDto {
  id: string;
  customerId: string;
  projectRef?: string | null;
  amount: number;
  receivedDate: string | Date;
  method: string;
  status: AdvanceStatus;
  branchId: string;
  receivedById: string;
  createdAt: string | Date;
  adjustedAmount?: number;
  remainingAmount?: number;
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
    phone?: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  adjustments?: AdvanceAdjustmentDto[];
}

export interface CreateCustomerAdvanceRequest {
  customerId: string;
  projectRef?: string;
  amount: number;
  receivedDate?: string | Date;
  method: string;
  branchId: string;
  receivedById?: string;
  bankProof?: {
    accountNumberLast4: string;
    proofFileId: string;
  };
}

export interface AdjustAdvanceRequest {
  advanceId: string;
  invoiceId: string;
  amountAdjusted: number;
  adjustedById?: string;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  gatewayTransactionId?: string | null;
  receivedAt: string | Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    customerId: string;
    customer?: {
      displayName: string;
    };
  };
}

export interface RecordPaymentRequest {
  invoiceId: string;
  amount: number;
  method: string;
  gatewayTransactionId?: string;
  bankProof?: {
    accountNumberLast4: string;
    proofFileId: string;
  };
}

export interface BankTransactionProofDto {
  id: string;
  sourceModule: string;
  sourceId: string;
  accountNumberMasked: string;
  proofFileId: string;
  uploadedById: string;
  uploadedAt: string | Date;
}

export interface CreateBankProofRequest {
  sourceModule: string;
  sourceId: string;
  accountNumberLast4: string;
  proofFileId: string;
  uploadedById?: string;
}
// -------------------------------------------------------------
// Service & Technician Management DTOs & Types (Phase 8)
// -------------------------------------------------------------

export type TicketType = "WARRANTY_CLAIM" | "PAID_SERVICE_REQUEST";

export type TicketStatus =
  | "OPEN"
  | "QUOTE_PENDING"
  | "QUOTE_ACCEPTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type AssignmentStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "CUSTOMER_ACCEPTED"
  | "CLOSED"
  | "CANCELLED";

export type CustodyStatus =
  | "ASSIGNED"
  | "USED"
  | "RETURNED"
  | "DAMAGED"
  | "LOST"
  | "SOLD_TO_CUSTOMER";

export type WarrantyStatus = "ACTIVE" | "EXPIRED" | "VOIDED";

export type WarrantyClaimOutcome = "REPLACED" | "REPAIRED" | "REJECTED";

export type ConveyanceApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TicketDto {
  id: string;
  ticketNumber: string;
  ticketType: TicketType;
  customerId: string;
  branchId: string;
  serialNumberId?: string | null;
  description: string;
  status: TicketStatus;
  serviceAssignmentId?: string | null;
  createdAt: string | Date;
  closedAt?: string | Date | null;
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
    phone?: string;
  };
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  serialNumber?: {
    id: string;
    serialNumber: string;
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  } | null;
  serviceQuotation?: QuotationDto | null;
  serviceAssignment?: {
    id: string;
    assignmentNumber: string;
    status: AssignmentStatus;
  } | null;
  warrantyClaims?: WarrantyClaimDto[];
}

export interface CreateTicketRequest {
  ticketType: TicketType;
  customerId: string;
  branchId: string;
  serialNumberId?: string;
  description: string;
}

export interface CreateServiceQuotationRequest {
  ticketId: string;
  customerId?: string;
  branchId?: string;
  lines: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface TechnicianAssignmentDto {
  id: string;
  assignmentId: string;
  employeeId: string;
  assignedAt: string | Date;
  unassignedAt?: string | Date | null;
  technician?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface ProductCustodyDto {
  id: string;
  assignmentId: string;
  serialNumberId?: string | null;
  productId: string;
  quantity: number;
  status: CustodyStatus;
  custodianId: string;
  createdAt: string | Date;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
  serialNumber?: {
    id: string;
    serialNumber: string;
  } | null;
  custodian?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface TechnicianAdvanceDto {
  id: string;
  assignmentId: string;
  employeeId: string;
  amountIssued: number;
  issuedAt: string | Date;
  technician?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface ConveyanceBillDto {
  id: string;
  assignmentId: string;
  employeeId: string;
  totalClaimed: number;
  approvalStatus: ConveyanceApprovalStatus;
  receiptFileId?: string | null;
  submittedAt: string | Date;
  technician?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface ProjectClosureReportDto {
  id: string;
  assignmentId: string;
  customerSignatureFileId?: string | null;
  closedAt?: string | Date | null;
  closedById: string;
  closedBy?: {
    id: string;
    email: string;
  };
}

export interface LiveLocationLogDto {
  id: string;
  employeeId: string;
  assignmentId?: string | null;
  latitude: number;
  longitude: number;
  recordedAt: string | Date;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface ServiceAssignmentDto {
  id: string;
  assignmentNumber: string;
  sourceType: "SALES_ORDER" | "INVOICE" | "TICKET";
  sourceId: string;
  branchId: string;
  status: AssignmentStatus;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  technicians: TechnicianAssignmentDto[];
  custody: ProductCustodyDto[];
  advances: TechnicianAdvanceDto[];
  conveyance: ConveyanceBillDto[];
  closure?: ProjectClosureReportDto | null;
  liveLocationLogs?: LiveLocationLogDto[];
  ticket?: {
    id: string;
    ticketNumber: string;
    description: string;
    ticketType: TicketType;
  } | null;
}

export interface CreateServiceAssignmentRequest {
  sourceType: "SALES_ORDER" | "INVOICE" | "TICKET";
  sourceId: string;
  branchId: string;
  initialTechnicianId?: string;
}

export interface AssignTechnicianRequest {
  assignmentId: string;
  employeeId: string;
}

export interface IssueProductCustodyRequest {
  assignmentId: string;
  productId: string;
  serialNumberId?: string;
  quantity: number;
  custodianId: string;
}

export interface UpdateCustodyStatusRequest {
  custodyId: string;
  status: CustodyStatus;
}

export interface IssueTechnicianAdvanceRequest {
  assignmentId: string;
  employeeId: string;
  amountIssued: number;
}

export interface SubmitConveyanceBillRequest {
  assignmentId: string;
  employeeId: string;
  totalClaimed: number;
  receiptFileId?: string;
}

export interface CloseServiceAssignmentRequest {
  assignmentId: string;
  customerSignatureFileId?: string;
  notes?: string;
}

export interface RecordLocationLogRequest {
  employeeId: string;
  assignmentId?: string;
  latitude: number;
  longitude: number;
  recordedAt?: string | Date;
}

export interface WarrantyDto {
  id: string;
  serialNumberId: string;
  startDate: string | Date;
  endDate: string | Date;
  termMonths: number;
  status: WarrantyStatus;
  createdAt: string | Date;
  serialNumber?: {
    id: string;
    serialNumber: string;
    product?: {
      id: string;
      name: string;
      sku: string;
    };
  };
  claims?: WarrantyClaimDto[];
}

export interface CreateWarrantyRequest {
  serialNumberId: string;
  startDate: string | Date;
  termMonths: number;
}

export interface WarrantyClaimDto {
  id: string;
  warrantyId: string;
  ticketId: string;
  outcome?: WarrantyClaimOutcome | null;
  raisedAt: string | Date;
  resolvedAt?: string | Date | null;
  warranty?: WarrantyDto;
  ticket?: TicketDto;
}

export interface CreateWarrantyClaimRequest {
  warrantyId: string;
  ticketId: string;
  outcome?: WarrantyClaimOutcome;
}

export interface ServicePnlDto {
  assignmentId: string;
  assignmentNumber: string;
  label: "INTERIM" | "FINAL";
  revenue: number;
  materialCost: number;
  technicianAdvances: number;
  conveyanceExpense: number;
  netProfit: number;
  marginPercentage: number;
}

export interface ServiceStatsDto {
  totalTickets: number;
  openTickets: number;
  activeAssignments: number;
  inProgressAssignments: number;
  closedAssignments: number;
  pendingConveyanceBills: number;
  activeWarranties: number;
}
