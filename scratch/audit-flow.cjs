const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDITING INVENTORY & SALES DATA FLOW ===\n');

  // 1. Warehouses
  const warehouses = await prisma.warehouse.findMany();
  console.log(`1. Warehouses found (${warehouses.length}):`, warehouses.map(w => ({ id: w.id, code: w.code, name: w.name, branchId: w.branchId })));

  // 2. StockLedger entries
  const stockCount = await prisma.stockLedger.count();
  const sampleStock = await prisma.stockLedger.findMany({
    include: { product: true, warehouse: true },
    take: 10,
  });
  console.log(`\n2. StockLedger count: ${stockCount}`);
  for (const s of sampleStock) {
    console.log(`  - [${s.product?.sku}] ${s.product?.name} at [${s.warehouse?.name}]: qty=${s.quantityOnHand}`);
  }

  // 3. Products
  const products = await prisma.product.findMany({
    include: {
      stockLedgers: {
        include: { warehouse: true }
      }
    },
    take: 5
  });
  console.log(`\n3. Sample Products (${products.length}):`);
  for (const p of products) {
    const totalQty = (p.stockLedgers || []).reduce((sum, sl) => sum + Number(sl.quantityOnHand), 0);
    console.log(`  - [${p.sku}] ${p.name}: totalStock=${totalQty}, stockLedgers count=${p.stockLedgers?.length}`);
  }

  // 4. GRNs (Purchases received)
  const grns = await prisma.goodsReceiptNote.findMany({
    include: {
      lines: { include: { product: true } },
      purchaseOrder: { include: { branch: true } }
    },
    take: 5
  });
  console.log(`\n4. Sample GRNs (${grns.length}):`);
  for (const g of grns) {
    console.log(`  - GRN: ${g.grnNumber} (PO: ${g.purchaseOrder?.poNumber}, Branch: ${g.purchaseOrder?.branch?.name}, Status: ${g.status})`);
    for (const l of g.lines) {
      console.log(`      Line: [${l.product?.sku}] ${l.product?.name} -> qtyReceived=${l.quantityReceived}, condition=${l.condition}`);
    }
  }

  // 5. Invoices / Direct Sales
  const invoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { id: 'desc' }
  });
  console.log(`\n5. Sample Invoices (${invoices.length}):`);
  for (const inv of invoices) {
    console.log(`  - Invoice: ${inv.invoiceNumber}, Source: ${inv.sourceType} (${inv.sourceId}), Total: ${inv.grandTotal}, Status: ${inv.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
