import type { SubCategoryRepository } from "../application/sub-category-repository.port";
import type {
  SubCategoryRecord,
  CreateSubCategoryInput,
  UpdateSubCategoryInput,
  SubCategoryListFilter,
} from "../domain/sub-category.types";
import { SubCategoryInUseError } from "../domain/sub-category.types";

export interface SubCategoryPrismaClient {
  subCategory: {
    create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<SubCategoryRow>;
    findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<SubCategoryRow | null>;
    findMany(args: { where: Record<string, unknown>; skip?: number; take?: number; include?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<SubCategoryRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<SubCategoryRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
}

interface SubCategoryRow {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  category?: { id: string; name: string } | null;
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

function toRecord(row: SubCategoryRow): SubCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    isActive: row.isActive,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaSubCategoryRepository implements SubCategoryRepository {
  constructor(private readonly prisma: SubCategoryPrismaClient) {}

  async create(input: CreateSubCategoryInput): Promise<SubCategoryRecord> {
    const row = await this.prisma.subCategory.create({
      data: {
        name: input.name,
        categoryId: input.categoryId,
        isActive: true,
      },
      include: { category: true },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<SubCategoryRecord | null> {
    const row = await this.prisma.subCategory.findUnique({
      where: { id },
      include: { category: true },
    });
    return row ? toRecord(row) : null;
  }

  async findByNameAndCategory(categoryId: string, name: string): Promise<SubCategoryRecord | null> {
    const row = await this.prisma.subCategory.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name,
        },
      },
      include: { category: true },
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: SubCategoryListFilter, page: { skip: number; take: number }): Promise<{ items: SubCategoryRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.search) {
      where.name = { contains: filter.search, mode: "insensitive" };
    }

    const [rows, total] = await Promise.all([
      this.prisma.subCategory.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: { category: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.subCategory.count({ where }),
    ]);

    return { items: rows.map(toRecord), total };
  }

  async update(id: string, input: UpdateSubCategoryInput): Promise<SubCategoryRecord> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const row = await this.prisma.subCategory.update({
      where: { id },
      data,
      include: { category: true },
    });
    return toRecord(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.subCategory.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new SubCategoryInUseError();
      }
      throw err;
    }
  }
}
