import { CreatePurchaseRequestUseCase, GetPurchaseRequestUseCase, ListPurchaseRequestsUseCase, ApprovePurchaseRequestUseCase, RejectPurchaseRequestUseCase } from "./purchase-request.use-cases";
import { ApprovalService } from "../../../shared/approval/approval.service";
import { SimpleMasterDataNotFoundError } from "../../master-data/domain/simple-master-data.types";
import type { PurchaseRequestRepository, PurchaseRequestRecord } from "./purchase-request-repository.port";
import type { ApprovalRequestRepository, ApprovalRequestRecord } from "../../../shared/approval/approval.service";

const samplePR: PurchaseRequestRecord = {
  id: "pr_1", requestNumber: "PR-DHK-2026-0001", branchId: "branch_1", requestedById: "user_1", status: "PENDING",
  lines: [{ id: "line_1", productId: "prod_1", quantity: "10", notes: null }],
};

function makePRRepo(overrides: Partial<jest.Mocked<PurchaseRequestRepository>> = {}): jest.Mocked<PurchaseRequestRepository> {
  return {
    create: jest.fn().mockResolvedValue(samplePR),
    findById: jest.fn().mockResolvedValue(samplePR),
    list: jest.fn().mockResolvedValue({ items: [samplePR], total: 1 }),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const pendingApproval: ApprovalRequestRecord = {
  id: "appr_1", approvalType: "PURCHASE_REQUEST", entityType: "PurchaseRequest", entityId: "pr_1",
  requestedById: "user_1", approvedById: null, status: "PENDING", reason: "Purchase requisition PR-DHK-2026-0001",
};

function makeApprovalService(overrides: Partial<jest.Mocked<ApprovalRequestRepository>> = {}): ApprovalService {
  const repo: jest.Mocked<ApprovalRequestRepository> = {
    create: jest.fn().mockResolvedValue(pendingApproval),
    findById: jest.fn().mockResolvedValue(pendingApproval),
    findPendingByEntity: jest.fn().mockResolvedValue(pendingApproval),
    resolve: jest.fn().mockResolvedValue({ ...pendingApproval, status: "APPROVED", approvedById: "user_2" }),
    ...overrides,
  };
  return new ApprovalService(repo);
}

describe("CreatePurchaseRequestUseCase", () => {
  it("creates the PR and files a PENDING approval for a non-Super-Admin requester", async () => {
    const prRepo = makePRRepo();
    const approvalService = makeApprovalService();
    const useCase = new CreatePurchaseRequestUseCase(prRepo, approvalService);

    const result = await useCase.execute({ requestNumber: "PR-DHK-2026-0001", branchId: "branch_1", requestedById: "user_1", lines: [{ productId: "prod_1", quantity: "10" }] }, false);

    expect(result.status).toBe("PENDING");
    expect(prRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("auto-approves and reflects APPROVED status when the requester is Super Admin", async () => {
    const prRepo = makePRRepo();
    const approvalService = makeApprovalService({
      create: jest.fn().mockResolvedValue({ ...pendingApproval, status: "APPROVED" }),
    });
    const useCase = new CreatePurchaseRequestUseCase(prRepo, approvalService);

    const result = await useCase.execute({ requestNumber: "PR-DHK-2026-0002", branchId: "branch_1", requestedById: "user_sa", lines: [{ productId: "prod_1", quantity: "10" }] }, true);

    expect(result.status).toBe("APPROVED");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pr_1", "APPROVED");
  });
});

describe("GetPurchaseRequestUseCase / ListPurchaseRequestsUseCase", () => {
  it("returns the PR when found", async () => {
    await expect(new GetPurchaseRequestUseCase(makePRRepo()).execute("pr_1")).resolves.toEqual(samplePR);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makePRRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetPurchaseRequestUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makePRRepo();
    await new ListPurchaseRequestsUseCase(repo).execute({ branchId: "branch_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ branchId: "branch_1" }, { skip: 0, take: 20 });
  });
});

describe("ApprovePurchaseRequestUseCase / RejectPurchaseRequestUseCase", () => {
  it("approves via the ApprovalService and mirrors the status onto the PR", async () => {
    const prRepo = makePRRepo();
    const approvalService = makeApprovalService();
    await new ApprovePurchaseRequestUseCase(prRepo, approvalService).execute("pr_1", "user_2");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pr_1", "APPROVED");
  });

  it("rejects via the ApprovalService and mirrors the status onto the PR", async () => {
    const prRepo = makePRRepo();
    const approvalService = makeApprovalService({
      resolve: jest.fn().mockResolvedValue({ ...pendingApproval, status: "REJECTED", approvedById: "user_2" }),
    });
    await new RejectPurchaseRequestUseCase(prRepo, approvalService).execute("pr_1", "user_2");
    expect(prRepo.updateStatus).toHaveBeenCalledWith("pr_1", "REJECTED");
  });

  it("throws SimpleMasterDataNotFoundError for a missing PR before ever touching the ApprovalService", async () => {
    const prRepo = makePRRepo({ findById: jest.fn().mockResolvedValue(null) });
    const approvalService = makeApprovalService();
    await expect(new ApprovePurchaseRequestUseCase(prRepo, approvalService).execute("missing", "user_2")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(prRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("propagates SelfApprovalError from the ApprovalService without updating PR status", async () => {
    const prRepo = makePRRepo();
    const approvalService = makeApprovalService(); // pendingApproval.requestedById === "user_1"
    await expect(new ApprovePurchaseRequestUseCase(prRepo, approvalService).execute("pr_1", "user_1")).rejects.toThrow();
    expect(prRepo.updateStatus).not.toHaveBeenCalled();
  });
});
