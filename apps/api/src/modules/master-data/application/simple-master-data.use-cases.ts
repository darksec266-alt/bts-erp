import type { SimpleMasterDataRepository, SimpleMasterDataRecord, CreateSimpleMasterDataInput } from "../domain/simple-master-data.types";
import { DuplicateKeyError, SimpleMasterDataNotFoundError } from "../domain/simple-master-data.types";

// One generic class, instantiated once per resource (Category, Brand,
// Unit, Warehouse, Department, TaxRate) — see
// infrastructure/*-repository.ts and presentation/simple-master-data.router-factory.ts
// for where `resourceLabel` (used only in error messages) and the
// resource-specific repository get plugged in.
export class SimpleMasterDataUseCases<T extends SimpleMasterDataRecord> {
  constructor(
    private readonly repo: SimpleMasterDataRepository<T>,
    private readonly resourceLabel: string
  ) {}

  async create(input: CreateSimpleMasterDataInput): Promise<T> {
    const key = input.code ?? input.name;
    const existing = await this.repo.findByUniqueKey(key);
    if (existing) throw new DuplicateKeyError(this.resourceLabel, key);
    return this.repo.create(input);
  }

  async get(id: string): Promise<T> {
    const record = await this.repo.findById(id);
    if (!record) throw new SimpleMasterDataNotFoundError(this.resourceLabel);
    return record;
  }

  async list(isActive: boolean | undefined, page: { skip: number; take: number }) {
    return this.repo.list(isActive, page);
  }

  async update(id: string, input: { name?: string; code?: string; isActive?: boolean; ratePercent?: number }): Promise<T> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError(this.resourceLabel);

    const newKey = input.code ?? input.name;
    const existingKey = existing.code ?? existing.name;
    if (newKey && newKey !== existingKey) {
      const clash = await this.repo.findByUniqueKey(newKey);
      if (clash) throw new DuplicateKeyError(this.resourceLabel, newKey);
    }
    return this.repo.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError(this.resourceLabel);
    await this.repo.delete(id); // throws EntityInUseError itself if referenced elsewhere
  }
}
