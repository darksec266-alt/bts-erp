import type { Request, Response, NextFunction } from "express";
import type { TokenService } from "../../modules/identity/application/token-service.port";
import type { AccessTokenPayload } from "../../modules/identity/domain/auth-types";
import { sendError } from "../http";

// architecture.md §22 / api-spec.md §8: 401 for missing/expired/invalid
// token. Augments Express's Request type so every downstream handler gets
// a typed req.user instead of an `any` cast at every call site.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function createAuthenticateMiddleware(tokenService: TokenService) {
  return function authenticate(req: Request, res: Response, next: NextFunction): void {
    const header = req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      sendError(res, 401, { code: "AUTH_ERROR", message: "Missing or malformed Authorization header." });
      return;
    }
    const token = header.slice("Bearer ".length);
    try {
      req.user = tokenService.verifyAccessToken(token);
      next();
    } catch {
      sendError(res, 401, { code: "AUTH_ERROR", message: "Invalid or expired access token." });
    }
  };
}
