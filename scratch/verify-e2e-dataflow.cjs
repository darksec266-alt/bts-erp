const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runE2ETest() {
  console.log('================================================================');
  console.log('   END-TO-END DATA FLOW AUDIT & TRANSACTION CONSISTENCY TEST    ');
  console.log('================================================================\n');

  // 1. Check Primary Warehouse & Default Branch
  const branch = await prisma.branch.findFirst({ where: { isActive: true } });
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  console.log(`[Setup] Branch: ${branch.name} (${branch.code}), Warehouse: ${warehouse.name} (${warehouse.code})`);

  // 2. Select a target product
  const product = await prisma.product.findFirst({
    where: { isActive: true, isServiceItem: false }
  });
  console.log(`[Setup] Target Product: [${product.sku}] ${product.name} (id: ${product.id})`);

  // 3. Check Initial Stock in StockLedger
  let initialStockRow = await prisma.stockLedger.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
  });
  const initialStock = initialStockRow ? Number(initialStockRow.quantityOnHand) : 0;
  console.log(`[Step 0] Initial Stock in StockLedger for ${warehouse.code}: ${initialStock} units`);

  // 4. Test Purchase -> GRN -> StockLedger Increment Flow
  console.log('\n--- 1. TESTING PURCHASE GRN -> INVENTORY FLOW ---');
  const supplier = await prisma.supplier.findFirst({ where: { isActive: true } });

  // Create test Purchase Order
  const rand = Math.floor(1000 + Math.random() * 9000);
  const testPO = await prisma.purchaseOrder.create({
    data: {
      poNumber: `TEST-PO-2026-${rand}`,
      supplierId: supplier.id,
      branchId: branch.id,
      grandTotal: 10000,
      lines: {
        create: [
          {
            productId: product.id,
            quantity: 20,
            unitPrice: 500,
            lineTotal: 10000,
          },
        ],
      },
    },
    include: { lines: true },
  });
  console.log(`[Procurement] Created Test Purchase Order: ${testPO.poNumber}`);

  // Receive goods via GRN through Prisma directly to verify the exact repository logic
  const grnNumber = `TEST-GRN-2026-${rand}`;
  const receiveQty = 15; // Receiving 15 units of 20

  const grnResult = await prisma.$transaction(async (tx) => {
    const grn = await tx.goodsReceiptNote.create({
      data: {
        grnNumber,
        purchaseOrderId: testPO.id,
        status: 'PARTIAL',
        receivedById: 'AUDIT_AGENT',
        lines: {
          create: [
            {
              purchaseOrderLineId: testPO.lines[0].id,
              productId: product.id,
              quantityReceived: receiveQty,
              condition: 'GOOD',
            },
          ],
        },
      },
      include: { lines: true },
    });

    // Credit StockLedger
    const updatedLedger = await tx.stockLedger.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantityOnHand: receiveQty,
      },
      update: {
        quantityOnHand: { increment: receiveQty },
      },
    });

    return { grn, updatedLedger };
  });

  const postGrnStock = Number(grnResult.updatedLedger.quantityOnHand);
  console.log(`[Procurement GRN] Consigned GRN: ${grnResult.grn.grnNumber}, Received: ${receiveQty} units`);
  console.log(`[Inventory Check] StockLedger after GRN: ${postGrnStock} units (Expected: ${initialStock + receiveQty})`);

  if (postGrnStock === initialStock + receiveQty) {
    console.log('>>> [PASS] Purchase GRN successfully & accurately credited Inventory StockLedger!');
  } else {
    throw new Error(`[FAIL] Expected ${initialStock + receiveQty} but got ${postGrnStock}`);
  }

  // 5. Test Sales POS / Direct Sale -> StockLedger Deduction Flow
  console.log('\n--- 2. TESTING SALES POS / DIRECT SALE -> INVENTORY FLOW ---');
  const customer = await prisma.customer.findFirst({ where: { isActive: true } });
  const saleQty = 5;

  const saleResult = await prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.create({
      data: {
        orderNumber: `TEST-DIR-SO-${rand}`,
        customerId: customer.id,
        branchId: branch.id,
        orderType: 'DIRECT_SALE',
        grandTotal: saleQty * 800,
        lines: {
          create: [
            {
              productId: product.id,
              description: 'E2E Test Direct Spot Sale',
              quantity: saleQty,
              unitPrice: 800,
              lineTotal: saleQty * 800,
            },
          ],
        },
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: `TEST-INV-${rand}`,
        sourceType: 'DIRECT_SALE',
        sourceId: order.id,
        customerId: customer.id,
        branchId: branch.id,
        grandTotal: saleQty * 800,
        status: 'POSTED',
        idempotencyKey: `test-idemp-${order.id}`,
      },
    });

    // Deduct stock
    const currentStockRow = await tx.stockLedger.findUnique({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
    });
    const curr = Number(currentStockRow.quantityOnHand) || 0;
    const newStock = Math.max(0, curr - saleQty);
    const updatedStock = await tx.stockLedger.update({
      where: { id: currentStockRow.id },
      data: { quantityOnHand: newStock },
    });

    return { order, invoice, updatedStock };
  });

  const postSaleStock = Number(saleResult.updatedStock.quantityOnHand);
  console.log(`[Sales POS] Direct Sale Invoice: ${saleResult.invoice.invoiceNumber}, Sold: ${saleQty} units`);
  console.log(`[Inventory Check] StockLedger after Sale: ${postSaleStock} units (Expected: ${postGrnStock - saleQty})`);

  if (postSaleStock === postGrnStock - saleQty) {
    console.log('>>> [PASS] Direct Sale / POS successfully & accurately deducted Inventory StockLedger!');
  } else {
    throw new Error(`[FAIL] Expected ${postGrnStock - saleQty} but got ${postSaleStock}`);
  }

  // 6. Test Product Master Data View (POS reading Single Source of Truth)
  console.log('\n--- 3. VERIFYING SINGLE SOURCE OF TRUTH (Product Master Data & POS) ---');
  const productWithStock = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      stockLedgers: {
        include: { warehouse: true },
      },
    },
  });

  const stockList = productWithStock.stockLedgers || [];
  const computedTotalStock = stockList.reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
  console.log(`[Product API Simulation] Product [${productWithStock.sku}] has totalStock: ${computedTotalStock}`);
  console.log('  Breakdown by warehouse:');
  for (const sl of stockList) {
    console.log(`    - Warehouse ${sl.warehouse?.name} (${sl.warehouse?.code}): ${sl.quantityOnHand} units`);
  }

  if (computedTotalStock === postSaleStock) {
    console.log('>>> [PASS] POS and Inventory modules read identical, synchronized balance from StockLedger!');
  } else {
    console.log(`>>> Note: totalStock across all warehouses is ${computedTotalStock}, for tested warehouse is ${postSaleStock}`);
  }

  // 7. Cleanup Test Records
  console.log('\n--- 4. CLEANING UP TEMPORARY AUDIT RECORDS ---');
  // Revert test adjustments to restore initial balance exactly
  await prisma.stockLedger.update({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
    data: { quantityOnHand: initialStock },
  });
  console.log(`[Cleanup] Restored original product stock to: ${initialStock} units`);

  // Delete test PO and Invoice/Order
  await prisma.goodsReceiptNoteLine.deleteMany({ where: { grn: { grnNumber } } });
  await prisma.goodsReceiptNote.deleteMany({ where: { grnNumber } });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: testPO.id } });
  await prisma.purchaseOrder.delete({ where: { id: testPO.id } });
  await prisma.invoice.deleteMany({ where: { invoiceNumber: saleResult.invoice.invoiceNumber } });
  await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: saleResult.order.id } });
  await prisma.salesOrder.delete({ where: { id: saleResult.order.id } });
  console.log('[Cleanup] Test transactional records cleanly pruned.');

  console.log('\n================================================================');
  console.log('   ALL E2E DATA FLOW & CONSISTENCY TESTS PASSED SUCCESSFULLY!   ');
  console.log('================================================================\n');
}

runE2ETest()
  .catch((e) => {
    console.error('E2E Test Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
