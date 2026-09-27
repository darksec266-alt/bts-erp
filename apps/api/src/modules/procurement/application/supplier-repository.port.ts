// prd.md §8.3 / api-spec.md §13. Same reasoning as Customer
// (modules/master-data) for why this isn't forced into the generic
// simple-master-data shape — SupplierContact is a relation, not a flat field.

export interface SupplierContactInput {
  name: string;
  phone: string;
  isPrimary?: boolean;
}

export interface SupplierRecord {
  id: string;
  supplierCode: string;
  companyName: string;
  isActive: boolean;
  contacts: { id: string; name: string; phone: string; isPrimary: boolean }[];
}

export interface CreateSupplierInput {
  supplierCode: string;
  companyName: string;
  contacts?: SupplierContactInput[];
}

export interface UpdateSupplierInput {
  companyName?: string;
  isActive?: boolean;
}

export interface SupplierListFilter {
  isActive?: boolean;
  search?: string;
}

export interface SupplierRepository {
  create(input: CreateSupplierInput): Promise<SupplierRecord>;
  findById(id: string): Promise<SupplierRecord | null>;
  findByCode(code: string): Promise<SupplierRecord | null>;
  list(filter: SupplierListFilter, page: { skip: number; take: number }): Promise<{ items: SupplierRecord[]; total: number }>;
  update(id: string, input: UpdateSupplierInput): Promise<SupplierRecord>;
  addContact(supplierId: string, input: SupplierContactInput): Promise<SupplierRecord>;
  delete(id: string): Promise<void>;
}
