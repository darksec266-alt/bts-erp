const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const pc = await prisma.product.count();
  const catc = await prisma.category.count();
  const subc = await prisma.subCategory.count();
  const snc = await prisma.serialNumber.count();
  const slc = await prisma.stockLedger.count();
  const pos = await prisma.purchaseOrder.count();
  const grns = await prisma.goodsReceiptNote.count();

  const serializedProducts = await prisma.product.count({ where: { trackingType: "SERIALIZED" } });
  const bulkProducts = await prisma.product.count({ where: { trackingType: "NON_SERIALIZED" } });

  console.log("DATABASE_COUNTS:", JSON.stringify({
    products: pc,
    serializedProducts,
    bulkProducts,
    categories: catc,
    subcategories: subc,
    serialNumbers: snc,
    stockLedgers: slc,
    purchaseOrders: pos,
    goodsReceiptNotes: grns,
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
