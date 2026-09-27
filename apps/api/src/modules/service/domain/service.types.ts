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
  serviceQuotation?: any | null;
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

export interface IssueTechnicianAdvanceRequest {
  assignmentId: string;
  employeeId: string;
  amountIssued: number;
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

export interface SubmitConveyanceBillRequest {
  assignmentId: string;
  employeeId: string;
  totalClaimed: number;
  receiptFileId?: string;
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

export interface CloseServiceAssignmentRequest {
  assignmentId: string;
  customerSignatureFileId?: string;
  notes?: string;
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

export interface RecordLocationLogRequest {
  employeeId: string;
  assignmentId?: string;
  latitude: number;
  longitude: number;
  recordedAt?: string | Date;
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

export interface TicketFilterOptions {
  branchId?: string;
  customerId?: string;
  status?: TicketStatus;
  ticketType?: TicketType;
  search?: string;
}

export interface ServiceAssignmentFilterOptions {
  branchId?: string;
  status?: AssignmentStatus;
  sourceType?: string;
  technicianEmployeeId?: string;
  search?: string;
}

export interface CustodyFilterOptions {
  assignmentId?: string;
  custodianId?: string;
  status?: CustodyStatus;
}

export interface ConveyanceFilterOptions {
  assignmentId?: string;
  employeeId?: string;
  approvalStatus?: ConveyanceApprovalStatus;
}

export interface LocationLogFilterOptions {
  employeeId?: string;
  assignmentId?: string;
  from?: Date;
  to?: Date;
}

export interface WarrantyFilterOptions {
  status?: WarrantyStatus;
  search?: string;
}

export interface ServiceRepository {
  // Tickets
  createTicket(data: CreateTicketRequest): Promise<TicketDto>;
  getTicketById(id: string): Promise<TicketDto | null>;
  getTicketByNumber(ticketNumber: string): Promise<TicketDto | null>;
  listTickets(filter?: TicketFilterOptions): Promise<TicketDto[]>;
  updateTicketStatus(id: string, status: TicketStatus, closedAt?: Date): Promise<TicketDto>;
  linkServiceAssignment(ticketId: string, serviceAssignmentId: string): Promise<TicketDto>;

  // Service Quotations
  createServiceQuotation(ticketId: string, req: CreateServiceQuotationRequest): Promise<any>;

  // Service Assignments
  createServiceAssignment(data: CreateServiceAssignmentRequest): Promise<ServiceAssignmentDto>;
  getServiceAssignmentById(id: string): Promise<ServiceAssignmentDto | null>;
  listServiceAssignments(filter?: ServiceAssignmentFilterOptions): Promise<ServiceAssignmentDto[]>;
  updateServiceAssignmentStatus(id: string, status: AssignmentStatus): Promise<ServiceAssignmentDto>;

  // Technician Assignments
  assignTechnician(assignmentId: string, employeeId: string): Promise<any>;
  unassignTechnician(assignmentId: string, employeeId: string): Promise<any>;

  // Product Custody
  issueProductCustody(data: IssueProductCustodyRequest): Promise<ProductCustodyDto>;
  getProductCustodyById(id: string): Promise<ProductCustodyDto | null>;
  updateProductCustodyStatus(custodyId: string, status: CustodyStatus): Promise<ProductCustodyDto>;
  listProductCustody(filter?: CustodyFilterOptions): Promise<ProductCustodyDto[]>;

  // Technician Advances
  issueTechnicianAdvance(data: IssueTechnicianAdvanceRequest): Promise<TechnicianAdvanceDto>;
  listTechnicianAdvances(assignmentId?: string, employeeId?: string): Promise<TechnicianAdvanceDto[]>;

  // Conveyance Bills
  submitConveyanceBill(data: SubmitConveyanceBillRequest): Promise<ConveyanceBillDto>;
  getConveyanceBillById(id: string): Promise<ConveyanceBillDto | null>;
  updateConveyanceApproval(id: string, approvalStatus: ConveyanceApprovalStatus): Promise<ConveyanceBillDto>;
  listConveyanceBills(filter?: ConveyanceFilterOptions): Promise<ConveyanceBillDto[]>;

  // Field Visits & GPS Logs
  recordLocationLog(data: RecordLocationLogRequest): Promise<LiveLocationLogDto>;
  listLocationLogs(filter?: LocationLogFilterOptions): Promise<LiveLocationLogDto[]>;

  // Project Closure & P&L
  closeServiceAssignment(
    assignmentId: string,
    closedById: string,
    customerSignatureFileId?: string
  ): Promise<{ assignment: ServiceAssignmentDto; closure: ProjectClosureReportDto }>;
  getServicePnl(assignmentId: string): Promise<ServicePnlDto>;

  // Warranties & Claims
  createWarranty(data: CreateWarrantyRequest): Promise<WarrantyDto>;
  getWarrantyById(id: string): Promise<WarrantyDto | null>;
  getWarrantyBySerialNumberId(serialNumberId: string): Promise<WarrantyDto | null>;
  listWarranties(filter?: WarrantyFilterOptions): Promise<WarrantyDto[]>;
  createWarrantyClaim(data: CreateWarrantyClaimRequest): Promise<WarrantyClaimDto>;
  listWarrantyClaims(warrantyId?: string, ticketId?: string): Promise<WarrantyClaimDto[]>;

  // Stats
  getServiceStats(branchId?: string): Promise<ServiceStatsDto>;
}
