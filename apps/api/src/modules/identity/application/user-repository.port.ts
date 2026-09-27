// Structural, not tied to the generated Prisma client (same reasoning as
// packages/db/src/posting-stub.ts's JournalEntryPoster interface — prisma
// generate cannot run in this sandbox). A real PrismaClient-backed
// repository satisfies this without modification once Phase 1's migration
// actually runs somewhere with network access.

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  roleId: string;
  branchId: string | null;
  isActive: boolean;
  mfaSecret?: string | null;
}

export interface RoleRecord {
  id: string;
  name: string;
  permissionCodes: string[]; // pre-joined RolePermission -> Permission.code, not the raw join rows
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  getRoleWithPermissions(roleId: string): Promise<RoleRecord | null>;
  // First-time MFA enrollment persists the secret here — the only write
  // this whole module does to User outside of what Phase 2's yet-to-be-built
  // §58 (User & Employee management) will eventually own.
  setMfaSecret(userId: string, secret: string): Promise<void>;
  // api-spec.md §12: POST /employees/:id/provision-user, PATCH /users/:id/deactivate.
  create(input: { email: string; passwordHash: string; roleId: string; branchId: string | null; employeeId: string }): Promise<UserRecord>;
  setActive(userId: string, isActive: boolean): Promise<void>;
  findRoleByName(name: string): Promise<RoleRecord | null>;
}

// Refresh tokens are revocable (architecture.md §22) — this needs its own
// store, not just JWT verification, so /auth/logout can actually invalidate
// one without waiting for natural expiry. A dedicated table
// (`RefreshTokenRecord`, not yet in Phase 1's schema.prisma) is Phase 2's
// own addition, flagged here rather than silently assumed to already exist.
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenFamily: string;
  revokedAt: Date | null;
}

export interface RefreshTokenRepository {
  create(userId: string, tokenFamily: string): Promise<RefreshTokenRecord>;
  findByFamily(tokenFamily: string): Promise<RefreshTokenRecord | null>;
  revoke(tokenFamily: string): Promise<void>;
}
