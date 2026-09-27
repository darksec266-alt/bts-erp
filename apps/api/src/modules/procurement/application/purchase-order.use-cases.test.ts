import { CreatePurchaseOrderUseCase, GetPurchaseOrderUseCase, ListPurchaseOrdersUseCase, PurchaseRequestNotApprovedError, PurchaseRequestAlreadyOrderedError } from "./purchase-order.use-cases";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { PurchaseOrderRepository, PurchaseOrderRecord } from "./purchase-order-repository.port";
import type { PurchaseRequestRepository, PurchaseRequestRecord } from "./purchase-request-repository.port";

const samplePO: PurchaseOrderRecord = {
  id: "po_1", poNumber: "PO-DHK-2026-0001", purchaseRequestId: null, supplierId: "sup_1", branchId: "branch_1",
  grandTotal: "50000.00", lines: [{ id: "line_1", productId: "prod_1", quantity: "10", unitPrice: "5000.00", lineTotal: "50000.00" }],
};

const approvedPR: PurchaseRequestRecord = {
  id: "pr_1", requestNumber: "PR-DHK-2026-0001", branchId: "branch_1", requestedById: "user_1", status: "APPROVED",
  lines: [{ id: "line_1", productId: "prod_1", quantity: "10", notes: null }],
};

function makePORepo(overrides: Partial<jest.Mocked<PurchaseOrderRepository>> = {}): jest.Mocked<PurchaseOrderRepository> {
  return {
    create: jest.fn().mockResolvedValue(samplePO),
    findById: jest.fn().mockResolvedValue(samplePO),
    list: jest.fn().mockResolvedValue({ items: [samplePO], total: 1 }),
    ...overrides,
  };
}

function makePRRepo(overrides: Partial<jest.Mocked<PurchaseRequestRepository>> = {}): jest.Mocked<PurchaseRequestRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(approvedPR),
    list: jest.fn(),
    updateStatus: jest.fn(),
    ...overrides,
  };
}

describe("CreatePurchaseOrderUseCase — standalone (no PR link)", () => {
  it("creates without checking any PR", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo();
    await new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
      poNumber: "PO-DHK-2026-0001", supplierId: "sup_1", branchId: "branch_1",
      lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
    });
    expect(prRepo.findById).not.toHaveBeenCalled();
    expect(poRepo.create).toHaveBeenCalledTimes(1);
  });
});

describe("CreatePurchaseOrderUseCase — linked to a Purchase Requisition", () => {
  it("creates when the linked PR is APPROVED", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo();
    await new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
      poNumber: "PO-DHK-2026-0001", purchaseRequestId: "pr_1", supplierId: "sup_1", branchId: "branch_1",
      lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
    });
    expect(poRepo.create).toHaveBeenCalledTimes(1);
  });

  it("rejects when the linked PR is still PENDING", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo({ findById: jest.fn().mockResolvedValue({ ...approvedPR, status: "PENDING" }) });
    await expect(
      new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
        poNumber: "PO-DHK-2026-0002", purchaseRequestId: "pr_1", supplierId: "sup_1", branchId: "branch_1",
        lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
      })
    ).rejects.toThrow(PurchaseRequestNotApprovedError);
    expect(poRepo.create).not.toHaveBeenCalled();
  });

  it("rejects when the linked PR was REJECTED", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo({ findById: jest.fn().mockResolvedValue({ ...approvedPR, status: "REJECTED" }) });
    await expect(
      new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
        poNumber: "PO-DHK-2026-0003", purchaseRequestId: "pr_1", supplierId: "sup_1", branchId: "branch_1",
        lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
      })
    ).rejects.toThrow(PurchaseRequestNotApprovedError);
  });

  it("rejects when the linked PR has already been fulfilled by another PO", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo({
      findById: jest.fn().mockResolvedValue({
        ...approvedPR,
        purchaseOrder: { id: "po_existing", poNumber: "PO-DHK-2026-9999" },
      }),
    });
    await expect(
      new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
        poNumber: "PO-DHK-2026-0005", purchaseRequestId: "pr_1", supplierId: "sup_1", branchId: "branch_1",
        lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
      })
    ).rejects.toThrow(PurchaseRequestAlreadyOrderedError);
    expect(poRepo.create).not.toHaveBeenCalled();
  });

  it("throws SimpleMasterDataNotFoundError when the linked PR id does not exist", async () => {
    const poRepo = makePORepo();
    const prRepo = makePRRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(
      new CreatePurchaseOrderUseCase(poRepo, prRepo).execute({
        poNumber: "PO-DHK-2026-0004", purchaseRequestId: "missing", supplierId: "sup_1", branchId: "branch_1",
        lines: [{ productId: "prod_1", quantity: "10", unitPrice: "5000.00" }],
      })
    ).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(poRepo.create).not.toHaveBeenCalled();
  });
});

describe("GetPurchaseOrderUseCase / ListPurchaseOrdersUseCase", () => {
  it("returns the PO when found", async () => {
    await expect(new GetPurchaseOrderUseCase(makePORepo()).execute("po_1")).resolves.toEqual(samplePO);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makePORepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetPurchaseOrderUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makePORepo();
    await new ListPurchaseOrdersUseCase(repo).execute({ branchId: "branch_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ branchId: "branch_1" }, { skip: 0, take: 20 });
  });
});
