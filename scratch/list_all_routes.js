const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) scanDir(full);
    else if (f.name.endsWith('.router.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const regex = /router\.(get|post|patch|delete|put)\(\s*["']([^"']+)["']/g;
      let match;
      console.log(`\n=== ${f.name} (${full}) ===`);
      while ((match = regex.exec(content)) !== null) {
        console.log(`${match[1].toUpperCase().padEnd(6)} ${match[2]}`);
      }
    }
  }
}

scanDir('apps/api/src/modules');
