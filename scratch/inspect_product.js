const { execSync } = require('child_process');

const out = execSync(
  'docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -F "|" -c "SELECT id, \\"productCode\\", sku, name FROM \\"Product\\" LIMIT 5;"'
).toString().trim();

console.log(out);
