const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany();
  console.log('Branches:', branches);

  const warehouses = await prisma.warehouse.findMany();
  console.log('Warehouses:', warehouses);
}

main().finally(() => prisma.$disconnect());
