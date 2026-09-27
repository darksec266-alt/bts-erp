const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const models = [
    'user', 'role', 'permission', 'branch', 'customer', 'supplier', 'product', 'category', 'brand',
    'unit', 'warehouse', 'department', 'taxRate', 'purchaseRequest',
    'purchaseOrder', 'goodsReceiptNote', 'quotation', 'salesOrder',
    'deliveryChallan', 'invoice', 'project', 'stockLedger', 'serviceTicket',
    'leave', 'attendance', 'payrollRun', 'loan', 'investment', 'expense',
    'voucher', 'account'
  ];
  console.log('--- DATABASE ROW COUNTS ---');
  for (const m of models) {
    if (prisma[m]) {
      try {
        const count = await prisma[m].count();
        console.log(`${m}: ${count}`);
      } catch (e) {
        console.log(`${m}: error ${e.message}`);
      }
    }
  }
  await prisma.$disconnect();
}

check().catch(console.error);
