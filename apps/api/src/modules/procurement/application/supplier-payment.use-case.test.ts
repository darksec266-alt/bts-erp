import { RecordSupplierPaymentUseCase } from "./supplier-payment.use-case";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { SupplierPaymentRepository, SupplierPaymentRecord } from "./supplier-payment-repository.port";
import type { PurchaseInvoiceRepository, PurchaseInvoiceRecord } from "./purchase-invoice-repository.port";

const samplePayment: SupplierPaymentRecord = { id: "pay_1", purchaseInvoiceId: "inv_1", amount: "50000.00", method: "BANK" };
const sampleInvoice: PurchaseInvoiceRecord = { id: "inv_1", invoiceNumber: "PINV-DHK-2026-0001", purchaseOrderId: "po_1", grnId: "grn_1", grandTotal: "50000.00" };

function makePaymentRepo(overrides: Partial<jest.Mocked<SupplierPaymentRepository>> = {}): jest.Mocked<SupplierPaymentRepository> {
  return {
    create: jest.fn().mockResolvedValue(samplePayment),
    findByIdempotencyKey: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeInvoiceRepo(overrides: Partial<jest.Mocked<PurchaseInvoiceRepository>> = {}): jest.Mocked<PurchaseInvoiceRepository> {
  return { create: jest.fn(), findByIdempotencyKey: jest.fn(), findById: jest.fn().mockResolvedValue(sampleInvoice), ...overrides };
}

const baseInput = { purchaseInvoiceId: "inv_1", amount: "50000.00", method: "BANK", idempotencyKey: "idem-pay-1" };

describe("RecordSupplierPaymentUseCase", () => {
  it("records a new payment when the idempotency key hasn't been used", async () => {
    const paymentRepo = makePaymentRepo();
    const invoiceRepo = makeInvoiceRepo();
    const result = await new RecordSupplierPaymentUseCase(paymentRepo, invoiceRepo).execute(baseInput);
    expect(result).toEqual(samplePayment);
    expect(paymentRepo.create).toHaveBeenCalledTimes(1);
  });

  it("returns the SAME payment on a retried request, without recording a second one (the core reason api-spec.md §14 requires this key)", async () => {
    const paymentRepo = makePaymentRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(samplePayment) });
    const invoiceRepo = makeInvoiceRepo();
    const result = await new RecordSupplierPaymentUseCase(paymentRepo, invoiceRepo).execute(baseInput);
    expect(result).toEqual(samplePayment);
    expect(paymentRepo.create).not.toHaveBeenCalled();
  });

  it("throws SimpleMasterDataNotFoundError for a non-existent Purchase Invoice", async () => {
    const paymentRepo = makePaymentRepo();
    const invoiceRepo = makeInvoiceRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new RecordSupplierPaymentUseCase(paymentRepo, invoiceRepo).execute(baseInput)).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(paymentRepo.create).not.toHaveBeenCalled();
  });
});
