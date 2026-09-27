-- ═══════════════════════════════════════════════════════════════
-- FULL SAFE SCHEMA MIGRATION FOR BTS-ERP
-- Purely additive: adds missing columns and tables with backfills.
-- NEVER drops existing tables, columns, or data.
-- ═══════════════════════════════════════════════════════════════

-- 1. ENUMS
DO $$ BEGIN CREATE TYPE "ChallanReturnCondition" AS ENUM ('GOOD', 'DAMAGED', 'FAULTY', 'MISSING_PARTS'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TicketType" AS ENUM ('WARRANTY_CLAIM', 'PAID_SERVICE_REQUEST'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "WarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOIDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "WarrantyClaimOutcome" AS ENUM ('REPLACED', 'REPAIRED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AdvanceStatus" AS ENUM ('RECEIVED', 'PARTIALLY_ADJUSTED', 'FULLY_ADJUSTED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DamageLossDisposition" AS ENUM ('SCRAP', 'RETURN_TO_STOCK', 'REPAIR', 'RMA', 'WRITE_OFF'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DamageLossStatus" AS ENUM ('REPORTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'GRN_DISCREPANCY';
ALTER TYPE "ApprovalType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'CUSTOMER_ACCEPTED';
ALTER TYPE "SKULifecycleStage" ADD VALUE IF NOT EXISTS 'WARRANTY_CLAIM_RAISED';
ALTER TYPE "SKULifecycleStage" ADD VALUE IF NOT EXISTS 'REPLACED';
ALTER TYPE "SKULifecycleStage" ADD VALUE IF NOT EXISTS 'REPAIRED';

-- 2. MISSING TABLES
CREATE TABLE IF NOT EXISTS "SubCategory" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubCategory_categoryId_name_key" UNIQUE ("categoryId", "name")
);
CREATE INDEX IF NOT EXISTS "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");
CREATE INDEX IF NOT EXISTS "SubCategory_isActive_idx" ON "SubCategory"("isActive");

CREATE TABLE IF NOT EXISTS "FiscalPeriod" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PurchaseReturnLine" (
  "id" TEXT PRIMARY KEY,
  "purchaseReturnId" TEXT NOT NULL,
  "goodsReceiptNoteLineId" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "reason" TEXT
);
CREATE INDEX IF NOT EXISTS "PurchaseReturnLine_purchaseReturnId_idx" ON "PurchaseReturnLine"("purchaseReturnId");
CREATE INDEX IF NOT EXISTS "PurchaseReturnLine_goodsReceiptNoteLineId_idx" ON "PurchaseReturnLine"("goodsReceiptNoteLineId");

CREATE TABLE IF NOT EXISTS "SavedFilter" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterJson" JSONB NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SavedFilter_userId_moduleKey_idx" ON "SavedFilter"("userId", "moduleKey");

CREATE TABLE IF NOT EXISTS "ExportJob" (
  "id" TEXT PRIMARY KEY,
  "requestedById" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "totalRows" INTEGER,
  "resultDocumentId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "PrintPreference" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "includeLetterhead" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintPreference_userId_documentType_key" UNIQUE ("userId", "documentType")
);

-- 3. MASTER DATA COLUMNS
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "code" TEXT;
UPDATE "Unit" SET "code" = UPPER(SUBSTRING("name" FROM 1 FOR 3)) || '_' || SUBSTRING("id" FROM 20) WHERE "code" IS NULL;
ALTER TABLE "Unit" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_code_key" ON "Unit"("code");
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "TaxRate" ADD COLUMN IF NOT EXISTS "ratePercent" DECIMAL(5,2);
UPDATE "TaxRate" SET "ratePercent" = "rate" WHERE "ratePercent" IS NULL;

-- 4. SALES COLUMNS
ALTER TABLE "SalesOrder" ADD COLUMN IF NOT EXISTS "orderType" TEXT NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "SalesOrderLine" ADD COLUMN IF NOT EXISTS "description" TEXT;
UPDATE "SalesOrderLine" SET "description" = COALESCE((SELECT name FROM "Product" WHERE "Product".id = "SalesOrderLine"."productId"), 'Sales Item') WHERE "description" IS NULL;
ALTER TABLE "SalesOrderLine" ALTER COLUMN "description" SET NOT NULL;

ALTER TABLE "DeliveryChallanReturn" ADD COLUMN IF NOT EXISTS "challanId" TEXT;
UPDATE "DeliveryChallanReturn" SET "challanId" = (SELECT id FROM "DeliveryChallan" LIMIT 1) WHERE "challanId" IS NULL;

ALTER TABLE "DeliveryChallanReturnLine" ADD COLUMN IF NOT EXISTS "returnId" TEXT;
UPDATE "DeliveryChallanReturnLine" SET "returnId" = "deliveryChallanReturnId" WHERE "returnId" IS NULL;
ALTER TABLE "DeliveryChallanReturnLine" ADD COLUMN IF NOT EXISTS "condition" "ChallanReturnCondition" DEFAULT 'GOOD';
ALTER TABLE "DeliveryChallanReturnLine" ADD COLUMN IF NOT EXISTS "damageLossReportId" TEXT;

-- 5. SERVICE OPS COLUMNS
ALTER TABLE "TechnicianAssignment" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
UPDATE "TechnicianAssignment" SET "assignmentId" = "serviceAssignmentId" WHERE "assignmentId" IS NULL;
ALTER TABLE "TechnicianAssignment" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
UPDATE "TechnicianAssignment" SET "employeeId" = "technicianId" WHERE "employeeId" IS NULL;
ALTER TABLE "TechnicianAssignment" ADD COLUMN IF NOT EXISTS "unassignedAt" TIMESTAMP(3);
UPDATE "TechnicianAssignment" SET "unassignedAt" = "releasedAt" WHERE "unassignedAt" IS NULL AND "releasedAt" IS NOT NULL;

ALTER TABLE "ProductCustody" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
UPDATE "ProductCustody" SET "assignmentId" = "serviceAssignmentId" WHERE "assignmentId" IS NULL;
ALTER TABLE "ProductCustody" ADD COLUMN IF NOT EXISTS "serialNumberId" TEXT;
ALTER TABLE "ProductCustody" ADD COLUMN IF NOT EXISTS "custodianId" TEXT;
UPDATE "ProductCustody" SET "custodianId" = (SELECT id FROM "Employee" LIMIT 1) WHERE "custodianId" IS NULL;
ALTER TABLE "ProductCustody" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "ProductCustody" SET "createdAt" = "issuedAt" WHERE "createdAt" IS NULL AND "issuedAt" IS NOT NULL;

ALTER TABLE "TechnicianAdvance" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
UPDATE "TechnicianAdvance" SET "assignmentId" = "serviceAssignmentId" WHERE "assignmentId" IS NULL;
ALTER TABLE "TechnicianAdvance" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
UPDATE "TechnicianAdvance" SET "employeeId" = "technicianId" WHERE "employeeId" IS NULL;
ALTER TABLE "TechnicianAdvance" ADD COLUMN IF NOT EXISTS "amountIssued" DECIMAL(14,2);
UPDATE "TechnicianAdvance" SET "amountIssued" = "amount" WHERE "amountIssued" IS NULL;

ALTER TABLE "ConveyanceBill" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT;
UPDATE "ConveyanceBill" SET "assignmentId" = "serviceAssignmentId" WHERE "assignmentId" IS NULL;
ALTER TABLE "ConveyanceBill" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
UPDATE "ConveyanceBill" SET "employeeId" = "technicianId" WHERE "employeeId" IS NULL;
ALTER TABLE "ConveyanceBill" ADD COLUMN IF NOT EXISTS "totalClaimed" DECIMAL(14,2);
UPDATE "ConveyanceBill" SET "totalClaimed" = "amount" WHERE "totalClaimed" IS NULL;
ALTER TABLE "ConveyanceBill" ADD COLUMN IF NOT EXISTS "receiptFileId" TEXT;

ALTER TABLE "ProjectClosureReport" ADD COLUMN IF NOT EXISTS "customerSignatureFileId" TEXT;
ALTER TABLE "ProjectClosureReport" ADD COLUMN IF NOT EXISTS "closedById" TEXT;
UPDATE "ProjectClosureReport" SET "closedById" = 'cmu1k9ycn001orwho0zu1r7o5' WHERE "closedById" IS NULL;

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "serialNumberId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "serviceAssignmentId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "ticketType" "TicketType" DEFAULT 'PAID_SERVICE_REQUEST';

ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "serialNumberId" TEXT;
UPDATE "Warranty" SET "serialNumberId" = (SELECT id FROM "SerialNumber" WHERE "SerialNumber"."serialNumber" = "Warranty"."serialNumber" LIMIT 1) WHERE "serialNumberId" IS NULL;
UPDATE "Warranty" SET "serialNumberId" = 'WARR_SN_' || "id" WHERE "serialNumberId" IS NULL;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "termMonths" INTEGER;
UPDATE "Warranty" SET "termMonths" = COALESCE("warrantyMonths", 12) WHERE "termMonths" IS NULL;
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "status" "WarrantyStatus" DEFAULT 'ACTIVE';

ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "outcome" "WarrantyClaimOutcome";
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "raisedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "WarrantyClaim" SET "raisedAt" = "createdAt" WHERE "raisedAt" IS NULL AND "createdAt" IS NOT NULL;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- 6. FINANCE & ACCOUNTING COLUMNS
ALTER TABLE "ChartOfAccounts" ADD COLUMN IF NOT EXISTS "accountCode" INTEGER;
UPDATE "ChartOfAccounts" SET "accountCode" = CAST(REGEXP_REPLACE("code", '[^0-9]', '', 'g') AS INTEGER) WHERE "accountCode" IS NULL AND "code" ~ '[0-9]';
UPDATE "ChartOfAccounts" SET "accountCode" = 1000 + ctid::text::point[1]::int WHERE "accountCode" IS NULL;
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "accountCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ChartOfAccounts_accountCode_key" ON "ChartOfAccounts"("accountCode");
ALTER TABLE "ChartOfAccounts" ADD COLUMN IF NOT EXISTS "accountType" TEXT;
UPDATE "ChartOfAccounts" SET "accountType" = "type"::TEXT WHERE "accountType" IS NULL;
ALTER TABLE "ChartOfAccounts" ALTER COLUMN "accountType" SET NOT NULL;

ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "sourceModule" TEXT DEFAULT 'GENERAL';
UPDATE "JournalEntry" SET "sourceModule" = COALESCE("sourceType", 'GENERAL') WHERE "sourceModule" IS NULL;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "postedById" TEXT;
UPDATE "JournalEntry" SET "postedById" = "createdById" WHERE "postedById" IS NULL;
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "JournalEntry" SET "createdAt" = COALESCE("postedAt", CURRENT_TIMESTAMP) WHERE "createdAt" IS NULL;

ALTER TABLE "JournalLine" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "JournalLine" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "JournalLine" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;

ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "projectRef" TEXT;
ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "receivedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "CustomerAdvance" SET "receivedDate" = "receivedAt" WHERE "receivedDate" IS NULL AND "receivedAt" IS NOT NULL;
ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "method" TEXT DEFAULT 'CASH';
ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "status" "AdvanceStatus" DEFAULT 'RECEIVED';
ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "receivedById" TEXT DEFAULT 'cmu1k9ycn001orwho0zu1r7o5';
ALTER TABLE "CustomerAdvance" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "CustomerAdvance" SET "createdAt" = "receivedAt" WHERE "createdAt" IS NULL AND "receivedAt" IS NOT NULL;

ALTER TABLE "AdvanceAdjustment" ADD COLUMN IF NOT EXISTS "advanceId" TEXT;
UPDATE "AdvanceAdjustment" SET "advanceId" = "customerAdvanceId" WHERE "advanceId" IS NULL;
ALTER TABLE "AdvanceAdjustment" ADD COLUMN IF NOT EXISTS "amountAdjusted" DECIMAL(14,2);
UPDATE "AdvanceAdjustment" SET "amountAdjusted" = "amount" WHERE "amountAdjusted" IS NULL;
ALTER TABLE "AdvanceAdjustment" ADD COLUMN IF NOT EXISTS "adjustedById" TEXT DEFAULT 'cmu1k9ycn001orwho0zu1r7o5';

-- 7. INVENTORY & PROCUREMENT COLUMNS
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "grnId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "grnLineId" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "fromWarehouseId" TEXT;
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "toWarehouseId" TEXT;
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "fromStage" "SKULifecycleStage";
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "toStage" "SKULifecycleStage";
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "performedById" TEXT;

ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;
UPDATE "DamageLossReport" SET "warehouseId" = (SELECT id FROM "Warehouse" LIMIT 1) WHERE "warehouseId" IS NULL;
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "reason" TEXT DEFAULT 'Damage/Loss report';
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "evidenceFileId" TEXT;
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "status" "DamageLossStatus" DEFAULT 'REPORTED';
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "disposition" "DamageLossDisposition";
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "grossLoss" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "recovery" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "DamageLossReport" ADD COLUMN IF NOT EXISTS "netLoss" DECIMAL(14,2) DEFAULT 0;

ALTER TABLE "DamageLossLine" ADD COLUMN IF NOT EXISTS "reportId" TEXT;
UPDATE "DamageLossLine" SET "reportId" = "damageLossReportId" WHERE "reportId" IS NULL;
ALTER TABLE "DamageLossLine" ADD COLUMN IF NOT EXISTS "serialNumberId" TEXT;
ALTER TABLE "DamageLossLine" ADD COLUMN IF NOT EXISTS "batchId" TEXT;

ALTER TABLE "PurchaseInvoice" ADD COLUMN IF NOT EXISTS "grnId" TEXT;

ALTER TABLE "SupplierPayment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
UPDATE "SupplierPayment" SET "idempotencyKey" = 'SUPP_PAY_' || "id" WHERE "idempotencyKey" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "SupplierPayment_idempotencyKey_key" ON "SupplierPayment"("idempotencyKey");

ALTER TABLE "PurchaseReturn" ADD COLUMN IF NOT EXISTS "returnNumber" TEXT;
UPDATE "PurchaseReturn" SET "returnNumber" = 'PR-RET-' || "id" WHERE "returnNumber" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseReturn_returnNumber_key" ON "PurchaseReturn"("returnNumber");
ALTER TABLE "PurchaseReturn" ADD COLUMN IF NOT EXISTS "createdById" TEXT DEFAULT 'cmu1k9ycn001orwho0zu1r7o5';

-- 8. BANKING, LOANS, INVESTMENTS & HR
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "loanType" TEXT DEFAULT 'TERM_LOAN';
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "principalAmount" DECIMAL(14,2);
UPDATE "CompanyLoan" SET "principalAmount" = "principal" WHERE "principalAmount" IS NULL;
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "interestRate" DECIMAL(5,2);
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "tenureMonths" INTEGER DEFAULT 12;
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "disbursementDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "CompanyLoan" SET "disbursementDate" = "disbursedAt" WHERE "disbursementDate" IS NULL AND "disbursedAt" IS NOT NULL;
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(14,2);
UPDATE "CompanyLoan" SET "outstandingBalance" = "principal" WHERE "outstandingBalance" IS NULL;
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "CompanyLoan" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "loanId" TEXT;
UPDATE "LoanRepaymentSchedule" SET "loanId" = "companyLoanId" WHERE "loanId" IS NULL;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "installmentNo" INTEGER DEFAULT 1;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "principalDue" DECIMAL(14,2);
UPDATE "LoanRepaymentSchedule" SET "principalDue" = "amountDue" WHERE "principalDue" IS NULL;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "interestDue" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "paidDate" TIMESTAMP(3);
UPDATE "LoanRepaymentSchedule" SET "paidDate" = "paidAt" WHERE "paidDate" IS NULL AND "paidAt" IS NOT NULL;
ALTER TABLE "LoanRepaymentSchedule" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';

ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "investmentType" TEXT DEFAULT 'EQUITY';
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "equityPercentage" DECIMAL(5,2);
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "interestOrReturnRate" DECIMAL(5,2);
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "receivedDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "Investment" SET "receivedDate" = "investedAt" WHERE "receivedDate" IS NULL AND "investedAt" IS NOT NULL;
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "termsNote" TEXT;
UPDATE "Investment" SET "termsNote" = "calculationNote" WHERE "termsNote" IS NULL;
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
ALTER TABLE "Investment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "Investment" SET "createdAt" = "investedAt" WHERE "createdAt" IS NULL AND "investedAt" IS NOT NULL;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nidNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "nidNumberHash" TEXT;
UPDATE "Employee" SET "nidNumberEncrypted" = COALESCE("nidNumber", "id"), "nidNumberHash" = COALESCE("nidNumber", "id") WHERE "nidNumberHash" IS NULL;
ALTER TABLE "Employee" ALTER COLUMN "nidNumberEncrypted" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "nidNumberHash" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_nidNumberEncrypted_key" ON "Employee"("nidNumberEncrypted");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_nidNumberHash_key" ON "Employee"("nidNumberHash");

ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
UPDATE "EmployeeAdvance" SET "requestedAt" = "issuedAt" WHERE "requestedAt" IS NULL AND "issuedAt" IS NOT NULL;
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "approvalId" TEXT;
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "disbursedAt" TIMESTAMP(3);
UPDATE "EmployeeAdvance" SET "disbursedAt" = "issuedAt" WHERE "disbursedAt" IS NULL AND "issuedAt" IS NOT NULL;
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "repaymentPlan" TEXT DEFAULT 'SINGLE_DEDUCTION';
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(14,2);
UPDATE "EmployeeAdvance" SET "outstandingBalance" = "amount" WHERE "outstandingBalance" IS NULL;
ALTER TABLE "EmployeeAdvance" ADD COLUMN IF NOT EXISTS "status" "LoanStatus" DEFAULT 'ACTIVE';

ALTER TABLE "EmployeeLoanInstallment" ADD COLUMN IF NOT EXISTS "deductedAmount" DECIMAL(14,2) DEFAULT 0;
ALTER TABLE "EmployeeLoanInstallment" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';

ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "moduleKey" TEXT DEFAULT 'GENERAL';
ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "recordId" TEXT;
ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "formDataJson" JSONB DEFAULT '{}';
ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "isDirty" BOOLEAN DEFAULT true;
ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "lastSavedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "DraftState" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
