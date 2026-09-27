const { execFileSync } = require('child_process');

function query(sql) {
  return execFileSync('docker', [
    'exec', 'bts_erp-postgres-1',
    'psql', '-U', 'bts_user', '-d', 'bts_erp',
    '-t', '-A', '-F', '|',
    '-c', sql
  ]).toString().trim();
}

console.log('=== PurchaseOrder Columns ===');
console.log(query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'PurchaseOrder';"));

console.log('=== PurchaseOrderLine Columns ===');
console.log(query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'PurchaseOrderLine';"));
