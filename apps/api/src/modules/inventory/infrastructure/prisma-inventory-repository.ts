import type {
  StockLedgerDto,
  StockAdjustmentDto,
  CreateStockAdjustmentRequest,
  StockTransferDto,
  CreateStockTransferRequest,
  BatchDto,
  CreateBatchRequest,
  SerialNumberDto,
  CreateSerialNumberRequest,
  SKULifecycleEventDto,
  DamageLossReportDto,
  CreateDamageLossReportRequest,
  InventoryStatsDto,
  DamageLossDisposition,
  BarcodeScanRequest,
  BarcodeScanResultDto,
} from "../domain/inventory.types";

// Structural typing for PrismaClient to avoid hard runtime dependency issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InventoryPrismaClient = any;

export class PrismaInventoryRepository {
  constructor(private readonly prisma: InventoryPrismaClient) {}

  // ---------------------------------------------------------------------------
  // 1. Stock Ledger
  // ---------------------------------------------------------------------------
  async listStock(filters?: {
    warehouseId?: string;
    productId?: string;
    belowReorderPoint?: boolean;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockLedgerDto[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (filters?.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }
    if (filters?.productId) {
      where.productId = filters.productId;
    }
    if (filters?.search) {
      where.product = {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { sku: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.stockLedger.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              unit: true,
            },
          },
          warehouse: true,
        },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.stockLedger.count({ where }),
    ]);

    let items: StockLedgerDto[] = rawItems.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      warehouseId: r.warehouseId,
      quantityOnHand: Number(r.quantityOnHand),
      updatedAt: r.updatedAt,
      product: r.product
        ? {
            id: r.product.id,
            sku: r.product.sku,
            name: r.product.name,
            costPrice: r.product.costPrice ? Number(r.product.costPrice) : undefined,
            sellingPrice: r.product.sellingPrice ? Number(r.product.sellingPrice) : undefined,
            reorderLevel: r.product.reorderLevel ? Number(r.product.reorderLevel) : undefined,
            unit: r.product.unit ? { id: r.product.unit.id, name: r.product.unit.name, code: r.product.unit.code } : null,
            category: r.product.category ? { id: r.product.category.id, name: r.product.category.name } : null,
          }
        : null,
      warehouse: r.warehouse
        ? {
            id: r.warehouse.id,
            code: r.warehouse.code,
            name: r.warehouse.name,
          }
        : null,
    }));

    if (filters?.belowReorderPoint) {
      items = items.filter(
        (i) => i.product?.reorderLevel && i.quantityOnHand <= (i.product.reorderLevel ?? 0)
      );
    }

    return { items, total };
  }

  // ---------------------------------------------------------------------------
  // 2. Stock Adjustment
  // ---------------------------------------------------------------------------
  async createStockAdjustment(
    data: CreateStockAdjustmentRequest & { createdById: string },
    autoApprove: boolean = true
  ): Promise<StockAdjustmentDto> {
    return await this.prisma.$transaction(async (tx: any) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantityDelta: data.quantityDelta,
          reason: data.reason,
          approvalStatus: autoApprove ? "APPROVED" : "PENDING",
          createdById: data.createdById,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      // If approved, update stock ledger immediately
      if (autoApprove) {
        const existing = await tx.stockLedger.findUnique({
          where: {
            productId_warehouseId: {
              productId: data.productId,
              warehouseId: data.warehouseId,
            },
          },
        });

        const currentQty = existing ? Number(existing.quantityOnHand) : 0;
        const newQty = Math.max(0, currentQty + Number(data.quantityDelta));

        await tx.stockLedger.upsert({
          where: {
            productId_warehouseId: {
              productId: data.productId,
              warehouseId: data.warehouseId,
            },
          },
          update: { quantityOnHand: newQty },
          create: {
            productId: data.productId,
            warehouseId: data.warehouseId,
            quantityOnHand: newQty,
          },
        });
      }

      return {
        id: adjustment.id,
        productId: adjustment.productId,
        warehouseId: adjustment.warehouseId,
        quantityDelta: Number(adjustment.quantityDelta),
        reason: adjustment.reason,
        approvalStatus: adjustment.approvalStatus,
        createdById: adjustment.createdById,
        createdAt: adjustment.createdAt,
        product: adjustment.product ? { id: adjustment.product.id, sku: adjustment.product.sku, name: adjustment.product.name } : null,
        warehouse: adjustment.warehouse ? { id: adjustment.warehouse.id, code: adjustment.warehouse.code, name: adjustment.warehouse.name } : null,
      };
    });
  }

  async listStockAdjustments(filters?: {
    warehouseId?: string;
    productId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockAdjustmentDto[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters?.productId) where.productId = filters.productId;

    const [items, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        include: { product: true, warehouse: true },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    return {
      items: items.map((a: any) => ({
        id: a.id,
        productId: a.productId,
        warehouseId: a.warehouseId,
        quantityDelta: Number(a.quantityDelta),
        reason: a.reason,
        approvalStatus: a.approvalStatus,
        createdById: a.createdById,
        createdAt: a.createdAt,
        product: a.product ? { id: a.product.id, sku: a.product.sku, name: a.product.name } : null,
        warehouse: a.warehouse ? { id: a.warehouse.id, code: a.warehouse.code, name: a.warehouse.name } : null,
      })),
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Stock Transfer
  // ---------------------------------------------------------------------------
  async createStockTransfer(data: CreateStockTransferRequest): Promise<StockTransferDto> {
    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Check source stock
      const sourceStock = await tx.stockLedger.findUnique({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.fromWarehouseId,
          },
        },
      });

      const available = sourceStock ? Number(sourceStock.quantityOnHand) : 0;
      if (available < Number(data.quantity)) {
        throw new Error(`Insufficient stock in source warehouse. Available: ${available}, Requested: ${data.quantity}`);
      }

      // 2. Decrement source warehouse stock
      await tx.stockLedger.update({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.fromWarehouseId,
          },
        },
        data: {
          quantityOnHand: available - Number(data.quantity),
        },
      });

      // 3. Create Transfer record in DISPATCHED status
      const transfer = await tx.stockTransfer.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          fromWarehouseId: data.fromWarehouseId,
          toWarehouseId: data.toWarehouseId,
          status: "DISPATCHED",
        },
        include: {
          product: true,
        },
      });

      // 4. If product is SERIALIZED, transition physical units from source warehouse
      if (transfer.product?.trackingType === "SERIALIZED" && tx.serialNumber) {
        let unitsToTransfer: any[] = [];
        const requestedSerials = (data as any).serials as string[] | undefined;
        if (requestedSerials && requestedSerials.length > 0) {
          unitsToTransfer = await tx.serialNumber.findMany({
            where: {
              serial: { in: requestedSerials },
              productId: data.productId,
              warehouseId: data.fromWarehouseId,
              currentStage: "IN_STOCK",
            },
          });
          if (unitsToTransfer.length !== requestedSerials.length) {
            throw new Error(`One or more requested serials are not available in IN_STOCK status at source warehouse.`);
          }
        } else {
          unitsToTransfer = await tx.serialNumber.findMany({
            where: {
              productId: data.productId,
              warehouseId: data.fromWarehouseId,
              currentStage: "IN_STOCK",
            },
            take: Number(data.quantity),
          });
        }

        for (const unit of unitsToTransfer) {
          await tx.serialNumber.update({
            where: { id: unit.id },
            data: { currentStage: "RESERVED", notes: `In transit to warehouse ${data.toWarehouseId} via transfer ${transfer.id}` },
          });

          if (tx.sKULifecycleEvent) {
            await tx.sKULifecycleEvent.create({
              data: {
                serialNumberId: unit.id,
                eventType: "RESERVED",
                sourceModule: "STOCK_TRANSFER",
                sourceId: transfer.id,
                fromWarehouseId: data.fromWarehouseId,
                toWarehouseId: data.toWarehouseId,
                fromStage: "IN_STOCK",
                toStage: "RESERVED",
                notes: `Dispatched in stock transfer ${transfer.id}`,
              },
            }).catch(() => {});
          }
        }
      }

      const [fromWh, toWh] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: data.fromWarehouseId } }),
        tx.warehouse.findUnique({ where: { id: data.toWarehouseId } }),
      ]);

      return {
        id: transfer.id,
        productId: transfer.productId,
        quantity: Number(transfer.quantity),
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        status: transfer.status as any,
        dispatchedAt: transfer.dispatchedAt,
        receivedAt: transfer.receivedAt,
        product: transfer.product ? { id: transfer.product.id, sku: transfer.product.sku, name: transfer.product.name } : null,
        fromWarehouse: fromWh ? { id: fromWh.id, code: fromWh.code, name: fromWh.name } : null,
        toWarehouse: toWh ? { id: toWh.id, code: toWh.code, name: toWh.name } : null,
      };
    });
  }

  async receiveStockTransfer(
    id: string,
    receivedQuantity?: number
  ): Promise<StockTransferDto> {
    return await this.prisma.$transaction(async (tx: any) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!transfer) {
        throw new Error(`Stock transfer ${id} not found.`);
      }

      if (transfer.status === "RECEIVED") {
        throw new Error(`Stock transfer ${id} has already been received.`);
      }

      const expectedQty = Number(transfer.quantity);
      const actualQty = receivedQuantity !== undefined ? Number(receivedQuantity) : expectedQty;
      const isDiscrepant = actualQty !== expectedQty;

      // Increment destination warehouse stock
      const destStock = await tx.stockLedger.findUnique({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
          },
        },
      });

      const currentDestQty = destStock ? Number(destStock.quantityOnHand) : 0;
      await tx.stockLedger.upsert({
        where: {
          productId_warehouseId: {
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
          },
        },
        update: {
          quantityOnHand: currentDestQty + actualQty,
        },
        create: {
          productId: transfer.productId,
          warehouseId: transfer.toWarehouseId,
          quantityOnHand: actualQty,
        },
      });

      // If product is SERIALIZED, transition physical units into destination warehouse
      if (transfer.product?.trackingType === "SERIALIZED" && tx.serialNumber) {
        const unitsInTransit = await tx.serialNumber.findMany({
          where: {
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            currentStage: "RESERVED",
          },
          take: actualQty,
        });

        for (const unit of unitsInTransit) {
          await tx.serialNumber.update({
            where: { id: unit.id },
            data: { currentStage: "IN_STOCK", warehouseId: transfer.toWarehouseId, notes: null },
          });

          if (tx.sKULifecycleEvent) {
            await tx.sKULifecycleEvent.create({
              data: {
                serialNumberId: unit.id,
                eventType: "IN_STOCK",
                sourceModule: "STOCK_TRANSFER",
                sourceId: transfer.id,
                fromWarehouseId: transfer.fromWarehouseId,
                toWarehouseId: transfer.toWarehouseId,
                fromStage: "RESERVED",
                toStage: "IN_STOCK",
                notes: `Received at destination warehouse via transfer ${transfer.id}`,
              },
            }).catch(() => {});
          }
        }
      }

      // Update transfer status
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: isDiscrepant ? "DISCREPANT" : "RECEIVED",
          receivedAt: new Date(),
        },
        include: {
          product: true,
        },
      });

      const [fromWh, toWh] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: updated.fromWarehouseId } }),
        tx.warehouse.findUnique({ where: { id: updated.toWarehouseId } }),
      ]);

      return {
        id: updated.id,
        productId: updated.productId,
        quantity: Number(updated.quantity),
        fromWarehouseId: updated.fromWarehouseId,
        toWarehouseId: updated.toWarehouseId,
        status: updated.status as any,
        dispatchedAt: updated.dispatchedAt,
        receivedAt: updated.receivedAt,
        product: updated.product ? { id: updated.product.id, sku: updated.product.sku, name: updated.product.name } : null,
        fromWarehouse: fromWh ? { id: fromWh.id, code: fromWh.code, name: fromWh.name } : null,
        toWarehouse: toWh ? { id: toWh.id, code: toWh.code, name: toWh.name } : null,
      };
    });
  }

  async listStockTransfers(filters?: {
    status?: string;
    warehouseId?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: StockTransferDto[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.warehouseId) {
      where.OR = [
        { fromWarehouseId: filters.warehouseId },
        { toWarehouseId: filters.warehouseId },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        include: { product: true },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { dispatchedAt: "desc" },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    // Fetch warehouse details
    const whIds = Array.from(
      new Set(rawItems.flatMap((i: any) => [i.fromWarehouseId, i.toWarehouseId]))
    ) as string[];
    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: whIds } },
    });
    const whMap = new Map(warehouses.map((w: any) => [w.id, w]));

    const items: StockTransferDto[] = rawItems.map((t: any) => {
      const fromWh: any = whMap.get(t.fromWarehouseId);
      const toWh: any = whMap.get(t.toWarehouseId);
      return {
        id: t.id,
        productId: t.productId,
        quantity: Number(t.quantity),
        fromWarehouseId: t.fromWarehouseId,
        toWarehouseId: t.toWarehouseId,
        status: t.status as any,
        dispatchedAt: t.dispatchedAt,
        receivedAt: t.receivedAt,
        product: t.product ? { id: t.product.id, sku: t.product.sku, name: t.product.name } : null,
        fromWarehouse: fromWh ? { id: fromWh.id, code: fromWh.code, name: fromWh.name } : null,
        toWarehouse: toWh ? { id: toWh.id, code: toWh.code, name: toWh.name } : null,
      };
    });

    return { items, total };
  }

  // ---------------------------------------------------------------------------
  // 4. Batches & Serial Numbers
  // ---------------------------------------------------------------------------
  async createBatch(data: CreateBatchRequest): Promise<BatchDto> {
    const batch = await this.prisma.batch.create({
      data: {
        productId: data.productId,
        batchCode: data.batchCode,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { product: true },
    });
    return {
      id: batch.id,
      productId: batch.productId,
      batchCode: batch.batchCode,
      expiryDate: batch.expiryDate,
      product: batch.product ? { id: batch.product.id, sku: batch.product.sku, name: batch.product.name } : null,
    };
  }

  async listBatches(productId?: string): Promise<BatchDto[]> {
    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;

    const batches = await this.prisma.batch.findMany({
      where,
      include: { product: true },
      orderBy: { batchCode: "asc" },
    });

    return batches.map((b: any) => ({
      id: b.id,
      productId: b.productId,
      batchCode: b.batchCode,
      expiryDate: b.expiryDate,
      product: b.product ? { id: b.product.id, sku: b.product.sku, name: b.product.name } : null,
    }));
  }

  async createSerialNumber(data: CreateSerialNumberRequest): Promise<SerialNumberDto> {
    const serial = await this.prisma.serialNumber.create({
      data: {
        productId: data.productId,
        serial: data.serial,
        barcode: data.barcode || null,
        warehouseId: data.warehouseId || null,
        purchaseOrderId: data.purchaseOrderId || null,
        grnId: data.grnId || null,
        grnLineId: data.grnLineId || null,
        notes: data.notes || null,
        currentStage: data.currentStage || "RECEIVED",
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    // Record initial SKULifecycleEvent
    await this.prisma.sKULifecycleEvent.create({
      data: {
        serialNumberId: serial.id,
        eventType: serial.currentStage,
        sourceModule: "INVENTORY",
        sourceId: serial.id,
        toWarehouseId: data.warehouseId || null,
        toStage: serial.currentStage,
      },
    });

    return {
      id: serial.id,
      productId: serial.productId,
      serial: serial.serial,
      barcode: serial.barcode,
      warehouseId: serial.warehouseId,
      purchaseOrderId: serial.purchaseOrderId,
      grnId: serial.grnId,
      grnLineId: serial.grnLineId,
      notes: serial.notes,
      currentStage: serial.currentStage as any,
      createdAt: serial.createdAt,
      updatedAt: serial.updatedAt,
      product: serial.product
        ? {
            id: serial.product.id,
            sku: serial.product.sku,
            name: serial.product.name,
            trackingType: serial.product.trackingType,
            modelNumber: serial.product.modelNumber,
            barcode: serial.product.barcode,
          }
        : null,
      warehouse: serial.warehouse
        ? {
            id: serial.warehouse.id,
            code: serial.warehouse.code,
            name: serial.warehouse.name,
          }
        : null,
    };
  }

  async getSerialHistory(serial: string): Promise<SerialNumberDto | null> {
    const record = await this.prisma.serialNumber.findFirst({
      where: {
        OR: [{ serial }, { barcode: serial }, { id: serial }],
      },
      include: {
        product: true,
        warehouse: true,
        events: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      productId: record.productId,
      serial: record.serial,
      barcode: record.barcode,
      warehouseId: record.warehouseId,
      purchaseOrderId: record.purchaseOrderId,
      grnId: record.grnId,
      grnLineId: record.grnLineId,
      notes: record.notes,
      currentStage: record.currentStage as any,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      product: record.product
        ? {
            id: record.product.id,
            sku: record.product.sku,
            name: record.product.name,
            trackingType: record.product.trackingType,
            modelNumber: record.product.modelNumber,
            barcode: record.product.barcode,
          }
        : null,
      warehouse: record.warehouse
        ? {
            id: record.warehouse.id,
            code: record.warehouse.code,
            name: record.warehouse.name,
          }
        : null,
      events: record.events.map((e: any) => ({
        id: e.id,
        serialNumberId: e.serialNumberId,
        eventType: e.eventType,
        sourceModule: e.sourceModule,
        sourceId: e.sourceId,
        fromWarehouseId: e.fromWarehouseId,
        toWarehouseId: e.toWarehouseId,
        fromStage: e.fromStage,
        toStage: e.toStage,
        notes: e.notes,
        performedById: e.performedById,
        occurredAt: e.occurredAt,
      })),
    };
  }

  async listSerialNumbers(filters?: {
    productId?: string;
    warehouseId?: string;
    stage?: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: SerialNumberDto[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters?.stage) where.currentStage = filters.stage;
    if (filters?.search) {
      where.OR = [
        { serial: { contains: filters.search, mode: "insensitive" } },
        { barcode: { contains: filters.search, mode: "insensitive" } },
        { product: { name: { contains: filters.search, mode: "insensitive" } } },
        { product: { sku: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.serialNumber.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
        },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.serialNumber.count({ where }),
    ]);

    return {
      items: items.map((s: any) => ({
        id: s.id,
        productId: s.productId,
        serial: s.serial,
        barcode: s.barcode,
        warehouseId: s.warehouseId,
        purchaseOrderId: s.purchaseOrderId,
        grnId: s.grnId,
        grnLineId: s.grnLineId,
        notes: s.notes,
        currentStage: s.currentStage as any,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        product: s.product
          ? {
              id: s.product.id,
              sku: s.product.sku,
              name: s.product.name,
              trackingType: s.product.trackingType,
              modelNumber: s.product.modelNumber,
              barcode: s.product.barcode,
            }
          : null,
        warehouse: s.warehouse
          ? {
              id: s.warehouse.id,
              code: s.warehouse.code,
              name: s.warehouse.name,
            }
          : null,
      })),
      total,
    };
  }

  async scanBarcode(request: BarcodeScanRequest): Promise<BarcodeScanResultDto> {
    const code = (request.code || "").trim();
    if (!code) {
      return {
        matchedType: "UNKNOWN",
        query: code,
        isValid: false,
        validationMessage: "Barcode or code cannot be empty",
      };
    }

    // 1. Check if code matches an individual SerialNumber unit (by serial or barcode)
    const serialRecord = await this.prisma.serialNumber.findFirst({
      where: {
        OR: [{ serial: code }, { barcode: code }],
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        warehouse: true,
      },
    });

    if (serialRecord) {
      let isValid = true;
      let validationMessage: string | undefined;

      const op = request.intendedOperation;
      if (op === "RECEIVE") {
        if (serialRecord.currentStage === "IN_STOCK") {
          isValid = false;
          validationMessage = `Unit ${serialRecord.serial} is already in stock in warehouse "${serialRecord.warehouse?.name || 'Unknown'}"`;
        }
      } else if (op === "DISPATCH" || op === "SELL") {
        if (serialRecord.currentStage !== "IN_STOCK") {
          isValid = false;
          validationMessage = `Unit ${serialRecord.serial} is in stage "${serialRecord.currentStage}" (must be IN_STOCK)`;
        } else if (request.warehouseId && serialRecord.warehouseId && serialRecord.warehouseId !== request.warehouseId) {
          isValid = false;
          validationMessage = `Unit ${serialRecord.serial} is located in warehouse "${serialRecord.warehouse?.name || serialRecord.warehouseId}", not in current selected warehouse`;
        }
      } else if (op === "TRANSFER") {
        if (serialRecord.currentStage !== "IN_STOCK") {
          isValid = false;
          validationMessage = `Unit ${serialRecord.serial} cannot be transferred because it is in stage "${serialRecord.currentStage}"`;
        } else if (request.warehouseId && serialRecord.warehouseId && serialRecord.warehouseId !== request.warehouseId) {
          isValid = false;
          validationMessage = `Unit ${serialRecord.serial} is not in the source warehouse`;
        }
      }

      const unitPayload = {
        id: serialRecord.id,
        serial: serialRecord.serial,
        barcode: serialRecord.barcode,
        currentStage: serialRecord.currentStage as any,
        warehouseId: serialRecord.warehouseId,
        warehouseName: serialRecord.warehouse?.name || null,
        warehouse: serialRecord.warehouse ? { id: serialRecord.warehouse.id, name: serialRecord.warehouse.name } : null,
        notes: serialRecord.notes,
      };

      return {
        found: true,
        matchedType: "SERIALIZED_UNIT",
        trackingType: "SERIALIZED",
        query: code,
        isValid,
        validationMessage,
        product: serialRecord.product
          ? {
              id: serialRecord.product.id,
              sku: serialRecord.product.sku,
              name: serialRecord.product.name,
              trackingType: "SERIALIZED",
              modelNumber: serialRecord.product.modelNumber ?? null,
              barcode: serialRecord.product.barcode ?? null,
              costPrice: serialRecord.product.costPrice?.toString(),
              sellingPrice: serialRecord.product.sellingPrice?.toString(),
              category: serialRecord.product.category
                ? { id: serialRecord.product.category.id, name: serialRecord.product.category.name }
                : null,
            }
          : null,
        unit: unitPayload,
        serialNumber: unitPayload,
        availableStock: serialRecord.currentStage === "IN_STOCK" ? 1 : 0,
        availableStockInWarehouse: serialRecord.currentStage === "IN_STOCK" ? 1 : 0,
      };
    }

    // 2. Not found as SerialNumber -> check Product (by barcode, sku, or modelNumber)
    const productRecord = await this.prisma.product.findFirst({
      where: {
        OR: [{ barcode: code }, { sku: code }, { modelNumber: code }],
      },
      include: {
        category: true,
        stockLedgers: true,
      },
    });

    if (productRecord) {
      const isSerialized = productRecord.trackingType === "SERIALIZED";

      let availableStock = 0;
      if (request.warehouseId) {
        const sl = (productRecord.stockLedgers || []).find((l: any) => l.warehouseId === request.warehouseId);
        availableStock = sl ? Number(sl.quantityOnHand) : 0;
      } else {
        availableStock = (productRecord.stockLedgers || []).reduce(
          (sum: number, l: any) => sum + Number(l.quantityOnHand),
          0
        );
      }

      if (isSerialized) {
        const isValid = request.intendedOperation === "RECEIVE";
        const validationMessage = `This is product model "${productRecord.name}" (${productRecord.sku}). For physical tracking, please scan or paste the individual unit serial number or barcode.`;

        return {
          found: true,
          matchedType: "SERIALIZED_UNIT",
          trackingType: "SERIALIZED",
          query: code,
          isValid,
          validationMessage,
          product: {
            id: productRecord.id,
            sku: productRecord.sku,
            name: productRecord.name,
            trackingType: "SERIALIZED",
            modelNumber: productRecord.modelNumber ?? null,
            barcode: productRecord.barcode ?? null,
            costPrice: productRecord.costPrice?.toString(),
            sellingPrice: productRecord.sellingPrice?.toString(),
            category: productRecord.category
              ? { id: productRecord.category.id, name: productRecord.category.name }
              : null,
          },
          unit: null,
          serialNumber: null,
          availableStock,
          availableStockInWarehouse: availableStock,
        };
      }

      // Bulk Non-Serialized Product
      let isValid = true;
      let validationMessage: string | undefined;

      if (request.intendedOperation === "DISPATCH" || request.intendedOperation === "SELL") {
        if (availableStock <= 0) {
          isValid = false;
          validationMessage = `Product "${productRecord.name}" has 0 quantity on hand in the selected warehouse`;
        }
      }

      return {
        found: true,
        matchedType: "BULK_PRODUCT",
        trackingType: "NON_SERIALIZED",
        query: code,
        isValid,
        validationMessage,
        product: {
          id: productRecord.id,
          sku: productRecord.sku,
          name: productRecord.name,
          trackingType: "NON_SERIALIZED",
          modelNumber: productRecord.modelNumber ?? null,
          barcode: productRecord.barcode ?? null,
          costPrice: productRecord.costPrice?.toString(),
          sellingPrice: productRecord.sellingPrice?.toString(),
          category: productRecord.category
            ? { id: productRecord.category.id, name: productRecord.category.name }
            : null,
        },
        unit: null,
        serialNumber: null,
        availableStock,
        availableStockInWarehouse: availableStock,
      };
    }

    // 3. Not found
    return {
      found: false,
      matchedType: "UNKNOWN",
      trackingType: undefined,
      query: code,
      isValid: false,
      validationMessage: `Barcode or serial number "${code}" not found in system`,
      product: null,
      unit: null,
      serialNumber: null,
      availableStock: 0,
      availableStockInWarehouse: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Damage & Loss Reports (Module 74)
  // ---------------------------------------------------------------------------
  async createDamageLossReport(
    data: CreateDamageLossReportRequest & { reportedById: string }
  ): Promise<DamageLossReportDto> {
    const reportNumber = `DLR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const grossLoss = data.lines.reduce(
      (sum, l) => sum + Number(l.costBasis) * Number(l.quantity),
      0
    );

    const report = await this.prisma.damageLossReport.create({
      data: {
        reportNumber,
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        reason: data.reason,
        evidenceFileId: data.evidenceFileId,
        status: "REPORTED",
        grossLoss,
        recovery: 0,
        netLoss: grossLoss,
        reportedById: data.reportedById,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            serialNumberId: l.serialNumberId,
            quantity: l.quantity,
            costBasis: l.costBasis,
          })),
        },
      },
      include: {
        warehouse: true,
        lines: {
          include: {
            product: true,
            serialNumber: true,
          },
        },
      },
    });

    return {
      id: report.id,
      reportNumber: report.reportNumber,
      branchId: report.branchId,
      warehouseId: report.warehouseId,
      reason: report.reason,
      evidenceFileId: report.evidenceFileId,
      status: report.status as any,
      disposition: report.disposition as any,
      grossLoss: Number(report.grossLoss),
      recovery: Number(report.recovery),
      netLoss: Number(report.netLoss),
      reportedById: report.reportedById,
      approvedById: report.approvedById,
      createdAt: report.createdAt,
      warehouse: report.warehouse ? { id: report.warehouse.id, code: report.warehouse.code, name: report.warehouse.name } : null,
      lines: report.lines.map((l: any) => ({
        id: l.id,
        reportId: l.reportId,
        productId: l.productId,
        serialNumberId: l.serialNumberId,
        quantity: Number(l.quantity),
        costBasis: Number(l.costBasis),
        product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : null,
        serialNumber: l.serialNumber ? { id: l.serialNumber.id, serial: l.serialNumber.serial } : null,
      })),
    };
  }

  async approveDamageLossReport(
    id: string,
    approvedById: string,
    disposition: DamageLossDisposition
  ): Promise<DamageLossReportDto> {
    return await this.prisma.$transaction(async (tx: any) => {
      const report = await tx.damageLossReport.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!report) throw new Error(`Report ${id} not found.`);
      if (report.reportedById === approvedById) {
        throw new Error("Self-approval is forbidden. Another manager must approve this report.");
      }
      if (report.status !== "REPORTED" && report.status !== "PENDING_APPROVAL") {
        throw new Error(`Report ${id} is already in status ${report.status}`);
      }

      // If disposition is SCRAP or WRITE_OFF, deduct stock from warehouse
      if (disposition === "SCRAP" || disposition === "WRITE_OFF") {
        for (const line of report.lines) {
          const stock = await tx.stockLedger.findUnique({
            where: {
              productId_warehouseId: {
                productId: line.productId,
                warehouseId: report.warehouseId,
              },
            },
          });
          if (stock) {
            const newOnHand = Math.max(0, Number(stock.quantityOnHand) - Number(line.quantity));
            await tx.stockLedger.update({
              where: { id: stock.id },
              data: { quantityOnHand: newOnHand },
            });
          }
        }
      }

      const updated = await tx.damageLossReport.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById,
          disposition,
        },
        include: {
          warehouse: true,
          lines: {
            include: { product: true, serialNumber: true },
          },
        },
      });

      return {
        id: updated.id,
        reportNumber: updated.reportNumber,
        branchId: updated.branchId,
        warehouseId: updated.warehouseId,
        reason: updated.reason,
        evidenceFileId: updated.evidenceFileId,
        status: updated.status as any,
        disposition: updated.disposition as any,
        grossLoss: Number(updated.grossLoss),
        recovery: Number(updated.recovery),
        netLoss: Number(updated.netLoss),
        reportedById: updated.reportedById,
        approvedById: updated.approvedById,
        createdAt: updated.createdAt,
        warehouse: updated.warehouse ? { id: updated.warehouse.id, code: updated.warehouse.code, name: updated.warehouse.name } : null,
        lines: updated.lines.map((l: any) => ({
          id: l.id,
          reportId: l.reportId,
          productId: l.productId,
          serialNumberId: l.serialNumberId,
          quantity: Number(l.quantity),
          costBasis: Number(l.costBasis),
          product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : null,
          serialNumber: l.serialNumber ? { id: l.serialNumber.id, serial: l.serialNumber.serial } : null,
        })),
      };
    });
  }

  async listDamageLossReports(filters?: { warehouseId?: string; status?: string; skip?: number; take?: number }): Promise<{ items: DamageLossReportDto[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (filters?.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters?.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.damageLossReport.findMany({
        where,
        include: {
          warehouse: true,
          lines: {
            include: { product: true, serialNumber: true },
          },
        },
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.damageLossReport.count({ where }),
    ]);

    return {
      items: items.map((r: any) => ({
        id: r.id,
        reportNumber: r.reportNumber,
        branchId: r.branchId,
        warehouseId: r.warehouseId,
        reason: r.reason,
        evidenceFileId: r.evidenceFileId,
        status: r.status as any,
        disposition: r.disposition as any,
        grossLoss: Number(r.grossLoss),
        recovery: Number(r.recovery),
        netLoss: Number(r.netLoss),
        reportedById: r.reportedById,
        approvedById: r.approvedById,
        createdAt: r.createdAt,
        warehouse: r.warehouse ? { id: r.warehouse.id, code: r.warehouse.code, name: r.warehouse.name } : null,
        lines: r.lines.map((l: any) => ({
          id: l.id,
          reportId: l.reportId,
          productId: l.productId,
          serialNumberId: l.serialNumberId,
          quantity: Number(l.quantity),
          costBasis: Number(l.costBasis),
          product: l.product ? { id: l.product.id, sku: l.product.sku, name: l.product.name } : null,
          serialNumber: l.serialNumber ? { id: l.serialNumber.id, serial: l.serialNumber.serial } : null,
        })),
      })),
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. Inventory Stats
  // ---------------------------------------------------------------------------
  async getInventoryStats(): Promise<InventoryStatsDto> {
    const [ledgers, activeTransfersCount, damageLossReportsCount] = await Promise.all([
      this.prisma.stockLedger.findMany({
        include: {
          product: true,
        },
      }),
      this.prisma.stockTransfer.count({
        where: { status: { in: ["DISPATCHED", "IN_TRANSIT"] } },
      }),
      this.prisma.damageLossReport.count({
        where: { status: "REPORTED" },
      }),
    ]);

    let totalItemsInStock = 0;
    let totalValuation = 0;
    let lowStockItemsCount = 0;

    for (const item of ledgers) {
      const qty = Number(item.quantityOnHand);
      totalItemsInStock += qty;
      const cost = item.product?.costPrice ? Number(item.product.costPrice) : 0;
      totalValuation += qty * cost;

      if (item.product?.reorderLevel && qty <= Number(item.product.reorderLevel)) {
        lowStockItemsCount++;
      }
    }

    return {
      totalItemsInStock,
      totalValuation: Number(totalValuation.toFixed(2)),
      lowStockItemsCount,
      activeTransfersCount,
      damageLossReportsCount,
    };
  }
}
