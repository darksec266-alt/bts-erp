import type {
  SubCategoryRecord,
  CreateSubCategoryInput,
  UpdateSubCategoryInput,
  SubCategoryListFilter,
} from "../domain/sub-category.types";

export interface SubCategoryRepository {
  create(input: CreateSubCategoryInput): Promise<SubCategoryRecord>;
  findById(id: string): Promise<SubCategoryRecord | null>;
  findByNameAndCategory(categoryId: string, name: string): Promise<SubCategoryRecord | null>;
  list(filter: SubCategoryListFilter, page: { skip: number; take: number }): Promise<{ items: SubCategoryRecord[]; total: number }>;
  update(id: string, input: UpdateSubCategoryInput): Promise<SubCategoryRecord>;
  delete(id: string): Promise<void>;
}
