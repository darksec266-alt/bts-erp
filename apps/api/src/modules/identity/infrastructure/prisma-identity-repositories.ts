import type { UserRepository, RefreshTokenRepository, UserRecord, RoleRecord, RefreshTokenRecord } from "../application/user-repository.port";

// Structural dependency on the generated Prisma client, same reasoning as
// packages/db/src/posting-stub.ts's JournalEntryPoster: `prisma generate`
// cannot run in this sandbox (network blocked to binaries.prisma.sh), so
// this is typed against the minimum shape actually used rather than the
// full generated PrismaClient. A real PrismaClient satisfies this
// structurally with zero changes once Phase 1's migration runs somewhere
// with network access.
export interface IdentityPrismaClient {
  user: {
    findUnique(args: {
      where: { email?: string; id?: string };
      include?: { role?: { include?: { permissions?: { include?: { permission?: boolean } } } } };
    }): Promise<{
      id: string;
      email: string;
      passwordHash: string;
      mfaSecret: string | null;
      roleId: string;
      branchId: string | null;
      isActive: boolean;
      role?: { id: string; name: string; permissions: { permission: { code: string } }[] };
    } | null>;
    update(args: { where: { id: string }; data: { mfaSecret?: string; isActive?: boolean } }): Promise<unknown>;
    create(args: {
      data: { email: string; passwordHash: string; roleId: string; branchId: string | null; employeeId: string };
    }): Promise<{ id: string; email: string; passwordHash: string; mfaSecret: string | null; roleId: string; branchId: string | null; isActive: boolean }>;
  };
  role: {
    findUnique(args: {
      where: { id: string };
      include: { permissions: { include: { permission: true } } };
    }): Promise<{ id: string; name: string; permissions: { permission: { code: string } }[] } | null>;
    findUnique(args: { where: { name: string } }): Promise<{ id: string; name: string; permissions: { permission: { code: string } }[] } | null>;
  };
  refreshToken: {
    create(args: { data: { userId: string; tokenFamily: string } }): Promise<{ id: string; userId: string; tokenFamily: string; revokedAt: Date | null }>;
    findUnique(args: { where: { tokenFamily: string } }): Promise<{ id: string; userId: string; tokenFamily: string; revokedAt: Date | null } | null>;
    update(args: { where: { tokenFamily: string }; data: { revokedAt: Date } }): Promise<unknown>;
  };
}
function toUserRecord(row: { id: string; email: string; passwordHash: string; mfaSecret: string | null; roleId: string; branchId: string | null; isActive: boolean }): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    roleId: row.roleId,
    branchId: row.branchId,
    isActive: row.isActive,
    mfaSecret: row.mfaSecret,
  };
}

function toRoleRecord(row: { id: string; name: string; permissions: { permission: { code: string } }[] }): RoleRecord {
  return { id: row.id, name: row.name, permissionCodes: row.permissions.map((p) => p.permission.code) };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: IdentityPrismaClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toUserRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUserRecord(row) : null;
  }

  async getRoleWithPermissions(roleId: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    return row ? toRoleRecord(row) : null;
  }

  async setMfaSecret(userId: string, secret: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
  }

  async create(input: { email: string; passwordHash: string; roleId: string; branchId: string | null; employeeId: string }): Promise<UserRecord> {
    const row = await this.prisma.user.create({ data: input });
    return toUserRecord(row);
  }

  async setActive(userId: string, isActive: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  async findRoleByName(name: string): Promise<RoleRecord | null> {
    const row = await this.prisma.role.findUnique({ where: { name } });
    return row ? toRoleRecord(row) : null;
  }
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: IdentityPrismaClient) {}

  async create(userId: string, tokenFamily: string): Promise<RefreshTokenRecord> {
    return this.prisma.refreshToken.create({ data: { userId, tokenFamily } });
  }

  async findByFamily(tokenFamily: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenFamily } });
  }

  async revoke(tokenFamily: string): Promise<void> {
    await this.prisma.refreshToken.update({ where: { tokenFamily }, data: { revokedAt: new Date() } });
  }
}
