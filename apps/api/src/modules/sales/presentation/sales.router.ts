import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import type {
  CreateQuotationUseCase,
  GetQuotationUseCase,
  ListQuotationsUseCase,
  UpdateQuotationStatusUseCase,
  CreateSalesOrderUseCase,
  GetSalesOrderUseCase,
  ListSalesOrdersUseCase,
  ConvertQuotationToSalesOrderUseCase,
  CreateDeliveryChallanUseCase,
  ListDeliveryChallansUseCase,
  CreateInvoiceFromChallansUseCase,
  GetInvoiceUseCase,
  ListInvoicesUseCase,
  GetSalesStatsUseCase,
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectStatusUseCase,
  AddProjectItemUseCase,
  RemoveProjectItemUseCase,
  CreateDirectSaleUseCase,
  CreateDeliveryChallanReturnUseCase,
  ListDeliveryChallanReturnsUseCase,
  GetSalesOrderFulfillmentUseCase,
  CreateCreditNoteUseCase,
  ListCreditNotesUseCase,
  CreateCustomerAdvanceUseCase,
  GetCustomerAdvanceUseCase,
  ListCustomerAdvancesUseCase,
  AdjustCustomerAdvanceUseCase,
  RecordPaymentUseCase,
  ListPaymentsUseCase,
  CreateBankTransactionProofUseCase,
  GetBankTransactionProofUseCase,
  CreateSalesReturnUseCase,
  GetSalesReturnUseCase,
  ListSalesReturnsUseCase,
  GetInvoiceReturnableItemsUseCase,
} from "../application/sales.use-cases";
import {
  QuotationNotFoundError,
  SalesOrderNotFoundError,
  DeliveryChallanNotFoundError,
  InvalidQuotationStatusTransitionError,
  QuotationAlreadyConvertedError,
} from "../domain/sales.errors";
import type { QuotationStatus, AdvanceStatus } from "../domain/sales.types";

export interface SalesRouterDependencies {
  createQuotationUseCase: CreateQuotationUseCase;
  getQuotationUseCase: GetQuotationUseCase;
  listQuotationsUseCase: ListQuotationsUseCase;
  updateQuotationStatusUseCase: UpdateQuotationStatusUseCase;
  createSalesOrderUseCase: CreateSalesOrderUseCase;
  getSalesOrderUseCase: GetSalesOrderUseCase;
  listSalesOrdersUseCase: ListSalesOrdersUseCase;
  convertQuotationToSalesOrderUseCase: ConvertQuotationToSalesOrderUseCase;
  createDeliveryChallanUseCase: CreateDeliveryChallanUseCase;
  listDeliveryChallansUseCase: ListDeliveryChallansUseCase;
  createInvoiceFromChallansUseCase: CreateInvoiceFromChallansUseCase;
  getInvoiceUseCase: GetInvoiceUseCase;
  listInvoicesUseCase: ListInvoicesUseCase;
  getSalesStatsUseCase: GetSalesStatsUseCase;
  createProjectUseCase: CreateProjectUseCase;
  getProjectUseCase: GetProjectUseCase;
  listProjectsUseCase: ListProjectsUseCase;
  updateProjectStatusUseCase: UpdateProjectStatusUseCase;
  addProjectItemUseCase: AddProjectItemUseCase;
  removeProjectItemUseCase: RemoveProjectItemUseCase;
  createDirectSaleUseCase: CreateDirectSaleUseCase;
  createDeliveryChallanReturnUseCase: CreateDeliveryChallanReturnUseCase;
  listDeliveryChallanReturnsUseCase: ListDeliveryChallanReturnsUseCase;
  getSalesOrderFulfillmentUseCase: GetSalesOrderFulfillmentUseCase;
  createCreditNoteUseCase: CreateCreditNoteUseCase;
  listCreditNotesUseCase: ListCreditNotesUseCase;
  createCustomerAdvanceUseCase: CreateCustomerAdvanceUseCase;
  getCustomerAdvanceUseCase: GetCustomerAdvanceUseCase;
  listCustomerAdvancesUseCase: ListCustomerAdvancesUseCase;
  adjustCustomerAdvanceUseCase: AdjustCustomerAdvanceUseCase;
  recordPaymentUseCase: RecordPaymentUseCase;
  listPaymentsUseCase: ListPaymentsUseCase;
  createBankTransactionProofUseCase: CreateBankTransactionProofUseCase;
  getBankTransactionProofUseCase: GetBankTransactionProofUseCase;
  createSalesReturnUseCase?: CreateSalesReturnUseCase;
  getSalesReturnUseCase?: GetSalesReturnUseCase;
  listSalesReturnsUseCase?: ListSalesReturnsUseCase;
  getInvoiceReturnableItemsUseCase?: GetInvoiceReturnableItemsUseCase;
}

export function createSalesRouter(deps: SalesRouterDependencies): Router {
  const router = Router();

  // -------------------------------------------------------------
  // Analytics & Stats
  // -------------------------------------------------------------
  router.get(
    "/sales/stats",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { branchId } = req.query;
      const stats = await deps.getSalesStatsUseCase.execute(
        typeof branchId === "string" ? branchId : undefined
      );
      sendData(res, stats);
    }
  );

  // -------------------------------------------------------------
  // Quotations
  // -------------------------------------------------------------
  router.get(
    "/sales/quotations",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { branchId, customerId, status, search, skip, take } = req.query;
      const result = await deps.listQuotationsUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          customerId: typeof customerId === "string" ? customerId : undefined,
          status: typeof status === "string" ? (status as QuotationStatus) : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  router.get(
    "/sales/quotations/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const quote = await deps.getQuotationUseCase.execute(req.params.id!);
        sendData(res, quote);
      } catch (err) {
        if (err instanceof QuotationNotFoundError) {
          sendError(res, 404, { code: "NOT_FOUND", message: err.message });
          return;
        }
        throw err;
      }
    }
  );

  router.post(
    "/sales/quotations",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { customerId, branchId, validUntil, lines, quotationNumber, salesExecutiveId } =
        req.body ?? {};

      if (!customerId || !branchId || !validUntil || !Array.isArray(lines) || lines.length === 0) {
        sendError(res, 422, {
          code: "VALIDATION_ERROR",
          message: "customerId, branchId, validUntil, and at least one line item are required.",
        });
        return;
      }

      try {
        const created = await deps.createQuotationUseCase.execute({
          quotationNumber,
          customerId,
          branchId,
          validUntil,
          lines,
          salesExecutiveId,
        });
        sendData(res, created, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create quotation.",
        });
      }
    }
  );

  router.patch(
    "/sales/quotations/:id/status",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { status } = req.body ?? {};
      if (!status) {
        sendError(res, 422, {
          code: "VALIDATION_ERROR",
          message: "status is required.",
        });
        return;
      }

      try {
        const updated = await deps.updateQuotationStatusUseCase.execute(
          req.params.id!,
          status as QuotationStatus
        );
        sendData(res, updated);
      } catch (err) {
        if (err instanceof QuotationNotFoundError) {
          sendError(res, 404, { code: "NOT_FOUND", message: err.message });
          return;
        }
        if (
          err instanceof InvalidQuotationStatusTransitionError ||
          err instanceof QuotationAlreadyConvertedError
        ) {
          sendError(res, 422, { code: "INVALID_TRANSITION", message: err.message });
          return;
        }
        throw err;
      }
    }
  );

  router.post(
    "/sales/quotations/:id/convert",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { orderNumber } = req.body ?? {};
      try {
        const order = await deps.convertQuotationToSalesOrderUseCase.execute(
          req.params.id!,
          orderNumber
        );
        sendData(res, order, 201);
      } catch (err) {
        if (err instanceof QuotationNotFoundError) {
          sendError(res, 404, { code: "NOT_FOUND", message: err.message });
          return;
        }
        if (
          err instanceof InvalidQuotationStatusTransitionError ||
          err instanceof QuotationAlreadyConvertedError
        ) {
          sendError(res, 422, { code: "CONVERSION_ERROR", message: err.message });
          return;
        }
        throw err;
      }
    }
  );

  // -------------------------------------------------------------
  // Sales Orders
  // -------------------------------------------------------------
  router.get(
    "/sales/orders",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { branchId, customerId, search, skip, take } = req.query;
      const result = await deps.listSalesOrdersUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          customerId: typeof customerId === "string" ? customerId : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  router.get(
    "/sales/orders/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const order = await deps.getSalesOrderUseCase.execute(req.params.id!);
        sendData(res, order);
      } catch (err) {
        if (err instanceof SalesOrderNotFoundError) {
          sendError(res, 404, { code: "NOT_FOUND", message: err.message });
          return;
        }
        throw err;
      }
    }
  );

  router.post(
    "/sales/orders",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { customerId, branchId, lines, orderNumber, quotationId } = req.body ?? {};

      if (!customerId || !branchId || !Array.isArray(lines) || lines.length === 0) {
        sendError(res, 422, {
          code: "VALIDATION_ERROR",
          message: "customerId, branchId, and at least one line item are required.",
        });
        return;
      }

      try {
        const order = await deps.createSalesOrderUseCase.execute({
          orderNumber,
          quotationId,
          customerId,
          branchId,
          lines,
        });
        sendData(res, order, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create sales order.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Delivery Challans
  // -------------------------------------------------------------
  router.post(
    "/sales/orders/:id/challans",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { challanNumber, lines } = req.body ?? {};
      if (!Array.isArray(lines) || lines.length === 0) {
        sendError(res, 422, {
          code: "VALIDATION_ERROR",
          message: "At least one challan line with salesOrderLineId, productId, and quantity is required.",
        });
        return;
      }

      try {
        const challan = await deps.createDeliveryChallanUseCase.execute({
          salesOrderId: req.params.id!,
          challanNumber,
          lines,
        });
        sendData(res, challan, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "DISPATCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to create delivery challan.",
        });
      }
    }
  );

  router.get(
    "/sales/challans",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { branchId, salesOrderId, billingStatus, invoiceId, search, skip, take } = req.query;
      const result = await deps.listDeliveryChallansUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          salesOrderId: typeof salesOrderId === "string" ? salesOrderId : undefined,
          billingStatus:
            billingStatus === "UNBILLED" || billingStatus === "BILLED"
              ? billingStatus
              : undefined,
          invoiceId: typeof invoiceId === "string" ? invoiceId : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  // -------------------------------------------------------------
  // Invoices & Consolidated Billing
  // -------------------------------------------------------------
  router.post(
    "/sales/orders/:id/invoices",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      const { challanIds, invoiceNumber } = req.body ?? {};
      if (!Array.isArray(challanIds) || challanIds.length === 0) {
        sendError(res, 422, {
          code: "VALIDATION_ERROR",
          message: "At least one Delivery Challan must be selected to create an invoice.",
        });
        return;
      }

      try {
        const invoice = await deps.createInvoiceFromChallansUseCase.execute({
          salesOrderId: req.params.id!,
          challanIds,
          invoiceNumber,
        });
        sendData(res, invoice, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "INVOICE_FAILED",
          message: err instanceof Error ? err.message : "Failed to create invoice from challans.",
        });
      }
    }
  );

  router.get(
    "/sales/invoices",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const { branchId, customerId, salesOrderId, status, search, skip, take } = req.query;
        const result = await deps.listInvoicesUseCase.execute(
          {
            branchId: typeof branchId === "string" ? branchId : undefined,
            customerId: typeof customerId === "string" ? customerId : undefined,
            salesOrderId: typeof salesOrderId === "string" ? salesOrderId : undefined,
            status: typeof status === "string" ? status : undefined,
            search: typeof search === "string" ? search : undefined,
          },
          {
            skip: Number(skip) || 0,
            take: Math.min(Number(take) || 20, 100),
          }
        );
        sendData(res, result);
      } catch (err) {
        sendError(res, 500, {
          code: "LIST_INVOICES_FAILED",
          message: err instanceof Error ? err.message : "Failed to list invoices.",
        });
      }
    }
  );

  router.get(
    "/sales/invoices/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const invoice = await deps.getInvoiceUseCase.execute(req.params.id!);
        sendData(res, invoice);
      } catch (err) {
        sendError(res, 404, {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Invoice not found.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Project Sales & Challan Delivery
  // -------------------------------------------------------------
  router.post(
    "/sales/projects",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const project = await deps.createProjectUseCase.execute(req.body);
        sendData(res, project, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREATE_PROJECT_FAILED",
          message: err instanceof Error ? err.message : "Failed to create project.",
        });
      }
    }
  );

  router.get(
    "/sales/projects",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { branchId, customerId, status, search, skip, take } = req.query;
      const result = await deps.listProjectsUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          customerId: typeof customerId === "string" ? customerId : undefined,
          status: typeof status === "string" ? status : undefined,
          search: typeof search === "string" ? search : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  router.get(
    "/sales/projects/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const project = await deps.getProjectUseCase.execute(req.params.id!);
        sendData(res, project);
      } catch (err) {
        sendError(res, 404, {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Project not found.",
        });
      }
    }
  );

  router.patch(
    "/sales/projects/:id/status",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const { status } = req.body;
        if (!status) throw new Error("status is required.");
        const project = await deps.updateProjectStatusUseCase.execute(req.params.id!, status);
        sendData(res, project);
      } catch (err) {
        sendError(res, 400, {
          code: "STATUS_UPDATE_FAILED",
          message: err instanceof Error ? err.message : "Failed to update project status.",
        });
      }
    }
  );

  router.post(
    "/sales/projects/:id/challans",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const challan = await deps.createDeliveryChallanUseCase.execute({
          ...req.body,
          projectId: req.params.id!,
        });
        sendData(res, challan, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CHALLAN_CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create delivery challan for project.",
        });
      }
    }
  );

  router.post(
    "/sales/projects/:id/invoices",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const { challanIds, invoiceNumber } = req.body;
        const invoice = await deps.createInvoiceFromChallansUseCase.execute({
          projectId: req.params.id!,
          challanIds,
          invoiceNumber,
        });
        sendData(res, invoice, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "INVOICE_FAILED",
          message: err instanceof Error ? err.message : "Failed to create project invoice from challans.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Project Items — add / remove
  // -------------------------------------------------------------
  router.post(
    "/sales/projects/:id/items",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const { productId, plannedQty, unitPrice, description } = req.body;
        const project = await deps.addProjectItemUseCase.execute(req.params.id!, {
          productId,
          plannedQty: Number(plannedQty),
          unitPrice: Number(unitPrice),
          description,
        });
        sendData(res, project, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "ADD_ITEM_FAILED",
          message: err instanceof Error ? err.message : "Failed to add project item.",
        });
      }
    }
  );

  router.delete(
    "/sales/projects/:id/items/:itemId",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const project = await deps.removeProjectItemUseCase.execute(req.params.id!, req.params.itemId!);
        sendData(res, project);
      } catch (err) {
        sendError(res, 400, {
          code: "REMOVE_ITEM_FAILED",
          message: err instanceof Error ? err.message : "Failed to remove project item.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Direct Sale (Instant Invoicing)
  // -------------------------------------------------------------
  router.post(
    "/sales/direct",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createDirectSaleUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "DIRECT_SALE_FAILED",
          message: err instanceof Error ? err.message : "Failed to process direct sale.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Phase 6: Delivery Challan Returns & Fulfillment (Module 73)
  // -------------------------------------------------------------
  router.post(
    "/sales/challans/:id/returns",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createDeliveryChallanReturnUseCase.execute({
          ...req.body,
          challanId: req.params.id!,
        });
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CHALLAN_RETURN_FAILED",
          message: err instanceof Error ? err.message : "Failed to process challan return.",
        });
      }
    }
  );

  router.post(
    "/sales/challan-returns",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createDeliveryChallanReturnUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CHALLAN_RETURN_FAILED",
          message: err instanceof Error ? err.message : "Failed to process challan return.",
        });
      }
    }
  );

  router.get(
    "/sales/challan-returns",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { challanId, branchId, skip, take } = req.query;
      const result = await deps.listDeliveryChallanReturnsUseCase.execute(
        {
          challanId: typeof challanId === "string" ? challanId : undefined,
          branchId: typeof branchId === "string" ? branchId : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  router.get(
    "/sales/sales-orders/:id/fulfillment",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.getSalesOrderFulfillmentUseCase.execute(req.params.id!);
        sendData(res, result);
      } catch (err) {
        sendError(res, 404, {
          code: "FULFILLMENT_NOT_FOUND",
          message: err instanceof Error ? err.message : "Failed to get order fulfillment status.",
        });
      }
    }
  );

  router.get(
    "/sales/orders/:id/fulfillment",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.getSalesOrderFulfillmentUseCase.execute(req.params.id!);
        sendData(res, result);
      } catch (err) {
        sendError(res, 404, {
          code: "FULFILLMENT_NOT_FOUND",
          message: err instanceof Error ? err.message : "Failed to get order fulfillment status.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Phase 6: Credit Notes (Module 82)
  // -------------------------------------------------------------
  router.post(
    "/sales/invoices/:id/credit-notes",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createCreditNoteUseCase.execute({
          ...req.body,
          invoiceId: req.params.id!,
        });
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREDIT_NOTE_FAILED",
          message: err instanceof Error ? err.message : "Failed to create credit note.",
        });
      }
    }
  );

  router.post(
    "/sales/credit-notes",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createCreditNoteUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREDIT_NOTE_FAILED",
          message: err instanceof Error ? err.message : "Failed to create credit note.",
        });
      }
    }
  );

  router.get(
    "/sales/credit-notes",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { invoiceId, skip, take } = req.query;
      const result = await deps.listCreditNotesUseCase.execute(
        {
          invoiceId: typeof invoiceId === "string" ? invoiceId : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  // -------------------------------------------------------------
  // Phase 7: Customer Advances (Module 80)
  // -------------------------------------------------------------
  router.post(
    "/sales/advances",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createCustomerAdvanceUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "ADVANCE_CREATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to create customer advance.",
        });
      }
    }
  );

  router.get(
    "/sales/advances",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { customerId, branchId, status, projectRef, skip, take } = req.query;
      const result = await deps.listCustomerAdvancesUseCase.execute(
        {
          customerId: typeof customerId === "string" ? customerId : undefined,
          branchId: typeof branchId === "string" ? branchId : undefined,
          status: typeof status === "string" ? (status as AdvanceStatus) : undefined,
          projectRef: typeof projectRef === "string" ? projectRef : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  router.get(
    "/sales/advances/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.getCustomerAdvanceUseCase.execute(req.params.id!);
        if (!result) {
          sendError(res, 404, { code: "NOT_FOUND", message: "Customer advance not found." });
          return;
        }
        sendData(res, result);
      } catch (err) {
        sendError(res, 400, {
          code: "ADVANCE_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to fetch customer advance.",
        });
      }
    }
  );

  router.post(
    "/sales/advances/:id/adjust",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.adjustCustomerAdvanceUseCase.execute({
          ...req.body,
          advanceId: req.params.id!,
        });
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "ADVANCE_ADJUST_FAILED",
          message: err instanceof Error ? err.message : "Failed to adjust customer advance.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Phase 7: Payments & Collections (Module 81)
  // -------------------------------------------------------------
  router.post(
    "/sales/invoices/:id/payments",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.recordPaymentUseCase.execute({
          ...req.body,
          invoiceId: req.params.id!,
        });
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "PAYMENT_FAILED",
          message: err instanceof Error ? err.message : "Failed to record payment.",
        });
      }
    }
  );

  router.post(
    "/sales/payments",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.recordPaymentUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "PAYMENT_FAILED",
          message: err instanceof Error ? err.message : "Failed to record payment.",
        });
      }
    }
  );

  router.get(
    "/sales/payments",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      const { invoiceId, skip, take } = req.query;
      const result = await deps.listPaymentsUseCase.execute(
        {
          invoiceId: typeof invoiceId === "string" ? invoiceId : undefined,
        },
        {
          skip: Number(skip) || 0,
          take: Math.min(Number(take) || 20, 100),
        }
      );
      sendData(res, result);
    }
  );

  // -------------------------------------------------------------
  // Phase 7: Bank Transaction Proofs (Module 105)
  // -------------------------------------------------------------
  router.post(
    "/sales/bank-proofs",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.createBankTransactionProofUseCase.execute(req.body);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "BANK_PROOF_FAILED",
          message: err instanceof Error ? err.message : "Failed to store bank proof.",
        });
      }
    }
  );

  router.get(
    "/sales/bank-proofs/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        const result = await deps.getBankTransactionProofUseCase.execute(req.params.id!);
        if (!result) {
          sendError(res, 404, { code: "NOT_FOUND", message: "Bank transaction proof not found." });
          return;
        }
        sendData(res, result);
      } catch (err) {
        sendError(res, 400, {
          code: "BANK_PROOF_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to fetch bank proof.",
        });
      }
    }
  );

  // -------------------------------------------------------------
  // Sales Returns & Inventory Restorations
  // -------------------------------------------------------------
  router.get(
    "/sales/invoices/:id/returnable-items",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.getInvoiceReturnableItemsUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Not configured." });
          return;
        }
        const result = await deps.getInvoiceReturnableItemsUseCase.execute(req.params.id!);
        sendData(res, result);
      } catch (err) {
        sendError(res, 400, {
          code: "GET_RETURNABLE_ITEMS_FAILED",
          message: err instanceof Error ? err.message : "Failed to load returnable items.",
        });
      }
    }
  );

  router.post(
    "/sales/returns",
    requirePermission("sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.createSalesReturnUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Not configured." });
          return;
        }
        const userId = req.user?.sub;
        const result = await deps.createSalesReturnUseCase.execute(req.body, userId);
        sendData(res, result, 201);
      } catch (err) {
        sendError(res, 400, {
          code: "CREATE_SALES_RETURN_FAILED",
          message: err instanceof Error ? err.message : "Failed to create sales return.",
        });
      }
    }
  );

  router.get(
    "/sales/returns",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.listSalesReturnsUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Not configured." });
          return;
        }
        const { invoiceId, customerId, branchId, skip, take } = req.query;
        const result = await deps.listSalesReturnsUseCase.execute(
          {
            invoiceId: typeof invoiceId === "string" ? invoiceId : undefined,
            customerId: typeof customerId === "string" ? customerId : undefined,
            branchId: typeof branchId === "string" ? branchId : undefined,
          },
          { skip: Number(skip) || 0, take: Number(take) || 50 }
        );
        sendData(res, result);
      } catch (err) {
        sendError(res, 400, {
          code: "LIST_SALES_RETURNS_FAILED",
          message: err instanceof Error ? err.message : "Failed to list sales returns.",
        });
      }
    }
  );

  router.get(
    "/sales/returns/:id",
    requirePermission("sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.getSalesReturnUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Not configured." });
          return;
        }
        const result = await deps.getSalesReturnUseCase.execute(req.params.id!);
        if (!result) {
          sendError(res, 404, { code: "NOT_FOUND", message: "Sales return not found." });
          return;
        }
        sendData(res, result);
      } catch (err) {
        sendError(res, 400, {
          code: "GET_SALES_RETURN_FAILED",
          message: err instanceof Error ? err.message : "Failed to get sales return.",
        });
      }
    }
  );

  return router;
}
