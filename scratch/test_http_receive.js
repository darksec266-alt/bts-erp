const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function testHttpReceive() {
  const token = jwt.sign(
    { sub: "cmu1k9ycn001orwho0zu1r7o5", roleName: "SUPER_ADMIN", isSuperAdmin: true, permissions: ["*"] },
    "dev-only-access-secret-change-me-before-any-real-deployment",
    { expiresIn: "1h" }
  );

  const po = await prisma.purchaseOrder.findFirst({
    where: {
      lines: {
        some: {
          product: { trackingType: 'SERIALIZED' }
        }
      }
    },
    include: {
      lines: {
        include: { product: true }
      }
    }
  });

  console.log('PO for test:', po ? { id: po.id, poNumber: po.poNumber } : 'None');
  if (!po) return;

  const serializedLine = po.lines.find(l => l.product.trackingType === 'SERIALIZED');
  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });

  const sn1 = `SN-HTTP-1-${Date.now().toString().slice(-4)}`;
  const sn2 = `SN-HTTP-2-${Date.now().toString().slice(-4)}`;

  const receivePayload = {
    grnNumber: `GRN-HTTP-${Date.now().toString().slice(-4)}`,
    status: 'COMPLETE',
    warehouseId: warehouse.id,
    lines: [
      {
        purchaseOrderLineId: serializedLine.id,
        productId: serializedLine.productId,
        quantityReceived: 2,
        condition: 'GOOD',
        serials: [sn1, sn2]
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

testHttpReceive().catch(console.error).finally(() => prisma.$disconnect());
