import { CreateSupplierUseCase, GetSupplierUseCase, ListSuppliersUseCase, UpdateSupplierUseCase, AddSupplierContactUseCase, DeleteSupplierUseCase } from "./supplier.use-cases";
import { SimpleMasterDataNotFoundError, DuplicateKeyError } from "../../master-data/domain/simple-master-data.types";
import type { SupplierRepository, SupplierRecord } from "./supplier-repository.port";

const sampleSupplier: SupplierRecord = { id: "sup_1", supplierCode: "SUP-0001", companyName: "Dhaka Electronics Ltd.", isActive: true, contacts: [] };

function makeRepo(overrides: Partial<jest.Mocked<SupplierRepository>> = {}): jest.Mocked<SupplierRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleSupplier),
    findById: jest.fn().mockResolvedValue(sampleSupplier),
    findByCode: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ items: [sampleSupplier], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sampleSupplier, companyName: "Updated" }),
    addContact: jest.fn().mockResolvedValue({ ...sampleSupplier, contacts: [{ id: "c1", name: "Karim", phone: "017...", isPrimary: true }] }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CreateSupplierUseCase", () => {
  it("creates when the supplier code is not already used", async () => {
    const repo = makeRepo();
    await expect(new CreateSupplierUseCase(repo).execute({ supplierCode: "SUP-0001", companyName: "Dhaka Electronics Ltd." })).resolves.toEqual(sampleSupplier);
  });

  it("rejects a duplicate supplier code", async () => {
    const repo = makeRepo({ findByCode: jest.fn().mockResolvedValue(sampleSupplier) });
    await expect(new CreateSupplierUseCase(repo).execute({ supplierCode: "SUP-0001", companyName: "Dup" })).rejects.toThrow(DuplicateKeyError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("GetSupplierUseCase / ListSuppliersUseCase", () => {
  it("returns the supplier when found", async () => {
    await expect(new GetSupplierUseCase(makeRepo()).execute("sup_1")).resolves.toEqual(sampleSupplier);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetSupplierUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makeRepo();
    await new ListSuppliersUseCase(repo).execute({ isActive: true }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ isActive: true }, { skip: 0, take: 20 });
  });
});

describe("UpdateSupplierUseCase / AddSupplierContactUseCase / DeleteSupplierUseCase", () => {
  it("updates an existing supplier", async () => {
    const result = await new UpdateSupplierUseCase(makeRepo()).execute("sup_1", { companyName: "Updated" });
    expect(result.companyName).toBe("Updated");
  });

  it("throws SimpleMasterDataNotFoundError updating a missing supplier", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new UpdateSupplierUseCase(repo).execute("missing", {})).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("adds a contact to an existing supplier", async () => {
    const result = await new AddSupplierContactUseCase(makeRepo()).execute("sup_1", { name: "Karim", phone: "017..." });
    expect(result.contacts).toHaveLength(1);
  });

  it("throws SimpleMasterDataNotFoundError adding a contact to a missing supplier", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new AddSupplierContactUseCase(repo).execute("missing", { name: "X", phone: "Y" })).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("deletes an existing, unreferenced supplier", async () => {
    const repo = makeRepo();
    await new DeleteSupplierUseCase(repo).execute("sup_1");
    expect(repo.delete).toHaveBeenCalledWith("sup_1");
  });

  it("throws SimpleMasterDataNotFoundError deleting a missing supplier, never calling repo.delete", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new DeleteSupplierUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
