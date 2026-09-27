import type { EmployeeRepository, EmployeeRecord, CreateEmployeeInput, UpdateEmployeeInput, EmployeeListFilter } from "./employee-repository.port";
import { encryptPII, hashForLookup } from "../../../shared/crypto/pii-encryption";
import type { AuditLogWriter } from "../../../shared/audit/audit-log.port";

export class DuplicateNidError extends Error {
  constructor() {
    super("An employee with this NID number already exists.");
    this.name = "DuplicateNidError";
  }
}

export class EmployeeNotFoundError extends Error {
  constructor() {
    super("Employee not found.");
    this.name = "EmployeeNotFoundError";
  }
}

// prd.md §8.9 / api-spec.md §12: POST /employees. Encryption happens here,
// at the Application layer boundary — the Infrastructure-layer repository
// never sees a plaintext NID, only the two derived values it needs to
// store (schema.prisma's `nidNumberEncrypted`/`nidNumberHash` split,
// this session's own fix — see that model's comment).
export class CreateEmployeeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    const nidNumberHash = hashForLookup(input.nidNumber);
    const existing = await this.employees.findByNidHash(nidNumberHash);
    if (existing) {
      throw new DuplicateNidError();
    }

    const nidNumberEncrypted = encryptPII(input.nidNumber);
    return this.employees.create({ ...input, nidNumberEncrypted, nidNumberHash });
  }
}

export class GetEmployeeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(id: string): Promise<EmployeeRecord> {
    const employee = await this.employees.findById(id);
    if (!employee) throw new EmployeeNotFoundError();
    return employee;
  }
}

export class GetMyEmployeeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  // api-spec.md §12: GET /employees/me — "used by every role's profile
  // screen," so a user with no linked Employee record (e.g. a
  // portal-only Customer/Vendor account) getting null back is an expected,
  // non-error outcome here, not EmployeeNotFoundError.
  async execute(userId: string): Promise<EmployeeRecord | null> {
    return this.employees.findByUserId(userId);
  }
}

export class ListEmployeesUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(filter: EmployeeListFilter, page: { skip: number; take: number }) {
    return this.employees.list(filter, page);
  }
}

// api-spec.md §12's own note: "PATCH after the record leaves draft goes
// through the Edit Request flow (§18), not a direct write (prd.md §8.25)."
// Phase 9 (Approval & Governance / Edit-Delete Governance) does not exist
// yet in this codebase, so there is no Edit Request flow to route
// through — this use case writes directly for now. Flagged here, not
// silently done "the easy way": once Phase 9 exists, an update to a
// non-draft Employee record must create a RECORD_EDIT_REQUEST
// (`ApprovalRequest`, schema.prisma) instead of calling
// `employees.update()` itself.
export class UpdateEmployeeUseCase {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly auditLog: AuditLogWriter
  ) {}

  async execute(id: string, input: UpdateEmployeeInput, actorId: string): Promise<EmployeeRecord> {
    const before = await this.employees.findById(id);
    if (!before) throw new EmployeeNotFoundError();

    const after = await this.employees.update(id, input);

    await this.auditLog.write({
      entityType: "Employee",
      entityId: id,
      action: "UPDATE",
      actorId,
      beforeJson: before,
      afterJson: after,
    });

    return after;
  }
}
