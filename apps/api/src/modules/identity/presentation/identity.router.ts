import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { LoginUseCase, InvalidCredentialsError, AccountInactiveError } from "../application/login.use-case";
import { RefreshTokenUseCase, RefreshTokenInvalidError, LogoutUseCase } from "../application/refresh-and-logout.use-case";

// api-spec.md §11 — Identity & Authentication API. Controllers stay thin
// (prompt.md §136's Controller Rule): parse the request, call one use
// case, map its result/errors to the standard envelope. No business logic
// lives in this file.
export function createIdentityRouter(deps: {
  loginUseCase: LoginUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  logoutUseCase: LogoutUseCase;
}): Router {
  const router = Router();

  router.post("/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "email and password are required." });
      return;
    }
    try {
      const result = await deps.loginUseCase.execute(email, password);
      sendData(res, result);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        sendError(res, 401, { code: "AUTH_ERROR", message: err.message });
        return;
      }
      if (err instanceof AccountInactiveError) {
        sendError(res, 403, { code: "ACCOUNT_INACTIVE", message: err.message });
        return;
      }
      throw err; // falls through to app.ts's centralized error handler
    }
  });

  router.post("/auth/mfa/verify", async (req: Request, res: Response) => {
    const { mfaToken, code } = req.body ?? {};
    if (typeof mfaToken !== "string" || typeof code !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "mfaToken and code are required." });
      return;
    }
    try {
      const result = await deps.loginUseCase.verifyMfaAndIssueTokens(mfaToken, code);
      sendData(res, result);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        sendError(res, 401, { code: "AUTH_ERROR", message: "Invalid or expired MFA code." });
        return;
      }
      throw err;
    }
  });

  // First-time MFA setup — the account's /auth/login response was
  // MFA_ENROLLMENT_REQUIRED (mfaToken + otpAuthUrl for a QR code), and this
  // is where the user proves they actually captured the secret by
  // submitting one real code back before it's permanently persisted.
  router.post("/auth/mfa/enroll", async (req: Request, res: Response) => {
    const { mfaToken, code } = req.body ?? {};
    if (typeof mfaToken !== "string" || typeof code !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "mfaToken and code are required." });
      return;
    }
    try {
      const result = await deps.loginUseCase.enrollMfaAndIssueTokens(mfaToken, code);
      sendData(res, result);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        sendError(res, 401, { code: "AUTH_ERROR", message: "Invalid or expired enrollment code." });
        return;
      }
      throw err;
    }
  });

  router.post("/auth/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "refreshToken is required." });
      return;
    }
    try {
      const result = await deps.refreshTokenUseCase.execute(refreshToken);
      sendData(res, result);
    } catch (err) {
      if (err instanceof RefreshTokenInvalidError) {
        sendError(res, 401, { code: "AUTH_ERROR", message: "Refresh token is invalid, expired, or revoked." });
        return;
      }
      throw err;
    }
  });

  router.post("/auth/logout", async (req: Request, res: Response) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "refreshToken is required." });
      return;
    }
    // Logout is deliberately idempotent-tolerant: an already-invalid token
    // still returns 200 (nothing left to revoke) rather than a confusing
    // 401 on the one endpoint whose whole point is "end this session."
    try {
      await deps.logoutUseCase.execute(refreshToken);
    } catch {
      // swallow — see comment above
    }
    sendData(res, { loggedOut: true });
  });

  return router;
}
