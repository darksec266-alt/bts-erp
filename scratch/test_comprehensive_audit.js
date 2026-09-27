async function runAudit() {
  console.log('Logging in...');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin@123' })
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok || !loginJson.data?.accessToken) {
    console.error('Login failed:', loginJson);
    return;
  }
  const token = loginJson.data.accessToken;
  const headers = { Authorization: 'Bearer ' + token };
  console.log('Login OK. Access token obtained.');

  const endpoints = [
    // Identity & Master Data
    ['Branches', '/branches'],
    ['Departments', '/departments'],
    ['Employees', '/employees'],
    ['Customers', '/customers'],
    ['Products', '/products'],
    ['Categories', '/categories'],
    ['SubCategories', '/sub-categories'],
    ['Brands', '/brands'],
    ['Units', '/units'],
    ['Warehouses', '/warehouses'],
    ['Tax Rates', '/tax-rates'],

    // Sales
    ['Quotations', '/sales/quotations'],
    ['Sales Orders', '/sales/orders'],
    ['Challans', '/sales/challans'],
    ['Invoices', '/sales/invoices'],
    ['Payments', '/sales/payments'],
    ['Sales Stats', '/sales/stats'],
    ['Customer Advances', '/sales/advances'],
    ['Projects', '/sales/projects'],
    ['Sales Returns', '/sales/returns'],

    // Procurement
    ['Suppliers', '/suppliers'],
    ['Purchase Requests', '/purchase-requests'],
    ['Purchase Orders', '/purchase-orders'],
    ['GRNs', '/grns'],

    // Inventory
    ['Stock Ledger', '/inventory/stock'],
    ['Inventory Stats', '/inventory/stats'],
    ['Stock Transfers', '/inventory/stock-transfers'],
    ['Stock Adjustments', '/inventory/stock-adjustments'],
    ['Serial Numbers', '/inventory/serial-numbers'],
    ['Batches', '/inventory/batches'],
    ['Damage Loss Reports', '/inventory/damage-loss-reports'],

    // Service
    ['Service Stats', '/service/stats'],
    ['Service Tickets', '/tickets'],
    ['Service Assignments', '/service-assignments'],
    ['Warranties', '/warranties'],
    ['Warranty Claims', '/warranty-claims'],
    ['Product Custodies', '/custody'],
    ['Conveyance Bills', '/conveyance-bills'],
    ['Technician Advances', '/technician-advances'],
  ];

  console.log('\n=== REAL ENDPOINT AUDIT ===');
  let passCount = 0;
  let failCount = 0;

  for (const [name, path] of endpoints) {
    try {
      const res = await fetch('http://localhost:4000/api/v1' + path, { headers });
      const json = await res.json();
      if (res.ok && !json.error) {
        let count = 0;
        if (json.data?.total !== undefined) count = json.data.total;
        else if (Array.isArray(json.data?.items)) count = json.data.items.length;
        else if (Array.isArray(json.data)) count = json.data.length;
        else if (typeof json.data === 'object' && json.data !== null) count = Object.keys(json.data).length;
        console.log(`✅ ${name.padEnd(25)} [${path.padEnd(32)}] HTTP ${res.status} | Count: ${count}`);
        passCount++;
      } else {
        console.log(`❌ ${name.padEnd(25)} [${path.padEnd(32)}] HTTP ${res.status} | Error: ${JSON.stringify(json.error?.code || json.error?.message || json)}`);
        failCount++;
      }
    } catch (err) {
      console.log(`💥 ${name.padEnd(25)} [${path.padEnd(32)}] Exception: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\nAudit Finished. Passed: ${passCount}, Failed: ${failCount}`);
}

runAudit().catch(console.error);
