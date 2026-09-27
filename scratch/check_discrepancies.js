const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grns = await prisma.goodsReceiptNote.findMany({
    include: {
      lines: {
        include: { product: true }
      },
      purchaseOrder: {
        include: { branch: true }
      }
    }
  });

  console.log(`Checking ${grns.length} GRNs...`);
  let issues = 0;
  for (const grn of grns) {
    if (grn.status === 'COMPLETE' || grn.status === 'PARTIAL') {
      for (const line of grn.lines) {
        const qty = Number(line.quantityReceived);
        if (qty > 0 && line.condition !== 'DAMAGED' && line.condition !== 'WRONG_SKU') {
          // Check if StockLedger has records for this product
          const stocks = await prisma.stockLedger.findMany({
            where: { productId: line.productId }
          });
          const totalStock = stocks.reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
          if (stocks.length === 0 || totalStock === 0) {
            console.log(`⚠️ DISCREPANCY: GRN ${grn.grnNumber} received ${qty} of ${line.product?.sku} (${line.productId}), but StockLedger has totalStock: ${totalStock}!`);
            issues++;
          }
        }
      }
    }
  }
  console.log(`Discrepancy audit complete: ${issues} issues found.`);
  await prisma.$disconnect();
}
main().catch(console.error);
