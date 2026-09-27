import { ProvisionUserUseCase, DeactivateUserUseCase, RoleNotFoundError, UserAlreadyProvisionedError } from "./provision-and-deactivate-user.use-case";
import { EmployeeNotFoundError } from "./employee.use-cases";
import type { UserRepository, UserRecord, RoleRecord } from "./user-repository.port";
import type { EmployeeRepository, EmployeeRecord } from "./employee-repository.port";
import type { PasswordHasher } from "./password-hasher.port";
import type { CredentialNotifier } from "./credential-notifier.port";
import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";

const sampleEmployee: EmployeeRecord = {
  id: "emp_1",
  employeeCode: "BTS-0001",
  fullName: "Rahim Uddin",
  branchId: "branch_1",
  departmentId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleRole: RoleRecord = { id: "role_sales", name: "SALES_EXECUTIVE", permissionCodes: ["sales.manage"] };
const createdUser: UserRecord = { id: "user_new", email: "rahim@bts.example", passwordHash: "h", roleId: "role_sales", branchId: "branch_1", isActive: true };

function makeUsers(overrides: Partial<jest.Mocked<UserRepository>> = {}): jest.Mocked<UserRepository> {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    getRoleWithPermissions: jest.fn(),
    setMfaSecret: jest.fn(),
    create: jest.fn().mockResolvedValue(createdUser),
    setActive: jest.fn().mockResolvedValue(undefined),
    findRoleByName: jest.fn().mockResolvedValue(sampleRole),
    ...overrides,
  };
}

function makeEmployees(overrides: Partial<jest.Mocked<EmployeeRepository>> = {}): jest.Mocked<EmployeeRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(sampleEmployee),
    findByNidHash: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    ...overrides,
  };
}

function makeHasher(): jest.Mocked<PasswordHasher> {
  return { hash: jest.fn().mockResolvedValue("hashed-temp-password"), compare: jest.fn() };
}

function makeNotifier(): jest.Mocked<CredentialNotifier> {
  return { sendFirstLoginCredential: jest.fn().mockResolvedValue(undefined) };
}

function makeAuditLog(): jest.Mocked<AuditLogWriter> {
  return { write: jest.fn().mockResolvedValue(undefined) };
}

describe("ProvisionUserUseCase", () => {
  it("creates a user linked to the employee and sends a first-login credential", async () => {
    const users = makeUsers();
    const employees = makeEmployees();
    const hasher = makeHasher();
    const notifier = makeNotifier();
    const auditLog = makeAuditLog();
    const useCase = new ProvisionUserUseCase(users, employees, hasher, notifier, auditLog);

    const result = await useCase.execute("emp_1", "rahim@bts.example", "SALES_EXECUTIVE", "actor_1");

    expect(result.userId).toBe("user_new");
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "rahim@bts.example", roleId: "role_sales", branchId: "branch_1", employeeId: "emp_1" })
    );
    expect(notifier.sendFirstLoginCredential).toHaveBeenCalledWith("rahim@bts.example", expect.any(String));
    expect(auditLog.write).toHaveBeenCalledWith(expect.objectContaining({ entityType: "User", action: "PROVISIONED", actorId: "actor_1" }));
  });

  it("throws EmployeeNotFoundError for a non-existent employee", async () => {
    const employees = makeEmployees({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new ProvisionUserUseCase(makeUsers(), employees, makeHasher(), makeNotifier(), makeAuditLog());

    await expect(useCase.execute("missing", "x@bts.example", "SALES_EXECUTIVE", "actor_1")).rejects.toThrow(EmployeeNotFoundError);
  });

  it("throws UserAlreadyProvisionedError if the email is already in use", async () => {
    const users = makeUsers({ findByEmail: jest.fn().mockResolvedValue(createdUser) });
    const useCase = new ProvisionUserUseCase(users, makeEmployees(), makeHasher(), makeNotifier(), makeAuditLog());

    await expect(useCase.execute("emp_1", "rahim@bts.example", "SALES_EXECUTIVE", "actor_1")).rejects.toThrow(UserAlreadyProvisionedError);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("throws RoleNotFoundError for an unseeded role name", async () => {
    const users = makeUsers({ findRoleByName: jest.fn().mockResolvedValue(null) });
    const useCase = new ProvisionUserUseCase(users, makeEmployees(), makeHasher(), makeNotifier(), makeAuditLog());

    await expect(useCase.execute("emp_1", "x@bts.example", "NOT_A_REAL_ROLE", "actor_1")).rejects.toThrow(RoleNotFoundError);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("never sends a real plaintext-visible credential path other than the notifier — hashes before storing", async () => {
    const users = makeUsers();
    const hasher = makeHasher();
    await new ProvisionUserUseCase(users, makeEmployees(), hasher, makeNotifier(), makeAuditLog()).execute(
      "emp_1", "rahim@bts.example", "SALES_EXECUTIVE", "actor_1"
    );
    expect(hasher.hash).toHaveBeenCalledTimes(1);
    const storedHash = users.create.mock.calls[0]![0].passwordHash;
    expect(storedHash).toBe("hashed-temp-password"); // never the raw generated password
  });
});

describe("DeactivateUserUseCase", () => {
  it("deactivates the user and writes a security-relevant audit entry", async () => {
    const users = makeUsers();
    const auditLog = makeAuditLog();
    const useCase = new DeactivateUserUseCase(users, auditLog);

    await useCase.execute("user_1", "actor_1");

    expect(users.setActive).toHaveBeenCalledWith("user_1", false);
    expect(auditLog.write).toHaveBeenCalledWith(expect.objectContaining({ entityType: "User", entityId: "user_1", action: "DEACTIVATED", actorId: "actor_1" }));
  });
});
