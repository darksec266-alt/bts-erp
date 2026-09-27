import { CreateProductUseCase, GetProductUseCase, ListProductsUseCase, UpdateProductUseCase, DeleteProductUseCase } from "./product.use-cases";
import { SimpleMasterDataNotFoundError, DuplicateKeyError } from "../domain/simple-master-data.types";
import type { ProductRepository, ProductRecord } from "./product-repository.port";

const sampleProduct: ProductRecord = {
  id: "prod_1", sku: "CAM-DOME-2MP", name: "2MP Dome Camera", categoryId: "cat_1", brandId: "brand_1", unitId: "unit_1",
  costPrice: "3500.00", sellingPrice: "5000.00", isServiceItem: false, isActive: true,
};

function makeRepo(overrides: Partial<jest.Mocked<ProductRepository>> = {}): jest.Mocked<ProductRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleProduct),
    findById: jest.fn().mockResolvedValue(sampleProduct),
    findBySku: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ items: [sampleProduct], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sampleProduct, sellingPrice: "5500.00" }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CreateProductUseCase", () => {
  it("creates when the SKU is not already used", async () => {
    const repo = makeRepo();
    await expect(
      new CreateProductUseCase(repo).execute({ sku: "CAM-DOME-2MP", name: "2MP Dome Camera", costPrice: "3500.00", sellingPrice: "5000.00" })
    ).resolves.toEqual(sampleProduct);
  });

  it("rejects a duplicate SKU", async () => {
    const repo = makeRepo({ findBySku: jest.fn().mockResolvedValue(sampleProduct) });
    await expect(
      new CreateProductUseCase(repo).execute({ sku: "CAM-DOME-2MP", name: "Dup", costPrice: "1", sellingPrice: "1" })
    ).rejects.toThrow(DuplicateKeyError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("GetProductUseCase / ListProductsUseCase", () => {
  it("returns the product when found", async () => {
    await expect(new GetProductUseCase(makeRepo()).execute("prod_1")).resolves.toEqual(sampleProduct);
  });

  it("throws SimpleMasterDataNotFoundError when not found", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetProductUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("lists with the given filter and pagination", async () => {
    const repo = makeRepo();
    await new ListProductsUseCase(repo).execute({ categoryId: "cat_1" }, { skip: 0, take: 20 });
    expect(repo.list).toHaveBeenCalledWith({ categoryId: "cat_1" }, { skip: 0, take: 20 });
  });
});

describe("UpdateProductUseCase / DeleteProductUseCase", () => {
  it("updates an existing product", async () => {
    const result = await new UpdateProductUseCase(makeRepo()).execute("prod_1", { sellingPrice: "5500.00" });
    expect(result.sellingPrice).toBe("5500.00");
  });

  it("throws SimpleMasterDataNotFoundError updating a missing product", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new UpdateProductUseCase(repo).execute("missing", {})).rejects.toThrow(SimpleMasterDataNotFoundError);
  });

  it("deletes an existing, unreferenced product", async () => {
    const repo = makeRepo();
    await new DeleteProductUseCase(repo).execute("prod_1");
    expect(repo.delete).toHaveBeenCalledWith("prod_1");
  });

  it("throws SimpleMasterDataNotFoundError deleting a missing product, never calling repo.delete", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new DeleteProductUseCase(repo).execute("missing")).rejects.toThrow(SimpleMasterDataNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
