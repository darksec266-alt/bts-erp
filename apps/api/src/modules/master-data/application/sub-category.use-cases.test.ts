import {
  CreateSubCategoryUseCase,
  GetSubCategoryUseCase,
  ListSubCategoriesUseCase,
  UpdateSubCategoryUseCase,
  DeleteSubCategoryUseCase,
} from "./sub-category.use-cases";
import {
  DuplicateSubCategoryError,
  SubCategoryNotFoundError,
} from "../domain/sub-category.types";
import type { SubCategoryRepository } from "./sub-category-repository.port";
import type { SubCategoryRecord } from "../domain/sub-category.types";

const sampleSubCategory: SubCategoryRecord = {
  id: "sub_1",
  name: "Dome Cameras",
  categoryId: "cat_1",
  category: { id: "cat_1", name: "CCTV" },
  isActive: true,
};

function makeRepo(overrides: Partial<jest.Mocked<SubCategoryRepository>> = {}): jest.Mocked<SubCategoryRepository> {
  return {
    create: jest.fn().mockResolvedValue(sampleSubCategory),
    findById: jest.fn().mockResolvedValue(sampleSubCategory),
    findByNameAndCategory: jest.fn().mockResolvedValue(null),
    list: jest.fn().mockResolvedValue({ items: [sampleSubCategory], total: 1 }),
    update: jest.fn().mockResolvedValue({ ...sampleSubCategory, name: "Updated Dome" }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CreateSubCategoryUseCase", () => {
  it("creates when name is unique in category", async () => {
    const repo = makeRepo();
    const result = await new CreateSubCategoryUseCase(repo).execute({
      name: "Dome Cameras",
      categoryId: "cat_1",
    });
    expect(result).toEqual(sampleSubCategory);
    expect(repo.create).toHaveBeenCalledWith({ name: "Dome Cameras", categoryId: "cat_1" });
  });

  it("throws DuplicateSubCategoryError when duplicate in same category", async () => {
    const repo = makeRepo({ findByNameAndCategory: jest.fn().mockResolvedValue(sampleSubCategory) });
    await expect(
      new CreateSubCategoryUseCase(repo).execute({ name: "Dome Cameras", categoryId: "cat_1" })
    ).rejects.toThrow(DuplicateSubCategoryError);
  });
});

describe("GetSubCategoryUseCase / ListSubCategoriesUseCase", () => {
  it("returns sub-category when found", async () => {
    const repo = makeRepo();
    await expect(new GetSubCategoryUseCase(repo).execute("sub_1")).resolves.toEqual(sampleSubCategory);
  });

  it("throws SubCategoryNotFoundError when not found", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetSubCategoryUseCase(repo).execute("missing")).rejects.toThrow(SubCategoryNotFoundError);
  });

  it("lists sub-categories with category filter", async () => {
    const repo = makeRepo();
    const result = await new ListSubCategoriesUseCase(repo).execute({ categoryId: "cat_1" }, { skip: 0, take: 10 });
    expect(result.items).toHaveLength(1);
    expect(repo.list).toHaveBeenCalledWith({ categoryId: "cat_1" }, { skip: 0, take: 10 });
  });
});

describe("UpdateSubCategoryUseCase / DeleteSubCategoryUseCase", () => {
  it("updates an existing sub-category", async () => {
    const repo = makeRepo();
    const result = await new UpdateSubCategoryUseCase(repo).execute("sub_1", { name: "Updated Dome" });
    expect(result.name).toBe("Updated Dome");
  });

  it("deletes an existing sub-category", async () => {
    const repo = makeRepo();
    await expect(new DeleteSubCategoryUseCase(repo).execute("sub_1")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith("sub_1");
  });
});
