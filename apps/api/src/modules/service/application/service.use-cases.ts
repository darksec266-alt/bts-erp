import {
  TicketNotFoundError,
  ServiceAssignmentNotFoundError,
  ProductCustodyNotFoundError,
  ConveyanceBillNotFoundError,
  WarrantyNotFoundError,
  InvalidAssignmentStatusTransitionError,
  PaidServiceQuotationRequiredError,
  ServiceQuotationInvalidTicketTypeError,
  WarrantyClaimSerialNumberRequiredError,
  AssignmentAlreadyClosedError,
  CustomerSignatureRequiredError,
  SelfApprovalNotAllowedError,
} from "../domain/service.errors";
import type {
  ServiceRepository,
  TicketDto,
  CreateTicketRequest,
  CreateServiceQuotationRequest,
  TicketFilterOptions,
  ServiceAssignmentDto,
  CreateServiceAssignmentRequest,
  ServiceAssignmentFilterOptions,
  AssignmentStatus,
  AssignTechnicianRequest,
  ProductCustodyDto,
  IssueProductCustodyRequest,
  UpdateCustodyStatusRequest,
  CustodyFilterOptions,
  CustodyStatus,
  TechnicianAdvanceDto,
  IssueTechnicianAdvanceRequest,
  ConveyanceBillDto,
  SubmitConveyanceBillRequest,
  ConveyanceFilterOptions,
  ConveyanceApprovalStatus,
  ProjectClosureReportDto,
  CloseServiceAssignmentRequest,
  LiveLocationLogDto,
  RecordLocationLogRequest,
  LocationLogFilterOptions,
  WarrantyDto,
  CreateWarrantyRequest,
  WarrantyFilterOptions,
  WarrantyClaimDto,
  CreateWarrantyClaimRequest,
  ServicePnlDto,
  ServiceStatsDto,
} from "../domain/service.types";

export class CreateTicketUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: CreateTicketRequest): Promise<TicketDto> {
    if (request.ticketType === "WARRANTY_CLAIM" && !request.serialNumberId) {
      throw new WarrantyClaimSerialNumberRequiredError();
    }
    return this.serviceRepo.createTicket(request);
  }
}

export class GetTicketUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(id: string): Promise<TicketDto> {
    const ticket = await this.serviceRepo.getTicketById(id);
    if (!ticket) {
      throw new TicketNotFoundError(id);
    }
    return ticket;
  }
}

export class ListTicketsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: TicketFilterOptions): Promise<TicketDto[]> {
    return this.serviceRepo.listTickets(filter);
  }
}

export class CreateServiceQuotationUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(ticketId: string, request: CreateServiceQuotationRequest): Promise<any> {
    const ticket = await this.serviceRepo.getTicketById(ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(ticketId);
    }
    if (ticket.ticketType !== "PAID_SERVICE_REQUEST") {
      throw new ServiceQuotationInvalidTicketTypeError(ticket.ticketType);
    }

    const quotation = await this.serviceRepo.createServiceQuotation(ticketId, request);
    await this.serviceRepo.updateTicketStatus(ticketId, "QUOTE_PENDING");
    return quotation;
  }
}

export class CreateServiceAssignmentUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: CreateServiceAssignmentRequest): Promise<ServiceAssignmentDto> {
    if (request.sourceType === "TICKET") {
      const ticket = await this.serviceRepo.getTicketById(request.sourceId);
      if (!ticket) {
        throw new TicketNotFoundError(request.sourceId);
      }

      // Domain guard (architecture.md §57.2 & api-spec.md §17):
      // For sourceType=TICKET where ticket is PAID_SERVICE_REQUEST, quotation must be ACCEPTED
      if (ticket.ticketType === "PAID_SERVICE_REQUEST") {
        if (!ticket.serviceQuotation || ticket.serviceQuotation.status !== "ACCEPTED") {
          throw new PaidServiceQuotationRequiredError(ticket.ticketNumber);
        }
      }
    }

    const assignment = await this.serviceRepo.createServiceAssignment(request);

    if (request.sourceType === "TICKET") {
      await this.serviceRepo.linkServiceAssignment(request.sourceId, assignment.id);
      await this.serviceRepo.updateTicketStatus(request.sourceId, "ASSIGNED");
    }

    if (request.initialTechnicianId) {
      await this.serviceRepo.assignTechnician(assignment.id, request.initialTechnicianId);
      return (await this.serviceRepo.getServiceAssignmentById(assignment.id)) || assignment;
    }

    return assignment;
  }
}

export class GetServiceAssignmentUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(id: string): Promise<ServiceAssignmentDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(id);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(id);
    }
    return assignment;
  }
}

export class ListServiceAssignmentsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: ServiceAssignmentFilterOptions): Promise<ServiceAssignmentDto[]> {
    return this.serviceRepo.listServiceAssignments(filter);
  }
}

export class AssignTechnicianUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: AssignTechnicianRequest): Promise<ServiceAssignmentDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(request.assignmentId);
    }

    await this.serviceRepo.assignTechnician(request.assignmentId, request.employeeId);
    return (await this.serviceRepo.getServiceAssignmentById(request.assignmentId))!;
  }
}

export class UpdateAssignmentStatusUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  private static readonly VALID_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
    ASSIGNED: ["ACCEPTED", "CANCELLED"],
    ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["VERIFIED", "CUSTOMER_ACCEPTED", "CLOSED"],
    VERIFIED: ["CUSTOMER_ACCEPTED", "CLOSED"],
    CUSTOMER_ACCEPTED: ["CLOSED"],
    CLOSED: [],
    CANCELLED: [],
  };

  async execute(assignmentId: string, targetStatus: AssignmentStatus): Promise<ServiceAssignmentDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(assignmentId);
    }

    if (assignment.status === targetStatus) {
      return assignment;
    }

    const allowed = UpdateAssignmentStatusUseCase.VALID_TRANSITIONS[assignment.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new InvalidAssignmentStatusTransitionError(assignment.status, targetStatus);
    }

    const updated = await this.serviceRepo.updateServiceAssignmentStatus(assignmentId, targetStatus);

    // If assigned to a ticket, update ticket status progressively
    if (assignment.ticket) {
      if (targetStatus === "IN_PROGRESS") {
        await this.serviceRepo.updateTicketStatus(assignment.ticket.id, "IN_PROGRESS");
      } else if (targetStatus === "COMPLETED" || targetStatus === "VERIFIED") {
        await this.serviceRepo.updateTicketStatus(assignment.ticket.id, "RESOLVED");
      } else if (targetStatus === "CLOSED") {
        await this.serviceRepo.updateTicketStatus(assignment.ticket.id, "CLOSED", new Date());
      }
    }

    return updated;
  }
}

export class IssueProductCustodyUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: IssueProductCustodyRequest): Promise<ProductCustodyDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(request.assignmentId);
    }
    if (assignment.status === "CLOSED" || assignment.status === "CANCELLED") {
      throw new AssignmentAlreadyClosedError(request.assignmentId);
    }

    return this.serviceRepo.issueProductCustody(request);
  }
}

export class UpdateProductCustodyStatusUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: UpdateCustodyStatusRequest): Promise<ProductCustodyDto> {
    const custody = await this.serviceRepo.getProductCustodyById(request.custodyId);
    if (!custody) {
      throw new ProductCustodyNotFoundError(request.custodyId);
    }
    return this.serviceRepo.updateProductCustodyStatus(request.custodyId, request.status);
  }
}

export class ListProductCustodyUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: CustodyFilterOptions): Promise<ProductCustodyDto[]> {
    return this.serviceRepo.listProductCustody(filter);
  }
}

export class IssueTechnicianAdvanceUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: IssueTechnicianAdvanceRequest): Promise<TechnicianAdvanceDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(request.assignmentId);
    }
    if (assignment.status === "CLOSED" || assignment.status === "CANCELLED") {
      throw new AssignmentAlreadyClosedError(request.assignmentId);
    }
    return this.serviceRepo.issueTechnicianAdvance(request);
  }
}

export class ListTechnicianAdvancesUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(assignmentId?: string, employeeId?: string): Promise<TechnicianAdvanceDto[]> {
    return this.serviceRepo.listTechnicianAdvances(assignmentId, employeeId);
  }
}

export class SubmitConveyanceBillUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: SubmitConveyanceBillRequest): Promise<ConveyanceBillDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(request.assignmentId);
    }
    return this.serviceRepo.submitConveyanceBill(request);
  }
}

export class ApproveConveyanceBillUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(id: string, approvingEmployeeId?: string, isSuperAdmin = false): Promise<ConveyanceBillDto> {
    const bill = await this.serviceRepo.getConveyanceBillById(id);
    if (!bill) {
      throw new ConveyanceBillNotFoundError(id);
    }
    if (!isSuperAdmin && approvingEmployeeId && bill.employeeId === approvingEmployeeId) {
      throw new SelfApprovalNotAllowedError();
    }
    return this.serviceRepo.updateConveyanceApproval(id, "APPROVED");
  }
}

export class RejectConveyanceBillUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(id: string): Promise<ConveyanceBillDto> {
    const bill = await this.serviceRepo.getConveyanceBillById(id);
    if (!bill) {
      throw new ConveyanceBillNotFoundError(id);
    }
    return this.serviceRepo.updateConveyanceApproval(id, "REJECTED");
  }
}

export class ListConveyanceBillsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: ConveyanceFilterOptions): Promise<ConveyanceBillDto[]> {
    return this.serviceRepo.listConveyanceBills(filter);
  }
}

export class RecordGpsCheckinUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: RecordLocationLogRequest): Promise<LiveLocationLogDto> {
    if (request.assignmentId) {
      const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
      if (!assignment) {
        throw new ServiceAssignmentNotFoundError(request.assignmentId);
      }
    }
    return this.serviceRepo.recordLocationLog(request);
  }
}

export class ListLiveLocationLogsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: LocationLogFilterOptions): Promise<LiveLocationLogDto[]> {
    return this.serviceRepo.listLocationLogs(filter);
  }
}

export class CloseServiceAssignmentUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(
    request: CloseServiceAssignmentRequest,
    closedById: string
  ): Promise<{ assignment: ServiceAssignmentDto; closure: ProjectClosureReportDto }> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(request.assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(request.assignmentId);
    }
    if (assignment.status === "CLOSED") {
      throw new AssignmentAlreadyClosedError(request.assignmentId);
    }

    const result = await this.serviceRepo.closeServiceAssignment(
      request.assignmentId,
      closedById,
      request.customerSignatureFileId
    );

    // Auto-close originating Ticket if this was a ticket assignment
    if (assignment.ticket) {
      await this.serviceRepo.updateTicketStatus(assignment.ticket.id, "CLOSED", new Date());
    }

    return result;
  }
}

export class GetServicePnlUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(assignmentId: string): Promise<ServicePnlDto> {
    const assignment = await this.serviceRepo.getServiceAssignmentById(assignmentId);
    if (!assignment) {
      throw new ServiceAssignmentNotFoundError(assignmentId);
    }
    return this.serviceRepo.getServicePnl(assignmentId);
  }
}

export class CreateWarrantyUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: CreateWarrantyRequest): Promise<WarrantyDto> {
    return this.serviceRepo.createWarranty(request);
  }
}

export class GetWarrantyUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(idOrSerialNumberId: string): Promise<WarrantyDto> {
    let warranty = await this.serviceRepo.getWarrantyById(idOrSerialNumberId);
    if (!warranty) {
      warranty = await this.serviceRepo.getWarrantyBySerialNumberId(idOrSerialNumberId);
    }
    if (!warranty) {
      throw new WarrantyNotFoundError(idOrSerialNumberId);
    }
    return warranty;
  }
}

export class ListWarrantiesUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(filter?: WarrantyFilterOptions): Promise<WarrantyDto[]> {
    return this.serviceRepo.listWarranties(filter);
  }
}

export class CreateWarrantyClaimUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(request: CreateWarrantyClaimRequest): Promise<WarrantyClaimDto> {
    const warranty = await this.serviceRepo.getWarrantyById(request.warrantyId);
    if (!warranty) {
      throw new WarrantyNotFoundError(request.warrantyId);
    }
    const ticket = await this.serviceRepo.getTicketById(request.ticketId);
    if (!ticket) {
      throw new TicketNotFoundError(request.ticketId);
    }
    return this.serviceRepo.createWarrantyClaim(request);
  }
}

export class ListWarrantyClaimsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(warrantyId?: string, ticketId?: string): Promise<WarrantyClaimDto[]> {
    return this.serviceRepo.listWarrantyClaims(warrantyId, ticketId);
  }
}

export class GetServiceStatsUseCase {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async execute(branchId?: string): Promise<ServiceStatsDto> {
    return this.serviceRepo.getServiceStats(branchId);
  }
}
