import type { AccessTokenPayload, RefreshTokenPayload, MfaEnrollmentTokenPayload } from "../domain/auth-types";

export interface TokenService {
  signAccessToken(payload: AccessTokenPayload): string;
  verifyAccessToken(token: string): AccessTokenPayload; // throws on invalid/expired
  signRefreshToken(payload: RefreshTokenPayload): string;
  verifyRefreshToken(token: string): RefreshTokenPayload; // throws on invalid/expired
  // A short-lived, single-purpose token binding a login attempt to its MFA
  // step (api-spec.md §5's mfaToken) — deliberately a separate, narrower
  // token type from both of the above, never accepted by any other endpoint.
  signMfaToken(userId: string): string;
  verifyMfaToken(token: string): { sub: string };
  // First-time MFA setup (see domain/auth-types.ts's MfaEnrollmentTokenPayload
  // comment) — a distinct token type/secret from signMfaToken/verifyMfaToken
  // so a normal login's MFA step can never be satisfied by replaying an
  // enrollment token, or vice versa.
  signMfaEnrollmentToken(payload: MfaEnrollmentTokenPayload): string;
  verifyMfaEnrollmentToken(token: string): MfaEnrollmentTokenPayload;
}
