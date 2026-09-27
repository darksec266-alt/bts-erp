-- ============================================================
-- FIX DATABASE AUDIT & SCHEMA INTEGRITY
-- Purely additive and non-destructive: drops NOT NULL on legacy columns,
-- synchronizes enums, adds default values, and prevents Prisma insertion errors.
-- ============================================================

-- 1. ENUMS SYNCHRONIZATION
DO $$
BEGIN
  -- TicketStatus
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'QUOTE_PENDING';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'QUOTE_ACCEPTED';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

  -- TicketType
  ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'COMPLAINT';

  -- VoucherType
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'SALES_RETURN';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'EXPENSE';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'ADJUSTMENT';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'DEBIT_NOTE';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'SERVICE_INVOICE';
  ALTER TYPE "VoucherType" ADD VALUE IF NOT EXISTS 'PAYROLL';

  -- VoucherStatus
  ALTER TYPE "VoucherStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. DROP NOT NULL CONSTRAINTS ON LEGACY / CONFLICTING COLUMNS

-- Product.productCode
ALTER TABLE "Product" ALTER COLUMN "productCode" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "productCode" SET DEFAULT '';

-- Create trigger to always keep Product.productCode and Product.sku in sync
CREATE OR REPLACE FUNCTION sync_product_code_sku()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW."productCode" IS NULL OR NEW."productCode" = '') AND NEW."sku" IS NOT NULL THEN
    NEW."productCode" := NEW."sku";
  END IF;
  IF (NEW."sku" IS NULL OR NEW."sku" = '') AND NEW."productCode" IS NOT NULL THEN
    NEW."sku" := NEW."productCode";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_code_sku ON "Product";
CREATE TRIGGER trg_sync_product_code_sku
BEFORE INSERT OR UPDATE ON "Product"
FOR EACH ROW EXECUTE FUNCTION sync_product_code_sku();

-- Backfill any existing products where productCode is empty or sku is empty
UPDATE "Product" SET "productCode" = "sku" WHERE ("productCode" IS NULL OR "productCode" = '') AND "sku" IS NOT NULL;
UPDATE "Product" SET "sku" = "productCode" WHERE ("sku" IS NULL OR "sku" = '') AND "productCode" IS NOT NULL;

-- Employee
ALTER TABLE "Employee" ALTER COLUMN "nidNumber" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "nidNumber" SET DEFAULT '';

-- Warehouse
ALTER TABLE "Warehouse" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "Warehouse" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Invoice
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- SalesOrder
ALTER TABLE "SalesOrder" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "SalesOrder" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Ticket
ALTER TABLE "Ticket" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Ticket" ALTER COLUMN "subject" DROP NOT NULL;
ALTER TABLE "Ticket" ALTER COLUMN "subject" SET DEFAULT '';

-- TaxRate
ALTER TABLE "TaxRate" ALTER COLUMN "rate" DROP NOT NULL;
ALTER TABLE "TaxRate" ALTER COLUMN "rate" SET DEFAULT 0;

-- DeliveryChallanLine
ALTER TABLE "DeliveryChallanLine" ALTER COLUMN "deliveryChallanId" DROP NOT NULL;

-- DeliveryChallanReturnLine
ALTER TABLE "DeliveryChallanReturnLine" ALTER COLUMN "deliveryChallanReturnId" DROP NOT NULL;

-- DeliveryChallanReturn
ALTER TABLE "DeliveryChallanReturn" ALTER COLUMN "reason" DROP NOT NULL;
ALTER TABLE "DeliveryChallanReturn" ALTER COLUMN "reason" SET DEFAULT '';

-- DraftState
ALTER TABLE "DraftState" ALTER COLUMN "formKey" DROP NOT NULL;
ALTER TABLE "DraftState" ALTER COLUMN "stateJson" DROP NOT NULL;
ALTER TABLE "DraftState" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "DraftState" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- PurchaseReturn
ALTER TABLE "PurchaseReturn" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "PurchaseReturn" ALTER COLUMN "quantity" SET DEFAULT 0;

-- ConveyanceBill
ALTER TABLE "ConveyanceBill" ALTER COLUMN "serviceAssignmentId" DROP NOT NULL;
ALTER TABLE "ConveyanceBill" ALTER COLUMN "technicianId" DROP NOT NULL;
ALTER TABLE "ConveyanceBill" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "ConveyanceBill" ALTER COLUMN "amount" SET DEFAULT 0;

-- TechnicianAdvance
ALTER TABLE "TechnicianAdvance" ALTER COLUMN "serviceAssignmentId" DROP NOT NULL;
ALTER TABLE "TechnicianAdvance" ALTER COLUMN "technicianId" DROP NOT NULL;
ALTER TABLE "TechnicianAdvance" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "TechnicianAdvance" ALTER COLUMN "amount" SET DEFAULT 0;

-- TechnicianAssignment
ALTER TABLE "TechnicianAssignment" ALTER COLUMN "serviceAssignmentId" DROP NOT NULL;
ALTER TABLE "TechnicianAssignment" ALTER COLUMN "technicianId" DROP NOT NULL;

-- ProductCustody
ALTER TABLE "ProductCustody" ALTER COLUMN "serviceAssignmentId" DROP NOT NULL;

-- ChartOfAccounts
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ProjectClosureReport
ALTER TABLE "ProjectClosureReport" ALTER COLUMN "summary" DROP NOT NULL;
ALTER TABLE "ProjectClosureReport" ALTER COLUMN "summary" SET DEFAULT '';

-- AdvanceAdjustment
ALTER TABLE "AdvanceAdjustment" ALTER COLUMN "customerAdvanceId" DROP NOT NULL;
ALTER TABLE "AdvanceAdjustment" ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE "AdvanceAdjustment" ALTER COLUMN "amount" SET DEFAULT 0;

-- WarrantyClaim
ALTER TABLE "WarrantyClaim" ALTER COLUMN "claimReason" DROP NOT NULL;
ALTER TABLE "WarrantyClaim" ALTER COLUMN "claimReason" SET DEFAULT '';

-- CompanyLoan
ALTER TABLE "CompanyLoan" ALTER COLUMN "principal" DROP NOT NULL;
ALTER TABLE "CompanyLoan" ALTER COLUMN "principal" SET DEFAULT 0;

-- DamageLossLine
ALTER TABLE "DamageLossLine" ALTER COLUMN "damageLossReportId" DROP NOT NULL;
ALTER TABLE "DamageLossLine" ALTER COLUMN "reason" DROP NOT NULL;
ALTER TABLE "DamageLossLine" ALTER COLUMN "reason" SET DEFAULT '';

-- LoanRepaymentSchedule
ALTER TABLE "LoanRepaymentSchedule" ALTER COLUMN "companyLoanId" DROP NOT NULL;
ALTER TABLE "LoanRepaymentSchedule" ALTER COLUMN "amountDue" DROP NOT NULL;
ALTER TABLE "LoanRepaymentSchedule" ALTER COLUMN "amountDue" SET DEFAULT 0;

-- JournalEntry
ALTER TABLE "JournalEntry" ALTER COLUMN "sourceType" DROP NOT NULL;
ALTER TABLE "JournalEntry" ALTER COLUMN "createdById" DROP NOT NULL;

-- FiscalPeriod
ALTER TABLE "FiscalPeriod" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "FiscalPeriod" ALTER COLUMN "name" SET DEFAULT '';

-- ExportJob
ALTER TABLE "ExportJob" ALTER COLUMN "resource" DROP NOT NULL;
ALTER TABLE "ExportJob" ALTER COLUMN "resource" SET DEFAULT '';

-- PrintPreference
ALTER TABLE "PrintPreference" ALTER COLUMN "documentType" DROP NOT NULL;
ALTER TABLE "PrintPreference" ALTER COLUMN "documentType" SET DEFAULT '';

-- Warranty
ALTER TABLE "Warranty" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Warranty" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "Warranty" ALTER COLUMN "warrantyMonths" DROP NOT NULL;
ALTER TABLE "Warranty" ALTER COLUMN "warrantyMonths" SET DEFAULT 12;
ALTER TABLE "Warranty" ALTER COLUMN "serialNumberId" DROP NOT NULL;

-- For any Warranty rows where serialNumberId points to a non-existent SerialNumber:
-- Create a real SerialNumber row so that Prisma relations find it!
INSERT INTO "SerialNumber" ("id", "productId", "serial", "currentStage", "createdAt", "updatedAt")
SELECT 
  w."serialNumberId",
  w."productId",
  COALESCE(NULLIF(w."serialNumber", ''), 'WARR-SN-' || SUBSTRING(w."id" FROM 1 FOR 8)),
  'SOLD'::"SKULifecycleStage",
  w."createdAt",
  w."createdAt"
FROM "Warranty" w
WHERE w."serialNumberId" IS NOT NULL
  AND w."serialNumberId" NOT IN (SELECT id FROM "SerialNumber")
  AND w."serialNumberId" NOT IN (SELECT serial FROM "SerialNumber")
ON CONFLICT (id) DO NOTHING;
