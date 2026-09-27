import { randomBytes } from "node:crypto";
import type { UserRepository } from "./user-repository.port";
import type { EmployeeRepository } from "./employee-repository.port";
import type { PasswordHasher } from "./password-hasher.port";
import type { CredentialNotifier } from "./credential-notifier.port";
import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";
import { EmployeeNotFoundError } from "./employee.use-cases";

export class RoleNotFoundError extends Error {
  constructor(roleName: string) {
    super(`Role "${roleName}" does not exist — check admin-permission-migration-matrix.md's seed data ran.`);
    this.name = "RoleNotFoundError";
  }
}

export class UserAlreadyProvisionedError extends Error {
  constructor() {
    super("This employee already has a linked user account.");
    this.name = "UserAlreadyProvisionedError";
  }
}

// prd.md §9's Missing Flow Analysis / api-spec.md §12: "the explicit fix
// for the previously-missing HR→IT handoff flow" — an Employee record on
// its own has no login; this is what turns one into an actual account.
export class ProvisionUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly employees: EmployeeRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly credentialNotifier: CredentialNotifier,
    private readonly auditLog: AuditLogWriter
  ) {}

  async execute(employeeId: string, email: string, roleName: string, actorId: string): Promise<{ userId: string }> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) throw new EmployeeNotFoundError();

    const alreadyLinked = await this.users.findByEmail(email);
    if (alreadyLinked) {
      throw new UserAlreadyProvisionedError();
    }

    const role = await this.users.findRoleByName(roleName);
    if (!role) throw new RoleNotFoundError(roleName);

    const temporaryPassword = randomBytes(9).toString("base64url"); // 12 chars, URL-safe — good enough to type/paste once
    const passwordHash = await this.passwordHasher.hash(temporaryPassword);

    const user = await this.users.create({
      email,
      passwordHash,
      roleId: role.id,
      branchId: employee.branchId,
      employeeId,
    });

    await this.credentialNotifier.sendFirstLoginCredential(email, temporaryPassword);

    await this.auditLog.write({
      entityType: "User",
      entityId: user.id,
      action: "PROVISIONED",
      actorId,
      afterJson: { email, roleId: role.id, employeeId },
    });

    return { userId: user.id };
  }
}

// api-spec.md §12: "soft-deletes the login without touching the Employee
// record" — deliberately narrow: this never touches Employee.isActive,
// only User.isActive, since someone can lose system access (resigned,
// suspended) while HR still needs the Employee record intact for
// historical payroll/attendance.
export class DeactivateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly auditLog: AuditLogWriter
  ) {}

  async execute(userId: string, actorId: string): Promise<void> {
    await this.users.setActive(userId, false);
    await this.auditLog.write({
      entityType: "User",
      entityId: userId,
      action: "DEACTIVATED",
      actorId,
    });
  }
}
