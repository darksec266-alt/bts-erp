const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Applying Serialized Inventory Migration...');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductTrackingType') THEN
        CREATE TYPE "ProductTrackingType" AS ENUM ('SERIALIZED', 'NON_SERIALIZED');
      END IF;
    END$$;
  `);
  console.log('✓ Created ProductTrackingType enum');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product"
      ADD COLUMN IF NOT EXISTS "trackingType" "ProductTrackingType" NOT NULL DEFAULT 'NON_SERIALIZED',
      ADD COLUMN IF NOT EXISTS "modelNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "barcode" TEXT;
  `);
  console.log('✓ Updated Product table');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Product_barcode_idx" ON "Product"("barcode");
  `);
  console.log('✓ Created index on Product(barcode)');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SerialNumber"
      ADD COLUMN IF NOT EXISTS "barcode" TEXT,
      ADD COLUMN IF NOT EXISTS "warehouseId" TEXT REFERENCES "Warehouse"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT,
      ADD COLUMN IF NOT EXISTS "grnId" TEXT,
      ADD COLUMN IF NOT EXISTS "grnLineId" TEXT,
      ADD COLUMN IF NOT EXISTS "notes" TEXT,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);
  console.log('✓ Updated SerialNumber table');

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SerialNumber_barcode_key" ON "SerialNumber"("barcode") WHERE "barcode" IS NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SerialNumber_productId_warehouseId_currentStage_idx" ON "SerialNumber"("productId", "warehouseId", "currentStage");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SerialNumber_barcode_idx" ON "SerialNumber"("barcode");
  `);
  console.log('✓ Created indexes on SerialNumber');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "SKULifecycleEvent"
      ADD COLUMN IF NOT EXISTS "fromWarehouseId" TEXT,
      ADD COLUMN IF NOT EXISTS "toWarehouseId" TEXT,
      ADD COLUMN IF NOT EXISTS "fromStage" "SKULifecycleStage",
      ADD COLUMN IF NOT EXISTS "toStage" "SKULifecycleStage",
      ADD COLUMN IF NOT EXISTS "notes" TEXT,
      ADD COLUMN IF NOT EXISTS "performedById" TEXT;
  `);
  console.log('✓ Updated SKULifecycleEvent table');

  console.log('🎉 Migration successfully applied!');
  await prisma.$disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
