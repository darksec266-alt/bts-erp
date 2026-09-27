import type { Request, Response, NextFunction } from "express";
import { hasAnyPermission } from "../../modules/identity/domain/auth-types";
import { sendError } from "../http";

// api-spec.md §6: "a role is a named bundle of permission codes... a route
// guard actually checks [the code], never role === 'ADMIN' directly." This
// is that guard — every protected route calls requirePermission(...) with
// the permission code(s) it needs, never a role-name check. Narrowing what
// Admin (or any role) can do later is purely a RolePermission seed-data
// change; this middleware never needs to change.
export function requirePermission(...anyOf: string[]) {
  return function permissionGuard(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      // authenticate() must run before this in the middleware chain — a
      // missing req.user here is a wiring bug, not a real 401 case, but
      // fail the same way rather than throw, since the caller genuinely
      // is unauthenticated from the response's point of view either way.
      sendError(res, 401, { code: "AUTH_ERROR", message: "Missing or malformed Authorization header." });
      return;
    }

    if (isSuperAdminUser(req.user) || hasAnyPermission(req.user.permissions, anyOf)) {
      next();
      return;
    }

    sendError(res, 403, {
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  };
}

export function isSuperAdminUser(
  user?: { isSuperAdmin?: boolean; roleName?: string; role?: string; permissions?: string[] } | null
): boolean {
  if (!user) return false;
  return Boolean(
    user.isSuperAdmin === true ||
    user.roleName === "SUPER_ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    (Array.isArray(user.permissions) && (user.permissions.includes("*") || user.permissions.includes("all")))
  );
}
