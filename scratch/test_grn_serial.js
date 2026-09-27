const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGrn() {
  console.log('Testing GRN creation with serials...');
  
  // Find a serialized product
  const product = await prisma.product.findFirst({
    where: { trackingType: 'SERIALIZED' }
  });
  console.log('Serialized product:', product ? { id: product.id, sku: product.sku, name: product.name } : 'None found');
  
  if (!product) {
    console.log('No serialized product found.');
    return;
  }
  
  // Find warehouse, supplier, branch, user
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  const supplier = await prisma.supplier.findFirst();
  const branch = await prisma.branch.findFirst();
  const user = await prisma.user.findFirst();
  
  console.log('Found entities:', {
    warehouse: warehouse?.id,
    supplier: supplier?.id,
    branch: branch?.id,
    user: user?.id,
  });
}

testGrn().catch(console.error).finally(() => prisma.$disconnect());
