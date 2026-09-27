const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.product.findMany({
    include: {
      stockLedgers: {
        include: { warehouse: true }
      },
      brand: true,
      category: true,
      unit: true
    }
  });

  console.log('Total Products in DB:', products.length);
  for (const p of products) {
    const totalStock = p.stockLedgers.reduce((sum, sl) => sum + Number(sl.quantityOnHand), 0);
    const whSummary = p.stockLedgers.map(s => s.warehouse.name + ': ' + s.quantityOnHand).join(', ') || 'No stock ledger entry';
    console.log(`- [${p.sku}] ${p.name} | Selling Price: BDT ${p.sellingPrice} | Total Stock: ${totalStock} (${whSummary})`);
  }

  const warehouses = await prisma.warehouse.findMany();
  console.log('\nTotal Warehouses in DB:', warehouses.length);
  for (const w of warehouses) {
    console.log(`- ${w.name} (${w.code}) BranchId: ${w.branchId}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
