import type {
  ServiceRepository,
  TicketDto,
  CreateTicketRequest,
  CreateServiceQuotationRequest,
  TicketFilterOptions,
  TicketStatus,
  ServiceAssignmentDto,
  CreateServiceAssignmentRequest,
  ServiceAssignmentFilterOptions,
  AssignmentStatus,
  ProductCustodyDto,
  IssueProductCustodyRequest,
  CustodyFilterOptions,
  CustodyStatus,
  TechnicianAdvanceDto,
  IssueTechnicianAdvanceRequest,
  ConveyanceBillDto,
  SubmitConveyanceBillRequest,
  ConveyanceFilterOptions,
  ConveyanceApprovalStatus,
  ProjectClosureReportDto,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

export interface ServicePrismaClient {
  ticket: AnyPrisma;
  quotation?: AnyPrisma;
  quotationLine?: AnyPrisma;
  serviceAssignment: AnyPrisma;
  technicianAssignment: AnyPrisma;
  productCustody: AnyPrisma;
  technicianAdvance: AnyPrisma;
  conveyanceBill: AnyPrisma;
  projectClosureReport: AnyPrisma;
  liveLocationLog: AnyPrisma;
  warranty: AnyPrisma;
  warrantyClaim: AnyPrisma;
  product?: AnyPrisma;
  serialNumber?: AnyPrisma;
  employee?: AnyPrisma;
  customer?: AnyPrisma;
  branch?: AnyPrisma;
  $transaction?: <T>(fn: (tx: AnyPrisma) => Promise<T>) => Promise<T>;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (
    typeof val === "object" &&
    val &&
    "toNumber" in val &&
    typeof (val as { toNumber: () => number }).toNumber === "function"
  ) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return parseFloat(String(val)) || 0;
}


function mapEmployee(e: AnyPrisma) {
  if (!e) return undefined;
  const fullName = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim();
  const parts = fullName.split(" ");
  const firstName = e.firstName || parts[0] || "";
  const lastName = e.lastName || parts.slice(1).join(" ") || "";
  return {
    id: e.id,
    employeeCode: e.employeeCode,
    fullName,
    firstName,
    lastName,
  };
}

function mapSerialNumber(s: AnyPrisma) {
  if (!s) return undefined;
  return {
    id: s.id,
    serialNumber: s.serial || s.serialNumber || "",
    product: s.product,
  };
}

export class PrismaServiceRepository implements ServiceRepository {
  constructor(private readonly prisma: ServicePrismaClient) {}

  // -------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------

  async createTicket(data: CreateTicketRequest): Promise<TicketDto> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const ticketNumber = `TCK-${year}-${randomSuffix}`;

    const created = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        ticketType: data.ticketType,
        customerId: data.customerId,
        branchId: data.branchId,
        serialNumberId: data.serialNumberId || null,
        description: data.description,
        status: "OPEN",
      },
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
    });

    return this.mapTicket(created);
  }

  async getTicketById(id: string): Promise<TicketDto | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
    });

    return ticket ? this.mapTicket(ticket) : null;
  }

  async getTicketByNumber(ticketNumber: string): Promise<TicketDto | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketNumber },
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
    });

    return ticket ? this.mapTicket(ticket) : null;
  }

  async listTickets(filter?: TicketFilterOptions): Promise<TicketDto[]> {
    const where: AnyPrisma = {};

    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.status) where.status = filter.status;
    if (filter?.ticketType) where.ticketType = filter.ticketType;
    if (filter?.search) {
      where.OR = [
        { ticketNumber: { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return tickets.map((t: AnyPrisma) => this.mapTicket(t));
  }

  async updateTicketStatus(id: string, status: TicketStatus, closedAt?: Date): Promise<TicketDto> {
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...(closedAt ? { closedAt } : {}),
      },
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
    });

    return this.mapTicket(updated);
  }

  async linkServiceAssignment(ticketId: string, serviceAssignmentId: string): Promise<TicketDto> {
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { serviceAssignmentId },
      include: {
        customer: { select: { id: true, customerCode: true, displayName: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        serviceQuotation: true,
        serviceAssignment: { select: { id: true, assignmentNumber: true, status: true } },
      },
    });

    return this.mapTicket(updated);
  }

  // -------------------------------------------------------------
  // Service Quotations
  // -------------------------------------------------------------

  async createServiceQuotation(ticketId: string, req: CreateServiceQuotationRequest): Promise<any> {
    if (!this.prisma.quotation) {
      throw new Error("Quotation delegate not configured on ServicePrismaClient");
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket not found");

    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const quotationNumber = `SQ-${year}-${randomSuffix}`;

    const grandTotal = req.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotation = await this.prisma.quotation.create({
      data: {
        quotationNumber,
        ticketId,
        customerId: req.customerId || ticket.customerId,
        branchId: req.branchId || ticket.branchId,
        salesExecutiveId: (ticket as any).customer?.id || ticket.customerId,
        validUntil,
        status: "SENT",
        grandTotal,
        lines: {
          create: req.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.quantity * l.unitPrice,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return quotation;
  }

  // -------------------------------------------------------------
  // Service Assignments
  // -------------------------------------------------------------

  async createServiceAssignment(data: CreateServiceAssignmentRequest): Promise<ServiceAssignmentDto> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const assignmentNumber = `SA-${year}-${randomSuffix}`;

    const created = await this.prisma.serviceAssignment.create({
      data: {
        assignmentNumber,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        branchId: data.branchId,
        status: "ASSIGNED",
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        technicians: {
          include: {
            technician: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        custody: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            serialNumber: { select: { id: true, serial: true } },
            custodian: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        advances: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        conveyance: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        closure: {
          include: {
            closedBy: { select: { id: true, email: true } },
          },
        },
        liveLocationLogs: {
          include: {
            employee: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        ticket: { select: { id: true, ticketNumber: true, description: true, ticketType: true } },
      },
    });

    return this.mapAssignment(created);
  }

  async getServiceAssignmentById(id: string): Promise<ServiceAssignmentDto | null> {
    const assignment = await this.prisma.serviceAssignment.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        technicians: {
          include: {
            technician: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        custody: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            serialNumber: { select: { id: true, serial: true } },
            custodian: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        advances: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        conveyance: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        closure: {
          include: {
            closedBy: { select: { id: true, email: true } },
          },
        },
        liveLocationLogs: {
          include: {
            employee: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        ticket: { select: { id: true, ticketNumber: true, description: true, ticketType: true } },
      },
    });

    return assignment ? this.mapAssignment(assignment) : null;
  }

  async listServiceAssignments(filter?: ServiceAssignmentFilterOptions): Promise<ServiceAssignmentDto[]> {
    const where: AnyPrisma = {};

    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.status) where.status = filter.status;
    if (filter?.sourceType) where.sourceType = filter.sourceType;
    if (filter?.technicianEmployeeId) {
      where.technicians = {
        some: { employeeId: filter.technicianEmployeeId },
      };
    }
    if (filter?.search) {
      where.OR = [
        { assignmentNumber: { contains: filter.search, mode: "insensitive" } },
        { sourceId: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const assignments = await this.prisma.serviceAssignment.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        technicians: {
          include: {
            technician: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        custody: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            serialNumber: { select: { id: true, serial: true } },
            custodian: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        advances: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        conveyance: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        closure: {
          include: {
            closedBy: { select: { id: true, email: true } },
          },
        },
        liveLocationLogs: {
          include: {
            employee: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        ticket: { select: { id: true, ticketNumber: true, description: true, ticketType: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return assignments.map((a: AnyPrisma) => this.mapAssignment(a));
  }

  async updateServiceAssignmentStatus(id: string, status: AssignmentStatus): Promise<ServiceAssignmentDto> {
    const updated = await this.prisma.serviceAssignment.update({
      where: { id },
      data: { status },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        technicians: {
          include: {
            technician: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        custody: {
          include: {
            product: { select: { id: true, sku: true, name: true } },
            serialNumber: { select: { id: true, serial: true } },
            custodian: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        advances: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        conveyance: {
          include: {
            technician: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        closure: {
          include: {
            closedBy: { select: { id: true, email: true } },
          },
        },
        liveLocationLogs: {
          include: {
            employee: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        ticket: { select: { id: true, ticketNumber: true, description: true, ticketType: true } },
      },
    });

    return this.mapAssignment(updated);
  }

  // -------------------------------------------------------------
  // Technician Assignment
  // -------------------------------------------------------------

  async assignTechnician(assignmentId: string, employeeId: string): Promise<any> {
    return this.prisma.technicianAssignment.create({
      data: {
        assignmentId,
        employeeId,
      },
    });
  }

  async unassignTechnician(assignmentId: string, employeeId: string): Promise<any> {
    return this.prisma.technicianAssignment.updateMany({
      where: {
        assignmentId,
        employeeId,
        unassignedAt: null,
      },
      data: {
        unassignedAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------------
  // Product Custody
  // -------------------------------------------------------------

  async issueProductCustody(data: IssueProductCustodyRequest): Promise<ProductCustodyDto> {
    const created = await this.prisma.productCustody.create({
      data: {
        assignmentId: data.assignmentId,
        productId: data.productId,
        serialNumberId: data.serialNumberId || null,
        quantity: data.quantity,
        custodianId: data.custodianId,
        status: "ASSIGNED",
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        serialNumber: { select: { id: true, serial: true } },
        custodian: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return this.mapCustody(created);
  }

  async getProductCustodyById(id: string): Promise<ProductCustodyDto | null> {
    const custody = await this.prisma.productCustody.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        serialNumber: { select: { id: true, serial: true } },
        custodian: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return custody ? this.mapCustody(custody) : null;
  }

  async updateProductCustodyStatus(custodyId: string, status: CustodyStatus): Promise<ProductCustodyDto> {
    const updated = await this.prisma.productCustody.update({
      where: { id: custodyId },
      data: { status },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        serialNumber: { select: { id: true, serial: true } },
        custodian: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return this.mapCustody(updated);
  }

  async listProductCustody(filter?: CustodyFilterOptions): Promise<ProductCustodyDto[]> {
    const where: AnyPrisma = {};
    if (filter?.assignmentId) where.assignmentId = filter.assignmentId;
    if (filter?.custodianId) where.custodianId = filter.custodianId;
    if (filter?.status) where.status = filter.status;

    const items = await this.prisma.productCustody.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        serialNumber: { select: { id: true, serial: true } },
        custodian: { select: { id: true, employeeCode: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return items.map((i: AnyPrisma) => this.mapCustody(i));
  }

  // -------------------------------------------------------------
  // Technician Advances
  // -------------------------------------------------------------

  async issueTechnicianAdvance(data: IssueTechnicianAdvanceRequest): Promise<TechnicianAdvanceDto> {
    const created = await this.prisma.technicianAdvance.create({
      data: {
        assignmentId: data.assignmentId,
        employeeId: data.employeeId,
        amountIssued: data.amountIssued,
      },
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return {
      id: created.id,
      assignmentId: created.assignmentId,
      employeeId: created.employeeId,
      amountIssued: toNumber(created.amountIssued),
      issuedAt: created.issuedAt,
      technician: created.technician,
    };
  }

  async listTechnicianAdvances(assignmentId?: string, employeeId?: string): Promise<TechnicianAdvanceDto[]> {
    const where: AnyPrisma = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (employeeId) where.employeeId = employeeId;

    const list = await this.prisma.technicianAdvance.findMany({
      where,
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
      orderBy: { issuedAt: "desc" },
    });

    return list.map((a: AnyPrisma) => ({
      id: a.id,
      assignmentId: a.assignmentId,
      employeeId: a.employeeId,
      amountIssued: toNumber(a.amountIssued),
      issuedAt: a.issuedAt,
      technician: a.technician,
    }));
  }

  // -------------------------------------------------------------
  // Conveyance Bills
  // -------------------------------------------------------------

  async submitConveyanceBill(data: SubmitConveyanceBillRequest): Promise<ConveyanceBillDto> {
    const created = await this.prisma.conveyanceBill.create({
      data: {
        assignmentId: data.assignmentId,
        employeeId: data.employeeId,
        totalClaimed: data.totalClaimed,
        approvalStatus: "PENDING",
        receiptFileId: data.receiptFileId || null,
      },
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return {
      id: created.id,
      assignmentId: created.assignmentId,
      employeeId: created.employeeId,
      totalClaimed: toNumber(created.totalClaimed),
      approvalStatus: created.approvalStatus,
      receiptFileId: created.receiptFileId,
      submittedAt: created.submittedAt,
      technician: created.technician,
    };
  }

  async getConveyanceBillById(id: string): Promise<ConveyanceBillDto | null> {
    const bill = await this.prisma.conveyanceBill.findUnique({
      where: { id },
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    if (!bill) return null;

    return {
      id: bill.id,
      assignmentId: bill.assignmentId,
      employeeId: bill.employeeId,
      totalClaimed: toNumber(bill.totalClaimed),
      approvalStatus: bill.approvalStatus,
      receiptFileId: bill.receiptFileId,
      submittedAt: bill.submittedAt,
      technician: bill.technician,
    };
  }

  async updateConveyanceApproval(id: string, approvalStatus: ConveyanceApprovalStatus): Promise<ConveyanceBillDto> {
    const updated = await this.prisma.conveyanceBill.update({
      where: { id },
      data: { approvalStatus },
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return {
      id: updated.id,
      assignmentId: updated.assignmentId,
      employeeId: updated.employeeId,
      totalClaimed: toNumber(updated.totalClaimed),
      approvalStatus: updated.approvalStatus,
      receiptFileId: updated.receiptFileId,
      submittedAt: updated.submittedAt,
      technician: updated.technician,
    };
  }

  async listConveyanceBills(filter?: ConveyanceFilterOptions): Promise<ConveyanceBillDto[]> {
    const where: AnyPrisma = {};
    if (filter?.assignmentId) where.assignmentId = filter.assignmentId;
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.approvalStatus) where.approvalStatus = filter.approvalStatus;

    const list = await this.prisma.conveyanceBill.findMany({
      where,
      include: {
        technician: { select: { id: true, employeeCode: true, fullName: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return list.map((b: AnyPrisma) => ({
      id: b.id,
      assignmentId: b.assignmentId,
      employeeId: b.employeeId,
      totalClaimed: toNumber(b.totalClaimed),
      approvalStatus: b.approvalStatus,
      receiptFileId: b.receiptFileId,
      submittedAt: b.submittedAt,
      technician: b.technician,
    }));
  }

  // -------------------------------------------------------------
  // Field Visits & GPS Logs
  // -------------------------------------------------------------

  async recordLocationLog(data: RecordLocationLogRequest): Promise<LiveLocationLogDto> {
    const created = await this.prisma.liveLocationLog.create({
      data: {
        employeeId: data.employeeId,
        assignmentId: data.assignmentId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
      include: {
        employee: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    return {
      id: created.id,
      employeeId: created.employeeId,
      assignmentId: created.assignmentId,
      latitude: toNumber(created.latitude),
      longitude: toNumber(created.longitude),
      recordedAt: created.recordedAt,
      employee: created.employee,
    };
  }

  async listLocationLogs(filter?: LocationLogFilterOptions): Promise<LiveLocationLogDto[]> {
    const where: AnyPrisma = {};
    if (filter?.employeeId) where.employeeId = filter.employeeId;
    if (filter?.assignmentId) where.assignmentId = filter.assignmentId;
    if (filter?.from || filter?.to) {
      where.recordedAt = {};
      if (filter.from) where.recordedAt.gte = filter.from;
      if (filter.to) where.recordedAt.lte = filter.to;
    }

    const list = await this.prisma.liveLocationLog.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeCode: true, fullName: true } },
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    return list.map((l: AnyPrisma) => ({
      id: l.id,
      employeeId: l.employeeId,
      assignmentId: l.assignmentId,
      latitude: toNumber(l.latitude),
      longitude: toNumber(l.longitude),
      recordedAt: l.recordedAt,
      employee: mapEmployee(l.employee),
    }));
  }

  // -------------------------------------------------------------
  // Project Closure & P&L
  // -------------------------------------------------------------

  async closeServiceAssignment(
    assignmentId: string,
    closedById: string,
    customerSignatureFileId?: string
  ): Promise<{ assignment: ServiceAssignmentDto; closure: ProjectClosureReportDto }> {
    const updateFn = async (tx: AnyPrisma) => {
      const closure = await tx.projectClosureReport.upsert({
        where: { assignmentId },
        update: {
          customerSignatureFileId: customerSignatureFileId || null,
          closedAt: new Date(),
          closedById,
        },
        create: {
          assignmentId,
          customerSignatureFileId: customerSignatureFileId || null,
          closedAt: new Date(),
          closedById,
        },
        include: {
          closedBy: { select: { id: true, email: true } },
        },
      });

      const updatedAssignment = await tx.serviceAssignment.update({
        where: { id: assignmentId },
        data: { status: "CLOSED" },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          technicians: {
            include: {
              technician: {
                select: { id: true, employeeCode: true, fullName: true },
              },
            },
          },
          custody: {
            include: {
              product: { select: { id: true, sku: true, name: true } },
              serialNumber: { select: { id: true, serial: true } },
              custodian: { select: { id: true, employeeCode: true, fullName: true } },
            },
          },
          advances: {
            include: {
              technician: { select: { id: true, employeeCode: true, fullName: true } },
            },
          },
          conveyance: {
            include: {
              technician: { select: { id: true, employeeCode: true, fullName: true } },
            },
          },
          closure: {
            include: {
              closedBy: { select: { id: true, email: true } },
            },
          },
          ticket: { select: { id: true, ticketNumber: true, description: true, ticketType: true } },
        },
      });

      return {
        assignment: this.mapAssignment(updatedAssignment),
        closure: {
          id: closure.id,
          assignmentId: closure.assignmentId,
          customerSignatureFileId: closure.customerSignatureFileId,
          closedAt: closure.closedAt,
          closedById: closure.closedById,
          closedBy: closure.closedBy,
        },
      };
    };

    if (this.prisma.$transaction) {
      return this.prisma.$transaction(updateFn);
    }
    return updateFn(this.prisma);
  }

  async getServicePnl(assignmentId: string): Promise<ServicePnlDto> {
    const assignment = await this.prisma.serviceAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        advances: true,
        conveyance: { where: { approvalStatus: "APPROVED" } },
        custody: {
          where: { status: { in: ["USED", "SOLD_TO_CUSTOMER"] } },
          include: { product: true },
        },
        closure: true,
        ticket: {
          include: {
            serviceQuotation: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    // Revenue calculation
    let revenue = 0;
    if (assignment.ticket?.serviceQuotation) {
      revenue = toNumber(assignment.ticket.serviceQuotation.grandTotal);
    }

    // Material cost calculation
    let materialCost = 0;
    for (const c of assignment.custody || []) {
      const qty = toNumber(c.quantity);
      const unitCost = toNumber(c.product?.costPrice || 0);
      materialCost += qty * unitCost;
    }

    // Technician Advances & Conveyance
    const technicianAdvances = (assignment.advances || []).reduce(
      (sum: number, a: AnyPrisma) => sum + toNumber(a.amountIssued),
      0
    );

    const conveyanceExpense = (assignment.conveyance || []).reduce(
      (sum: number, b: AnyPrisma) => sum + toNumber(b.totalClaimed),
      0
    );

    const totalExpense = materialCost + conveyanceExpense;
    const netProfit = revenue - totalExpense;
    const marginPercentage = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      assignmentId: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      label: assignment.status === "CLOSED" ? "FINAL" : "INTERIM",
      revenue: Math.round(revenue * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      technicianAdvances: Math.round(technicianAdvances * 100) / 100,
      conveyanceExpense: Math.round(conveyanceExpense * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      marginPercentage: Math.round(marginPercentage * 100) / 100,
    };
  }

  // -------------------------------------------------------------
  // Warranties & Claims
  // -------------------------------------------------------------

  async createWarranty(data: CreateWarrantyRequest): Promise<WarrantyDto> {
    const startDate = new Date(data.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.termMonths);

    const created = await this.prisma.warranty.create({
      data: {
        serialNumberId: data.serialNumberId,
        startDate,
        endDate,
        termMonths: data.termMonths,
        status: "ACTIVE",
      },
      include: {
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    return {
      id: created.id,
      serialNumberId: created.serialNumberId,
      startDate: created.startDate,
      endDate: created.endDate,
      termMonths: created.termMonths,
      status: created.status,
      createdAt: created.createdAt,
      serialNumber: mapSerialNumber(created.serialNumber),
    };
  }

  async getWarrantyById(id: string): Promise<WarrantyDto | null> {
    const warranty = await this.prisma.warranty.findUnique({
      where: { id },
      include: {
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        claims: true,
      },
    });

    if (!warranty) return null;

    return {
      id: warranty.id,
      serialNumberId: warranty.serialNumberId,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      termMonths: warranty.termMonths,
      status: warranty.status,
      createdAt: warranty.createdAt,
      serialNumber: mapSerialNumber(warranty.serialNumber),
      claims: warranty.claims,
    };
  }

  async getWarrantyBySerialNumberId(serialNumberId: string): Promise<WarrantyDto | null> {
    const warranty = await this.prisma.warranty.findUnique({
      where: { serialNumberId },
      include: {
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        claims: true,
      },
    });

    if (!warranty) return null;

    return {
      id: warranty.id,
      serialNumberId: warranty.serialNumberId,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      termMonths: warranty.termMonths,
      status: warranty.status,
      createdAt: warranty.createdAt,
      serialNumber: warranty.serialNumber,
      claims: warranty.claims,
    };
  }

  async listWarranties(filter?: WarrantyFilterOptions): Promise<WarrantyDto[]> {
    const where: AnyPrisma = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.search) {
      where.serialNumber = { serial: { contains: filter.search, mode: "insensitive" },
      };
    }

    const list = await this.prisma.warranty.findMany({
      where,
      include: {
        serialNumber: {
          select: {
            id: true,
            serial: true,
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return list.map((w: AnyPrisma) => ({
      id: w.id,
      serialNumberId: w.serialNumberId,
      startDate: w.startDate,
      endDate: w.endDate,
      termMonths: w.termMonths,
      status: w.status,
      createdAt: w.createdAt,
      serialNumber: mapSerialNumber(w.serialNumber),
    }));
  }

  async createWarrantyClaim(data: CreateWarrantyClaimRequest): Promise<WarrantyClaimDto> {
    const created = await this.prisma.warrantyClaim.create({
      data: {
        warrantyId: data.warrantyId,
        ticketId: data.ticketId,
        outcome: data.outcome || null,
        raisedAt: new Date(),
        resolvedAt: data.outcome ? new Date() : null,
      },
    });

    return {
      id: created.id,
      warrantyId: created.warrantyId,
      ticketId: created.ticketId,
      outcome: created.outcome,
      raisedAt: created.raisedAt,
      resolvedAt: created.resolvedAt,
    };
  }

  async listWarrantyClaims(warrantyId?: string, ticketId?: string): Promise<WarrantyClaimDto[]> {
    const where: AnyPrisma = {};
    if (warrantyId) where.warrantyId = warrantyId;
    if (ticketId) where.ticketId = ticketId;

    const list = await this.prisma.warrantyClaim.findMany({
      where,
      orderBy: { raisedAt: "desc" },
    });

    return list.map((c: AnyPrisma) => ({
      id: c.id,
      warrantyId: c.warrantyId,
      ticketId: c.ticketId,
      outcome: c.outcome,
      raisedAt: c.raisedAt,
      resolvedAt: c.resolvedAt,
    }));
  }

  // -------------------------------------------------------------
  // Service Stats
  // -------------------------------------------------------------

  async getServiceStats(branchId?: string): Promise<ServiceStatsDto> {
    const branchWhere = branchId ? { branchId } : {};

    const [
      totalTickets,
      openTickets,
      activeAssignments,
      inProgressAssignments,
      closedAssignments,
      pendingConveyanceBills,
      activeWarranties,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: branchWhere }),
      this.prisma.ticket.count({
        where: {
          ...branchWhere,
          status: { in: ["OPEN", "QUOTE_PENDING", "QUOTE_ACCEPTED", "ASSIGNED", "IN_PROGRESS"] },
        },
      }),
      this.prisma.serviceAssignment.count({
        where: {
          ...branchWhere,
          status: { notIn: ["CLOSED", "CANCELLED"] },
        },
      }),
      this.prisma.serviceAssignment.count({
        where: {
          ...branchWhere,
          status: "IN_PROGRESS",
        },
      }),
      this.prisma.serviceAssignment.count({
        where: {
          ...branchWhere,
          status: "CLOSED",
        },
      }),
      this.prisma.conveyanceBill.count({
        where: {
          approvalStatus: "PENDING",
        },
      }),
      this.prisma.warranty.count({
        where: {
          status: "ACTIVE",
        },
      }),
    ]);

    return {
      totalTickets,
      openTickets,
      activeAssignments,
      inProgressAssignments,
      closedAssignments,
      pendingConveyanceBills,
      activeWarranties,
    };
  }

  // -------------------------------------------------------------
  // Private Mappers
  // -------------------------------------------------------------

  private mapTicket(t: AnyPrisma): TicketDto {
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      ticketType: t.ticketType,
      customerId: t.customerId,
      branchId: t.branchId,
      serialNumberId: t.serialNumberId,
      description: t.description,
      status: t.status,
      serviceAssignmentId: t.serviceAssignmentId,
      createdAt: t.createdAt,
      closedAt: t.closedAt,
      customer: t.customer,
      branch: t.branch,
      serialNumber: mapSerialNumber(t.serialNumber),
      serviceQuotation: t.serviceQuotation
        ? {
            id: t.serviceQuotation.id,
            quotationNumber: t.serviceQuotation.quotationNumber,
            customerId: t.serviceQuotation.customerId,
            branchId: t.serviceQuotation.branchId,
            salesExecutiveId: t.serviceQuotation.salesExecutiveId,
            status: t.serviceQuotation.status,
            validUntil: t.serviceQuotation.validUntil,
            grandTotal: toNumber(t.serviceQuotation.grandTotal),
            createdAt: t.serviceQuotation.createdAt,
            updatedAt: t.serviceQuotation.updatedAt,
            lines: [],
          }
        : null,
      serviceAssignment: t.serviceAssignment,
    };
  }

  private mapAssignment(a: AnyPrisma): ServiceAssignmentDto {
    return {
      id: a.id,
      assignmentNumber: a.assignmentNumber,
      sourceType: a.sourceType,
      sourceId: a.sourceId,
      branchId: a.branchId,
      status: a.status,
      version: a.version,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      branch: a.branch,
      technicians: (a.technicians || []).map((t: AnyPrisma) => ({
        id: t.id,
        assignmentId: t.assignmentId,
        employeeId: t.employeeId,
        assignedAt: t.assignedAt,
        unassignedAt: t.unassignedAt,
        technician: mapEmployee(t.technician),
      })),
      custody: (a.custody || []).map((c: AnyPrisma) => this.mapCustody(c)),
      advances: (a.advances || []).map((ad: AnyPrisma) => ({
        id: ad.id,
        assignmentId: ad.assignmentId,
        employeeId: ad.employeeId,
        amountIssued: toNumber(ad.amountIssued),
        issuedAt: ad.issuedAt,
        technician: mapEmployee(ad.technician),
      })),
      conveyance: (a.conveyance || []).map((cv: AnyPrisma) => ({
        id: cv.id,
        assignmentId: cv.assignmentId,
        employeeId: cv.employeeId,
        totalClaimed: toNumber(cv.totalClaimed),
        approvalStatus: cv.approvalStatus,
        receiptFileId: cv.receiptFileId,
        submittedAt: cv.submittedAt,
        technician: mapEmployee(cv.technician),
      })),
      closure: a.closure
        ? {
            id: a.closure.id,
            assignmentId: a.closure.assignmentId,
            customerSignatureFileId: a.closure.customerSignatureFileId,
            closedAt: a.closure.closedAt,
            closedById: a.closure.closedById,
            closedBy: a.closure.closedBy,
          }
        : null,
      liveLocationLogs: (a.liveLocationLogs || []).map((l: AnyPrisma) => ({
        id: l.id,
        employeeId: l.employeeId,
        assignmentId: l.assignmentId,
        latitude: toNumber(l.latitude),
        longitude: toNumber(l.longitude),
        recordedAt: l.recordedAt,
        employee: l.employee,
      })),
      ticket: a.ticket,
    };
  }

  private mapCustody(c: AnyPrisma): ProductCustodyDto {
    return {
      id: c.id,
      assignmentId: c.assignmentId,
      serialNumberId: c.serialNumberId,
      productId: c.productId,
      quantity: toNumber(c.quantity),
      status: c.status,
      custodianId: c.custodianId,
      createdAt: c.createdAt,
      product: c.product,
      serialNumber: mapSerialNumber(c.serialNumber),
      custodian: mapEmployee(c.custodian),
    };
  }
}
