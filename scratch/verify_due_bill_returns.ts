import fs from "fs";
import path from "path";

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[k] = v;
      }
    }
  }
}

import { PrismaClient } from "@prisma/client";
import { PrismaSalesRepository } from "../apps/api/src/modules/sales/infrastructure/prisma-sales-repository";
import { PrismaCustomerRepository } from "../apps/api/src/modules/master-data/infrastructure/prisma-customer-repository";

const prisma = new PrismaClient();
const salesRepo = new PrismaSalesRepository(prisma);
const customerRepo = new PrismaCustomerRepository(prisma);

async function run() {
  console.log("=== STARTING DUE BILL RETURN VERIFICATION TEST ===");

  // 1. Get or create a test customer
  const branch = await prisma.branch.findFirst({ where: { isActive: true } });
  if (!branch) throw new Error("No active branch found");

  const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  if (!warehouse) throw new Error("No active warehouse found");

  const testPhone = `01799${Math.floor(100000 + Math.random() * 900000)}`;
  const customer = await prisma.customer.create({
    data: {
      customerCode: `CUST-TEST-${Date.now().toString().slice(-4)}`,
      displayName: "Due Bill Test Customer",
      phone: testPhone,
      branchId: branch.id,
      walletBalance: 0,
    },
  });
  console.log(`Created test customer: ${customer.displayName} (ID: ${customer.id}), Wallet: ৳${customer.walletBalance}`);

  // Get a test product (non-serialized for simple amount math)
  let product = await prisma.product.findFirst({
    where: { trackingType: "NON_SERIALIZED", isActive: true },
  });
  if (!product) {
    product = await prisma.product.create({
      data: {
        sku: `TEST-BULK-${Date.now()}`,
        name: "Test Non-Serialized Item",
        trackingType: "NON_SERIALIZED",
        categoryId: (await prisma.category.findFirst())?.id || "cat-1",
        basePrice: 1000,
        costPrice: 800,
        unitId: (await prisma.unit.findFirst())?.id || "unit-1",
      },
    });
  }

  // Ensure stock exists in warehouse
  await prisma.stockLedger.upsert({
    where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    create: { productId: product.id, warehouseId: warehouse.id, quantityOnHand: 100 },
    update: { quantityOnHand: { increment: 100 } },
  });

  // ═════════════════════════════════════════════════════════════════
  // TEST SCENARIO 1: 100% Due Bill (৳10,000 bill, ৳0 paid)
  // ═════════════════════════════════════════════════════════════════
  console.log("\n--- TEST SCENARIO 1: 100% DUE BILL ---");
  const order1Id = `mock-order-1-${Date.now()}`;
  const inv1Number = `INV-TEST-DUE-${Date.now()}`;
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: inv1Number,
      sourceType: "DIRECT_SALE",
      sourceId: order1Id,
      customerId: customer.id,
      branchId: branch.id,
      grandTotal: 10000,
      status: "POSTED",
      idempotencyKey: `idem-1-${Date.now()}`,
    },
  });

  // Create mock sales order for lines
  await prisma.salesOrder.create({
    data: {
      id: order1Id,
      orderNumber: `SO-TEST-1-${Date.now()}`,
      customerId: customer.id,
      branchId: branch.id,
      grandTotal: 10000,
      lines: {
        create: [
          {
            productId: product.id,
            description: product.name,
            quantity: 10,
            unitPrice: 1000,
            lineTotal: 10000,
          },
        ],
      },
    },
  });

  // Check initial due
  const profile1Before = await customerRepo.getProfile(customer.id);
  console.log(`Before Return -> Invoiced: ৳${profile1Before?.summary.totalInvoiced}, Paid: ৳${profile1Before?.summary.totalPaid}, Current Due: ৳${profile1Before?.summary.currentDue}, Wallet: ৳${profile1Before?.summary.walletBalance}`);

  if (profile1Before?.summary.currentDue !== 10000) {
    throw new Error(`Expected current due to be 10000, got ${profile1Before?.summary.currentDue}`);
  }
  if (profile1Before?.summary.walletBalance !== 0) {
    throw new Error(`Expected wallet to be 0, got ${profile1Before?.summary.walletBalance}`);
  }

  // Now process a return of 3 units = ৳3,000 (with creditToWallet = true)
  console.log("Customer returns 3 units (৳3,000) with creditToWallet=true...");
  const ret1 = await salesRepo.createSalesReturn({
    invoiceId: inv1.id,
    warehouseId: warehouse.id,
    creditToWallet: true,
    reason: "Due bill return test",
    lines: [
      {
        productId: product.id,
        quantity: 3,
        unitPrice: 1000,
      },
    ],
  });

  console.log(`Sales Return #${ret1.returnNumber} created: TotalAmount=৳${ret1.totalAmount}, RefundAmount=৳${ret1.refundAmount}`);
  
  // Verify Database State for Customer
  const custAfter1 = await prisma.customer.findUnique({ where: { id: customer.id } });
  const walletTxs1 = await prisma.customerWalletTransaction.findMany({ where: { customerId: customer.id } });
  const profile1After = await customerRepo.getProfile(customer.id);

  console.log(`After Return 1 -> Invoiced: ৳${profile1After?.summary.totalInvoiced}, Paid: ৳${profile1After?.summary.totalPaid}, Returned: ৳${profile1After?.summary.totalReturned}, Current Due: ৳${profile1After?.summary.currentDue}, Wallet: ৳${profile1After?.summary.walletBalance}`);

  // CRITICAL ASSERTIONS:
  // 1. Wallet balance MUST BE 0!
  if (Number(custAfter1?.walletBalance) !== 0) {
    throw new Error(`FAIL: Customer wallet balance is ৳${custAfter1?.walletBalance}. Must be 0 because invoice was a due bill!`);
  }
  // 2. No wallet transaction
  if (walletTxs1.length !== 0) {
    throw new Error(`FAIL: Found ${walletTxs1.length} wallet transactions. Must be 0!`);
  }
  // 3. Current due MUST BE 7,000!
  if (profile1After?.summary.currentDue !== 7000) {
    throw new Error(`FAIL: Expected current due to be 7000, got ${profile1After?.summary.currentDue}`);
  }
  // 4. Return refundAmount must be 0
  if (ret1.refundAmount !== 0) {
    throw new Error(`FAIL: Return refundAmount is ৳${ret1.refundAmount}. Must be 0!`);
  }
  console.log("✅ SCENARIO 1 PASSED: Return was completely deducted from due bill, 0 added to wallet!");

  // ═════════════════════════════════════════════════════════════════
  // TEST SCENARIO 2: Partial Due Bill (৳10,000 bill, ৳8,000 paid, ৳2,000 due)
  // Customer returns ৳3,000: ৳2,000 should deduct due to 0, ৳1,000 to wallet!
  // ═════════════════════════════════════════════════════════════════
  console.log("\n--- TEST SCENARIO 2: PARTIAL DUE BILL (৳2,000 due, ৳3,000 return) ---");
  const testPhone2 = `01788${Math.floor(100000 + Math.random() * 900000)}`;
  const customer2 = await prisma.customer.create({
    data: {
      customerCode: `CUST-TEST2-${Date.now().toString().slice(-4)}`,
      displayName: "Partial Due Customer",
      phone: testPhone2,
      branchId: branch.id,
      walletBalance: 0,
    },
  });

  const order2Id = `mock-order-2-${Date.now()}`;
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-TEST-PARTIAL-${Date.now()}`,
      sourceType: "DIRECT_SALE",
      sourceId: order2Id,
      customerId: customer2.id,
      branchId: branch.id,
      grandTotal: 10000,
      status: "POSTED",
      idempotencyKey: `idem-2-${Date.now()}`,
    },
  });

  await prisma.salesOrder.create({
    data: {
      id: order2Id,
      orderNumber: `SO-TEST-2-${Date.now()}`,
      customerId: customer2.id,
      branchId: branch.id,
      grandTotal: 10000,
      lines: {
        create: [
          {
            productId: product.id,
            description: product.name,
            quantity: 10,
            unitPrice: 1000,
            lineTotal: 10000,
          },
        ],
      },
    },
  });

  // Customer paid ৳8,000
  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      amount: 8000,
      method: "CASH",
    },
  });

  const profile2Before = await customerRepo.getProfile(customer2.id);
  console.log(`Before Return -> Invoiced: ৳${profile2Before?.summary.totalInvoiced}, Paid: ৳${profile2Before?.summary.totalPaid}, Current Due: ৳${profile2Before?.summary.currentDue}, Wallet: ৳${profile2Before?.summary.walletBalance}`);

  if (profile2Before?.summary.currentDue !== 2000) {
    throw new Error(`Expected current due to be 2000, got ${profile2Before?.summary.currentDue}`);
  }

  // Return 3 units (৳3,000)
  console.log("Customer returns 3 units (৳3,000). Due is ৳2,000, so ৳2,000 offsets due and ৳1,000 goes to wallet...");
  const ret2 = await salesRepo.createSalesReturn({
    invoiceId: inv2.id,
    warehouseId: warehouse.id,
    creditToWallet: true,
    reason: "Partial due return test",
    lines: [
      {
        productId: product.id,
        quantity: 3,
        unitPrice: 1000,
      },
    ],
  });

  console.log(`Sales Return #${ret2.returnNumber}: TotalAmount=৳${ret2.totalAmount}, RefundAmount=৳${ret2.refundAmount}`);

  const custAfter2 = await prisma.customer.findUnique({ where: { id: customer2.id } });
  const profile2After = await customerRepo.getProfile(customer2.id);

  console.log(`After Return 2 -> Invoiced: ৳${profile2After?.summary.totalInvoiced}, Paid: ৳${profile2After?.summary.totalPaid}, Returned: ৳${profile2After?.summary.totalReturned}, Current Due: ৳${profile2After?.summary.currentDue}, Wallet: ৳${profile2After?.summary.walletBalance}`);

  // CRITICAL ASSERTIONS:
  // 1. Current due MUST BE 0 (2,000 was deducted)
  if (profile2After?.summary.currentDue !== 0) {
    throw new Error(`FAIL: Expected current due to be 0, got ${profile2After?.summary.currentDue}`);
  }
  // 2. Customer wallet MUST BE 1,000 (the genuine cash paid excess)
  if (Number(custAfter2?.walletBalance) !== 1000) {
    throw new Error(`FAIL: Expected wallet balance to be 1000, got ${custAfter2?.walletBalance}`);
  }
  if (ret2.refundAmount !== 1000) {
    throw new Error(`FAIL: Return refundAmount must be 1000, got ${ret2.refundAmount}`);
  }
  console.log("✅ SCENARIO 2 PASSED: ৳2,000 due cleared to ৳0, exactly ৳1,000 excess paid refunded to wallet!");

  // ═════════════════════════════════════════════════════════════════
  // TEST SCENARIO 3: Returnable Items API checks financials
  // ═════════════════════════════════════════════════════════════════
  console.log("\n--- TEST SCENARIO 3: getInvoiceReturnableItems financials check ---");
  const retInfo = await salesRepo.getInvoiceReturnableItems(inv1.id);
  console.log("Invoice 1 Returnable Financials:", retInfo.financials);
  if (retInfo.financials?.currentDue !== 7000) {
    throw new Error(`Expected invoice 1 remaining due to be 7000, got ${retInfo.financials?.currentDue}`);
  }
  if (retInfo.financials?.alreadyReturnedAmount !== 3000) {
    throw new Error(`Expected invoice 1 already returned amount to be 3000, got ${retInfo.financials?.alreadyReturnedAmount}`);
  }
  console.log("✅ SCENARIO 3 PASSED: getInvoiceReturnableItems returned accurate financials!");

  // ═════════════════════════════════════════════════════════════════
  // TEST SCENARIO 4: Serialized Items Due Bill Return
  // ═════════════════════════════════════════════════════════════════
  console.log("\n--- TEST SCENARIO 4: SERIALIZED ITEM DUE BILL RETURN ---");
  const testPhone4 = `01777${Math.floor(100000 + Math.random() * 900000)}`;
  const customer4 = await prisma.customer.create({
    data: {
      customerCode: `CUST-TEST4-${Date.now().toString().slice(-4)}`,
      displayName: "Serialized Due Customer",
      phone: testPhone4,
      branchId: branch.id,
      walletBalance: 0,
    },
  });

  const serialProd = await prisma.product.findFirst({
    where: { trackingType: "SERIALIZED", isActive: true },
  });
  if (!serialProd) {
    throw new Error("No serialized product found");
  }

  const serial1 = `SN-CAM-${Date.now()}-1`;
  const serial2 = `SN-CAM-${Date.now()}-2`;

  const order4Id = `mock-order-4-${Date.now()}`;
  const inv4 = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-TEST-SERIAL-${Date.now()}`,
      sourceType: "DIRECT_SALE",
      sourceId: order4Id,
      customerId: customer4.id,
      branchId: branch.id,
      grandTotal: 10000,
      status: "POSTED",
      idempotencyKey: `idem-4-${Date.now()}`,
    },
  });

  await prisma.salesOrder.create({
    data: {
      id: order4Id,
      orderNumber: `SO-TEST-4-${Date.now()}`,
      customerId: customer4.id,
      branchId: branch.id,
      grandTotal: 10000,
      lines: {
        create: [
          {
            productId: serialProd.id,
            description: serialProd.name,
            quantity: 2,
            unitPrice: 5000,
            lineTotal: 10000,
          },
        ],
      },
    },
  });

  // Create serial units in SOLD stage linked to inv4
  const unit1 = await prisma.serialNumber.create({
    data: {
      productId: serialProd.id,
      serial: serial1,
      barcode: `BC-${serialProd.sku}-${serial1}`,
      warehouseId: warehouse.id,
      currentStage: "SOLD",
    },
  });
  const unit2 = await prisma.serialNumber.create({
    data: {
      productId: serialProd.id,
      serial: serial2,
      barcode: `BC-${serialProd.sku}-${serial2}`,
      warehouseId: warehouse.id,
      currentStage: "SOLD",
    },
  });

  await prisma.sKULifecycleEvent.create({
    data: {
      serialNumberId: unit1.id,
      eventType: "SOLD",
      sourceModule: "DIRECT_SALE",
      sourceId: inv4.id,
      fromStage: "IN_STOCK",
      toStage: "SOLD",
    },
  });
  await prisma.sKULifecycleEvent.create({
    data: {
      serialNumberId: unit2.id,
      eventType: "SOLD",
      sourceModule: "DIRECT_SALE",
      sourceId: inv4.id,
      fromStage: "IN_STOCK",
      toStage: "SOLD",
    },
  });

  // Check initial due
  const profile4Before = await customerRepo.getProfile(customer4.id);
  console.log(`Before Return -> Due: ৳${profile4Before?.summary.currentDue}, Wallet: ৳${profile4Before?.summary.walletBalance}`);
  if (profile4Before?.summary.currentDue !== 10000) {
    throw new Error(`Expected current due to be 10000, got ${profile4Before?.summary.currentDue}`);
  }

  // Return 1 camera (unit1) with serial
  console.log(`Returning 1 serialized camera with serial "${serial1}" against 100% due bill...`);
  const ret4 = await salesRepo.createSalesReturn({
    invoiceId: inv4.id,
    warehouseId: warehouse.id,
    creditToWallet: true,
    reason: "Defective camera return",
    lines: [
      {
        productId: serialProd.id,
        quantity: 1,
        unitPrice: 5000,
        serials: [serial1],
      },
    ],
  });

  console.log(`Sales Return #${ret4.returnNumber}: TotalAmount=৳${ret4.totalAmount}, RefundAmount=৳${ret4.refundAmount}`);

  // Assertions for Serialized Due Bill Return
  const custAfter4 = await prisma.customer.findUnique({ where: { id: customer4.id } });
  const profile4After = await customerRepo.getProfile(customer4.id);
  const updatedUnit1 = await prisma.serialNumber.findUnique({ where: { serial: serial1 } });
  const stock4 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: serialProd.id, warehouseId: warehouse.id } },
  });

  console.log(`After Return 4 -> Current Due: ৳${profile4After?.summary.currentDue}, Wallet: ৳${profile4After?.summary.walletBalance}, Unit1 Stage: ${updatedUnit1?.currentStage}, StockOnHand: ${stock4?.quantityOnHand}`);

  if (Number(custAfter4?.walletBalance) !== 0) {
    throw new Error(`FAIL: Customer wallet balance is ৳${custAfter4?.walletBalance}. Must be 0 because invoice was a due bill!`);
  }
  if (profile4After?.summary.currentDue !== 5000) {
    throw new Error(`FAIL: Expected current due to be 5000, got ${profile4After?.summary.currentDue}`);
  }
  if (updatedUnit1?.currentStage !== "IN_STOCK") {
    throw new Error(`FAIL: Expected unit1 to be IN_STOCK, got ${updatedUnit1?.currentStage}`);
  }
  if (Number(stock4?.quantityOnHand) !== 1) {
    throw new Error(`FAIL: Expected stock quantity on hand to be 1, got ${stock4?.quantityOnHand}`);
  }
  console.log("✅ SCENARIO 4 PASSED: Serialized unit returned to IN_STOCK, ৳5,000 deducted from due bill, wallet untouched (৳0)!");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The user requirement is 100% verified.");
}

run()
  .catch((e) => {
    console.error("TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
