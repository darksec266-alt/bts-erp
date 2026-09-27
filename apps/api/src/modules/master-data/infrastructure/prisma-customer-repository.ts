import type { CustomerRepository, CustomerRecord, CreateCustomerInput, UpdateCustomerInput, CustomerListFilter, CustomerAddressInput } from "../application/customer-repository.port";
import { EntityInUseError } from "../domain/simple-master-data.types";

export interface CustomerPrismaClient {
  customer: {
    create(args: { data: Record<string, unknown>; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow>;
    findUnique(args: { where: { id?: string; phone?: string }; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown>; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  customerAddress: {
    create(args: { data: { customerId: string; label: string; addressLine: string } }): Promise<unknown>;
  };
}

interface CustomerRow {
  id: string;
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  branch?: { id: string; code: string; name: string };
  isServiceOnly: boolean;
  isActive: boolean;
  addresses: { id: string; label: string; addressLine: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

function toRecord(row: CustomerRow): CustomerRecord {
  return row;
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: CustomerPrismaClient) {}

  async create(input: CreateCustomerInput): Promise<CustomerRecord> {
    const { addresses, ...rest } = input;
    const row = await this.prisma.customer.create({
      data: { ...rest, addresses: addresses ? { create: addresses } : undefined },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async findByPhone(phone: string): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({
      where: { phone },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: CustomerListFilter, page: { skip: number; take: number }): Promise<{ items: CustomerRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isServiceOnly !== undefined) where.isServiceOnly = filter.isServiceOnly;
    if (filter.search) {
      where.OR = [
        { displayName: { contains: filter.search, mode: "insensitive" } },
        { customerCode: { contains: filter.search, mode: "insensitive" } },
        { phone: { contains: filter.search } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerRecord> {
    const row = await this.prisma.customer.update({
      where: { id },
      data: { ...input },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return toRecord(row);
  }

  async addAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerRecord> {
    await this.prisma.customerAddress.create({ data: { customerId, ...input } });
    const updated = await this.prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: true } });
    return toRecord(updated!); // existence already checked by AddCustomerAddressUseCase before this repository method is ever called
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new EntityInUseError("customer");
      }
      throw err;
    }
  }
}
