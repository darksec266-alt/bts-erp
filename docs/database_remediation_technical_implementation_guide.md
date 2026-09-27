# Database Schema Remediation & Security Implementation Specification

**Target System:** Inventory, Order, Logistics, & Accounting ERP Platform  
**Target Database:** PostgreSQL 15+ with Prisma ORM  
**Document Purpose:** Direct execution blueprint for developers and AI agents (e.g., Claude) to patch schema gaps, enforce multi-tenant branch isolation, apply RLS policies, implement field-level PII encryption, and set up high-volume table partitioning.

---

## Table of Contents
1. [Executive Summary & Remediation Architecture](#1-executive-summary--remediation-architecture)
2. [Phase 1: Prisma Schema Patch (`schema.prisma`)](#2-phase-1-prisma-schema-patch-schemaprisma)
    - 1.1 Updated Enums
    - 1.2 Line Item Breakdown Models
    - 1.3 Delivery Challan & Return Subsystem
    - 1.4 Damage & Loss Infrastructure
    - 1.5 Work Ledger & Performance Models
    - 1.6 Multi-Tenant Branch Isolation Keys
3. [Phase 2: Migration Script & PostgreSQL Row-Level Security (RLS)](#3-phase-2-migration-script--postgresql-row-level-security-rls)
    - 2.1 Schema Migration DDL
    - 2.2 Branch Isolation & RLS Security Policies
4. [Phase 3: High-Volume Table Partitioning Strategies](#4-phase-3-high-volume-table-partitioning-strategies)
    - 3.1 Range Partitioning for `LiveLocationLog`
    - 3.2 Range Partitioning for `SKULifecycleEvent`
    - 3.3 Automated Partition Maintenance & Archival
5. [Phase 4: Application-Level PII Encryption & IDOR Protection](#5-phase-4-application-level-pii-encryption--idor-protection)
    - 4.1 Field-Level AES-256-GCM Encryption for PII Data
    - 4.2 Payment Gateway Payload Sanitization
    - 4.3 Secure S3 Pre-Signed Document Access (IDOR Prevention)
6. [Phase 5: Step-by-Step Execution Plan for Claude / Developers](#6-phase-5-step-by-step-execution-plan-for-claude--developers)

---

## 1. Executive Summary & Remediation Architecture

The recent feature and reporting specifications introduced requirements (multi-delivery challans, returns, itemized billing, damage disposition tracking, employee performance ledgers, and real-time serial tracking) that were missing from the legacy database schema.

### Key Corrections Addressed in This Specification:
* **Missing Line Items:** Added granular breakdown tables for `Invoice`, `CreditNote`, and `GoodsReceiptNote`.
* **Delivery Challan Engine:** Added full tracking for multiple delivery challans, partial deliveries, QC, and returns.
* **Damage & Loss System:** Introduced formal damage reporting, evidence image arrays, disposition tracking (`RMA`, `SCRAP`, `REPAIR`), and recovery value fields.
* **Branch Isolation & RLS:** Denormalized `branchId` across `StockLedger`, `SerialNumber`, `SKULifecycleEvent`, `ApprovalRequest`, and `Document` to support high-performance PostgreSQL Row-Level Security (RLS) and eliminate multi-hop join latency.
* **Partitioning:** Converted `LiveLocationLog` and `SKULifecycleEvent` to native PostgreSQL range partitions based on time.
* **Data Security & Privacy:** Added field-level encryption for `SalaryStructure` and sanitized payment log storage.

---

## 2. Phase 1: Prisma Schema Patch (`schema.prisma`)

Merge or append the following schema additions directly into your project's `prisma/schema.prisma` file.

```prisma
// ==========================================
// 1. UPDATED & NEW ENUMS
// ==========================================

enum SKULifecycleStage {
  AVAILABLE
  RESERVED
  DISPATCHED
  DELIVERED
  RETURNED
  QUARANTINE
  REPAIR
  LOST
  SCRAPPED
  TRANSIT_BETWEEN_BRANCHES
}

enum ChallanStatus {
  DRAFT
  DISPATCHED
  PARTIALLY_DELIVERED
  FULLY_DELIVERED
  CANCELLED
  RETURN_INITIATED
}

enum ChallanReturnStatus {
  PENDING_QC
  QC_IN_PROGRESS
  QC_COMPLETED
  REJECTED
  APPROVED
}

enum DispositionType {
  RMA_VENDOR_RETURN
  SCRAP
  INTERNAL_REPAIR
  RETURN_TO_STOCK
  WRITE_OFF
}

enum DamageStatus {
  REPORTED
  UNDER_INVESTIGATION
  APPROVED
  DISPOSED
  REJECTED
}

enum QCStatus {
  PENDING
  PASSED
  FAILED
}

// ==========================================
// 2. MISSING LINE ITEM TABLES
// ==========================================

model InvoiceLine {
  id            String   @id @default(uuid()) @db.Uuid
  invoiceId     String   @db.Uuid
  skuId         String   @db.Uuid
  description   String?
  quantity      Int
  unitPrice     Decimal  @db.Decimal(12, 2)
  taxRate       Decimal  @default(0.00) @db.Decimal(5, 2)
  discount      Decimal  @default(0.00) @db.Decimal(12, 2)
  lineTotal     Decimal  @db.Decimal(12, 2)
  createdAt     DateTime @default(now())

  // Relations
  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  sku           SKU      @relation(fields: [skuId], references: [id])

  @@index([invoiceId])
  @@index([skuId])
}

model CreditNoteLine {
  id            String     @id @default(uuid()) @db.Uuid
  creditNoteId  String     @db.Uuid
  skuId         String     @db.Uuid
  quantity      Int
  unitPrice     Decimal    @db.Decimal(12, 2)
  lineTotal     Decimal    @db.Decimal(12, 2)
  reason        String?
  createdAt     DateTime   @default(now())

  // Relations
  creditNote    CreditNote @relation(fields: [creditNoteId], references: [id], onDelete: Cascade)
  sku           SKU        @relation(fields: [skuId], references: [id])

  @@index([creditNoteId])
  @@index([skuId])
}

model GoodsReceiptNoteLine {
  id               String           @id @default(uuid()) @db.Uuid
  grnId            String           @db.Uuid
  skuId            String           @db.Uuid
  quantityOrdered  Int
  quantityReceived Int
  quantityAccepted Int
  quantityRejected Int              @default(0)
  unitCost         Decimal          @db.Decimal(12, 2)
  createdAt        DateTime         @default(now())

  // Relations
  goodsReceiptNote GoodsReceiptNote @relation(fields: [grnId], references: [id], onDelete: Cascade)
  sku              SKU              @relation(fields: [skuId], references: [id])

  @@index([grnId])
  @@index([skuId])
}

// ==========================================
// 3. DELIVERY CHALLAN & RETURN SUBSYSTEM
// ==========================================

model DeliveryChallan {
  id               String                @id @default(uuid()) @db.Uuid
  tenantId         String                @db.Uuid
  branchId         String                @db.Uuid
  challanNumber    String                @unique
  orderId          String                @db.Uuid
  transporterName  String?
  vehicleNumber    String?
  driverPhone      String?
  dispatchDate     DateTime              @default(now())
  estimatedDelivery DateTime?
  status           ChallanStatus         @default(DRAFT)
  notes            String?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  // Relations
  tenant           Tenant                @relation(fields: [tenantId], references: [id])
  branch           Branch                @relation(fields: [branchId], references: [id])
  order            SalesOrder            @relation(fields: [orderId], references: [id])
  lines            DeliveryChallanLine[]
  returns          DeliveryChallanReturn[]

  @@index([tenantId, branchId])
  @@index([orderId])
  @@index([challanNumber])
}

model DeliveryChallanLine {
  id                 String          @id @default(uuid()) @db.Uuid
  challanId          String          @db.Uuid
  skuId              String          @db.Uuid
  quantityDispatched Int
  quantityDelivered  Int             @default(0)
  quantityReturned   Int             @default(0)
  createdAt          DateTime        @default(now())

  // Relations
  challan            DeliveryChallan @relation(fields: [challanId], references: [id], onDelete: Cascade)
  sku                SKU             @relation(fields: [skuId], references: [id])

  @@index([challanId])
  @@index([skuId])
}

model DeliveryChallanReturn {
  id               String                      @id @default(uuid()) @db.Uuid
  tenantId         String                      @db.Uuid
  branchId         String                      @db.Uuid
  challanId        String                      @db.Uuid
  returnNumber     String                      @unique
  status           ChallanReturnStatus         @default(PENDING_QC)
  reason           String
  receivedAt       DateTime                    @default(now())
  inspectedByUserId String?                    @db.Uuid
  createdAt        DateTime                    @default(now())
  updatedAt        DateTime                    @updatedAt

  // Relations
  tenant           Tenant                      @relation(fields: [tenantId], references: [id])
  branch           Branch                      @relation(fields: [branchId], references: [id])
  challan          DeliveryChallan             @relation(fields: [challanId], references: [id])
  inspectedBy      User?                       @relation(fields: [inspectedByUserId], references: [id])
  lines            DeliveryChallanReturnLine[]

  @@index([tenantId, branchId])
  @@index([challanId])
}

model DeliveryChallanReturnLine {
  id               String                @id @default(uuid()) @db.Uuid
  challanReturnId  String                @db.Uuid
  skuId            String                @db.Uuid
  serialNumberId   String?               @db.Uuid
  quantityReturned Int
  qcStatus         QCStatus              @default(PENDING)
  disposition      DispositionType?
  remarks          String?
  createdAt        DateTime              @default(now())

  // Relations
  challanReturn    DeliveryChallanReturn @relation(fields: [challanReturnId], references: [id], onDelete: Cascade)
  sku              SKU                   @relation(fields: [skuId], references: [id])
  serialNumber     SerialNumber?         @relation(fields: [serialNumberId], references: [id])

  @@index([challanReturnId])
  @@index([skuId])
}

// ==========================================
// 4. DAMAGE & LOSS INFRASTRUCTURE
// ==========================================

model DamageLossReport {
  id               String           @id @default(uuid()) @db.Uuid
  tenantId         String           @db.Uuid
  branchId         String           @db.Uuid
  reportNumber     String           @unique
  reportedByUserId String           @db.Uuid
  status           DamageStatus     @default(REPORTED)
  totalCostValue   Decimal          @db.Decimal(12, 2)
  totalRecovered   Decimal          @default(0.00) @db.Decimal(12, 2)
  approvedByUserId String?          @db.Uuid
  approvalDate     DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // Relations
  tenant           Tenant           @relation(fields: [tenantId], references: [id])
  branch           Branch           @relation(fields: [branchId], references: [id])
  reportedBy       User             @relation("ReportedDamage", fields: [reportedByUserId], references: [id])
  approvedBy       User?            @relation("ApprovedDamage", fields: [approvedByUserId], references: [id])
  lines            DamageLossLine[]

  @@index([tenantId, branchId])
  @@index([reportNumber])
}

model DamageLossLine {
  id               String            @id @default(uuid()) @db.Uuid
  reportId         String            @db.Uuid
  skuId            String            @db.Uuid
  serialNumberId   String?           @db.Uuid
  quantity         Int
  costPrice        Decimal           @db.Decimal(12, 2)
  recoveredAmount  Decimal           @default(0.00) @db.Decimal(12, 2)
  disposition      DispositionType
  reason           String
  evidenceImages   String[]          // S3 Key URLs for photo proof
  createdAt        DateTime          @default(now())

  // Relations
  report           DamageLossReport  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  sku              SKU               @relation(fields: [skuId], references: [id])
  serialNumber     SerialNumber?     @relation(fields: [serialNumberId], references: [id])

  @@index([reportId])
  @@index([skuId])
}

// ==========================================
// 5. EMPLOYEE WORK & PERFORMANCE LEDGER
// ==========================================

model EmployeeWorkLedger {
  id                   String   @id @default(uuid()) @db.Uuid
  tenantId             String   @db.Uuid
  branchId             String   @db.Uuid
  userId               String   @db.Uuid
  workDate             DateTime @db.Date
  tasksCompleted       Int      @default(0)
  deliveriesCompleted  Int      @default(0)
  reworkCount          Int      @default(0)
  customerAcceptancePct Decimal @default(100.00) @db.Decimal(5, 2)
  hoursLogged          Decimal  @db.Decimal(4, 2)
  createdAt            DateTime @default(now())

  // Relations
  tenant               Tenant   @relation(fields: [tenantId], references: [id])
  branch               Branch   @relation(fields: [branchId], references: [id])
  user                 User     @relation(fields: [userId], references: [id])

  @@unique([userId, workDate])
  @@index([tenantId, branchId])
  @@index([workDate])
}
```

---

## 3. Phase 2: Migration Script & PostgreSQL Row-Level Security (RLS)

Execute this raw SQL migration to add missing `branchId` foreign keys to existing tables and enforce tenant/branch isolation policies at the PostgreSQL engine level.

### 2.1 Branch Isolation Backfill DDL (`migration.sql`)

```sql
-- Step 1: Add missing branchId columns for RLS filtering
ALTER TABLE "StockLedger" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "SerialNumber" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "SKULifecycleEvent" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "branchId" UUID;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "branchId" UUID;

-- Step 2: Backfill branchId values from parent relations (where applicable)
UPDATE "SerialNumber" sn 
SET "branchId" = w."branchId" 
FROM "Warehouse" w 
WHERE sn."warehouseId" = w."id" AND sn."branchId" IS NULL;

-- Step 3: Enforce NOT NULL and foreign keys (Adjust cascade as needed)
ALTER TABLE "StockLedger" ADD CONSTRAINT fk_stock_ledger_branch FOREIGN KEY ("branchId") REFERENCES "Branch"("id");
ALTER TABLE "SerialNumber" ADD CONSTRAINT fk_serial_number_branch FOREIGN KEY ("branchId") REFERENCES "Branch"("id");
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT fk_approval_request_branch FOREIGN KEY ("branchId") REFERENCES "Branch"("id");
ALTER TABLE "Document" ADD CONSTRAINT fk_document_branch FOREIGN KEY ("branchId") REFERENCES "Branch"("id");
```

### 2.2 Row-Level Security (RLS) Setup

```sql
-- Enable Row Level Security on core isolated tables
ALTER TABLE "StockLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SerialNumber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeliveryChallan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DamageLossReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Create session settings function for tenant and branch context
CREATE OR REPLACE FUNCTION current_app_tenant() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_branch() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_branch_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policy: Stock Ledger Branch Isolation
DROP POLICY IF EXISTS stock_ledger_isolation_policy ON "StockLedger";
CREATE POLICY stock_ledger_isolation_policy ON "StockLedger"
    FOR ALL
    USING (
        "tenantId" = current_app_tenant() 
        AND ("branchId" = current_app_branch() OR current_app_branch() IS NULL)
    );

-- RLS Policy: Delivery Challan Branch Isolation
DROP POLICY IF EXISTS delivery_challan_isolation_policy ON "DeliveryChallan";
CREATE POLICY delivery_challan_isolation_policy ON "DeliveryChallan"
    FOR ALL
    USING (
        "tenantId" = current_app_tenant() 
        AND ("branchId" = current_app_branch() OR current_app_branch() IS NULL)
    );
```

---

## 4. Phase 3: High-Volume Table Partitioning Strategies

High-frequency telemetry (`LiveLocationLog`) and lifecycle event tracking (`SKULifecycleEvent`) will quickly exceed millions of rows. We execute standard PostgreSQL Declarative Range Partitioning by `createdAt`.

### 3.1 Range Partitioning for `LiveLocationLog`

```sql
-- Create Partitioned Table Shell
CREATE TABLE "LiveLocationLog_Partitioned" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "batteryLevel" INT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveLocationLog_Partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create Monthly Partitions for Year 2026
CREATE TABLE "LiveLocationLog_2026_09" PARTITION OF "LiveLocationLog_Partitioned"
    FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00');

CREATE TABLE "LiveLocationLog_2026_10" PARTITION OF "LiveLocationLog_Partitioned"
    FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2026-11-01 00:00:00');

-- Swap Tables (If LiveLocationLog already exists)
ALTER TABLE "LiveLocationLog" RENAME TO "LiveLocationLog_Old";
ALTER TABLE "LiveLocationLog_Partitioned" RENAME TO "LiveLocationLog";

-- Create Index on Partitioned Table
CREATE INDEX idx_livelocation_tenant_user_time ON "LiveLocationLog" ("tenantId", "userId", "createdAt" DESC);
```

### 3.2 Range Partitioning for `SKULifecycleEvent`

```sql
CREATE TABLE "SKULifecycleEvent_Partitioned" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "skuId" UUID NOT NULL,
    "serialNumberId" UUID,
    "stage" "SKULifecycleStage" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SKULifecycleEvent_Partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Quarterly Partition Example
CREATE TABLE "SKULifecycleEvent_2026_Q3" PARTITION OF "SKULifecycleEvent_Partitioned"
    FOR VALUES FROM ('2026-07-01 00:00:00') TO ('2026-10-01 00:00:00');

CREATE TABLE "SKULifecycleEvent_2026_Q4" PARTITION OF "SKULifecycleEvent_Partitioned"
    FOR VALUES FROM ('2026-10-01 00:00:00') TO ('2027-01-01 00:00:00');

ALTER TABLE "SKULifecycleEvent" RENAME TO "SKULifecycleEvent_Old";
ALTER TABLE "SKULifecycleEvent_Partitioned" RENAME TO "SKULifecycleEvent";
```

---

## 5. Phase 4: Application-Level PII Encryption & IDOR Protection

### 4.1 Encryption for `SalaryStructure` Data

To protect sensitive employee financial details (base salary, allowances, deductions), use AES-256-GCM field-level encryption before persisting to database JSON columns.

**Node.js / TypeScript Utility Module (`src/lib/crypto.ts`):**

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_SECRET_KEY!, 'hex'); // 32 bytes key

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptPII(plainText: string): EncryptedData {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptPII(encryptedData: EncryptedData): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encryptedData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 4.2 Payment Payload Sanitization Middleware

When persisting `PaymentGatewayTransaction.rawResponseJson`, sanitize token details to prevent credential leaks:

```typescript
export function sanitizePaymentPayload(payload: Record<string, any>): Record<string, any> {
  const sanitized = { ...payload };
  const sensitiveKeys = ['card_number', 'cvv', 'access_token', 'secret', 'authorization'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizePaymentPayload(sanitized[key]);
    }
  }
  return sanitized;
}
```

### 4.3 Secure S3 Document Access (IDOR Safeguard)

Never expose raw public S3 URLs for `Document` attachments or `DamageLossLine` evidence photos. Enforce pre-signed authorization checks via API routes:

```typescript
// src/services/document.service.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function getSecureDocumentUrl(
  documentId: string,
  requestingUser: { tenantId: string; branchId: string; role: string }
): Promise<string> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });

  if (!doc) throw new Error('Document not found');
  
  // IDOR & Multi-tenant check
  if (doc.tenantId !== requestingUser.tenantId) {
    throw new Error('Unauthorized access');
  }
  
  if (requestingUser.role !== 'SUPER_ADMIN' && doc.branchId && doc.branchId !== requestingUser.branchId) {
    throw new Error('Branch boundary violation');
  }

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: doc.s3Key,
  });

  // Expire link after 15 minutes
  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

---

## 6. Phase 5: Step-by-Step Execution Plan for Claude / Developers

Follow this sequence to apply all database changes cleanly:

1. **Step 1: Backup Database**
   ```bash
   pg_dump -U erp_user -d erp_production_db > backup_before_schema_remediation.sql
   ```

2. **Step 2: Update Prisma Schema**
   * Paste the updated models and enums from **Phase 1** into `prisma/schema.prisma`.
   * Format the schema:
     ```bash
     npx prisma format
     ```

3. **Step 3: Generate and Run Prisma Migration**
   ```bash
   npx prisma migrate dev --name add_missing_line_items_and_challan_system
   ```

4. **Step 4: Execute SQL Script for RLS and Partitioning**
   * Run the SQL statements from **Phase 2** and **Phase 3** against your target database using `psql` or your DB client:
     ```bash
     psql -U erp_user -d erp_production_db -f migration.sql
     ```

5. **Step 5: Apply Encryption Middleware & Service Updates**
   * Add `src/lib/crypto.ts` for PII field encryption.
   * Wrap financial writes (`SalaryStructure`) and payment logs with `encryptPII` and `sanitizePaymentPayload`.

6. **Step 6: Validate System Integrity**
   * Run test queries to ensure RLS session contexts (`app.current_tenant_id`, `app.current_branch_id`) return filtered data correctly.
   * Verify line-item insertion works when creating Invoices, Delivery Challans, and GRNs.