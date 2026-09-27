-- CreateEnum
CREATE TYPE "ChallanReturnCondition" AS ENUM ('GOOD', 'DAMAGED', 'FAULTY', 'MISSING_PARTS');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('WARRANTY_CLAIM', 'PAID_SERVICE_REQUEST');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "WarrantyClaimOutcome" AS ENUM ('REPLACED', 'REPAIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('RECEIVED', 'PARTIALLY_ADJUSTED', 'FULLY_ADJUSTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DamageLossDisposition" AS ENUM ('SCRAP', 'RETURN_TO_STOCK', 'REPAIR', 'RMA', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "DamageLossStatus" AS ENUM ('REPORTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalType" ADD VALUE 'GRN_DISCREPANCY';
ALTER TYPE "ApprovalType" ADD VALUE 'PURCHASE_RETURN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssignmentStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "AssignmentStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "AssignmentStatus" ADD VALUE 'CUSTOMER_ACCEPTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SKULifecycleStage" ADD VALUE 'WARRANTY_CLAIM_RAISED';
ALTER TYPE "SKULifecycleStage" ADD VALUE 'REPLACED';
ALTER TYPE "SKULifecycleStage" ADD VALUE 'REPAIRED';

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'QUOTE_PENDING', 'QUOTE_ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VoucherStatus_new" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
ALTER TABLE "Voucher" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Voucher" ALTER COLUMN "status" TYPE "VoucherStatus_new" USING ("status"::text::"VoucherStatus_new");
ALTER TYPE "VoucherStatus" RENAME TO "VoucherStatus_old";
ALTER TYPE "VoucherStatus_new" RENAME TO "VoucherStatus";
DROP TYPE "VoucherStatus_old";
ALTER TABLE "Voucher" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VoucherType_new" AS ENUM ('CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'SALES_RETURN', 'PURCHASE_RETURN', 'EXPENSE', 'ADJUSTMENT');
ALTER TABLE "Voucher" ALTER COLUMN "voucherType" TYPE "VoucherType_new" USING ("voucherType"::text::"VoucherType_new");
ALTER TYPE "VoucherType" RENAME TO "VoucherType_old";
ALTER TYPE "VoucherType_new" RENAME TO "VoucherType";
DROP TYPE "VoucherType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AdvanceAdjustment" DROP CONSTRAINT "AdvanceAdjustment_customerAdvanceId_fkey";

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ChartOfAccounts" DROP CONSTRAINT "ChartOfAccounts_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ConveyanceBill" DROP CONSTRAINT "ConveyanceBill_serviceAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ConveyanceBill" DROP CONSTRAINT "ConveyanceBill_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerWalletTransaction" DROP CONSTRAINT "CustomerWalletTransaction_customerId_fkey";

-- DropForeignKey
ALTER TABLE "DamageLossLine" DROP CONSTRAINT "DamageLossLine_damageLossReportId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryChallanLine" DROP CONSTRAINT "DeliveryChallanLine_deliveryChallanId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryChallanReturnLine" DROP CONSTRAINT "DeliveryChallanReturnLine_deliveryChallanReturnId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "LoanRepaymentSchedule" DROP CONSTRAINT "LoanRepaymentSchedule_companyLoanId_fkey";

-- DropForeignKey
ALTER TABLE "ProductCustody" DROP CONSTRAINT "ProductCustody_serviceAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_branchId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturn" DROP CONSTRAINT "SalesReturn_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturnLine" DROP CONSTRAINT "SalesReturnLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesReturnLine" DROP CONSTRAINT "SalesReturnLine_salesReturnId_fkey";

-- DropForeignKey
ALTER TABLE "StockTransfer" DROP CONSTRAINT "StockTransfer_fromWarehouseId_fkey";

-- DropForeignKey
ALTER TABLE "StockTransfer" DROP CONSTRAINT "StockTransfer_toWarehouseId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianAdvance" DROP CONSTRAINT "TechnicianAdvance_serviceAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianAdvance" DROP CONSTRAINT "TechnicianAdvance_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianAssignment" DROP CONSTRAINT "TechnicianAssignment_serviceAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianAssignment" DROP CONSTRAINT "TechnicianAssignment_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Warranty" DROP CONSTRAINT "Warranty_productId_fkey";

-- DropForeignKey
ALTER TABLE "WarrantyClaim" DROP CONSTRAINT "WarrantyClaim_ticketId_fkey";

-- DropIndex
DROP INDEX "AdvanceAdjustment_customerAdvanceId_idx";

-- DropIndex
DROP INDEX "ChartOfAccounts_code_idx";

-- DropIndex
DROP INDEX "ChartOfAccounts_code_key";

-- DropIndex
DROP INDEX "ChartOfAccounts_type_isActive_idx";

-- DropIndex
DROP INDEX "ConveyanceBill_serviceAssignmentId_idx";

-- DropIndex
DROP INDEX "ConveyanceBill_technicianId_idx";

-- DropIndex
DROP INDEX "CustomerAdvance_branchId_customerId_idx";

-- DropIndex
DROP INDEX "CustomerWalletTransaction_createdAt_idx";

-- DropIndex
DROP INDEX "DamageLossLine_damageLossReportId_idx";

-- DropIndex
DROP INDEX "DamageLossReport_branchId_approvalStatus_idx";

-- DropIndex
DROP INDEX "DeliveryChallanLine_deliveryChallanId_idx";

-- DropIndex
DROP INDEX "DeliveryChallanLine_productId_idx";

-- DropIndex
DROP INDEX "DeliveryChallanReturn_branchId_idx";

-- DropIndex
DROP INDEX "DeliveryChallanReturnLine_challanLineId_idx";

-- DropIndex
DROP INDEX "DeliveryChallanReturnLine_deliveryChallanReturnId_idx";

-- DropIndex
DROP INDEX "DraftState_userId_formKey_key";

-- DropIndex
DROP INDEX "Employee_nidNumber_key";

-- DropIndex
DROP INDEX "Investment_investedAt_idx";

-- DropIndex
DROP INDEX "JournalEntry_branchId_postedAt_idx";

-- DropIndex
DROP INDEX "JournalEntry_fiscalPeriodId_idx";

-- DropIndex
DROP INDEX "JournalEntry_sourceType_sourceId_idx";

-- DropIndex
DROP INDEX "LoanRepaymentSchedule_companyLoanId_dueDate_idx";

-- DropIndex
DROP INDEX "Product_brandId_idx";

-- DropIndex
DROP INDEX "Product_productCode_key";

-- DropIndex
DROP INDEX "ProductCustody_serviceAssignmentId_status_idx";

-- DropIndex
DROP INDEX "SalesReturn_warehouseId_idx";

-- DropIndex
DROP INDEX "TechnicianAdvance_serviceAssignmentId_idx";

-- DropIndex
DROP INDEX "TechnicianAdvance_technicianId_idx";

-- DropIndex
DROP INDEX "TechnicianAssignment_serviceAssignmentId_idx";

-- DropIndex
DROP INDEX "TechnicianAssignment_technicianId_idx";

-- DropIndex
DROP INDEX "Unit_name_key";

-- DropIndex
DROP INDEX "Warehouse_branchId_isActive_idx";

-- DropIndex
DROP INDEX "Warranty_customerId_idx";

-- DropIndex
DROP INDEX "Warranty_serialNumber_idx";

-- AlterTable
ALTER TABLE "AdvanceAdjustment" DROP COLUMN "amount",
DROP COLUMN "customerAdvanceId",
ADD COLUMN     "adjustedById" TEXT NOT NULL,
ADD COLUMN     "advanceId" TEXT NOT NULL,
ADD COLUMN     "amountAdjusted" DECIMAL(14,2) NOT NULL;

-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "address",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "parentId",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ChartOfAccounts" DROP COLUMN "code",
DROP COLUMN "createdAt",
DROP COLUMN "parentId",
DROP COLUMN "type",
DROP COLUMN "updatedAt",
ADD COLUMN     "accountCode" INTEGER NOT NULL,
ADD COLUMN     "accountType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompanyLoan" DROP COLUMN "disbursedAt",
DROP COLUMN "interestBearing",
DROP COLUMN "principal",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disbursementDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "interestRate" DECIMAL(5,2),
ADD COLUMN     "loanType" TEXT NOT NULL,
ADD COLUMN     "outstandingBalance" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "principalAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "tenureMonths" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ConveyanceBill" DROP COLUMN "amount",
DROP COLUMN "notes",
DROP COLUMN "serviceAssignmentId",
DROP COLUMN "technicianId",
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "receiptFileId" TEXT,
ADD COLUMN     "totalClaimed" DECIMAL(14,2) NOT NULL;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "CustomerAddress" DROP COLUMN "createdAt",
DROP COLUMN "isDefault";

-- AlterTable
ALTER TABLE "CustomerAdvance" DROP COLUMN "receivedAt",
DROP COLUMN "utilized",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "method" TEXT NOT NULL,
ADD COLUMN     "projectRef" TEXT,
ADD COLUMN     "receivedById" TEXT NOT NULL,
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "AdvanceStatus" NOT NULL DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "DamageLossLine" DROP COLUMN "damageLossReportId",
DROP COLUMN "reason",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "reportId" TEXT NOT NULL,
ADD COLUMN     "serialNumberId" TEXT;

-- AlterTable
ALTER TABLE "DamageLossReport" DROP COLUMN "approvalStatus",
DROP COLUMN "resolvedAt",
ADD COLUMN     "disposition" "DamageLossDisposition",
ADD COLUMN     "evidenceFileId" TEXT,
ADD COLUMN     "grossLoss" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "netLoss" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "recovery" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" "DamageLossStatus" NOT NULL DEFAULT 'REPORTED',
ADD COLUMN     "warehouseId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DeliveryChallanLine" DROP COLUMN "deliveryChallanId",
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "challanId" SET NOT NULL,
ALTER COLUMN "productId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DeliveryChallanReturn" DROP COLUMN "reason",
ADD COLUMN     "challanId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DeliveryChallanReturnLine" DROP COLUMN "deliveryChallanReturnId",
ADD COLUMN     "condition" "ChallanReturnCondition" NOT NULL,
ADD COLUMN     "damageLossReportId" TEXT,
ADD COLUMN     "returnId" TEXT NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "DraftState" DROP COLUMN "formKey",
DROP COLUMN "stateJson",
DROP COLUMN "updatedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "formDataJson" JSONB NOT NULL,
ADD COLUMN     "isDirty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSavedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "moduleKey" TEXT NOT NULL,
ADD COLUMN     "recordId" TEXT;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "deletedAt",
DROP COLUMN "designation",
DROP COLUMN "email",
DROP COLUMN "nidNumber",
DROP COLUMN "phone",
ADD COLUMN     "nidNumberEncrypted" TEXT NOT NULL,
ADD COLUMN     "nidNumberHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EmployeeAdvance" DROP COLUMN "issuedAt",
ADD COLUMN     "approvalId" TEXT,
ADD COLUMN     "disbursedAt" TIMESTAMP(3),
ADD COLUMN     "outstandingBalance" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "repaymentPlan" TEXT NOT NULL,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "EmployeeLoanInstallment" ADD COLUMN     "deductedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "GoodsReceiptNote" ALTER COLUMN "receivedById" SET NOT NULL,
ALTER COLUMN "receivedById" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Investment" DROP COLUMN "calculationNote",
DROP COLUMN "investedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "equityPercentage" DECIMAL(5,2),
ADD COLUMN     "interestOrReturnRate" DECIMAL(5,2),
ADD COLUMN     "investmentType" TEXT NOT NULL,
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "termsNote" TEXT;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "paidAmount",
DROP COLUMN "salesOrderId",
DROP COLUMN "updatedAt",
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JournalEntry" DROP COLUMN "createdById",
DROP COLUMN "narration",
DROP COLUMN "sourceType",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "postedById" TEXT,
ADD COLUMN     "sourceModule" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "postedAt" DROP NOT NULL,
ALTER COLUMN "postedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JournalLine" DROP COLUMN "narration",
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "LoanRepaymentSchedule" DROP COLUMN "amountDue",
DROP COLUMN "companyLoanId",
DROP COLUMN "paidAt",
ADD COLUMN     "installmentNo" INTEGER NOT NULL,
ADD COLUMN     "interestDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "loanId" TEXT NOT NULL,
ADD COLUMN     "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidDate" TIMESTAMP(3),
ADD COLUMN     "principalDue" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "description",
DROP COLUMN "hasBatch",
DROP COLUMN "hasSerial",
DROP COLUMN "productCode",
DROP COLUMN "salesPrice",
DROP COLUMN "version",
ALTER COLUMN "sku" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductCustody" DROP COLUMN "issuedAt",
DROP COLUMN "returnedAt",
DROP COLUMN "serialNumber",
DROP COLUMN "serviceAssignmentId",
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "custodianId" TEXT NOT NULL,
ADD COLUMN     "serialNumberId" TEXT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectClosureReport" DROP COLUMN "approvalStatus",
DROP COLUMN "customerSignatureId",
DROP COLUMN "summary",
ADD COLUMN     "closedById" TEXT NOT NULL,
ADD COLUMN     "customerSignatureFileId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseInvoice" ADD COLUMN     "grnId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseReturn" DROP COLUMN "quantity",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "returnNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Quotation" DROP COLUMN "discountTotal",
DROP COLUMN "notes",
DROP COLUMN "subTotal",
DROP COLUMN "taxTotal";

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "issuedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "revokedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SKULifecycleEvent" ADD COLUMN     "fromStage" "SKULifecycleStage",
ADD COLUMN     "fromWarehouseId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "performedById" TEXT,
ADD COLUMN     "toStage" "SKULifecycleStage",
ADD COLUMN     "toWarehouseId" TEXT;

-- AlterTable
ALTER TABLE "SalesOrder" DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "SalesOrderLine" ADD COLUMN     "description" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SalesReturn" ALTER COLUMN "refundAmount" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SerialNumber" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "grnId" TEXT,
ADD COLUMN     "grnLineId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "address",
DROP COLUMN "email",
DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "SupplierContact" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "idempotencyKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaxRate" DROP COLUMN "createdAt",
DROP COLUMN "rate",
ADD COLUMN     "ratePercent" DECIMAL(5,2) NOT NULL;

-- AlterTable
ALTER TABLE "TechnicianAdvance" DROP COLUMN "amount",
DROP COLUMN "approvalStatus",
DROP COLUMN "serviceAssignmentId",
DROP COLUMN "technicianId",
ADD COLUMN     "amountIssued" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "employeeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TechnicianAssignment" DROP COLUMN "isLead",
DROP COLUMN "releasedAt",
DROP COLUMN "serviceAssignmentId",
DROP COLUMN "technicianId",
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "unassignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "priority",
DROP COLUMN "subject",
DROP COLUMN "updatedAt",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "serialNumberId" TEXT,
ADD COLUMN     "serviceAssignmentId" TEXT,
DROP COLUMN "ticketType",
ADD COLUMN     "ticketType" "TicketType" NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Warehouse" DROP COLUMN "address",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "branchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Warranty" DROP COLUMN "customerId",
DROP COLUMN "invoiceId",
DROP COLUMN "isActive",
DROP COLUMN "productId",
DROP COLUMN "serialNumber",
DROP COLUMN "warrantyMonths",
ADD COLUMN     "serialNumberId" TEXT NOT NULL,
ADD COLUMN     "status" "WarrantyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "termMonths" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "WarrantyClaim" DROP COLUMN "approvalStatus",
DROP COLUMN "claimReason",
DROP COLUMN "createdAt",
ADD COLUMN     "outcome" "WarrantyClaimOutcome",
ADD COLUMN     "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ALTER COLUMN "ticketId" SET NOT NULL;

-- DropTable
DROP TABLE "DomainEventOutbox";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "JournalEntryStatus";

-- DropEnum
DROP TYPE "TicketPriority";

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalPeriod" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FiscalPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturnLine" (
    "id" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "goodsReceiptNoteLineId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "resultDocumentId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "includeLetterheadByDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrintPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");

-- CreateIndex
CREATE INDEX "SubCategory_isActive_idx" ON "SubCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalPeriod_year_key" ON "FiscalPeriod"("year");

-- CreateIndex
CREATE INDEX "FiscalPeriod_year_idx" ON "FiscalPeriod"("year");

-- CreateIndex
CREATE INDEX "PurchaseReturnLine_purchaseReturnId_idx" ON "PurchaseReturnLine"("purchaseReturnId");

-- CreateIndex
CREATE INDEX "SavedFilter_userId_moduleKey_idx" ON "SavedFilter"("userId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilter_userId_moduleKey_name_key" ON "SavedFilter"("userId", "moduleKey", "name");

-- CreateIndex
CREATE INDEX "ExportJob_requestedById_status_idx" ON "ExportJob"("requestedById", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PrintPreference_userId_key" ON "PrintPreference"("userId");

-- CreateIndex
CREATE INDEX "PrintPreference_userId_idx" ON "PrintPreference"("userId");

-- CreateIndex
CREATE INDEX "AdvanceAdjustment_advanceId_idx" ON "AdvanceAdjustment"("advanceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccounts_accountCode_key" ON "ChartOfAccounts"("accountCode");

-- CreateIndex
CREATE INDEX "ChartOfAccounts_accountType_idx" ON "ChartOfAccounts"("accountType");

-- CreateIndex
CREATE INDEX "ConveyanceBill_assignmentId_approvalStatus_idx" ON "ConveyanceBill"("assignmentId", "approvalStatus");

-- CreateIndex
CREATE INDEX "CustomerAdvance_customerId_status_idx" ON "CustomerAdvance"("customerId", "status");

-- CreateIndex
CREATE INDEX "CustomerAdvance_branchId_idx" ON "CustomerAdvance"("branchId");

-- CreateIndex
CREATE INDEX "CustomerWalletTransaction_referenceId_idx" ON "CustomerWalletTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "DamageLossLine_reportId_idx" ON "DamageLossLine"("reportId");

-- CreateIndex
CREATE INDEX "DamageLossReport_branchId_status_idx" ON "DamageLossReport"("branchId", "status");

-- CreateIndex
CREATE INDEX "DeliveryChallanReturn_challanId_idx" ON "DeliveryChallanReturn"("challanId");

-- CreateIndex
CREATE INDEX "DeliveryChallanReturnLine_returnId_idx" ON "DeliveryChallanReturnLine"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftState_userId_moduleKey_recordId_key" ON "DraftState"("userId", "moduleKey", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_nidNumberEncrypted_key" ON "Employee"("nidNumberEncrypted");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_nidNumberHash_key" ON "Employee"("nidNumberHash");

-- CreateIndex
CREATE INDEX "GoodsReceiptNoteLine_purchaseOrderLineId_idx" ON "GoodsReceiptNoteLine"("purchaseOrderLineId");

-- CreateIndex
CREATE INDEX "Investment_receivedDate_idx" ON "Investment"("receivedDate");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceModule_sourceId_idx" ON "JournalEntry"("sourceModule", "sourceId");

-- CreateIndex
CREATE INDEX "JournalEntry_branchId_fiscalPeriodId_idx" ON "JournalEntry"("branchId", "fiscalPeriodId");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "LoanRepaymentSchedule_loanId_dueDate_idx" ON "LoanRepaymentSchedule"("loanId", "dueDate");

-- CreateIndex
CREATE INDEX "Product_subCategoryId_idx" ON "Product"("subCategoryId");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "ProductCustody_assignmentId_idx" ON "ProductCustody"("assignmentId");

-- CreateIndex
CREATE INDEX "ProductCustody_custodianId_status_idx" ON "ProductCustody"("custodianId", "status");

-- CreateIndex
CREATE INDEX "ProjectClosureReport_closedAt_idx" ON "ProjectClosureReport"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReturn_returnNumber_key" ON "PurchaseReturn"("returnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SerialNumber_barcode_key" ON "SerialNumber"("barcode");

-- CreateIndex
CREATE INDEX "SerialNumber_productId_warehouseId_currentStage_idx" ON "SerialNumber"("productId", "warehouseId", "currentStage");

-- CreateIndex
CREATE INDEX "SerialNumber_barcode_idx" ON "SerialNumber"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_idempotencyKey_key" ON "SupplierPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TechnicianAdvance_assignmentId_idx" ON "TechnicianAdvance"("assignmentId");

-- CreateIndex
CREATE INDEX "TechnicianAdvance_employeeId_idx" ON "TechnicianAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "TechnicianAssignment_assignmentId_idx" ON "TechnicianAssignment"("assignmentId");

-- CreateIndex
CREATE INDEX "TechnicianAssignment_employeeId_idx" ON "TechnicianAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_serviceAssignmentId_key" ON "Ticket"("serviceAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "Warehouse_isActive_idx" ON "Warehouse"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_serialNumberId_key" ON "Warranty"("serialNumberId");

-- CreateIndex
CREATE INDEX "Warranty_status_idx" ON "Warranty"("status");

-- CreateIndex
CREATE INDEX "WarrantyClaim_ticketId_idx" ON "WarrantyClaim"("ticketId");

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallan" ADD CONSTRAINT "DeliveryChallan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanLine" ADD CONSTRAINT "DeliveryChallanLine_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanLine" ADD CONSTRAINT "DeliveryChallanLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanLine" ADD CONSTRAINT "DeliveryChallanLine_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanLine" ADD CONSTRAINT "DeliveryChallanLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanReturn" ADD CONSTRAINT "DeliveryChallanReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanReturn" ADD CONSTRAINT "DeliveryChallanReturn_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "DeliveryChallan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanReturnLine" ADD CONSTRAINT "DeliveryChallanReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "DeliveryChallanReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryChallanReturnLine" ADD CONSTRAINT "DeliveryChallanReturnLine_damageLossReportId_fkey" FOREIGN KEY ("damageLossReportId") REFERENCES "DamageLossReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnLine" ADD CONSTRAINT "SalesReturnLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerWalletTransaction" ADD CONSTRAINT "CustomerWalletTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignment" ADD CONSTRAINT "TechnicianAssignment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignment" ADD CONSTRAINT "TechnicianAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustody" ADD CONSTRAINT "ProductCustody_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustody" ADD CONSTRAINT "ProductCustody_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCustody" ADD CONSTRAINT "ProductCustody_custodianId_fkey" FOREIGN KEY ("custodianId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAdvance" ADD CONSTRAINT "TechnicianAdvance_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAdvance" ADD CONSTRAINT "TechnicianAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConveyanceBill" ADD CONSTRAINT "ConveyanceBill_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConveyanceBill" ADD CONSTRAINT "ConveyanceBill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectClosureReport" ADD CONSTRAINT "ProjectClosureReport_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveLocationLog" ADD CONSTRAINT "LiveLocationLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serviceAssignmentId_fkey" FOREIGN KEY ("serviceAssignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_fiscalPeriodId_fkey" FOREIGN KEY ("fiscalPeriodId") REFERENCES "FiscalPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceAdjustment" ADD CONSTRAINT "AdvanceAdjustment_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "CustomerAdvance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceAdjustment" ADD CONSTRAINT "AdvanceAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerialNumber" ADD CONSTRAINT "SerialNumber_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLossReport" ADD CONSTRAINT "DamageLossReport_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLossLine" ADD CONSTRAINT "DamageLossLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DamageLossReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLossLine" ADD CONSTRAINT "DamageLossLine_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageLossLine" ADD CONSTRAINT "DamageLossLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNoteLine" ADD CONSTRAINT "GoodsReceiptNoteLine_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "SerialNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceiptNoteLine" ADD CONSTRAINT "GoodsReceiptNoteLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceiptNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnLine" ADD CONSTRAINT "PurchaseReturnLine_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnLine" ADD CONSTRAINT "PurchaseReturnLine_goodsReceiptNoteLineId_fkey" FOREIGN KEY ("goodsReceiptNoteLineId") REFERENCES "GoodsReceiptNoteLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdvanceConveyanceReconciliation" ADD CONSTRAINT "ProjectAdvanceConveyanceReconciliation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ServiceAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLoan" ADD CONSTRAINT "CompanyLoan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepaymentSchedule" ADD CONSTRAINT "LoanRepaymentSchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "CompanyLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoanInstallment" ADD CONSTRAINT "EmployeeLoanInstallment_deductedInPayrollRunId_fkey" FOREIGN KEY ("deductedInPayrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_resultDocumentId_fkey" FOREIGN KEY ("resultDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

