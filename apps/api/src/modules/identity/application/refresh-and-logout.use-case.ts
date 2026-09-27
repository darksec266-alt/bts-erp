import { randomUUID } from "node:crypto";
import type { UserRepository, RefreshTokenRepository } from "./user-repository.port";
import type { TokenService } from "./token-service.port";

export class RefreshTokenInvalidError extends Error {
  constructor(reason: string) {
    super(`Refresh token rejected: ${reason}`);
    this.name = "RefreshTokenInvalidError";
  }
}

// api-spec.md §5: "rotates the refresh token; the old one is invalidated
// immediately (no refresh-token reuse window)." The "family" pattern:
// verifying the JWT proves the token is well-formed and unexpired, but the
// DB row is the actual source of truth for "has this been revoked" — a
// still-cryptographically-valid but already-rotated-away token must still
// be rejected, which JWT verification alone cannot do.
export class RefreshTokenUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken); // throws on bad signature/expiry

    const record = await this.refreshTokens.findByFamily(payload.tokenFamily);
    if (!record || record.revokedAt !== null || record.userId !== payload.sub) {
      throw new RefreshTokenInvalidError("token family not found, already revoked, or user mismatch");
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new RefreshTokenInvalidError("user no longer active");
    }
    const role = await this.users.getRoleWithPermissions(user.roleId);
    if (!role) {
      throw new RefreshTokenInvalidError("role no longer exists");
    }

    // Rotate: revoke the old family, issue a brand new one — reusing the
    // family id itself would let a stolen-but-not-yet-used old refresh
    // token still work after a legitimate rotation, defeating the point.
    await this.refreshTokens.revoke(payload.tokenFamily);
    const newFamily = randomUUID();
    await this.refreshTokens.create(user.id, newFamily);

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      roleId: role.id,
      roleName: role.name,
      branchId: user.branchId,
      isSuperAdmin: role.name === "SUPER_ADMIN",
      permissions: role.permissionCodes,
    });
    const newRefreshToken = this.tokenService.signRefreshToken({ sub: user.id, tokenFamily: newFamily });

    return { accessToken, refreshToken: newRefreshToken };
  }
}

// api-spec.md §5: "revokes the current refresh token; does not invalidate
// other active sessions for the same user" — revoking by tokenFamily
// (this one session), never by userId (every session), is what makes that
// true.
export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    await this.refreshTokens.revoke(payload.tokenFamily);
  }
}
