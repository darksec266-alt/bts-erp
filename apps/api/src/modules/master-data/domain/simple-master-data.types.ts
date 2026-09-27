// api-spec.md §13: "Identical CRUD shape across Customer, Supplier,
// Product, Category, Brand, Unit, Warehouse, TaxRate — one template,
// applied per resource." This file is that template, for the subset of
// those eight simple enough to share one generic shape verbatim
// (Category, Brand, Unit, Warehouse, Department, TaxRate — each just an
// id/name/isActive-ish row with no relational complexity of its own).
// Customer and Product are richer (addresses, category/brand/unit FKs, a
// stock-lookup convenience endpoint) and get their own bespoke modules
// instead of being forced into this shape.

export interface SimpleMasterDataRecord {
  id: string;
  name: string;
  isActive: boolean;
  code?: string; // present for Unit/Warehouse (uniqueness keyed on `code`, not `name`), absent for Category/Brand/TaxRate/Department
  ratePercent?: number; // present for TaxRate
}

export class DuplicateKeyError extends Error {
  constructor(resourceLabel: string, key: string) {
    super(`A ${resourceLabel} with "${key}" already exists.`);
    this.name = "DuplicateKeyError";
  }
}

export class SimpleMasterDataNotFoundError extends Error {
  constructor(resourceLabel: string) {
    super(`${resourceLabel} not found.`);
    this.name = "SimpleMasterDataNotFoundError";
  }
}

// api-spec.md §13: "DELETE blocked with 422 if any linked transaction
// exists (database.md §8.25's rule)." schema.prisma already enforces this
// at the database level via onDelete: Restrict on every FK pointing at
// these tables — this error is what a repository implementation throws
// after translating that low-level constraint violation into something
// the presentation layer can turn into a clean 422, rather than a raw
// 500 leaking a foreign-key constraint name to an API response.
export class EntityInUseError extends Error {
  constructor(resourceLabel: string) {
    super(`This ${resourceLabel} is referenced by existing records and cannot be deleted.`);
    this.name = "EntityInUseError";
  }
}

export interface CreateSimpleMasterDataInput {
  name: string;
  code?: string; // required by the repository implementation for Unit/Warehouse, ignored for the others
  ratePercent?: number;
}

// `findByUniqueKey` looks up by whichever field this resource actually
// enforces uniqueness on — `code` for Unit/Warehouse, `name` for every
// other resource in this family. Each repository implementation knows
// which one it is; the use case layer never needs to.
export interface SimpleMasterDataRepository<T extends SimpleMasterDataRecord = SimpleMasterDataRecord> {
  create(input: CreateSimpleMasterDataInput): Promise<T>;
  findById(id: string): Promise<T | null>;
  findByUniqueKey(key: string): Promise<T | null>;
  list(isActive: boolean | undefined, page: { skip: number; take: number }): Promise<{ items: T[]; total: number }>;
  update(id: string, input: { name?: string; code?: string; isActive?: boolean; ratePercent?: number }): Promise<T>;
  delete(id: string): Promise<void>; // throws EntityInUseError if referenced elsewhere
}
