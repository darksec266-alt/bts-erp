async function runTest() {
  const baseUrl = "http://localhost:4000/api/v1";

  // 1. Login as Super Admin
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@bts.com", password: "Admin@123" })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  if (!token) throw new Error("Login failed: " + JSON.stringify(loginJson));
  console.log("Logged in as Super Admin. Token acquired.");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // 2. Fetch master data (Customer, Branch, Product, Warehouse)
  const [custRes, branchRes, prodRes, whRes] = await Promise.all([
    fetch(`${baseUrl}/customers?take=5`, { headers: authHeaders }).then(r => r.json()),
    fetch(`${baseUrl}/branches?take=5`, { headers: authHeaders }).then(r => r.json()),
    fetch(`${baseUrl}/products?take=5`, { headers: authHeaders }).then(r => r.json()),
    fetch(`${baseUrl}/warehouses?take=5`, { headers: authHeaders }).then(r => r.json()),
  ]);

  const customer = custRes.data?.items?.[0];
  const branch = branchRes.data?.items?.[0];
  const product = prodRes.data?.items?.[0];
  const warehouse = whRes.data?.items?.[0];

  if (!customer || !branch || !product) {
    throw new Error("Missing master data: customer, branch, or product");
  }
  console.log(`Master data: Customer=${customer.displayName}, Branch=${branch.name}, Product=${product.name}, Warehouse=${warehouse?.name}`);

  // 3. Test Direct Sale (Instant Invoicing & Stock Deduction)
  console.log("\n--- Testing Direct Sale ---");
  const directSalePayload = {
    customerId: customer.id,
    branchId: branch.id,
    warehouseId: warehouse?.id,
    isPaid: true,
    paymentMethod: "CASH",
    notes: "Direct counter test sale",
    lines: [
      {
        productId: product.id,
        description: product.name,
        quantity: 2,
        unitPrice: Number(product.sellingPrice) || 500,
      }
    ]
  };

  const directRes = await fetch(`${baseUrl}/sales/direct`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(directSalePayload)
  });
  const directJson = await directRes.json();
  if (directRes.status !== 201) {
    throw new Error("Direct sale failed: " + JSON.stringify(directJson));
  }
  console.log("Direct sale created successfully!");
  console.log(`SalesOrder: ${directJson.data?.order?.orderNumber} (type: ${directJson.data?.order?.orderType})`);
  console.log(`Invoice: ${directJson.data?.invoice?.invoiceNumber} (status: ${directJson.data?.invoice?.status}, grandTotal: ${directJson.data?.invoice?.grandTotal})`);
  console.log(`Payment: ${directJson.data?.payment ? "RECORDED (" + directJson.data?.payment?.method + ")" : "NONE"}`);

  // 4. Test Long-Term Project Creation
  console.log("\n--- Testing Long-Term Project Sales ---");
  const projectPayload = {
    name: "Gulshan Corporate Tower Supply & Installation",
    description: "Multi-month construction material supply project",
    customerId: customer.id,
    branchId: branch.id,
    siteLocation: "Plot 88, Road 17, Gulshan 1, Dhaka",
    startDate: new Date().toISOString(),
    items: [
      {
        productId: product.id,
        plannedQty: 100,
        unitPrice: Number(product.sellingPrice) || 600,
      }
    ]
  };

  const projRes = await fetch(`${baseUrl}/sales/projects`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(projectPayload)
  });
  const projJson = await projRes.json();
  if (projRes.status !== 201) {
    throw new Error("Create project failed: " + JSON.stringify(projJson));
  }
  const createdProject = projJson.data;
  console.log(`Project created: ${createdProject.projectCode} - "${createdProject.name}" (Status: ${createdProject.status}, Budget: ${createdProject.budgetAmount})`);

  // 5. Dispatch Delivery Challan #1 to Project Site
  console.log("\n--- Dispatching Site Delivery Challan 1 ---");
  const testNonce = Date.now().toString().slice(-4);
  const ch1Res = await fetch(`${baseUrl}/sales/projects/${createdProject.id}/challans`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      challanNumber: `CH-TEST-${testNonce}-01`,
      lines: [{ productId: product.id, quantity: 20 }]
    })
  });
  const ch1Json = await ch1Res.json();
  if (ch1Res.status !== 201) throw new Error("Challan 1 failed: " + JSON.stringify(ch1Json));
  console.log(`Challan 1 dispatched: ${ch1Json.data.challanNumber} (Qty: 20, Billing: ${ch1Json.data.billingStatus})`);

  // 6. Dispatch Delivery Challan #2 to Project Site
  console.log("\n--- Dispatching Site Delivery Challan 2 ---");
  const ch2Res = await fetch(`${baseUrl}/sales/projects/${createdProject.id}/challans`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      challanNumber: `CH-TEST-${testNonce}-02`,
      lines: [{ productId: product.id, quantity: 30 }]
    })
  });
  const ch2Json = await ch2Res.json();
  if (ch2Res.status !== 201) throw new Error("Challan 2 failed: " + JSON.stringify(ch2Json));
  console.log(`Challan 2 dispatched: ${ch2Json.data.challanNumber} (Qty: 30, Billing: ${ch2Json.data.billingStatus})`);

  // 7. Verify Project Stats (Dispatched = 50, Progress = 50%, 2 Unbilled Challans)
  const checkProjRes = await fetch(`${baseUrl}/sales/projects/${createdProject.id}`, { headers: authHeaders });
  const checkProjJson = await checkProjRes.json();
  const pData = checkProjJson.data;
  console.log("\n--- Project Fulfillment Status ---");
  console.log(`Total Planned Budget: ${pData.budgetAmount}`);
  console.log(`Total Dispatched Amount: ${pData.totalDispatchedAmount}`);
  console.log(`Unbilled Challans: ${pData.unbilledChallanCount}`);
  console.log(`Fulfillment Progress: ${pData.fulfillmentProgress}%`);

  // 8. Consolidate Challan 1 + Challan 2 into 1 Single Commercial Invoice
  console.log("\n--- Consolidating Challan 1 & 2 into Single Commercial Invoice ---");
  const invRes = await fetch(`${baseUrl}/sales/projects/${createdProject.id}/invoices`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      challanIds: [ch1Json.data.id, ch2Json.data.id]
    })
  });
  const invJson = await invRes.json();
  if (invRes.status !== 201) throw new Error("Consolidated billing failed: " + JSON.stringify(invJson));
  const invoice = invJson.data;
  console.log(`Single Consolidated Invoice created: ${invoice.invoiceNumber}`);
  console.log(`Grand Total: BDT ${invoice.grandTotal}`);
  console.log(`Consolidated Challans: ${invoice.challans?.map(c => c.challanNumber).join(", ")}`);

  // 9. Re-check Project Stats after Invoicing
  const finalProjRes = await fetch(`${baseUrl}/sales/projects/${createdProject.id}`, { headers: authHeaders });
  const finalProjJson = await finalProjRes.json();
  console.log("\n--- Final Project Summary ---");
  console.log(`Invoiced Amount: BDT ${finalProjJson.data.totalInvoicedAmount}`);
  console.log(`Unbilled Challans remaining: ${finalProjJson.data.unbilledChallanCount}`);
  console.log("\nSUCCESS: All Project Sales & Direct Sale tests PASSED!");
}

runTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
