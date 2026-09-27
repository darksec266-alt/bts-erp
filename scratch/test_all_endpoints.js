async function testAll() {
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
    ['Branches', '/branches'],
    ['Customers', '/customers'],
    ['Products', '/products'],
    ['Quotations', '/sales/quotations'],
    ['Orders', '/sales/orders'],
    ['Challans', '/sales/challans'],
    ['Invoices', '/sales/invoices'],
    ['Sales Stats', '/sales/stats'],
    ['Advances', '/sales/advances'],
    ['Payments', '/sales/payments'],
    ['Employees', '/employees'],
    ['Warehouses', '/warehouses'],
    ['Stock Ledger', '/inventory/stock'],
    ['Purchase Orders', '/procurement/orders'],
    ['GRNs', '/procurement/grns'],
    ['Service Assignments', '/service/assignments']
  ];

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
        console.log(`✅ ${name.padEnd(22)} HTTP ${res.status} | Data count: ${count}`);
      } else {
        console.log(`❌ ${name.padEnd(22)} HTTP ${res.status} | Error: ${JSON.stringify(json.error || json)}`);
      }
    } catch (err) {
      console.log(`❌ ${name.padEnd(22)} Exception: ${err.message}`);
    }
  }
}

testAll().catch(console.error);
