import {
  CreateCustomerUseCase,
  DuplicatePhoneError,
  GetCustomerUseCase,
  ListCustomersUseCase,
  UpdateCustomerUseCase,
  AddCustomerAddressUseCase,
  DeleteCustomerUseCase,
} from "./customer.use-cases";
import { SimpleMasterDataNotFoundError } from "../domain/simple-master-data.types";
import type { CustomerRepository, CustomerRecord } from "./customer-repository.port";

const sampleCustomer: CustomerRecord = {
  id: "cust_1",
  customerCode: "CUST-0001",
  displayName: "Karim Traders",
  phone: "01700000000",
  branchId: "branch_1",
  isServiceOnly: false,
  isActive: true,
  addresses: [],
};

function makeRepo(overrides: Partial<jest.Mocked<CustomerRepository>> = {}): jest.Mocked<CustomerRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleCustomer),
    findById: jest.fn().mockResolvedValue(sampleCustomer),
    findByPhone: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ items: [sampleCustomer], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sampleCustomer, displayName: "Updated" }),
    addAddress: jest.fn().mockResolvedValue({ ...sampleCustomer, addresses: [{ id: "addr_1", label: "Warehouse", addressLine: "..." }] }),
    delete: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    topupWallet: jest.fn().mockResolvedValue({} as any),
    payInvoiceFromWallet: jest.fn().mockResolvedValue({} as any),
    ...overrides,
  };
}

describe("CreateCustomerUseCase", () => {
  it("creates when the phone number is not already used", async () => {
    const repo = makeRepo();
    await expect(
      new CreateCustomerUseCase(repo).execute({ customerCode: "CUST-0001", displayName: "Karim Traders", phone: "01700000000", branchId: "branch_1" })
    ).resolves.toEqual(sampleCustomer);
  });

  it("rejects a duplicate phone number", async () => {
    const repo = makeRepo({ findByPhone: jest.fn().mockResolvedValue(sampleCustomer) });
    const useCase = new CreateCustomerUseCase(repo);
    await expect(
      useCase.execute({ customerCode: "CUST-0002", displayName: "Someone Else", phone: "01700000000", branchId: "branch_1" })
    ).rejects.toThrow(DuplicatePhoneError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("GetCustomerUseCase / ListCustomersUseCase", () => {
  it("returns the customer when found", async () => {
    const repo = makeRepo();
    await expect(new GetCustomerUseCase(repo).execute("cust_1")).resolves.toEqual(sampleCustomer);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetCustomerUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makeRepo();
    await new ListCustomersUseCase(repo).execute({ branchId: "branch_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ branchId: "branch_1" }, { skip: 0, take: 20 });
  });
});

describe("UpdateCustomerUseCase", () => {
  it("updates an existing customer", async () => {
    const repo = makeRepo();
    const result = await new UpdateCustomerUseCase(repo).execute("cust_1", { displayName: "Updated" });
    expect(result.displayName).toBe("Updated");
  });

  it("throws SimpleMasterDataNotFoundError for a missing customer", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new UpdateCustomerUseCase(repo).execute("missing", { displayName: "X" })).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});

describe("AddCustomerAddressUseCase", () => {
  it("adds an address to an existing customer", async () => {
    const repo = makeRepo();
    const result = await new AddCustomerAddressUseCase(repo).execute("cust_1", { label: "Warehouse", addressLine: "123 Main Rd" });
    expect(result.addresses).toHaveLength(1);
  });

  it("throws SimpleMasterDataNotFoundError for a missing customer", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new AddCustomerAddressUseCase(repo).execute("missing", { label: "X", addressLine: "Y" })).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});

describe("DeleteCustomerUseCase", () => {
  it("deletes an existing, unreferenced customer", async () => {
    const repo = makeRepo();
    await new DeleteCustomerUseCase(repo).execute("cust_1");
    expect(repo.delete).toHaveBeenCalledWith("cust_1");
  });

  it("throws SimpleMasterDataNotFoundError for a missing customer, never calling repo.delete", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new DeleteCustomerUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
