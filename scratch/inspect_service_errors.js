async function inspectErrors() {
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bts.com', password: 'Admin@123' })
  });
  const token = (await loginRes.json()).data.accessToken;
  const headers = { Authorization: 'Bearer ' + token };

  for (const path of ['/service/stats', '/tickets', '/warranties']) {
    const res = await fetch('http://localhost:4000/api/v1' + path, { headers });
    const json = await res.json();
    console.log(`\n=== Error for ${path} ===`);
    console.log(json);
  }
}

inspectErrors().catch(console.error);
