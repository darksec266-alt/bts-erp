const { execFileSync } = require('child_process');

function query(sql) {
  return execFileSync('docker', [
    'exec', 'bts_erp-postgres-1',
    'psql', '-U', 'bts_user', '-d', 'bts_erp',
    '-t', '-A', '-c', sql
  ]).toString().trim();
}

console.log('=== TicketStatus enum in DB ===');
console.log(query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = '"TicketStatus"'::regtype;`));

console.log('=== TicketType enum in DB ===');
console.log(query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = '"TicketType"'::regtype;`));
