const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grnCols = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'GoodsReceiptNote'`;
  console.log('GoodsReceiptNote columns:', grnCols);

  const poCols = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PurchaseOrder'`;
  console.log('PurchaseOrder columns:', poCols);

  const stockLedgerCols = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'StockLedger'`;
  console.log('StockLedger columns:', stockLedgerCols);

  await prisma.$disconnect();
}
main().catch(console.error);
