const { execFileSync } = require('child_process');

function query(sql) {
  return execFileSync('docker', [
    'exec', 'bts_erp-postgres-1',
    'psql', '-U', 'bts_user', '-d', 'bts_erp',
    '-t', '-A', '-F', '|',
    '-c', sql
  ]).toString().trim();
}

console.log('=== Distinct status in Ticket ===');
console.log(query('SELECT DISTINCT status FROM "Ticket";'));

console.log('=== Distinct type in Ticket ===');
console.log(query('SELECT DISTINCT type FROM "Ticket";'));

console.log('=== Ticket columns ===');
console.log(query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'Ticket';"));
