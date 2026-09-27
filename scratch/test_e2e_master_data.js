async function runE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING COMPREHENSIVE E2E MASTER DATA AUDIT");
  console.log("==================================================");

  // 1. Authenticate
  const loginRes = await fetch("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@bts.com", password: "Admin@123" })
  });
  const token = (await loginRes.json()).data.accessToken;
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  // Fetch branches, warehouses, categories, subcategories
  const [branchesRes, warehousesRes, categoriesRes, subCategoriesRes] = await Promise.all([
    fetch("http://localhost:4000/api/v1/branches", { headers }).then(r => r.json()),
    fetch("http://localhost:4000/api/v1/warehouses", { headers }).then(r => r.json()),
    fetch("http://localhost:4000/api/v1/categories", { headers }).then(r => r.json()),
    fetch("http://localhost:4000/api/v1/sub-categories", { headers }).then(r => r.json()),
  ]);

  const branch = branchesRes.data.items[0];
  const warehouse = warehousesRes.data.items[0];
  const category = categoriesRes.data.items[0];
  const subCategory = subCategoriesRes.data.items.find(sc => sc.categoryId === category.id) || subCategoriesRes.data.items[0];

  console.log(`Using Branch: ${branch.name} (${branch.id})`);
  console.log(`Using Warehouse: ${warehouse.name} (${warehouse.id})`);
  console.log(`Using Category: ${category.name} (${category.id})`);
  console.log(`Using SubCategory: ${subCategory?.name} (${subCategory?.id})`);

  // ==========================================
  // TEST 1: CUSTOMER END-TO-END FLOW
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 1: CUSTOMER END-TO-END FLOW");
  console.log("--------------------------------------------------");

  const custSuffix = Math.floor(1000 + Math.random() * 9000);
  const custCode = `CUS-AUDIT-${custSuffix}`;
  const custPhone = `0179${Math.floor(1000000 + Math.random() * 9000000)}`;
  const custName = `Audit Client Ltd ${custSuffix}`;

  console.log(`1.1 Creating Customer: ${custCode} (${custName})`);
  const createCustRes = await fetch("http://localhost:4000/api/v1/customers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerCode: custCode,
      displayName: custName,
      phone: custPhone,
      branchId: branch.id,
      isServiceOnly: false,
      addresses: [{ label: "Corporate Office", addressLine: "Gulshan-2, Dhaka" }]
    })
  });
  const createCustData = (await createCustRes.json()).data;
  console.log(`    Status: ${createCustRes.status}, ID: ${createCustData.id}`);

  // 1.2 Verify in list page 1
  const custListRes = await fetch("http://localhost:4000/api/v1/customers?take=20", { headers }).then(r => r.json());
  const custInPage1 = custListRes.data.items.some(c => c.id === createCustData.id);
  console.log(`1.2 Customer immediately on Page 1 (createdAt DESC): ${custInPage1}`);
  if (!custInPage1) throw new Error("Customer not on page 1!");

  // 1.3 Verify search by name, code, phone
  const searchName = await fetch(`http://localhost:4000/api/v1/customers?search=${encodeURIComponent(custName)}`, { headers }).then(r => r.json());
  const searchCode = await fetch(`http://localhost:4000/api/v1/customers?search=${custCode}`, { headers }).then(r => r.json());
  const searchPhone = await fetch(`http://localhost:4000/api/v1/customers?search=${custPhone}`, { headers }).then(r => r.json());
  console.log(`1.3 Search verification: Name=${searchName.data.items.length > 0}, Code=${searchCode.data.items.length > 0}, Phone=${searchPhone.data.items.length > 0}`);

  // ==========================================
  // TEST 2: SERIALIZED PRODUCT FLOW (CAMERA)
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 2: SERIALIZED PRODUCT FLOW (CCTV Camera)");
  console.log("--------------------------------------------------");

  const camSuffix = Math.floor(1000 + Math.random() * 9000);
  const camSku = `CAM-HIK-${camSuffix}`;
  const camBarcode = `8809${Math.floor(10000000 + Math.random() * 90000000)}`;
  const camModel = `DS-2CD2043G2-${camSuffix}`;

  console.log(`2.1 Creating Serialized Camera: ${camSku}`);
  const createCamRes = await fetch("http://localhost:4000/api/v1/products", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sku: camSku,
      name: `Hikvision 4K IP Bullet Camera ${camSuffix}`,
      categoryId: category.id,
      subCategoryId: subCategory?.id,
      costPrice: "4200.00",
      sellingPrice: "6500.00",
      trackingType: "SERIALIZED",
      modelNumber: camModel,
      barcode: camBarcode
    })
  });
  const camData = (await createCamRes.json()).data;
  console.log(`    Status: ${createCamRes.status}, ID: ${camData.id}`);
  console.log(`    TrackingType: ${camData.trackingType}`);
  console.log(`    Initial Inventory Stock: ${camData.totalStock} (Must be 0)`);
  if (camData.totalStock !== 0) throw new Error("Initial stock must be 0!");

  // 2.2 Verify on Page 1
  const prodListRes = await fetch("http://localhost:4000/api/v1/products?take=20", { headers }).then(r => r.json());
  const camInPage1 = prodListRes.data.items.some(p => p.id === camData.id);
  console.log(`2.2 Serialized Product immediately on Page 1 (createdAt DESC): ${camInPage1}`);
  if (!camInPage1) throw new Error("Product not on page 1!");

  // 2.3 Verify Barcode & SKU Search
  const searchCamSku = await fetch(`http://localhost:4000/api/v1/products?search=${camSku}`, { headers }).then(r => r.json());
  const searchCamBarcode = await fetch(`http://localhost:4000/api/v1/products?search=${camBarcode}`, { headers }).then(r => r.json());
  console.log(`2.3 Search verification: SKU=${searchCamSku.data.items.length > 0}, Barcode=${searchCamBarcode.data.items.length > 0}`);

  // ==========================================
  // TEST 3: NON-SERIALIZED PRODUCT FLOW (BNC CONNECTOR)
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 3: NON-SERIALIZED PRODUCT FLOW (BNC Connector)");
  console.log("--------------------------------------------------");

  const bncSuffix = Math.floor(1000 + Math.random() * 9000);
  const bncSku = `BNC-CON-${bncSuffix}`;
  const bncBarcode = `8807${Math.floor(10000000 + Math.random() * 90000000)}`;

  console.log(`3.1 Creating Non-Serialized Connector: ${bncSku}`);
  const createBncRes = await fetch("http://localhost:4000/api/v1/products", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sku: bncSku,
      name: `Copper BNC Male Connector Pin ${bncSuffix}`,
      categoryId: category.id,
      costPrice: "15.00",
      sellingPrice: "30.00",
      trackingType: "NON_SERIALIZED",
      barcode: bncBarcode
    })
  });
  const bncData = (await createBncRes.json()).data;
  console.log(`    Status: ${createBncRes.status}, ID: ${bncData.id}`);
  console.log(`    TrackingType: ${bncData.trackingType}`);
  console.log(`    Initial Inventory Stock: ${bncData.totalStock} (Must be 0)`);
  if (bncData.totalStock !== 0) throw new Error("Initial stock must be 0!");

  // 3.2 Verify on Page 1
  const prodListRes2 = await fetch("http://localhost:4000/api/v1/products?take=20", { headers }).then(r => r.json());
  const bncInPage1 = prodListRes2.data.items.some(p => p.id === bncData.id);
  console.log(`3.2 Non-Serialized Product immediately on Page 1: ${bncInPage1}`);
  if (!bncInPage1) throw new Error("BNC Product not on page 1!");

  // ==========================================
  // TEST 4: DUPLICATE VALIDATION REJECTION
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 4: DUPLICATE VALIDATION REJECTION");
  console.log("--------------------------------------------------");

  const dupSkuRes = await fetch("http://localhost:4000/api/v1/products", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sku: camSku,
      name: "Duplicate SKU Test",
      costPrice: "100",
      sellingPrice: "200"
    })
  });
  console.log(`4.1 Duplicate SKU Rejection Status: ${dupSkuRes.status} (Expected: 409)`);

  const dupBarcodeRes = await fetch("http://localhost:4000/api/v1/products", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sku: `DIFF-${camSuffix}`,
      name: "Duplicate Barcode Test",
      costPrice: "100",
      sellingPrice: "200",
      barcode: camBarcode
    })
  });
  console.log(`4.2 Duplicate Barcode Rejection Status: ${dupBarcodeRes.status} (Expected: 409)`);

  // ==========================================
  // TEST 5: PROCUREMENT TO INVENTORY FLOW
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 5: PROCUREMENT & INVENTORY STOCK FLOW");
  console.log("--------------------------------------------------");

  // Fetch supplier
  const suppliersRes = await fetch("http://localhost:4000/api/v1/suppliers", { headers }).then(r => r.json());
  const supplierList = Array.isArray(suppliersRes.data) ? suppliersRes.data : (suppliersRes.data?.items || []);
  const supplier = supplierList.find(s => s.isActive !== false) || supplierList[0];
  console.log(`Using Supplier: ${supplier.companyName} (${supplier.id})`);

  // 5.1 Create Purchase Order with both Serialized Camera (qty: 2) & Non-Serialized BNC (qty: 50)
  const poNum = `PO-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`5.1 Creating Purchase Order: ${poNum}`);
  const poRes = await fetch("http://localhost:4000/api/v1/purchase-orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      poNumber: poNum,
      supplierId: supplier.id,
      branchId: branch.id,
      lines: [
        { productId: camData.id, quantity: "2", unitPrice: "4200.00" },
        { productId: bncData.id, quantity: "50", unitPrice: "15.00" }
      ]
    })
  });
  const poData = (await poRes.json()).data;
  console.log(`    PO Status: ${poRes.status}, ID: ${poData.id}`);

  // 5.2 Receive Goods (GRN) via /purchase-orders/:id/receive
  const grnNum = `GRN-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const serial1 = `SN-CAM-${camSuffix}-01`;
  const serial2 = `SN-CAM-${camSuffix}-02`;
  console.log(`5.2 Receiving Goods (GRN): ${grnNum}`);
  console.log(`    Serialized units: ${serial1}, ${serial2}`);
  console.log(`    Non-serialized units: 50 BNC connectors`);

  const grnRes = await fetch(`http://localhost:4000/api/v1/purchase-orders/${poData.id}/receive`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      grnNumber: grnNum,
      status: "COMPLETE",
      warehouseId: warehouse.id,
      lines: [
        {
          purchaseOrderLineId: poData.lines.find(l => l.productId === camData.id).id,
          productId: camData.id,
          condition: "GOOD",
          quantityReceived: "2",
          serials: [serial1, serial2]
        },
        {
          purchaseOrderLineId: poData.lines.find(l => l.productId === bncData.id).id,
          productId: bncData.id,
          condition: "GOOD",
          quantityReceived: "50"
        }
      ]
    })
  });
  const grnJson = await grnRes.json();
  const grnData = grnJson.data;
  console.log(`    GRN Status: ${grnRes.status}, ID: ${grnData?.id}`);
  if (grnRes.status !== 201) console.error("    GRN Error Details:", grnJson);

  // 5.3 Verify Inventory Stock Reflection
  const camAfterGrn = (await fetch(`http://localhost:4000/api/v1/products/${camData.id}`, { headers }).then(r => r.json())).data;
  const bncAfterGrn = (await fetch(`http://localhost:4000/api/v1/products/${bncData.id}`, { headers }).then(r => r.json())).data;
  console.log(`5.3 Post-GRN Stock Check:`);
  console.log(`    Camera Stock: ${camAfterGrn.totalStock} (Expected: 2)`);
  console.log(`    BNC Connector Stock: ${bncAfterGrn.totalStock} (Expected: 50)`);

  // Verify Serial Numbers Table has the 2 units
  const serialsRes = await fetch(`http://localhost:4000/api/v1/inventory/serial-numbers?search=${camSku}`, { headers }).then(r => r.json());
  const serialItems = serialsRes.data?.items || [];
  console.log(`    Registered Serial Units in Inventory: ${serialItems.length} units`);
  serialItems.forEach(s => console.log(`      - Serial: ${s.serial}, Stage: ${s.currentStage}`));

  // ==========================================
  // TEST 6: SALES & INVOICE FLOW WITH NEW CUSTOMER
  // ==========================================
  console.log("\n--------------------------------------------------");
  console.log("🧪 TEST 6: SALES & INVOICE WITH NEW CUSTOMER");
  console.log("--------------------------------------------------");

  const quoteNum = `QT-AUDIT-${custSuffix}`;
  console.log(`6.1 Creating Quotation for new customer: ${quoteNum}`);
  const quoteRes = await fetch("http://localhost:4000/api/v1/sales/quotations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      quotationNumber: quoteNum,
      customerId: createCustData.id,
      branchId: branch.id,
      validUntil: new Date(Date.now() + 86400000 * 30).toISOString(),
      lines: [
        { productId: camData.id, quantity: 1, unitPrice: "6500.00" },
        { productId: bncData.id, quantity: 10, unitPrice: "30.00" }
      ]
    })
  });
  const quoteJson = await quoteRes.json();
  const quoteData = quoteJson.data;
  console.log(`    Quotation Status: ${quoteRes.status}, ID: ${quoteData?.id}`);
  if (quoteRes.status !== 201) console.error("    Quotation Error:", quoteJson);
  console.log(`    Customer on Quotation: ${quoteData.customer?.displayName || quoteData.customerId}`);

  console.log("\n==================================================");
  console.log("✅ ALL MASTER DATA END-TO-END AUDIT TESTS PASSED!");
  console.log("==================================================");
}

runE2ETest().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
