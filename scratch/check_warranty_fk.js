const { execFileSync } = require('child_process');

function query(sql) {
  return execFileSync('docker', [
    'exec', 'bts_erp-postgres-1',
    'psql', '-U', 'bts_user', '-d', 'bts_erp',
    '-t', '-A', '-F', '|',
    '-c', sql
  ]).toString().trim();
}

console.log('=== Checking if serialNumberId exists in SerialNumber table ===');
console.log(query('SELECT id, serial FROM "SerialNumber" WHERE id = \'WARR_SN_cmu2nujbd000crw0sv7o15cx0\';'));

console.log('=== Count of Warranty where serialNumberId NOT IN (SELECT id FROM "SerialNumber") ===');
console.log(query('SELECT COUNT(*) FROM "Warranty" WHERE "serialNumberId" NOT IN (SELECT id FROM "SerialNumber");'));
