import type { RolePermissionRepository, RoleSummary } from "../application/role-permission.use-cases";

export interface RolePermissionPrismaClient {
  role: {
    findMany(): Promise<{ id: string; name: string }[]>;
    findUnique(args: {
      where: { id: string };
      include: { permissions: { include: { permission: true } } };
    }): Promise<{ id: string; name: string; permissions: { permission: { code: string } }[] } | null>;
  };
  permission: {
    findMany(): Promise<{ id: string; code: string }[]>;
  };
  $transaction<T>(fn: (tx: RolePermissionPrismaClient) => Promise<T>): Promise<T>;
  rolePermission: {
    deleteMany(args: { where: { roleId: string } }): Promise<unknown>;
    createMany(args: { data: { roleId: string; permissionId: string }[] }): Promise<unknown>;
  };
}

export class PrismaRolePermissionRepository implements RolePermissionRepository {
  constructor(private readonly prisma: RolePermissionPrismaClient) {}

  async listRoles(): Promise<RoleSummary[]> {
    return this.prisma.role.findMany();
  }

  async listPermissionCodes(roleId: string): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    return role ? role.permissions.map((p) => p.permission.code) : [];
  }

  async listAllPermissionCodes(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany();
    return permissions.map((p) => p.code);
  }

  async setPermissionCodes(roleId: string, codes: string[]): Promise<void> {
    // Replace-the-whole-bundle (role-permission.use-cases.ts's own
    // comment on why): delete every existing RolePermission row for this
    // role, then recreate from the new list, inside one transaction so a
    // failure partway through never leaves the role with a half-updated,
    // partially-empty bundle.
    await this.prisma.$transaction(async (tx) => {
      const allPermissions = await tx.permission.findMany();
      const codeToId = new Map(allPermissions.map((p) => [p.code, p.id]));

      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: codes.map((code) => ({ roleId, permissionId: codeToId.get(code)! })),
      });
    });
  }
}
