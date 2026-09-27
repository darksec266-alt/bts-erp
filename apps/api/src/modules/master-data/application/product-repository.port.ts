// prd.md §8.4-§8.5 / api-spec.md §13. Product is richer than the generic
// simple-master-data shape (Category/Brand/Unit FKs, pricing, the
// isServiceItem flag) — its own bespoke module, same reasoning as Customer.

export interface ProductStockRecord {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  quantityOnHand: number;
}

export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  trackingType: "SERIALIZED" | "NON_SERIALIZED";
  modelNumber?: string | null;
  barcode?: string | null;
  categoryId: string | null;
  subCategoryId?: string | null;
  brandId: string | null;
  unitId: string | null;
  costPrice: string; // Decimal serialized as string — never a JS float for money (database-schema.md §9's convention)
  sellingPrice: string;
  isServiceItem: boolean;
  isActive: boolean;
  category?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  unit?: { id: string; code: string; name: string } | null;
  totalStock?: number;
  stockLedgers?: ProductStockRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED";
  modelNumber?: string;
  barcode?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  costPrice: string;
  sellingPrice: string;
  isServiceItem?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED";
  modelNumber?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  costPrice?: string;
  sellingPrice?: string;
  isServiceItem?: boolean;
  isActive?: boolean;
}

export interface ProductListFilter {
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  trackingType?: "SERIALIZED" | "NON_SERIALIZED";
  isActive?: boolean;
  isServiceItem?: boolean;
  search?: string;
}

export interface ProductRepository {
  create(input: CreateProductInput): Promise<ProductRecord>;
  findById(id: string): Promise<ProductRecord | null>;
  findBySku(sku: string): Promise<ProductRecord | null>;
  findByBarcode(barcode: string): Promise<ProductRecord | null>;
  list(filter: ProductListFilter, page: { skip: number; take: number }): Promise<{ items: ProductRecord[]; total: number }>;
  update(id: string, input: UpdateProductInput): Promise<ProductRecord>;
  delete(id: string): Promise<void>; // throws EntityInUseError if referenced elsewhere
}
