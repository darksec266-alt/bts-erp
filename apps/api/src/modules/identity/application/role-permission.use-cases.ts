import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";

// api-spec.md §11 — Role/Permission administration (distinct from the
// RoleRecord/getRoleWithPermissions already in user-repository.port.ts,
// which exists only to build an access token at login; this is the
// management surface an admin screen calls).
export interface RoleSummary {
  id: string;
  name: string;
}

export interface RolePermissionRepository {
  listRoles(): Promise<RoleSummary[]>;
  listPermissionCodes(roleId: string): Promise<string[]>;
  listAllPermissionCodes(): Promise<string[]>; // GET /permissions — the full catalog
  setPermissionCodes(roleId: string, codes: string[]): Promise<void>; // PATCH /roles/:id/permissions — replaces the whole bundle, not an add/remove diff (simpler, and matches how the seed script itself treats a role's bundle)
}

export class RoleNotFoundForPermissionsError extends Error {
  constructor() {
    super("Role not found.");
    this.name = "RoleNotFoundForPermissionsError";
  }
}

export class UnknownPermissionCodeError extends Error {
  constructor(codes: string[]) {
    super(`Unknown permission code(s): ${codes.join(", ")}`);
    this.name = "UnknownPermissionCodeError";
  }
}

export class ListRolesUseCase {
  constructor(private readonly roles: RolePermissionRepository) {}
  async execute(): Promise<RoleSummary[]> {
    return this.roles.listRoles();
  }
}

export class GetRolePermissionsUseCase {
  constructor(private readonly roles: RolePermissionRepository) {}
  async execute(roleId: string): Promise<string[]> {
    return this.roles.listPermissionCodes(roleId);
  }
}

export class ListPermissionsUseCase {
  constructor(private readonly roles: RolePermissionRepository) {}
  async execute(): Promise<string[]> {
    return this.roles.listAllPermissionCodes();
  }
}

// api-spec.md §11: "writes an AuditLog row tagged `security` — a
// permission change is exactly the class of event that scope was added to
// cover." Every code in the new bundle is checked against the real
// catalog first — a typo'd permission code silently granted (or, worse,
// silently revoking every OTHER permission because the typo made the
// whole bundle look unrecognized) is exactly the class of bug this check
// exists to catch before it reaches the database.
export class UpdateRolePermissionsUseCase {
  constructor(
    private readonly roles: RolePermissionRepository,
    private readonly auditLog: AuditLogWriter
  ) {}

  async execute(roleId: string, newCodes: string[], actorId: string): Promise<void> {
    const before = await this.roles.listPermissionCodes(roleId);
    // listPermissionCodes returning [] for both "role has zero
    // permissions" and "role doesn't exist" are indistinguishable through
    // this port alone — listRoles() is the authoritative existence check.
    const allRoles = await this.roles.listRoles();
    if (!allRoles.some((r) => r.id === roleId)) {
      throw new RoleNotFoundForPermissionsError();
    }

    const catalog = new Set(await this.roles.listAllPermissionCodes());
    const unknown = newCodes.filter((code) => code !== "*" && !catalog.has(code));
    if (unknown.length > 0) {
      throw new UnknownPermissionCodeError(unknown);
    }

    await this.roles.setPermissionCodes(roleId, newCodes);

    await this.auditLog.write({
      entityType: "Role",
      entityId: roleId,
      action: "PERMISSIONS_CHANGED",
      actorId,
      beforeJson: { permissionCodes: before },
      afterJson: { permissionCodes: newCodes },
    });
  }
}
