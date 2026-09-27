async function test() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin12345!' })
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status, 'token exists:', !!loginData.data?.accessToken);
  const token = loginData.data?.accessToken;
  
  // Test inventory stats
  const statsRes = await fetch('http://localhost:4000/api/v1/inventory/stats', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const stats = await statsRes.json();
  console.log('GET /inventory/stats:', statsRes.status, stats);

  // Test inventory stock
  const stockRes = await fetch('http://localhost:4000/api/v1/inventory/stock', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const stock = await stockRes.json();
  console.log('GET /inventory/stock:', stockRes.status, stock);

  // Test inventory transfers
  const transferRes = await fetch('http://localhost:4000/api/v1/inventory/stock-transfers', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const transfers = await transferRes.json();
  console.log('GET /inventory/stock-transfers:', transferRes.status, transfers);

  // Test inventory damage loss
  const damageRes = await fetch('http://localhost:4000/api/v1/inventory/damage-loss-reports', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const damage = await damageRes.json();
  console.log('GET /inventory/damage-loss-reports:', damageRes.status, damage);
}
test();
