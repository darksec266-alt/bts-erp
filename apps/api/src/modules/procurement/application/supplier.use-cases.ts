import type { SupplierRepository, SupplierRecord, CreateSupplierInput, UpdateSupplierInput, SupplierListFilter, SupplierContactInput } from "./supplier-repository.port";
import { SimpleMasterDataNotFoundError, DuplicateKeyError } from "../../master-data/domain/simple-master-data.types";

export class CreateSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(input: CreateSupplierInput): Promise<SupplierRecord> {
    const existing = await this.suppliers.findByCode(input.supplierCode);
    if (existing) throw new DuplicateKeyError("supplier", input.supplierCode);
    return this.suppliers.create(input);
  }
}

export class GetSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: string): Promise<SupplierRecord> {
    const supplier = await this.suppliers.findById(id);
    if (!supplier) throw new SimpleMasterDataNotFoundError("supplier");
    return supplier;
  }
}

export class ListSuppliersUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(filter: SupplierListFilter, page: { skip: number; take: number }) {
    return this.suppliers.list(filter, page);
  }
}

export class UpdateSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: string, input: UpdateSupplierInput): Promise<SupplierRecord> {
    const existing = await this.suppliers.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("supplier");
    return this.suppliers.update(id, input);
  }
}

export class AddSupplierContactUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(supplierId: string, input: SupplierContactInput): Promise<SupplierRecord> {
    const existing = await this.suppliers.findById(supplierId);
    if (!existing) throw new SimpleMasterDataNotFoundError("supplier");
    return this.suppliers.addContact(supplierId, input);
  }
}

export class DeleteSupplierUseCase {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.suppliers.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("supplier");
    await this.suppliers.delete(id);
  }
}
