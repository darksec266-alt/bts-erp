const fs = require('fs');
const path = require('path');

function searchFiles(dir, pattern, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === 'dist' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, pattern, results);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

console.log('=== Serial in apps/web ===');
searchFiles('apps/web/src', /serial/i).forEach(f => console.log('  ', f.replace(/\\/g, '/')));

console.log('=== Serial in apps/api ===');
searchFiles('apps/api/src', /serial/i).forEach(f => console.log('  ', f.replace(/\\/g, '/')));
