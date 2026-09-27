import { generate, generateSecret, generateURI, verify } from "otplib";

// api-spec.md §5: TOTP-based second factor for Super Admin and
// Accounts/Finance. otplib v13's functional API is async (its default
// NobleCryptoPlugin/ScureBase32Plugin are async-first) — MfaService is
// async throughout to match, unlike v12's synchronous `authenticator`
// singleton this file originally targeted before the version was checked.
//
// Application-layer lockout (5 failed attempts against one mfaToken
// invalidates it, forcing a fresh login) is enforced by the
// LoginUseCase/VerifyMfaUseCase's caller tracking attempts against the
// mfaToken's subject — not this class's job, which is only "is this code
// correct for this secret, right now."
export interface MfaService {
  generateSecret(): string;
  verifyCode(secret: string, code: string): Promise<boolean>;
  generateOtpAuthUrl(secret: string, accountLabel: string): string;
}

export class TotpMfaService implements MfaService {
  generateSecret(): string {
    return generateSecret();
  }

  async verifyCode(secret: string, code: string): Promise<boolean> {
    const result = await verify({ secret, token: code });
    return result.valid;
  }

  generateOtpAuthUrl(secret: string, accountLabel: string): string {
    return generateURI({ issuer: "Brother's Technology System", label: accountLabel, secret });
  }
}

// Exported for tests only, so the test file doesn't need its own otplib
// import purely to generate a valid code to verify against.
export async function generateTotpCodeForTest(secret: string): Promise<string> {
  return generate({ secret });
}
