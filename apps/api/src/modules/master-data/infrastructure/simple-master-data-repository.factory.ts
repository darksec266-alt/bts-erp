import type { SimpleMasterDataRepository, SimpleMasterDataRecord, CreateSimpleMasterDataInput } from "../domain/simple-master-data.types";
import { EntityInUseError } from "../domain/simple-master-data.types";

// One structural shape every one of Category/Brand/Unit/Warehouse/
// Department/TaxRate's real Prisma delegate satisfies (they differ only in
// which extra columns ride along — codeField/nameField below tell the
// factory which of THIS model's actual column names map to the generic
// name/code concept). Same "no generated client available" reasoning as
// every other Prisma-touching class in this codebase.
export interface SimpleMasterDataPrismaDelegate {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where: Record<string, unknown>; skip: number; take: number }): Promise<Record<string, unknown>[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

// Prisma's real foreign-key-violation error is a `PrismaClientKnownRequestError`
// with `.code === "P2003"` — checked structurally (not via instanceof
// against a class that doesn't exist here) for the same "no generated
// client" reason as everywhere else.
function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

export interface SimpleMasterDataFactoryConfig {
  resourceLabel: string; // for error messages, e.g. "category"
  hasIsActive: boolean; // Warehouse/Department/etc. — all true now that schema.prisma gives every one of them isActive; kept as a config flag rather than assumed, in case a future resource in this family genuinely lacks the column
  keyField: "name" | "code"; // which real column this resource's uniqueness is actually keyed on
}

export function createSimpleMasterDataRepository<T extends SimpleMasterDataRecord>(
  delegate: SimpleMasterDataPrismaDelegate,
  config: SimpleMasterDataFactoryConfig
): SimpleMasterDataRepository<T> {
  function toRecord(row: Record<string, unknown>): T {
    if (row && typeof row === "object" && "ratePercent" in row && row.ratePercent !== null && typeof (row.ratePercent as any)?.toNumber === "function") {
      return {
        ...row,
        ratePercent: (row.ratePercent as any).toNumber(),
      } as unknown as T;
    }
    return row as unknown as T;
  }

  return {
    async create(input: CreateSimpleMasterDataInput) {
      const data: Record<string, unknown> = { name: input.name };
      if (config.keyField === "code") data.code = input.code;
      if (config.hasIsActive) data.isActive = true;
      if (config.resourceLabel === "tax rate") {
        data.ratePercent = input.ratePercent !== undefined ? Number(input.ratePercent) : 0;
      }
      const row = await delegate.create({ data });
      return toRecord(row);
    },

    async findById(id: string) {
      const row = await delegate.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },

    async findByUniqueKey(key: string) {
      const row = await delegate.findUnique({ where: { [config.keyField]: key } });
      return row ? toRecord(row) : null;
    },

    async list(isActive: boolean | undefined, page: { skip: number; take: number }) {
      const where: Record<string, unknown> = {};
      if (config.hasIsActive && isActive !== undefined) where.isActive = isActive;
      const [rows, total] = await Promise.all([
        delegate.findMany({ where, skip: page.skip, take: page.take }),
        delegate.count({ where }),
      ]);
      return { items: rows.map(toRecord), total };
    },

    async update(id: string, input: { name?: string; code?: string; isActive?: boolean; ratePercent?: number }) {
      const data: Record<string, unknown> = { ...input };
      if (config.resourceLabel === "tax rate" && input.ratePercent !== undefined) {
        data.ratePercent = input.ratePercent;
      }
      const row = await delegate.update({ where: { id }, data });
      return toRecord(row);
    },

    async delete(id: string) {
      try {
        await delegate.delete({ where: { id } });
      } catch (err) {
        if (isForeignKeyViolation(err)) {
          throw new EntityInUseError(config.resourceLabel);
        }
        throw err;
      }
    },
  };
}
