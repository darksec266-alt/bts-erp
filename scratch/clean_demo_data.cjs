const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDemoData() {
  console.log('--- STARTING DEMO DATA CLEANUP ---');

  await prisma.$transaction(async (tx) => {
    // 1. Delete Financial & Payment transactions referencing invoices/sales orders
    console.log('Deleting Payments and Allocations...');
    if (tx.paymentAllocation) await tx.paymentAllocation.deleteMany({});
    if (tx.payment) await tx.payment.deleteMany({});
    if (tx.voucherLine) await tx.voucherLine.deleteMany({});
    if (tx.voucher) await tx.voucher.deleteMany({});

    // 2. Delete Sales & Billing transactional tables
    console.log('Deleting Invoice and Challan lines...');
    if (tx.invoiceLine) await tx.invoiceLine.deleteMany({});
    if (tx.invoice) await tx.invoice.deleteMany({});
    if (tx.deliveryChallanLine) await tx.deliveryChallanLine.deleteMany({});
    if (tx.deliveryChallan) await tx.deliveryChallan.deleteMany({});

    console.log('Deleting Sales Orders, Quotations, and Projects...');
    if (tx.salesOrderLine) await tx.salesOrderLine.deleteMany({});
    if (tx.salesOrder) await tx.salesOrder.deleteMany({});
    if (tx.quotationLine) await tx.quotationLine.deleteMany({});
    if (tx.quotation) await tx.quotation.deleteMany({});
    if (tx.projectItem) await tx.projectItem.deleteMany({});
    if (tx.project) await tx.project.deleteMany({});

    // 2. Delete Procurement transactional tables
    console.log('Deleting Goods Receipt Notes, Purchase Orders, and Purchase Requests...');
    if (tx.goodsReceiptNoteLine) await tx.goodsReceiptNoteLine.deleteMany({});
    if (tx.goodsReceiptNote) await tx.goodsReceiptNote.deleteMany({});
    if (tx.purchaseOrderLine) await tx.purchaseOrderLine.deleteMany({});
    if (tx.purchaseOrder) await tx.purchaseOrder.deleteMany({});
    if (tx.purchaseRequestLine) await tx.purchaseRequestLine.deleteMany({});
    if (tx.purchaseRequest) await tx.purchaseRequest.deleteMany({});

    // 3. Delete Stock / Inventory ledgers and batches
    console.log('Deleting Stock Ledgers and movements...');
    if (tx.stockMovement) await tx.stockMovement.deleteMany({});
    if (tx.stockLedger) await tx.stockLedger.deleteMany({});
    if (tx.batchSerial) await tx.batchSerial.deleteMany({});

    // 4. Delete Service Tickets if any
    if (tx.serviceTicket) await tx.serviceTicket.deleteMany({});

    // 5. Delete Demo Master entities: Customers, Suppliers, Products
    console.log('Deleting demo Customers, Suppliers, Products...');
    if (tx.customerAddress) await tx.customerAddress.deleteMany({});
    if (tx.customer) await tx.customer.deleteMany({});
    if (tx.supplier) await tx.supplier.deleteMany({});
    if (tx.product) await tx.product.deleteMany({});

    // 6. Delete Demo Categories, Brands, Units (leaving warehouses and branches intact for operational setup)
    if (tx.category) await tx.category.deleteMany({});
    if (tx.brand) await tx.brand.deleteMany({});
    if (tx.unit) await tx.unit.deleteMany({});

    console.log('Cleaned up demo data while preserving Core Configuration (Users, Roles, Permissions, Branches, Warehouses).');
  });

  console.log('--- DEMO DATA CLEANUP COMPLETED SUCCESSFULLY ---');
  await prisma.$disconnect();
}

cleanDemoData().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
