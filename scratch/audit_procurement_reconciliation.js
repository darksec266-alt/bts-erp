const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PROCUREMENT & INVENTORY RECONCILIATION AUDIT ===');

  const suppliersCount = await prisma.supplier.count();
  const prsCount = await prisma.purchaseRequest.count();
  const pos = await prisma.purchaseOrder.findMany({
    include: {
      lines: {
        include: {
          grnLines: {
            include: { grn: true }
          },
          product: true
        }
      },
      grns: {
        include: { lines: true }
      }
    }
  });

  const grns = await prisma.goodsReceiptNote.findMany({
    include: {
      lines: {
        include: { product: true }
      },
      purchaseOrder: true
    }
  });

  const stockLedgers = await prisma.stockLedger.findMany({
    include: { product: true, warehouse: true }
  });

  const serials = await prisma.serialNumber.findMany({
    include: { product: true, warehouse: true }
  });

  console.log(`Total Suppliers in DB: ${suppliersCount}`);
  console.log(`Total Purchase Requests in DB: ${prsCount}`);
  console.log(`Total Purchase Orders in DB: ${pos.length}`);
  console.log(`Total GRNs in DB: ${grns.length}`);
  console.log(`Total StockLedger records in DB: ${stockLedgers.length}`);
  console.log(`Total Serial Numbers in DB: ${serials.length}`);

  console.log('\n--- PO & GRN Breakdown ---');
  for (const po of pos) {
    let ordered = 0;
    let received = 0;
    for (const l of po.lines) {
      ordered += Number(l.quantity) || 0;
      const lRcvd = (l.grnLines || [])
        .filter(gl => gl.grn && gl.grn.status !== 'CANCELLED' && gl.condition !== 'DAMAGED' && gl.condition !== 'WRONG_SKU')
        .reduce((s, gl) => s + (Number(gl.quantityReceived) || 0), 0);
      received += lRcvd;
    }
    console.log(`PO: ${po.poNumber} (ID: ${po.id}) -> Ordered: ${ordered}, Received: ${received}, Remaining: ${ordered - received}, GRNs: ${po.grns.length}`);
  }

  console.log('\n--- GRN Status Breakdown ---');
  for (const g of grns) {
    const totalLinesQty = g.lines.reduce((s, l) => s + Number(l.quantityReceived || 0), 0);
    console.log(`GRN: ${g.grnNumber} (PO: ${g.purchaseOrder?.poNumber || g.purchaseOrderId}) -> Status: ${g.status}, Lines: ${g.lines.length}, Total Qty: ${totalLinesQty}`);
  }

  console.log('\n--- Current Stock Ledger ---');
  for (const sl of stockLedgers) {
    console.log(`Product: ${sl.product?.sku} (${sl.product?.name}) @ ${sl.warehouse?.name} -> QtyOnHand: ${sl.quantityOnHand}`);
  }

  console.log('\n--- Current Serial Numbers Stage Breakdown ---');
  const stageCounts = {};
  for (const s of serials) {
    stageCounts[s.currentStage] = (stageCounts[s.currentStage] || 0) + 1;
  }
  console.log(stageCounts);

  await prisma.$disconnect();
}

main().catch(console.error);
