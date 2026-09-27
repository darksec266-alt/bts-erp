import { CreatePurchaseReturnUseCase, GetPurchaseReturnUseCase, ApprovePurchaseReturnUseCase, RejectPurchaseReturnUseCase } from "./purchase-return.use-cases";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { PurchaseReturnRepository, PurchaseReturnRecord } from "./purchase-return-repository.port";
import type { GrnRepository, GrnRecord } from "./grn-repository.port";
import type { ApprovalRequestRepository, ApprovalRequestRecord } from "../../../shared/approval/approval.service";

const samplePR: PurchaseReturnRecord = {
  id: "pret_1", returnNumber: "PRET-DHK-2026-0001", grnId: "grn_1", reason: "Damaged on arrival",
  approvalStatus: "PENDING", createdById: "user_1", lines: [{ id: "l1", goodsReceiptNoteLineId: "gl_1", quantity: "2" }],
};

const sampleGrn: GrnRecord = {
  id: "grn_1", grnNumber: "GRN-DHK-2026-0001", purchaseOrderId: "po_1", status: "COMPLETE", receivedById: "user_1",
  lines: [{ id: "gl_1", purchaseOrderLineId: "line_1", productId: "prod_1", quantityReceived: "10", condition: "GOOD" }],
};

function makePRRepo(overrides: Partial<jest.Mocked<PurchaseReturnRepository>> = {}): jest.Mocked<PurchaseReturnRepository> {
  return {
    create: jest.fn().mockResolvedValue(samplePR),
    findById: jest.fn().mockResolvedValue(samplePR),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeGrnRepo(overrides: Partial<jest.Mocked<GrnRepository>> = {}): jest.Mocked<GrnRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(sampleGrn),
    list: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(sampleGrn),
    cancel: jest.fn().mockResolvedValue(sampleGrn),
    ...overrides,
  };
}

const pendingApproval: ApprovalRequestRecord = {
  id: "appr_1", approvalType: "PURCHASE_RETURN", entityType: "PurchaseReturn", entityId: "pret_1",
  requestedById: "user_1", approvedById: null, status: "PENDING", reason: "Damaged on arrival",
};

function makeApprovalService(overrides: Partial<jest.Mocked<ApprovalRequestRepository>> = {}): { service: ApprovalService; repo: jest.Mocked<ApprovalRequestRepository> } {
  const repo: jest.Mocked<ApprovalRequestRepository> = {
    create: jest.fn().mockResolvedValue(pendingApproval),
    findById: jest.fn().mockResolvedValue(pendingApproval),
    findPendingByEntity: jest.fn().mockResolvedValue(pendingApproval),
    resolve: jest.fn().mockResolvedValue({ ...pendingApproval, status: "APPROVED", approvedById: "user_2" }),
    ...overrides,
  };
  return { service: new ApprovalService(repo), repo };
}

const baseInput = { returnNumber: "PRET-DHK-2026-0001", grnId: "grn_1", reason: "Damaged on arrival", createdById: "user_1", lines: [{ goodsReceiptNoteLineId: "gl_1", quantity: "2" }] };

describe("CreatePurchaseReturnUseCase", () => {
  it("creates the return and files a PENDING approval for a non-Super-Admin requester", async () => {
    const prRepo = makePRRepo();
    const grnRepo = makeGrnRepo();
    const { service } = makeApprovalService();
    const result = await new CreatePurchaseReturnUseCase(prRepo, grnRepo, service).execute(baseInput, false);
    expect(result.approvalStatus).toBe("PENDING");
    expect(prRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("auto-approves when the requester is Super Admin", async () => {
    const prRepo = makePRRepo();
    const grnRepo = makeGrnRepo();
    const { service } = makeApprovalService({ create: jest.fn().mockResolvedValue({ ...pendingApproval, status: "APPROVED" }) });
    const result = await new CreatePurchaseReturnUseCase(prRepo, grnRepo, service).execute(baseInput, true);
    expect(result.approvalStatus).toBe("APPROVED");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pret_1", "APPROVED");
  });

  it("throws SimpleMasterDataNotFoundError for a non-existent GRN, before creating any return", async () => {
    const prRepo = makePRRepo();
    const grnRepo = makeGrnRepo({ findById: jest.fn().mockResolvedValue(null) });
    const { service } = makeApprovalService();
    await expect(new CreatePurchaseReturnUseCase(prRepo, grnRepo, service).execute(baseInput, false)).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(prRepo.create).not.toHaveBeenCalled();
  });
});

describe("GetPurchaseReturnUseCase", () => {
  it("returns the return when found", async () => {
    await expect(new GetPurchaseReturnUseCase(makePRRepo()).execute("pret_1")).resolves.toEqual(samplePR);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makePRRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetPurchaseReturnUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});

describe("ApprovePurchaseReturnUseCase / RejectPurchaseReturnUseCase", () => {
  it("approves via the ApprovalService and mirrors the status", async () => {
    const prRepo = makePRRepo();
    const { service } = makeApprovalService();
    await new ApprovePurchaseReturnUseCase(prRepo, service).execute("pret_1", "user_2");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pret_1", "APPROVED");
  });

  it("rejects via the ApprovalService and mirrors the status", async () => {
    const prRepo = makePRRepo();
    const { service } = makeApprovalService({ resolve: jest.fn().mockResolvedValue({ ...pendingApproval, status: "REJECTED", approvedById: "user_2" }) });
    await new RejectPurchaseReturnUseCase(prRepo, service).execute("pret_1", "user_2");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pret_1", "REJECTED");
  });

  it("throws SimpleMasterDataNotFoundError for a missing return before touching the ApprovalService", async () => {
    const prRepo = makePRRepo({ findById: jest.fn().mockResolvedValue(null) });
    const { service } = makeApprovalService();
    await expect(new ApprovePurchaseReturnUseCase(prRepo, service).execute("missing", "user_2")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(prRepo.updateStatus).not.toHaveBeenCalled();
  });
});
