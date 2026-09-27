const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`http://localhost:4000/api/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resp));
        } catch (e) {
          resolve(resp);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getWithToken(path, token) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:4000/api/v1${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('Testing live API endpoints on localhost:4000...\n');
  
  // 1. Login
  const loginRes = await post('/auth/login', { email: 'admin@bts.com', password: 'Admin@123' });
  const token = loginRes.data?.accessToken;
  if (!token) {
    console.error('Login failed:', loginRes);
    return;
  }
  console.log('Login successful! Access token obtained.');

  // 2. Fetch inventory stock
  const inventoryStock = await getWithToken('/inventory/stock?take=10', token);
  console.log('\n--- /api/v1/inventory/stock ---');
  console.log('Total stock records:', inventoryStock.data?.total);
  for (const item of (inventoryStock.data?.items || [])) {
    console.log(`  - [${item.product?.sku}] ${item.product?.name} at warehouse [${item.warehouse?.code}]: ${item.quantityOnHand} units`);
  }

  // 3. Fetch products
  const products = await getWithToken('/products?take=10', token);
  console.log('\n--- /api/v1/products (POS read view) ---');
  console.log('Total products count:', products.data?.total);
  for (const prod of (products.data?.items || [])) {
    console.log(`  - [${prod.sku}] ${prod.name} => totalStock: ${prod.totalStock}`);
  }
}

test().catch(console.error);
