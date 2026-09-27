export class TicketNotFoundError extends Error {
  readonly code = "TICKET_NOT_FOUND";
  constructor(id: string) {
    super(`Ticket with ID "${id}" was not found.`);
    this.name = "TicketNotFoundError";
  }
}

export class ServiceAssignmentNotFoundError extends Error {
  readonly code = "SERVICE_ASSIGNMENT_NOT_FOUND";
  constructor(id: string) {
    super(`Service Assignment with ID "${id}" was not found.`);
    this.name = "ServiceAssignmentNotFoundError";
  }
}

export class TechnicianAssignmentNotFoundError extends Error {
  readonly code = "TECHNICIAN_ASSIGNMENT_NOT_FOUND";
  constructor(id: string) {
    super(`Technician Assignment with ID "${id}" was not found.`);
    this.name = "TechnicianAssignmentNotFoundError";
  }
}

export class ProductCustodyNotFoundError extends Error {
  readonly code = "PRODUCT_CUSTODY_NOT_FOUND";
  constructor(id: string) {
    super(`Product Custody with ID "${id}" was not found.`);
    this.name = "ProductCustodyNotFoundError";
  }
}

export class TechnicianAdvanceNotFoundError extends Error {
  readonly code = "TECHNICIAN_ADVANCE_NOT_FOUND";
  constructor(id: string) {
    super(`Technician Advance with ID "${id}" was not found.`);
    this.name = "TechnicianAdvanceNotFoundError";
  }
}

export class ConveyanceBillNotFoundError extends Error {
  readonly code = "CONVEYANCE_BILL_NOT_FOUND";
  constructor(id: string) {
    super(`Conveyance Bill with ID "${id}" was not found.`);
    this.name = "ConveyanceBillNotFoundError";
  }
}

export class WarrantyNotFoundError extends Error {
  readonly code = "WARRANTY_NOT_FOUND";
  constructor(id: string) {
    super(`Warranty with ID "${id}" was not found.`);
    this.name = "WarrantyNotFoundError";
  }
}

export class WarrantyClaimNotFoundError extends Error {
  readonly code = "WARRANTY_CLAIM_NOT_FOUND";
  constructor(id: string) {
    super(`Warranty Claim with ID "${id}" was not found.`);
    this.name = "WarrantyClaimNotFoundError";
  }
}

export class InvalidAssignmentStatusTransitionError extends Error {
  readonly code = "INVALID_STATUS_TRANSITION";
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition Service Assignment status from ${currentStatus} to ${targetStatus}.`);
    this.name = "InvalidAssignmentStatusTransitionError";
  }
}

export class PaidServiceQuotationRequiredError extends Error {
  readonly code = "PAID_SERVICE_QUOTATION_REQUIRED";
  constructor(ticketNumber: string) {
    super(
      `Cannot create Service Assignment for paid service ticket ${ticketNumber} because its linked quotation is not ACCEPTED.`
    );
    this.name = "PaidServiceQuotationRequiredError";
  }
}

export class ServiceQuotationInvalidTicketTypeError extends Error {
  readonly code = "INVALID_TICKET_TYPE_FOR_QUOTATION";
  constructor(ticketType: string) {
    super(`Service Quotation can only be created for PAID_SERVICE_REQUEST tickets, but ticket is ${ticketType}.`);
    this.name = "ServiceQuotationInvalidTicketTypeError";
  }
}

export class WarrantyClaimSerialNumberRequiredError extends Error {
  readonly code = "SERIAL_NUMBER_REQUIRED_FOR_WARRANTY";
  constructor() {
    super("serialNumberId is required when ticketType is WARRANTY_CLAIM.");
    this.name = "WarrantyClaimSerialNumberRequiredError";
  }
}

export class AssignmentAlreadyClosedError extends Error {
  readonly code = "ASSIGNMENT_ALREADY_CLOSED";
  constructor(id: string) {
    super(`Service Assignment ${id} is already closed.`);
    this.name = "AssignmentAlreadyClosedError";
  }
}

export class CustomerSignatureRequiredError extends Error {
  readonly code = "CUSTOMER_SIGNATURE_REQUIRED";
  constructor() {
    super("Customer signature file or sign-off is required to close a service assignment.");
    this.name = "CustomerSignatureRequiredError";
  }
}

export class SelfApprovalNotAllowedError extends Error {
  readonly code = "SELF_APPROVAL_NOT_ALLOWED";
  constructor() {
    super("Users cannot approve their own conveyance bills or requests.");
    this.name = "SelfApprovalNotAllowedError";
  }
}
