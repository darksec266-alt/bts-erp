import { requirePermission } from "./require-permission.middleware";
import type { Request, Response } from "express";
import type { AccessTokenPayload } from "../../modules/identity/domain/auth-types";

function makeReqRes(user?: AccessTokenPayload) {
  const req = { user } as Request;
  const res = {
    locals: { requestId: "test-req-id" },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn();
  return { req, res, next };
}

const salesUser: AccessTokenPayload = {
  sub: "user_1",
  roleId: "role_1",
  roleName: "SALES_EXECUTIVE",
  branchId: "branch_1",
  isSuperAdmin: false,
  permissions: ["sales.quotation.create", "sales.quotation.view"],
};

describe("requirePermission middleware", () => {
  it("calls next() when the user has the exact required permission", () => {
    const { req, res, next } = makeReqRes(salesUser);
    requirePermission("sales.quotation.create")(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next() when the user has at least one of several accepted permissions", () => {
    const { req, res, next } = makeReqRes(salesUser);
    requirePermission("finance.voucher.create", "sales.quotation.view")(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("responds 403 when the user lacks all required permissions", () => {
    const { req, res, next } = makeReqRes(salesUser);
    requirePermission("finance.voucher.create")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("responds 401 when no authenticated user is on the request at all", () => {
    const { req, res, next } = makeReqRes(undefined);
    requirePermission("sales.quotation.create")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("allows a Super Admin (wildcard permission) through any permission check", () => {
    const superAdmin: AccessTokenPayload = { ...salesUser, roleName: "SUPER_ADMIN", isSuperAdmin: true, permissions: ["*"] };
    const { req, res, next } = makeReqRes(superAdmin);
    requirePermission("finance.voucher.create")(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
