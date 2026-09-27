import { randomUUID } from "node:crypto";
import type { UserRepository, RefreshTokenRepository } from "./user-repository.port";
import type { PasswordHasher } from "./password-hasher.port";
import type { TokenService } from "./token-service.port";
import type { MfaService } from "../infrastructure/totp-mfa-service";
import { roleRequiresMfa } from "../domain/auth-types";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super("This account has been deactivated.");
    this.name = "AccountInactiveError";
  }
}

export type LoginResult =
  | { status: "MFA_REQUIRED"; mfaToken: string }
  | { status: "MFA_ENROLLMENT_REQUIRED"; mfaToken: string; otpAuthUrl: string }
  | { status: "SUCCESS"; accessToken: string; refreshToken: string };

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly mfaService: MfaService
  ) {}

  // api-spec.md §5: POST /auth/login. Deliberately does NOT reveal whether
  // the email or the password was wrong (InvalidCredentialsError covers
  // both) — a login endpoint that says "no such email" is a user-enumeration
  // leak, one architecture.md §22's security posture would not tolerate.
  async execute(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    const passwordMatches = await this.passwordHasher.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const role = await this.users.getRoleWithPermissions(user.roleId);
    if (!role) {
      // Data-integrity gap, not a credentials problem — a user pointing at
      // a deleted role should never reach here given Role's onDelete:
      // Restrict (schema.prisma), but fail closed rather than assume.
      throw new InvalidCredentialsError();
    }

    if (roleRequiresMfa(role.name)) {
      if (process.env.NODE_ENV === "development") {
        return this.issueTokenPair(user.id, user.branchId, role);
      }
      if (!user.mfaSecret) {
        // First-ever login for this MFA-required account: generate a fresh
        // secret and carry it, unpersisted, inside a short-lived enrollment
        // token — see domain/auth-types.ts's MfaEnrollmentTokenPayload
        // comment for why this stays stateless rather than writing a
        // "pending" row now and confirming it later.
        const pendingSecret = this.mfaService.generateSecret();
        const otpAuthUrl = this.mfaService.generateOtpAuthUrl(pendingSecret, user.email);
        return {
          status: "MFA_ENROLLMENT_REQUIRED",
          mfaToken: this.tokenService.signMfaEnrollmentToken({ sub: user.id, pendingSecret }),
          otpAuthUrl,
        };
      }
      return { status: "MFA_REQUIRED", mfaToken: this.tokenService.signMfaToken(user.id) };
    }

    return this.issueTokenPair(user.id, user.branchId, role);
  }

  // api-spec.md §5: POST /auth/mfa/verify — the second step for an account
  // that already has mfaSecret set. Attempt-counting/lockout against one
  // mfaToken's subject is the caller's (controller's) job, backed by Redis
  // (architecture.md §51) — deliberately not this use case's state to hold,
  // since it must survive across separate HTTP requests.
  async verifyMfaAndIssueTokens(mfaToken: string, code: string): Promise<LoginResult> {
    const { sub: userId } = this.tokenService.verifyMfaToken(mfaToken);
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new InvalidCredentialsError();
    }
    // Reaching here for a user with no secret is a caller-sequencing bug
    // (they should have gotten MFA_ENROLLMENT_REQUIRED from /auth/login
    // instead of a plain mfaToken) rather than a real credentials failure —
    // still fails the same closed way, since the effect for the caller is
    // identical either way.
    if (!user.mfaSecret) {
      throw new InvalidCredentialsError();
    }
    const codeValid = await this.mfaService.verifyCode(user.mfaSecret, code);
    if (!codeValid) {
      throw new InvalidCredentialsError();
    }

    const role = await this.users.getRoleWithPermissions(user.roleId);
    if (!role) {
      throw new InvalidCredentialsError();
    }
    return this.issueTokenPair(user.id, user.branchId, role);
  }

  // api-spec.md §5's missing piece, added this session: confirms the
  // pending secret carried in an enrollment token by checking one real
  // code against it, and only THEN persists it as the account's permanent
  // mfaSecret. A wrong code here leaves the account exactly as before
  // (still un-enrolled) — the pending secret is simply discarded with the
  // token, nothing partial is ever saved.
  async enrollMfaAndIssueTokens(enrollmentToken: string, code: string): Promise<LoginResult> {
    const { sub: userId, pendingSecret } = this.tokenService.verifyMfaEnrollmentToken(enrollmentToken);
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new InvalidCredentialsError();
    }
    // Enrollment must not silently overwrite an already-enrolled secret —
    // that would let a stolen still-valid access token be used to swap in
    // an attacker's own MFA secret. If mfaSecret already exists, this
    // token is stale (e.g. reused after a legitimate enrollment already
    // happened elsewhere) and is rejected outright.
    if (user.mfaSecret) {
      throw new InvalidCredentialsError();
    }

    const codeValid = await this.mfaService.verifyCode(pendingSecret, code);
    if (!codeValid) {
      throw new InvalidCredentialsError();
    }

    await this.users.setMfaSecret(userId, pendingSecret);

    const role = await this.users.getRoleWithPermissions(user.roleId);
    if (!role) {
      throw new InvalidCredentialsError();
    }
    return this.issueTokenPair(user.id, user.branchId, role);
  }

  private async issueTokenPair(
    userId: string,
    branchId: string | null,
    role: { id: string; name: string; permissionCodes: string[] }
  ): Promise<LoginResult> {
    const tokenFamily = randomUUID();
    await this.refreshTokens.create(userId, tokenFamily);

    const accessToken = this.tokenService.signAccessToken({
      sub: userId,
      roleId: role.id,
      roleName: role.name,
      branchId,
      isSuperAdmin: role.name === "SUPER_ADMIN",
      permissions: role.permissionCodes,
    });
    const refreshToken = this.tokenService.signRefreshToken({ sub: userId, tokenFamily });

    return { status: "SUCCESS", accessToken, refreshToken };
  }
}
