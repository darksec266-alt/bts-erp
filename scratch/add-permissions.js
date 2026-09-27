const { execSync } = require('child_process');

function runPsql(sql) {
  try {
    const res = execSync('docker exec -i bts_erp-postgres-1 psql -U bts_user -d bts_erp', {
      input: sql,
      encoding: 'utf-8',
    });
    console.log(res);
  } catch (e) {
    console.error(e.stdout || e.message);
  }
}

const sql = `
-- 1. Insert missing permissions
INSERT INTO "Permission" ("id", "code")
VALUES 
  ('perm-wildcard-star', '*'),
  ('perm-masterdata-view', 'masterData.view'),
  ('perm-masterdata-manage', 'masterData.manage')
ON CONFLICT ("code") DO NOTHING;

-- 2. Link '*' and masterData permissions to SUPER_ADMIN role (id: 'cmu1k9xza0000rwho42adyqwc')
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'cmu1k9xza0000rwho42adyqwc', p.id
FROM "Permission" p
WHERE p.code IN ('*', 'masterData.view', 'masterData.manage')
ON CONFLICT DO NOTHING;

-- 3. Also link to any role with name 'SUPER_ADMIN' or 'ADMIN'
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN') AND p.code IN ('*', 'masterData.view', 'masterData.manage')
ON CONFLICT DO NOTHING;

-- 4. Verify
SELECT r.name, p.code
FROM "RolePermission" rp
JOIN "Role" r ON rp."roleId" = r.id
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE p.code IN ('*', 'masterData.view', 'masterData.manage');
`;

console.log("Adding permissions to database...");
runPsql(sql);
