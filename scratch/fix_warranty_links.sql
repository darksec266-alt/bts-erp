-- Link Warranty.serialNumberId to existing SerialNumber where serial matches
UPDATE "Warranty" w
SET "serialNumberId" = s.id
FROM "SerialNumber" s
WHERE w."serialNumber" IS NOT NULL 
  AND w."serialNumber" = s.serial;

-- For any Warranty that STILL has no valid SerialNumber:
-- Insert a new SerialNumber with unique serial
INSERT INTO "SerialNumber" ("id", "productId", "serial", "currentStage", "createdAt", "updatedAt")
SELECT 
  w."serialNumberId",
  w."productId",
  'SN-WARR-' || SUBSTRING(w."id" FROM 1 FOR 10),
  'SOLD'::"SKULifecycleStage",
  w."createdAt",
  w."createdAt"
FROM "Warranty" w
WHERE w."serialNumberId" IS NOT NULL
  AND w."serialNumberId" NOT IN (SELECT id FROM "SerialNumber")
ON CONFLICT (id) DO NOTHING;

-- Verify all Warranty rows now have a valid serialNumberId
SELECT COUNT(*) as unlinked_warranties
FROM "Warranty" w
WHERE w."serialNumberId" NOT IN (SELECT id FROM "SerialNumber");
