import { Router, type Request, type Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission, isSuperAdminUser } from "../../../shared/security/require-permission.middleware";
import type {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  CreateServiceQuotationUseCase,
  CreateServiceAssignmentUseCase,
  GetServiceAssignmentUseCase,
  ListServiceAssignmentsUseCase,
  AssignTechnicianUseCase,
  UpdateAssignmentStatusUseCase,
  IssueProductCustodyUseCase,
  UpdateProductCustodyStatusUseCase,
  ListProductCustodyUseCase,
  IssueTechnicianAdvanceUseCase,
  ListTechnicianAdvancesUseCase,
  SubmitConveyanceBillUseCase,
  ApproveConveyanceBillUseCase,
  RejectConveyanceBillUseCase,
  ListConveyanceBillsUseCase,
  RecordGpsCheckinUseCase,
  ListLiveLocationLogsUseCase,
  CloseServiceAssignmentUseCase,
  GetServicePnlUseCase,
  CreateWarrantyUseCase,
  GetWarrantyUseCase,
  ListWarrantiesUseCase,
  CreateWarrantyClaimUseCase,
  ListWarrantyClaimsUseCase,
  GetServiceStatsUseCase,
} from "../application/service.use-cases";
import {
  TicketNotFoundError,
  ServiceAssignmentNotFoundError,
  ProductCustodyNotFoundError,
  ConveyanceBillNotFoundError,
  WarrantyNotFoundError,
  WarrantyClaimNotFoundError,
  InvalidAssignmentStatusTransitionError,
  PaidServiceQuotationRequiredError,
  ServiceQuotationInvalidTicketTypeError,
  WarrantyClaimSerialNumberRequiredError,
  AssignmentAlreadyClosedError,
  CustomerSignatureRequiredError,
  SelfApprovalNotAllowedError,
} from "../domain/service.errors";
import type {
  TicketStatus,
  TicketType,
  AssignmentStatus,
  CustodyStatus,
  ConveyanceApprovalStatus,
  WarrantyStatus,
} from "../domain/service.types";

export interface ServiceRouterDependencies {
  createTicketUseCase: CreateTicketUseCase;
  getTicketUseCase: GetTicketUseCase;
  listTicketsUseCase: ListTicketsUseCase;
  createServiceQuotationUseCase: CreateServiceQuotationUseCase;
  createServiceAssignmentUseCase: CreateServiceAssignmentUseCase;
  getServiceAssignmentUseCase: GetServiceAssignmentUseCase;
  listServiceAssignmentsUseCase: ListServiceAssignmentsUseCase;
  assignTechnicianUseCase: AssignTechnicianUseCase;
  updateAssignmentStatusUseCase: UpdateAssignmentStatusUseCase;
  issueProductCustodyUseCase: IssueProductCustodyUseCase;
  updateProductCustodyStatusUseCase: UpdateProductCustodyStatusUseCase;
  listProductCustodyUseCase: ListProductCustodyUseCase;
  issueTechnicianAdvanceUseCase: IssueTechnicianAdvanceUseCase;
  listTechnicianAdvancesUseCase: ListTechnicianAdvancesUseCase;
  submitConveyanceBillUseCase: SubmitConveyanceBillUseCase;
  approveConveyanceBillUseCase: ApproveConveyanceBillUseCase;
  rejectConveyanceBillUseCase: RejectConveyanceBillUseCase;
  listConveyanceBillsUseCase: ListConveyanceBillsUseCase;
  recordGpsCheckinUseCase: RecordGpsCheckinUseCase;
  listLiveLocationLogsUseCase: ListLiveLocationLogsUseCase;
  closeServiceAssignmentUseCase: CloseServiceAssignmentUseCase;
  getServicePnlUseCase: GetServicePnlUseCase;
  createWarrantyUseCase: CreateWarrantyUseCase;
  getWarrantyUseCase: GetWarrantyUseCase;
  listWarrantiesUseCase: ListWarrantiesUseCase;
  createWarrantyClaimUseCase: CreateWarrantyClaimUseCase;
  listWarrantyClaimsUseCase: ListWarrantyClaimsUseCase;
  getServiceStatsUseCase: GetServiceStatsUseCase;
}

export function createServiceRouter(deps: ServiceRouterDependencies): Router {
  const router = Router();

  const handleServiceError = (res: Response, err: unknown) => {
    if (
      err instanceof TicketNotFoundError ||
      err instanceof ServiceAssignmentNotFoundError ||
      err instanceof ProductCustodyNotFoundError ||
      err instanceof ConveyanceBillNotFoundError ||
      err instanceof WarrantyNotFoundError ||
      err instanceof WarrantyClaimNotFoundError
    ) {
      return sendError(res, 404, { code: err.code, message: err.message });
    }
    if (err instanceof SelfApprovalNotAllowedError) {
      return sendError(res, 409, { code: err.code, message: err.message });
    }
    if (
      err instanceof InvalidAssignmentStatusTransitionError ||
      err instanceof PaidServiceQuotationRequiredError ||
      err instanceof ServiceQuotationInvalidTicketTypeError ||
      err instanceof WarrantyClaimSerialNumberRequiredError ||
      err instanceof AssignmentAlreadyClosedError ||
      err instanceof CustomerSignatureRequiredError
    ) {
      return sendError(res, 422, { code: err.code, message: err.message });
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    return sendError(res, 500, { code: "INTERNAL_ERROR", message });
  };

  // =============================================================
  // Service Stats KPI Endpoint
  // =============================================================
  router.get(
    "/service/stats",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const stats = await deps.getServiceStatsUseCase.execute(req.query.branchId as string | undefined);
        return sendData(res, stats);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Service Tickets
  // =============================================================
  router.get(
    "/tickets",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const tickets = await deps.listTicketsUseCase.execute({
          branchId: req.query.branchId as string | undefined,
          customerId: req.query.customerId as string | undefined,
          status: req.query.status as TicketStatus | undefined,
          ticketType: req.query.ticketType as TicketType | undefined,
          search: req.query.search as string | undefined,
        });
        return sendData(res, tickets);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/tickets",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const { ticketType, customerId, branchId, serialNumberId, description } = req.body;
        if (!ticketType || !customerId || !branchId || !description) {
          return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Missing required ticket fields." });
        }

        const ticket = await deps.createTicketUseCase.execute({
          ticketType,
          customerId,
          branchId,
          serialNumberId,
          description,
        });
        return sendData(res, ticket, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/tickets/:id",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const ticket = await deps.getTicketUseCase.execute(id);
        return sendData(res, ticket);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/tickets/:id/service-quotation",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { lines, customerId, branchId } = req.body;
        if (!lines || !Array.isArray(lines) || lines.length === 0) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "At least one service quotation line is required.",
          });
        }

        const quotation = await deps.createServiceQuotationUseCase.execute(id, {
          ticketId: id,
          customerId,
          branchId,
          lines,
        });
        return sendData(res, quotation, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Service Assignments
  // =============================================================
  router.get(
    "/service-assignments",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const assignments = await deps.listServiceAssignmentsUseCase.execute({
          branchId: req.query.branchId as string | undefined,
          status: req.query.status as AssignmentStatus | undefined,
          sourceType: req.query.sourceType as string | undefined,
          technicianEmployeeId: req.query.technicianEmployeeId as string | undefined,
          search: req.query.search as string | undefined,
        });
        return sendData(res, assignments);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const { sourceType, sourceId, branchId, initialTechnicianId } = req.body;
        if (!sourceType || !sourceId || !branchId) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "Missing required fields for Service Assignment.",
          });
        }

        const assignment = await deps.createServiceAssignmentUseCase.execute({
          sourceType,
          sourceId,
          branchId,
          initialTechnicianId,
        });
        return sendData(res, assignment, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/service-assignments/:id",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const assignment = await deps.getServiceAssignmentUseCase.execute(id);
        return sendData(res, assignment);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.patch(
    "/service-assignments/:id/status",
    requirePermission("service.technician", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { status } = req.body;
        if (!status) {
          return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Target status is required." });
        }

        const assignment = await deps.updateAssignmentStatusUseCase.execute(id, status);
        return sendData(res, assignment);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments/:id/technicians",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { employeeId } = req.body;
        if (!employeeId) {
          return sendError(res, 400, { code: "VALIDATION_ERROR", message: "employeeId is required." });
        }

        const assignment = await deps.assignTechnicianUseCase.execute({
          assignmentId: id,
          employeeId,
        });
        return sendData(res, assignment);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Product & Tool Custody
  // =============================================================
  router.get(
    "/service-assignments/:id/custody",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const custody = await deps.listProductCustodyUseCase.execute({
          assignmentId: id,
          status: req.query.status as CustodyStatus | undefined,
        });
        return sendData(res, custody);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/custody",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const custody = await deps.listProductCustodyUseCase.execute({
          assignmentId: req.query.assignmentId as string | undefined,
          custodianId: req.query.custodianId as string | undefined,
          status: req.query.status as CustodyStatus | undefined,
        });
        return sendData(res, custody);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments/:id/custody",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { productId, serialNumberId, quantity, custodianId } = req.body;
        if (!productId || !quantity || !custodianId) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "Missing required custody issuance fields.",
          });
        }

        const custody = await deps.issueProductCustodyUseCase.execute({
          assignmentId: id,
          productId,
          serialNumberId,
          quantity: Number(quantity),
          custodianId,
        });
        return sendData(res, custody, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.patch(
    "/custody/:id/status",
    requirePermission("service.technician", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { status } = req.body;
        if (!status) {
          return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Status is required." });
        }

        const updated = await deps.updateProductCustodyStatusUseCase.execute({
          custodyId: id,
          status,
        });
        return sendData(res, updated);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Technician Advances
  // =============================================================
  router.get(
    "/service-assignments/:id/advances",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const advances = await deps.listTechnicianAdvancesUseCase.execute(
          id,
          req.query.employeeId as string | undefined
        );
        return sendData(res, advances);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/technician-advances",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const advances = await deps.listTechnicianAdvancesUseCase.execute(
          req.query.assignmentId as string | undefined,
          req.query.employeeId as string | undefined
        );
        return sendData(res, advances);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments/:id/advance",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { employeeId, amountIssued } = req.body;
        if (!employeeId || !amountIssued || Number(amountIssued) <= 0) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "Valid employeeId and positive amountIssued are required.",
          });
        }

        const advance = await deps.issueTechnicianAdvanceUseCase.execute({
          assignmentId: id,
          employeeId,
          amountIssued: Number(amountIssued),
        });
        return sendData(res, advance, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Conveyance Bills
  // =============================================================
  router.get(
    "/service-assignments/:id/conveyance-bills",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const bills = await deps.listConveyanceBillsUseCase.execute({
          assignmentId: id,
          employeeId: req.query.employeeId as string | undefined,
          approvalStatus: req.query.approvalStatus as ConveyanceApprovalStatus | undefined,
        });
        return sendData(res, bills);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/conveyance-bills",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const bills = await deps.listConveyanceBillsUseCase.execute({
          assignmentId: req.query.assignmentId as string | undefined,
          employeeId: req.query.employeeId as string | undefined,
          approvalStatus: req.query.approvalStatus as ConveyanceApprovalStatus | undefined,
        });
        return sendData(res, bills);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments/:id/conveyance-bills",
    requirePermission("service.technician", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { employeeId, totalClaimed, receiptFileId } = req.body;
        if (!employeeId || !totalClaimed || Number(totalClaimed) <= 0) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "Valid employeeId and totalClaimed are required.",
          });
        }

        const bill = await deps.submitConveyanceBillUseCase.execute({
          assignmentId: id,
          employeeId,
          totalClaimed: Number(totalClaimed),
          receiptFileId,
        });
        return sendData(res, bill, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/conveyance-bills/:id/approve",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const callerUserId = (req as any).user?.sub;
        const isSuperAdmin = isSuperAdminUser((req as any).user);
        const bill = await deps.approveConveyanceBillUseCase.execute(id, callerUserId, isSuperAdmin);
        return sendData(res, bill);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/conveyance-bills/:id/reject",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const bill = await deps.rejectConveyanceBillUseCase.execute(id);
        return sendData(res, bill);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Field Visits & GPS Logs (Offline-Sync Tolerant)
  // =============================================================
  router.post(
    "/service-assignments/:id/checkin",
    requirePermission("service.technician", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { employeeId, latitude, longitude, occurredAt } = req.body;
        if (!employeeId || latitude === undefined || longitude === undefined) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "employeeId, latitude, and longitude are required.",
          });
        }

        const log = await deps.recordGpsCheckinUseCase.execute({
          assignmentId: id,
          employeeId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          recordedAt: occurredAt,
        });
        return sendData(res, log, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/service-assignments/:id/checkout",
    requirePermission("service.technician", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const { employeeId, latitude, longitude, occurredAt } = req.body;
        if (!employeeId || latitude === undefined || longitude === undefined) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "employeeId, latitude, and longitude are required.",
          });
        }

        const log = await deps.recordGpsCheckinUseCase.execute({
          assignmentId: id,
          employeeId,
          latitude: Number(latitude),
          longitude: Number(longitude),
          recordedAt: occurredAt,
        });
        return sendData(res, log, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/service-assignments/:id/location-logs",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const logs = await deps.listLiveLocationLogsUseCase.execute({
          assignmentId: id,
          employeeId: req.query.employeeId as string | undefined,
        });
        return sendData(res, logs);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/live-locations",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const logs = await deps.listLiveLocationLogsUseCase.execute({
          employeeId: req.query.employeeId as string | undefined,
          assignmentId: req.query.assignmentId as string | undefined,
        });
        return sendData(res, logs);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Project Closure & P&L
  // =============================================================
  router.post(
    "/service-assignments/:id/close",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const closedById = (req as any).user?.sub || "system";
        const { customerSignatureFileId } = req.body;

        const result = await deps.closeServiceAssignmentUseCase.execute(
          {
            assignmentId: id,
            customerSignatureFileId,
          },
          closedById
        );
        return sendData(res, result);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/service-assignments/:id/pnl",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const pnl = await deps.getServicePnlUseCase.execute(id);
        return sendData(res, pnl);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  // =============================================================
  // Warranties & Claims
  // =============================================================
  router.get(
    "/warranties",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const warranties = await deps.listWarrantiesUseCase.execute({
          status: req.query.status as WarrantyStatus | undefined,
          search: req.query.search as string | undefined,
        });
        return sendData(res, warranties);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/warranties",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const { serialNumberId, startDate, termMonths } = req.body;
        if (!serialNumberId || !startDate || !termMonths) {
          return sendError(res, 400, { code: "VALIDATION_ERROR", message: "Missing required warranty fields." });
        }

        const warranty = await deps.createWarrantyUseCase.execute({
          serialNumberId,
          startDate,
          termMonths: Number(termMonths),
        });
        return sendData(res, warranty, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/warranties/:id",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id);
        const warranty = await deps.getWarrantyUseCase.execute(id);
        return sendData(res, warranty);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.get(
    "/warranty-claims",
    requirePermission("service.view", "service.manage"),
    async (req: Request, res: Response) => {
      try {
        const claims = await deps.listWarrantyClaimsUseCase.execute(
          req.query.warrantyId as string | undefined,
          req.query.ticketId as string | undefined
        );
        return sendData(res, claims);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  router.post(
    "/warranty-claims",
    requirePermission("service.manage"),
    async (req: Request, res: Response) => {
      try {
        const { warrantyId, ticketId, outcome } = req.body;
        if (!warrantyId || !ticketId) {
          return sendError(res, 400, {
            code: "VALIDATION_ERROR",
            message: "warrantyId and ticketId are required.",
          });
        }

        const claim = await deps.createWarrantyClaimUseCase.execute({
          warrantyId,
          ticketId,
          outcome,
        });
        return sendData(res, claim, 201);
      } catch (err) {
        return handleServiceError(res, err);
      }
    }
  );

  return router;
}
