const fs = require('fs');
const s = fs.readFileSync('apps/api/src/modules/sales/presentation/sales.router.ts', 'utf8');
const regex = /router\.(get|post|patch|delete)\(\s*["']([^"']+)["']/g;
let match;
while ((match = regex.exec(s)) !== null) {
  console.log(`${match[1].toUpperCase().padEnd(6)} ${match[2]}`);
}
