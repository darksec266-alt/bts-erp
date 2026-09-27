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
-- 1. Add mfaSecret to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;

-- 2. Create RefreshToken table if not exists
CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenFamily" TEXT UNIQUE NOT NULL,
  "issuedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP WITHOUT TIME ZONE,
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

-- 3. Set password for admin@bts.com to Admin@123 (bcrypt hash) and disable MFA
UPDATE "User"
SET "passwordHash" = '$2a$12$AJ4Wf/IplIqQu1PZWjBU2O3z.gwLvki1NXGnLgiiVcLrNNCDH3zXi',
    "mfaEnabled" = false,
    "mfaSecret" = NULL,
    "isActive" = true
WHERE email = 'admin@bts.com';

SELECT id, email, "roleId", "mfaEnabled", "isActive" FROM "User" WHERE email = 'admin@bts.com';
`;

console.log("Applying User & RefreshToken updates to bts_erp...");
runPsql(sql);
