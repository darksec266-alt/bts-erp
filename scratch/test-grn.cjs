const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const grn = await prisma.goodsReceiptNote.findFirst({
    include: {
      lines: {
        include: {
          product: true,
          purchaseOrderLine: true,
        },
      },
      purchaseOrder: {
        include: {
          supplier: true,
          branch: true,
        },
      },
    },
  });

  console.log('GRN object:', {
    id: grn.id,
    grnNumber: grn.grnNumber,
    status: grn.status,
    receivedAt: grn.receivedAt,
    notes: grn.notes,
  });

  if (grn.lines[0]) {
    console.log('Line 0 raw object:', grn.lines[0]);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
