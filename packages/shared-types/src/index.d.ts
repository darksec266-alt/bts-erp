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
    addresses?: {
        label: string;
        addressLine: string;
    }[];
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
export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED";
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
    brandId?: string | null;
    unitId?: string | null;
    costPrice: number | string;
    sellingPrice: number | string;
    isServiceItem: boolean;
    isActive: boolean;
    category?: CategoryDto | null;
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
    brandId?: string;
    unitId?: string;
    costPrice: string;
    sellingPrice: string;
    isServiceItem?: boolean;
}
export interface UpdateProductRequest {
    name?: string;
    categoryId?: string | null;
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
}
export interface GoodsReceiptNoteDto {
    id: string;
    grnNumber: string;
    purchaseOrderId: string;
    status: "COMPLETE" | "PARTIAL" | "DISCREPANT";
    receivedAt: string | Date;
    receivedById: string;
    purchaseOrder?: {
        id: string;
        poNumber: string;
        supplier?: {
            id: string;
            companyName: string;
        };
    };
    lines: GoodsReceiptNoteLineDto[];
}
export interface CreateGrnRequest {
    grnNumber?: string;
    status: "COMPLETE" | "PARTIAL" | "DISCREPANT";
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
}
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
        unit?: {
            id: string;
            name: string;
            code: string;
        } | null;
        category?: {
            id: string;
            name: string;
        } | null;
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
export type SKULifecycleStage = "RECEIVED" | "IN_STOCK" | "RESERVED" | "SOLD" | "ISSUED_TO_TECHNICIAN" | "INSTALLED" | "RETURNED_TO_SUPPLIER" | "RETURNED_BY_CUSTOMER" | "RETIRED_WARRANTY" | "DAMAGED_WRITTEN_OFF" | "WARRANTY_CLAIM_RAISED" | "REPLACED" | "REPAIRED";
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
export type DamageLossDisposition = "SCRAP" | "RETURN_TO_STOCK" | "REPAIR" | "RMA" | "WRITE_OFF";
export type DamageLossStatus = "REPORTED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "DISPOSED";
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
