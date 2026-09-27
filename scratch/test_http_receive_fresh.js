const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function testHttpReceiveFresh() {
  const token = jwt.sign(
    { sub: "cmu1k9ycn001orwho0zu1r7o5", roleName: "SUPER_ADMIN", isSuperAdmin: true, permissions: ["*"] },
    "dev-only-access-secret-change-me-before-any-real-deployment",
    { expiresIn: "1h" }
  );

  const product = await prisma.product.findFirst({ where: { trackingType: 'SERIALIZED' } });
  const supplier = await prisma.supplier.findFirst();
  const branch = await prisma.branch.findFirst();
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-HTTP-${Date.now().toString().slice(-4)}`,
      supplierId: supplier.id,
      branchId: branch.id,
      grandTotal: 1000,
      lines: {
        create: [
          {
            productId: product.id,
            quantity: 3,
            unitPrice: 500,
            lineTotal: 1500
          }
        ]
      }
    },
    include: { lines: true }
  });

  const sn1 = `SN-FRESH-1-${Date.now().toString().slice(-4)}`;
  const sn2 = `SN-FRESH-2-${Date.now().toString().slice(-4)}`;
  const sn3 = `SN-FRESH-3-${Date.now().toString().slice(-4)}`;

  const receivePayload = {
    grnNumber: `GRN-FRESH-${Date.now().toString().slice(-4)}`,
    status: 'COMPLETE',
    warehouseId: warehouse.id,
    lines: [
      {
        purchaseOrderLineId: po.lines[0].id,
        productId: product.id,
        quantityReceived: 3,
        condition: 'GOOD',
        serials: [sn1, sn2, sn3]
      }
    ]
  };

  console.log('Sending HTTP POST /api/v1/purchase-orders/' + po.id + '/receive');
  const res = await fetch(`http://localhost:4000/api/v1/purchase-orders/${po.id}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(receivePayload)
  });

  const resBody = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response Body:', JSON.stringify(resBody, null, 2));
}

testHttpReceiveFresh().catch(console.error).finally(() => prisma.$disconnect());
