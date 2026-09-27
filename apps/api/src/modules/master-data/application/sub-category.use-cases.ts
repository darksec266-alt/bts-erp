import type { SubCategoryRepository } from "./sub-category-repository.port";
import type {
  SubCategoryRecord,
  CreateSubCategoryInput,
  UpdateSubCategoryInput,
  SubCategoryListFilter,
} from "../domain/sub-category.types";
import {
  DuplicateSubCategoryError,
  SubCategoryNotFoundError,
} from "../domain/sub-category.types";

export class CreateSubCategoryUseCase {
  constructor(private readonly repo: SubCategoryRepository) {}

  async execute(input: CreateSubCategoryInput): Promise<SubCategoryRecord> {
    const existing = await this.repo.findByNameAndCategory(input.categoryId, input.name.trim());
    if (existing) {
      throw new DuplicateSubCategoryError(input.name.trim());
    }
    return this.repo.create({
      name: input.name.trim(),
      categoryId: input.categoryId,
    });
  }
}

export class GetSubCategoryUseCase {
  constructor(private readonly repo: SubCategoryRepository) {}

  async execute(id: string): Promise<SubCategoryRecord> {
    const record = await this.repo.findById(id);
    if (!record) throw new SubCategoryNotFoundError();
    return record;
  }
}

export class ListSubCategoriesUseCase {
  constructor(private readonly repo: SubCategoryRepository) {}

  async execute(
    filter: SubCategoryListFilter,
    page: { skip: number; take: number }
  ): Promise<{ items: SubCategoryRecord[]; total: number }> {
    return this.repo.list(filter, page);
  }
}

export class UpdateSubCategoryUseCase {
  constructor(private readonly repo: SubCategoryRepository) {}

  async execute(id: string, input: UpdateSubCategoryInput): Promise<SubCategoryRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new SubCategoryNotFoundError();

    const targetCategoryId = input.categoryId ?? existing.categoryId;
    const targetName = input.name !== undefined ? input.name.trim() : existing.name;

    if (targetCategoryId !== existing.categoryId || targetName !== existing.name) {
      const clash = await this.repo.findByNameAndCategory(targetCategoryId, targetName);
      if (clash && clash.id !== id) {
        throw new DuplicateSubCategoryError(targetName);
      }
    }

    return this.repo.update(id, {
      name: input.name !== undefined ? input.name.trim() : undefined,
      categoryId: input.categoryId,
      isActive: input.isActive,
    });
  }
}

export class DeleteSubCategoryUseCase {
  constructor(private readonly repo: SubCategoryRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new SubCategoryNotFoundError();
    await this.repo.delete(id);
  }
}
