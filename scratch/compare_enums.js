const fs = require('fs');
const { execFileSync } = require('child_process');

const schema = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8');

// Parse all enums from schema.prisma
const prismaEnums = new Map();
const enumRegex = /enum\s+(\w+)\s+\{([^}]+)\}/g;
let match;
while ((match = enumRegex.exec(schema)) !== null) {
  const name = match[1];
  const values = match[2]
    .split('\n')
    .map(v => v.trim())
    .filter(v => v && !v.startsWith('//'));
  prismaEnums.set(name, values);
}

// Get all enums from postgres
const rawPgEnums = execFileSync('docker', [
  'exec', 'bts_erp-postgres-1',
  'psql', '-U', 'bts_user', '-d', 'bts_erp',
  '-t', '-A', '-F', '|',
  '-c', 'SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder;'
]).toString().trim().split('\n');

const pgEnums = new Map();
for (const line of rawPgEnums) {
  if (!line.trim()) continue;
  const [name, label] = line.split('|');
  if (!pgEnums.has(name)) pgEnums.set(name, new Set());
  pgEnums.get(name).add(label);
}

console.log('=== ENUM COMPARISON ===');
for (const [name, prismaVals] of prismaEnums) {
  const pgVals = pgEnums.get(name);
  if (!pgVals) {
    console.log(`❌ Enum ${name} does not exist in PostgreSQL!`);
    continue;
  }
  const missingInPg = prismaVals.filter(v => !pgVals.has(v));
  if (missingInPg.length > 0) {
    console.log(`⚠️  Enum ${name} missing values in PostgreSQL:`, missingInPg);
  }
  const missingInPrisma = Array.from(pgVals).filter(v => !prismaVals.includes(v));
  if (missingInPrisma.length > 0) {
    console.log(`ℹ️  Enum ${name} in PostgreSQL has values not in Prisma:`, missingInPrisma);
  }
}
