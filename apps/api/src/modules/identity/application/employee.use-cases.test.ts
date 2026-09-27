import {
  CreateEmployeeUseCase,
  DuplicateNidError,
  GetEmployeeUseCase,
  EmployeeNotFoundError,
  GetMyEmployeeUseCase,
  ListEmployeesUseCase,
  UpdateEmployeeUseCase,
} from "./employee.use-cases";
import type { EmployeeRepository, EmployeeRecord } from "./employee-repository.port";
import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";

process.env.PII_ENCRYPTION_KEY = "0".repeat(64);

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

function makeRepo(overrides: Partial<jest.Mocked<EmployeeRepository>> = {}): jest.Mocked<EmployeeRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleEmployee),
    findById: jest.fn().mockResolvedValue(sampleEmployee),
    findByNidHash: jest.fn().mockResolvedValue(null),
    findByUserId: jest.fn().mockResolvedValue(sampleEmployee),
    list: jest.fn().mockResolvedValue({ items: [sampleEmployee], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sampleEmployee, fullName: "Updated Name" }),
    ...overrides,
  };
}

function makeAuditLog(): jest.Mocked<AuditLogWriter> {
  return { write: jest.fn().mockResolvedValue(undefined) };
}

describe("CreateEmployeeUseCase", () => {
  it("creates an employee, encrypting the NID before it reaches the repository", async () => {
    const repo = makeRepo();
    const useCase = new CreateEmployeeUseCase(repo);

    await useCase.execute({ employeeCode: "BTS-0001", fullName: "Rahim Uddin", nidNumber: "1234567890123", branchId: "branch_1" });

    expect(repo.create).toHaveBeenCalledTimes(1);
    const callArg = repo.create.mock.calls[0]![0];
    expect(callArg.nidNumberEncrypted).not.toContain("1234567890123"); // never plaintext
    expect(callArg.nidNumberHash).toBeDefined();
    expect(callArg.nidNumber).toBe("1234567890123"); // still passed through for whatever else CreateEmployeeInput carries
  });

  it("rejects a duplicate NID before ever calling create", async () => {
    const repo = makeRepo({ findByNidHash: jest.fn().mockResolvedValue(sampleEmployee) });
    const useCase = new CreateEmployeeUseCase(repo);

    await expect(
      useCase.execute({ employeeCode: "BTS-0002", fullName: "Karim", nidNumber: "1234567890123", branchId: "branch_1" })
    ).rejects.toThrow(DuplicateNidError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("GetEmployeeUseCase", () => {
  it("returns the employee when found", async () => {
    const repo = makeRepo();
    const result = await new GetEmployeeUseCase(repo).execute("emp_1");
    expect(result).toEqual(sampleEmployee);
  });

  it("throws EmployeeNotFoundError when not found", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetEmployeeUseCase(repo).execute("missing")).rejects.toThrow(EmployeeNotFoundError);
  });
});

describe("GetMyEmployeeUseCase", () => {
  it("returns null (not an error) for a user with no linked Employee record", async () => {
    const repo = makeRepo({ findByUserId: jest.fn().mockResolvedValue(null) });
    const result = await new GetMyEmployeeUseCase(repo).execute("user_without_employee");
    expect(result).toBeNull();
  });
});

describe("ListEmployeesUseCase", () => {
  it("passes the filter and pagination through to the repository", async () => {
    const repo = makeRepo();
    await new ListEmployeesUseCase(repo).execute({ branchId: "branch_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ branchId: "branch_1" }, { skip: 0, take: 20 });
  });
});

describe("UpdateEmployeeUseCase", () => {
  it("updates and writes an AuditLog entry with before/after state", async () => {
    const repo = makeRepo();
    const auditLog = makeAuditLog();
    const useCase = new UpdateEmployeeUseCase(repo, auditLog);

    const result = await useCase.execute("emp_1", { fullName: "Updated Name" }, "actor_user_1");

    expect(result.fullName).toBe("Updated Name");
    expect(auditLog.write).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "Employee", entityId: "emp_1", action: "UPDATE", actorId: "actor_user_1" })
    );
  });

  it("throws EmployeeNotFoundError and never writes an audit entry for a missing employee", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const auditLog = makeAuditLog();
    const useCase = new UpdateEmployeeUseCase(repo, auditLog);

    await expect(useCase.execute("missing", { fullName: "X" }, "actor_1")).rejects.toThrow(EmployeeNotFoundError);
    expect(auditLog.write).not.toHaveBeenCalled();
  });
});
