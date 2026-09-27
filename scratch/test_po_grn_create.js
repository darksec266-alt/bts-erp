const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCreatePOAndGRN() {
  const product = await prisma.product.findFirst({ where: { trackingType: 'SERIALIZED' } });
  const supplier = await prisma.supplier.findFirst();
  const branch = await prisma.branch.findFirst();
  const user = await prisma.user.findFirst();
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });

  const poNumber = `PO-TEST-${Date.now().toString().slice(-4)}`;
  console.log('Creating PO:', poNumber);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      branchId: branch.id,
      grandTotal: 1000,
      lines: {
        create: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: 500,
            lineTotal: 1000,
          }
        ]
      }
    },
    include: { lines: true }
  });

  console.log('Created PO with ID:', po.id, 'Line ID:', po.lines[0].id);

  // Now test GRN creation with serial numbers
  const { PrismaGrnRepository } = require('../apps/api/dist/modules/procurement/infrastructure/prisma-grn-repository');
  const repo = new PrismaGrnRepository(prisma);

  const testSerial1 = `SN-TEST-1-${Date.now().toString().slice(-4)}`;
  const testSerial2 = `SN-TEST-2-${Date.now().toString().slice(-4)}`;

  console.log('Attempting to create GRN with serials:', [testSerial1, testSerial2]);

  try {
    const grn = await repo.create({
      grnNumber: `GRN-TEST-${Date.now().toString().slice(-4)}`,
      purchaseOrderId: po.id,
      status: 'COMPLETE',
      receivedById: user.id,
      warehouseId: warehouse.id,
      lines: [
        {
          purchaseOrderLineId: po.lines[0].id,
          productId: product.id,
          quantityReceived: 2,
          condition: 'GOOD',
          serials: [testSerial1, testSerial2],
        }
      ]
    });
    console.log('✅ GRN CREATED SUCCESSFULLY! ID:', grn.id);
  } catch (err) {
    console.error('❌ GRN CREATION FAILED:', err);
  }
}

testCreatePOAndGRN().catch(console.error).finally(() => prisma.$disconnect());
