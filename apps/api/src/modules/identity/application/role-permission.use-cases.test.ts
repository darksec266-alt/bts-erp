import {
  ListRolesUseCase,
  GetRolePermissionsUseCase,
  ListPermissionsUseCase,
  UpdateRolePermissionsUseCase,
  RoleNotFoundForPermissionsError,
  UnknownPermissionCodeError,
} from "./role-permission.use-cases";
import type { RolePermissionRepository } from "./role-permission.use-cases";
import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";

function makeRepo(overrides: Partial<jest.Mocked<RolePermissionRepository>> = {}): jest.Mocked<RolePermissionRepository> {
  return {
    listRoles: jest.fn().mockResolvedValue([{ id: "role_1", name: "SALES_EXECUTIVE" }, { id: "role_2", name: "ADMIN" }]),
    listPermissionCodes: jest.fn().mockResolvedValue(["sales.manage", "sales.view"]),
    listAllPermissionCodes: jest.fn().mockResolvedValue(["sales.manage", "sales.view", "finance.manage", "finance.view"]),
    setPermissionCodes: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAuditLog(): jest.Mocked<AuditLogWriter> {
  return { write: jest.fn().mockResolvedValue(undefined) };
}

describe("ListRolesUseCase / GetRolePermissionsUseCase / ListPermissionsUseCase", () => {
  it("lists all roles", async () => {
    const repo = makeRepo();
    await expect(new ListRolesUseCase(repo).execute()).resolves.toEqual([
      { id: "role_1", name: "SALES_EXECUTIVE" },
      { id: "role_2", name: "ADMIN" },
    ]);
  });

  it("gets a role's permission codes", async () => {
    const repo = makeRepo();
    await expect(new GetRolePermissionsUseCase(repo).execute("role_1")).resolves.toEqual(["sales.manage", "sales.view"]);
  });

  it("lists the full permission catalog", async () => {
    const repo = makeRepo();
    const result = await new ListPermissionsUseCase(repo).execute();
    expect(result).toContain("finance.manage");
  });
});

describe("UpdateRolePermissionsUseCase", () => {
  it("replaces the role's permission bundle and writes a security audit entry", async () => {
    const repo = makeRepo();
    const auditLog = makeAuditLog();
    const useCase = new UpdateRolePermissionsUseCase(repo, auditLog);

    await useCase.execute("role_1", ["finance.manage", "finance.view"], "actor_super_admin");

    expect(repo.setPermissionCodes).toHaveBeenCalledWith("role_1", ["finance.manage", "finance.view"]);
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Role",
        entityId: "role_1",
        action: "PERMISSIONS_CHANGED",
        actorId: "actor_super_admin",
        beforeJson: { permissionCodes: ["sales.manage", "sales.view"] },
        afterJson: { permissionCodes: ["finance.manage", "finance.view"] },
      })
    );
  });

  it("allows the '*' wildcard without requiring it to appear in the catalog", async () => {
    const repo = makeRepo();
    const useCase = new UpdateRolePermissionsUseCase(repo, makeAuditLog());
    await expect(useCase.execute("role_1", ["*"], "actor_1")).resolves.toBeUndefined();
    expect(repo.setPermissionCodes).toHaveBeenCalledWith("role_1", ["*"]);
  });

  it("rejects an unknown permission code before writing anything", async () => {
    const repo = makeRepo();
    const auditLog = makeAuditLog();
    const useCase = new UpdateRolePermissionsUseCase(repo, auditLog);

    await expect(useCase.execute("role_1", ["sales.manage", "not.a.real.code"], "actor_1")).rejects.toThrow(UnknownPermissionCodeError);
    expect(repo.setPermissionCodes).not.toHaveBeenCalled();
    expect(auditLog.write).not.toHaveBeenCalled();
  });

  it("rejects a role id that doesn't exist", async () => {
    const repo = makeRepo();
    const useCase = new UpdateRolePermissionsUseCase(repo, makeAuditLog());

    await expect(useCase.execute("role_does_not_exist", ["sales.manage"], "actor_1")).rejects.toThrow(RoleNotFoundForPermissionsError);
    expect(repo.setPermissionCodes).not.toHaveBeenCalled();
  });
});
