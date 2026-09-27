import type { ProductRepository, ProductRecord, CreateProductInput, UpdateProductInput, ProductListFilter } from "../application/product-repository.port";
import { EntityInUseError } from "../domain/simple-master-data.types";

export interface ProductPrismaClient {
  product: {
    create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<ProductRow>;
    findUnique(args: { where: { id?: string; sku?: string }; include?: Record<string, unknown> }): Promise<ProductRow | null>;
    findMany(args: { where: Record<string, unknown>; skip?: number; take?: number; include?: Record<string, unknown>; orderBy?: Record<string, unknown> }): Promise<ProductRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<ProductRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED" | string;
  modelNumber?: string | null;
  barcode?: string | null;
  categoryId: string | null;
  subCategoryId?: string | null;
  brandId: string | null;
  unitId: string | null;
  costPrice: { toString(): string }; // Prisma.Decimal — structurally, just "has toString()"
  sellingPrice: { toString(): string };
  isServiceItem: boolean;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  unit?: { id: string; code: string; name: string } | null;
  stockLedgers?: {
    warehouseId: string;
    quantityOnHand: { toString(): string } | number;
    warehouse: { id: string; code: string; name: string };
  }[];
}

const PRODUCT_INCLUDES = {
  category: true,
  subCategory: true,
  brand: true,
  unit: true,
  stockLedgers: {
    include: {
      warehouse: true,
    },
  },
};

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

function toRecord(row: ProductRow): ProductRecord {
  const { id, sku, name, trackingType, modelNumber, barcode, categoryId, subCategoryId, brandId, unitId, isServiceItem, isActive, category, subCategory, brand, unit } = row;
  const stockList = (row.stockLedgers || []).map((sl) => ({
    warehouseId: sl.warehouseId,
    warehouseName: sl.warehouse.name,
    warehouseCode: sl.warehouse.code,
    quantityOnHand: Number(sl.quantityOnHand) || 0,
  }));
  const totalStock = stockList.reduce((sum, sl) => sum + sl.quantityOnHand, 0);

  return {
    id,
    sku,
    name,
    trackingType: (trackingType as "SERIALIZED" | "NON_SERIALIZED") || "NON_SERIALIZED",
    modelNumber: modelNumber ?? null,
    barcode: barcode ?? null,
    categoryId,
    subCategoryId: subCategoryId ?? null,
    brandId,
    unitId,
    isServiceItem,
    isActive,
    costPrice: row.costPrice.toString(),
    sellingPrice: row.sellingPrice.toString(),
    category: category ? { id: category.id, name: category.name } : null,
    subCategory: subCategory ? { id: subCategory.id, name: subCategory.name } : null,
    brand: brand ? { id: brand.id, name: brand.name } : null,
    unit: unit ? { id: unit.id, code: unit.code, name: unit.name } : null,
    totalStock,
    stockLedgers: stockList,
  };
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: ProductPrismaClient) {}

  async create(input: CreateProductInput): Promise<ProductRecord> {
    const row = await this.prisma.product.create({
      data: { ...input },
      include: PRODUCT_INCLUDES,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDES,
    });
    return row ? toRecord(row) : null;
  }

  async findBySku(sku: string): Promise<ProductRecord | null> {
    const row = await this.prisma.product.findUnique({
      where: { sku },
      include: PRODUCT_INCLUDES,
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: ProductListFilter, page: { skip: number; take: number }): Promise<{ items: ProductRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.subCategoryId) where.subCategoryId = filter.subCategoryId;
    if (filter.brandId) where.brandId = filter.brandId;
    if (filter.trackingType) where.trackingType = filter.trackingType;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isServiceItem !== undefined) where.isServiceItem = filter.isServiceItem;
    if (filter.search) {
      where.OR = [
        { sku: { contains: filter.search, mode: "insensitive" } },
        { name: { contains: filter.search, mode: "insensitive" } },
        { modelNumber: { contains: filter.search, mode: "insensitive" } },
        { barcode: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: PRODUCT_INCLUDES,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    const row = await this.prisma.product.update({
      where: { id },
      data: { ...input },
      include: PRODUCT_INCLUDES,
    });
    return toRecord(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new EntityInUseError("product");
      }
      throw err;
    }
  }
}
