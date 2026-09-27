import jwt from "jsonwebtoken";
import type { TokenService } from "../application/token-service.port";
import type { AccessTokenPayload, RefreshTokenPayload, MfaEnrollmentTokenPayload } from "../domain/auth-types";

// architecture.md §22: "JWT access token (short-lived) + refresh token
// (rotated, revocable)." Three separate signing secrets — an access token
// leaking never lets someone mint a refresh token or vice versa, and the
// MFA token's own secret+short TTL keeps a captured mfaToken (api-spec.md
// §5) useless outside the 5-attempt lockout window it's already bound to.
export interface JwtTokenServiceConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  mfaTokenSecret: string;
  mfaEnrollmentTokenSecret: string; // deliberately distinct from mfaTokenSecret — see token-service.port.ts's comment
  accessTokenTtl: string; // e.g. "15m"
  refreshTokenTtl: string; // e.g. "30d"
  mfaTokenTtl: string; // e.g. "5m"
  mfaEnrollmentTokenTtl: string; // e.g. "5m"
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.config.accessTokenSecret, { expiresIn: this.config.accessTokenTtl as jwt.SignOptions["expiresIn"] });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.config.accessTokenSecret) as unknown as AccessTokenPayload;
  }

  signRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.config.refreshTokenSecret, { expiresIn: this.config.refreshTokenTtl as jwt.SignOptions["expiresIn"] });
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.config.refreshTokenSecret) as unknown as RefreshTokenPayload;
  }

  signMfaToken(userId: string): string {
    return jwt.sign({ sub: userId }, this.config.mfaTokenSecret, { expiresIn: this.config.mfaTokenTtl as jwt.SignOptions["expiresIn"] });
  }

  verifyMfaToken(token: string): { sub: string } {
    return jwt.verify(token, this.config.mfaTokenSecret) as unknown as { sub: string };
  }

  signMfaEnrollmentToken(payload: MfaEnrollmentTokenPayload): string {
    return jwt.sign(payload, this.config.mfaEnrollmentTokenSecret, {
      expiresIn: this.config.mfaEnrollmentTokenTtl as jwt.SignOptions["expiresIn"],
    });
  }

  verifyMfaEnrollmentToken(token: string): MfaEnrollmentTokenPayload {
    return jwt.verify(token, this.config.mfaEnrollmentTokenSecret) as unknown as MfaEnrollmentTokenPayload;
  }
}
