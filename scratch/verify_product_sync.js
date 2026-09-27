const { execFileSync } = require('child_process');

function query(sql) {
  return execFileSync('docker', [
    'exec', 'bts_erp-postgres-1',
    'psql', '-U', 'bts_user', '-d', 'bts_erp',
    '-t', '-A', '-F', '|',
    '-c', sql
  ]).toString().trim();
}

console.log(query('SELECT id, "productCode", sku, name FROM "Product" WHERE sku = \'SKU-TEST-3864\';'));
