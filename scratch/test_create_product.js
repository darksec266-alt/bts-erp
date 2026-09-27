const jwt = require('jsonwebtoken');

async function testCreateProduct() {
  const token = jwt.sign(
    { sub: "cmu1k9ycn001orwho0zu1r7o5", roleName: "SUPER_ADMIN", isSuperAdmin: true, permissions: ["*"] },
    "dev-only-access-secret-change-me-before-any-real-deployment",
    { expiresIn: "1h" }
  );

  const res = await fetch('http://localhost:4000/api/v1/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sku: `SKU-TEST-${Date.now().toString().slice(-4)}`,
      name: 'Test Router 5000',
      costPrice: '1500',
      sellingPrice: '2000',
      trackingType: 'SERIALIZED'
    })
  });

  const body = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Body:', body);
}

testCreateProduct().catch(console.error);
