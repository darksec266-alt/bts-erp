import { LoginUseCase, InvalidCredentialsError, AccountInactiveError } from "./login.use-case";
import type { UserRepository, RefreshTokenRepository, UserRecord, RoleRecord } from "./user-repository.port";
import type { PasswordHasher } from "./password-hasher.port";
import type { TokenService } from "./token-service.port";
import type { MfaService } from "../infrastructure/totp-mfa-service";

function makeDeps(overrides: {
  user?: UserRecord | null;
  role?: RoleRecord | null;
  passwordMatches?: boolean;
  mfaCodeValid?: boolean;
} = {}) {
  const user: UserRecord = overrides.user !== undefined ? (overrides.user as UserRecord) : {
    id: "user_1",
    email: "sales@bts.example",
    passwordHash: "hashed",
    roleId: "role_sales",
    branchId: "branch_1",
    isActive: true,
  };

  const role: RoleRecord = overrides.role !== undefined ? (overrides.role as RoleRecord) : {
    id: "role_sales",
    name: "SALES_EXECUTIVE",
    permissionCodes: ["sales.quotation.create"],
  };

  const users: jest.Mocked<UserRepository> = {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    getRoleWithPermissions: jest.fn().mockResolvedValue(role),
    setMfaSecret: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    setActive: jest.fn(),
    findRoleByName: jest.fn(),
  };

  const refreshTokens: jest.Mocked<RefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({ id: "rt_1", userId: "user_1", tokenFamily: "fam_1", revokedAt: null }),
    findByFamily: jest.fn(),
    revoke: jest.fn(),
  };

  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn().mockResolvedValue(overrides.passwordMatches ?? true),
  };

  const tokenService: jest.Mocked<TokenService> = {
    signAccessToken: jest.fn().mockReturnValue("access.token.value"),
    verifyAccessToken: jest.fn(),
    signRefreshToken: jest.fn().mockReturnValue("refresh.token.value"),
    verifyRefreshToken: jest.fn(),
    signMfaToken: jest.fn().mockReturnValue("mfa.token.value"),
    verifyMfaToken: jest.fn().mockReturnValue({ sub: "user_1" }),
    signMfaEnrollmentToken: jest.fn().mockReturnValue("mfa.enrollment.token.value"),
    verifyMfaEnrollmentToken: jest.fn().mockReturnValue({ sub: "user_1", pendingSecret: "PENDINGSECRET" }),
  };

  const mfaService: jest.Mocked<MfaService> = {
    generateSecret: jest.fn().mockReturnValue("PENDINGSECRET"),
    verifyCode: jest.fn().mockResolvedValue(overrides.mfaCodeValid ?? true),
    generateOtpAuthUrl: jest.fn().mockReturnValue("otpauth://totp/BTS:sales@bts.example?secret=PENDINGSECRET"),
  };

  return { users, refreshTokens, passwordHasher, tokenService, mfaService, user, role };
}

describe("LoginUseCase — non-MFA role", () => {
  it("issues tokens directly for a role that does not require MFA", async () => {
    const deps = makeDeps();
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    const result = await useCase.execute("sales@bts.example", "correct-password");

    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.accessToken).toBe("access.token.value");
      expect(result.refreshToken).toBe("refresh.token.value");
    }
    expect(deps.refreshTokens.create).toHaveBeenCalledWith("user_1", expect.any(String));
  });

  it("throws InvalidCredentialsError for a non-existent email without revealing that", async () => {
    const deps = makeDeps({ user: null });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);
    await expect(useCase.execute("nobody@bts.example", "anything")).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError for a wrong password", async () => {
    const deps = makeDeps({ passwordMatches: false });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);
    await expect(useCase.execute("sales@bts.example", "wrong-password")).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws AccountInactiveError for a deactivated user, even with the correct password", async () => {
    const deps = makeDeps({ user: { id: "user_1", email: "x@bts.example", passwordHash: "h", roleId: "role_sales", branchId: "branch_1", isActive: false } });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);
    await expect(useCase.execute("x@bts.example", "correct-password")).rejects.toThrow(AccountInactiveError);
  });
});

describe("LoginUseCase — MFA-required roles (Super Admin, Accounts/Finance)", () => {
  it("returns MFA_REQUIRED (not enrollment) when the account already has an mfaSecret", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true, mfaSecret: "ALREADYENROLLED" },
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    const result = await useCase.execute("sa@bts.example", "correct-password");

    expect(result.status).toBe("MFA_REQUIRED");
    if (result.status === "MFA_REQUIRED") {
      expect(result.mfaToken).toBe("mfa.token.value");
    }
    expect(deps.refreshTokens.create).not.toHaveBeenCalled();
    expect(deps.mfaService.generateSecret).not.toHaveBeenCalled();
  });

  it("returns MFA_ENROLLMENT_REQUIRED for a first-ever login on an MFA-required role with no secret yet", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true }, // no mfaSecret
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    const result = await useCase.execute("sa@bts.example", "correct-password");

    expect(result.status).toBe("MFA_ENROLLMENT_REQUIRED");
    if (result.status === "MFA_ENROLLMENT_REQUIRED") {
      expect(result.mfaToken).toBe("mfa.enrollment.token.value");
      expect(result.otpAuthUrl).toContain("otpauth://totp/");
    }
    expect(deps.tokenService.signMfaEnrollmentToken).toHaveBeenCalledWith({ sub: "user_1", pendingSecret: "PENDINGSECRET" });
  });

  it("issues tokens after a correct MFA code", async () => {
    const deps = makeDeps({
      role: { id: "role_af", name: "ACCOUNTS_FINANCE", permissionCodes: ["finance.voucher.create"] },
      user: { id: "user_1", email: "af@bts.example", passwordHash: "h", roleId: "role_af", branchId: "branch_1", isActive: true, mfaSecret: "SECRETBASE32" },
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    const result = await useCase.verifyMfaAndIssueTokens("mfa.token.value", "123456");

    expect(result.status).toBe("SUCCESS");
    expect(deps.mfaService.verifyCode).toHaveBeenCalledWith("SECRETBASE32", "123456");
  });

  it("throws InvalidCredentialsError for a wrong MFA code", async () => {
    const deps = makeDeps({
      role: { id: "role_af", name: "ACCOUNTS_FINANCE", permissionCodes: [] },
      user: { id: "user_1", email: "af@bts.example", passwordHash: "h", roleId: "role_af", branchId: "branch_1", isActive: true, mfaSecret: "SECRETBASE32" },
      mfaCodeValid: false,
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    await expect(useCase.verifyMfaAndIssueTokens("mfa.token.value", "000000")).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError if the MFA-required user has no enrolled secret yet", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true }, // no mfaSecret
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    await expect(useCase.verifyMfaAndIssueTokens("mfa.token.value", "123456")).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("LoginUseCase.enrollMfaAndIssueTokens", () => {
  it("persists the pending secret and issues tokens on a correct code", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true }, // no mfaSecret yet
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    const result = await useCase.enrollMfaAndIssueTokens("mfa.enrollment.token.value", "123456");

    expect(deps.mfaService.verifyCode).toHaveBeenCalledWith("PENDINGSECRET", "123456");
    expect(deps.users.setMfaSecret).toHaveBeenCalledWith("user_1", "PENDINGSECRET");
    expect(result.status).toBe("SUCCESS");
  });

  it("does not persist anything and throws on a wrong enrollment code", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true },
      mfaCodeValid: false,
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    await expect(useCase.enrollMfaAndIssueTokens("mfa.enrollment.token.value", "000000")).rejects.toThrow(InvalidCredentialsError);
    expect(deps.users.setMfaSecret).not.toHaveBeenCalled();
  });

  it("refuses to re-enroll an account that already has an mfaSecret (prevents a stale token overwriting it)", async () => {
    const deps = makeDeps({
      role: { id: "role_sa", name: "SUPER_ADMIN", permissionCodes: ["*"] },
      user: { id: "user_1", email: "sa@bts.example", passwordHash: "h", roleId: "role_sa", branchId: null, isActive: true, mfaSecret: "ALREADYENROLLED" },
    });
    const useCase = new LoginUseCase(deps.users, deps.refreshTokens, deps.passwordHasher, deps.tokenService, deps.mfaService);

    await expect(useCase.enrollMfaAndIssueTokens("mfa.enrollment.token.value", "123456")).rejects.toThrow(InvalidCredentialsError);
    expect(deps.users.setMfaSecret).not.toHaveBeenCalled();
  });
});
