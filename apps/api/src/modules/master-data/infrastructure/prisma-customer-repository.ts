import type { CustomerRepository, CustomerRecord, CreateCustomerInput, UpdateCustomerInput, CustomerListFilter, CustomerAddressInput } from "../application/customer-repository.port";
import { EntityInUseError } from "../domain/simple-master-data.types";

export interface CustomerPrismaClient {
  customer: {
    create(args: { data: Record<string, unknown>; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow>;
    findUnique(args: { where: { id?: string; phone?: string }; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow | null>;
    findMany(args: { where: Record<string, unknown>; skip: number; take: number; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow[]>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    update(args: { where: { id: string }; data: Record<string, unknown>; include: { addresses: true; branch?: { select: { id: true; code: true; name: true } } } }): Promise<CustomerRow>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
  customerAddress: {
    create(args: { data: { customerId: string; label: string; addressLine: string } }): Promise<unknown>;
  };
}

interface CustomerRow {
  id: string;
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  walletBalance?: any;
  branch?: { id: string; code: string; name: string };
  isServiceOnly: boolean;
  isActive: boolean;
  addresses: { id: string; label: string; addressLine: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2003";
}

function toRecord(row: CustomerRow): CustomerRecord {
  return {
    ...row,
    walletBalance: row.walletBalance != null ? Number(row.walletBalance) : 0,
  };
}

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: any) {}

  async create(input: CreateCustomerInput): Promise<CustomerRecord> {
    const { addresses, ...rest } = input;
    const row = await this.prisma.customer.create({
      data: { ...rest, addresses: addresses ? { create: addresses } : undefined },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async findByPhone(phone: string): Promise<CustomerRecord | null> {
    const row = await this.prisma.customer.findUnique({
      where: { phone },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return row ? toRecord(row) : null;
  }

  async list(filter: CustomerListFilter, page: { skip: number; take: number }): Promise<{ items: CustomerRecord[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filter.branchId) where.branchId = filter.branchId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.isServiceOnly !== undefined) where.isServiceOnly = filter.isServiceOnly;
    if (filter.search) {
      where.OR = [
        { displayName: { contains: filter.search, mode: "insensitive" } },
        { customerCode: { contains: filter.search, mode: "insensitive" } },
        { phone: { contains: filter.search } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: page.skip,
        take: page.take,
        include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerRecord> {
    const row = await this.prisma.customer.update({
      where: { id },
      data: { ...input },
      include: { addresses: true, branch: { select: { id: true, code: true, name: true } } },
    });
    return toRecord(row);
  }

  async addAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerRecord> {
    await this.prisma.customerAddress.create({ data: { customerId, ...input } });
    const updated = await this.prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: true } });
    return toRecord(updated!); // existence already checked by AddCustomerAddressUseCase before this repository method is ever called
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new EntityInUseError("customer");
      }
      throw err;
    }
  }

  async getProfile(id: string): Promise<import("../application/customer-repository.port").CustomerProfileRecord | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    if (!customer) return null;

    const [invoices, salesReturns, payments, walletTransactions] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { customerId: id },
        include: {
          payments: true,
          advanceAdjustments: true,
          salesReturns: true,
          creditNotes: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.salesReturn.findMany({
        where: { customerId: id },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          lines: { include: { product: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.payment.findMany({
        where: { invoice: { customerId: id } },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
        },
        orderBy: { receivedAt: "desc" },
      }),
      this.prisma.customerWalletTransaction.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const mappedInvoices = invoices.map((inv: any) => {
      const grandTotal = Number(inv.grandTotal);
      const paidFromPayments = (inv.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const paidFromAdvances = (inv.advanceAdjustments || []).reduce((s: number, a: any) => s + Number(a.amountAdjusted), 0);
      const returnedAmount = (inv.salesReturns || []).reduce((s: number, r: any) => s + Number(r.totalAmount || r.refundAmount || 0), 0);
      const totalPaid = Number((paidFromPayments + paidFromAdvances).toFixed(2));
      const dueAmount = Math.max(0, Number((grandTotal - totalPaid - returnedAmount).toFixed(2)));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        sourceType: inv.sourceType,
        sourceId: inv.sourceId,
        customerId: inv.customerId,
        branchId: inv.branchId,
        grandTotal,
        totalPaid,
        returnedAmount,
        dueAmount,
        status: inv.status,
        createdAt: inv.createdAt,
      };
    });

    const totalInvoiced = Number(mappedInvoices.reduce((s: number, inv: any) => s + inv.grandTotal, 0).toFixed(2));
    const totalPaid = Number(mappedInvoices.reduce((s: number, inv: any) => s + inv.totalPaid, 0).toFixed(2));
    const totalReturned = Number(salesReturns.reduce((s: number, r: any) => s + Number(r.totalAmount || r.refundAmount || 0), 0).toFixed(2));
    const currentDue = Math.max(0, Number((totalInvoiced - totalPaid - totalReturned).toFixed(2)));
    const walletBalance = Number(customer.walletBalance || 0);

    const summary: import("../application/customer-repository.port").CustomerFinancialSummary = {
      totalInvoiced,
      totalPaid,
      totalReturned,
      currentDue,
      walletBalance,
    };

    return {
      customer: toRecord(customer),
      summary,
      invoices: mappedInvoices,
      salesReturns: salesReturns.map((r: any) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoice?.invoiceNumber,
        customerId: r.customerId,
        branchId: r.branchId,
        warehouseId: r.warehouseId,
        warehouseName: r.warehouse?.name,
        totalAmount: Number(r.totalAmount),
        creditToWallet: r.creditToWallet,
        refundAmount: Number(r.refundAmount),
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        lines: (r.lines || []).map((l: any) => ({
          id: l.id,
          productId: l.productId,
          productName: l.product?.name,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          serials: l.serials,
        })),
      })),
      payments: payments.map((p: any) => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber,
        amount: Number(p.amount),
        method: p.method,
        gatewayTransactionId: p.gatewayTransactionId,
        receivedAt: p.receivedAt,
      })),
      walletTransactions: walletTransactions.map((tx: any) => ({
        id: tx.id,
        customerId: tx.customerId,
        amount: Number(tx.amount),
        type: tx.type,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        balanceAfter: Number(tx.balanceAfter),
        notes: tx.notes,
        createdById: tx.createdById,
        createdAt: tx.createdAt,
      })),
    };
  }

  async topupWallet(
    customerId: string,
    amount: number,
    notes?: string,
    userId?: string
  ): Promise<import("../application/customer-repository.port").CustomerWalletTransactionRecord> {
    if (amount <= 0) {
      throw new Error("Top up amount must be greater than zero.");
    }

    return this.prisma.$transaction(async (tx: any) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Customer not found.");

      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { walletBalance: { increment: amount } },
      });

      const txRecord = await tx.customerWalletTransaction.create({
        data: {
          customerId,
          amount,
          type: "WALLET_TOPUP",
          referenceType: "MANUAL_TOPUP",
          balanceAfter: updatedCustomer.walletBalance,
          notes: notes || "Manual wallet balance top-up",
          createdById: userId || null,
        },
      });

      return {
        id: txRecord.id,
        customerId: txRecord.customerId,
        amount: Number(txRecord.amount),
        type: txRecord.type,
        referenceType: txRecord.referenceType,
        referenceId: txRecord.referenceId,
        balanceAfter: Number(txRecord.balanceAfter),
        notes: txRecord.notes,
        createdById: txRecord.createdById,
        createdAt: txRecord.createdAt,
      };
    });
  }

  async payInvoiceFromWallet(
    customerId: string,
    invoiceId: string,
    amount: number,
    notes?: string,
    userId?: string
  ): Promise<{ payment: any; transaction: import("../application/customer-repository.port").CustomerWalletTransactionRecord }> {
    if (amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    return this.prisma.$transaction(async (tx: any) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error("Customer not found.");

      const walletBal = Number(customer.walletBalance);
      if (walletBal < amount) {
        throw new Error(`Insufficient wallet balance. Current: ৳${walletBal}, Requested: ৳${amount}`);
      }

      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true, advanceAdjustments: true, salesReturns: true },
      });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.customerId !== customerId) {
        throw new Error("This invoice does not belong to the selected customer.");
      }

      const grandTotal = Number(invoice.grandTotal);
      const paid = (invoice.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0) +
        (invoice.advanceAdjustments || []).reduce((s: number, a: any) => s + Number(a.amountAdjusted), 0);
      const returned = (invoice.salesReturns || []).reduce((s: number, r: any) => s + Number(r.totalAmount || r.refundAmount || 0), 0);
      const due = Math.max(0, Number((grandTotal - paid - returned).toFixed(2)));

      if (due <= 0) {
        throw new Error(`Invoice #${invoice.invoiceNumber} has no outstanding due amount.`);
      }

      if (amount > due) {
        throw new Error(`Payment amount (৳${amount}) exceeds remaining due (৳${due}).`);
      }

      // 1. Deduct wallet
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { walletBalance: { decrement: amount } },
      });

      // 2. Create customer wallet transaction (DEBIT)
      const walletTx = await tx.customerWalletTransaction.create({
        data: {
          customerId,
          amount: -amount,
          type: "INVOICE_PAYMENT",
          referenceType: "INVOICE",
          referenceId: invoice.id,
          balanceAfter: updatedCustomer.walletBalance,
          notes: notes || `Payment for Invoice #${invoice.invoiceNumber} from customer wallet`,
          createdById: userId || null,
        },
      });

      // 3. Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          method: "WALLET",
        },
      });

      return {
        payment: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: Number(payment.amount),
          method: payment.method,
          receivedAt: payment.receivedAt,
        },
        transaction: {
          id: walletTx.id,
          customerId: walletTx.customerId,
          amount: Number(walletTx.amount),
          type: walletTx.type,
          referenceType: walletTx.referenceType,
          referenceId: walletTx.referenceId,
          balanceAfter: Number(walletTx.balanceAfter),
          notes: walletTx.notes,
          createdById: walletTx.createdById,
          createdAt: walletTx.createdAt,
        },
      };
    });
  }
}

