const fs = require('fs');
const { execSync } = require('child_process');

const schema = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8');

// Parse prisma models and their fields
const modelFields = new Map();
const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
let match;
while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const body = match[2];
  const fields = new Set();
  body.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) return;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      fields.add(parts[0]);
    }
  });
  modelFields.set(modelName, fields);
}

// Query PostgreSQL for all non-nullable columns without defaults
const rawCols = execSync(
  'docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -F "|" -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = \'public\' AND is_nullable = \'NO\' AND column_default IS NULL;"'
).toString().trim().split('\n');

console.log('Columns in DB that are NOT NULL, have NO DEFAULT, but are MISSING from Prisma schema:');
const problems = [];
for (const line of rawCols) {
  if (!line.trim()) continue;
  const [table, col, type] = line.split('|');
  const prismaFields = modelFields.get(table);
  if (prismaFields) {
    if (!prismaFields.has(col)) {
      console.log(`  Table: ${table}, Column: ${col} (${type})`);
      problems.push({ table, col, type });
    }
  }
}

console.log(`Total problem columns: ${problems.length}`);
