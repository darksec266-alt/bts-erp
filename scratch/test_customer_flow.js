async function testCustomer() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin@123' })
  });
  const token = (await loginRes.json()).data.accessToken;
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  // Fetch branches first
  const bRes = await fetch('http://localhost:4000/api/v1/branches', { headers }).then(r => r.json());
  const branchId = bRes.data.items[0].id;

  const randCode = 'CUST-TEST-' + Math.floor(1000 + Math.random() * 9000);
  const randPhone = '017' + Math.floor(10000000 + Math.random() * 90000000);

  console.log(`Creating customer: code=${randCode}, phone=${randPhone}`);
  const createRes = await fetch('http://localhost:4000/api/v1/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerCode: randCode,
      displayName: 'Audit Test Customer ' + randCode,
      phone: randPhone,
      branchId: branchId,
      isServiceOnly: false,
      addresses: [{ label: 'HQ', addressLine: '123 Test Street, Dhaka' }]
    })
  });
  const createJson = await createRes.json();
  console.log('Create response status:', createRes.status, createJson.data?.id);

  // Now list customers page 1
  const listRes = await fetch('http://localhost:4000/api/v1/customers?take=20', { headers }).then(r => r.json());
  const foundOnPage1 = listRes.data.items.some(c => c.customerCode === randCode);
  console.log(`Is newly created customer on page 1? ${foundOnPage1}`);
  console.log(`Page 1 customer codes:`, listRes.data.items.map(c => c.customerCode).slice(0, 5));
}
testCustomer().catch(console.error);
