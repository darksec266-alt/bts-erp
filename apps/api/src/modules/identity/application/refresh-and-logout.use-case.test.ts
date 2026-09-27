import { RefreshTokenUseCase, RefreshTokenInvalidError, LogoutUseCase } from "./refresh-and-logout.use-case";
import type { UserRepository, RefreshTokenRepository, UserRecord, RoleRecord, RefreshTokenRecord } from "./user-repository.port";
import type { TokenService } from "./token-service.port";

function makeDeps(overrides: { record?: RefreshTokenRecord | null; user?: UserRecord | null; role?: RoleRecord | null } = {}) {
  const record: RefreshTokenRecord | null =
    overrides.record !== undefined ? overrides.record : { id: "rt_1", userId: "user_1", tokenFamily: "fam_old", revokedAt: null };
  const user: UserRecord | null =
    overrides.user !== undefined ? overrides.user : { id: "user_1", email: "x@bts.example", passwordHash: "h", roleId: "role_1", branchId: "branch_1", isActive: true };
  const role: RoleRecord | null =
    overrides.role !== undefined ? overrides.role : { id: "role_1", name: "SALES_EXECUTIVE", permissionCodes: ["sales.quotation.create"] };

  const users: jest.Mocked<UserRepository> = {
    findByEmail: jest.fn(),
    findById: jest.fn().mockResolvedValue(user),
    getRoleWithPermissions: jest.fn().mockResolvedValue(role),
    setMfaSecret: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    setActive: jest.fn(),
    findRoleByName: jest.fn(),
  };
  const refreshTokens: jest.Mocked<RefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({ id: "rt_2", userId: "user_1", tokenFamily: "fam_new", revokedAt: null }),
    findByFamily: jest.fn().mockResolvedValue(record),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const tokenService: jest.Mocked<TokenService> = {
    signAccessToken: jest.fn().mockReturnValue("new.access.token"),
    verifyAccessToken: jest.fn(),
    signRefreshToken: jest.fn().mockReturnValue("new.refresh.token"),
    verifyRefreshToken: jest.fn().mockReturnValue({ sub: "user_1", tokenFamily: "fam_old" }),
    signMfaToken: jest.fn(),
    verifyMfaToken: jest.fn(),
    signMfaEnrollmentToken: jest.fn(),
    verifyMfaEnrollmentToken: jest.fn(),
  };

  return { users, refreshTokens, tokenService };
}

describe("RefreshTokenUseCase", () => {
  it("rotates a valid refresh token: revokes the old family, issues a new pair", async () => {
    const deps = makeDeps();
    const useCase = new RefreshTokenUseCase(deps.users, deps.refreshTokens, deps.tokenService);

    const result = await useCase.execute("old.refresh.token");

    expect(deps.refreshTokens.revoke).toHaveBeenCalledWith("fam_old");
    expect(deps.refreshTokens.create).toHaveBeenCalledWith("user_1", expect.any(String));
    // The new family must NOT be the same string as the old one being revoked.
    const newFamilyUsed = deps.refreshTokens.create.mock.calls[0]?.[1];
    expect(newFamilyUsed).not.toBe("fam_old");
    expect(result.accessToken).toBe("new.access.token");
    expect(result.refreshToken).toBe("new.refresh.token");
  });

  it("rejects a refresh token whose family was already revoked", async () => {
    const deps = makeDeps({ record: { id: "rt_1", userId: "user_1", tokenFamily: "fam_old", revokedAt: new Date() } });
    const useCase = new RefreshTokenUseCase(deps.users, deps.refreshTokens, deps.tokenService);
    await expect(useCase.execute("old.refresh.token")).rejects.toThrow(RefreshTokenInvalidError);
  });

  it("rejects a refresh token whose family no longer exists in the store", async () => {
    const deps = makeDeps({ record: null });
    const useCase = new RefreshTokenUseCase(deps.users, deps.refreshTokens, deps.tokenService);
    await expect(useCase.execute("old.refresh.token")).rejects.toThrow(RefreshTokenInvalidError);
  });

  it("rejects a refresh token for a user who has since been deactivated", async () => {
    const deps = makeDeps({ user: { id: "user_1", email: "x@bts.example", passwordHash: "h", roleId: "role_1", branchId: "branch_1", isActive: false } });
    const useCase = new RefreshTokenUseCase(deps.users, deps.refreshTokens, deps.tokenService);
    await expect(useCase.execute("old.refresh.token")).rejects.toThrow(RefreshTokenInvalidError);
  });
});

describe("LogoutUseCase", () => {
  it("revokes only the current session's token family", async () => {
    const deps = makeDeps();
    const useCase = new LogoutUseCase(deps.refreshTokens, deps.tokenService);

    await useCase.execute("some.refresh.token");

    expect(deps.refreshTokens.revoke).toHaveBeenCalledWith("fam_old");
    expect(deps.refreshTokens.revoke).toHaveBeenCalledTimes(1);
  });
});
