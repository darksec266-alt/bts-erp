import { createSimpleMasterDataRepository, type SimpleMasterDataPrismaDelegate } from "./simple-master-data-repository.factory";
import { EntityInUseError } from "../domain/simple-master-data.types";

function makeDelegate(overrides: Partial<jest.Mocked<SimpleMasterDataPrismaDelegate>> = {}): jest.Mocked<SimpleMasterDataPrismaDelegate> {
  return {
    create: jest.fn().mockResolvedValue({ id: "id_1", name: "Test", isActive: true }),
    findUnique: jest.fn().mockResolvedValue({ id: "id_1", name: "Test", isActive: true }),
    findMany: jest.fn().mockResolvedValue([{ id: "id_1", name: "Test", isActive: true }]),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn().mockResolvedValue({ id: "id_1", name: "Updated", isActive: true }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("createSimpleMasterDataRepository — name-keyed resource (e.g. Category)", () => {
  it("creates without a code field", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "category", hasIsActive: true, keyField: "name" });
    await repo.create({ name: "CCTV Cameras" });
    expect(delegate.create).toHaveBeenCalledWith({ data: { name: "CCTV Cameras", isActive: true } });
  });

  it("looks up findByUniqueKey against the name field", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "category", hasIsActive: true, keyField: "name" });
    await repo.findByUniqueKey("CCTV Cameras");
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { name: "CCTV Cameras" } });
  });
});

describe("createSimpleMasterDataRepository — code-keyed resource (e.g. Unit)", () => {
  it("creates with a code field included", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "unit", hasIsActive: true, keyField: "code" });
    await repo.create({ name: "Pieces", code: "PCS" });
    expect(delegate.create).toHaveBeenCalledWith({ data: { name: "Pieces", code: "PCS", isActive: true } });
  });

  it("looks up findByUniqueKey against the code field, not name", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "unit", hasIsActive: true, keyField: "code" });
    await repo.findByUniqueKey("PCS");
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { code: "PCS" } });
  });
});

describe("createSimpleMasterDataRepository.list", () => {
  it("omits the isActive filter entirely when not specified", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "brand", hasIsActive: true, keyField: "name" });
    await repo.list(undefined, { skip: 0, take: 20 });
    expect(delegate.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 20 });
  });

  it("filters by isActive when specified", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "brand", hasIsActive: true, keyField: "name" });
    await repo.list(false, { skip: 0, take: 20 });
    expect(delegate.findMany).toHaveBeenCalledWith({ where: { isActive: false }, skip: 0, take: 20 });
  });
});

describe("createSimpleMasterDataRepository.delete", () => {
  it("translates a P2003 foreign-key violation into EntityInUseError", async () => {
    const delegate = makeDelegate({ delete: jest.fn().mockRejectedValue({ code: "P2003" }) });
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "category", hasIsActive: true, keyField: "name" });
    await expect(repo.delete("id_1")).rejects.toThrow(EntityInUseError);
  });

  it("re-throws any other error unchanged", async () => {
    const boom = new Error("connection lost");
    const delegate = makeDelegate({ delete: jest.fn().mockRejectedValue(boom) });
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "category", hasIsActive: true, keyField: "name" });
    await expect(repo.delete("id_1")).rejects.toThrow(boom);
  });

  it("deletes cleanly when there is no conflict", async () => {
    const delegate = makeDelegate();
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: "category", hasIsActive: true, keyField: "name" });
    await expect(repo.delete("id_1")).resolves.toBeUndefined();
  });
});
