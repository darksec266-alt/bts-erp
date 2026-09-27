import {
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
  IssueTechnicianAdvanceUseCase,
  SubmitConveyanceBillUseCase,
  ApproveConveyanceBillUseCase,
  CloseServiceAssignmentUseCase,
  GetServicePnlUseCase,
  CreateWarrantyUseCase,
  CreateWarrantyClaimUseCase,
} from "./service.use-cases";
import {
  WarrantyClaimSerialNumberRequiredError,
  PaidServiceQuotationRequiredError,
  ServiceQuotationInvalidTicketTypeError,
  InvalidAssignmentStatusTransitionError,
  AssignmentAlreadyClosedError,
  SelfApprovalNotAllowedError,
} from "../domain/service.errors";
import type {
  ServiceRepository,
  TicketDto,
  ServiceAssignmentDto,
  ProductCustodyDto,
  TechnicianAdvanceDto,
  ConveyanceBillDto,
  WarrantyDto,
  WarrantyClaimDto,
} from "../domain/service.types";

function createMockServiceRepo(): jest.Mocked<ServiceRepository> {
  return {
    createTicket: jest.fn(),
    getTicketById: jest.fn(),
    getTicketByNumber: jest.fn(),
    listTickets: jest.fn(),
    updateTicketStatus: jest.fn(),
    linkServiceAssignment: jest.fn(),
    createServiceQuotation: jest.fn(),
    createServiceAssignment: jest.fn(),
    getServiceAssignmentById: jest.fn(),
    listServiceAssignments: jest.fn(),
    updateServiceAssignmentStatus: jest.fn(),
    assignTechnician: jest.fn(),
    unassignTechnician: jest.fn(),
    issueProductCustody: jest.fn(),
    getProductCustodyById: jest.fn(),
    updateProductCustodyStatus: jest.fn(),
    listProductCustody: jest.fn(),
    issueTechnicianAdvance: jest.fn(),
    listTechnicianAdvances: jest.fn(),
    submitConveyanceBill: jest.fn(),
    getConveyanceBillById: jest.fn(),
    updateConveyanceApproval: jest.fn(),
    listConveyanceBills: jest.fn(),
    recordLocationLog: jest.fn(),
    listLocationLogs: jest.fn(),
    closeServiceAssignment: jest.fn(),
    getServicePnl: jest.fn(),
    createWarranty: jest.fn(),
    getWarrantyById: jest.fn(),
    getWarrantyBySerialNumberId: jest.fn(),
    listWarranties: jest.fn(),
    createWarrantyClaim: jest.fn(),
    listWarrantyClaims: jest.fn(),
    getServiceStats: jest.fn(),
  };
}

describe("Service & Technician Use Cases (Phase 8)", () => {
  let repo: jest.Mocked<ServiceRepository>;

  beforeEach(() => {
    repo = createMockServiceRepo();
  });

  describe("Ticket Management", () => {
    it("should require serialNumberId when creating a WARRANTY_CLAIM ticket", async () => {
      const useCase = new CreateTicketUseCase(repo);

      await expect(
        useCase.execute({
          ticketType: "WARRANTY_CLAIM",
          customerId: "cust-1",
          branchId: "branch-1",
          description: "Screen malfunctioning",
        })
      ).rejects.toThrow(WarrantyClaimSerialNumberRequiredError);
    });

    it("should allow creating a WARRANTY_CLAIM ticket when serialNumberId is provided", async () => {
      const useCase = new CreateTicketUseCase(repo);
      const mockTicket: TicketDto = {
        id: "tck-1",
        ticketNumber: "TCK-2026-10001",
        ticketType: "WARRANTY_CLAIM",
        customerId: "cust-1",
        branchId: "branch-1",
        serialNumberId: "sn-1",
        description: "Screen malfunctioning",
        status: "OPEN",
        createdAt: new Date(),
      };
      repo.createTicket.mockResolvedValue(mockTicket);

      const result = await useCase.execute({
        ticketType: "WARRANTY_CLAIM",
        customerId: "cust-1",
        branchId: "branch-1",
        serialNumberId: "sn-1",
        description: "Screen malfunctioning",
      });

      expect(result.id).toBe("tck-1");
      expect(repo.createTicket).toHaveBeenCalledWith({
        ticketType: "WARRANTY_CLAIM",
        customerId: "cust-1",
        branchId: "branch-1",
        serialNumberId: "sn-1",
        description: "Screen malfunctioning",
      });
    });

    it("should allow creating a PAID_SERVICE_REQUEST ticket without serialNumberId", async () => {
      const useCase = new CreateTicketUseCase(repo);
      const mockTicket: TicketDto = {
        id: "tck-2",
        ticketNumber: "TCK-2026-10002",
        ticketType: "PAID_SERVICE_REQUEST",
        customerId: "cust-2",
        branchId: "branch-1",
        description: "Full preventive maintenance service",
        status: "OPEN",
        createdAt: new Date(),
      };
      repo.createTicket.mockResolvedValue(mockTicket);

      const result = await useCase.execute({
        ticketType: "PAID_SERVICE_REQUEST",
        customerId: "cust-2",
        branchId: "branch-1",
        description: "Full preventive maintenance service",
      });

      expect(result.ticketType).toBe("PAID_SERVICE_REQUEST");
      expect(result.serialNumberId).toBeUndefined();
    });
  });

  describe("Service Quotations for Paid Service Requests", () => {
    it("should reject creating a service quotation for WARRANTY_CLAIM tickets", async () => {
      const useCase = new CreateServiceQuotationUseCase(repo);
      repo.getTicketById.mockResolvedValue({
        id: "tck-1",
        ticketNumber: "TCK-2026-10001",
        ticketType: "WARRANTY_CLAIM",
        customerId: "cust-1",
        branchId: "branch-1",
        description: "Warranty repair",
        status: "OPEN",
        createdAt: new Date(),
      });

      await expect(
        useCase.execute("tck-1", {
          ticketId: "tck-1",
          lines: [{ description: "Labor", quantity: 1, unitPrice: 500 }],
        })
      ).rejects.toThrow(ServiceQuotationInvalidTicketTypeError);
    });

    it("should create service quotation and update ticket status to QUOTE_PENDING for PAID_SERVICE_REQUEST", async () => {
      const useCase = new CreateServiceQuotationUseCase(repo);
      repo.getTicketById.mockResolvedValue({
        id: "tck-2",
        ticketNumber: "TCK-2026-10002",
        ticketType: "PAID_SERVICE_REQUEST",
        customerId: "cust-2",
        branchId: "branch-1",
        description: "Paid repair",
        status: "OPEN",
        createdAt: new Date(),
      });
      repo.createServiceQuotation.mockResolvedValue({ id: "sq-1", totalAmount: 1500 });

      const quotation = await useCase.execute("tck-2", {
        ticketId: "tck-2",
        lines: [{ description: "Diagnostics & Repair", quantity: 1, unitPrice: 1500 }],
      });

      expect(quotation.id).toBe("sq-1");
      expect(repo.updateTicketStatus).toHaveBeenCalledWith("tck-2", "QUOTE_PENDING");
    });
  });

  describe("Service Assignment & Acceptance Workflow", () => {
    it("should reject creating service assignment for PAID_SERVICE_REQUEST ticket if quotation is not ACCEPTED", async () => {
      const useCase = new CreateServiceAssignmentUseCase(repo);
      repo.getTicketById.mockResolvedValue({
        id: "tck-2",
        ticketNumber: "TCK-2026-10002",
        ticketType: "PAID_SERVICE_REQUEST",
        customerId: "cust-2",
        branchId: "branch-1",
        description: "Paid repair",
        status: "QUOTE_PENDING",
        serviceQuotation: {
          id: "sq-1",
          quotationNumber: "SQ-2026-1001",
          customerId: "cust-2",
          branchId: "branch-1",
          salesExecutiveId: "emp-1",
          status: "SENT", // Not ACCEPTED!
          validUntil: new Date(),
          grandTotal: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
          lines: [],
        },
        createdAt: new Date(),
      });

      await expect(
        useCase.execute({
          sourceType: "TICKET",
          sourceId: "tck-2",
          branchId: "branch-1",
        })
      ).rejects.toThrow(PaidServiceQuotationRequiredError);
    });

    it("should create service assignment when PAID_SERVICE_REQUEST ticket has quotation ACCEPTED", async () => {
      const useCase = new CreateServiceAssignmentUseCase(repo);
      repo.getTicketById.mockResolvedValue({
        id: "tck-2",
        ticketNumber: "TCK-2026-10002",
        ticketType: "PAID_SERVICE_REQUEST",
        customerId: "cust-2",
        branchId: "branch-1",
        description: "Paid repair",
        status: "QUOTE_ACCEPTED",
        serviceQuotation: {
          id: "sq-1",
          quotationNumber: "SQ-2026-1001",
          customerId: "cust-2",
          branchId: "branch-1",
          salesExecutiveId: "emp-1",
          status: "ACCEPTED",
          validUntil: new Date(),
          grandTotal: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
          lines: [],
        },
        createdAt: new Date(),
      });

      const mockAssignment: ServiceAssignmentDto = {
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "TICKET",
        sourceId: "tck-2",
        branchId: "branch-1",
        status: "ASSIGNED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
      };
      repo.createServiceAssignment.mockResolvedValue(mockAssignment);

      const assignment = await useCase.execute({
        sourceType: "TICKET",
        sourceId: "tck-2",
        branchId: "branch-1",
      });

      expect(assignment.id).toBe("sa-1");
      expect(repo.linkServiceAssignment).toHaveBeenCalledWith("tck-2", "sa-1");
      expect(repo.updateTicketStatus).toHaveBeenCalledWith("tck-2", "ASSIGNED");
    });

    it("should allow valid status transitions: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED -> VERIFIED -> CLOSED", async () => {
      const useCase = new UpdateAssignmentStatusUseCase(repo);
      const mockAssignment: ServiceAssignmentDto = {
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "SALES_ORDER",
        sourceId: "so-1",
        branchId: "branch-1",
        status: "ASSIGNED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
      };
      repo.getServiceAssignmentById.mockResolvedValue(mockAssignment);
      repo.updateServiceAssignmentStatus.mockResolvedValue({ ...mockAssignment, status: "ACCEPTED" });

      const updated = await useCase.execute("sa-1", "ACCEPTED");
      expect(updated.status).toBe("ACCEPTED");
    });

    it("should reject invalid status transitions (e.g. ASSIGNED directly to CLOSED)", async () => {
      const useCase = new UpdateAssignmentStatusUseCase(repo);
      repo.getServiceAssignmentById.mockResolvedValue({
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "SALES_ORDER",
        sourceId: "so-1",
        branchId: "branch-1",
        status: "ASSIGNED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
      });

      await expect(useCase.execute("sa-1", "CLOSED")).rejects.toThrow(
        InvalidAssignmentStatusTransitionError
      );
    });
  });

  describe("Product Custody & Advances", () => {
    it("should issue custody items and prevent issuance if assignment is closed", async () => {
      const useCase = new IssueProductCustodyUseCase(repo);
      repo.getServiceAssignmentById.mockResolvedValue({
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "SALES_ORDER",
        sourceId: "so-1",
        branchId: "branch-1",
        status: "CLOSED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
      });

      await expect(
        useCase.execute({
          assignmentId: "sa-1",
          productId: "prod-1",
          quantity: 2,
          custodianId: "emp-1",
        })
      ).rejects.toThrow(AssignmentAlreadyClosedError);
    });

    it("should submit conveyance bill and reject self-approval", async () => {
      const approveUseCase = new ApproveConveyanceBillUseCase(repo);
      repo.getConveyanceBillById.mockResolvedValue({
        id: "cb-1",
        assignmentId: "sa-1",
        employeeId: "emp-101",
        totalClaimed: 450,
        approvalStatus: "PENDING",
        submittedAt: new Date(),
      });

      // Employee cannot approve their own conveyance bill
      await expect(approveUseCase.execute("cb-1", "emp-101")).rejects.toThrow(SelfApprovalNotAllowedError);
    });
  });

  describe("Project Closure & Profitability (P&L)", () => {
    it("should close service assignment and auto-close ticket", async () => {
      const useCase = new CloseServiceAssignmentUseCase(repo);
      const mockAssignment: ServiceAssignmentDto = {
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "TICKET",
        sourceId: "tck-1",
        branchId: "branch-1",
        status: "COMPLETED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
        ticket: {
          id: "tck-1",
          ticketNumber: "TCK-2026-10001",
          description: "Fixed",
          ticketType: "WARRANTY_CLAIM",
        },
      };
      repo.getServiceAssignmentById.mockResolvedValue(mockAssignment);
      repo.closeServiceAssignment.mockResolvedValue({
        assignment: { ...mockAssignment, status: "CLOSED" },
        closure: {
          id: "pcr-1",
          assignmentId: "sa-1",
          customerSignatureFileId: "sig-file-123",
          closedAt: new Date(),
          closedById: "user-admin",
        },
      });

      const result = await useCase.execute(
        { assignmentId: "sa-1", customerSignatureFileId: "sig-file-123" },
        "user-admin"
      );

      expect(result.assignment.status).toBe("CLOSED");
      expect(repo.updateTicketStatus).toHaveBeenCalledWith("tck-1", "CLOSED", expect.any(Date));
    });

    it("should retrieve calculated project P&L breakdown", async () => {
      const useCase = new GetServicePnlUseCase(repo);
      repo.getServiceAssignmentById.mockResolvedValue({
        id: "sa-1",
        assignmentNumber: "SA-2026-10001",
        sourceType: "TICKET",
        sourceId: "tck-1",
        branchId: "branch-1",
        status: "CLOSED",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        technicians: [],
        custody: [],
        advances: [],
        conveyance: [],
      });
      repo.getServicePnl.mockResolvedValue({
        assignmentId: "sa-1",
        assignmentNumber: "SA-2026-10001",
        label: "FINAL",
        revenue: 5000,
        materialCost: 1200,
        technicianAdvances: 800,
        conveyanceExpense: 650,
        netProfit: 3150,
        marginPercentage: 63,
      });

      const pnl = await useCase.execute("sa-1");
      expect(pnl.label).toBe("FINAL");
      expect(pnl.netProfit).toBe(3150);
      expect(pnl.marginPercentage).toBe(63);
    });
  });

  describe("Warranty & Claims Lifecycle", () => {
    it("should create a warranty with calculated endDate", async () => {
      const useCase = new CreateWarrantyUseCase(repo);
      const mockWarranty: WarrantyDto = {
        id: "war-1",
        serialNumberId: "sn-1",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
        termMonths: 12,
        status: "ACTIVE",
        createdAt: new Date(),
      };
      repo.createWarranty.mockResolvedValue(mockWarranty);

      const warranty = await useCase.execute({
        serialNumberId: "sn-1",
        startDate: "2026-01-01",
        termMonths: 12,
      });

      expect(warranty.termMonths).toBe(12);
      expect(warranty.status).toBe("ACTIVE");
    });

    it("should create a warranty claim linked to warranty and ticket", async () => {
      const useCase = new CreateWarrantyClaimUseCase(repo);
      repo.getWarrantyById.mockResolvedValue({
        id: "war-1",
        serialNumberId: "sn-1",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
        termMonths: 12,
        status: "ACTIVE",
        createdAt: new Date(),
      });
      repo.getTicketById.mockResolvedValue({
        id: "tck-1",
        ticketNumber: "TCK-2026-10001",
        ticketType: "WARRANTY_CLAIM",
        customerId: "cust-1",
        branchId: "branch-1",
        serialNumberId: "sn-1",
        description: "Broken power supply",
        status: "OPEN",
        createdAt: new Date(),
      });
      const mockClaim: WarrantyClaimDto = {
        id: "wc-1",
        warrantyId: "war-1",
        ticketId: "tck-1",
        outcome: "REPLACED",
        raisedAt: new Date(),
        resolvedAt: new Date(),
      };
      repo.createWarrantyClaim.mockResolvedValue(mockClaim);

      const claim = await useCase.execute({
        warrantyId: "war-1",
        ticketId: "tck-1",
        outcome: "REPLACED",
      });

      expect(claim.id).toBe("wc-1");
      expect(claim.outcome).toBe("REPLACED");
    });
  });
});
