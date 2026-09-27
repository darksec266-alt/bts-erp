import type { SupplierPaymentRepository, SupplierPaymentRecord, CreateSupplierPaymentInput } from "../application/supplier-payment-repository.port";

export interface SupplierPaymentPrismaClient {
  supplierPayment: {
    create(args: { data: Record<string, unknown> }): Promise<SupplierPaymentRow>;
    findUnique(args: { where: { idempotencyKey: string } }): Promise<SupplierPaymentRow | null>;
  };
}

interface SupplierPaymentRow {
  id: string;
  purchaseInvoiceId: string;
  amount: { toString(): string };
  method: string;
}

function toRecord(row: SupplierPaymentRow): SupplierPaymentRecord {
  return { id: row.id, purchaseInvoiceId: row.purchaseInvoiceId, amount: row.amount.toString(), method: row.method };
}

export class PrismaSupplierPaymentRepository implements SupplierPaymentRepository {
  constructor(private readonly prisma: SupplierPaymentPrismaClient) {}

  async create(input: CreateSupplierPaymentInput): Promise<SupplierPaymentRecord> {
    const row = await this.prisma.supplierPayment.create({ data: { ...input } });
    return toRecord(row);
  }

  async findByIdempotencyKey(key: string): Promise<SupplierPaymentRecord | null> {
    const row = await this.prisma.supplierPayment.findUnique({ where: { idempotencyKey: key } });
    return row ? toRecord(row) : null;
  }
}
