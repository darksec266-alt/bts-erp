import type { EmployeeRepository, EmployeeRecord, CreateEmployeeInput, UpdateEmployeeInput, EmployeeListFilter } from "../application/employee-repository.port";

// Structural, not the generated PrismaClient — same reasoning as every
// other Prisma-touching class in this codebase.
export interface EmployeePrismaClient {
  employee: {
    create(args: { data: Record<string, unknown> }): Promise<EmployeeRow>;
    findUnique(args: { where: { id?: string; nidNumberHash?: string } }): Promise<EmployeeRow | null>;
    findFirst(args: { where: { user: { id: string } } }): Promise<EmployeeRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number }): Promise<EmployeeRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<EmployeeRow>;
  };
}

interface EmployeeRow {
  id: string;
  employeeCode: string;
  fullName: string;
  branchId: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: EmployeeRow): EmployeeRecord {
  // Deliberately does not project nidNumberEncrypted/nidNumberHash onto
  // EmployeeRecord at all — see employee-repository.port.ts's comment.
  const { id, employeeCode, fullName, branchId, departmentId, isActive, createdAt, updatedAt } = row;
  return { id, employeeCode, fullName, branchId, departmentId, isActive, createdAt, updatedAt };
}

export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: EmployeePrismaClient) {}

  async create(input: CreateEmployeeInput & { nidNumberEncrypted: string; nidNumberHash: string }): Promise<EmployeeRecord> {
    const { nidNumber: _plaintextNidNeverPersisted, ...rest } = input;
    const row = await this.prisma.employee.create({ data: rest });
    return toRecord(row);
  }

  async findById(id: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findByNidHash(hash: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findUnique({ where: { nidNumberHash: hash } });
    return row ? toRecord(row) : null;
  }

  async findByUserId(userId: string): Promise<EmployeeRecord | null> {
    const row = await this.prisma.employee.findFirst({ where: { user: { id: userId } } });
    return row ? toRecord(row) : null;
  }

  async list(filter: EmployeeListFilter, page: { skip: number; take: number }): Promise<{ items: EmployeeRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip: page.skip, take: page.take }),
      this.prisma.employee.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeRecord> {
    const row = await this.prisma.employee.update({ where: { id }, data: { ...input } });
    return toRecord(row);
  }
}
