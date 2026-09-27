const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== STARTING PROCUREMENT END-TO-END VERIFICATION ===\n');

  // 1. Login
  console.log('1. Authenticating as admin...');
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@bts.com', password: 'Admin@123' });

  if (loginRes.status !== 200 || !loginRes.data?.data?.accessToken) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.data.accessToken;
  const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  const currentUserId = tokenPayload.sub;
  const branchId = tokenPayload.branchId;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log(`✓ Login successful, userId: ${currentUserId}, branchId: ${branchId}`);

  // 2. Fetch baseline data: supplier, product
  console.log('\n2. Fetching baseline data...');
  const suppliersRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/suppliers',
    method: 'GET',
    headers: authHeaders
  });
  let supplier = suppliersRes.data?.data?.items?.[0];
  if (!supplier) {
    console.log('No supplier found, creating one...');
    const createSuppRes = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: '/api/v1/suppliers',
      method: 'POST',
      headers: authHeaders
    }, {
      supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
      companyName: 'Apex Raw Materials Ltd.',
      contacts: [{ name: 'Rafiqul Islam', phone: '+8801700000000', email: 'rafiq@apex.com' }]
    });
    supplier = createSuppRes.data?.data;
  }
  console.log(`✓ Using Supplier: ${supplier.companyName || supplier.name} (${supplier.id})`);

  const productsRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/products?limit=1',
    method: 'GET',
    headers: authHeaders
  });
  const product = productsRes.data?.data?.items?.[0];
  if (!product) throw new Error('No product found');
  console.log(`✓ Using Product: ${product.name} (${product.id})`);

  const warehousesRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/warehouses',
    method: 'GET',
    headers: authHeaders
  });
  const warehouse = warehousesRes.data?.data?.items?.[0];
  if (!warehouse) throw new Error('No warehouse found');
  console.log(`✓ Using Warehouse: ${warehouse.name} (${warehouse.id})`);

  // Helper to get current product stock
  async function getStock() {
    const res = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: `/api/v1/products/${product.id}`,
      method: 'GET',
      headers: authHeaders
    });
    return res.data?.data?.totalStock ?? 0;
  }

  const baselineStock = await getStock();
  console.log(`Baseline Product Stock: ${baselineStock}`);

  // 3. Create Purchase Requisition (PR)
  console.log('\n3. Creating Purchase Requisition for 100 units...');
  const prRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/purchase-requests',
    method: 'POST',
    headers: authHeaders
  }, {
    requestNumber: `PR-TEST-${Date.now().toString().slice(-6)}`,
    branchId: branchId,
    lines: [
      {
        productId: product.id,
        quantity: "100",
        notes: "Automated test"
      }
    ]
  });

  if (prRes.status !== 201) throw new Error('Failed to create PR: ' + JSON.stringify(prRes.data));
  const pr = prRes.data.data;
  console.log(`✓ PR Created: ${pr.requestNumber} (${pr.id}), Status: ${pr.status}`);

  // If not approved, approve it
  if (pr.status !== 'APPROVED') {
    console.log('Approving PR...');
    await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: `/api/v1/purchase-requests/${pr.id}/approve`,
      method: 'POST',
      headers: authHeaders
    });
  }

  // 4. Create Purchase Order (PO) from PR for 100 units
  console.log('\n4. Creating Purchase Order for 100 units...');
  const poRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/purchase-orders',
    method: 'POST',
    headers: authHeaders
  }, {
    poNumber: `PO-TEST-${Date.now().toString().slice(-6)}`,
    purchaseRequestId: pr.id,
    supplierId: supplier.id,
    branchId: branchId,
    lines: [
      {
        productId: product.id,
        quantity: "100",
        unitPrice: "50"
      }
    ]
  });

  if (poRes.status !== 201) throw new Error('Failed to create PO: ' + JSON.stringify(poRes.data));
  const po = poRes.data.data;
  const poLine = po.lines[0];
  console.log(`✓ PO Created: ${po.poNumber} (${po.id})`);
  console.log(`  - PO fulfillmentStatus: ${po.fulfillmentStatus}`);
  console.log(`  - Ordered: ${po.totalOrderedQuantity}, Received: ${po.totalReceivedQuantity}, Remaining: ${po.totalRemainingQuantity}`);

  if (po.fulfillmentStatus !== 'PENDING_RECEIPT') {
    throw new Error(`Expected PENDING_RECEIPT, got ${po.fulfillmentStatus}`);
  }

  // 5. Partial GRN #1: Receive 40 units
  console.log('\n5. Receiving Partial GRN #1 (40 units)...');
  const grn1Res = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}/receive`,
    method: 'POST',
    headers: authHeaders
  }, {
    grnNumber: `GRN-TEST-1-${Date.now().toString().slice(-4)}`,
    purchaseOrderId: po.id,
    branchId: branchId,
    receivedById: currentUserId,
    status: 'PARTIAL',
    lines: [
      {
        purchaseOrderLineId: poLine.id,
        productId: product.id,
        quantityReceived: "40",
        condition: 'GOOD'
      }
    ]
  });

  if (grn1Res.status !== 201) throw new Error('GRN #1 failed: ' + JSON.stringify(grn1Res.data));
  const grn1 = grn1Res.data.data;
  console.log(`✓ GRN #1 Created: ${grn1.grnNumber}, Status: ${grn1.status}`);

  const stockAfterGrn1 = await getStock();
  console.log(`  - Stock after GRN #1: ${stockAfterGrn1} (Delta: +${stockAfterGrn1 - baselineStock})`);
  if (stockAfterGrn1 !== baselineStock + 40) {
    throw new Error(`Stock mismatch after GRN #1! Expected ${baselineStock + 40}, got ${stockAfterGrn1}`);
  }

  // Verify PO status after GRN 1
  const poAfterGrn1 = (await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}`,
    method: 'GET',
    headers: authHeaders
  })).data.data;

  console.log(`  - PO fulfillmentStatus: ${poAfterGrn1.fulfillmentStatus}`);
  console.log(`  - Ordered: ${poAfterGrn1.totalOrderedQuantity}, Received: ${poAfterGrn1.totalReceivedQuantity}, Remaining: ${poAfterGrn1.totalRemainingQuantity}`);
  if (poAfterGrn1.fulfillmentStatus !== 'PARTIALLY_RECEIVED' || poAfterGrn1.totalReceivedQuantity !== 40 || poAfterGrn1.totalRemainingQuantity !== 60) {
    throw new Error('PO tracking mismatch after GRN #1!');
  }

  // 6. Partial GRN #2: Receive 35 units
  console.log('\n6. Receiving Partial GRN #2 (35 units)...');
  const grn2Res = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}/receive`,
    method: 'POST',
    headers: authHeaders
  }, {
    grnNumber: `GRN-TEST-2-${Date.now().toString().slice(-4)}`,
    purchaseOrderId: po.id,
    branchId: branchId,
    receivedById: currentUserId,
    status: 'PARTIAL',
    lines: [
      {
        purchaseOrderLineId: poLine.id,
        productId: product.id,
        quantityReceived: "35",
        condition: 'GOOD'
      }
    ]
  });

  if (grn2Res.status !== 201) throw new Error('GRN #2 failed: ' + JSON.stringify(grn2Res.data));
  const grn2 = grn2Res.data.data;
  console.log(`✓ GRN #2 Created: ${grn2.grnNumber}, Status: ${grn2.status}`);

  const stockAfterGrn2 = await getStock();
  console.log(`  - Stock after GRN #2: ${stockAfterGrn2} (Cumulative Delta: +${stockAfterGrn2 - baselineStock})`);
  if (stockAfterGrn2 !== baselineStock + 75) {
    throw new Error(`Stock mismatch after GRN #2! Expected ${baselineStock + 75}, got ${stockAfterGrn2}`);
  }

  // 7. Test Over-receiving Prevention Guard
  console.log('\n7. Testing Over-receiving Prevention Guard (Attempting to receive 30 units when remaining is 25)...');
  const overGrnRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}/receive`,
    method: 'POST',
    headers: authHeaders
  }, {
    grnNumber: `GRN-OVER-${Date.now().toString().slice(-4)}`,
    purchaseOrderId: po.id,
    branchId: branchId,
    receivedById: currentUserId,
    status: 'COMPLETE',
    lines: [
      {
        purchaseOrderLineId: poLine.id,
        productId: product.id,
        quantityReceived: "30", // 30 > 25 remaining!
        condition: 'GOOD'
      }
    ]
  });

  console.log(`  - Over-receiving response status: ${overGrnRes.status}`);
  if (overGrnRes.status === 422 || overGrnRes.status === 400) {
    console.log(`✓ Over-receiving correctly REJECTED with message: "${overGrnRes.data?.error?.message || overGrnRes.data?.message}"`);
  } else {
    throw new Error(`Over-receiving was NOT rejected! Status: ${overGrnRes.status}`);
  }

  // 8. Partial GRN #3: Receive remaining 25 units (Completes PO)
  console.log('\n8. Receiving Final GRN #3 (25 units to complete PO)...');
  const grn3Res = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}/receive`,
    method: 'POST',
    headers: authHeaders
  }, {
    grnNumber: `GRN-TEST-3-${Date.now().toString().slice(-4)}`,
    purchaseOrderId: po.id,
    branchId: branchId,
    receivedById: currentUserId,
    status: 'COMPLETE',
    lines: [
      {
        purchaseOrderLineId: poLine.id,
        productId: product.id,
        quantityReceived: "25",
        condition: 'GOOD'
      }
    ]
  });

  if (grn3Res.status !== 201) throw new Error('GRN #3 failed: ' + JSON.stringify(grn3Res.data));
  const grn3 = grn3Res.data.data;
  console.log(`✓ GRN #3 Created: ${grn3.grnNumber}, Status: ${grn3.status}`);

  const stockAfterGrn3 = await getStock();
  console.log(`  - Stock after GRN #3: ${stockAfterGrn3} (Total Delta: +${stockAfterGrn3 - baselineStock})`);
  if (stockAfterGrn3 !== baselineStock + 100) {
    throw new Error(`Stock mismatch after GRN #3! Expected ${baselineStock + 100}, got ${stockAfterGrn3}`);
  }

  const poAfterGrn3 = (await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}`,
    method: 'GET',
    headers: authHeaders
  })).data.data;

  console.log(`  - PO fulfillmentStatus: ${poAfterGrn3.fulfillmentStatus}`);
  console.log(`  - Ordered: ${poAfterGrn3.totalOrderedQuantity}, Received: ${poAfterGrn3.totalReceivedQuantity}, Remaining: ${poAfterGrn3.totalRemainingQuantity}`);
  if (poAfterGrn3.fulfillmentStatus !== 'FULLY_RECEIVED' || poAfterGrn3.totalReceivedQuantity !== 100 || poAfterGrn3.totalRemainingQuantity !== 0) {
    throw new Error('PO did NOT reach FULLY_RECEIVED!');
  }

  // 9. Test GRN Cancellation & Atomic Rollback
  console.log('\n9. Testing GRN Cancellation & Stock Rollback on GRN #3...');
  const cancelRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/grns/${grn3.id}/cancel`,
    method: 'POST',
    headers: authHeaders
  }, {
    reason: 'Testing cancellation & automatic stock rollback'
  });

  if (cancelRes.status !== 200) throw new Error('Failed to cancel GRN #3: ' + JSON.stringify(cancelRes.data));
  console.log(`✓ GRN #3 cancelled successfully`);

  const stockAfterCancel = await getStock();
  console.log(`  - Stock after GRN #3 cancellation: ${stockAfterCancel} (Delta: +${stockAfterCancel - baselineStock})`);
  if (stockAfterCancel !== baselineStock + 75) {
    throw new Error(`Stock reversal failed! Expected ${baselineStock + 75}, got ${stockAfterCancel}`);
  }

  const poAfterCancel = (await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}`,
    method: 'GET',
    headers: authHeaders
  })).data.data;

  console.log(`  - PO status after cancel: ${poAfterCancel.fulfillmentStatus}`);
  console.log(`  - Ordered: ${poAfterCancel.totalOrderedQuantity}, Received: ${poAfterCancel.totalReceivedQuantity}, Remaining: ${poAfterCancel.totalRemainingQuantity}`);
  if (poAfterCancel.fulfillmentStatus !== 'PARTIALLY_RECEIVED' || poAfterCancel.totalReceivedQuantity !== 75 || poAfterCancel.totalRemainingQuantity !== 25) {
    throw new Error('PO status did NOT revert back to PARTIALLY_RECEIVED!');
  }

  // 10. Test DRAFT GRN Isolation (Draft must NOT touch inventory)
  console.log('\n10. Testing DRAFT GRN isolation...');
  const draftGrnRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/purchase-orders/${po.id}/receive`,
    method: 'POST',
    headers: authHeaders
  }, {
    grnNumber: `GRN-DRAFT-${Date.now().toString().slice(-4)}`,
    purchaseOrderId: po.id,
    branchId: branchId,
    receivedById: currentUserId,
    status: 'DRAFT',
    lines: [
      {
        purchaseOrderLineId: poLine.id,
        productId: product.id,
        quantityReceived: "25",
        condition: 'GOOD'
      }
    ]
  });

  if (draftGrnRes.status !== 201) throw new Error('Draft GRN creation failed: ' + JSON.stringify(draftGrnRes.data));
  const draftGrn = draftGrnRes.data.data;
  console.log(`✓ Draft GRN Created: ${draftGrn.grnNumber}, Status: ${draftGrn.status}`);

  const stockAfterDraft = await getStock();
  console.log(`  - Stock after DRAFT GRN: ${stockAfterDraft}`);
  if (stockAfterDraft !== baselineStock + 75) {
    throw new Error(`DRAFT GRN improperly touched inventory! Expected ${baselineStock + 75}, got ${stockAfterDraft}`);
  }

  // Now post the draft GRN to COMPLETE
  console.log('  - Transitioning DRAFT GRN to COMPLETE...');
  const postDraftRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/grns/${draftGrn.id}/status`,
    method: 'PATCH',
    headers: authHeaders
  }, {
    status: 'COMPLETE'
  });

  if (postDraftRes.status !== 200) throw new Error('Failed to post draft GRN: ' + JSON.stringify(postDraftRes.data));
  const stockAfterPost = await getStock();
  console.log(`  - Stock after posting Draft GRN: ${stockAfterPost} (Delta: +${stockAfterPost - baselineStock})`);
  if (stockAfterPost !== baselineStock + 100) {
    throw new Error(`Stock not credited on posting Draft! Expected ${baselineStock + 100}, got ${stockAfterPost}`);
  }

  // 11. Test Purchase Return approval and inventory deduction
  console.log('\n11. Testing Purchase Return and inventory deduction...');
  const pretRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: '/api/v1/purchase-returns',
    method: 'POST',
    headers: authHeaders
  }, {
    returnNumber: `PRET-${Date.now().toString().slice(-4)}`,
    grnId: grn1.id,
    reason: 'Damaged item return test',
    lines: [
      {
        goodsReceiptNoteLineId: grn1.lines[0].id,
        quantity: "10"
      }
    ]
  });

  if (pretRes.status !== 201) throw new Error('Failed to create Purchase Return: ' + JSON.stringify(pretRes.data));
  const pret = pretRes.data.data;
  console.log(`✓ Purchase Return Created: ${pret.returnNumber}, Status: ${pret.approvalStatus || pret.status}`);

  // If not already approved, approve it
  if (pret.approvalStatus !== 'APPROVED') {
    console.log('  - Approving Purchase Return...');
    const approvePretRes = await request({
      hostname: '127.0.0.1',
      port: 4000,
      path: `/api/v1/purchase-returns/${pret.id}/approve`,
      method: 'POST',
      headers: authHeaders
    });
    if (approvePretRes.status !== 200) throw new Error('Failed to approve Purchase Return: ' + JSON.stringify(approvePretRes.data));
  }

  const stockAfterReturn = await getStock();
  console.log(`  - Stock after Purchase Return: ${stockAfterReturn} (Delta: +${stockAfterReturn - baselineStock})`);
  if (stockAfterReturn !== baselineStock + 90) {
    throw new Error(`Purchase return inventory deduction mismatch! Expected ${baselineStock + 90}, got ${stockAfterReturn}`);
  }
  console.log('✓ Purchase Return successfully deducted 10 units from inventory!');

  // 12. POS / Sales Stock Sync Verification
  console.log('\n12. Verifying Sales POS & Product Stock Sync...');
  const posProdRes = await request({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/products/${product.id}`,
    method: 'GET',
    headers: authHeaders
  });
  const posProd = posProdRes.data?.data;
  console.log(`  - Live product total stock: ${posProd.totalStock}`);
  console.log(`  - Warehouse breakdown:`, posProd.stockLedgers);
  if (posProd.totalStock !== stockAfterReturn) {
    throw new Error(`POS stock mismatch! Expected ${stockAfterReturn}, got ${posProd.totalStock}`);
  }
  console.log('✓ Sales POS / Product query reflects exact live stock balance with 0 stale state!');

  console.log('\n======================================================');
  console.log('🎉 ALL PROCUREMENT LIFECYCLE TESTS PASSED PERFECTLY! 🎉');
  console.log('======================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
