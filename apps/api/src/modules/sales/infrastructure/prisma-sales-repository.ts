import type {
  SalesRepositoryPort,
  ListQuotationsFilter,
  ListSalesOrdersFilter,
  ListDeliveryChallansFilter,
  ListInvoicesFilter,
  Pagination,
} from "../application/sales-repository.port";
import type {
  QuotationEntity,
  SalesOrderEntity,
  DeliveryChallanEntity,
  SalesStatsEntity,
  InvoiceEntity,
  InvoiceLineItemEntity,
  QuotationStatus,
  CreateQuotationInput,
  CreateSalesOrderInput,
  CreateDeliveryChallanInput,
  CreateInvoiceFromChallansInput,
} from "../domain/sales.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrisma = any;

export interface SalesPrismaClient {
  quotation: AnyPrisma;
  quotationLine: AnyPrisma;
  salesOrder: AnyPrisma;
  salesOrderLine: AnyPrisma;
  deliveryChallan: AnyPrisma;
  deliveryChallanLine: AnyPrisma;
  deliveryChallanReturn?: AnyPrisma;
  deliveryChallanReturnLine?: AnyPrisma;
  creditNote?: AnyPrisma;
  customerAdvance?: AnyPrisma;
  advanceAdjustment?: AnyPrisma;
  bankTransactionProof?: AnyPrisma;
  damageLossReport?: AnyPrisma;
  project: AnyPrisma;
  projectItem: AnyPrisma;
  invoice: AnyPrisma;
  payment?: AnyPrisma;
  product: AnyPrisma;
  warehouse?: AnyPrisma;
  stockLedger?: AnyPrisma;
  serialNumber?: AnyPrisma;
  sKULifecycleEvent?: AnyPrisma;
  customer?: AnyPrisma;
  branch?: AnyPrisma;
  salesReturn?: AnyPrisma;
  salesReturnLine?: AnyPrisma;
  customerWalletTransaction?: AnyPrisma;
  $transaction?: <T>(fn: (tx: AnyPrisma) => Promise<T>) => Promise<T>;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  if (typeof val === "object" && val && "toNumber" in val && typeof (val as { toNumber: () => number }).toNumber === "function") {
    return (val as { toNumber: () => number }).toNumber();
  }
  return parseFloat(String(val)) || 0;
}

export class PrismaSalesRepository implements SalesRepositoryPort {
  constructor(private readonly prisma: SalesPrismaClient) {}

  private async withTx<T>(fn: (tx: AnyPrisma) => Promise<T>): Promise<T> {
    if (this.prisma && typeof this.prisma.$transaction === "function") {
      return this.prisma.$transaction(fn);
    }
    return fn(this.prisma);
  }

  async createQuotation(data: CreateQuotationInput): Promise<QuotationEntity> {
    const quotationNumber =
      data.quotationNumber ||
      `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const computedLines = data.lines.map((line: { productId?: string | null; description?: string; quantity: number; unitPrice: number }) => {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const total = Number((qty * price).toFixed(2));
      return {
        productId: line.productId || null,
        description: line.description || "",
        quantity: qty,
        unitPrice: price,
        lineTotal: total,
      };
    });

    const grandTotal = computedLines.reduce((acc: number, curr: { lineTotal: number }) => acc + curr.lineTotal, 0);

    const row = await this.prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        branchId: data.branchId,
        salesExecutiveId: data.salesExecutiveId || data.customerId,
        status: "DRAFT",
        validUntil: new Date(data.validUntil),
        grandTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        customer: true,
        branch: true,
        lines: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    return this.mapQuotation(row);
  }

  async getQuotationById(id: string): Promise<QuotationEntity | null> {
    const row = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        lines: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    return row ? this.mapQuotation(row) : null;
  }

  async listQuotations(
    filter?: ListQuotationsFilter,
    pagination?: Pagination
  ): Promise<{ items: QuotationEntity[]; total: number }> {
    const where: AnyPrisma = {};

    if (filter?.branchId) {
      where.branchId = filter.branchId;
    }
    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { quotationNumber: { contains: q, mode: "insensitive" } },
        { customer: { displayName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          branch: true,
          lines: {
            include: {
              product: true,
            },
          },
          salesOrder: true,
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapQuotation(r)),
      total,
    };
  }

  async updateQuotationStatus(
    id: string,
    status: QuotationStatus
  ): Promise<QuotationEntity> {
    const row = await this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        branch: true,
        lines: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    return this.mapQuotation(row);
  }

  async createSalesOrder(data: CreateSalesOrderInput): Promise<SalesOrderEntity> {
    const orderNumber =
      data.orderNumber ||
      `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const computedLines = data.lines.map((line: { productId?: string | null; description?: string; quantity: number; unitPrice: number }) => {
      const qty = Number(line.quantity);
      const price = Number(line.unitPrice);
      const total = Number((qty * price).toFixed(2));
      return {
        productId: line.productId || null,
        description: line.description || "",
        quantity: qty,
        unitPrice: price,
        lineTotal: total,
      };
    });

    const grandTotal = computedLines.reduce((acc: number, curr: { lineTotal: number }) => acc + curr.lineTotal, 0);

    const row = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        quotationId: data.quotationId || null,
        customerId: data.customerId,
        branchId: data.branchId,
        grandTotal,
        lines: {
          create: computedLines,
        },
      },
      include: {
        customer: true,
        branch: true,
        quotation: true,
        lines: {
          include: {
            product: true,
          },
        },
        challans: true,
      },
    });

    return this.mapSalesOrder(row);
  }

  async getSalesOrderById(id: string): Promise<SalesOrderEntity | null> {
    const row = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        quotation: true,
        lines: {
          include: {
            product: true,
          },
        },
        challans: true,
      },
    });

    return row ? this.mapSalesOrder(row) : null;
  }

  async listSalesOrders(
    filter?: ListSalesOrdersFilter,
    pagination?: Pagination
  ): Promise<{ items: SalesOrderEntity[]; total: number }> {
    const where: AnyPrisma = {};

    if (filter?.branchId) {
      where.branchId = filter.branchId;
    }
    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customer: { displayName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          branch: true,
          quotation: true,
          lines: {
            include: {
              product: true,
            },
          },
          challans: true,
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapSalesOrder(r)),
      total,
    };
  }

  async convertQuotationToSalesOrder(
    quotationId: string,
    orderNumber?: string
  ): Promise<SalesOrderEntity> {
    const quote = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lines: true },
    });

    if (!quote) {
      throw new Error(`Quotation not found: ${quotationId}`);
    }

    const generatedOrderNumber =
      orderNumber ||
      `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const linesData = quote.lines.map((l: AnyPrisma) => ({
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));

    // Update quotation status to CONVERTED and create SalesOrder
    const [createdOrder] = await Promise.all([
      this.prisma.salesOrder.create({
        data: {
          orderNumber: generatedOrderNumber,
          quotationId: quote.id,
          customerId: quote.customerId,
          branchId: quote.branchId,
          grandTotal: quote.grandTotal,
          lines: {
            create: linesData,
          },
        },
        include: {
          customer: true,
          branch: true,
          quotation: true,
          lines: {
            include: {
              product: true,
            },
          },
          challans: true,
        },
      }),
      this.prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "CONVERTED" },
      }),
    ]);

    return this.mapSalesOrder(createdOrder);
  }

  async createDeliveryChallan(
    data: CreateDeliveryChallanInput
  ): Promise<DeliveryChallanEntity> {
    const challanNumber =
      data.challanNumber ||
      `DC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Resolve or provision default catalog product if productId is omitted or invalid
    let defaultProduct = await this.prisma.product.findFirst({
      where: { isActive: true },
    });
    if (!defaultProduct) {
      defaultProduct = await this.prisma.product.upsert({
        where: { sku: "GEN-ITEM-001" },
        update: {},
        create: {
          sku: "GEN-ITEM-001",
          name: "Standard Commercial Equipment",
          costPrice: 0,
          sellingPrice: 0,
          isActive: true,
        },
      });
    }

    let salesOrderId = data.salesOrderId;
    if (!salesOrderId && data.projectId) {
      const prj = await this.prisma.project.findUnique({
        where: { id: data.projectId },
      });
      if (prj?.salesOrderId) {
        salesOrderId = prj.salesOrderId;
      }
    }

    if (!salesOrderId) {
      throw new Error("Unable to resolve Sales Order for Delivery Challan.");
    }

    const soLines = await this.prisma.salesOrderLine.findMany({
      where: { salesOrderId },
    });
    const soLineMap = new Map(soLines.map((l: AnyPrisma) => [l.id, l.productId]));

    const linesToCreate = await Promise.all(
      data.lines.map(async (line: { salesOrderLineId?: string; productId?: string; quantity: number }) => {
        let resolvedProductId = line.productId || (line.salesOrderLineId ? soLineMap.get(line.salesOrderLineId) : undefined);
        if (resolvedProductId) {
          const exists = await this.prisma.product.findUnique({
            where: { id: resolvedProductId },
          });
          if (!exists) {
            resolvedProductId = defaultProduct!.id;
          }
        } else {
          resolvedProductId = defaultProduct!.id;
        }

        let resolvedSoLineId = line.salesOrderLineId;
        if (!resolvedSoLineId) {
          const existingSoLine = await this.prisma.salesOrderLine.findFirst({
            where: { salesOrderId, productId: resolvedProductId },
          });
          if (existingSoLine) {
            resolvedSoLineId = existingSoLine.id;
          } else {
            const newSoLine = await this.prisma.salesOrderLine.create({
              data: {
                salesOrderId,
                productId: resolvedProductId,
                description: `Project Delivery Item: ${resolvedProductId}`,
                quantity: Number(line.quantity),
                unitPrice: 0,
                lineTotal: 0,
              },
            });
            resolvedSoLineId = newSoLine.id;
          }
        }

        return {
          salesOrderLineId: resolvedSoLineId!,
          productId: resolvedProductId,
          quantity: Number(line.quantity),
        };
      })
    );

    const runner = async (tx: AnyPrisma) => {
      const row = await tx.deliveryChallan.create({
        data: {
          challanNumber,
          salesOrderId,
          projectId: data.projectId || null,
          lines: {
            create: linesToCreate,
          },
        },
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
          project: true,
          invoice: true,
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      // Deduct dispatched quantities from StockLedger for the operating warehouse
      try {
        const salesOrder = await tx.salesOrder.findUnique({
          where: { id: salesOrderId },
        });
        const warehouse =
          (await tx.warehouse?.findFirst({
            where: salesOrder?.branchId ? { branchId: salesOrder.branchId, isActive: true } : { isActive: true },
          })) || (await tx.warehouse?.findFirst({ where: { isActive: true } }));

        if (warehouse && tx.stockLedger) {
          for (const line of linesToCreate) {
            if (line.productId) {
              const qtyToDeduct = Number(line.quantity) || 0;
              const prod = tx.product ? await tx.product.findUnique({ where: { id: line.productId } }) : null;
              const isSerialized = prod?.trackingType === "SERIALIZED";

              if (isSerialized && tx.serialNumber) {
                const lineSerials = (line as any).serialNumberIds || (line as any).serials || [];
                if (lineSerials.length > 0) {
                  const units = await tx.serialNumber.findMany({
                    where: {
                      OR: [
                        { id: { in: lineSerials } },
                        { serial: { in: lineSerials } },
                        { barcode: { in: lineSerials } },
                      ],
                      productId: line.productId,
                    },
                  });
                  for (const unit of units) {
                    await tx.serialNumber.update({
                      where: { id: unit.id },
                      data: { currentStage: "SOLD", warehouseId: null },
                    });
                    if (tx.sKULifecycleEvent) {
                      await tx.sKULifecycleEvent.create({
                        data: {
                          serialNumberId: unit.id,
                          eventType: "SOLD",
                          sourceModule: "DELIVERY_CHALLAN",
                          sourceId: row.id,
                          fromWarehouseId: warehouse.id,
                          fromStage: "IN_STOCK",
                          toStage: "SOLD",
                          notes: `Dispatched via delivery challan ${row.challanNumber}`,
                        },
                      }).catch(() => {});
                    }
                  }
                } else if (qtyToDeduct > 0) {
                  const availableUnits = await tx.serialNumber.findMany({
                    where: {
                      productId: line.productId,
                      warehouseId: warehouse.id,
                      currentStage: "IN_STOCK",
                    },
                    take: qtyToDeduct,
                  });
                  for (const unit of availableUnits) {
                    await tx.serialNumber.update({
                      where: { id: unit.id },
                      data: { currentStage: "SOLD", warehouseId: null },
                    });
                    if (tx.sKULifecycleEvent) {
                      await tx.sKULifecycleEvent.create({
                        data: {
                          serialNumberId: unit.id,
                          eventType: "SOLD",
                          sourceModule: "DELIVERY_CHALLAN",
                          sourceId: row.id,
                          fromWarehouseId: warehouse.id,
                          fromStage: "IN_STOCK",
                          toStage: "SOLD",
                          notes: `Dispatched via delivery challan ${row.challanNumber}`,
                        },
                      }).catch(() => {});
                    }
                  }
                }
              }

              const stockRow = await tx.stockLedger.findUnique({
                where: {
                  productId_warehouseId: {
                    productId: line.productId,
                    warehouseId: warehouse.id,
                  },
                },
              });
              if (stockRow) {
                const currentStock = Number(stockRow.quantityOnHand) || 0;
                const newStock = Math.max(0, currentStock - qtyToDeduct);
                await tx.stockLedger.update({
                  where: { id: stockRow.id },
                  data: { quantityOnHand: newStock },
                });
              } else {
                await tx.stockLedger.create({
                  data: {
                    productId: line.productId,
                    warehouseId: warehouse.id,
                    quantityOnHand: 0,
                  },
                });
              }
            }
          }
        }
      } catch (stockErr) {
        console.error("[Sales] Stock deduction notice:", stockErr);
      }

      return row;
    };

    const row = this.prisma.$transaction
      ? await this.prisma.$transaction(runner)
      : await runner(this.prisma);

    return this.mapDeliveryChallan(row);
  }

  async getDeliveryChallanById(id: string): Promise<DeliveryChallanEntity | null> {
    const row = await this.prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        invoice: true,
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    return row ? this.mapDeliveryChallan(row) : null;
  }

  async listDeliveryChallans(
    filter?: ListDeliveryChallansFilter,
    pagination?: Pagination
  ): Promise<{ items: DeliveryChallanEntity[]; total: number }> {
    const where: AnyPrisma = {};

    if (filter?.salesOrderId) {
      where.salesOrderId = filter.salesOrderId;
    }
    if (filter?.projectId) {
      where.projectId = filter.projectId;
    }
    if (filter?.branchId) {
      where.salesOrder = { branchId: filter.branchId };
    }
    if (filter?.billingStatus) {
      where.billingStatus = filter.billingStatus;
    }
    if (filter?.invoiceId) {
      where.invoiceId = filter.invoiceId;
    }
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { challanNumber: { contains: q, mode: "insensitive" } },
        { salesOrder: { orderNumber: { contains: q, mode: "insensitive" } } },
        { project: { name: { contains: q, mode: "insensitive" } } },
        { project: { projectCode: { contains: q, mode: "insensitive" } } },
      ];
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.deliveryChallan.findMany({
        where,
        skip,
        take,
        orderBy: { dispatchedAt: "desc" },
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
          project: true,
          invoice: true,
          lines: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.prisma.deliveryChallan.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapDeliveryChallan(r)),
      total,
    };
  }

  async createInvoiceFromChallans(data: CreateInvoiceFromChallansInput): Promise<InvoiceEntity> {
    let salesOrderId = data.salesOrderId;
    let customerId = "";
    let branchId = "";
    let project: AnyPrisma = null;

    if (data.projectId) {
      project = await this.prisma.project.findUnique({
        where: { id: data.projectId },
        include: { customer: true, branch: true, items: true },
      });
      if (project) {
        salesOrderId = salesOrderId || project.salesOrderId;
        customerId = project.customerId;
        branchId = project.branchId;
      }
    }

    const salesOrder = salesOrderId
      ? await this.prisma.salesOrder.findUnique({
          where: { id: salesOrderId },
          include: {
            customer: true,
            branch: true,
            lines: {
              include: {
                product: true,
              },
            },
          },
        })
      : null;

    if (!salesOrder && !project) {
      throw new Error(`Neither Sales Order nor Project found.`);
    }

    customerId = customerId || salesOrder!.customerId;
    branchId = branchId || salesOrder!.branchId;

    // Fetch the requested delivery challans
    const challanFilter: AnyPrisma = {
      id: { in: data.challanIds },
    };
    if (data.projectId) {
      challanFilter.projectId = data.projectId;
    } else if (salesOrderId) {
      challanFilter.salesOrderId = salesOrderId;
    }

    const challans = await this.prisma.deliveryChallan.findMany({
      where: challanFilter,
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        project: true,
        lines: {
          include: {
            product: true,
          },
        },
        invoice: true,
      },
    });

    if (challans.length === 0) {
      throw new Error("No matching Delivery Challans found for this billing request.");
    }

    if (challans.length !== data.challanIds.length) {
      throw new Error("Some requested Delivery Challans do not exist or belong to another order/project.");
    }

    // Check if any challan is already billed
    const alreadyBilled = challans.find(
      (c: AnyPrisma) => c.billingStatus === "BILLED" || c.invoiceId !== null
    );
    if (alreadyBilled) {
      throw new Error(
        `Challan "${alreadyBilled.challanNumber}" is already billed (Invoice: ${alreadyBilled.invoice?.invoiceNumber || alreadyBilled.invoiceId}).`
      );
    }

    // Map each sales order line for fast lookup of unitPrice and description
    const orderLineMap = new Map<string, { unitPrice: number; description: string; productId: string | null }>();
    if (salesOrder?.lines) {
      for (const sol of salesOrder.lines) {
        orderLineMap.set(sol.id, {
          unitPrice: toNumber(sol.unitPrice),
          description: sol.description,
          productId: sol.productId,
        });
      }
    }

    // Also map prices from Project items if available
    const projectItemPriceMap = new Map<string, number>();
    if (project?.items) {
      for (const pi of project.items) {
        projectItemPriceMap.set(pi.productId, toNumber(pi.unitPrice));
      }
    }

    // Aggregate line items from all selected challans
    const lineAggMap = new Map<string, InvoiceLineItemEntity>();

    for (const ch of challans) {
      for (const line of ch.lines) {
        const orderLine = orderLineMap.get(line.salesOrderLineId);
        let unitPrice = orderLine ? orderLine.unitPrice : 0;
        if (unitPrice === 0 && line.productId && projectItemPriceMap.has(line.productId)) {
          unitPrice = projectItemPriceMap.get(line.productId)!;
        }

        const key = line.productId || line.salesOrderLineId;
        const qty = toNumber(line.quantity);

        if (lineAggMap.has(key)) {
          const existing = lineAggMap.get(key)!;
          existing.quantity += qty;
          existing.lineTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
        } else {
          lineAggMap.set(key, {
            productId: line.productId || null,
            productName: line.product?.name || orderLine?.description || "Product",
            sku: line.product?.sku || "SKU-N/A",
            quantity: qty,
            unitPrice,
            lineTotal: Number((qty * unitPrice).toFixed(2)),
          });
        }
      }
    }

    const aggregatedLines: InvoiceLineItemEntity[] = Array.from(lineAggMap.values());
    const grandTotal = Number(
      aggregatedLines.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );

    const invoiceNumber =
      data.invoiceNumber ||
      `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const idempotencyKey = `INV-CHALLAN-${data.projectId || salesOrderId || "GEN"}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create Invoice
    const invoiceRow = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        sourceType: data.projectId ? "PROJECT" : "SALES_ORDER",
        sourceId: data.projectId ? data.projectId : salesOrderId!,
        customerId,
        branchId,
        grandTotal,
        status: "POSTED",
        idempotencyKey,
      },
    });

    // Mark delivery challans as BILLED and link invoiceId
    await this.prisma.deliveryChallan.updateMany({
      where: {
        id: { in: data.challanIds },
      },
      data: {
        invoiceId: invoiceRow.id,
        billingStatus: "BILLED",
      },
    });

    // Fetch the complete invoice with relations
    const finalInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceRow.id },
      include: {
        customer: true,
        branch: true,
        challans: {
          include: {
            salesOrder: true,
            lines: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    return this.mapInvoice(finalInvoice, aggregatedLines);
  }

  async getInvoiceById(id: string): Promise<InvoiceEntity | null> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        challans: {
          include: {
            salesOrder: true,
            lines: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!row) return null;

    let lines: InvoiceLineItemEntity[] = [];
    if (row.sourceType === "SALES_ORDER" && row.sourceId) {
      const salesOrder = await this.prisma.salesOrder.findUnique({
        where: { id: row.sourceId },
        include: { lines: { include: { product: true } } },
      });
      if (salesOrder) {
        const orderLineMap = new Map<string, { unitPrice: number; description: string; productId: string | null }>();
        for (const sol of salesOrder.lines) {
          orderLineMap.set(sol.id, {
            unitPrice: toNumber(sol.unitPrice),
            description: sol.description,
            productId: sol.productId,
          });
        }

        const lineAggMap = new Map<string, InvoiceLineItemEntity>();
        for (const ch of row.challans || []) {
          for (const line of ch.lines || []) {
            const orderLine = orderLineMap.get(line.salesOrderLineId);
            const unitPrice = orderLine ? orderLine.unitPrice : 0;
            const key = line.productId || line.salesOrderLineId;
            const qty = toNumber(line.quantity);

            if (lineAggMap.has(key)) {
              const existing = lineAggMap.get(key)!;
              existing.quantity += qty;
              existing.lineTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
            } else {
              lineAggMap.set(key, {
                productId: line.productId || null,
                productName: line.product?.name || orderLine?.description || "Product",
                sku: line.product?.sku || "SKU-N/A",
                quantity: qty,
                unitPrice,
                lineTotal: Number((qty * unitPrice).toFixed(2)),
              });
            }
          }
        }
        lines = Array.from(lineAggMap.values());
      }
    } else if (row.sourceType === "PROJECT" && row.sourceId) {
      const project = await this.prisma.project.findUnique({
        where: { id: row.sourceId },
        include: { items: { include: { product: true } } },
      });
      const prjItemMap = new Map<string, { unitPrice: number; name: string; sku: string }>();
      if (project?.items) {
        for (const it of project.items) {
          prjItemMap.set(it.productId, {
            unitPrice: toNumber(it.unitPrice),
            name: it.product?.name || "Product",
            sku: it.product?.sku || "SKU-N/A",
          });
        }
      }

      const lineAggMap = new Map<string, InvoiceLineItemEntity>();
      for (const ch of row.challans || []) {
        for (const line of ch.lines || []) {
          const itemInfo = prjItemMap.get(line.productId);
          const unitPrice = itemInfo ? itemInfo.unitPrice : 0;
          const key = line.productId || line.id;
          const qty = toNumber(line.quantity);

          if (lineAggMap.has(key)) {
            const existing = lineAggMap.get(key)!;
            existing.quantity += qty;
            existing.lineTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
          } else {
            lineAggMap.set(key, {
              productId: line.productId || null,
              productName: line.product?.name || itemInfo?.name || "Project Item",
              sku: line.product?.sku || itemInfo?.sku || "SKU-N/A",
              quantity: qty,
              unitPrice,
              lineTotal: Number((qty * unitPrice).toFixed(2)),
            });
          }
        }
      }
      lines = Array.from(lineAggMap.values());
    } else if (row.sourceType === "DIRECT_SALE" && row.sourceId) {
      const salesOrder = await this.prisma.salesOrder.findUnique({
        where: { id: row.sourceId },
        include: { lines: { include: { product: true } } },
      });
      if (salesOrder?.lines) {
        lines = salesOrder.lines.map((l: AnyPrisma) => ({
          productId: l.productId,
          productName: l.product?.name || l.description,
          sku: l.product?.sku || "SKU-N/A",
          quantity: toNumber(l.quantity),
          unitPrice: toNumber(l.unitPrice),
          lineTotal: toNumber(l.lineTotal),
        }));
      }
    }

    return this.mapInvoice(row, lines);
  }

  async listInvoices(
    filter?: ListInvoicesFilter,
    pagination?: Pagination
  ): Promise<{ items: InvoiceEntity[]; total: number }> {
    const where: AnyPrisma = {};

    if (filter?.branchId) {
      where.branchId = filter.branchId;
    }
    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }
    if (filter?.salesOrderId) {
      where.sourceType = "SALES_ORDER";
      where.sourceId = filter.salesOrderId;
    }
    if (filter?.projectId) {
      where.sourceType = "PROJECT";
      where.sourceId = filter.projectId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { customer: { displayName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          branch: true,
          challans: {
            include: {
              lines: {
                include: {
                  product: true,
                },
              },
            },
          },
          payments: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapInvoice(r)),
      total,
    };
  }

  // ==========================================
  // Project Sales & Challan Delivery
  // ==========================================

  async createProject(data: import("../domain/sales.types").CreateProjectInput): Promise<import("../domain/sales.types").ProjectEntity> {
    const seq = await this.prisma.project.count();
    const year = new Date().getFullYear();
    const projectCode = `PRJ-${year}-${String(seq + 1001).padStart(4, "0")}`;

    // 1. Calculate line totals and budget
    let totalBudget = 0;
    const projectItemsData = data.items.map((item) => {
      const lineTotal = Number(item.plannedQty) * Number(item.unitPrice);
      totalBudget += lineTotal;
      return {
        productId: item.productId,
        description: item.description || null,
        plannedQty: Number(item.plannedQty),
        unitPrice: Number(item.unitPrice),
        totalAmount: lineTotal,
      };
    });

    if (data.budgetAmount && data.budgetAmount > 0) {
      totalBudget = data.budgetAmount;
    }

    // 2. Create underlying SalesOrder so standard fulfillment, challans and inventory connect seamlessly
    const orderSeq = await this.prisma.salesOrder.count();
    const orderNumber = `SO-PRJ-${year}-${String(orderSeq + 1001).padStart(4, "0")}`;

    const createdOrder = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        branchId: data.branchId,
        orderType: "PROJECT",
        grandTotal: totalBudget,
        lines: {
          create: data.items.map((it) => ({
            productId: it.productId,
            description: it.description || `Project Supply: ${projectCode}`,
            quantity: Number(it.plannedQty),
            unitPrice: Number(it.unitPrice),
            lineTotal: Number(it.plannedQty) * Number(it.unitPrice),
          })),
        },
      },
    });

    // 3. Create Project record
    const createdProject = await this.prisma.project.create({
      data: {
        projectCode,
        name: data.name,
        description: data.description || null,
        customerId: data.customerId,
        branchId: data.branchId,
        status: "ACTIVE",
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        siteLocation: data.siteLocation || null,
        budgetAmount: totalBudget,
        salesOrderId: createdOrder.id,
        items: {
          create: projectItemsData,
        },
      },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
        challans: true,
      },
    });

    return this.mapProject(createdProject);
  }

  async getProjectById(id: string): Promise<import("../domain/sales.types").ProjectEntity | null> {
    const row = await this.prisma.project.findFirst({
      where: {
        OR: [{ id }, { projectCode: id }],
      },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
        challans: {
          include: {
            lines: {
              include: {
                product: true,
              },
            },
            invoice: true,
          },
          orderBy: { dispatchedAt: "desc" },
        },
      },
    });

    return row ? this.mapProject(row) : null;
  }

  async listProjects(
    filter?: { branchId?: string; customerId?: string; status?: string; search?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").ProjectEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.status && filter.status !== "ALL") where.status = filter.status;
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { projectCode: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { siteLocation: { contains: q, mode: "insensitive" } },
        { customer: { displayName: { contains: q, mode: "insensitive" } } },
      ];
    }

    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          branch: true,
          items: {
            include: {
              product: true,
            },
          },
          challans: {
            include: {
              lines: {
                include: {
                  product: true,
                },
              },
              invoice: true,
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapProject(r)),
      total,
    };
  }

  async updateProjectStatus(id: string, status: string): Promise<import("../domain/sales.types").ProjectEntity> {
    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: status as AnyPrisma },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
        challans: {
          include: {
            lines: {
              include: {
                product: true,
              },
            },
            invoice: true,
          },
        },
      },
    });
    return this.mapProject(updated);
  }

  private readonly projectInclude = {
    customer: true,
    branch: true,
    items: {
      include: { product: true },
    },
    challans: {
      include: {
        lines: { include: { product: true } },
        invoice: true,
      },
    },
  } as const;

  async addProjectItem(
    projectId: string,
    item: { productId: string; plannedQty: number; unitPrice: number; description?: string }
  ): Promise<import("../domain/sales.types").ProjectEntity> {
    const lineTotal = Number(item.plannedQty) * Number(item.unitPrice);

    // 1. Create the new ProjectItem row
    await this.prisma.projectItem.create({
      data: {
        projectId,
        productId: item.productId,
        description: item.description || null,
        plannedQty: Number(item.plannedQty),
        unitPrice: Number(item.unitPrice),
        totalAmount: lineTotal,
      },
    });

    // 2. Recalculate budgetAmount from all items
    const allItems = await this.prisma.projectItem.findMany({ where: { projectId } });
    const newBudget = allItems.reduce((s: number, i: AnyPrisma) => s + toNumber(i.totalAmount), 0);
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { budgetAmount: newBudget },
      include: this.projectInclude,
    });

    return this.mapProject(updated);
  }

  async removeProjectItem(projectId: string, itemId: string): Promise<import("../domain/sales.types").ProjectEntity> {
    // 1. Verify item belongs to this project
    const item = await this.prisma.projectItem.findFirst({ where: { id: itemId, projectId } });
    if (!item) throw new Error(`Project item ${itemId} not found in project ${projectId}.`);

    // 2. Delete the item
    await this.prisma.projectItem.delete({ where: { id: itemId } });

    // 3. Recalculate budgetAmount
    const allItems = await this.prisma.projectItem.findMany({ where: { projectId } });
    const newBudget = allItems.reduce((s: number, i: AnyPrisma) => s + toNumber(i.totalAmount), 0);
    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { budgetAmount: newBudget },
      include: this.projectInclude,
    });

    return this.mapProject(updated);
  }

  // ==========================================
  // Direct Sale (Instant Invoicing)
  // ==========================================

  async createDirectSale(data: import("../domain/sales.types").DirectSaleInput): Promise<import("../domain/sales.types").DirectSaleResultEntity> {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `DIR-SO-${year}-${rand}`;
    const invoiceNumber = `INV-${year}-${rand}`;

    // 1. Calculate grandTotal
    let grandTotal = 0;
    for (const l of data.lines) {
      grandTotal += Number(l.quantity) * Number(l.unitPrice);
    }
    grandTotal = Number(grandTotal.toFixed(2));

    const runner = async (tx: AnyPrisma) => {
      // 2. Create SalesOrder (orderType: "DIRECT_SALE")
      const order = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          branchId: data.branchId,
          orderType: "DIRECT_SALE",
          grandTotal,
          lines: {
            create: data.lines.map((l: AnyPrisma) => ({
              productId: l.productId,
              description: l.description || "Direct Retail / Spot Sale",
              quantity: Number(l.quantity),
              unitPrice: Number(l.unitPrice),
              lineTotal: Number(l.quantity) * Number(l.unitPrice),
            })),
          },
        },
        include: {
          customer: true,
          branch: true,
          lines: {
            include: {
              product: true,
            },
          },
        },
      });

      // 3. Create Direct Invoice
      const idempotencyKey = `direct-inv-${order.id}-${Date.now()}`;
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          sourceType: "DIRECT_SALE",
          sourceId: order.id,
          customerId: data.customerId,
          branchId: data.branchId,
          grandTotal,
          status: "POSTED",
          idempotencyKey,
        },
        include: {
          customer: true,
          branch: true,
          payments: true,
        },
      });

      // 4. Record payment if paid
      let createdPayment = null;
      const paidAmount = data.isPaid ? (data.paidAmount ?? grandTotal) : 0;
      if (paidAmount > 0 && tx.payment) {
        createdPayment = await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: paidAmount,
            method: data.paymentMethod || "CASH",
          },
        });
      }

      // 5. Deduct inventory from StockLedger for warehouse
      try {
        const warehouse =
          (data.warehouseId ? await tx.warehouse?.findUnique({ where: { id: data.warehouseId } }) : null) ||
          (await tx.warehouse?.findFirst({
            where: { branchId: data.branchId, isActive: true },
          })) ||
          (await tx.warehouse?.findFirst({ where: { isActive: true } }));

        if (warehouse && tx.stockLedger) {
          for (const line of data.lines) {
            if (!line.productId) continue;
            const qtyToDeduct = Number(line.quantity) || 0;
            const prod = tx.product ? await tx.product.findUnique({ where: { id: line.productId } }) : null;
            const isSerialized = prod?.trackingType === "SERIALIZED";

            if (isSerialized && tx.serialNumber) {
              const lineSerials = (line as any).serialNumberIds || (line as any).serials || [];
              if (lineSerials.length > 0) {
                const units = await tx.serialNumber.findMany({
                  where: {
                    OR: [
                      { id: { in: lineSerials } },
                      { serial: { in: lineSerials } },
                      { barcode: { in: lineSerials } },
                    ],
                    productId: line.productId,
                  },
                });
                for (const unit of units) {
                  await tx.serialNumber.update({
                    where: { id: unit.id },
                    data: { currentStage: "SOLD", warehouseId: null },
                  });
                  if (tx.sKULifecycleEvent) {
                    await tx.sKULifecycleEvent.create({
                      data: {
                        serialNumberId: unit.id,
                        eventType: "SOLD",
                        sourceModule: "DIRECT_SALE",
                        sourceId: invoice.id,
                        fromWarehouseId: warehouse.id,
                        fromStage: "IN_STOCK",
                        toStage: "SOLD",
                        notes: `Sold via direct sale ${invoiceNumber} / ${orderNumber}`,
                        performedById: (data as AnyPrisma).salesExecutiveId || null,
                      },
                    }).catch(() => {});
                  }
                }
              } else if (qtyToDeduct > 0) {
                const availableUnits = await tx.serialNumber.findMany({
                  where: {
                    productId: line.productId,
                    warehouseId: warehouse.id,
                    currentStage: "IN_STOCK",
                  },
                  take: qtyToDeduct,
                });
                for (const unit of availableUnits) {
                  await tx.serialNumber.update({
                    where: { id: unit.id },
                    data: { currentStage: "SOLD", warehouseId: null },
                  });
                  if (tx.sKULifecycleEvent) {
                    await tx.sKULifecycleEvent.create({
                      data: {
                        serialNumberId: unit.id,
                        eventType: "SOLD",
                        sourceModule: "DIRECT_SALE",
                        sourceId: invoice.id,
                        fromWarehouseId: warehouse.id,
                        fromStage: "IN_STOCK",
                        toStage: "SOLD",
                        notes: `Sold via direct sale ${invoiceNumber} / ${orderNumber}`,
                        performedById: (data as AnyPrisma).salesExecutiveId || null,
                      },
                    }).catch(() => {});
                  }
                }
              }
            }

            const stockRow = await tx.stockLedger.findUnique({
              where: {
                productId_warehouseId: {
                  productId: line.productId,
                  warehouseId: warehouse.id,
                },
              },
            });
            if (stockRow) {
              const currentStock = Number(stockRow.quantityOnHand) || 0;
              const newStock = Math.max(0, currentStock - qtyToDeduct);
              await tx.stockLedger.update({
                where: { id: stockRow.id },
                data: { quantityOnHand: newStock },
              });
            } else {
              await tx.stockLedger.create({
                data: {
                  productId: line.productId,
                  warehouseId: warehouse.id,
                  quantityOnHand: 0,
                },
              });
            }
          }
        }
      } catch (stockErr) {
        console.error("[DirectSale] Stock deduction note:", stockErr);
      }

      return { order, invoice, createdPayment };
    };

    const { order, invoice, createdPayment } = this.prisma.$transaction
      ? await this.prisma.$transaction(runner)
      : await runner(this.prisma);

    const explicitInvoiceLines: InvoiceLineItemEntity[] = data.lines.map((l) => ({
      productId: l.productId,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number((Number(l.quantity) * Number(l.unitPrice)).toFixed(2)),
    }));

    return {
      invoice: this.mapInvoice(invoice, explicitInvoiceLines),
      order: this.mapSalesOrder(order),
      payment: createdPayment ? {
        id: createdPayment.id,
        amount: toNumber(createdPayment.amount),
        method: createdPayment.method,
        receivedAt: createdPayment.receivedAt,
      } : null,
    };
  }

  async getSalesStats(branchId?: string): Promise<SalesStatsEntity> {
    const orderWhere: AnyPrisma = branchId ? { branchId } : {};
    const quoteWhere: AnyPrisma = branchId ? { branchId } : {};
    const challanWhere: AnyPrisma = branchId ? { salesOrder: { branchId } } : {};

    const [
      orders,
      totalOrders,
      totalQuotations,
      pendingQuotations,
      acceptedQuotations,
      dispatchedChallans,
      totalInvoices,
      unbilledChallans,
      totalProjects,
      activeProjects,
    ] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: orderWhere,
        select: { grandTotal: true },
      }),
      this.prisma.salesOrder.count({ where: orderWhere }),
      this.prisma.quotation.count({ where: quoteWhere }),
      this.prisma.quotation.count({
        where: {
          ...quoteWhere,
          status: { in: ["DRAFT", "SENT"] },
        },
      }),
      this.prisma.quotation.count({
        where: {
          ...quoteWhere,
          status: { in: ["ACCEPTED", "CONVERTED"] },
        },
      }),
      this.prisma.deliveryChallan.count({ where: challanWhere }),
      this.prisma.invoice.count({ where: branchId ? { branchId } : {} }),
      this.prisma.deliveryChallan.count({
        where: {
          ...challanWhere,
          billingStatus: "UNBILLED",
        },
      }),
      this.prisma.project.count({ where: branchId ? { branchId } : {} }),
      this.prisma.project.count({ where: branchId ? { branchId, status: "ACTIVE" } : { status: "ACTIVE" } }),
    ]);

    const totalRevenue = orders.reduce(
      (sum: number, o: { grandTotal: unknown }) => sum + toNumber(o.grandTotal),
      0
    );

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      totalQuotations,
      pendingQuotations,
      acceptedQuotations,
      dispatchedChallans,
      totalInvoices,
      unbilledChallans,
      totalProjects,
      activeProjects,
    };
  }

  private mapQuotation(row: AnyPrisma): QuotationEntity {
    return {
      id: row.id,
      quotationNumber: row.quotationNumber,
      customerId: row.customerId,
      branchId: row.branchId,
      salesExecutiveId: row.salesExecutiveId,
      status: row.status,
      validUntil: row.validUntil,
      grandTotal: toNumber(row.grandTotal),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            displayName: row.customer.displayName,
            phone: row.customer.phone,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : undefined,
      lines: (row.lines || []).map((l: AnyPrisma) => ({
        id: l.id,
        quotationId: l.quotationId,
        productId: l.productId,
        description: l.description,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        lineTotal: toNumber(l.lineTotal),
        product: l.product
          ? {
              id: l.product.id,
              sku: l.product.sku,
              name: l.product.name,
            }
          : null,
      })),
      salesOrder: row.salesOrder
        ? {
            id: row.salesOrder.id,
            orderNumber: row.salesOrder.orderNumber,
          }
        : null,
    };
  }

  private mapSalesOrder(row: AnyPrisma): SalesOrderEntity {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      quotationId: row.quotationId,
      customerId: row.customerId,
      branchId: row.branchId,
      grandTotal: toNumber(row.grandTotal),
      createdAt: row.createdAt,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            displayName: row.customer.displayName,
            phone: row.customer.phone,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : undefined,
      quotation: row.quotation
        ? {
            id: row.quotation.id,
            quotationNumber: row.quotation.quotationNumber,
          }
        : null,
      lines: (row.lines || []).map((l: AnyPrisma) => ({
        id: l.id,
        salesOrderId: l.salesOrderId,
        productId: l.productId,
        description: l.description,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        lineTotal: toNumber(l.lineTotal),
        product: l.product
          ? {
              id: l.product.id,
              sku: l.product.sku,
              name: l.product.name,
            }
          : null,
      })),
      challans: (row.challans || []).map((c: AnyPrisma) => ({
        id: c.id,
        challanNumber: c.challanNumber,
        billingStatus: c.billingStatus || "UNBILLED",
        invoiceId: c.invoiceId || null,
        dispatchedAt: c.dispatchedAt,
      })),
    };
  }

  private mapDeliveryChallan(row: AnyPrisma): DeliveryChallanEntity {
    return {
      id: row.id,
      challanNumber: row.challanNumber,
      salesOrderId: row.salesOrderId,
      projectId: row.projectId || null,
      invoiceId: row.invoiceId || null,
      billingStatus: row.billingStatus || "UNBILLED",
      dispatchedAt: row.dispatchedAt,
      salesOrder: row.salesOrder
        ? {
            id: row.salesOrder.id,
            orderNumber: row.salesOrder.orderNumber,
            grandTotal: toNumber(row.salesOrder.grandTotal),
            customer: row.salesOrder.customer
              ? {
                  displayName: row.salesOrder.customer.displayName,
                }
              : undefined,
          }
        : undefined,
      project: row.project
        ? {
            id: row.project.id,
            projectCode: row.project.projectCode,
            name: row.project.name,
          }
        : null,
      invoice: row.invoice
        ? {
            id: row.invoice.id,
            invoiceNumber: row.invoice.invoiceNumber,
            grandTotal: toNumber(row.invoice.grandTotal),
            status: row.invoice.status,
          }
        : null,
      lines: (row.lines || []).map((l: AnyPrisma) => ({
        id: l.id,
        challanId: l.challanId,
        salesOrderLineId: l.salesOrderLineId,
        productId: l.productId,
        quantity: toNumber(l.quantity),
        product: l.product
          ? {
              id: l.product.id,
              sku: l.product.sku,
              name: l.product.name,
            }
          : undefined,
      })),
    };
  }

  private mapProject(row: AnyPrisma): import("../domain/sales.types").ProjectEntity {
    const items = (row.items || []).map((it: AnyPrisma) => this.mapProjectItem(it));
    const challans = (row.challans || []).map((c: AnyPrisma) => this.mapDeliveryChallan(c));

    // Calculate real-time stats
    const totalBudget = toNumber(row.budgetAmount) || items.reduce((s: number, i: import("../domain/sales.types").ProjectItemEntity) => s + i.totalAmount, 0);

    let totalDispatchedAmount = 0;
    const dispatchedQtyMap = new Map<string, number>();
    for (const c of challans) {
      for (const line of c.lines) {
        const cur = dispatchedQtyMap.get(line.productId) || 0;
        dispatchedQtyMap.set(line.productId, cur + line.quantity);
      }
    }

    for (const it of items) {
      const delivered = dispatchedQtyMap.get(it.productId) || 0;
      it.dispatchedQty = delivered;
      totalDispatchedAmount += delivered * it.unitPrice;
    }

    let unbilledChallans = 0;
    let billedChallans = 0;
    for (const c of challans) {
      if (c.billingStatus === "BILLED" || c.invoiceId) {
        billedChallans++;
      } else {
        unbilledChallans++;
      }
    }

    const totalInvoicedAmount = challans
      .filter((c: DeliveryChallanEntity) => c.invoice?.grandTotal)
      .reduce((sum: number, c: DeliveryChallanEntity) => sum + (c.invoice?.grandTotal || 0), 0);

    const fulfillmentProgress = totalBudget > 0 ? Math.min(100, Math.round((totalDispatchedAmount / totalBudget) * 100)) : 0;

    return {
      id: row.id,
      projectCode: row.projectCode,
      name: row.name,
      description: row.description,
      customerId: row.customerId,
      branchId: row.branchId,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      siteLocation: row.siteLocation,
      budgetAmount: totalBudget,
      totalDispatchedAmount,
      totalInvoicedAmount,
      unbilledChallanCount: unbilledChallans,
      fulfillmentProgress,
      salesOrderId: row.salesOrderId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer ? {
        id: row.customer.id,
        customerCode: row.customer.customerCode,
        displayName: row.customer.displayName,
        phone: row.customer.phone,
      } : undefined,
      branch: row.branch ? {
        id: row.branch.id,
        code: row.branch.code,
        name: row.branch.name,
      } : undefined,
      items,
      challans,
      stats: {
        totalBudget,
        totalDispatchedAmount,
        totalInvoicedAmount,
        totalChallans: challans.length,
        unbilledChallans,
        billedChallans,
        fulfillmentProgress,
      },
    };
  }

  private mapProjectItem(row: AnyPrisma): import("../domain/sales.types").ProjectItemEntity {
    return {
      id: row.id,
      projectId: row.projectId,
      productId: row.productId,
      description: row.description,
      plannedQty: toNumber(row.plannedQty),
      unitPrice: toNumber(row.unitPrice),
      totalAmount: toNumber(row.totalAmount),
      product: row.product ? {
        id: row.product.id,
        sku: row.product.sku,
        name: row.product.name,
        unitName: row.product.unit?.name || null,
      } : undefined,
    };
  }

  private mapInvoice(row: AnyPrisma, explicitLines?: InvoiceLineItemEntity[]): InvoiceEntity {
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      customerId: row.customerId,
      branchId: row.branchId,
      grandTotal: toNumber(row.grandTotal),
      status: row.status,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            displayName: row.customer.displayName,
            email: row.customer.email,
            phone: row.customer.phone,
            address: row.customer.address,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : undefined,
      challans: (row.challans || []).map((c: AnyPrisma) => this.mapDeliveryChallan(c)),
      payments: (row.payments || []).map((p: AnyPrisma) => ({
        id: p.id,
        amount: toNumber(p.amount),
        method: p.method,
        receivedAt: p.receivedAt,
      })),
      lines: explicitLines,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 6: Delivery Challan Returns & Fulfillment
  // ═══════════════════════════════════════════════════════════════

  async createDeliveryChallanReturn(
    data: import("../domain/sales.types").CreateDeliveryChallanReturnInput
  ): Promise<import("../domain/sales.types").DeliveryChallanReturnEntity> {
    const challan = await this.prisma.deliveryChallan.findUnique({
      where: { id: data.challanId },
      include: {
        lines: true,
        branch: true,
        salesOrder: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!challan) {
      throw new Error(`Delivery challan ${data.challanId} not found.`);
    }

    if (!data.lines || data.lines.length === 0) {
      throw new Error("Challan return must contain at least one line.");
    }

    // Verify existing returns per challan line to enforce domain guard
    const existingReturns = await this.prisma.deliveryChallanReturnLine.findMany({
      where: {
        challanLineId: { in: data.lines.map((l) => l.challanLineId) },
      },
    });

    const branchCode = challan.branch?.code || "BR01";
    const returnNumber = `RET-${branchCode}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const computedLines: {
      challanLineId: string;
      quantity: number;
      condition: import("../domain/sales.types").ChallanReturnCondition;
      productId: string;
    }[] = [];
    for (const inputLine of data.lines) {
      const origLine = challan.lines.find((l: AnyPrisma) => l.id === inputLine.challanLineId);
      if (!origLine) {
        throw new Error(`Challan line ${inputLine.challanLineId} does not belong to challan ${challan.id}`);
      }

      const prevReturnedQty = existingReturns
        .filter((r: AnyPrisma) => r.challanLineId === inputLine.challanLineId)
        .reduce((sum: number, r: AnyPrisma) => sum + toNumber(r.quantity), 0);

      const origQty = toNumber(origLine.quantity);
      const remainingReturnable = origQty - prevReturnedQty;

      if (inputLine.quantity <= 0) {
        throw new Error("Return quantity must be greater than zero.");
      }

      if (inputLine.quantity > remainingReturnable) {
        throw new Error(
          `Cannot return ${inputLine.quantity} units for line ${inputLine.challanLineId}. Only ${remainingReturnable} remaining returnable.`
        );
      }

      computedLines.push({
        challanLineId: inputLine.challanLineId,
        quantity: inputLine.quantity,
        condition: inputLine.condition,
        productId: origLine.productId,
      });
    }

    const createdReturn = await this.withTx(async (tx: AnyPrisma) => {
      const ret = await tx.deliveryChallanReturn.create({
        data: {
          returnNumber,
          challanId: challan.id,
          branchId: data.branchId || challan.branchId,
          lines: {
            create: computedLines.map((l) => ({
              challanLineId: l.challanLineId,
              quantity: l.quantity,
              condition: l.condition,
            })),
          },
        },
        include: {
          challan: {
            include: {
              salesOrder: {
                include: {
                  customer: true,
                },
              },
            },
          },
          branch: true,
          lines: {
            include: {
              challanLine: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      // Handle stock and damage report effects
      for (const line of computedLines) {
        const prod = tx.product ? await tx.product.findUnique({ where: { id: line.productId } }) : null;
        const isSerialized = prod?.trackingType === "SERIALIZED";
        const warehouse = tx.warehouse ? await tx.warehouse.findFirst({ where: { branchId: ret.branchId } }) : null;

        if (isSerialized && tx.serialNumber) {
          const inputLine = data.lines.find((il: AnyPrisma) => il.challanLineId === line.challanLineId);
          const lineSerials = (inputLine as AnyPrisma)?.serialNumberIds || (inputLine as AnyPrisma)?.serials || [];
          if (lineSerials.length > 0) {
            const units = await tx.serialNumber.findMany({
              where: {
                OR: [{ id: { in: lineSerials } }, { serial: { in: lineSerials } }],
                productId: line.productId,
              },
            });
            for (const unit of units) {
              const newStage = line.condition === "GOOD" ? "IN_STOCK" : "DAMAGED_WRITTEN_OFF";
              await tx.serialNumber.update({
                where: { id: unit.id },
                data: { currentStage: newStage, warehouseId: line.condition === "GOOD" && warehouse ? warehouse.id : null },
              });
              if (tx.sKULifecycleEvent) {
                await tx.sKULifecycleEvent.create({
                  data: {
                    serialNumberId: unit.id,
                    eventType: newStage,
                    sourceModule: "CHALLAN_RETURN",
                    sourceId: ret.id,
                    toWarehouseId: line.condition === "GOOD" && warehouse ? warehouse.id : null,
                    toStage: newStage,
                    notes: `Customer returned item via ${ret.returnNumber} (${line.condition})`,
                  },
                }).catch(() => {});
              }
            }
          }
        }

        if (line.condition === "GOOD") {
          // Find stock ledger and restore quantity
          if (tx.stockLedger) {
            const ledger = await tx.stockLedger.findFirst({
              where: {
                productId: line.productId,
              },
            });
            if (ledger) {
              await tx.stockLedger.update({
                where: { id: ledger.id },
                data: {
                  quantityOnHand: { increment: line.quantity },
                },
              });
            }
          }
        } else if (tx.damageLossReport) {
          // Automatically create linked damage loss report
          const damageReportNumber = `DLR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          // Find default warehouse for branch
          const warehouse = tx.warehouse ? await tx.warehouse.findFirst({ where: { branchId: ret.branchId } }) : null;
          if (warehouse) {
            const report = await tx.damageLossReport.create({
              data: {
                reportNumber: damageReportNumber,
                branchId: ret.branchId,
                warehouseId: warehouse.id,
                reason: `Customer Challan Return: ${line.condition}`,
                status: "REPORTED",
                reportedById: "SYSTEM",
                grossLoss: 0,
                recovery: 0,
                netLoss: 0,
                lines: {
                  create: [
                    {
                      productId: line.productId,
                      quantity: line.quantity,
                      costBasis: 0,
                    },
                  ],
                },
              },
            });

            // Link damageLossReportId on return line
            const createdLine = ret.lines.find((rl: AnyPrisma) => rl.challanLineId === line.challanLineId);
            if (createdLine) {
              await tx.deliveryChallanReturnLine.update({
                where: { id: createdLine.id },
                data: { damageLossReportId: report.id },
              });
            }
          }
        }
      }

      return ret;
    });

    return this.mapDeliveryChallanReturn(createdReturn);
  }

  async listDeliveryChallanReturns(
    filter?: { challanId?: string; branchId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").DeliveryChallanReturnEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.challanId) where.challanId = filter.challanId;
    if (filter?.branchId) where.branchId = filter.branchId;

    const [rows, total] = await Promise.all([
      this.prisma.deliveryChallanReturn.findMany({
        where,
        skip: pagination?.skip || 0,
        take: pagination?.take || 50,
        orderBy: { createdAt: "desc" },
        include: {
          challan: {
            include: {
              salesOrder: {
                include: {
                  customer: true,
                },
              },
            },
          },
          branch: true,
          lines: {
            include: {
              challanLine: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.deliveryChallanReturn.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapDeliveryChallanReturn(r)),
      total,
    };
  }

  async getSalesOrderFulfillment(
    salesOrderId: string
  ): Promise<import("../domain/sales.types").SalesOrderFulfillmentEntity> {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
        challans: {
          include: {
            lines: true,
            returns: {
              include: {
                lines: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Sales order ${salesOrderId} not found.`);
    }

    const fulfillmentLines: import("../domain/sales.types").SalesOrderFulfillmentLine[] = [];

    for (const sol of order.lines || []) {
      const ordered = toNumber(sol.quantity);
      let challaned = 0;
      let returned = 0;

      for (const ch of order.challans || []) {
        const matchingLines = (ch.lines || []).filter(
          (cl: AnyPrisma) => cl.salesOrderLineId === sol.id || cl.productId === sol.productId
        );
        for (const cl of matchingLines) {
          challaned += toNumber(cl.quantity);
          for (const ret of ch.returns || []) {
            const retLines = (ret.lines || []).filter((rl: AnyPrisma) => rl.challanLineId === cl.id);
            for (const rl of retLines) {
              returned += toNumber(rl.quantity);
            }
          }
        }
      }

      const netDelivered = Math.max(0, challaned - returned);
      const remaining = Math.max(0, ordered - netDelivered);

      fulfillmentLines.push({
        salesOrderLineId: sol.id,
        productId: sol.productId || "",
        sku: sol.product?.sku || "",
        productName: sol.product?.name || sol.description,
        ordered,
        challaned,
        returned,
        netDelivered,
        remaining,
      });
    }

    return {
      salesOrderId: order.id,
      orderNumber: order.orderNumber,
      lines: fulfillmentLines,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 6: Credit Notes
  // ═══════════════════════════════════════════════════════════════

  async createCreditNote(
    data: import("../domain/sales.types").CreateCreditNoteInput
  ): Promise<import("../domain/sales.types").CreditNoteEntity> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        customer: true,
        creditNotes: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${data.invoiceId} not found.`);
    }

    if (data.amount <= 0) {
      throw new Error("Credit note amount must be greater than zero.");
    }

    const grandTotal = toNumber(invoice.grandTotal);
    const existingCredits = (invoice.creditNotes || []).reduce(
      (sum: number, cn: AnyPrisma) => sum + toNumber(cn.amount),
      0
    );
    const remainingCreditable = grandTotal - existingCredits;

    if (data.amount > remainingCreditable) {
      throw new Error(
        `Credit note amount (${data.amount}) exceeds remaining invoice balance (${remainingCreditable}).`
      );
    }

    const creditNoteNumber = `CN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const row = await this.prisma.creditNote.create({
      data: {
        creditNoteNumber,
        invoiceId: invoice.id,
        amount: data.amount,
        reason: data.reason,
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
    });

    return this.mapCreditNote(row);
  }

  async listCreditNotes(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CreditNoteEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.invoiceId) where.invoiceId = filter.invoiceId;

    const [rows, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        skip: pagination?.skip || 0,
        take: pagination?.take || 50,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
        },
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapCreditNote(r)),
      total,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 7: Customer Advances & Adjustments
  // ═══════════════════════════════════════════════════════════════

  async createCustomerAdvance(
    data: import("../domain/sales.types").CreateCustomerAdvanceInput
  ): Promise<import("../domain/sales.types").CustomerAdvanceEntity> {
    if (data.amount <= 0) {
      throw new Error("Advance amount must be greater than zero.");
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new Error(`Customer ${data.customerId} not found.`);
    }

    const row = await this.withTx(async (tx: AnyPrisma) => {
      const advance = await tx.customerAdvance.create({
        data: {
          customerId: data.customerId,
          projectRef: data.projectRef || null,
          amount: data.amount,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          method: data.method,
          status: "RECEIVED",
          branchId: data.branchId,
          receivedById: data.receivedById || data.customerId,
        },
        include: {
          customer: true,
          branch: true,
          adjustments: {
            include: {
              invoice: true,
            },
          },
        },
      });

      // If bank proof is provided and method is BANK or CHEQUE, save proof
      if (data.bankProof && (data.method === "BANK" || data.method === "CHEQUE")) {
        const last4 = data.bankProof.accountNumberLast4.replace(/\D/g, "").slice(-4);
        await tx.bankTransactionProof.create({
          data: {
            sourceModule: "CUSTOMER_ADVANCE",
            sourceId: advance.id,
            accountNumberMasked: `****${last4}`,
            proofFileId: data.bankProof.proofFileId,
            uploadedById: data.receivedById || "SYSTEM",
          },
        });
      }

      return advance;
    });

    return this.mapCustomerAdvance(row);
  }

  async getCustomerAdvanceById(
    id: string
  ): Promise<import("../domain/sales.types").CustomerAdvanceEntity | null> {
    const row = await this.prisma.customerAdvance.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        adjustments: {
          include: {
            invoice: true,
          },
        },
      },
    });

    return row ? this.mapCustomerAdvance(row) : null;
  }

  async listCustomerAdvances(
    filter?: {
      customerId?: string;
      branchId?: string;
      status?: import("../domain/sales.types").AdvanceStatus;
      projectRef?: string;
    },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").CustomerAdvanceEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.branchId) where.branchId = filter.branchId;
    if (filter?.status) where.status = filter.status;
    if (filter?.projectRef) where.projectRef = filter.projectRef;

    const [rows, total] = await Promise.all([
      this.prisma.customerAdvance.findMany({
        where,
        skip: pagination?.skip || 0,
        take: pagination?.take || 50,
        orderBy: { receivedDate: "desc" },
        include: {
          customer: true,
          branch: true,
          adjustments: {
            include: {
              invoice: true,
            },
          },
        },
      }),
      this.prisma.customerAdvance.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapCustomerAdvance(r)),
      total,
    };
  }

  async adjustCustomerAdvance(
    data: import("../domain/sales.types").AdjustAdvanceInput
  ): Promise<import("../domain/sales.types").AdvanceAdjustmentEntity> {
    if (data.amountAdjusted <= 0) {
      throw new Error("Adjusted amount must be greater than zero.");
    }

    const advance = await this.prisma.customerAdvance.findUnique({
      where: { id: data.advanceId },
      include: {
        adjustments: true,
      },
    });

    if (!advance) {
      throw new Error(`Customer advance ${data.advanceId} not found.`);
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) {
      throw new Error(`Invoice ${data.invoiceId} not found.`);
    }

    const totalAdvance = toNumber(advance.amount);
    const prevAdjusted = (advance.adjustments || []).reduce(
      (sum: number, a: AnyPrisma) => sum + toNumber(a.amountAdjusted),
      0
    );
    const remainingAdvance = totalAdvance - prevAdjusted;

    if (data.amountAdjusted > remainingAdvance) {
      throw new Error(
        `Adjusted amount (${data.amountAdjusted}) exceeds remaining advance balance (${remainingAdvance}).`
      );
    }

    const newTotalAdjusted = prevAdjusted + data.amountAdjusted;
    const newStatus =
      newTotalAdjusted >= totalAdvance ? "FULLY_ADJUSTED" : "PARTIALLY_ADJUSTED";

    const adjustment = await this.withTx(async (tx: AnyPrisma) => {
      const adj = await tx.advanceAdjustment.create({
        data: {
          advanceId: advance.id,
          invoiceId: invoice.id,
          amountAdjusted: data.amountAdjusted,
          adjustedById: data.adjustedById || advance.customerId,
        },
        include: {
          invoice: true,
          advance: true,
        },
      });

      await tx.customerAdvance.update({
        where: { id: advance.id },
        data: {
          status: newStatus,
        },
      });

      return adj;
    });

    return this.mapAdvanceAdjustment(adjustment);
  }

  // ═══════════════════════════════════════════════════════════════
  // Phase 7: Payments & Bank Transaction Proof
  // ═══════════════════════════════════════════════════════════════

  async recordPayment(
    data: import("../domain/sales.types").RecordPaymentInput
  ): Promise<import("../domain/sales.types").PaymentEntity> {
    if (data.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        payments: true,
        customer: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${data.invoiceId} not found.`);
    }

    const row = await this.withTx(async (tx: AnyPrisma) => {
      const p = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: data.amount,
          method: data.method,
          gatewayTransactionId: data.gatewayTransactionId || null,
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
        },
      });

      // If bank proof is provided and method is BANK or CHEQUE
      if (data.bankProof && (data.method === "BANK" || data.method === "CHEQUE")) {
        const last4 = data.bankProof.accountNumberLast4.replace(/\D/g, "").slice(-4);
        await tx.bankTransactionProof.create({
          data: {
            sourceModule: "PAYMENT",
            sourceId: p.id,
            accountNumberMasked: `****${last4}`,
            proofFileId: data.bankProof.proofFileId,
            uploadedById: "SYSTEM",
          },
        });
      }

      return p;
    });

    return this.mapPayment(row);
  }

  async listPayments(
    filter?: { invoiceId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").PaymentEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.invoiceId) where.invoiceId = filter.invoiceId;

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: pagination?.skip || 0,
        take: pagination?.take || 50,
        orderBy: { receivedAt: "desc" },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: rows.map((r: AnyPrisma) => this.mapPayment(r)),
      total,
    };
  }

  async createBankTransactionProof(
    data: import("../domain/sales.types").CreateBankTransactionProofInput
  ): Promise<import("../domain/sales.types").BankTransactionProofEntity> {
    const last4 = (data.accountNumberLast4 || "").replace(/\D/g, "").slice(-4);
    if (last4.length < 4) {
      throw new Error("Must provide at least 4 digits of the account number for masking.");
    }

    const row = await this.prisma.bankTransactionProof.create({
      data: {
        sourceModule: data.sourceModule,
        sourceId: data.sourceId,
        accountNumberMasked: `****${last4}`,
        proofFileId: data.proofFileId,
        uploadedById: data.uploadedById || "SYSTEM",
      },
    });

    return this.mapBankTransactionProof(row);
  }

  async getBankTransactionProof(
    id: string
  ): Promise<import("../domain/sales.types").BankTransactionProofEntity | null> {
    const row = await this.prisma.bankTransactionProof.findUnique({
      where: { id },
    });
    return row ? this.mapBankTransactionProof(row) : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // Entity Mappers
  // ═══════════════════════════════════════════════════════════════

  private mapDeliveryChallanReturn(row: AnyPrisma): import("../domain/sales.types").DeliveryChallanReturnEntity {
    return {
      id: row.id,
      returnNumber: row.returnNumber,
      challanId: row.challanId,
      branchId: row.branchId,
      createdAt: row.createdAt,
      challan: row.challan
        ? {
            id: row.challan.id,
            challanNumber: row.challan.challanNumber,
            salesOrderId: row.challan.salesOrderId,
            salesOrder: row.challan.salesOrder
              ? {
                  id: row.challan.salesOrder.id,
                  orderNumber: row.challan.salesOrder.orderNumber,
                  customer: row.challan.salesOrder.customer
                    ? {
                        displayName: row.challan.salesOrder.customer.displayName,
                      }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : undefined,
      lines: (row.lines || []).map((l: AnyPrisma) => ({
        id: l.id,
        returnId: l.returnId,
        challanLineId: l.challanLineId,
        quantity: toNumber(l.quantity),
        condition: l.condition,
        damageLossReportId: l.damageLossReportId || null,
        challanLine: l.challanLine
          ? {
              id: l.challanLine.id,
              productId: l.challanLine.productId,
              quantity: toNumber(l.challanLine.quantity),
              product: l.challanLine.product
                ? {
                    id: l.challanLine.product.id,
                    sku: l.challanLine.product.sku,
                    name: l.challanLine.product.name,
                  }
                : undefined,
            }
          : undefined,
      })),
    };
  }

  private mapCreditNote(row: AnyPrisma): import("../domain/sales.types").CreditNoteEntity {
    return {
      id: row.id,
      creditNoteNumber: row.creditNoteNumber,
      invoiceId: row.invoiceId,
      amount: toNumber(row.amount),
      reason: row.reason,
      createdAt: row.createdAt,
      invoice: row.invoice
        ? {
            id: row.invoice.id,
            invoiceNumber: row.invoice.invoiceNumber,
            grandTotal: toNumber(row.invoice.grandTotal),
            customer: row.invoice.customer
              ? {
                  displayName: row.invoice.customer.displayName,
                }
              : undefined,
          }
        : undefined,
    };
  }

  private mapCustomerAdvance(row: AnyPrisma): import("../domain/sales.types").CustomerAdvanceEntity {
    const amount = toNumber(row.amount);
    const adjustments = (row.adjustments || []).map((a: AnyPrisma) => ({
      id: a.id,
      advanceId: a.advanceId,
      invoiceId: a.invoiceId,
      amountAdjusted: toNumber(a.amountAdjusted),
      adjustedAt: a.adjustedAt,
      adjustedById: a.adjustedById,
      invoice: a.invoice
        ? {
            id: a.invoice.id,
            invoiceNumber: a.invoice.invoiceNumber,
            grandTotal: toNumber(a.invoice.grandTotal),
          }
        : undefined,
    }));
    const adjustedAmount = adjustments.reduce((sum: number, a: { amountAdjusted: number }) => sum + a.amountAdjusted, 0);
    const remainingAmount = Math.max(0, amount - adjustedAmount);

    return {
      id: row.id,
      customerId: row.customerId,
      projectRef: row.projectRef,
      amount,
      receivedDate: row.receivedDate,
      method: row.method,
      status: row.status,
      branchId: row.branchId,
      receivedById: row.receivedById,
      createdAt: row.createdAt,
      adjustedAmount,
      remainingAmount,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            displayName: row.customer.displayName,
            phone: row.customer.phone,
          }
        : undefined,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : undefined,
      adjustments,
    };
  }

  private mapAdvanceAdjustment(row: AnyPrisma): import("../domain/sales.types").AdvanceAdjustmentEntity {
    return {
      id: row.id,
      advanceId: row.advanceId,
      invoiceId: row.invoiceId,
      amountAdjusted: toNumber(row.amountAdjusted),
      adjustedAt: row.adjustedAt,
      adjustedById: row.adjustedById,
      invoice: row.invoice
        ? {
            id: row.invoice.id,
            invoiceNumber: row.invoice.invoiceNumber,
            grandTotal: toNumber(row.invoice.grandTotal),
          }
        : undefined,
      advance: row.advance
        ? {
            id: row.advance.id,
            amount: toNumber(row.advance.amount),
            status: row.advance.status,
          }
        : undefined,
    };
  }

  private mapPayment(row: AnyPrisma): import("../domain/sales.types").PaymentEntity {
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      amount: toNumber(row.amount),
      method: row.method,
      gatewayTransactionId: row.gatewayTransactionId,
      receivedAt: row.receivedAt,
      invoice: row.invoice
        ? {
            id: row.invoice.id,
            invoiceNumber: row.invoice.invoiceNumber,
            grandTotal: toNumber(row.invoice.grandTotal),
            customerId: row.invoice.customerId,
            customer: row.invoice.customer
              ? {
                  displayName: row.invoice.customer.displayName,
                }
              : undefined,
          }
        : undefined,
    };
  }

  private mapBankTransactionProof(row: AnyPrisma): import("../domain/sales.types").BankTransactionProofEntity {
    return {
      id: row.id,
      sourceModule: row.sourceModule,
      sourceId: row.sourceId,
      accountNumberMasked: row.accountNumberMasked,
      proofFileId: row.proofFileId,
      uploadedById: row.uploadedById,
      uploadedAt: row.uploadedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Sales Returns & Inventory Restorations
  // ═══════════════════════════════════════════════════════════════

  private mapSalesReturn(row: AnyPrisma): import("../domain/sales.types").SalesReturnEntity {
    return {
      id: row.id,
      returnNumber: row.returnNumber,
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoice?.invoiceNumber,
      customerId: row.customerId,
      branchId: row.branchId,
      warehouseId: row.warehouseId,
      totalAmount: toNumber(row.totalAmount),
      creditToWallet: Boolean(row.creditToWallet),
      refundAmount: toNumber(row.refundAmount),
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt,
      invoice: row.invoice
        ? {
            id: row.invoice.id,
            invoiceNumber: row.invoice.invoiceNumber,
            grandTotal: toNumber(row.invoice.grandTotal),
          }
        : undefined,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            displayName: row.customer.displayName,
          }
        : undefined,
      warehouse: row.warehouse
        ? {
            id: row.warehouse.id,
            code: row.warehouse.code,
            name: row.warehouse.name,
          }
        : undefined,
      lines: (row.lines || []).map((l: AnyPrisma) => ({
        id: l.id,
        salesReturnId: l.salesReturnId,
        productId: l.productId,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        lineTotal: toNumber(l.lineTotal),
        serials: l.serials || [],
        product: l.product
          ? {
              id: l.product.id,
              sku: l.product.sku,
              name: l.product.name,
              trackingType: l.product.trackingType || "NON_SERIALIZED",
              modelNumber: l.product.modelNumber ?? null,
            }
          : undefined,
      })),
    };
  }

  async getInvoiceReturnableItems(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found.`);
    }

    // Existing returns for this invoice
    const existingReturns = await this.prisma.salesReturn.findMany({
      where: { invoiceId },
      include: { lines: true },
    });

    const alreadyReturnedMap = new Map<string, number>();
    const returnedSerialsSet = new Set<string>();

    for (const ret of existingReturns) {
      for (const line of ret.lines) {
        alreadyReturnedMap.set(
          line.productId,
          (alreadyReturnedMap.get(line.productId) || 0) + toNumber(line.quantity)
        );
        for (const s of line.serials || []) {
          returnedSerialsSet.add(s);
        }
      }
    }

    // Find sold serial units for this invoice
    const soldEvents = await this.prisma.sKULifecycleEvent.findMany({
      where: {
        sourceId: invoiceId,
        eventType: "SOLD",
      },
      include: {
        serialNumber: {
          include: { product: true },
        },
      },
    });

    const soldSerialsByProduct = new Map<string, string[]>();
    for (const evt of soldEvents) {
      if (evt.serialNumber && !returnedSerialsSet.has(evt.serialNumber.serial)) {
        const prodId = evt.serialNumber.productId;
        const list = soldSerialsByProduct.get(prodId) || [];
        list.push(evt.serialNumber.serial);
        soldSerialsByProduct.set(prodId, list);
      }
    }

    // Map invoice lines
    const items = (invoice.lines || []).map((line) => {
      const alreadyReturned = alreadyReturnedMap.get(line.productId || "") || 0;
      const returnable = Math.max(0, line.quantity - alreadyReturned);
      const candidateSerials = soldSerialsByProduct.get(line.productId || "") || [];

      return {
        productId: line.productId || "",
        productName: line.productName || "Product",
        sku: line.sku || "",
        trackingType: (candidateSerials.length > 0 ? "SERIALIZED" : "NON_SERIALIZED") as "SERIALIZED" | "NON_SERIALIZED",
        invoicedQuantity: line.quantity,
        alreadyReturnedQuantity: alreadyReturned,
        returnableQuantity: returnable,
        unitPrice: line.unitPrice,
        soldSerials: candidateSerials,
      };
    });

    // Check actual products in database to ensure trackingType is 100% accurate
    const productIds = items.map((i) => i.productId).filter(Boolean);
    if (productIds.length > 0) {
      const prods = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const prodMap = new Map((prods as any[]).map((p: any) => [p.id, p]));
      for (const item of items) {
        const p: any = prodMap.get(item.productId);
        if (p) {
          item.trackingType = (p.trackingType as any) || "NON_SERIALIZED";
        }
      }
    }

    return { invoice, items };
  }

  async createSalesReturn(
    data: import("../domain/sales.types").CreateSalesReturnInput,
    userId?: string
  ): Promise<import("../domain/sales.types").SalesReturnEntity> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        customer: true,
        branch: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${data.invoiceId} not found.`);
    }

    if (invoice.status === "CANCELLED") {
      throw new Error("Cannot return items against a cancelled invoice.");
    }

    if (!data.lines || data.lines.length === 0) {
      throw new Error("At least one line item must be selected for return.");
    }

    // Verify warehouse
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new Error(`Warehouse ${data.warehouseId} not found.`);
    }

    // Check returnable items
    const { items: returnableItems } = await this.getInvoiceReturnableItems(data.invoiceId);
    const returnableMap = new Map(returnableItems.map((i) => [i.productId, i]));

    let totalAmount = 0;
    for (const line of data.lines) {
      const retInfo = returnableMap.get(line.productId);
      if (!retInfo) {
        throw new Error(`Product ${line.productId} was not found on Invoice ${invoice.invoiceNumber}.`);
      }
      if (line.quantity <= 0) {
        throw new Error(`Return quantity for ${retInfo.productName} must be greater than zero.`);
      }
      if (line.quantity > retInfo.returnableQuantity) {
        throw new Error(
          `Return quantity (${line.quantity}) for "${retInfo.productName}" exceeds available returnable quantity (${retInfo.returnableQuantity}).`
        );
      }

      // If serialized, validate serial numbers
      if (retInfo.trackingType === "SERIALIZED") {
        const serials = line.serials || [];
        if (serials.length !== line.quantity) {
          throw new Error(
            `"${retInfo.productName}" is a serialized item. Exactly ${line.quantity} serial number(s) must be provided (received ${serials.length}).`
          );
        }
        for (const s of serials) {
          const unit = await this.prisma.serialNumber.findUnique({ where: { serial: s } });
          if (!unit) {
            throw new Error(`Serial number "${s}" does not exist in the system.`);
          }
          if (unit.productId !== line.productId) {
            throw new Error(`Serial number "${s}" does not belong to product "${retInfo.productName}".`);
          }
          if (unit.currentStage !== "SOLD") {
            throw new Error(`Serial number "${s}" is not currently in SOLD status (current: ${unit.currentStage}).`);
          }
        }
      }

      totalAmount += Number((line.quantity * line.unitPrice).toFixed(2));
    }

    totalAmount = Number(totalAmount.toFixed(2));
    const returnNumber = `RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const row = await (this.prisma as any).$transaction(async (tx: any) => {
      // 1. Create SalesReturn record
      const createdReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          branchId: invoice.branchId,
          warehouseId: data.warehouseId,
          totalAmount,
          creditToWallet: data.creditToWallet ?? true,
          refundAmount: totalAmount,
          reason: data.reason || "Customer Return",
          status: "COMPLETED",
          createdById: userId || null,
          lines: {
            create: data.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
              serials: l.serials || [],
            })),
          },
        },
        include: {
          invoice: true,
          customer: true,
          warehouse: true,
          lines: {
            include: { product: true },
          },
        },
      });

      // 2. Create Credit Note linked to invoice
      await tx.creditNote.create({
        data: {
          creditNoteNumber: `CN-${returnNumber}`,
          invoiceId: invoice.id,
          amount: totalAmount,
          reason: `Sales Return #${returnNumber}${data.reason ? ": " + data.reason : ""}`,
        },
      });

      // 3. Credit to Customer Wallet if requested (User requirement: "Tk customer er wallet a add hobe")
      if (data.creditToWallet ?? true) {
        const updatedCustomer = await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            walletBalance: { increment: totalAmount },
          },
        });

        await tx.customerWalletTransaction.create({
          data: {
            customerId: invoice.customerId,
            amount: totalAmount,
            type: "SALES_RETURN_REFUND",
            referenceType: "SALES_RETURN",
            referenceId: createdReturn.id,
            balanceAfter: updatedCustomer.walletBalance,
            notes: `Refund from Sales Return #${returnNumber} for Invoice #${invoice.invoiceNumber}`,
            createdById: userId || null,
          },
        });
      }

      // 4. Restore Inventory (User requirement: "Products inventory te add hoye jabe")
      for (const line of data.lines) {
        const prod = await tx.product.findUnique({ where: { id: line.productId } });
        const isSerialized = prod?.trackingType === "SERIALIZED";

        // Increment stock ledger
        await tx.stockLedger.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: data.warehouseId,
            },
          },
          create: {
            productId: line.productId,
            warehouseId: data.warehouseId,
            quantityOnHand: line.quantity,
          },
          update: {
            quantityOnHand: { increment: line.quantity },
          },
        });

        // If serialized, transition each serial back to IN_STOCK at the warehouse
        if (isSerialized && line.serials && line.serials.length > 0) {
          for (const s of line.serials) {
            const unit = await tx.serialNumber.update({
              where: { serial: s },
              data: {
                currentStage: "IN_STOCK",
                warehouseId: data.warehouseId,
              },
            });

            await tx.sKULifecycleEvent.create({
              data: {
                serialNumberId: unit.id,
                eventType: "RETURNED_BY_CUSTOMER",
                sourceModule: "SALES_RETURN",
                sourceId: createdReturn.id,
                fromStage: "SOLD",
                toStage: "IN_STOCK",
                toWarehouseId: data.warehouseId,
                notes: `Restored to stock via Sales Return #${returnNumber}`,
                performedById: userId || null,
              },
            });
          }
        }
      }

      return createdReturn;
    });

    return this.mapSalesReturn(row);
  }

  async getSalesReturnById(id: string): Promise<import("../domain/sales.types").SalesReturnEntity | null> {
    const row = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: {
        invoice: true,
        customer: true,
        warehouse: true,
        lines: {
          include: { product: true },
        },
      },
    });
    if (!row) return null;
    return this.mapSalesReturn(row);
  }

  async listSalesReturns(
    filter?: { invoiceId?: string; customerId?: string; branchId?: string },
    pagination?: Pagination
  ): Promise<{ items: import("../domain/sales.types").SalesReturnEntity[]; total: number }> {
    const where: AnyPrisma = {};
    if (filter?.invoiceId) where.invoiceId = filter.invoiceId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.branchId) where.branchId = filter.branchId;

    const [rows, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        include: {
          invoice: true,
          customer: true,
          warehouse: true,
          lines: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 50,
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    return {
      items: rows.map((r: any) => this.mapSalesReturn(r)),
      total,
    };
  }
}

