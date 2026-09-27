export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface QuotationLineEntity {
  id?: string;
  quotationId?: string;
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

export interface QuotationEntity {
  id: string;
  quotationNumber: string;
  customerId: string;
  branchId: string;
  salesExecutiveId: string;
  status: QuotationStatus;
  validUntil: Date;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
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
  lines: QuotationLineEntity[];
  salesOrder?: {
    id: string;
    orderNumber: string;
  } | null;
}

export interface CreateQuotationInput {
  quotationNumber?: string;
  customerId: string;
  branchId: string;
  salesExecutiveId?: string;
  validUntil: string | Date;
  lines: {
    productId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface SalesOrderLineEntity {
  id?: string;
  salesOrderId?: string;
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

export interface SalesOrderEntity {
  id: string;
  orderNumber: string;
  quotationId?: string | null;
  customerId: string;
  branchId: string;
  grandTotal: number;
  createdAt: Date;
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
  lines: SalesOrderLineEntity[];
  challans?: {
    id: string;
    challanNumber: string;
    billingStatus?: "UNBILLED" | "BILLED";
    invoiceId?: string | null;
    dispatchedAt: Date;
  }[];
}

export interface CreateSalesOrderInput {
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

export interface DeliveryChallanLineEntity {
  id?: string;
  challanId?: string;
  salesOrderLineId: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
}

export interface DeliveryChallanEntity {
  id: string;
  challanNumber: string;
  salesOrderId: string;
  projectId?: string | null;
  invoiceId?: string | null;
  billingStatus?: "UNBILLED" | "BILLED";
  dispatchedAt: Date;
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
  lines: DeliveryChallanLineEntity[];
}

export interface CreateDeliveryChallanInput {
  challanNumber?: string;
  salesOrderId?: string;
  projectId?: string;
  lines: {
    salesOrderLineId?: string;
    productId: string;
    quantity: number;
  }[];
}

export interface InvoiceLineItemEntity {
  productId?: string | null;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceEntity {
  id: string;
  invoiceNumber: string;
  sourceType: string;
  sourceId: string;
  customerId: string;
  branchId: string;
  grandTotal: number;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  idempotencyKey?: string;
  createdAt: Date;
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
    code?: string;
    name: string;
  };
  challans?: DeliveryChallanEntity[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    receivedAt: Date;
  }[];
  lines?: InvoiceLineItemEntity[];
}

export interface CreateInvoiceFromChallansInput {
  salesOrderId?: string;
  projectId?: string;
  challanIds: string[];
  invoiceNumber?: string;
}

export interface ProjectItemEntity {
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

export interface ProjectEntity {
  id: string;
  projectCode: string;
  name: string;
  description?: string | null;
  customerId: string;
  branchId: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
  startDate: Date;
  endDate?: Date | null;
  siteLocation?: string | null;
  budgetAmount: number;
  totalDispatchedAmount?: number;
  totalInvoicedAmount?: number;
  unbilledChallanCount?: number;
  fulfillmentProgress?: number;
  salesOrderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  items: ProjectItemEntity[];
  challans?: DeliveryChallanEntity[];
  invoices?: InvoiceEntity[];
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

export interface CreateProjectInput {
  name: string;
  description?: string;
  customerId: string;
  branchId: string;
  startDate: string;
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

export interface DirectSaleInput {
  customerId: string;
  branchId: string;
  warehouseId?: string;
  notes?: string;
  paymentMethod?: "CASH" | "BANK" | "SSLCOMMERZ" | "CHEQUE";
  isPaid?: boolean;
  paidAmount?: number;
  lines: {
    productId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface DirectSaleResultEntity {
  invoice: InvoiceEntity;
  order: SalesOrderEntity;
  payment?: {
    id: string;
    amount: number;
    method: string;
    receivedAt: Date;
  } | null;
}

export interface SalesStatsEntity {
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

// ═══════════════════════════════════════════════════════════════
// Phase 6: Delivery Challan Return (Module 73) & Credit Notes (Module 82)
// ═══════════════════════════════════════════════════════════════

export type ChallanReturnCondition = "GOOD" | "DAMAGED" | "FAULTY" | "MISSING_PARTS";

export interface DeliveryChallanReturnLineEntity {
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

export interface DeliveryChallanReturnEntity {
  id: string;
  returnNumber: string;
  challanId: string;
  branchId: string;
  createdAt: Date;
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
  lines: DeliveryChallanReturnLineEntity[];
}

export interface CreateDeliveryChallanReturnInput {
  challanId: string;
  branchId?: string;
  lines: {
    challanLineId: string;
    quantity: number;
    condition: ChallanReturnCondition;
  }[];
}

export interface SalesOrderFulfillmentLine {
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

export interface SalesOrderFulfillmentEntity {
  salesOrderId: string;
  orderNumber: string;
  lines: SalesOrderFulfillmentLine[];
}

export interface CreditNoteEntity {
  id: string;
  creditNoteNumber: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
    customer?: {
      displayName: string;
    };
  };
}

export interface CreateCreditNoteInput {
  invoiceId: string;
  amount: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════
// Phase 7: Customer Advance (Module 80), Payment (Module 81), Bank Proof (Module 105)
// ═══════════════════════════════════════════════════════════════

export type AdvanceStatus =
  | "RECEIVED"
  | "PARTIALLY_ADJUSTED"
  | "FULLY_ADJUSTED"
  | "REFUNDED";

export interface AdvanceAdjustmentEntity {
  id: string;
  advanceId: string;
  invoiceId: string;
  amountAdjusted: number;
  adjustedAt: Date;
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

export interface CustomerAdvanceEntity {
  id: string;
  customerId: string;
  projectRef?: string | null;
  amount: number;
  receivedDate: Date;
  method: string;
  status: AdvanceStatus;
  branchId: string;
  receivedById: string;
  createdAt: Date;
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
  adjustments?: AdvanceAdjustmentEntity[];
}

export interface CreateCustomerAdvanceInput {
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

export interface AdjustAdvanceInput {
  advanceId: string;
  invoiceId: string;
  amountAdjusted: number;
  adjustedById?: string;
}

export interface PaymentEntity {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  gatewayTransactionId?: string | null;
  receivedAt: Date;
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

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  method: string;
  gatewayTransactionId?: string;
  bankProof?: {
    accountNumberLast4: string;
    proofFileId: string;
  };
}

export interface BankTransactionProofEntity {
  id: string;
  sourceModule: string;
  sourceId: string;
  accountNumberMasked: string;
  proofFileId: string;
  uploadedById: string;
  uploadedAt: Date;
}

export interface CreateBankTransactionProofInput {
  sourceModule: string;
  sourceId: string;
  accountNumberLast4: string;
  proofFileId: string;
  uploadedById?: string;
}

export interface SalesReturnLineEntity {
  id: string;
  salesReturnId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serials: string[];
  product?: {
    id: string;
    sku: string;
    name: string;
    trackingType: "SERIALIZED" | "NON_SERIALIZED";
    modelNumber?: string | null;
  };
}

export interface SalesReturnEntity {
  id: string;
  returnNumber: string;
  invoiceId: string;
  customerId: string;
  branchId: string;
  warehouseId: string;
  totalAmount: number;
  creditToWallet: boolean;
  refundAmount: number;
  reason?: string | null;
  status: string;
  createdAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    grandTotal: number;
  };
  customer?: {
    id: string;
    customerCode: string;
    displayName: string;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
  lines: SalesReturnLineEntity[];
}

export interface CreateSalesReturnInput {
  invoiceId: string;
  warehouseId: string;
  reason?: string;
  creditToWallet?: boolean;
  lines: {
    productId: string;
    quantity: number;
    unitPrice: number;
    serials?: string[];
  }[];
}


