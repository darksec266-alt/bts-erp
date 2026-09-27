import type { CustomerRepository, CustomerRecord, CreateCustomerInput, UpdateCustomerInput, CustomerListFilter, CustomerAddressInput } from "./customer-repository.port";
import { SimpleMasterDataNotFoundError } from "../domain/simple-master-data.types";

export class DuplicatePhoneError extends Error {
  constructor(phone: string) {
    super(`A customer with phone number "${phone}" already exists.`);
    this.name = "DuplicatePhoneError";
  }
}

export class CreateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<CustomerRecord> {
    const existing = await this.customers.findByPhone(input.phone);
    if (existing) throw new DuplicatePhoneError(input.phone);
    return this.customers.create(input);
  }
}

export class GetCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(id: string): Promise<CustomerRecord> {
    const customer = await this.customers.findById(id);
    if (!customer) throw new SimpleMasterDataNotFoundError("customer");
    return customer;
  }
}

export class ListCustomersUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(filter: CustomerListFilter, page: { skip: number; take: number }) {
    return this.customers.list(filter, page);
  }
}

// api-spec.md §13's note (prd.md §8.25): once a Customer record leaves
// draft, an edit should route through the Edit Request flow (Phase 9,
// not built yet) rather than a direct write — same deliberate,
// flagged-not-silent gap as identity/application/employee.use-cases.ts's
// UpdateEmployeeUseCase.
export class UpdateCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(id: string, input: UpdateCustomerInput): Promise<CustomerRecord> {
    const existing = await this.customers.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("customer");
    return this.customers.update(id, input);
  }
}

export class AddCustomerAddressUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(customerId: string, input: CustomerAddressInput): Promise<CustomerRecord> {
    const existing = await this.customers.findById(customerId);
    if (!existing) throw new SimpleMasterDataNotFoundError("customer");
    return this.customers.addAddress(customerId, input);
  }
}

export class DeleteCustomerUseCase {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.customers.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("customer");
    await this.customers.delete(id); // throws EntityInUseError itself if referenced elsewhere
  }
}
