import type { ProductRepository, ProductRecord, CreateProductInput, UpdateProductInput, ProductListFilter } from "./product-repository.port";
import { SimpleMasterDataNotFoundError, DuplicateKeyError } from "../domain/simple-master-data.types";

export class CreateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(input: CreateProductInput): Promise<ProductRecord> {
    const existing = await this.products.findBySku(input.sku);
    if (existing) throw new DuplicateKeyError("product", input.sku);
    return this.products.create(input);
  }
}

export class GetProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<ProductRecord> {
    const product = await this.products.findById(id);
    if (!product) throw new SimpleMasterDataNotFoundError("product");
    return product;
  }
}

export class ListProductsUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(filter: ProductListFilter, page: { skip: number; take: number }) {
    return this.products.list(filter, page);
  }
}

export class UpdateProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    const existing = await this.products.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("product");
    return this.products.update(id, input);
  }
}

export class DeleteProductUseCase {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.products.findById(id);
    if (!existing) throw new SimpleMasterDataNotFoundError("product");
    await this.products.delete(id);
  }
}
