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
-- 1. ProductTrackingType enum and Product table columns
DO $$ BEGIN
  CREATE TYPE "ProductTrackingType" AS ENUM ('SERIALIZED', 'NON_SERIALIZED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;
UPDATE "Product" SET "sku" = "productCode" WHERE "sku" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellingPrice" NUMERIC(14, 2) NOT NULL DEFAULT 0;
UPDATE "Product" SET "sellingPrice" = "salesPrice" WHERE "sellingPrice" = 0;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "trackingType" "ProductTrackingType" NOT NULL DEFAULT 'NON_SERIALIZED';
UPDATE "Product" SET "trackingType" = CASE WHEN "hasSerial" = true THEN 'SERIALIZED'::"ProductTrackingType" ELSE 'NON_SERIALIZED'::"ProductTrackingType" END;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "modelNumber" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isServiceItem" BOOLEAN NOT NULL DEFAULT false;

-- 2. GoodsReceiptNote updates
ALTER TABLE "GoodsReceiptNote" ADD COLUMN IF NOT EXISTS "receivedById" TEXT DEFAULT 'cmu1k9ycn001orwho0zu1r7o5';
UPDATE "GoodsReceiptNote" SET "receivedById" = 'cmu1k9ycn001orwho0zu1r7o5' WHERE "receivedById" IS NULL;

-- 3. PurchaseRequestLine table
CREATE TABLE IF NOT EXISTS "PurchaseRequestLine" (
  "id" TEXT PRIMARY KEY,
  "purchaseRequestId" TEXT NOT NULL REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" NUMERIC(12, 2) NOT NULL,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "PurchaseRequestLine_purchaseRequestId_idx" ON "PurchaseRequestLine"("purchaseRequestId");

-- 4. PurchaseOrderLine table
CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  "id" TEXT PRIMARY KEY,
  "purchaseOrderId" TEXT NOT NULL REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantity" NUMERIC(12, 2) NOT NULL,
  "unitPrice" NUMERIC(14, 2) NOT NULL,
  "lineTotal" NUMERIC(14, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- 5. GoodsReceiptNoteLine table
DO $$ BEGIN
  CREATE TYPE "GrnLineCondition" AS ENUM ('GOOD', 'DAMAGED', 'SHORT', 'WRONG_SKU');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "GoodsReceiptNoteLine" (
  "id" TEXT PRIMARY KEY,
  "grnId" TEXT NOT NULL REFERENCES "GoodsReceiptNote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "purchaseOrderLineId" TEXT NOT NULL REFERENCES "PurchaseOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "quantityReceived" NUMERIC(12, 2) NOT NULL,
  "condition" "GrnLineCondition" NOT NULL DEFAULT 'GOOD',
  "serialNumberId" TEXT,
  "batchId" TEXT
);
CREATE INDEX IF NOT EXISTS "GoodsReceiptNoteLine_grnId_idx" ON "GoodsReceiptNoteLine"("grnId");

-- 6. Project & ProjectItem tables
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY,
  "projectCode" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "branchId" TEXT NOT NULL REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "siteLocation" TEXT,
  "budgetAmount" NUMERIC(14, 2) NOT NULL DEFAULT 0,
  "salesOrderId" TEXT UNIQUE REFERENCES "SalesOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Project_branchId_status_idx" ON "Project"("branchId", "status");
CREATE INDEX IF NOT EXISTS "Project_customerId_idx" ON "Project"("customerId");

CREATE TABLE IF NOT EXISTS "ProjectItem" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "description" TEXT,
  "plannedQty" NUMERIC(12, 2) NOT NULL,
  "unitPrice" NUMERIC(14, 2) NOT NULL,
  "totalAmount" NUMERIC(14, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectItem_productId_idx" ON "ProjectItem"("productId");

-- 7. DeliveryChallan projectId FK
ALTER TABLE "DeliveryChallan" 
  DROP CONSTRAINT IF EXISTS "DeliveryChallan_projectId_fkey",
  ADD CONSTRAINT "DeliveryChallan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Verification query
SELECT COUNT(*) as product_count FROM "Product" WHERE sku IS NOT NULL;
`;

console.log("Applying remaining schema additions to bts_erp...");
runPsql(sql);
