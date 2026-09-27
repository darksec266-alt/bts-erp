const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'PurchaseOrder';
  `);
  console.log("Columns of PurchaseOrder:", cols);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
