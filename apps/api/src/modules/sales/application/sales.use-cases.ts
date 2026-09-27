import type {
  SalesRepositoryPort,
  ListQuotationsFilter,
  ListSalesOrdersFilter,
  ListDeliveryChallansFilter,
  ListInvoicesFilter,
  Pagination,
} from "./sales-repository.port";
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
import {
  QuotationNotFoundError,
  SalesOrderNotFoundError,
  InvalidQuotationStatusTransitionError,
  QuotationAlreadyConvertedError,
} from "../domain/sales.errors";

export class CreateQuotationUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: CreateQuotationInput): Promise<QuotationEntity> {
    if (!input.customerId || !input.branchId) {
      throw new Error("customerId and branchId are required.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("At least one quotation line is required.");
    }
    return this.repo.createQuotation(input);
  }
}

export class GetQuotationUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string): Promise<QuotationEntity> {
    const quote = await this.repo.getQuotationById(id);
    if (!quote) throw new QuotationNotFoundError(id);
    return quote;
  }
}

export class ListQuotationsUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: ListQuotationsFilter,
    pagination?: Pagination
  ): Promise<{ items: QuotationEntity[]; total: number }> {
    return this.repo.listQuotations(filter, pagination);
  }
}

export class UpdateQuotationStatusUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string, status: QuotationStatus): Promise<QuotationEntity> {
    const existing = await this.repo.getQuotationById(id);
    if (!existing) throw new QuotationNotFoundError(id);

    if (existing.status === "CONVERTED") {
      throw new QuotationAlreadyConvertedError(existing.quotationNumber);
    }

    return this.repo.updateQuotationStatus(id, status);
  }
}

export class CreateSalesOrderUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: CreateSalesOrderInput): Promise<SalesOrderEntity> {
    if (!input.customerId || !input.branchId) {
      throw new Error("customerId and branchId are required.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("At least one sales order line is required.");
    }
    return this.repo.createSalesOrder(input);
  }
}

export class GetSalesOrderUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string): Promise<SalesOrderEntity> {
    const order = await this.repo.getSalesOrderById(id);
    if (!order) throw new SalesOrderNotFoundError(id);
    return order;
  }
}

export class ListSalesOrdersUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: ListSalesOrdersFilter,
    pagination?: Pagination
  ): Promise<{ items: SalesOrderEntity[]; total: number }> {
    return this.repo.listSalesOrders(filter, pagination);
  }
}

export class ConvertQuotationToSalesOrderUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    quotationId: string,
    orderNumber?: string
  ): Promise<SalesOrderEntity> {
    const quote = await this.repo.getQuotationById(quotationId);
    if (!quote) throw new QuotationNotFoundError(quotationId);

    if (quote.status === "CONVERTED") {
      throw new QuotationAlreadyConvertedError(quote.quotationNumber);
    }

    if (quote.status !== "ACCEPTED") {
      throw new InvalidQuotationStatusTransitionError(
        quote.status,
        "CONVERTED (Sales Order requires an ACCEPTED quotation)"
      );
    }

    return this.repo.convertQuotationToSalesOrder(quotationId, orderNumber);
  }
}

export class CreateDeliveryChallanUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: CreateDeliveryChallanInput): Promise<DeliveryChallanEntity> {
    if (!input.salesOrderId && !input.projectId) {
      throw new Error("Either salesOrderId or projectId is required.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("At least one challan line is required.");
    }
    return this.repo.createDeliveryChallan(input);
  }
}

export class ListDeliveryChallansUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: ListDeliveryChallansFilter,
    pagination?: Pagination
  ): Promise<{ items: DeliveryChallanEntity[]; total: number }> {
    return this.repo.listDeliveryChallans(filter, pagination);
  }
}

export class GetSalesStatsUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(branchId?: string): Promise<SalesStatsEntity> {
    return this.repo.getSalesStats(branchId);
  }
}

export class CreateInvoiceFromChallansUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: CreateInvoiceFromChallansInput): Promise<InvoiceEntity> {
    if (!input.salesOrderId && !input.projectId) {
      throw new Error("Either salesOrderId or projectId is required.");
    }
    if (!Array.isArray(input.challanIds) || input.challanIds.length === 0) {
      throw new Error("At least one Delivery Challan must be selected to create an invoice.");
    }
    return this.repo.createInvoiceFromChallans(input);
  }
}

export class GetInvoiceUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string): Promise<InvoiceEntity> {
    const invoice = await this.repo.getInvoiceById(id);
    if (!invoice) {
      throw new Error(`Invoice with ID ${id} was not found.`);
    }
    return invoice;
  }
}

export class ListInvoicesUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: ListInvoicesFilter,
    pagination?: Pagination
  ): Promise<{ items: InvoiceEntity[]; total: number }> {
    return this.repo.listInvoices(filter, pagination);
  }
}

// ==========================================
// Project Sales & Challan Delivery Use Cases
// ==========================================

export class CreateProjectUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: import("../domain/sales.types").CreateProjectInput): Promise<import("../domain/sales.types").ProjectEntity> {
    if (!input.name?.trim()) throw new Error("Project name is required.");
    if (!input.customerId) throw new Error("Customer is required for the project.");
    if (!input.branchId) throw new Error("Branch is required for the project.");
    if (!input.startDate) throw new Error("Project start date is required.");
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("At least one planned item/product is required for the project.");
    }
    return this.repo.createProject(input);
  }
}

export class GetProjectUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string): Promise<import("../domain/sales.types").ProjectEntity> {
    const project = await this.repo.getProjectById(id);
    if (!project) throw new Error(`Project with ID "${id}" was not found.`);
    return project;
  }
}

export class ListProjectsUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: { branchId?: string; customerId?: string; status?: string; search?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").ProjectEntity[]; total: number }> {
    return this.repo.listProjects(filter, pagination);
  }
}

export class UpdateProjectStatusUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(id: string, status: string): Promise<import("../domain/sales.types").ProjectEntity> {
    return this.repo.updateProjectStatus(id, status);
  }
}

export class AddProjectItemUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    projectId: string,
    item: { productId: string; plannedQty: number; unitPrice: number; description?: string }
  ): Promise<import("../domain/sales.types").ProjectEntity> {
    if (!projectId) throw new Error("Project ID is required.");
    if (!item.productId) throw new Error("Product must be selected.");
    if (!item.plannedQty || item.plannedQty <= 0) throw new Error("Planned quantity must be greater than zero.");
    if (item.unitPrice === undefined || item.unitPrice < 0) throw new Error("Unit price must be valid.");
    return this.repo.addProjectItem(projectId, item);
  }
}

export class RemoveProjectItemUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(projectId: string, itemId: string): Promise<import("../domain/sales.types").ProjectEntity> {
    if (!projectId) throw new Error("Project ID is required.");
    if (!itemId) throw new Error("Item ID is required.");
    return this.repo.removeProjectItem(projectId, itemId);
  }
}

// ==========================================
// Direct Sale (Instant Invoicing) Use Case
// ==========================================

export class CreateDirectSaleUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(input: import("../domain/sales.types").DirectSaleInput): Promise<import("../domain/sales.types").DirectSaleResultEntity> {
    if (!input.customerId) throw new Error("Customer is required for Direct Sale.");
    if (!input.branchId) throw new Error("Branch is required for Direct Sale.");
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("At least one product line is required for Direct Sale.");
    }
    for (const line of input.lines) {
      if (!line.productId) throw new Error("Product must be selected for all lines.");
      if (Number(line.quantity) <= 0) throw new Error("Quantity must be greater than 0.");
      if (Number(line.unitPrice) < 0) throw new Error("Unit price cannot be negative.");
    }
    return this.repo.createDirectSale(input);
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase 6: Delivery Challan Returns & Fulfillment Use Cases
// ═══════════════════════════════════════════════════════════════

export class CreateDeliveryChallanReturnUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").CreateDeliveryChallanReturnInput
  ): Promise<import("../domain/sales.types").DeliveryChallanReturnEntity> {
    if (!input.challanId) {
      throw new Error("Challan ID is required for delivery return.");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error("At least one return line is required.");
    }
    for (const line of input.lines) {
      if (!line.challanLineId) {
        throw new Error("Each return line must reference a challan line.");
      }
      if (Number(line.quantity) <= 0) {
        throw new Error("Return quantity must be greater than zero.");
      }
      if (!["GOOD", "DAMAGED", "FAULTY", "MISSING_PARTS"].includes(line.condition)) {
        throw new Error(`Invalid condition '${line.condition}'. Must be GOOD, DAMAGED, FAULTY, or MISSING_PARTS.`);
      }
    }
    return this.repo.createDeliveryChallanReturn(input);
  }
}

export class ListDeliveryChallanReturnsUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: { challanId?: string; branchId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").DeliveryChallanReturnEntity[]; total: number }> {
    return this.repo.listDeliveryChallanReturns(filter, pagination);
  }
}

export class GetSalesOrderFulfillmentUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    salesOrderId: string
  ): Promise<import("../domain/sales.types").SalesOrderFulfillmentEntity> {
    if (!salesOrderId) {
      throw new Error("Sales Order ID is required.");
    }
    return this.repo.getSalesOrderFulfillment(salesOrderId);
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase 6: Credit Notes Use Cases
// ═══════════════════════════════════════════════════════════════

export class CreateCreditNoteUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").CreateCreditNoteInput
  ): Promise<import("../domain/sales.types").CreditNoteEntity> {
    if (!input.invoiceId) {
      throw new Error("Invoice ID is required for credit note.");
    }
    if (Number(input.amount) <= 0) {
      throw new Error("Credit note amount must be greater than zero.");
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new Error("A valid reason is required for issuing a credit note.");
    }
    return this.repo.createCreditNote(input);
  }
}

export class ListCreditNotesUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CreditNoteEntity[]; total: number }> {
    return this.repo.listCreditNotes(filter, pagination);
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase 7: Customer Advances Use Cases
// ═══════════════════════════════════════════════════════════════

export class CreateCustomerAdvanceUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").CreateCustomerAdvanceInput
  ): Promise<import("../domain/sales.types").CustomerAdvanceEntity> {
    if (!input.customerId) {
      throw new Error("Customer is required for advance.");
    }
    if (!input.branchId) {
      throw new Error("Branch is required for advance.");
    }
    if (Number(input.amount) <= 0) {
      throw new Error("Advance amount must be greater than zero.");
    }
    if (!input.method) {
      throw new Error("Payment method is required.");
    }
    return this.repo.createCustomerAdvance(input);
  }
}

export class GetCustomerAdvanceUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    id: string
  ): Promise<import("../domain/sales.types").CustomerAdvanceEntity | null> {
    if (!id) throw new Error("Advance ID is required.");
    return this.repo.getCustomerAdvanceById(id);
  }
}

export class ListCustomerAdvancesUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: {
      customerId?: string;
      branchId?: string;
      status?: import("../domain/sales.types").AdvanceStatus;
      projectRef?: string;
    },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CustomerAdvanceEntity[]; total: number }> {
    return this.repo.listCustomerAdvances(filter, pagination);
  }
}

export class AdjustCustomerAdvanceUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").AdjustAdvanceInput
  ): Promise<import("../domain/sales.types").AdvanceAdjustmentEntity> {
    if (!input.advanceId) throw new Error("Advance ID is required.");
    if (!input.invoiceId) throw new Error("Invoice ID is required.");
    if (Number(input.amountAdjusted) <= 0) {
      throw new Error("Adjustment amount must be greater than zero.");
    }
    return this.repo.adjustCustomerAdvance(input);
  }
}

// ═══════════════════════════════════════════════════════════════
// Phase 7: Payments & Bank Proof Use Cases
// ═══════════════════════════════════════════════════════════════

export class RecordPaymentUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").RecordPaymentInput
  ): Promise<import("../domain/sales.types").PaymentEntity> {
    if (!input.invoiceId) throw new Error("Invoice ID is required.");
    if (Number(input.amount) <= 0) throw new Error("Payment amount must be greater than zero.");
    if (!input.method) throw new Error("Payment method is required.");
    return this.repo.recordPayment(input);
  }
}

export class ListPaymentsUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").PaymentEntity[]; total: number }> {
    return this.repo.listPayments(filter, pagination);
  }
}

export class CreateBankTransactionProofUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    input: import("../domain/sales.types").CreateBankTransactionProofInput
  ): Promise<import("../domain/sales.types").BankTransactionProofEntity> {
    if (!input.sourceModule || !input.sourceId) {
      throw new Error("Source module and source ID are required for bank proof.");
    }
    if (!input.accountNumberLast4) {
      throw new Error("Masked account number (last 4 digits) is required.");
    }
    if (!input.proofFileId) {
      throw new Error("Proof file ID or reference is required.");
    }
    return this.repo.createBankTransactionProof(input);
  }
}

export class GetBankTransactionProofUseCase {
  constructor(private readonly repo: SalesRepositoryPort) {}

  async execute(
    id: string
  ): Promise<import("../domain/sales.types").BankTransactionProofEntity | null> {
    if (!id) throw new Error("Bank proof ID is required.");
    return this.repo.getBankTransactionProof(id);
  }
}

