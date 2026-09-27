async function testProduct() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin@123' })
  });
  const token = (await loginRes.json()).data.accessToken;
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const randSku = 'SKU-AUDIT-' + randSuffix;
  const randBarcode = '88012' + Math.floor(1000000 + Math.random() * 9000000);

  console.log(`Creating product: sku=${randSku}, barcode=${randBarcode}`);
  const createRes = await fetch('http://localhost:4000/api/v1/products', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sku: randSku,
      name: 'Audit Test Camera ' + randSuffix,
      costPrice: '1500',
      sellingPrice: '2500',
      trackingType: 'SERIALIZED',
      modelNumber: 'CAM-AUDIT-' + randSuffix,
      barcode: randBarcode
    })
  });
  const createJson = await createRes.json();
  console.log('Create response status:', createRes.status, createJson.data?.id);

  // Now list products page 1
  const listRes = await fetch('http://localhost:4000/api/v1/products?take=20', { headers }).then(r => r.json());
  const foundOnPage1 = listRes.data.items.some(p => p.sku === randSku);
  console.log(`Is newly created product on page 1? ${foundOnPage1}`);
  console.log(`Page 1 product SKUs:`, listRes.data.items.map(p => p.sku).slice(0, 5));

  // Test duplicate SKU rejection
  console.log('Testing duplicate SKU rejection...');
  const dupSkuRes = await fetch('http://localhost:4000/api/v1/products', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sku: randSku,
      name: 'Duplicate SKU Product',
      costPrice: '100',
      sellingPrice: '200'
    })
  });
  console.log('Duplicate SKU rejection status (should be 409):', dupSkuRes.status);

  // Test duplicate Barcode rejection
  console.log('Testing duplicate Barcode rejection...');
  const dupBarcodeRes = await fetch('http://localhost:4000/api/v1/products', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sku: 'SKU-DIFF-' + Math.floor(1000 + Math.random() * 9000),
      name: 'Duplicate Barcode Product',
      costPrice: '100',
      sellingPrice: '200',
      barcode: randBarcode
    })
  });
  console.log('Duplicate Barcode rejection status (should be 409):', dupBarcodeRes.status);
}
testProduct().catch(console.error);
