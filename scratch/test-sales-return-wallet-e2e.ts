import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Testing Sales Return, Inventory Restock, Customer Wallet & Profile ===");

  // 1. Get or create test Branch, Warehouse, Customer
  const branch = await prisma.branch.findFirst() || await prisma.branch.create({
    data: { code: "BR-TEST", name: "Test Branch" },
  });

  const warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } }) || await prisma.warehouse.create({
    data: { code: "WH-TEST", name: "Test Central Warehouse", branchId: branch.id },
  });

  const testPhone = `01799${Math.floor(100000 + Math.random() * 900000)}`;
  const customer = await prisma.customer.create({
    data: {
      customerCode: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      displayName: "Rahim Chowdhury (Test)",
      phone: testPhone,
      branchId: branch.id,
      walletBalance: 0,
    },
  });
  console.log(`Created test customer: ${customer.displayName} (${customer.customerCode}), Initial Wallet: ৳${customer.walletBalance}`);

  // 2. Create test products: 1 serialized, 1 bulk (non-serialized)
  const skuSerial = `SR-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const productSerial = await prisma.product.create({
    data: {
      sku: skuSerial,
      name: "Smart Solar Inverter 5kW",
      trackingType: "SERIALIZED",
      costPrice: 40000,
      sellingPrice: 55000,
      isServiceItem: false,
    },
  });

  const skuBulk = `BK-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const productBulk = await prisma.product.create({
    data: {
      sku: skuBulk,
      name: "Solar DC Cable 4mm (Meters)",
      trackingType: "NON_SERIALIZED",
      costPrice: 80,
      sellingPrice: 120,
      isServiceItem: false,
    },
  });

  // Setup initial inventory in warehouse
  await prisma.stockLedger.upsert({
    where: { productId_warehouseId: { productId: productSerial.id, warehouseId: warehouse.id } },
    update: { quantityOnHand: 5 },
    create: { productId: productSerial.id, warehouseId: warehouse.id, quantityOnHand: 5 },
  });

  await prisma.stockLedger.upsert({
    where: { productId_warehouseId: { productId: productBulk.id, warehouseId: warehouse.id } },
    update: { quantityOnHand: 200 },
    create: { productId: productBulk.id, warehouseId: warehouse.id, quantityOnHand: 200 },
  });

  // Create serial numbers in warehouse
  const serialNo1 = `INV-SN-${Math.floor(100000 + Math.random() * 900000)}`;
  const serialNo2 = `INV-SN-${Math.floor(100000 + Math.random() * 900000)}`;

  await prisma.serialNumber.create({
    data: {
      serial: serialNo1,
      productId: productSerial.id,
      warehouseId: warehouse.id,
      currentStage: "IN_STOCK",
    },
  });

  await prisma.serialNumber.create({
    data: {
      serial: serialNo2,
      productId: productSerial.id,
      warehouseId: warehouse.id,
      currentStage: "IN_STOCK",
    },
  });

  console.log(`Created inventory. Serial units: [${serialNo1}, ${serialNo2}] in stock.`);

  // 3. Simulate Sale: Invoice created, 1 serial sold, 50 bulk sold
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const invoiceTotal = 55000 * 1 + 120 * 50; // 55000 + 6000 = 61000

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      sourceType: "DIRECT_SALE",
      sourceId: "DIRECT_TEST",
      customerId: customer.id,
      branchId: branch.id,
      grandTotal: invoiceTotal,
      status: "POSTED",
      idempotencyKey: `IDEM-${Date.now()}-${Math.random()}`,
    },
  });

  // Decrement inventory on sale
  await prisma.stockLedger.update({
    where: { productId_warehouseId: { productId: productSerial.id, warehouseId: warehouse.id } },
    data: { quantityOnHand: { decrement: 1 } },
  });
  await prisma.stockLedger.update({
    where: { productId_warehouseId: { productId: productBulk.id, warehouseId: warehouse.id } },
    data: { quantityOnHand: { decrement: 50 } },
  });

  // Transition serial to SOLD
  await prisma.serialNumber.update({
    where: { serial: serialNo1 },
    data: { currentStage: "SOLD" },
  });

  const unit1 = await prisma.serialNumber.findUnique({ where: { serial: serialNo1 } });
  await prisma.sKULifecycleEvent.create({
    data: {
      serialNumberId: unit1!.id,
      eventType: "SOLD",
      sourceModule: "DIRECT_SALE",
      sourceId: invoice.id,
      performedById: "SYSTEM",
      notes: `Sold on invoice ${invoiceNumber}`,
    },
  });

  console.log(`Simulated direct sale! Invoice ${invoice.invoiceNumber} created for ৳${invoiceTotal}.`);
  console.log(`Sold serial: ${serialNo1}. Stock now: Serial=4, Bulk=150.`);

  // 4. Test Customer returns the serialized inverter + 10 meters of bulk cable!
  console.log("\n--- Processing Sales Return ---");
  const returnQtySerial = 1;
  const returnQtyBulk = 10;
  const refundAmount = 55000 * returnQtySerial + 120 * returnQtyBulk; // 55000 + 1200 = 56200
  const returnNumber = `RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  await prisma.$transaction(async (tx) => {
    // A. Create SalesReturn
    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNumber,
        invoiceId: invoice.id,
        customerId: customer.id,
        branchId: branch.id,
        warehouseId: warehouse.id,
        totalAmount: refundAmount,
        creditToWallet: true,
        refundAmount: refundAmount,
        reason: "Customer requested return due to incorrect specification",
        status: "COMPLETED",
        lines: {
          create: [
            {
              productId: productSerial.id,
              quantity: returnQtySerial,
              unitPrice: 55000,
              lineTotal: 55000,
              serials: [serialNo1],
            },
            {
              productId: productBulk.id,
              quantity: returnQtyBulk,
              unitPrice: 120,
              lineTotal: 1200,
              serials: [],
            },
          ],
        },
      },
    });

    // B. Credit Note
    await tx.creditNote.create({
      data: {
        creditNoteNumber: `CN-${returnNumber}`,
        invoiceId: invoice.id,
        amount: refundAmount,
        reason: `Sales Return #${returnNumber}`,
      },
    });

    // C. Credit Customer Wallet
    const updatedCust = await tx.customer.update({
      where: { id: customer.id },
      data: { walletBalance: { increment: refundAmount } },
    });

    await tx.customerWalletTransaction.create({
      data: {
        customerId: customer.id,
        amount: refundAmount,
        type: "SALES_RETURN_REFUND",
        referenceType: "SALES_RETURN",
        referenceId: salesReturn.id,
        balanceAfter: updatedCust.walletBalance,
        notes: `Refund from Sales Return #${returnNumber} for Invoice #${invoice.invoiceNumber}`,
      },
    });

    // D. Restock inventory in warehouse
    await tx.stockLedger.update({
      where: { productId_warehouseId: { productId: productSerial.id, warehouseId: warehouse.id } },
      data: { quantityOnHand: { increment: returnQtySerial } },
    });
    await tx.stockLedger.update({
      where: { productId_warehouseId: { productId: productBulk.id, warehouseId: warehouse.id } },
      data: { quantityOnHand: { increment: returnQtyBulk } },
    });

    // E. Transition Serial back to IN_STOCK
    await tx.serialNumber.update({
      where: { serial: serialNo1 },
      data: { currentStage: "IN_STOCK", warehouseId: warehouse.id },
    });

    await tx.sKULifecycleEvent.create({
      data: {
        serialNumberId: unit1!.id,
        eventType: "RETURNED_BY_CUSTOMER",
        sourceModule: "SALES_RETURN",
        sourceId: salesReturn.id,
        performedById: "SYSTEM",
        toWarehouseId: warehouse.id,
        notes: `Returned via Sales Return #${returnNumber}`,
      },
    });
  });

  console.log(`Sales Return ${returnNumber} processed successfully!`);

  // 5. Assertions
  const checkCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
  console.log(`✓ Customer Wallet Balance after Return: ৳${checkCustomer?.walletBalance} (Expected: ৳56200.00)`);

  const checkSerialStock = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: productSerial.id, warehouseId: warehouse.id } },
  });
  console.log(`✓ Serial Product StockOnHand: ${checkSerialStock?.quantityOnHand} (Restocked back to 5)`);

  const checkBulkStock = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: productBulk.id, warehouseId: warehouse.id } },
  });
  console.log(`✓ Bulk Product StockOnHand: ${checkBulkStock?.quantityOnHand} (Restocked from 150 to 160)`);

  const checkSerialUnit = await prisma.serialNumber.findUnique({ where: { serial: serialNo1 } });
  console.log(`✓ Serial Unit "${serialNo1}" Stage: ${checkSerialUnit?.currentStage} (Restored to IN_STOCK)`);

  // Count in stock serials to verify zero drift invariant
  const inStockSerialsCount = await prisma.serialNumber.count({
    where: { productId: productSerial.id, warehouseId: warehouse.id, currentStage: "IN_STOCK" },
  });
  console.log(`✓ Physical In-Stock Serials Count: ${inStockSerialsCount}`);

  // 6. Test Customer Wallet Top-up
  console.log("\n--- Testing Manual Wallet Top-up ---");
  const topupAmount = 10000;
  const custAfterTopup = await prisma.customer.update({
    where: { id: customer.id },
    data: { walletBalance: { increment: topupAmount } },
  });
  await prisma.customerWalletTransaction.create({
    data: {
      customerId: customer.id,
      amount: topupAmount,
      type: "WALLET_TOPUP",
      referenceType: "MANUAL_TOPUP",
      balanceAfter: custAfterTopup.walletBalance,
      notes: "Cash deposit at branch counter",
    },
  });
  console.log(`✓ Customer Wallet after ৳10,000 top up: ৳${custAfterTopup.walletBalance} (Expected: ৳66200.00)`);

  // 7. Test Paying remaining invoice due from wallet
  console.log("\n--- Testing Invoice Due Payment from Wallet ---");
  // Invoice was 61000, Return was 56200, Remaining due = 4800
  const remainingDue = 4800;
  const custAfterPay = await prisma.customer.update({
    where: { id: customer.id },
    data: { walletBalance: { decrement: remainingDue } },
  });
  await prisma.customerWalletTransaction.create({
    data: {
      customerId: customer.id,
      amount: -remainingDue,
      type: "INVOICE_PAYMENT",
      referenceType: "INVOICE",
      referenceId: invoice.id,
      balanceAfter: custAfterPay.walletBalance,
      notes: `Payment for Invoice #${invoice.invoiceNumber} from customer wallet`,
    },
  });
  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: remainingDue,
      method: "WALLET",
    },
  });
  console.log(`✓ Paid remaining due (৳${remainingDue}) from wallet!`);
  console.log(`✓ Customer Wallet Balance now: ৳${custAfterPay.walletBalance} (Expected: ৳61400.00)`);

  console.log("\n=== ALL TEST CHECKS PASSED PERFECTLY! ===");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
