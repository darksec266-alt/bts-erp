const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStock() {
  console.log('--- Seeding Stock Ledgers ---');
  
  const warehouses = await prisma.warehouse.findMany();
  const dhakaWh = warehouses.find(w => w.code === 'WH-DHK-01') || warehouses[0];
  const ctgWh = warehouses.find(w => w.code === 'WH-CTG-01') || warehouses[1];

  const stockMap = {
    'SCH-ACB-4000': { dhaka: 15, ctg: 5 },
    'SIE-PLC-S71500': { dhaka: 25, ctg: 10 },
    'HIK-IP-8MP': { dhaka: 120, ctg: 60 },
    'HIK-NVR-32CH': { dhaka: 30, ctg: 15 },
    'CIS-CAT-9300': { dhaka: 18, ctg: 8 },
    'MKT-CCR-2004': { dhaka: 40, ctg: 20 },
    'ABB-VFD-15KW': { dhaka: 22, ctg: 8 },
    'DAI-VRV-16HP': { dhaka: 8, ctg: 4 },
    'SKU-2026-9410': { dhaka: 85, ctg: 45 },
    'GEN-ITEM-001': { dhaka: 50, ctg: 25 },
  };

  const products = await prisma.product.findMany();

  for (const product of products) {
    if (product.isServiceItem) {
      console.log(`Skipping service item: ${product.sku} - ${product.name}`);
      continue;
    }

    const alloc = stockMap[product.sku] || { dhaka: 20, ctg: 10 };

    if (dhakaWh) {
      await prisma.stockLedger.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: dhakaWh.id,
          },
        },
        update: {
          quantityOnHand: alloc.dhaka,
        },
        create: {
          productId: product.id,
          warehouseId: dhakaWh.id,
          quantityOnHand: alloc.dhaka,
        },
      });
    }

    if (ctgWh) {
      await prisma.stockLedger.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: ctgWh.id,
          },
        },
        update: {
          quantityOnHand: alloc.ctg,
        },
        create: {
          productId: product.id,
          warehouseId: ctgWh.id,
          quantityOnHand: alloc.ctg,
        },
      });
    }

    console.log(`✓ Seeded stock for [${product.sku}] ${product.name}: Dhaka=${alloc.dhaka}, CTG=${alloc.ctg}`);
  }

  console.log('\n--- Stock Ledger Seeding Complete! ---');
}

seedStock().catch(console.error).finally(() => prisma.$disconnect());
