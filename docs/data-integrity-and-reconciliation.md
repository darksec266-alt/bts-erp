# DATA INTEGRITY AND RECONCILIATION GUIDELINE

## Database Integrity, Transaction Consistency, Accounting Reconciliation & Report Accuracy

**Target Application:** Brother's Technology System  
**Document Type:** Core Data Integrity / Reconciliation Guideline  
**Version:** 1.0  
**Date:** 2026-09-08  
**Priority:** CRITICAL  
**Audience:** AI Coding Agents, Backend Developers, Database Engineers, Frontend Developers, QA, Finance/ERP Team

---

# 1. PURPOSE

This document defines the rules required to keep the application's:

- Database
- Inventory
- SKU lifecycle
- Challan
- Challan Return
- Damage/Lost
- Product Custody
- Sales
- Purchase
- Project
- Service
- Employee Work
- Technician Work
- Customer Receivable
- Supplier Payable
- Advance
- Loan
- Payroll
- Accounting
- Reports

consistent and auditable.

The primary objective is:

> **One transaction → one authoritative source of truth → traceable downstream effects → reproducible reports.**

This document is a guardrail against:

- Duplicate transactions
- Double counting
- Incorrect stock
- Negative stock caused by logic bugs
- Incorrect challan quantities
- Incorrect return quantities
- Incorrect project profit
- Incorrect receivable/payable
- Incorrect employee performance
- Incorrect damage/lost valuation
- Accounting/report mismatch
- Historical data mutation
- Race-condition based duplicate posting
- Manual report-only calculations
- Untraceable numbers

---

# 2. SOURCE DOCUMENTS

Before implementing or modifying any integrity rule, the AI agent MUST read:

1. `agent.md`
2. `prd.md`
3. `architecture.md`
4. `database.md`
5. `feature-update.md`
6. `report-feature-update.md`
7. `employee-work-performance-feature-update.md`
8. Existing accounting/finance specifications
9. Existing inventory specifications
10. Existing implementation and migration history

If filenames differ, use the canonical repository equivalents.

### IMPORTANT

This document does not replace the existing PRD or Architecture.

Priority:

```text
Existing Business Requirements
        ↓
Existing Architecture
        ↓
Existing Database Design
        ↓
Feature Specifications
        ↓
This Integrity Guideline
        ↓
Implementation
```

If a conflict is discovered, the agent MUST stop and report the conflict rather than silently choosing a rule.

---

# 3. CORE PRINCIPLE

The application MUST maintain:

```text
ONE SOURCE OF TRUTH
```

and:

```text
MANY DERIVED VIEWS / REPORTS
```

Correct:

```text
Business Transaction
        ↓
Authoritative Domain Record
        ↓
Ledger / Lifecycle / Accounting
        ↓
Report Query
```

Incorrect:

```text
Business Transaction
        ↓
Copy into Report Table
        ↓
Separate Calculated Stock
        ↓
Separate Calculated Profit
        ↓
Report
```

Reports must not become a second database.

---

# 4. DATA INTEGRITY LEVELS

Integrity must be enforced at multiple levels.

```text
Level 1 → Database Constraints
Level 2 → Domain Validation
Level 3 → Transaction / Atomicity
Level 4 → Authorization
Level 5 → Approval Workflow
Level 6 → Ledger / Lifecycle
Level 7 → Reconciliation
Level 8 → Automated Tests
Level 9 → Audit Trail
```

Do not rely only on frontend validation.

---

# 5. DATABASE IS THE FINAL GUARD

Important rules must be enforced server-side and, where possible, at database level.

Examples:

- Foreign keys
- Unique constraints
- Composite uniqueness
- Not-null requirements
- Check constraints where supported
- Decimal precision
- Enum/status integrity
- Referential integrity

Frontend validation is supplementary only.

---

# 6. IMMUTABLE BUSINESS IDENTIFIERS

Business documents should use stable unique identifiers.

Examples:

```text
Customer ID
Supplier ID
Project ID
Sales Order ID
Invoice ID
Challan ID
Return ID
Purchase Order ID
GRN ID
Payment ID
Receipt ID
Expense ID
Employee Work ID
Damage ID
Lost ID
```

Human-readable document numbers must also follow existing numbering rules.

Never identify records only by display names.

---

# 7. UNIQUE DOCUMENT NUMBER RULE

Every official document number must be unique within its defined scope.

Examples:

```text
SO-000001
CH-000001
CR-000001
INV-000001
GRN-000001
PAY-000001
REC-000001
```

If numbering is branch-specific or organization-specific, uniqueness must follow the existing business rule.

Two concurrent users must never receive the same official number.

---

# 8. CONCURRENCY RULE

All critical state-changing operations must be atomic.

Examples:

```text
Stock Issue
Stock Return
Challan Creation
Challan Return
Damage Approval
Lost Approval
Payment Posting
Receipt Posting
Invoice Posting
Journal Posting
Advance Adjustment
Loan Repayment
```

Use database transactions and appropriate locking/atomic update strategies.

The system must prevent:

```text
User A reads stock = 10
User B reads stock = 10
User A issues 8
User B issues 8
Final stock = -6
```

when only 10 were available.

---

# 9. IDEMPOTENCY RULE

Critical commands must be protected against accidental retry.

Examples:

```text
Create Payment
Post Invoice
Post Journal
Issue Inventory
Return Inventory
Approve Damage
Approve Lost
```

If the same request is retried because of:

- network timeout
- browser refresh
- duplicate button click
- API retry
- worker retry

the system must not create a second financial or inventory effect.

Where appropriate, use an idempotency key/request identifier.

---

# 10. STATUS TRANSITION RULE

Status changes must follow valid state transitions.

Example:

```text
DRAFT
  ↓
SUBMITTED
  ↓
APPROVED
  ↓
POSTED
  ↓
COMPLETED
```

Invalid transitions must be rejected.

Examples:

```text
POSTED → DRAFT
COMPLETED → DRAFT
CANCELLED → POSTED
```

unless an explicit reversal workflow exists.

---

# 11. POSTED TRANSACTION IMMUTABILITY

Once a transaction has financial or inventory impact:

```text
POSTED
```

it must not be freely edited or deleted.

Correct:

```text
Original Transaction
        ↓
Correction / Adjustment / Reversal
        ↓
New Transaction
```

Incorrect:

```text
Original Transaction
        ↓
UPDATE amount = new amount
```

This is especially important for:

- Invoice
- Payment
- Receipt
- Journal
- Inventory transaction
- Challan
- Challan Return
- Damage
- Lost
- Purchase
- Sales

---

# 12. REVERSAL RULE

When a posted transaction needs correction, use the application's approved reversal/adjustment mechanism.

Example:

```text
Original Inventory OUT
        ↓
Reversal Inventory IN
```

Example:

```text
Original Journal
        ↓
Reversal Journal
        ↓
Correct Journal
```

Never silently delete the original posted transaction.

---

# 13. PERIOD LOCK RULE

Once an accounting period is closed/locked:

```text
POSTED TRANSACTIONS
```

inside that period must not be modified through ordinary workflows.

Corrections must follow the existing approved period-adjustment process.

Reports for closed periods must remain reproducible.

---

# 14. DECIMAL AND ROUNDING RULE

Financial amounts must use exact decimal/numeric types.

Do not use binary floating-point for financial storage.

Define:

```text
Currency Precision
Quantity Precision
Tax Precision
Unit Cost Precision
Percentage Precision
```

according to the existing database/accounting specification.

Rounding must happen according to one documented policy.

Do not round at arbitrary intermediate stages.

---

# 15. QUANTITY RULE

Inventory quantity must never be stored as ambiguous text.

Quantity must have a defined unit:

```text
PCS
BOX
METER
KG
LITER
etc.
```

Unit conversion must use an explicit conversion rule where applicable.

Do not silently compare quantities expressed in different units.

---

# 16. INVENTORY SOURCE OF TRUTH

The inventory system must use the existing inventory ledger/lifecycle model as the authoritative transaction history.

Conceptually:

```text
Purchase / GRN
      ↓
Inventory IN
      ↓
Stock
      ↓
Inventory OUT / Transfer / Return / Adjustment
      ↓
Inventory Balance
```

Reports must derive stock from the authoritative inventory source.

Do not create a second stock ledger for reporting.

---

# 17. INVENTORY MOVEMENT RULE

Every stock-changing event must create the appropriate inventory movement.

Examples:

```text
GRN
→ IN

Warehouse Issue
→ OUT

Challan
→ OUT according to business rule

Challan Return
→ IN

Warehouse Transfer
→ OUT from source
→ IN to destination

Approved Damage
→ Damage/Loss movement according to domain rule

Approved Lost
→ Loss movement according to domain rule

Stock Adjustment
→ Adjustment movement
```

The exact movement types must follow the existing schema.

---

# 18. STOCK BALANCE INVARIANT

For a warehouse/product scope:

```text
Closing Stock
=
Opening Stock
+ Valid IN
− Valid OUT
± Valid Adjustments
```

For serial-controlled products, the serial lifecycle must also reconcile with stock state.

---

# 19. NEGATIVE STOCK RULE

Negative stock must be rejected unless the existing business rules explicitly permit controlled negative stock.

Do not solve negative stock by:

```text
ABS(quantity)
```

or by silently changing quantities.

A stock shortage must be surfaced as a business error.

---

# 20. SERIAL NUMBER INTEGRITY

For serialized products:

```text
Serial Number
```

must not exist in two active physical locations/custodies simultaneously.

A serial must have a traceable lifecycle.

Example:

```text
Warehouse
 ↓
Technician
 ↓
Project/Site
 ↓
Installed
 ↓
Returned
 ↓
Warehouse
```

Every transition must be traceable.

---

# 21. BATCH INTEGRITY

For batch-controlled products:

```text
Batch
Product
Warehouse
Quantity
Expiry where applicable
```

must remain consistent.

A batch quantity cannot become negative through a valid transaction.

---

# 22. SKU LIFECYCLE INTEGRITY

Serialized/batch units should follow valid lifecycle transitions.

Conceptual lifecycle:

```text
PURCHASED
→ GRN
→ WAREHOUSE
→ RESERVED
→ ISSUED
→ DELIVERED
→ INSTALLED
→ RETURNED
→ WARRANTY
→ REPAIRED/REPLACED
→ DAMAGED
→ LOST
→ SCRAPPED
→ TRANSFERRED
```

Not every product must pass through every state.

The actual valid transitions must follow the existing domain specification.

---

# 23. PRODUCT CUSTODY INTEGRITY

ProductCustody must remain the source for employee/technician custody where already defined.

A product should not simultaneously be:

```text
Warehouse Custody
AND
Technician Custody
```

unless the domain explicitly supports a reserved/assigned state.

Custody handover must be traceable:

```text
From
To
Date
Reference
Reason
Approved By
```

---

# 24. SALES ORDER INTEGRITY

Sales Order quantities must be preserved as the original ordered quantity.

Do not overwrite:

```text
Ordered Qty
```

when delivery occurs.

Delivery must be represented separately.

---

# 25. CHALLAN QUANTITY INTEGRITY

For each Sales Order Line:

```text
Ordered Qty
```

is the baseline.

Multiple challans are allowed when supported:

```text
Order
 ├── Challan 1
 ├── Challan 2
 └── Challan 3
```

The system must aggregate valid challan quantities.

---

# 26. CHALLAN RETURN INTEGRITY

Returns must reference the relevant challan and/or line according to the existing schema.

A return cannot exceed the eligible delivered/challaned quantity.

Example:

```text
Challaned = 100
Returned = 30
Maximum additional valid return = 70
```

unless an explicit business adjustment is authorized.

---

# 27. ORDER / CHALLAN / RETURN RECONCILIATION

Mandatory formula:

```text
Total Challaned
=
SUM(valid challan quantities)

Total Returned
=
SUM(valid return quantities)

Net Delivered
=
Total Challaned − Total Returned

Remaining
=
Ordered − Net Delivered
```

Delivery percentage:

```text
Delivery %
=
Net Delivered / Ordered × 100
```

For zero ordered quantity, percentage must be handled safely according to report rules.

---

# 28. RETURN DOUBLE-COUNTING PREVENTION

The same return must never be counted twice.

The report layer must aggregate by authoritative return records.

Do not:

```text
count return from Challan
+
count same return from Inventory Return
```

as two separate returns.

One business return can create multiple technical records, but reporting must understand the relationship.

---

# 29. CHALLAN CANCELLATION RULE

Cancelled challans must not remain counted as valid delivery unless the business rule explicitly says otherwise.

If a posted challan must be cancelled:

```text
Challan
 ↓
Approved Cancellation/Reversal
 ↓
Inventory Reversal if applicable
```

The original document remains auditable.

---

# 30. DAMAGE EVENT VS INVENTORY EFFECT

Damage is a business event.

It must be separated conceptually from the inventory effect.

Correct:

```text
Damage Incident
      ↓
Approval / Disposition
      ↓
Inventory Effect
      ↓
Accounting Effect if applicable
```

Do not treat a user-entered damage record as automatically finalized inventory loss without the required approval.

---

# 31. LOST EVENT VS INVENTORY EFFECT

Lost is also an incident first.

```text
Lost Incident
      ↓
Investigation / Approval
      ↓
Inventory Loss
      ↓
Accounting Impact if applicable
```

The system must preserve:

```text
Reported By
Date
Location
Last Known Custody
Reason
Approval
Recovery Status
```

---

# 32. DAMAGE/LOST VALUATION

When financial loss is reported:

```text
Gross Loss
=
Affected Quantity × Applicable Cost Basis
```

Then:

```text
Net Loss
=
Gross Loss − Approved Recovery
```

The cost basis must follow the existing inventory/accounting valuation method.

Do not arbitrarily use:

```text
Selling Price
```

unless the business rule explicitly defines it.

---

# 33. DAMAGE/LOST LIABILITY RULE

Damage/lost reporting is not automatically equivalent to employee liability.

Separate:

```text
Physical Loss
Financial Loss
Employee Accountability
Payroll Deduction
Recovery
```

An employee deduction requires its own approved business process.

---

# 34. RECOVERY RULE

Recovered product/value must not be counted as a second asset.

Example:

```text
Lost Product
 ↓
Loss Recorded
 ↓
Recovered
 ↓
Recovery/Reinstatement Transaction
```

The system must preserve both the loss event and recovery history.

---

# 35. PROJECT DATA INTEGRITY

Project records must maintain relationships with:

```text
Customer
Sales Order
Challan
Invoice
Products
Technicians
Employees
Expenses
Service
Payments
```

Do not duplicate project identifiers manually across modules.

Use foreign keys/reference IDs.

---

# 36. PROJECT REVENUE

Project revenue must come from authoritative revenue transactions.

Do not manually type:

```text
projectRevenue
```

as a separate reporting value when invoices/approved revenue records exist.

---

# 37. PROJECT COST

Project costs must be traceable to:

```text
COGS
Expense
Technician Cost
Conveyance
Product Usage
Approved Extra Cost
Other Direct Cost
```

Only approved/eligible costs should enter the official P&L according to the existing business rules.

---

# 38. PROJECT PROFIT

Conceptually:

```text
Project Profit
=
Project Revenue
− Applicable Project Costs
```

Do not maintain a separate manually editable project profit field as the reporting source.

---

# 39. PROJECT P&L RECONCILIATION

For every project:

```text
Project Revenue
        ↓
Revenue Source Records

Project Cost
        ↓
Cost Source Records

Project Profit
        ↓
Revenue − Eligible Cost
```

The report must be drillable to source records.

---

# 40. CUSTOMER RECEIVABLE INTEGRITY

Conceptually:

```text
Closing Receivable
=
Opening Receivable
+ Valid Invoices
− Valid Payments
− Valid Credit/Adjustments
```

Customer advances must not be incorrectly treated as ordinary payment unless adjusted according to the business rule.

---

# 41. CUSTOMER ADVANCE INTEGRITY

Maintain:

```text
Advance Received
Advance Adjusted
Advance Refunded
Advance Outstanding
```

An advance cannot be simultaneously:

```text
Outstanding
AND
Fully Adjusted
```

---

# 42. SUPPLIER PAYABLE INTEGRITY

Conceptually:

```text
Closing Payable
=
Opening Payable
+ Valid Purchases
− Valid Payments
± Valid Adjustments
```

Supplier advances must follow the existing adjustment logic.

---

# 43. PAYMENT INTEGRITY

Every payment must have:

```text
Payment Reference
Date
Amount
Account
Customer/Supplier/Employee where applicable
Payment Method
Approval/Posting State
```

A payment must not reduce a balance twice.

---

# 44. RECEIPT INTEGRITY

Receipts must be tied to their authoritative customer/payment context.

Avoid duplicate:

```text
Receipt
+
Payment
```

being interpreted as two independent collections when they represent the same event.

---

# 45. JOURNAL INTEGRITY

Every posted journal must satisfy:

```text
Total Debit = Total Credit
```

No posted unbalanced journal may exist.

---

# 46. DOUBLE-ENTRY RULE

For every accounting transaction:

```text
Σ Debit
=
Σ Credit
```

This must be validated before posting.

---

# 47. ACCOUNTING SOURCE OF TRUTH

Financial statements must derive from the authoritative accounting ledger/journal model.

Do not calculate:

```text
P&L
Balance Sheet
Cash Flow
AR
AP
```

from random operational tables when the accounting ledger is the official source.

Operational reports may reconcile against accounting.

---

# 48. OPERATIONAL ↔ ACCOUNTING RECONCILIATION

The system should support reconciliation between:

```text
Operational Transaction
        ↕
Accounting Transaction
```

Examples:

```text
Invoice
↔ Revenue / AR Journal

Customer Payment
↔ Cash/Bank / AR Journal

Purchase
↔ Inventory / AP Journal

Inventory Cost
↔ COGS Journal

Expense
↔ Expense Journal
```

The exact account mapping must follow existing accounting configuration.

---

# 49. EMPLOYEE WORK INTEGRITY

Employee work records must have an authoritative work/activity record.

A work item should preserve:

```text
Employee
Assignment
Customer
Project
Task/Service
Start
End where available
Status
Completion
Supervisor
Customer Acceptance where applicable
```

Do not derive employee workload from unrelated activity logs.

---

# 50. EMPLOYEE PERFORMANCE CALCULATION

Performance metrics must define the denominator.

Example:

```text
Completion %
=
Completed Eligible Work
/
Eligible Assigned Work
× 100
```

If 20 assignments were cancelled:

```text
Assigned = 100
Cancelled = 20
Eligible = 80
Completed = 80

Completion = 100%
```

Do not treat cancelled assignments as incomplete work unless explicitly required.

---

# 51. ON-TIME CALCULATION

Conceptually:

```text
On-Time %
=
On-Time Eligible Completions
/
Eligible Completed Work With Due Date
× 100
```

If due date data is unavailable:

```text
N/A
```

Do not return a misleading 0%.

---

# 52. REWORK CALCULATION

Conceptually:

```text
Rework %
=
Eligible Rework Jobs
/
Eligible Completed Jobs
× 100
```

A rework event must have an authoritative relationship to the original work.

---

# 53. CUSTOMER ACCEPTANCE

Customer acceptance must come from the actual acceptance record/status.

Do not infer acceptance simply because:

```text
Status = COMPLETED
```

unless the existing business rule explicitly equates them.

---

# 54. EMPLOYEE ATTRIBUTION

If multiple employees work on one task:

```text
Primary
Assistant
Supervisor
```

must be represented through the existing assignment model.

Do not arbitrarily divide revenue/profit equally.

---

# 55. TECHNICIAN ATTRIBUTION

Technician performance should be derived from actual:

```text
Service Assignments
Project Assignments
Product Custody
Work Completion
Expense/Conveyance
```

Do not derive technician workload from login count or unrelated system activity.

---

# 56. EMPLOYEE / TECHNICIAN PRODUCT ACCOUNTABILITY

Use existing ProductCustody.

Reconciliation:

```text
Products Issued
− Products Returned
− Products Installed
− Other Valid Final States
=
Open Custody
```

The exact lifecycle rules must be applied per product type.

---

# 57. REPORT SOURCE-OF-TRUTH RULE

Every report must identify:

```text
Primary Source
Secondary Sources
Formula
Date Basis
Status Rules
Permission Scope
```

No report should rely on an unexplained aggregate.

---

# 58. REPORT CALCULATION RULE

Reports must calculate from authoritative records.

Correct:

```text
SUM(valid transactions)
```

Incorrect:

```text
SUM(previous report totals)
```

Do not calculate a report from another report unless the architecture explicitly defines that aggregation.

---

# 59. REPORT DATE RULE

Every report must define its date basis.

Examples:

```text
Invoice Report → Invoice Date
Payment Report → Payment Date
Challan Report → Challan Date
Return Report → Return Date
Damage Report → Damage Date
Lost Report → Lost Date
Employee Work → Activity/Completion Date
Purchase → PO/GRN/Purchase Date
```

Do not mix timestamps silently.

---

# 60. STATUS FILTER RULE

Reports must define which statuses are included.

Example:

```text
Draft → Excluded
Cancelled → Excluded
Posted → Included
Reversed → Excluded/handled by reversal logic
```

Exact rules vary by report.

The agent must document them.

---

# 61. VOID / CANCELLED / REVERSED DISTINCTION

These states must not be treated as identical.

```text
VOID
CANCELLED
REJECTED
REVERSED
POSTED
COMPLETED
```

The report logic must follow their actual meaning.

---

# 62. SOFT DELETE RULE

Business-critical financial/inventory records should not be physically deleted after posting.

Prefer:

```text
status
deletedAt
deletedBy
voidedAt
voidedBy
reversalReference
```

according to the existing schema.

Do not add fields blindly if an equivalent mechanism already exists.

---

# 63. AUDIT TRAIL

Critical changes must record:

```text
Who
When
What
Old Value
New Value
Reason
Reference
```

At minimum for:

- Financial records
- Inventory
- Challan
- Return
- Damage/Lost
- Employee assignments
- Approval
- Configuration affecting calculations

---

# 64. APPROVAL INTEGRITY

Approval must be:

```text
Role-authorized
Traceable
Non-ambiguous
```

A user must not approve their own restricted transaction if segregation-of-duties rules prohibit it.

---

# 65. SEPARATION OF DUTIES

Where required:

```text
Creator
Checker
Approver
Poster
```

should be distinguishable.

Do not automatically make every role able to approve everything.

Follow existing RBAC/approval rules.

---

# 66. MASTER DATA INTEGRITY

Important master data should use controlled references.

Examples:

```text
Customer
Supplier
Product
Warehouse
Employee
Technician
Account
Tax Rule
Project
```

Renaming a display field must not break historical references.

Use stable IDs.

---

# 67. HISTORICAL DATA RULE

Historical transactions must continue to show the correct historical context.

If a product name changes, historical records should remain linked to the same product identity.

Where historical snapshots are explicitly required by the existing architecture, preserve them.

---

# 68. REPORT SNAPSHOT RULE

Do not create report snapshots simply to solve calculation problems.

Use snapshots only where the existing business/accounting architecture explicitly requires period-close or immutable historical reporting.

---

# 69. TRANSACTION ATOMICITY

A transaction containing multiple related changes must succeed or fail as one unit.

Example:

```text
Approve Challan Return
   ↓
Create Return Record
   ↓
Inventory IN
   ↓
SKU State Update
   ↓
Accounting Effect if applicable
   ↓
Audit
```

If any required step fails, the transaction must not leave an inconsistent partial state.

---

# 70. ASYNCHRONOUS JOB RULE

If background jobs are used:

```text
Queued
→ Processing
→ Completed
```

must be idempotent.

A retry must not duplicate:

- Journal
- Stock movement
- Payment
- Notification
- Report total

---

# 71. EVENT / LEDGER DUPLICATION RULE

If the system uses events, queues or jobs, one domain event must not generate duplicate effects.

Every event handler should have a reliable uniqueness/idempotency strategy.

---

# 72. REPORT RECONCILIATION DASHBOARD

The application should provide an internal/admin reconciliation area where appropriate.

Examples:

```text
Inventory Reconciliation
Accounting Reconciliation
AR Reconciliation
AP Reconciliation
Challan Reconciliation
Project P&L Reconciliation
Employee Work Reconciliation
Damage/Lost Reconciliation
```

This is an operational control tool, not a normal end-user report.

---

# 73. INVENTORY RECONCILIATION

For each warehouse/product:

```text
Opening
+ IN
− OUT
± Adjustment
= Closing
```

For serial-controlled inventory:

```text
Physical/Logical Serial State
↔
Ledger State
```

Any mismatch should be flagged.

---

# 74. CHALLAN RECONCILIATION

For each order/product:

```text
Ordered
Challaned
Returned
Net Delivered
Remaining
```

Flag:

```text
Net Delivered > Ordered
Return > Challaned
Negative Remaining
Duplicate Return
Orphan Return
```

unless explicitly authorized by business rules.

---

# 75. CUSTOMER RECONCILIATION

For each customer:

```text
Opening Balance
+ Invoices
− Payments
− Credits/Adjustments
± Other Valid Entries
= Closing Balance
```

Compare operational/customer statement against accounting AR where applicable.

---

# 76. SUPPLIER RECONCILIATION

For each supplier:

```text
Opening Payable
+ Purchases
− Payments
± Adjustments
= Closing Payable
```

Compare supplier operational statement against accounting AP where applicable.

---

# 77. PROJECT RECONCILIATION

For each project:

```text
Revenue Source Total
↔
Project Revenue

Eligible Cost Source Total
↔
Project Cost

Revenue − Cost
↔
Project Profit
```

Any mismatch must be flagged.

---

# 78. EMPLOYEE RECONCILIATION

For each employee:

```text
Assigned
=
Eligible Assignment Records

Completed
=
Valid Completed Records

Pending
=
Eligible Non-Completed Records

Overdue
=
Valid Due-Date Breaches
```

Metrics must reconcile to actual records.

---

# 79. DAMAGE/LOST RECONCILIATION

For each incident:

```text
Incident
↔
Affected Product/SKU
↔
Custody/Warehouse
↔
Approval
↔
Inventory Effect
↔
Accounting Effect where applicable
```

No approved loss should be invisible to inventory reporting.

---

# 80. CROSS-MODULE RECONCILIATION

The following relationships must be testable:

```text
Sales Order
↔ Challan
↔ Return
↔ Invoice
↔ Payment
```

```text
Purchase Order
↔ GRN
↔ Purchase Invoice
↔ Payment
```

```text
Project
↔ Order
↔ Challan
↔ Product Usage
↔ Expense
↔ Invoice
↔ Profit
```

```text
Employee
↔ Assignment
↔ Work
↔ Product Custody
↔ Damage/Lost
```

```text
Inventory
↔ SKU Lifecycle
↔ Custody
↔ Challan/Return
↔ Damage/Lost
```

```text
Operations
↔ Accounting
```

---

# 81. ERROR REPORTING

Integrity failures must be explicit.

Examples:

```text
INTEGRITY_ERROR
STOCK_MISMATCH
CHALLAN_RETURN_EXCEEDED
DUPLICATE_TRANSACTION
ORPHAN_RETURN
UNBALANCED_JOURNAL
PROJECT_RECONCILIATION_FAILED
AR_RECONCILIATION_FAILED
AP_RECONCILIATION_FAILED
CUSTODY_MISMATCH
```

Do not silently repair data inside normal reports.

---

# 82. NO SILENT AUTO-CORRECTION

The system must not silently change:

```text
Quantity
Amount
Status
Employee
Warehouse
Project
Account
```

to make a report balance.

Instead:

```text
Detect
→ Flag
→ Investigate
→ Approve Correction
→ Correct through valid transaction
→ Audit
→ Reconcile
```

---

# 83. RECONCILIATION TEST SUITE

Automated tests MUST cover at least:

## Inventory

```text
Purchase → GRN → Stock
Stock → Issue → Stock
Transfer → Source/Destination
Return → Stock
Damage → Stock
Lost → Stock
```

## Challan

```text
Order → Challan
Order → Multiple Challans
Challan → Return
Multiple Returns
Partial Delivery
Full Delivery
```

## Finance

```text
Invoice → Journal
Payment → Journal
Purchase → Journal
Expense → Journal
```

## AR/AP

```text
Invoice → Outstanding
Payment → Outstanding Reduction
Advance → Adjustment
```

## Project

```text
Revenue + Cost → P&L
```

## Employee

```text
Assignment → Completion
Assignment → Reassignment
Completion → KPI
```

---

# 84. PROPERTY / INVARIANT TESTING

Where practical, tests should verify invariants.

Examples:

```text
Debit Total == Credit Total

Net Delivered == Challaned - Returned

Remaining == Ordered - Net Delivered

Closing Stock == Opening + IN - OUT ± Adjustment

Outstanding == Charges - Settlements ± Adjustments
```

The exact formula must follow the domain specification.

---

# 85. EDGE CASE TESTING

Mandatory edge cases:

```text
Zero quantity
Zero amount
Partial delivery
Multiple deliveries
Multiple returns
Full return
Repeated return attempt
Cancelled transaction
Reversed transaction
Concurrent issue
Concurrent payment
Duplicate API request
Network retry
Missing source data
Closed accounting period
Unauthorized approval
Reassigned employee
Damaged returned product
Lost then recovered product
Serial number conflict
Batch quantity conflict
```

---

# 86. DATA MIGRATION RULE

If existing data is migrated:

```text
Source Count
=
Migrated Count
```

must be verified.

For financial/inventory data:

```text
Source Balance
=
Migrated Balance
```

must reconcile.

Migration scripts must be repeat-safe or explicitly controlled.

---

# 87. BACKUP & RECOVERY

Production database must have an appropriate backup/recovery strategy.

Before major migrations:

```text
Backup
→ Migration
→ Validation
→ Reconciliation
```

Do not consider migration successful only because it ran without SQL errors.

---

# 88. OBSERVABILITY

Critical transaction failures should be observable through:

```text
Application Logs
Audit Logs
Error Tracking
Transaction References
```

Logs must not expose sensitive credentials.

---

# 89. SECURITY

Integrity also depends on authorization.

Every state-changing API must validate:

```text
Authentication
Authorization
Organization Scope
Branch Scope
Record Ownership/Access
Approval Permission
```

Do not rely on frontend restrictions.

---

# 90. REPORT ACCURACY STANDARD

A report is considered reliable only if:

```text
Source Data Exists
        +
Business Rules Are Defined
        +
Query Is Correct
        +
Statuses Are Correct
        +
Date Basis Is Correct
        +
Permissions Are Correct
        +
Reconciliation Passes
        +
Drill-down Works
```

---

# 91. 100% ACCURACY CLAIM

The system must NOT claim mathematically guaranteed “100% accuracy” merely because tests pass.

The correct engineering objective is:

> **Deterministic, traceable, reconciled and reproducible calculations from authoritative source data.**

If source data is wrong, the system cannot magically know the real-world truth.

Therefore:

```text
Correct System
≠
Automatically Correct Human Input
```

The application must instead prevent invalid states and make inconsistencies visible.

---

# 92. REPORT DATA QUALITY STATES

Reports may classify data as:

```text
VALID
RECONCILED
WARNING
MISMATCH
INCOMPLETE
N/A
```

Where appropriate.

This is better than silently showing misleading numbers.

---

# 93. SOURCE TRACEABILITY

Every major report row should be able to identify its source.

Example:

```text
Project Profit
 ↓
Project
 ↓
Revenue Records
 ↓
Cost Records
 ↓
Accounting Entries
```

Example:

```text
Warehouse Loss
 ↓
Damage/Lost Record
 ↓
SKU
 ↓
Custody
 ↓
Inventory Transaction
```

---

# 94. AI AGENT IMPLEMENTATION RULE

An AI agent MUST NOT modify database structure simply because it thinks a report would be easier to calculate.

Before schema changes:

```text
Inspect Existing Schema
        ↓
Check Existing Relations
        ↓
Check Existing Source of Truth
        ↓
Check Existing Ledger
        ↓
Check Existing Report Query
        ↓
Determine Whether Change Is Actually Necessary
```

Only then propose migration.

---

# 95. AI AGENT MUST IDENTIFY DUPLICATES

Before adding:

```text
field
table
model
service
endpoint
report
calculation
```

the agent must search the existing repository.

If equivalent functionality exists:

```text
EXTEND
```

instead of:

```text
DUPLICATE
```

---

# 96. AI AGENT DATABASE CHANGE PROTOCOL

Any proposed database change must include:

```text
Why needed
Existing model inspected
Existing field/relation inspected
Why existing structure is insufficient
Migration impact
Data migration impact
Rollback consideration
Report impact
Accounting impact
Inventory impact
Tests
```

---

# 97. AI AGENT REPORT IMPLEMENTATION PROTOCOL

Before creating a report:

```text
1. Identify authoritative source
2. Identify joins
3. Identify valid statuses
4. Identify date basis
5. Identify formulas
6. Identify permissions
7. Identify drill-down
8. Identify reconciliation
9. Check existing report
10. Implement
11. Test
12. Reconcile
```

---

# 98. AI AGENT HANDOFF

Every agent completing integrity/reconciliation work MUST write:

```text
INTEGRITY FEATURE:
Current Status:

RULES IMPLEMENTED:
- ...

DATABASE CONSTRAINTS:
- ...

TRANSACTION RULES:
- ...

LEDGER CHANGES:
- ...

ACCOUNTING CHANGES:
- ...

REPORT CHANGES:
- ...

RECONCILIATION CHECKS:
- ...

TESTS:
- ...

FILES CHANGED:
- ...

MIGRATIONS:
- ...

KNOWN ISSUES:
- ...

UNRESOLVED DATA ISSUES:
- ...

NEXT AGENT MUST START FROM:
- ...
```

The next agent must read this handoff before continuing.

---

# 99. ACCEPTANCE CRITERIA

This guideline is successfully implemented when:

- Critical database constraints are enforced.
- Duplicate official documents are prevented.
- Critical transactions are atomic.
- Critical operations are idempotent where necessary.
- Posted transactions are protected.
- Reversal/adjustment is used instead of silent mutation.
- Accounting periods can be protected according to existing rules.
- Inventory ledger is authoritative.
- SKU lifecycle is traceable.
- Product custody is traceable.
- Challan quantities reconcile.
- Challan returns reconcile.
- Multiple challans work.
- Multiple returns work.
- Damage/Lost events reconcile with inventory.
- Recovery does not double count.
- Project revenue reconciles.
- Project costs reconcile.
- Project P&L reconciles.
- Customer receivables reconcile.
- Supplier payables reconcile.
- Advances reconcile.
- Employee workload reconciles.
- Employee KPI formulas are deterministic.
- Technician accountability reconciles.
- Accounting journals balance.
- Operational data can reconcile against accounting.
- Reports are traceable to source records.
- No silent auto-correction exists.
- Reconciliation failures are visible.
- RBAC is enforced.
- Audit trail exists for critical changes.
- Automated tests cover critical invariants.
- AI agents cannot accidentally create duplicate sources of truth.

---

# 100. FINAL GOLDEN RULES

The implementation team and all AI agents MUST follow these rules:

### Rule 1

> **One source of truth.**

### Rule 2

> **Never fix a report by corrupting the source data.**

### Rule 3

> **Never hide an integrity mismatch.**

### Rule 4

> **Posted financial/inventory transactions are corrected through controlled reversal/adjustment, not silent deletion.**

### Rule 5

> **Every quantity change must be traceable.**

### Rule 6

> **Every financial amount must be traceable.**

### Rule 7

> **Every report KPI must have a documented formula and denominator.**

### Rule 8

> **Missing source data is N/A, not a fabricated zero.**

### Rule 9

> **Operational records and accounting records must reconcile.**

### Rule 10

> **Inventory records and physical/custody lifecycle must reconcile.**

### Rule 11

> **Challan, Return and Order quantities must reconcile.**

### Rule 12

> **Damage/Lost is an event; inventory/accounting impact follows approved workflow.**

### Rule 13

> **Employee accountability is not automatically payroll liability.**

### Rule 14

> **Do not duplicate existing models, ledgers, engines or reports.**

### Rule 15

> **Every important number must be explainable from source records.**

### Rule 16

> **Every AI agent must leave a handoff so the next agent continues from the current state.**

---

# 101. FINAL DATA FLOW

The target system should conceptually follow:

```text
                         MASTER DATA
                              │
       ┌──────────────────────┼──────────────────────┐
       ↓                      ↓                      ↓
     Customer              Product                Employee
       ↓                      ↓                      ↓
     Project               Warehouse             Technician
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              ↓
                     BUSINESS TRANSACTION
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ↓              ↓       ↓        ↓              ↓
     Sales         Purchase  Service  Work         Adjustment
       │              │       │        │              │
       ↓              ↓       ↓        ↓              ↓
    Challan          GRN   Assignment  Activity    Damage/Lost
       │              │       │        │              │
       ↓              ↓       ↓        ↓              ↓
    Return         Inventory Product  Employee     Approval
       │              │      Custody    KPI             │
       └──────────────┴────────┴────────┴──────────────┘
                              ↓
                      SOURCE OF TRUTH
                              │
                ┌─────────────┴─────────────┐
                ↓                           ↓
          Inventory Ledger            Accounting Ledger
                │                           │
                └─────────────┬─────────────┘
                              ↓
                       RECONCILIATION
                              ↓
                   REPORT / DASHBOARD
                              ↓
                       DRILL-DOWN
                              ↓
                    SOURCE TRANSACTION
```

The desired architecture is therefore:

```text
Transaction
   ↓
Validation
   ↓
Authorization
   ↓
Atomic Database Transaction
   ↓
Authoritative Ledger / Lifecycle
   ↓
Audit
   ↓
Reconciliation
   ↓
Reports
```

This is the required foundation for reliable, deterministic and auditable ERP calculations.
