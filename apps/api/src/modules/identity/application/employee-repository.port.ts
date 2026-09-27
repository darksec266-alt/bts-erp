// prd.md §8.9 / api-spec.md §12. `EmployeeRecord` deliberately never
// carries the NID in any form (encrypted or hashed) — a record returned to
// any caller (even Super Admin) should never let the raw NID round-trip
// back out through a JSON API response; decryption (if ever needed for a
// specific, audited reason) is not something this CRUD surface does.
export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  fullName: string;
  branchId: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeInput {
  employeeCode: string;
  fullName: string;
  nidNumber: string; // plaintext in, never plaintext out — encrypted by the use case before this port ever sees it as ciphertext
  branchId: string;
  departmentId?: string;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  departmentId?: string | null;
}

export interface EmployeeListFilter {
  branchId?: string;
  departmentId?: string;
  isActive?: boolean;
}

export interface EmployeeRepository {
  create(input: CreateEmployeeInput & { nidNumberEncrypted: string; nidNumberHash: string }): Promise<EmployeeRecord>;
  findById(id: string): Promise<EmployeeRecord | null>;
  findByNidHash(hash: string): Promise<EmployeeRecord | null>;
  findByUserId(userId: string): Promise<EmployeeRecord | null>; // backs GET /employees/me
  list(filter: EmployeeListFilter, page: { skip: number; take: number }): Promise<{ items: EmployeeRecord[]; total: number }>;
  update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord>;
}
