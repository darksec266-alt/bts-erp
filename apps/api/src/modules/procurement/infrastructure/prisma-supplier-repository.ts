import type { SupplierRepository, SupplierRecord, CreateSupplierInput, UpdateSupplierInput, SupplierListFilter, SupplierContactInput } from "../application/supplier-repository.port";
import { EntityInUseError } from "../../master-data/domain/simple-master-data.types";

export interface SupplierPrismaClient {
  supplier: {
    create(args: { data: Record<string, unknown>; include: { contacts: true } }): Promise<SupplierRow>;
    findUnique(args: { where: { id?: string; supplierCode?: string }; include: { contacts: true } }): Promise<SupplierRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: { contacts: true } }): Promise<SupplierRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown>; include: { contacts: true } }): Promise<SupplierRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  supplierContact: {
    create(args: { data: { supplierId: string; name: string; phone: string; isPrimary?: boolean } }): Promise<unknown>;
  };
}

interface SupplierRow {
  id: string;
  supplierCode: string;
  companyName: string;
  isActive: boolean;
  contacts: { id: string; name: string; phone: string; isPrimary: boolean }[];
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: SupplierPrismaClient) {}

  async create(input: CreateSupplierInput): Promise<SupplierRecord> {
    const { contacts, ...rest } = input;
    return this.prisma.supplier.create({ data: { ...rest, contacts: contacts ? { create: contacts } : undefined }, include: { contacts: true } });
  }

  async findById(id: string): Promise<SupplierRecord | null> {
    return this.prisma.supplier.findUnique({ where: { id }, include: { contacts: true } });
  }

  async findByCode(code: string): Promise<SupplierRecord | null> {
    return this.prisma.supplier.findUnique({ where: { supplierCode: code }, include: { contacts: true } });
  }

  async list(filter: SupplierListFilter, page: { skip: number; take: number }): Promise<{ items: SupplierRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.search) {
      where.OR = [
        { supplierCode: { contains: filter.search, mode: "insensitive" } },
        { companyName: { contains: filter.search, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip: page.skip, take: page.take, include: { contacts: true } }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, input: UpdateSupplierInput): Promise<SupplierRecord> {
    return this.prisma.supplier.update({ where: { id }, data: { ...input }, include: { contacts: true } });
  }

  async addContact(supplierId: string, input: SupplierContactInput): Promise<SupplierRecord> {
    await this.prisma.supplierContact.create({ data: { supplierId, ...input } });
    const updated = await this.prisma.supplier.findUnique({ where: { id: supplierId }, include: { contacts: true } });
    return updated!; // existence already checked by AddSupplierContactUseCase
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.supplier.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new EntityInUseError("supplier");
      throw err;
    }
  }
}
