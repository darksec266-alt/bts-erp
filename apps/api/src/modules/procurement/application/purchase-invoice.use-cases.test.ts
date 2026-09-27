import { CreatePurchaseInvoiceUseCase, GetPurchaseInvoiceUseCase } from "./purchase-invoice.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { PurchaseInvoiceRepository, PurchaseInvoiceRecord } from "./purchase-invoice-repository.port";
import type { PurchaseOrderRepository, PurchaseOrderRecord } from "./purchase-order-repository.port";

const sampleInvoice: PurchaseInvoiceRecord = { id: "inv_1", invoiceNumber: "PINV-DHK-2026-0001", purchaseOrderId: "po_1", grnId: "grn_1", grandTotal: "50000.00" };
const samplePO: PurchaseOrderRecord = { id: "po_1", poNumber: "PO-DHK-2026-0001", purchaseRequestId: null, supplierId: "sup_1", branchId: "branch_1", grandTotal: "50000.00", lines: [] };

function makeInvoiceRepo(overrides: Partial<jest.Mocked<PurchaseInvoiceRepository>> = {}): jest.Mocked<PurchaseInvoiceRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleInvoice),
    findByIdempotencyKey: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(sampleInvoice),
    ...overrides,
  };
}

function makePORepo(overrides: Partial<jest.Mocked<PurchaseOrderRepository>> = {}): jest.Mocked<PurchaseOrderRepository> {
  return { create: jest.fn(), findById: jest.fn().mockResolvedValue(samplePO), list: jest.fn(), ...overrides };
}

const baseInput = { invoiceNumber: "PINV-DHK-2026-0001", purchaseOrderId: "po_1", grnId: "grn_1", grandTotal: "50000.00", idempotencyKey: "idem-1" };

describe("CreatePurchaseInvoiceUseCase", () => {
  it("creates a new invoice when the idempotency key hasn't been used", async () => {
    const invoiceRepo = makeInvoiceRepo();
    const poRepo = makePORepo();
    const result = await new CreatePurchaseInvoiceUseCase(invoiceRepo, poRepo).execute(baseInput);
    expect(result).toEqual(sampleInvoice);
    expect(invoiceRepo.create).toHaveBeenCalledTimes(1);
  });

  it("returns the SAME invoice on a retried request with the same idempotency key, without creating a second one", async () => {
    const invoiceRepo = makeInvoiceRepo({ findByIdempotencyKey: jest.fn().mockResolvedValue(sampleInvoice) });
    const poRepo = makePORepo();
    const result = await new CreatePurchaseInvoiceUseCase(invoiceRepo, poRepo).execute(baseInput);
    expect(result).toEqual(sampleInvoice);
    expect(invoiceRepo.create).not.toHaveBeenCalled();
    expect(poRepo.findById).not.toHaveBeenCalled(); // short-circuits before even checking the PO
  });

  it("throws SimpleMasterDataNotFoundError for a non-existent Purchase Order", async () => {
    const invoiceRepo = makeInvoiceRepo();
    const poRepo = makePORepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new CreatePurchaseInvoiceUseCase(invoiceRepo, poRepo).execute(baseInput)).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(invoiceRepo.create).not.toHaveBeenCalled();
  });
});

describe("GetPurchaseInvoiceUseCase", () => {
  it("returns the invoice when found", async () => {
    await expect(new GetPurchaseInvoiceUseCase(makeInvoiceRepo()).execute("inv_1")).resolves.toEqual(sampleInvoice);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makeInvoiceRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetPurchaseInvoiceUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});
