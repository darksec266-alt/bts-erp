import { hasPermission, hasAnyPermission, roleRequiresMfa } from "./auth-types";

describe("hasPermission", () => {
  it("returns true when the exact code is present", () => {
    expect(hasPermission(["sales.quotation.create"], "sales.quotation.create")).toBe(true);
  });

  it("returns false when the code is absent", () => {
    expect(hasPermission(["sales.quotation.create"], "finance.voucher.create")).toBe(false);
  });

  it("returns true for any required code when the wildcard is present (Super Admin)", () => {
    expect(hasPermission(["*"], "finance.voucher.create")).toBe(true);
  });
});

describe("hasAnyPermission", () => {
  it("returns true if at least one of several required codes is present", () => {
    expect(hasAnyPermission(["sales.quotation.view"], ["sales.quotation.create", "sales.quotation.view"])).toBe(true);
  });

  it("returns false if none of the required codes are present", () => {
    expect(hasAnyPermission(["sales.quotation.view"], ["finance.voucher.create", "hr.payroll.run"])).toBe(false);
  });

  it("short-circuits true on the wildcard without needing a matching specific code", () => {
    expect(hasAnyPermission(["*"], ["anything.at.all"])).toBe(true);
  });
});

describe("roleRequiresMfa", () => {
  it("requires MFA for SUPER_ADMIN", () => {
    expect(roleRequiresMfa("SUPER_ADMIN")).toBe(true);
  });

  it("requires MFA for ACCOUNTS_FINANCE", () => {
    expect(roleRequiresMfa("ACCOUNTS_FINANCE")).toBe(true);
  });

  it("does not require MFA for every other role", () => {
    for (const role of ["ADMIN", "BRANCH_MANAGER", "SALES_EXECUTIVE", "WAREHOUSE_STAFF", "TECHNICIAN"]) {
      expect(roleRequiresMfa(role)).toBe(false);
    }
  });
});
