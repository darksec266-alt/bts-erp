const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const prodCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Product'
    ORDER BY ordinal_position;
  `);
  console.log('Product columns:', prodCols);

  const serialCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'SerialNumber'
    ORDER BY ordinal_position;
  `);
  console.log('SerialNumber columns:', serialCols);

  const grnLineCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'GoodsReceiptNoteLine'
    ORDER BY ordinal_position;
  `);
  console.log('GoodsReceiptNoteLine columns:', grnLineCols);

  const eventCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'SKULifecycleEvent'
    ORDER BY ordinal_position;
  `);
  console.log('SKULifecycleEvent columns:', eventCols);

  await prisma.$disconnect();
}

check().catch(console.error);
