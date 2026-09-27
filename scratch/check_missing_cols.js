const fs = require('fs');
const { execSync } = require('child_process');

try {
  const rawCols = execSync(
    'docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -F "," -c "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = \'public\';"'
  ).toString().trim().split('\n');
  const dbCols = new Set(rawCols.map(r => r.trim()));

  const rawTables = execSync(
    'docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -c "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';"'
  ).toString().trim().split('\n');
  const dbTables = new Set(rawTables.map(r => r.trim()));

  const schema = fs.readFileSync('packages/db/prisma/schema.prisma', 'utf8');
  const enums = new Set();
  const enumRegex = /enum\s+(\w+)\s+\{([^}]+)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(schema)) !== null) {
    enums.add(enumMatch[1]);
  }

  const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
  let match;
  const missingTables = [];
  const result = {};

  while ((match = modelRegex.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];

    if (!dbTables.has(modelName)) {
      missingTables.push(modelName);
      continue;
    }

    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      if (trimmed.includes('@relation')) continue;
      
      const parts = trimmed.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1] ? parts[1].replace('?', '').replace('[]', '') : '';
      if (parts[1] && parts[1].endsWith('[]')) continue;

      const isScalar = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes'].includes(fieldType);
      const isEnum = enums.has(fieldType);

      if (isScalar || isEnum) {
        const key = modelName + ',' + fieldName;
        if (!dbCols.has(key)) {
          if (!result[modelName]) result[modelName] = [];
          result[modelName].push({ fieldName, fieldType, line: trimmed });
        }
      }
    }
  }

  fs.writeFileSync('scratch/missing_analysis.json', JSON.stringify({ missingTables, missingCols: result }, null, 2));
  console.log('Saved scratch/missing_analysis.json successfully!');
  console.log('Missing Tables:', missingTables);
  console.log('Models with missing columns:', Object.keys(result));
} catch (err) {
  console.error(err);
}
