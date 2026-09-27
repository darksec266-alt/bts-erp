export class QuotationNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Quotation not found: ${identifier}`);
    this.name = "QuotationNotFoundError";
  }
}

export class SalesOrderNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Sales Order not found: ${identifier}`);
    this.name = "SalesOrderNotFoundError";
  }
}

export class DeliveryChallanNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Delivery Challan not found: ${identifier}`);
    this.name = "DeliveryChallanNotFoundError";
  }
}

export class InvalidQuotationStatusTransitionError extends Error {
  constructor(current: string, next: string) {
    super(`Cannot transition quotation status from '${current}' to '${next}'.`);
    this.name = "InvalidQuotationStatusTransitionError";
  }
}

export class QuotationAlreadyConvertedError extends Error {
  constructor(quotationNumber: string) {
    super(`Quotation '${quotationNumber}' has already been converted to a Sales Order.`);
    this.name = "QuotationAlreadyConvertedError";
  }
}
