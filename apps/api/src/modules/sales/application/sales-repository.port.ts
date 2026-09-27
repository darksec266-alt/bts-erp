import type {
  QuotationEntity,
  SalesOrderEntity,
  DeliveryChallanEntity,
  SalesStatsEntity,
  InvoiceEntity,
  QuotationStatus,
  CreateQuotationInput,
  CreateSalesOrderInput,
  CreateDeliveryChallanInput,
  CreateInvoiceFromChallansInput,
} from "../domain/sales.types";

export interface ListQuotationsFilter {
  branchId?: string;
  customerId?: string;
  status?: QuotationStatus;
  search?: string;
}

export interface ListSalesOrdersFilter {
  branchId?: string;
  customerId?: string;
  search?: string;
}

export interface ListDeliveryChallansFilter {
  branchId?: string;
  salesOrderId?: string;
  projectId?: string;
  billingStatus?: "UNBILLED" | "BILLED";
  invoiceId?: string;
  search?: string;
}

export interface ListInvoicesFilter {
  branchId?: string;
  customerId?: string;
  salesOrderId?: string;
  projectId?: string;
  status?: string;
  search?: string;
}

export interface Pagination {
  skip?: number;
  take?: number;
}

export interface SalesRepositoryPort {
  // Quotations
  createQuotation(data: CreateQuotationInput): Promise<QuotationEntity>;
  getQuotationById(id: string): Promise<QuotationEntity | null>;
  listQuotations(
    filter?: ListQuotationsFilter,
    pagination?: Pagination
  ): Promise<{ items: QuotationEntity[]; total: number }>;
  updateQuotationStatus(id: string, status: QuotationStatus): Promise<QuotationEntity>;

  // Sales Orders
  createSalesOrder(data: CreateSalesOrderInput): Promise<SalesOrderEntity>;
  getSalesOrderById(id: string): Promise<SalesOrderEntity | null>;
  listSalesOrders(
    filter?: ListSalesOrdersFilter,
    pagination?: Pagination
  ): Promise<{ items: SalesOrderEntity[]; total: number }>;
  convertQuotationToSalesOrder(
    quotationId: string,
    orderNumber?: string
  ): Promise<SalesOrderEntity>;

  // Delivery Challans
  createDeliveryChallan(data: CreateDeliveryChallanInput): Promise<DeliveryChallanEntity>;
  getDeliveryChallanById(id: string): Promise<DeliveryChallanEntity | null>;
  listDeliveryChallans(
    filter?: ListDeliveryChallansFilter,
    pagination?: Pagination
  ): Promise<{ items: DeliveryChallanEntity[]; total: number }>;

  // Projects
  createProject(data: import("../domain/sales.types").CreateProjectInput): Promise<import("../domain/sales.types").ProjectEntity>;
  getProjectById(id: string): Promise<import("../domain/sales.types").ProjectEntity | null>;
  listProjects(
    filter?: { branchId?: string; customerId?: string; status?: string; search?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").ProjectEntity[]; total: number }>;
  updateProjectStatus(id: string, status: string): Promise<import("../domain/sales.types").ProjectEntity>;
  addProjectItem(
    projectId: string,
    item: { productId: string; plannedQty: number; unitPrice: number; description?: string }
  ): Promise<import("../domain/sales.types").ProjectEntity>;
  removeProjectItem(projectId: string, itemId: string): Promise<import("../domain/sales.types").ProjectEntity>;

  // Direct Sale
  createDirectSale(data: import("../domain/sales.types").DirectSaleInput): Promise<import("../domain/sales.types").DirectSaleResultEntity>;

  // Invoices & Billing
  createInvoiceFromChallans(data: CreateInvoiceFromChallansInput): Promise<InvoiceEntity>;
  getInvoiceById(id: string): Promise<InvoiceEntity | null>;
  listInvoices(
    filter?: ListInvoicesFilter,
    pagination?: Pagination
  ): Promise<{ items: InvoiceEntity[]; total: number }>;

  // Analytics & Stats
  getSalesStats(branchId?: string): Promise<SalesStatsEntity>;

  // Phase 6: Challan Return & Fulfillment
  createDeliveryChallanReturn(data: import("../domain/sales.types").CreateDeliveryChallanReturnInput): Promise<import("../domain/sales.types").DeliveryChallanReturnEntity>;
  listDeliveryChallanReturns(
    filter?: { challanId?: string; branchId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").DeliveryChallanReturnEntity[]; total: number }>;
  getSalesOrderFulfillment(salesOrderId: string): Promise<import("../domain/sales.types").SalesOrderFulfillmentEntity>;

  // Phase 6: Credit Notes
  createCreditNote(data: import("../domain/sales.types").CreateCreditNoteInput): Promise<import("../domain/sales.types").CreditNoteEntity>;
  listCreditNotes(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CreditNoteEntity[]; total: number }>;

  // Phase 7: Customer Advances
  createCustomerAdvance(data: import("../domain/sales.types").CreateCustomerAdvanceInput): Promise<import("../domain/sales.types").CustomerAdvanceEntity>;
  getCustomerAdvanceById(id: string): Promise<import("../domain/sales.types").CustomerAdvanceEntity | null>;
  listCustomerAdvances(
    filter?: { customerId?: string; branchId?: string; status?: import("../domain/sales.types").AdvanceStatus; projectRef?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CustomerAdvanceEntity[]; total: number }>;
  adjustCustomerAdvance(data: import("../domain/sales.types").AdjustAdvanceInput): Promise<import("../domain/sales.types").AdvanceAdjustmentEntity>;

  // Phase 7: Payments & Bank Proof
  recordPayment(data: import("../domain/sales.types").RecordPaymentInput): Promise<import("../domain/sales.types").PaymentEntity>;
  listPayments(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").PaymentEntity[]; total: number }>;
  createBankTransactionProof(data: import("../domain/sales.types").CreateBankTransactionProofInput): Promise<import("../domain/sales.types").BankTransactionProofEntity>;
  getBankTransactionProof(id: string): Promise<import("../domain/sales.types").BankTransactionProofEntity | null>;

  // Sales Returns & Inventory Restorations
  createSalesReturn(
    data: import("../domain/sales.types").CreateSalesReturnInput,
    userId?: string
  ): Promise<import("../domain/sales.types").SalesReturnEntity>;
  getSalesReturnById(id: string): Promise<import("../domain/sales.types").SalesReturnEntity | null>;
  listSalesReturns(
    filter?: { invoiceId?: string; customerId?: string; branchId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").SalesReturnEntity[]; total: number }>;
  getInvoiceReturnableItems(invoiceId: string): Promise<{
    invoice: InvoiceEntity;
    items: {
      productId: string;
      productName: string;
      sku: string;
      trackingType: "SERIALIZED" | "NON_SERIALIZED";
      invoicedQuantity: number;
      alreadyReturnedQuantity: number;
      returnableQuantity: number;
      unitPrice: number;
      soldSerials: string[];
    }[];
  }>;
}

