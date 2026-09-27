const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SYNCING WAREHOUSES & RECONCILING HISTORICAL GRN STOCK ===\n');

  // 1. Get default branch
  const branch = await prisma.branch.findFirst({ where: { isActive: true } });
  if (!branch) {
    console.error('No active branch found!');
    return;
  }
  console.log(`Using branch: ${branch.name} (${branch.code}, id: ${branch.id})`);

  // 2. Link warehouses to this branch if branchId is null
  const warehouses = await prisma.warehouse.findMany();
  for (const wh of warehouses) {
    if (!wh.branchId) {
      await prisma.warehouse.update({
        where: { id: wh.id },
        data: { branchId: branch.id },
      });
      console.log(`Linked warehouse ${wh.name} (${wh.code}) to branch ${branch.code}`);
    }
  }

  // 3. Find default primary warehouse (e.g. WH-01)
  const primaryWarehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { code: 'asc' }
  });
  console.log(`Primary warehouse for historical GRN backfill: ${primaryWarehouse.name} (${primaryWarehouse.code})`);

  // 4. Find all GRNs and calculate historical received quantities
  const grns = await prisma.goodsReceiptNote.findMany({
    include: {
      lines: {
        include: { product: true }
      },
      purchaseOrder: true
    }
  });
  console.log(`Found ${grns.length} existing Goods Receipt Notes.`);

  const productTotals = new Map();
  for (const grn of grns) {
    console.log(`Processing GRN ${grn.grnNumber} (Status: ${grn.status}):`);
    for (const line of grn.lines) {
      const qty = Number(line.quantityReceived) || 0;
      if (qty > 0 && line.condition !== 'DAMAGED' && line.condition !== 'WRONG_SKU') {
        const current = productTotals.get(line.productId) || { name: line.product?.name, sku: line.product?.sku, qty: 0 };
        current.qty += qty;
        productTotals.set(line.productId, current);
        console.log(`  + [${line.product?.sku}] ${line.product?.name}: received ${qty} units in ${line.condition} condition`);
      }
    }
  }

  console.log('\n--- Calculated Historical Stock Totals ---');
  for (const [productId, info] of productTotals.entries()) {
    console.log(`  Product [${info.sku}] ${info.name}: total received = ${info.qty} units`);

    // Upsert into StockLedger
    const ledger = await prisma.stockLedger.upsert({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: primaryWarehouse.id,
        },
      },
      update: {
        quantityOnHand: info.qty,
      },
      create: {
        productId,
        warehouseId: primaryWarehouse.id,
        quantityOnHand: info.qty,
      },
    });

    console.log(`  => StockLedger updated for warehouse ${primaryWarehouse.code}: quantityOnHand = ${ledger.quantityOnHand}`);
  }

  // 5. Verify stock count now
  const totalStockRows = await prisma.stockLedger.count();
  console.log(`\nReconciliation Complete! Total active StockLedger records: ${totalStockRows}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
