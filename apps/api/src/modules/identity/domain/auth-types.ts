// Domain layer (prompt.md §130) — plain types and pure logic, no framework
// or Prisma imports. This is what "Identity & Authentication" (§57) means
// at the type level; the actual User/Role/Permission tables are Phase 1's
// schema.prisma, already built.

export interface AccessTokenPayload {
  sub: string; // User.id
  roleId: string;
  roleName: string;
  branchId: string | null; // null only for a role with company-wide scope (Super Admin, default Admin)
  isSuperAdmin: boolean; // denormalized onto the token so RLS session vars (Phase 1's 001_rls_policies.sql) can be set from the token alone, without a role-table lookup on every request
  permissions: string[]; // dot-namespaced codes, e.g. "sales.quotation.create" — api-spec.md §6
}

export interface RefreshTokenPayload {
  sub: string; // User.id
  tokenFamily: string; // rotation family id — reused across every refresh in one login session, changed only on a fresh /auth/login (architecture.md §22's "rotated, revocable")
}

// Issued instead of a plain MFA token when an MFA-required user (Super
// Admin / Accounts-Finance) has no `mfaSecret` enrolled yet — carries the
// freshly-generated, not-yet-persisted secret so enrollment can stay
// stateless (no server-side "pending enrollment" row needed): the secret
// only becomes permanent once /auth/mfa/enroll verifies a real code
// against it. Short TTL (same as a normal MFA token) limits the exposure
// window of carrying a secret inside a signed token.
export interface MfaEnrollmentTokenPayload {
  sub: string; // User.id
  pendingSecret: string;
}

// prd.md §10.5 / api-spec.md §5 — MFA is mandatory for exactly these two
// roles, no others, at this time. A named constant, not a magic string
// check scattered across the codebase.
export const MFA_REQUIRED_ROLES = new Set(["SUPER_ADMIN", "ACCOUNTS_FINANCE"]);

export function roleRequiresMfa(roleName: string): boolean {
  return MFA_REQUIRED_ROLES.has(roleName);
}

// api-spec.md §6: "a role is a named bundle of permission codes... a route
// guard actually checks [the code], never role === 'ADMIN' directly."
// Super Admin's company-wide reach (prd.md §6.1) is expressed as the
// wildcard permission "*" in its seed data, checked once here — not as a
// role-name bypass duplicated at every call site (the middleware and any
// future direct caller both go through this same function).
export function hasPermission(tokenPermissions: string[], required: string): boolean {
  return tokenPermissions.includes("*") || tokenPermissions.includes(required);
}

export function hasAnyPermission(tokenPermissions: string[], required: string[]): boolean {
  if (tokenPermissions.includes("*")) return true;
  return required.some((code) => hasPermission(tokenPermissions, code));
}
