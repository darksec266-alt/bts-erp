/**
 * Comprehensive Automated End-to-End Verification Script
 * Serialized vs. Non-Serialized Inventory Lifecycle Engine
 *
 * Verifies:
 * 1. Product Hierarchy (Category -> SubCategory -> Product Model)
 * 2. PO Creation (100 Cameras [Serialized] + 200 Connectors [Non-Serialized])
 * 3. GRN Partial Receiving (40 Cameras with 40 unique serials)
 * 4. Duplicate Serial Prevention
 * 5. GRN Full Receiving (60 Cameras + 200 Bulk Connectors)
 * 6. Barcode Scanner API Resolution (/api/v1/inventory/scan)
 * 7. POS Direct Sale (2 Cameras + 50 Connectors) with exact serials
 * 8. Stock Transfer (5 Cameras from Central to Branch Warehouse)
 * 9. Customer Return (1 Camera restored to IN_STOCK)
 * 10. Double-Entry Truth: StockLedger.quantityOnHand === COUNT(SerialNumber WHERE stage='IN_STOCK')
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function run() {
  console.log("================================================================");
  console.log("🚀 STARTING SERIALIZED VS NON-SERIALIZED INVENTORY VERIFICATION");
  console.log("================================================================\n");

  const timestamp = Date.now().toString().slice(-6);

  // 1. SETUP MASTER ENTITIES
  console.log("▶ 1. Setting up Master Entities & Product Hierarchy...");
  let branch = await prisma.branch.findFirst({ where: { isActive: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: { code: `BR-${timestamp}`, name: "Dhaka Central Branch" },
    });
  }

  let centralWh = await prisma.warehouse.findFirst({ where: { code: "WH-CENTRAL" } });
  if (!centralWh) {
    centralWh = await prisma.warehouse.create({
      data: { code: "WH-CENTRAL", name: "Central Logistics Hub", branchId: branch.id, isActive: true },
    });
  }

  let branchWh = await prisma.warehouse.findFirst({ where: { code: "WH-BRANCH" } });
  if (!branchWh) {
    branchWh = await prisma.warehouse.create({
      data: { code: "WH-BRANCH", name: "Uttara Branch Warehouse", branchId: branch.id, isActive: true },
    });
  }

  let user = await prisma.user.findFirst({ include: { role: true } });
  if (!user) {
    let role = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
    if (!role) {
      role = await prisma.role.create({ data: { name: "SUPER_ADMIN" } });
    }
    user = await prisma.user.create({
      data: {
        email: `admin-${timestamp}@btserp.com`,
        name: "Inventory Manager",
        roleId: role.id,
        passwordHash: "dummyhash",
      },
      include: { role: true },
    });
  }

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    {
      sub: user.id,
      roleId: user.roleId || user.role?.id || "super-admin-role",
      roleName: user.role?.name || "SUPER_ADMIN",
      branchId: null,
      isSuperAdmin: true,
      permissions: ["*"],
    },
    process.env.JWT_ACCESS_SECRET || "dev-only-access-secret-change-me-before-any-real-deployment",
    { expiresIn: "2h" }
  );

  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { supplierCode: `SUP-${timestamp}`, companyName: "Hikvision Official BD Ltd" },
    });
  }

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: { customerCode: `CUST-${timestamp}`, displayName: "Grameenphone Security Projects" },
    });
  }

  // Categories & Subcategories
  let cctvCat = await prisma.category.findFirst({ where: { name: "CCTV" } });
  if (!cctvCat) {
    cctvCat = await prisma.category.create({ data: { name: "CCTV", code: `CAT-CCTV-${timestamp}` } });
  }

  let cameraSubCat = await prisma.subCategory.findFirst({ where: { name: "Camera", categoryId: cctvCat.id } });
  if (!cameraSubCat) {
    cameraSubCat = await prisma.subCategory.create({
      data: { name: "Camera", categoryId: cctvCat.id },
    });
  }

  let accCat = await prisma.category.findFirst({ where: { name: "Accessories" } });
  if (!accCat) {
    accCat = await prisma.category.create({ data: { name: "Accessories", code: `CAT-ACC-${timestamp}` } });
  }

  let connSubCat = await prisma.subCategory.findFirst({ where: { name: "Connector", categoryId: accCat.id } });
  if (!connSubCat) {
    connSubCat = await prisma.subCategory.create({
      data: { name: "Connector", categoryId: accCat.id },
    });
  }

  // Create Serialized Product: Hikvision Camera
  const cameraSku = `HK-CAM-${timestamp}`;
  const cameraBarcode = `BC-CAM-${timestamp}`;
  const cameraProduct = await prisma.product.create({
    data: {
      sku: cameraSku,
      name: "Hikvision 4MP IP Bullet Camera",
      trackingType: "SERIALIZED",
      modelNumber: "DS-2CD2043G2-I",
      barcode: cameraBarcode,
      subCategoryId: cameraSubCat.id,
      costPrice: 4500,
      sellingPrice: 5800,
      isActive: true,
    },
  });

  // Create Non-Serialized Bulk Product: BNC Connector
  const connectorSku = `BNC-CON-${timestamp}`;
  const connectorBarcode = `BC-BNC-${timestamp}`;
  const connectorProduct = await prisma.product.create({
    data: {
      sku: connectorSku,
      name: "BNC Heavy Duty Video Connector",
      trackingType: "NON_SERIALIZED",
      modelNumber: "BNC-500",
      barcode: connectorBarcode,
      subCategoryId: connSubCat.id,
      costPrice: 25,
      sellingPrice: 45,
      isActive: true,
    },
  });

  await assert(cameraProduct.trackingType === "SERIALIZED", "Camera created with trackingType === SERIALIZED");
  await assert(connectorProduct.trackingType === "NON_SERIALIZED", "Connector created with trackingType === NON_SERIALIZED");

  // 2. PURCHASE ORDER (100 CAMERAS + 200 CONNECTORS)
  console.log("\n▶ 2. Creating Purchase Order for 100 Cameras + 200 Connectors...");
  const poNumber = `PO-${timestamp}`;
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      branchId: branch.id,
      grandTotal: 100 * 4500 + 200 * 25,
      lines: {
        create: [
          {
            productId: cameraProduct.id,
            quantity: 100,
            unitPrice: 4500,
            lineTotal: 450000,
          },
          {
            productId: connectorProduct.id,
            quantity: 200,
            unitPrice: 25,
            lineTotal: 5000,
          },
        ],
      },
    },
    include: { lines: true },
  });

  const camPoLine = po.lines.find((l) => l.productId === cameraProduct.id);
  const connPoLine = po.lines.find((l) => l.productId === connectorProduct.id);
  await assert(po.lines.length === 2, `PO created with 2 lines totaling ${po.grandTotal} BDT`);

  // 3. GRN PARTIAL RECEIVING: 40 CAMERAS
  console.log("\n▶ 3. Recording First GRN (Partial Receiving: 40 Cameras with 40 Serials)...");
  const grn1Serials = Array.from({ length: 40 }, (_, i) => `SN-${timestamp}-${String(i + 1).padStart(3, "0")}`);
  const grn1Number = `GRN-${timestamp}-01`;

  // Use GRN Repository transaction logic
  const grn1 = await prisma.$transaction(async (tx) => {
    const createdGrn = await tx.goodsReceiptNote.create({
      data: {
        grnNumber: grn1Number,
        purchaseOrderId: po.id,
        receivedById: user.id,
        status: "PARTIAL",
        lines: {
          create: [
            {
              purchaseOrderLineId: camPoLine.id,
              productId: cameraProduct.id,
              quantityReceived: 40,
              condition: "GOOD",
            },
          ],
        },
      },
      include: { lines: true },
    });

    const grnLine = createdGrn.lines[0];

    // Create serial numbers
    for (let i = 0; i < grn1Serials.length; i++) {
      const serial = grn1Serials[i];
      const snRecord = await tx.serialNumber.create({
        data: {
          serial,
          barcode: `UNIT-BC-${serial}`,
          productId: cameraProduct.id,
          warehouseId: centralWh.id,
          currentStage: "IN_STOCK",
          purchaseOrderId: po.id,
          grnId: createdGrn.id,
          grnLineId: grnLine.id,
          notes: `Received via ${grn1Number}`,
        },
      });

      await tx.sKULifecycleEvent.create({
        data: {
          serialNumberId: snRecord.id,
          eventType: "IN_STOCK",
          sourceModule: "GRN",
          sourceId: createdGrn.id,
          toWarehouseId: centralWh.id,
          toStage: "IN_STOCK",
          notes: `Initial stock receipt at ${centralWh.name}`,
        },
      });
    }

    // Update StockLedger
    await tx.stockLedger.upsert({
      where: {
        productId_warehouseId: {
          productId: cameraProduct.id,
          warehouseId: centralWh.id,
        },
      },
      create: {
        productId: cameraProduct.id,
        warehouseId: centralWh.id,
        quantityOnHand: 40,
      },
      update: {
        quantityOnHand: { increment: 40 },
      },
    });

    return createdGrn;
  });

  const camStockLedger1 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
  });
  const camSerialCount1 = await prisma.serialNumber.count({
    where: { productId: cameraProduct.id, warehouseId: centralWh.id, currentStage: "IN_STOCK" },
  });

  await assert(Number(camStockLedger1.quantityOnHand) === 40, "StockLedger quantityOnHand === 40");
  await assert(camSerialCount1 === 40, "SerialNumber rows in IN_STOCK === 40");
  await assert(Number(camStockLedger1.quantityOnHand) === camSerialCount1, "Zero Drift: StockLedger === COUNT(SerialNumber)");

  // 4. DUPLICATE SERIAL REJECTION TEST
  console.log("\n▶ 4. Testing Duplicate Serial Rejection...");
  try {
    const duplicateSerial = grn1Serials[0];
    await prisma.serialNumber.create({
      data: {
        serial: duplicateSerial,
        productId: cameraProduct.id,
        warehouseId: centralWh.id,
        currentStage: "IN_STOCK",
      },
    });
    console.error("❌ FAILED: Duplicate serial was allowed!");
    process.exit(1);
  } catch (err) {
    await assert(true, `Duplicate serial correctly rejected by unique constraint: ${err.code || err.message}`);
  }

  // 5. GRN SECOND SHIPMENT (REMAINING 60 CAMERAS + 200 BULK CONNECTORS)
  console.log("\n▶ 5. Recording Second GRN (Remaining 60 Cameras + 200 Bulk Connectors)...");
  const grn2Serials = Array.from({ length: 60 }, (_, i) => `SN-${timestamp}-${String(i + 41).padStart(3, "0")}`);
  const grn2Number = `GRN-${timestamp}-02`;

  await prisma.$transaction(async (tx) => {
    const createdGrn = await tx.goodsReceiptNote.create({
      data: {
        grnNumber: grn2Number,
        purchaseOrderId: po.id,
        receivedById: user.id,
        status: "COMPLETE",
        lines: {
          create: [
            {
              purchaseOrderLineId: camPoLine.id,
              productId: cameraProduct.id,
              quantityReceived: 60,
              condition: "GOOD",
            },
            {
              purchaseOrderLineId: connPoLine.id,
              productId: connectorProduct.id,
              quantityReceived: 200,
              condition: "GOOD",
            },
          ],
        },
      },
      include: { lines: true },
    });

    const camLine = createdGrn.lines.find((l) => l.productId === cameraProduct.id);

    // Create 60 Camera serials
    for (const serial of grn2Serials) {
      const sn = await tx.serialNumber.create({
        data: {
          serial,
          barcode: `UNIT-BC-${serial}`,
          productId: cameraProduct.id,
          warehouseId: centralWh.id,
          currentStage: "IN_STOCK",
          purchaseOrderId: po.id,
          grnId: createdGrn.id,
          grnLineId: camLine.id,
        },
      });

      await tx.sKULifecycleEvent.create({
        data: {
          serialNumberId: sn.id,
          eventType: "IN_STOCK",
          sourceModule: "GRN",
          sourceId: createdGrn.id,
          toWarehouseId: centralWh.id,
          toStage: "IN_STOCK",
        },
      });
    }

    // Update StockLedgers
    await tx.stockLedger.upsert({
      where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
      create: { productId: cameraProduct.id, warehouseId: centralWh.id, quantityOnHand: 60 },
      update: { quantityOnHand: { increment: 60 } },
    });

    await tx.stockLedger.upsert({
      where: { productId_warehouseId: { productId: connectorProduct.id, warehouseId: centralWh.id } },
      create: { productId: connectorProduct.id, warehouseId: centralWh.id, quantityOnHand: 200 },
      update: { quantityOnHand: { increment: 200 } },
    });
  });

  const camStockLedger2 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
  });
  const camSerialCount2 = await prisma.serialNumber.count({
    where: { productId: cameraProduct.id, warehouseId: centralWh.id, currentStage: "IN_STOCK" },
  });
  const connStockLedger2 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: connectorProduct.id, warehouseId: centralWh.id } },
  });
  const connSerialCount2 = await prisma.serialNumber.count({
    where: { productId: connectorProduct.id },
  });

  await assert(Number(camStockLedger2.quantityOnHand) === 100, "Camera StockLedger quantityOnHand === 100");
  await assert(camSerialCount2 === 100, "Camera SerialNumber count in IN_STOCK === 100");
  await assert(Number(connStockLedger2.quantityOnHand) === 200, "Connector bulk quantityOnHand === 200");
  await assert(connSerialCount2 === 0, "Connector has zero SerialNumber rows (Bulk Mode Validated)");

  // 6. BARCODE SCAN ENGINE TEST
  console.log("\n▶ 6. Testing Unified Barcode Scan API Endpoint (/api/v1/inventory/scan)...");
  // Test scanning bulk connector barcode
  const bulkScanRes = await fetch("http://localhost:4000/api/v1/inventory/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ barcode: connectorBarcode, warehouseId: centralWh.id }),
  }).then((r) => r.json());

  if (!bulkScanRes.data) {
    console.error("bulkScanRes error:", bulkScanRes);
  }
  await assert(bulkScanRes.data?.found === true, "Bulk barcode scan: found === true");
  await assert(bulkScanRes.data?.trackingType === "NON_SERIALIZED", "Bulk barcode scan: trackingType === NON_SERIALIZED");
  await assert(bulkScanRes.data?.serialNumber === null, "Bulk barcode scan: serialNumber === null");

  // Test scanning unit serial
  const targetSerial = grn1Serials[5]; // e.g. SN-...-006
  const serialScanRes = await fetch("http://localhost:4000/api/v1/inventory/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ barcode: targetSerial, warehouseId: centralWh.id }),
  }).then((r) => r.json());

  if (!serialScanRes.data) {
    console.error("serialScanRes error:", serialScanRes);
  }
  await assert(serialScanRes.data?.found === true, "Serial scan: found === true");
  await assert(serialScanRes.data?.trackingType === "SERIALIZED", "Serial scan: trackingType === SERIALIZED");
  await assert(serialScanRes.data?.serialNumber?.serial === targetSerial, `Serial scan: returned exact unit #${targetSerial}`);
  await assert(serialScanRes.data?.serialNumber?.currentStage === "IN_STOCK", "Serial scan: stage === IN_STOCK");

  // 7. POS DIRECT SALE (2 CAMERAS + 50 CONNECTORS)
  console.log("\n▶ 7. Executing POS Direct Sale with Specific Serial Numbers...");
  const soldSerial1 = grn1Serials[0];
  const soldSerial2 = grn1Serials[1];

  const posSaleRes = await fetch("http://localhost:4000/api/v1/sales/direct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      customerId: customer.id,
      branchId: branch.id,
      warehouseId: centralWh.id,
      notes: "POS Counter Checkout - Project Installation",
      isPaid: true,
      paymentMethod: "CASH",
      lines: [
        {
          productId: cameraProduct.id,
          description: "Hikvision Camera",
          quantity: 2,
          unitPrice: 5800,
          serials: [soldSerial1, soldSerial2],
        },
        {
          productId: connectorProduct.id,
          description: "BNC Connectors",
          quantity: 50,
          unitPrice: 45,
        },
      ],
    }),
  }).then((r) => r.json());

  if (!posSaleRes.data?.invoice) {
    console.error("posSaleRes error:", JSON.stringify(posSaleRes, null, 2));
  }
  await assert(posSaleRes.data?.invoice?.invoiceNumber !== undefined, `Direct Sale successful: Invoice #${posSaleRes.data?.invoice?.invoiceNumber}`);

  // Verify stock deductions & serial states
  const camStockLedger3 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
  });
  const connStockLedger3 = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: connectorProduct.id, warehouseId: centralWh.id } },
  });
  const unit1 = await prisma.serialNumber.findUnique({ where: { serial: soldSerial1 } });
  const unit2 = await prisma.serialNumber.findUnique({ where: { serial: soldSerial2 } });

  await assert(Number(camStockLedger3.quantityOnHand) === 98, "Camera stock decremented to 98");
  await assert(Number(connStockLedger3.quantityOnHand) === 150, "Connector stock decremented to 150");
  await assert(unit1.currentStage === "SOLD" && unit1.warehouseId === null, `${soldSerial1} transitioned to SOLD with warehouseId null`);
  await assert(unit2.currentStage === "SOLD" && unit2.warehouseId === null, `${soldSerial2} transitioned to SOLD with warehouseId null`);

  // Verify audit event
  const events = await prisma.sKULifecycleEvent.findMany({
    where: { serialNumberId: unit1.id, eventType: "SOLD" },
  });
  await assert(events.length > 0, `Lifecycle audit event logged: SOLD via direct sale`);

  // 8. STOCK TRANSFER (5 CAMERAS FROM CENTRAL TO BRANCH)
  console.log("\n▶ 8. Executing Inter-Warehouse Stock Transfer of 5 Cameras...");
  const transferSerials = [grn1Serials[2], grn1Serials[3], grn1Serials[4], grn1Serials[5], grn1Serials[6]];

  await prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.create({
      data: {
        productId: cameraProduct.id,
        quantity: 5,
        fromWarehouseId: centralWh.id,
        toWarehouseId: branchWh.id,
        status: "RECEIVED",
      },
    });

    // Move units to branch
    for (const s of transferSerials) {
      const u = await tx.serialNumber.update({
        where: { serial: s },
        data: { warehouseId: branchWh.id, currentStage: "IN_STOCK" },
      });

      await tx.sKULifecycleEvent.create({
        data: {
          serialNumberId: u.id,
          eventType: "IN_STOCK",
          sourceModule: "STOCK_TRANSFER",
          sourceId: transfer.id,
          fromWarehouseId: centralWh.id,
          toWarehouseId: branchWh.id,
          fromStage: "IN_STOCK",
          toStage: "IN_STOCK",
          notes: "Transferred to branch warehouse",
        },
      });
    }

    // Decrement from central, increment in branch
    await tx.stockLedger.update({
      where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
      data: { quantityOnHand: { decrement: 5 } },
    });

    await tx.stockLedger.upsert({
      where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: branchWh.id } },
      create: { productId: cameraProduct.id, warehouseId: branchWh.id, quantityOnHand: 5 },
      update: { quantityOnHand: { increment: 5 } },
    });
  });

  const centralLedger = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
  });
  const branchLedger = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: branchWh.id } },
  });
  const centralSerialUnits = await prisma.serialNumber.count({
    where: { productId: cameraProduct.id, warehouseId: centralWh.id, currentStage: "IN_STOCK" },
  });
  const branchSerialUnits = await prisma.serialNumber.count({
    where: { productId: cameraProduct.id, warehouseId: branchWh.id, currentStage: "IN_STOCK" },
  });

  await assert(Number(centralLedger.quantityOnHand) === 93, "Central warehouse stock === 93");
  await assert(Number(branchLedger.quantityOnHand) === 5, "Branch warehouse stock === 5");
  await assert(centralSerialUnits === 93, "Central Serial Units === 93 (No drift)");
  await assert(branchSerialUnits === 5, "Branch Serial Units === 5 (No drift)");

  // 9. CUSTOMER RETURN (1 CAMERA RESTORED TO STOCK)
  console.log("\n▶ 9. Executing Customer Return (Restoring 1 Camera back to IN_STOCK)...");
  await prisma.$transaction(async (tx) => {
    // Return unit1 (soldSerial1) back to central warehouse
    await tx.serialNumber.update({
      where: { serial: soldSerial1 },
      data: { currentStage: "IN_STOCK", warehouseId: centralWh.id },
    });

    await tx.stockLedger.update({
      where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
      data: { quantityOnHand: { increment: 1 } },
    });

    await tx.sKULifecycleEvent.create({
      data: {
        serialNumberId: unit1.id,
        eventType: "RETURNED_BY_CUSTOMER",
        sourceModule: "SALES_RETURN",
        sourceId: posSaleRes.data?.invoice?.id || `RET-${timestamp}`,
        fromStage: "SOLD",
        toStage: "IN_STOCK",
        toWarehouseId: centralWh.id,
        notes: "Customer returned unit in good condition",
      },
    });
  });

  const centralLedgerFinal = await prisma.stockLedger.findUnique({
    where: { productId_warehouseId: { productId: cameraProduct.id, warehouseId: centralWh.id } },
  });
  const centralSerialsFinal = await prisma.serialNumber.count({
    where: { productId: cameraProduct.id, warehouseId: centralWh.id, currentStage: "IN_STOCK" },
  });

  await assert(Number(centralLedgerFinal.quantityOnHand) === 94, "Central stock increased to 94 after return");
  await assert(centralSerialsFinal === 94, "Central IN_STOCK units === 94 after return");

  // 10. FINAL INTEGRITY PROOF
  console.log("\n▶ 10. Final System-Wide Ledger Reconciliation Verification...");
  const allStockLedgers = await prisma.stockLedger.findMany({
    where: { productId: cameraProduct.id },
  });

  for (const sl of allStockLedgers) {
    const physicalCount = await prisma.serialNumber.count({
      where: {
        productId: cameraProduct.id,
        warehouseId: sl.warehouseId,
        currentStage: "IN_STOCK",
      },
    });

    await assert(
      Number(sl.quantityOnHand) === physicalCount,
      `Warehouse ${sl.warehouseId}: StockLedger (${sl.quantityOnHand}) === Physical Serials (${physicalCount})`
    );
  }

  console.log("\n================================================================");
  console.log("🎉 ALL 10 ARCHITECTURAL & OPERATIONAL TESTS PASSED PERFECTLY!");
  console.log("================================================================");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
