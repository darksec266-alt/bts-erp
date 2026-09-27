import { ReceiveGoodsUseCase, GetGrnUseCase, ListGrnsUseCase } from "./grn.use-cases";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { GrnRepository, GrnRecord, CreateGrnInput } from "./grn-repository.port";
import type { PurchaseOrderRepository, PurchaseOrderRecord } from "./purchase-order-repository.port";
import type { ApprovalRequestRepository, ApprovalRequestRecord } from "../../../shared/approval/approval.service";

const samplePO: PurchaseOrderRecord = {
  id: "po_1", poNumber: "PO-DHK-2026-0001", purchaseRequestId: null, supplierId: "sup_1", branchId: "branch_1",
  grandTotal: "50000.00", lines: [{ id: "line_1", productId: "prod_1", quantity: "10", unitPrice: "5000.00", lineTotal: "50000.00" }],
};

function makeCompleteGrn(): GrnRecord {
  return {
    id: "grn_1", grnNumber: "GRN-DHK-2026-0001", purchaseOrderId: "po_1", status: "COMPLETE", receivedById: "user_1",
    lines: [{ id: "gl_1", purchaseOrderLineId: "line_1", productId: "prod_1", quantityReceived: "10", condition: "GOOD" }],
  };
}

function makeDiscrepantGrn(): GrnRecord {
  return { ...makeCompleteGrn(), status: "DISCREPANT", lines: [{ ...makeCompleteGrn().lines[0]!, quantityReceived: "8", condition: "SHORT" }] };
}

function makeGrnRepo(overrides: Partial<jest.Mocked<GrnRepository>> = {}): jest.Mocked<GrnRepository> {
  return {
    create: jest.fn().mockResolvedValue(makeCompleteGrn()),
    findById: jest.fn().mockResolvedValue(makeCompleteGrn()),
    list: jest.fn().mockResolvedValue({ items: [makeCompleteGrn()], total: 1 }),
    updateStatus: jest.fn().mockResolvedValue(makeCompleteGrn()),
    cancel: jest.fn().mockResolvedValue(makeCompleteGrn()),
    ...overrides,
  };
}

function makePORepo(overrides: Partial<jest.Mocked<PurchaseOrderRepository>> = {}): jest.Mocked<PurchaseOrderRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(samplePO),
    list: jest.fn(),
    ...overrides,
  };
}

const pendingApproval: ApprovalRequestRecord = {
  id: "appr_1", approvalType: "GRN_DISCREPANCY", entityType: "GoodsReceiptNote", entityId: "grn_1",
  requestedById: "user_1", approvedById: null, status: "PENDING", reason: "GRN discrepancy",
};

function makeApprovalService(overrides: Partial<jest.Mocked<ApprovalRequestRepository>> = {}): { service: ApprovalService; repo: jest.Mocked<ApprovalRequestRepository> } {
  const repo: jest.Mocked<ApprovalRequestRepository> = {
    create: jest.fn().mockResolvedValue(pendingApproval),
    findById: jest.fn().mockResolvedValue(pendingApproval),
    findPendingByEntity: jest.fn().mockResolvedValue(pendingApproval),
    resolve: jest.fn(),
    ...overrides,
  };
  return { service: new ApprovalService(repo), repo };
}

const baseInput: CreateGrnInput = {
  grnNumber: "GRN-DHK-2026-0001", purchaseOrderId: "po_1", status: "COMPLETE", receivedById: "user_1",
  lines: [{ purchaseOrderLineId: "line_1", productId: "prod_1", quantityReceived: "10", condition: "GOOD" }],
};

describe("ReceiveGoodsUseCase — COMPLETE receipt (no discrepancy)", () => {
  it("creates the GRN and never touches the ApprovalService", async () => {
    const grnRepo = makeGrnRepo();
    const poRepo = makePORepo();
    const { service, repo: approvalRepo } = makeApprovalService();

    const result = await new ReceiveGoodsUseCase(grnRepo, poRepo, service).execute(baseInput, false);

    expect(result.status).toBe("COMPLETE");
    expect(approvalRepo.create).not.toHaveBeenCalled();
  });
});

describe("ReceiveGoodsUseCase — DISCREPANT receipt", () => {
  it("creates the GRN AND auto-files a GRN_DISCREPANCY approval request", async () => {
    const grnRepo = makeGrnRepo({ create: jest.fn().mockResolvedValue(makeDiscrepantGrn()) });
    const poRepo = makePORepo();
    const { service, repo: approvalRepo } = makeApprovalService();

    const result = await new ReceiveGoodsUseCase(grnRepo, poRepo, service).execute({ ...baseInput, status: "DISCREPANT" }, false);

    expect(result.status).toBe("DISCREPANT");
    expect(approvalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ approvalType: "GRN_DISCREPANCY", entityType: "GoodsReceiptNote", entityId: "grn_1", autoApproved: false })
    );
  });

  it("marks the auto-filed approval auto-approved when the receiver is Super Admin", async () => {
    const grnRepo = makeGrnRepo({ create: jest.fn().mockResolvedValue(makeDiscrepantGrn()) });
    const poRepo = makePORepo();
    const { service, repo: approvalRepo } = makeApprovalService();

    await new ReceiveGoodsUseCase(grnRepo, poRepo, service).execute({ ...baseInput, status: "DISCREPANT" }, true);

    expect(approvalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ autoApproved: true }));
  });

  it("throws SimpleMasterDataNotFoundError for a non-existent Purchase Order, before creating any GRN", async () => {
    const grnRepo = makeGrnRepo();
    const poRepo = makePORepo({ findById: jest.fn().mockResolvedValue(null) });
    const { service } = makeApprovalService();

    await expect(new ReceiveGoodsUseCase(grnRepo, poRepo, service).execute(baseInput, false)).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(grnRepo.create).not.toHaveBeenCalled();
  });
});

describe("GetGrnUseCase / ListGrnsUseCase", () => {
  it("returns the GRN when found", async () => {
    await expect(new GetGrnUseCase(makeGrnRepo()).execute("grn_1")).resolves.toBeDefined();
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makeGrnRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetGrnUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makeGrnRepo();
    await new ListGrnsUseCase(repo).execute({ purchaseOrderId: "po_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ purchaseOrderId: "po_1" }, { skip: 0, take: 20 });
  });
});
