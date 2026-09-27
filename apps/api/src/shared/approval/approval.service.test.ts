import { ApprovalService, SelfApprovalError, ApprovalRequestNotFoundError, ApprovalAlreadyResolvedError } from "./approval.service";
import type { ApprovalRequestRepository, ApprovalRequestRecord } from "./approval.service";

const pendingRequest: ApprovalRequestRecord = {
  id: "appr_1", approvalType: "PURCHASE_REQUEST", entityType: "PurchaseRequest", entityId: "pr_1",
  requestedById: "user_requester", approvedById: null, status: "PENDING", reason: "Restock CCTV cameras",
};

function makeRepo(overrides: Partial<jest.Mocked<ApprovalRequestRepository>> = {}): jest.Mocked<ApprovalRequestRepository> {
  return {
    create: jest.fn().mockResolvedValue(pendingRequest),
    findById: jest.fn().mockResolvedValue(pendingRequest),
    findPendingByEntity: jest.fn().mockResolvedValue(pendingRequest),
    resolve: jest.fn().mockResolvedValue({ ...pendingRequest, status: "APPROVED", approvedById: "user_approver" }),
    ...overrides,
  };
}

describe("ApprovalService.createRequest", () => {
  it("creates a normal (not auto-approved) request for a non-Super-Admin requester", async () => {
    const repo = makeRepo();
    await new ApprovalService(repo).createRequest({
      approvalType: "PURCHASE_REQUEST", entityType: "PurchaseRequest", entityId: "pr_1",
      requestedById: "user_1", requestedByIsSuperAdmin: false, reason: "Restock",
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ autoApproved: false }));
  });

  it("marks a Super Admin's own request auto-approved", async () => {
    const repo = makeRepo();
    await new ApprovalService(repo).createRequest({
      approvalType: "PURCHASE_REQUEST", entityType: "PurchaseRequest", entityId: "pr_2",
      requestedById: "user_sa", requestedByIsSuperAdmin: true, reason: "Restock",
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ autoApproved: true }));
  });
});

describe("ApprovalService.approve / reject", () => {
  it("approves a pending request from a different user", async () => {
    const repo = makeRepo();
    const result = await new ApprovalService(repo).approve("appr_1", "user_approver");
    expect(result.status).toBe("APPROVED");
    expect(repo.resolve).toHaveBeenCalledWith("appr_1", "user_approver", "APPROVED");
  });

  it("rejects a pending request from a different user", async () => {
    const repo = makeRepo({ resolve: jest.fn().mockResolvedValue({ ...pendingRequest, status: "REJECTED", approvedById: "user_approver" }) });
    const result = await new ApprovalService(repo).reject("appr_1", "user_approver");
    expect(result.status).toBe("REJECTED");
  });

  it("throws SelfApprovalError when the approver is the same as the requester", async () => {
    const repo = makeRepo();
    await expect(new ApprovalService(repo).approve("appr_1", "user_requester")).rejects.toThrow(SelfApprovalError);
    expect(repo.resolve).not.toHaveBeenCalled();
  });

  it("throws ApprovalRequestNotFoundError for a missing id", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new ApprovalService(repo).approve("missing", "user_approver")).rejects.toThrow(ApprovalRequestNotFoundError);
  });

  it("throws ApprovalAlreadyResolvedError for a request that is no longer PENDING", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue({ ...pendingRequest, status: "APPROVED" }) });
    await expect(new ApprovalService(repo).approve("appr_1", "user_approver")).rejects.toThrow(ApprovalAlreadyResolvedError);
    expect(repo.resolve).not.toHaveBeenCalled();
  });
});

describe("ApprovalService.approveByEntity / rejectByEntity", () => {
  it("looks up the pending approval for the entity, then approves it", async () => {
    const repo = makeRepo();
    const result = await new ApprovalService(repo).approveByEntity("PurchaseRequest", "pr_1", "user_approver");
    expect(repo.findPendingByEntity).toHaveBeenCalledWith("PurchaseRequest", "pr_1");
    expect(repo.resolve).toHaveBeenCalledWith("appr_1", "user_approver", "APPROVED");
    expect(result.status).toBe("APPROVED");
  });

  it("throws ApprovalRequestNotFoundError when no pending approval exists for the entity", async () => {
    const repo = makeRepo({ findPendingByEntity: jest.fn().mockResolvedValue(null) });
    await expect(new ApprovalService(repo).approveByEntity("PurchaseRequest", "pr_1", "user_approver")).rejects.toThrow(ApprovalRequestNotFoundError);
    expect(repo.resolve).not.toHaveBeenCalled();
  });

  it("still enforces self-approval even when looked up by entity", async () => {
    const repo = makeRepo();
    await expect(new ApprovalService(repo).approveByEntity("PurchaseRequest", "pr_1", "user_requester")).rejects.toThrow(SelfApprovalError);
  });
});
