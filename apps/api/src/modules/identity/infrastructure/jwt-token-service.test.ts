import { JwtTokenService } from "./jwt-token-service";
import type { AccessTokenPayload, RefreshTokenPayload } from "../domain/auth-types";

const config = {
  accessTokenSecret: "test-access-secret",
  refreshTokenSecret: "test-refresh-secret",
  mfaTokenSecret: "test-mfa-secret",
  mfaEnrollmentTokenSecret: "test-mfa-enrollment-secret",
  accessTokenTtl: "15m",
  refreshTokenTtl: "30d",
  mfaTokenTtl: "5m",
  mfaEnrollmentTokenTtl: "5m",
};

const samplePayload: AccessTokenPayload = {
  sub: "user_1",
  roleId: "role_1",
  roleName: "SALES_EXECUTIVE",
  branchId: "branch_1",
  isSuperAdmin: false,
  permissions: ["sales.quotation.create", "sales.quotation.view"],
};

describe("JwtTokenService", () => {
  const service = new JwtTokenService(config);

  it("round-trips an access token payload", () => {
    const token = service.signAccessToken(samplePayload);
    const decoded = service.verifyAccessToken(token);
    expect(decoded.sub).toBe("user_1");
    expect(decoded.roleName).toBe("SALES_EXECUTIVE");
    expect(decoded.permissions).toEqual(["sales.quotation.create", "sales.quotation.view"]);
  });

  it("round-trips a refresh token payload", () => {
    const payload: RefreshTokenPayload = { sub: "user_1", tokenFamily: "family_abc" };
    const token = service.signRefreshToken(payload);
    const decoded = service.verifyRefreshToken(token);
    expect(decoded).toMatchObject(payload);
  });

  it("rejects an access token verified with the wrong secret (refresh secret)", () => {
    const token = service.signAccessToken(samplePayload);
    const wrongService = new JwtTokenService({ ...config, accessTokenSecret: "different-secret" });
    expect(() => wrongService.verifyAccessToken(token)).toThrow();
  });

  it("rejects a refresh token presented to verifyAccessToken (different secret/purpose)", () => {
    const refreshToken = service.signRefreshToken({ sub: "user_1", tokenFamily: "f1" });
    expect(() => service.verifyAccessToken(refreshToken)).toThrow();
  });

  it("mints and verifies an MFA token bound to a user id", () => {
    const mfaToken = service.signMfaToken("user_42");
    const decoded = service.verifyMfaToken(mfaToken);
    expect(decoded.sub).toBe("user_42");
  });

  it("round-trips an MFA enrollment token carrying a pending secret", () => {
    const token = service.signMfaEnrollmentToken({ sub: "user_1", pendingSecret: "PENDINGBASE32SECRET" });
    const decoded = service.verifyMfaEnrollmentToken(token);
    expect(decoded).toMatchObject({ sub: "user_1", pendingSecret: "PENDINGBASE32SECRET" });
  });

  it("keeps the MFA token and MFA enrollment token secrets genuinely separate", () => {
    const mfaToken = service.signMfaToken("user_1");
    // A normal MFA token must not verify as an enrollment token (different secret).
    expect(() => service.verifyMfaEnrollmentToken(mfaToken)).toThrow();

    const enrollmentToken = service.signMfaEnrollmentToken({ sub: "user_1", pendingSecret: "S" });
    // And an enrollment token must not verify as a normal MFA token either.
    expect(() => service.verifyMfaToken(enrollmentToken)).toThrow();
  });

  it("expires an access token issued with a negative TTL immediately", () => {
    const shortLivedService = new JwtTokenService({ ...config, accessTokenTtl: "-1s" });
    const token = shortLivedService.signAccessToken(samplePayload);
    expect(() => shortLivedService.verifyAccessToken(token)).toThrow();
  });
});
