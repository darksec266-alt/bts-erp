const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://bts_user:bts_pass@localhost:5432/bts_erp' });
  await client.connect();
  const res = await client.query('SELECT barcode, count(*) FROM "Product" WHERE barcode IS NOT NULL AND barcode != \'\' GROUP BY barcode HAVING count(*) > 1;');
  console.log("Duplicate barcodes:", res.rows);
  const total = await client.query('SELECT count(*) FROM "Product";');
  console.log("Total products:", total.rows[0].count);
  const barcodes = await client.query('SELECT count(*) FROM "Product" WHERE barcode IS NOT NULL;');
  console.log("Products with barcode:", barcodes.rows[0].count);
  await client.end();
}
main().catch(console.error);
