export interface SubCategoryRecord {
  id: string;
  name: string;
  categoryId: string;
  category?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSubCategoryInput {
  name: string;
  categoryId: string;
}

export interface UpdateSubCategoryInput {
  name?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface SubCategoryListFilter {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}

export class DuplicateSubCategoryError extends Error {
  constructor(name: string) {
    super(`A sub-category with name "${name}" already exists in this category.`);
    this.name = "DuplicateSubCategoryError";
  }
}

export class SubCategoryNotFoundError extends Error {
  constructor() {
    super("Sub-category not found.");
    this.name = "SubCategoryNotFoundError";
  }
}

export class SubCategoryInUseError extends Error {
  constructor() {
    super("This sub-category is referenced by existing products and cannot be deleted.");
    this.name = "SubCategoryInUseError";
  }
}
