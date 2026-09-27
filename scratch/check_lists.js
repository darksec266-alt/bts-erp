async function check() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin@123' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.accessToken;
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  console.log("=== CHECKING CUSTOMERS ===");
  const cRes = await fetch("http://localhost:4000/api/v1/customers", { headers }).then(r => r.json());
  console.log("Customers total:", cRes.data.total, "returned items:", cRes.data.items.length);
  console.log("First 3 customers:", cRes.data.items.slice(0, 3).map(c => ({ id: c.id, code: c.customerCode, name: c.displayName, createdAt: c.createdAt })));
  console.log("Last 3 customers:", cRes.data.items.slice(-3).map(c => ({ id: c.id, code: c.customerCode, name: c.displayName, createdAt: c.createdAt })));

  console.log("\n=== CHECKING PRODUCTS ===");
  const pRes = await fetch("http://localhost:4000/api/v1/products", { headers }).then(r => r.json());
  console.log("Products total:", pRes.data.total, "returned items:", pRes.data.items.length);
  console.log("First 3 products:", pRes.data.items.slice(0, 3).map(p => ({ id: p.id, sku: p.sku, name: p.name, createdAt: p.createdAt })));
  console.log("Last 3 products:", pRes.data.items.slice(-3).map(p => ({ id: p.id, sku: p.sku, name: p.name, createdAt: p.createdAt })));
}
check().catch(console.error);
