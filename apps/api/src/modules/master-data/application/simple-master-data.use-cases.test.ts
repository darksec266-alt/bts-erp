import { SimpleMasterDataUseCases } from "./simple-master-data.use-cases";
import { DuplicateKeyError, SimpleMasterDataNotFoundError, EntityInUseError } from "../domain/simple-master-data.types";
import type { SimpleMasterDataRepository, SimpleMasterDataRecord } from "../domain/simple-master-data.types";

const sample: SimpleMasterDataRecord = { id: "cat_1", name: "CCTV Cameras", isActive: true };
const sampleWithCode: SimpleMasterDataRecord = { id: "unit_1", code: "PCS", name: "Pieces", isActive: true };

function makeRepo(overrides: Partial<jest.Mocked<SimpleMasterDataRepository>> = {}): jest.Mocked<SimpleMasterDataRepository> {
  return {
    create: jest.fn().mockResolvedValue(sample),
    findById: jest.fn().mockResolvedValue(sample),
    findByUniqueKey: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ items: [sample], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sample, name: "Updated" }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("SimpleMasterDataUseCases.create — name-keyed resources (Category/Brand/TaxRate/Department)", () => {
  it("creates when no name clash exists", async () => {
    const repo = makeRepo();
    const useCases = new SimpleMasterDataUseCases(repo, "category");
    await expect(useCases.create({ name: "CCTV Cameras" })).resolves.toEqual(sample);
    expect(repo.findByUniqueKey).toHaveBeenCalledWith("CCTV Cameras");
  });

  it("rejects a duplicate name before calling create", async () => {
    const repo = makeRepo({ findByUniqueKey: jest.fn().mockResolvedValue(sample) });
    const useCases = new SimpleMasterDataUseCases(repo, "category");
    await expect(useCases.create({ name: "CCTV Cameras" })).rejects.toThrow(DuplicateKeyError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("SimpleMasterDataUseCases.create — code-keyed resources (Unit/Warehouse)", () => {
  it("checks uniqueness against the code, not the name", async () => {
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(sampleWithCode) });
    const useCases = new SimpleMasterDataUseCases(repo, "unit");
    await useCases.create({ name: "Pieces", code: "PCS" });
    expect(repo.findByUniqueKey).toHaveBeenCalledWith("PCS");
  });

  it("rejects a duplicate code even if the name differs", async () => {
    const repo = makeRepo({ findByUniqueKey: jest.fn().mockResolvedValue(sampleWithCode) });
    const useCases = new SimpleMasterDataUseCases(repo, "unit");
    await expect(useCases.create({ name: "Something Else", code: "PCS" })).rejects.toThrow(DuplicateKeyError);
  });
});

describe("SimpleMasterDataUseCases.get", () => {
  it("throws SimpleMasterDataNotFoundError for a missing id", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCases = new SimpleMasterDataUseCases(repo, "brand");
    await expect(useCases.get("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});

describe("SimpleMasterDataUseCases.update", () => {
  it("allows updating a record to keep its own current key (no false-positive clash)", async () => {
    const repo = makeRepo();
    const useCases = new SimpleMasterDataUseCases(repo, "unit");
    await useCases.update("cat_1", { name: "CCTV Cameras", isActive: false });
    expect(repo.findByUniqueKey).not.toHaveBeenCalled(); // key unchanged — no clash check needed
    expect(repo.update).toHaveBeenCalledWith("cat_1", { name: "CCTV Cameras", isActive: false });
  });

  it("rejects renaming to a key already used by a different record", async () => {
    const repo = makeRepo({ findByUniqueKey: jest.fn().mockResolvedValue({ id: "cat_2", name: "Other", isActive: true }) });
    const useCases = new SimpleMasterDataUseCases(repo, "unit");
    await expect(useCases.update("cat_1", { name: "Other" })).rejects.toThrow(DuplicateKeyError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("throws SimpleMasterDataNotFoundError for a missing id", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCases = new SimpleMasterDataUseCases(repo, "warehouse");
    await expect(useCases.update("missing", { name: "X" })).rejects.toThrow(SimpleMasterDataNotFoundError);
  });
});

describe("SimpleMasterDataUseCases.delete", () => {
  it("deletes when found and not referenced elsewhere", async () => {
    const repo = makeRepo();
    const useCases = new SimpleMasterDataUseCases(repo, "brand");
    await useCases.delete("cat_1");
    expect(repo.delete).toHaveBeenCalledWith("cat_1");
  });

  it("propagates EntityInUseError from the repository (a linked transaction exists)", async () => {
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(new EntityInUseError("category")) });
    const useCases = new SimpleMasterDataUseCases(repo, "category");
    await expect(useCases.delete("cat_1")).rejects.toThrow(EntityInUseError);
  });

  it("throws SimpleMasterDataNotFoundError for a missing id, never reaching repo.delete", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCases = new SimpleMasterDataUseCases(repo, "tax rate");
    await expect(useCases.delete("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
