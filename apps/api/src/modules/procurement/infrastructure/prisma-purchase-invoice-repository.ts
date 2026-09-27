import type { PurchaseInvoiceRepository, PurchaseInvoiceRecord, CreatePurchaseInvoiceInput } from "../application/purchase-invoice-repository.port";

export interface PurchaseInvoicePrismaClient {
  purchaseInvoice: {
    create(args: { data: Record<string, unknown> }): Promise<PurchaseInvoiceRow>;
    findUnique(args: { where: { id?: string; idempotencyKey?: string } }): Promise<PurchaseInvoiceRow | null>;
  };
}

interface PurchaseInvoiceRow {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  grnId: string | null;
  grandTotal: { toString(): string };
}

function toRecord(row: PurchaseInvoiceRow): PurchaseInvoiceRecord {
  return { id: row.id, invoiceNumber: row.invoiceNumber, purchaseOrderId: row.purchaseOrderId, grnId: row.grnId, grandTotal: row.grandTotal.toString() };
}

export class PrismaPurchaseInvoiceRepository implements PurchaseInvoiceRepository {
  constructor(private readonly prisma: PurchaseInvoicePrismaClient) {}

  async create(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoiceRecord> {
    const row = await this.prisma.purchaseInvoice.create({ data: { ...input } });
    return toRecord(row);
  }

  async findByIdempotencyKey(key: string): Promise<PurchaseInvoiceRecord | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({ where: { idempotencyKey: key } });
    return row ? toRecord(row) : null;
  }

  async findById(id: string): Promise<PurchaseInvoiceRecord | null> {
    const row = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }
}
