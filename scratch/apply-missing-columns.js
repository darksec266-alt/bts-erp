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
-- 1. DeliveryChallan updates
ALTER TABLE "DeliveryChallan" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "DeliveryChallan" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE "DeliveryChallan" ADD COLUMN IF NOT EXISTS "billingStatus" TEXT NOT NULL DEFAULT 'UNBILLED';
CREATE INDEX IF NOT EXISTS "DeliveryChallan_projectId_idx" ON "DeliveryChallan"("projectId");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_invoiceId_idx" ON "DeliveryChallan"("invoiceId");
CREATE INDEX IF NOT EXISTS "DeliveryChallan_billingStatus_idx" ON "DeliveryChallan"("billingStatus");

-- 2. DeliveryChallanLine updates
ALTER TABLE "DeliveryChallanLine" ADD COLUMN IF NOT EXISTS "challanId" TEXT;
UPDATE "DeliveryChallanLine" SET "challanId" = "deliveryChallanId" WHERE "challanId" IS NULL;
ALTER TABLE "DeliveryChallanLine" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "DeliveryChallanLine" ADD COLUMN IF NOT EXISTS "serialNumberId" TEXT;
ALTER TABLE "DeliveryChallanLine" ADD COLUMN IF NOT EXISTS "batchId" TEXT;

UPDATE "DeliveryChallanLine" dcl
SET "productId" = sol."productId"
FROM "SalesOrderLine" sol
WHERE dcl."salesOrderLineId" = sol.id AND dcl."productId" IS NULL;

CREATE INDEX IF NOT EXISTS "DeliveryChallanLine_challanId_idx" ON "DeliveryChallanLine"("challanId");
CREATE INDEX IF NOT EXISTS "DeliveryChallanLine_productId_idx" ON "DeliveryChallanLine"("productId");

-- 3. SalesReturn updates
ALTER TABLE "SalesReturn" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW();

-- 4. Verify DeliveryChallan and DeliveryChallanLine
SELECT id, "challanNumber", "salesOrderId", "projectId", "invoiceId", "billingStatus" FROM "DeliveryChallan" LIMIT 2;
SELECT id, "challanId", "productId", quantity FROM "DeliveryChallanLine" LIMIT 2;
SELECT id, "returnNumber", "updatedAt" FROM "SalesReturn" LIMIT 2;
`;

console.log("Applying schema updates to bts_erp...");
runPsql(sql);
