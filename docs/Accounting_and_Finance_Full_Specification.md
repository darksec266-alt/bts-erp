# Accounting & Finance Module
## Brother's Technology System — Unified Business Management Platform

**Document Type:** Functional & Technical Specification
**Version:** 3.1 (Nginx Edge Layer Update)
**Date:** 06 September 2026
**Basis:** Product Requirements Document (PRD), Version 2.1 + `architecture.md`, Version 3.1 + `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` (cross-checked line-by-line against all three source documents)

---

## 0. Document Revision Note

### 0.1 v1.0 → v2.0

This version was rebuilt by reading `prd.md` and `architecture.md` in full and closing every gap found between them and the v1.0 Finance spec. Nothing from v1.0 was removed — every original section (1–60) is preserved as-is or expanded in place. What changed:

**Expanded in place (same section number, more depth):**
- §4.2 Chart of Accounts — added Accumulated Depreciation, split VAT Input/Output, added Employee Payable (Project Reconciliation) and Fixed Asset sub-accounts.
- §15 Technician Advance / §17 Service Project P&L — formalized the **interim vs. final** cost treatment (cross-referenced to new §59).
- §23 Payroll Accounting — rebuilt around the actual `SalaryStructure` / `PayrollRun` / `PayslipLine` / `AttendanceSalaryRule` model from `architecture.md` §7.17/§28, including the employee "My Salary" self-service view.
- §24 Bank Transaction Proof — mapped directly to the `BankTransactionProof` entity in `architecture.md` §7.18/§29, including `PAYSLIP_LINE` as a proof target.
- §41 Financial Data Model — added every finance-relevant entity from `architecture.md` §7 that v1.0 had missed.

**New sections added (renumbered §55–§60 → §61–§66 to make room; content of those six sections is otherwise unchanged):**
- **§55 Tax & VAT Accounting** — was entirely missing from v1.0 despite `TaxRate`/`TaxRecord` and Module 29 appearing in both source documents.
- **§56 Fixed Asset & Depreciation Accounting** — v1.0 had a `1900 Fixed Assets` account and a `7300 Depreciation` expense line with no supporting entity or posting logic.
- **§57 Multi-Tenant, Branch & Fiscal Period Foundations** — `architecture.md` §0 confirms a `tenantId`-bearing multi-tenant-capable architecture and BDT/Asia-Dhaka localization; v1.0's data model never carried `tenantId`, and no fiscal-year convention was ever stated.
- **§58 Project Advance–Conveyance Real-Time Reconciliation Engine** — the single largest gap: Module 64 / `architecture.md` §28 (`ProjectAdvanceConveyanceReconciliation`, real-time Socket.IO push, `SHORTFALL_DEDUCT` / `EXCESS_REIMBURSE`) was in the PRD and architecture doc but **absent from the Finance spec entirely**, even though it is the mechanism that ties Technician Advance (§15) to Payroll (§23) to Project P&L (§17).
- **§59 Two-Stage Project P&L — Interim vs. Final** — resolves an unstated ambiguity: `architecture.md` §11A prices project cost using "unreconciled TechnicianAdvance treated as cost," but never says what happens to that number once reconciliation (§58) reveals the *actual* approved spend. Left unresolved, a project's profit figure would never match its own closing numbers.
- **§60 100% Profit & Loss Coverage Matrix** — directly answers the "100% P&L visibility" goal stated in the PRD Executive Summary and Goals (§2/§4) by tracing every one of the 65 modules to the exact ledger/report line it feeds, so no money-moving event in the platform can silently miss the books.

Everything else in this document — including the original §1–§54 numbering — is untouched from v1.0 except where a gap-fill note above says otherwise.

### 0.2 v2.0 → v3.0 (This Revision)

This revision cross-checks v2.0 of this document against a third source — `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, a generic double-entry ERP cross-check/upgrade checklist — plus four explicit, separately-raised requirements. Nothing from v2.0 was removed; §1–§60 and the former §61–§66 are preserved as-is and are **renumbered to §71–§76** to make room for ten new sections. No content changed meaning as a result of renumbering — only section numbers moved; every cross-reference to §61–§66 elsewhere in this document already pointed at *other*, unmoved sections, so nothing needed correcting.

**New sections added (§61–§70):**

- **§61 Voucher Management Layer** — the cross-check document's entire Voucher module (§6: Journal/Payment/Receipt/Contra/Sales/Purchase/Sales Return/Purchase Return/Expense/Adjustment/Opening/Transfer vouchers) was absent from v2.0, which only specified the underlying `JournalEntry`/`JournalLine` pair. This section adds the user-facing voucher layer that generates those journals.
- **§62 Day Book, Cash Book, Bank Book & Receipt-Payment Statement** — these four named reports (cross-check §7–§10) didn't exist as explicit reports in v2.0; Cash & Bank Management (§25) covered related ground but not as dedicated, exportable reports, and cheque lifecycle tracking (issued → cleared/bounced/cancelled) was never modeled.
- **§63 Suspense Account Management** — entirely missing from v2.0 (cross-check §25); added as a full mini-workflow with its own COA accounts.
- **§64 Year-End Closing & Retained Earnings** — v2.0's Period Closing (§36) covered locking periods but never described the actual year-end closing journal that zeroes Revenue/Expense into Retained Earnings (cross-check §29).
- **§65 Enhanced Chart of Accounts — Hierarchy, Control Accounts & Cost Center Mapping** — closes a real internal inconsistency: `ui.md` §8 already assumed a 5-root COA tree (Assets/Liabilities/Equity/Income/Expenses), while this spec's §4.1 defined 8 flat `AccountType` values with no stated hierarchy. This section reconciles the two and adds control-account flagging, Suspense placement, and the non-current-asset categories (Investments, Tender, Pre-Production Expenses) the cross-check document lists that v2.0 never mentioned.
- **§66 Universal Print & Letterhead Toggle Engine** — directly answers two explicitly raised requirements: (1) every report/invoice/challan/quotation/technician conveyance bill and every other document needs a **Print** option, not just the existing 4-format Export; (2) any print/export of an outbound document must **ask whether to include the company letterhead header/footer**, rather than assuming it's always on.
- **§67 Data Edit & Delete Governance — Super Admin Approval Workflow** — directly answers the explicitly raised requirement that **all data be editable/deletable only with Super Admin approval**. Generalizes v2.0's "no hard delete on posted financial entries" (§3.2) into a platform-wide governance rule.
- **§68 Universal Report & Dashboard Drill-Down Standard** — directly answers the explicitly raised requirement that reporting be available **point/topic/module-wise in a detailed view** — every summary figure must be clickable through to its source transactions.
- **§69 Quotation-to-Cash Document Suite — Full Specification** — directly answers the explicitly raised requirement that **Quotation creation** be a complete, standalone capability of this application, not just an arrow in a workflow diagram.
- **§70 Cross-Check Alignment Matrix** — maps every numbered section of the cross-check document to exactly where it is now addressed (or explicitly flagged as an open question for a module not yet confirmed in scope, e.g. Sales Commission), mirroring the traceability discipline already established by §60's 65-module P&L coverage matrix.

**Also touched (existing sections extended in place, not renumbered):** §37 (Financial Reports — four new report subsections), §41 (Financial Data Model — new entities), §49 (Export — Print added alongside the four formats, plus new reports).

### 0.3 v3.0 → v3.1 (This Revision)

`architecture.md` was updated to v3.1, adding **Nginx** as the mandatory production Edge / Reverse Proxy / TLS layer (its new §38, based on the companion `architecture_nginx.md`). This is an infrastructure-layer addition in front of the application, not an accounting-logic change, so it touches only **§51 Audit & Security** in this document — clarifying that rate limiting and IP allow-listing are enforced in layers (Nginx first, application second). No Chart of Accounts, posting rule, voucher, report, or workflow in this specification changes as a result.

---

## 1. Purpose

The Accounting & Finance module is the financial control center of Brother's Technology System. Its purpose is to capture, classify, approve, reconcile, and report every material business transaction so that management can determine:

- Revenue
- Cost of Goods Sold (COGS)
- Gross Profit
- Operating Expenses
- Operating Profit
- Other Income/Expense
- Net Profit
- Cash and Bank Position
- Accounts Receivable
- Accounts Payable
- Customer Advances
- Technician Advances
- Employee Loans/Advances
- Company Loans
- Company Investments
- Project Profit & Loss
- Department/Head-wise Profit & Loss
- Outstanding and unreconciled balances

The system must maintain one financial source of truth. Stock, sales, purchases, service operations, technician advances/expenses, loans, investments, payroll and other money-related activities must ultimately be represented in the accounting ledger.

> **Important:** This document expands the finance requirements into an implementation-ready functional design. Where the PRD does not prescribe an exact debit/credit mapping, the mapping below should be treated as an implementation proposal and finalized against the project's accounting architecture before development.

---

# 2. Core Financial Principles

## 2.1 Single Source of Truth

All modules must use the same accounting data model.

```text
Sales
Purchase
Inventory
Service
Technician
Payroll
Customer Advance
Supplier Payment
Employee Loan
Company Loan
Investment
Expenses
        |
        v
Accounting Ledger
        |
        +--> Trial Balance
        +--> General Ledger
        +--> P&L
        +--> Balance Sheet
        +--> Cash Flow
        +--> Project P&L
        +--> Department P&L
        +--> Head-wise P&L
```

## 2.2 No Direct Profit Manipulation

Users must not be able to directly edit:

- Net Profit
- Gross Profit
- COGS
- Account balances
- Ledger balances
- Closing balances

These values must be calculated from approved transactions and journal entries.

## 2.3 Every Financial Transaction Must Have Context

Where applicable, a transaction should carry:

- Company
- Branch
- Department
- Head / Cost Head
- Project / Service Assignment
- Customer
- Supplier
- Employee
- Technician
- Payment account
- Transaction date
- Reference document
- Approval status
- Supporting proof

This allows the system to calculate company-wide, branch-wise, department-wise, head-wise and project-wise profitability.

---

# 3. Accounting Architecture

## 3.1 Financial Flow

```text
Business Transaction
        |
        v
Source Document
        |
        v
Validation
        |
        v
Approval (if required)
        |
        v
Journal Entry
        |
        v
Journal Lines
        |
        v
General Ledger
        |
        +--> Trial Balance
        +--> P&L
        +--> Balance Sheet
        +--> Cash Flow
        +--> Receivable/Payable
        +--> Project P&L
        +--> Department P&L
```

## 3.2 Immutable Financial History

Posted financial entries must not be hard-deleted.

Corrections should use:

- Reversal
- Adjustment journal
- Credit note
- Debit note
- Return transaction
- Corrective transaction

This follows the PRD principle that financial, inventory, loan and advance records should not be hard-deleted.

---

# 4. Chart of Accounts (COA)

The Chart of Accounts is the foundation of accounting.

## 4.1 Account Types

The system should support at least:

```text
ASSET
LIABILITY
EQUITY
REVENUE
COST_OF_GOODS_SOLD
EXPENSE
OTHER_INCOME
OTHER_EXPENSE
```

## 4.2 Suggested Account Groups

### Assets

```text
1000 Cash & Cash Equivalents
1100 Bank Accounts
1200 Accounts Receivable
1300 Customer Advances Receivable/Control
1400 Inventory
1500 Employee Loan Receivable
1600 Employee Advance Receivable
1700 Technician Advance Receivable/Control
1800 Other Receivables
1900 Fixed Assets
1910 Accumulated Depreciation (contra-asset)
1950 VAT Receivable / Input VAT
```

### Liabilities

```text
2000 Accounts Payable
2100 Customer Advance / Contract Liability
2200 Employee Payable
2210 Employee Payable — Project Advance/Conveyance Reconciliation (EXCESS_REIMBURSE, Section 58)
2300 Salary Payable
2400 VAT Payable / Output VAT
2450 Other Tax Payable
2500 Company Loan Payable
2600 Other Payables
```

### Equity

```text
3000 Owner Capital
3100 Retained Earnings
3200 Current Year Profit/Loss
3300 Owner Drawings
```

### Revenue

```text
4000 Product Sales
4100 Installation Revenue
4200 Service Revenue
4300 AMC Revenue
4400 Repair Revenue
4500 Other Operating Revenue
```

### COGS

```text
5000 Product COGS
5100 Service Material Cost
5200 Warranty Replacement Cost
5300 Other Direct Cost
```

### Operating Expenses

```text
6000 Salary Expense
6100 Technician/Field Expense
6200 Conveyance Expense
6300 Transport Expense
6400 Rent
6500 Electricity
6600 Internet/Communication
6700 Marketing
6800 Office Expense
6900 Repair & Maintenance
7000 Bank Charges
7100 Software/Subscription
7200 Legal/Professional
7300 Depreciation
7400 Miscellaneous
```

### Other Income / Expense

```text
8000 Other Income
8100 Interest Income
8200 Other Expense
8300 Interest/Finance Cost
```

The exact COA hierarchy, numbering and account names should be finalized by the finance/accounting design.

---

# 5. Double-Entry Accounting Engine

The system should use double-entry accounting.

Every posted journal must satisfy:

```text
TOTAL DEBIT = TOTAL CREDIT
```

## 5.1 Journal Structure

### Journal Entry

```text
id
journalNumber
date
sourceModule
sourceType
sourceId
description
branchId
departmentId
projectId
status
createdBy
approvedBy
postedAt
```

### Journal Line

```text
id
journalEntryId
accountId
debit
credit
customerId
supplierId
employeeId
technicianId
branchId
departmentId
headId
projectId
reference
```

---

# 6. Revenue Accounting

Revenue should originate from sales/service documents rather than manual profit entries.

## 6.1 Sales Invoice

Conceptual flow:

```text
Sales Invoice
    |
    +--> Revenue
    +--> Customer Receivable
    +--> Tax/VAT (if applicable)
```

If payment is not received immediately:

```text
Accounts Receivable increases
Revenue increases
```

When payment is received:

```text
Cash/Bank increases
Accounts Receivable decreases
```

## 6.2 Sales Return

Sales return should reverse the applicable revenue and receivable/cash effect and restore inventory where the returned product is accepted back into stock.

---

# 7. Inventory and COGS

Inventory must be treated as an asset until the relevant product/material cost is recognized as COGS or another applicable direct cost.

## 7.1 Purchase

A purchase/GRN normally creates inventory rather than immediately becoming operating expense.

```text
Purchase / GRN
       |
       v
Inventory Asset
```

When the supplier invoice is recognized:

```text
Inventory / Purchase-related account
        |
        v
Accounts Payable
```

The exact posting point must match the finalized inventory/accounting architecture.

## 7.2 Sale / Issue

When inventory is sold or consumed:

```text
Inventory decreases
COGS increases
```

This creates the link:

```text
Purchase Cost
      |
      v
Inventory
      |
      v
COGS
      |
      v
Gross Profit
```

The PRD requires FIFO/moving-average costing and SKU lifecycle tracking.

---

# 8. Gross Profit

The basic gross-profit calculation is:

```text
Gross Profit = Revenue - COGS
```

Example:

```text
Revenue        ৳500,000
COGS           ৳280,000
-----------------------
Gross Profit   ৳220,000
Gross Margin   44.00%
```

The system should calculate:

- Total revenue
- Total COGS
- Gross profit
- Gross margin %
- Product-wise gross margin
- Customer-wise gross margin
- Branch-wise gross margin
- Project-wise gross margin
- Department-wise gross margin

---

# 9. Operating Expenses

Operating expenses must be classified correctly and linked to the relevant organizational dimension.

Example:

```text
Salary
Rent
Electricity
Internet
Marketing
Transport
Technician expense
Conveyance
Office supplies
Bank charges
Software
Legal/professional fees
Maintenance
Depreciation
```

Every expense should have:

```text
Expense Category
Amount
Date
Payment Method
Branch
Department
Head
Project (if applicable)
Employee (if applicable)
Supporting Document
Approval
```

---

# 10. Net Profit

The management-level P&L should follow:

```text
Revenue
- COGS
= Gross Profit

- Operating Expenses
= Operating Profit

+ Other Income
- Other Expense
= Net Profit
```

Example:

```text
Revenue                    ৳25,000,000
COGS                       ৳14,000,000
--------------------------------------
Gross Profit               ৳11,000,000

Operating Expenses          ৳7,000,000
--------------------------------------
Operating Profit             ৳4,000,000

Other Income                   ৳100,000
Other Expense                  ৳200,000
--------------------------------------
NET PROFIT                   ৳3,900,000
```

Net margin:

```text
Net Margin = Net Profit / Revenue × 100
```

---

# 11. Accounts Receivable (Customer Due)

The system must track customer receivables.

## 11.1 Customer Ledger

```text
Invoice
+ Debit Note
- Payment
- Credit Note
- Advance Adjustment
= Outstanding
```

The customer account should show:

- Opening balance
- Invoice
- Payment
- Credit note
- Debit note
- Advance received
- Advance adjusted
- Closing balance

## 11.2 Aging

Support:

```text
Current
1–30 days
31–60 days
61–90 days
91–180 days
180+ days
```

Dashboard:

```text
Total Receivable
Overdue Receivable
Due Today
Due This Week
Due This Month
High-risk Customers
```

---

# 12. Customer Advance

Customer advance is a separate financial flow.

```text
Customer
   |
   v
Advance Received
   |
   v
Customer Advance Balance
   |
   v
Final Invoice
   |
   v
Advance Adjustment
   |
   v
Remaining Due
```

Example:

```text
Advance Received      ৳300,000
Invoice               ৳500,000
Advance Adjusted      ৳300,000
Remaining Due         ৳200,000
```

The system must separately report:

```text
Total Advance Received
Total Advance Adjusted
Advance Refund
Unadjusted Advance
```

Customer advance must not automatically be treated as sales revenue merely because cash was received.

---

# 13. Accounts Payable

Supplier payable flow:

```text
Purchase
   |
   v
Supplier Invoice
   |
   v
Accounts Payable
   |
   v
Supplier Payment
   |
   v
Outstanding Payable
```

Supplier statement should show:

```text
Opening Payable
+ Purchases
+ Debit Notes
- Payments
- Credit Notes
= Closing Payable
```

Aging should be available by supplier.

---

# 14. Supplier Payment

Supplier payment should support:

- Cash
- Bank
- Cheque
- Other supported payment methods

For bank/cheque settlement, the PRD requires transaction proof before the transaction is marked complete.

Required proof fields:

```text
Bank
Account Name
Masked Last 4 Digits
Cheque Number (optional)
Transaction Date
Proof Image
```

The system should provide:

```text
Missing Bank Proof
Complete Bank Proof
Bank Transaction Register
```

---

# 15. Technician Advance

Technician advance is a controlled receivable/advance process.

Flow:

```text
Project
   |
   v
Advance Request
   |
   v
Approval
   |
   v
Payment
   |
   v
Technician Advance
   |
   +--> Actual Expense
   +--> Conveyance
   +--> Returned Cash
   |
   v
Reconciliation
```

Example:

```text
Advance                  ৳20,000
Actual Approved Expense  ৳14,000
Returned                 ৳6,000
Outstanding               ৳0
```

The system must not permanently classify the full advance as project expense before reconciliation.

> **Gap-fill note (v2.0):** "Reconciliation" here is not a manual bookkeeping step — it is the automated `ProjectAdvanceConveyanceReconciliation` engine specified in **Section 58**, which fires the moment a technician's conveyance bills and closure report are approved. Until that engine runs, the advance is carried as an **interim** project cost; afterward, it is replaced by the **final**, actual approved-spend figure. See **Section 59 (Two-Stage Project P&L)** for exactly how the numbers move between the two states without ever double-counting or under-counting.

---

# 16. Technician Expense & Conveyance

Technician expenses should be attached to the relevant service assignment/project whenever applicable.

Each claim should support:

```text
Project
Technician
Date
Expense Type
Amount
Receipt
GPS/Visit reference (where applicable)
Approval
Status
```

Possible states:

```text
Draft
Submitted
Approved
Rejected
Paid
Reconciled
```

Conveyance should be separately reportable.

---

# 17. Service Project P&L

A ServiceAssignment is treated as a project.

## 17.1 Project Revenue

Revenue may come from:

```text
Product Sale
Installation
Service
Repair
AMC
Other approved revenue
```

## 17.2 Project Direct Cost

```text
Product COGS
Service Material
Technician Cost
Conveyance
Transport
Extra Products
Warranty Cost
Other Approved Direct Cost
```

## 17.3 Project Profit

```text
Project Revenue
- Product/Material COGS
- Technician Cost
- Conveyance
- Other Direct Cost
= Project Gross/Contribution Profit
```

If company overhead allocation is implemented, the system may additionally calculate a fully allocated project profit.

The PRD explicitly requires project P&L and technician/service cost tracking.

> **Gap-fill note (v2.0):** "Technician Cost" in this formula is **not a single static number** — it is `INTERIM` (based on the advance issued) until the project closes, and `FINAL` (based on actual approved spend) once **Section 58**'s reconciliation engine runs. A project's displayed profit must always show which state it is in. See **Section 59** for the full two-stage calculation and the exact journal entries that move a project from interim to final profit without any leakage.

---

# 18. Project Cost Overrun Control

Each project should support:

```text
Estimated Revenue
Estimated Cost
Estimated Profit

Actual Revenue
Actual Cost
Current Profit
```

Variance:

```text
Cost Variance
Revenue Variance
Profit Variance
Margin Variance
```

Example:

```text
Estimated Cost     ৳300,000
Actual Cost        ৳340,000
Overrun             ৳40,000
```

Trigger:

```text
IF Actual Cost > Approved Budget
THEN Approval / Alert
```

This should feed the Profit Leakage Dashboard.

---

# 19. Employee Loan

Employee loan is not an operating expense at disbursement.

Flow:

```text
Loan Request
   |
   v
Approval
   |
   v
Disbursement
   |
   v
Employee Loan Receivable
   |
   v
Payroll Deduction / Repayment
```

Track:

```text
Original Principal
Interest Rate
Interest Amount
Installment
Paid
Outstanding
Next Due Date
```

The PRD specifies employee loans as interest-bearing and supports payroll deductions.

---

# 20. Employee Advance

Employee advance should be tracked separately from employee loan.

```text
Advance Issued
      |
      v
Adjustment / Settlement
      |
      +--> Expense reimbursement
      +--> Salary deduction
      +--> Cash return
```

Outstanding employee advances must be visible in Finance and HR dashboards.

---

# 21. Company Loan

Company loan is a financing transaction, not operating revenue.

Flow:

```text
Loan Received
      |
      v
Cash/Bank Increase
      |
      v
Loan Liability
```

Repayment:

```text
Loan Liability decreases
Cash/Bank decreases
```

If interest applies:

```text
Interest Expense
```

must be separately recognized.

**Resolved (Phase 0, confirmed with Brother's Technology System):** company loans are **not** uniformly interest-free or uniformly interest-bearing — either can occur, decided per loan. `CompanyLoan` therefore carries its own `interestRate` field (nullable/zero = interest-free for that specific loan); there is no single company-wide policy to enforce, and the accounting model (Section 4, journal posting above) must branch on each loan's own rate rather than assuming one treatment platform-wide.

---

# 22. Company Investment

Investment should be separated from revenue.

Example:

```text
Investment Received
      |
      +--> Cash/Bank
      +--> Equity/Investment-related account
```

Withdrawal must be tracked separately.

The system should support:

```text
Investment Source
Investment Date
Amount
Withdrawal
Current Balance
Return / Income if applicable
```

The PRD specifies flexible investment calculation/withdrawal behavior.

---

# 23. Payroll Accounting

> **Gap-fill note (v2.0):** This section is rebuilt around the actual entities defined in `architecture.md` §7.17/§28 (Module 64, "added after initial requirements gathering"). v1.0 described payroll only as a generic flow; it did not model `SalaryStructure`, `PayrollRun`, `PayslipLine`, or `AttendanceSalaryRule`, and it did not mention that every employee — not just Technicians — gets a personal, real-time **"My Salary"** panel.

Payroll must integrate with Finance, and must never maintain its own disconnected copy of a balance (loan, advance, or project reconciliation) that Finance already owns.

## 23.1 Salary Structure

Each employee has an effective-dated `SalaryStructure`: basic salary + allowances (transport, food, etc.), with an `effectiveFrom`/`effectiveTo` range so a raise or promotion never overwrites history — every past payslip must remain reproducible exactly as it was calculated at the time.

## 23.2 Payroll Run & Payslip Line

Payroll is run per branch/month as a `PayrollRun` (states: `DRAFT → PROCESSING → FINALIZED → PAID`). Each employee in that run gets exactly one `PayslipLine`, computed — never manually re-typed — from:

```text
Basic Salary
+ Allowances Total
= Gross Salary

- Attendance Deduction         (from AttendanceSalaryRule, Section 23.3)
- Employee Loan Deduction      (from EmployeeLoanInstallment, Section 19)
- Other Dues Deduction         (any other approved payable against the employee)
± Project Advance/Conveyance Net (from Section 58 — positive = reimbursement owed, negative = shortfall deducted)
= Net Payable
```

Admin/HR can review and adjust a `PayslipLine` before finalizing a run, but any adjustment must be logged with a reason (Section 35, Audit Trail) — nothing is silently re-typed over the computed figure.

## 23.3 Attendance-Based Deduction

An `AttendanceSalaryRule` (per branch, effective-dated) defines the absent-deduction-per-day and any late-deduction-per-occurrence. This rule is applied against `Attendance` records to produce each `PayslipLine`'s `attendanceDeduction` — attendance/leave management is explicitly in scope per the PRD (Section 8.9).

## 23.4 Employee Self-Service — "My Salary"

Every internal employee — Technician, Sales Executive, Warehouse Staff, Branch Manager, Accounts, HR, Admin, and Super Admin alike — gets a personal **"My Salary"** panel on their own dashboard/mobile home screen, row-level scoped to `WHERE employeeId = currentUser.id` (Design Principle, Section 2 of the architecture). It shows:

```text
Total salary earned + full month-by-month payslip history
Running/current month's live-computed expected salary
   (already reflecting attendance to date, current loan installment,
    other approved dues, and any pending project advance/conveyance item)
Itemized breakdown:
   - Loan/advance deduction
   - Other-dues deduction
   - Project advance/conveyance adjustment (credit or debit)
```

The employee's panel and the Admin/Accounts payroll dashboard must always show **the exact same figures** — never a separately maintained employee-facing number. This is enforced by both surfaces reading the same `PayslipLine` and the same live `ProjectAdvanceConveyanceReconciliation` rows (Section 58), not two independent calculations.

## 23.5 Project Advance–Conveyance Net

Every pending `ProjectAdvanceConveyanceReconciliation` for an employee (Section 58) is pulled into their next `PayrollRun` as `projectAdvanceConveyanceNet` on the `PayslipLine`, then stamped `appliedToPayrollRunId` so it can never be pulled into a second run and double-counted. Until it is applied, it is visible in real time on both the Admin dashboard and the employee's "My Salary" panel (Section 23.4) as a **pending** item — not yet part of any finalized `PayslipLine`.

## 23.6 Payroll Journal Posting

Each finalized `PayrollRun` auto-posts one journal entry per branch/period:

```text
Salary Expense (COA 6000)         Dr   Gross Salary total
   Employee Loan Receivable (1500)      Cr   Loan deduction total
   Employee Payable — Reconciliation (2210)  Dr/Cr  Net project advance/conveyance total
   Salary Payable (2300) / Cash (1000) / Bank (1100)  Cr   Net Payable total
```

The loan, advance, and other-dues deduction lines post against their own existing ledgers exactly as Sections 19–20 already describe — payroll never creates a second, disconnected balance for money that is already tracked elsewhere.

## 23.7 Payment Method & Bank Proof

Salary can be paid CASH, BANK, or MOBILE_BANKING. When BANK is chosen, a `BankTransactionProof` (Section 24) is **required** before the `PayslipLine` can be marked PAID — gated the same way every other bank/cheque transaction is gated (Section 44, Control 7).

## 23.8 Payroll Reports

- Payroll Register (per run)
- Attendance Deduction report
- Project Advance–Conveyance Reconciliation report (pending vs. applied, by technician/branch — Section 58)
- Per-employee Salary History

All exportable in the four standard formats (Section 49) and searchable/filterable (Section 50).

---

# 24. Bank Transaction Proof

Every bank/cheque-settled transaction must have proof before it can be considered completed.

> **Gap-fill note (v2.0):** v1.0 listed "Payroll" as an applicable module but never named the specific record it attaches to. `architecture.md` §7.18/§29 (Module 65, also added after initial requirements gathering) makes clear the proof attaches per-transaction via a polymorphic `refTable`/`refId` pair — mapped below one-to-one.

## 24.1 Entity Mapping

```text
BankTransactionProof
  refTable            SUPPLIER_PAYMENT | CUSTOMER_PAYMENT | PAYSLIP_LINE |
                       LOAN_REPAYMENT | INVESTMENT | CUSTOMER_ADVANCE |
                       COMPANY_LOAN_DISBURSEMENT
  refId               id of the specific record above
  bankName
  accountName
  accountNumberMasked   last 4 digits only — full account numbers are never stored (Section 51)
  chequeNumber          optional
  transactionDate
  attachmentFileId      cheque/checkbook photo or bank deposit/transfer slip image
  uploadedById
  uploadedAt
```

`PAYSLIP_LINE` is the mapping that ties this section directly to Payroll (Section 23.7) — a salary paid by BANK cannot be marked PAID until its `PayslipLine.bankProofId` points to a completed `BankTransactionProof` row.

## 24.2 Where It Applies

```text
Customer Payment
Supplier Payment
Payroll (PayslipLine)
Employee Loan
Company Loan
Investment
Customer Advance
Other Bank Transactions
```

One shared **"Attach Bank Proof"** UI control appears on every one of these transaction screens — implemented once, not rebuilt per module, the same pattern used for the Export ▾ control (Section 49) and the Search/Filter bar (Section 50).

## 24.3 Required Fields (as captured)

```text
Bank
Account Name
Masked Last 4
Cheque No.
Transaction Date
Image / Attachment
```

## 24.4 Finance Filter

```text
All
Proof Complete
Proof Missing
```

The proof image must remain retrievable from both the source transaction record and the finance audit trail (Section 51) at any time, and directly feeds the future Bank & Cash Reconciliation module (Section 25) once built.

---

# 25. Cash & Bank Management

The system should maintain separate accounts for:

```text
Cash
Bank Account 1
Bank Account 2
Mobile Banking Account
Other Approved Accounts
```

Each account should show:

```text
Opening Balance
Receipts
Payments
Transfers
Adjustments
Closing Balance
```

## Bank Reconciliation

A future/advanced bank-reconciliation module may compare:

```text
System Ledger
vs
Bank Statement
```

and identify:

```text
Matched
Unmatched
Missing
Duplicate
Pending
```

---

# 26. Cash Flow

Cash flow must remain separate from P&L.

## Operating Cash Inflows

```text
Customer Collection
Customer Advance
Service Collection
Other Operating Receipts
```

## Operating Cash Outflows

```text
Supplier Payment
Salary
Technician Payment
Conveyance
Operating Expenses
Taxes
```

## Investing Cash Flow

```text
Asset Purchase
Investment
Investment Withdrawal
```

## Financing Cash Flow

```text
Company Loan Received
Loan Repayment
Capital Injection
Owner Drawings
```

Dashboard:

```text
Opening Cash
+ Operating Inflow
- Operating Outflow
+ Investing Inflow
- Investing Outflow
+ Financing Inflow
- Financing Outflow
= Closing Cash
```

---

# 27. Profit vs Cash

The dashboard must clearly distinguish:

```text
PROFIT
Revenue - Cost - Expense

CASH
Actual Cash/Bank Inflow - Actual Cash/Bank Outflow
```

Examples:

### Customer Advance

```text
Cash increases
Revenue may not yet be recognized
```

### Credit Sale

```text
Revenue increases
Cash may not yet increase
Receivable increases
```

### Inventory Purchase

```text
Cash decreases / Payable increases
Inventory increases
Immediate operating expense is not necessarily recognized
```

### Employee Loan

```text
Cash decreases
Employee Receivable increases
Not an operating expense at disbursement
```

---

# 28. Department-wise P&L

Every relevant journal line should carry:

```text
departmentId
```

Then the system can generate:

```text
Sales Department P&L
Service Department P&L
Warehouse Department P&L
IT Department P&L
HR Department P&L
Other Departments
```

Report:

```text
Revenue
COGS
Gross Profit
Operating Expense
Other Income/Expense
Net Profit
Margin %
```

---

# 29. Head-wise P&L

Transactions should optionally/mandatorily carry `headId` where applicable.

Examples:

```text
Transport
Technician
Marketing
Salary
Rent
Electricity
Internet
Office
Maintenance
```

Then management can identify which cost heads are consuming profit.

---

# 30. Branch-wise P&L

For every major financial transaction:

```text
branchId
```

should be recorded.

Report:

```text
Dhaka Branch
Chattogram Branch
Other Branches
```

Each branch:

```text
Revenue
COGS
Gross Profit
Expense
Net Profit
Margin
Receivable
Payable
Cash
Inventory
```

The PRD requires major entities to support branch-level scoping.

---

# 31. Profit Leakage Dashboard

This should be a core management feature.

The dashboard should identify:

```text
Low-margin Sales
Excessive Discounts
Project Cost Overrun
Unreconciled Technician Advances
Unreturned Stock
Lost/Damaged Stock
Unbilled Delivery
Overdue Customer Receivable
Supplier Overpayment / Anomaly
Unapproved Expenses
Missing Bank Proof
Warranty Replacement Cost
High Conveyance
High Technician Cost
```

Example:

```text
Potential Profit Leakage

Low Margin Sales              ৳150,000
Project Cost Overrun          ৳110,000
Unreconciled Advances          ৳85,000
Stock Variance                 ৳70,000
Unapproved Expenses            ৳40,000
Warranty Cost                  ৳55,000
---------------------------------------
Potential Exposure            ৳510,000
```

These figures are analytical indicators, not automatically accounting losses until verified.

---

# 32. Margin Control

Sales should support configurable minimum margins.

Example:

```text
CCTV              15%
Networking        12%
Computer          10%
Installation      25%
AMC               30%
```

If a transaction falls below the configured threshold:

```text
Warning
      |
      v
Approval Required
      |
      v
Approved / Rejected
```

Discounts should also trigger approval according to configurable rules.

---

# 33. Budget vs Actual

Finance should support:

```text
Budget
vs
Actual
```

for:

- Branch
- Department
- Project
- Expense Head
- Month
- Year

Example:

```text
Marketing Budget     ৳500,000
Actual                ৳650,000
Variance              ৳150,000
Variance %                30%
```

---

# 34. Approval Engine

Finance-related approvals should include at minimum the PRD-defined approval categories:

```text
Conveyance
Advances
Extra Products
Project Closure
Purchase Orders
Stock Adjustments
Expenses
Discounts
Credit Limit Overrides
Warranty Replacement
Employee Loans
Customer Advance Refunds
Company Loan Disbursement
```

Approval states:

```text
Draft
Submitted
Pending
Approved
Rejected
Cancelled
```

Approval history must be auditable.

---

# 35. Audit Trail

Financial records must maintain:

```text
Created By
Created At
Updated By
Updated At
Approved By
Approved At
Posted By
Posted At
Reversed By
Reversed At
```

Field-level audit should capture:

```text
Before
After
User
Timestamp
IP / Session metadata where supported
Reason
```

No user should be able to silently change posted accounting history.

---

# 36. Period Closing

Finance should support accounting-period controls.

Recommended states:

```text
OPEN
SOFT_CLOSED
CLOSED
LOCKED
```

Once a period is locked:

- New backdated financial entries should be blocked.
- Corrections should require authorized adjustment/reversal.
- Previous period reports should remain reproducible.

Exact period-closing rules should be finalized in the accounting architecture.

---

# 37. Financial Reports

## 37.1 General Ledger

Filters:

```text
Date
Account
Branch
Department
Project
Customer
Supplier
Employee
```

Columns:

```text
Date
Reference
Description
Debit
Credit
Balance
```

## 37.2 Trial Balance

```text
Account
Debit
Credit
```

Validation:

```text
Total Debit = Total Credit
```

## 37.3 Profit & Loss

```text
Revenue
COGS
Gross Profit
Operating Expenses
Operating Profit
Other Income
Other Expense
Net Profit
```

## 37.4 Balance Sheet

```text
Assets
Liabilities
Equity
```

Core equation:

```text
Assets = Liabilities + Equity
```

## 37.5 Cash Flow

```text
Operating
Investing
Financing
```

## 37.6 Customer Statement

```text
Invoice
Payment
Advance
Adjustment
Credit Note
Debit Note
Balance
```

## 37.7 Supplier Statement

```text
Purchase
Payment
Credit Note
Debit Note
Balance
```

## 37.8 Project P&L

```text
Revenue
Product COGS
Technician Cost
Conveyance
Other Direct Cost
Project Profit
Margin
```

## 37.9 Department/Head P&L

```text
Revenue
COGS
Expense
Profit
Margin
```

## 37.10 Advance Report

```text
Employee
Technician
Advance
Adjusted
Returned
Outstanding
Age
```

## 37.11 Loan Report

```text
Employee Loan
Company Loan
Principal
Interest
Paid
Outstanding
```

## 37.12 Day Book

```text
Date
Voucher Number
Voucher Type
Particulars
Debit
Credit
```

Every posted voucher/journal entry, company-wide, in chronological order. See §62.1 for full detail.

## 37.13 Cash Book

```text
Opening Cash
Receipts
Payments
Contra affecting cash
Closing Cash
```

Scoped to the Cash-in-Hand account(s). See §62.2 for daily closing and shortage/excess handling.

## 37.14 Bank Book

```text
Opening Balance
Receipts
Payments
Transfers
Deposits
Withdrawals
Cheque Status
Closing Balance
```

One view per bank account. See §62.3 for the cheque lifecycle.

## 37.15 Receipt & Payment Statement

```text
All Receipts (customer, other income, advance, bank, cash)
All Payments (supplier, expense, salary, loan repayment, advance, bank, cash)
Cash/Bank split
Total
```

See §62.4.

---

# 38. Finance Dashboard

The Finance Officer dashboard should show:

```text
Cash & Bank
Accounts Receivable
Accounts Payable
Customer Advances
Technician Advances
Employee Loans
Company Loan
Investment
Today's Collection
Today's Payment
Monthly Revenue
Monthly Expense
Monthly Profit
Pending Approvals
Missing Bank Proof
Unreconciled Advances
Overdue Receivables
```

Charts/analytics:

```text
Revenue Trend
Expense Trend
Profit Trend
Cash Flow Trend
AR Aging
AP Aging
Project Profitability
Department Profitability
```

---

# 39. Management Dashboard

Management should see:

```text
Revenue
Gross Profit
Gross Margin
Operating Expense
Operating Profit
Net Profit
Net Margin
Cash & Bank
Receivable
Payable
Inventory Value
Customer Advance
```

Then:

```text
Top Profitable Projects
Loss-making Projects
Low-margin Sales
Highest Expense Heads
Branch-wise Profit
Department-wise Profit
Technician Cost
Outstanding Advances
Potential Profit Leakage
```

---

# 40. Finance User Permissions

## Accounts/Finance

Can:

- View finance
- Create payments
- Record advances
- Record loans
- Manage investments
- Review reconciliation
- Generate financial reports
- Manage journal entries according to permission
- Approve/review configured financial workflows

## Admin

Can:

- View financial dashboards
- Review operational financial data
- Approve configured exceptions

## Super Admin

Can:

- Access all financial functions
- Configure system settings
- Manage accounting/security settings according to policy

## Branch Manager

Should see only authorized branch financial information.

## Sales Executive

Should see:

- Own sales
- Own customer balances where authorized
- Customer advance entry/status
- Sales margin/KPI within permission

## Technician

Should see:

- Own advances
- Own expenses
- Own conveyance
- Own project financial responsibilities

They should not see unrestricted company financial data.

---

# 41. Financial Data Model

Recommended core entities:

```text
Account
AccountGroup
JournalEntry
JournalLine
FiscalPeriod
Payment
Receipt
Expense
ExpenseCategory
CustomerLedger
SupplierLedger
CustomerAdvance
SupplierPayment
TechnicianAdvance
TechnicianExpense
ConveyanceClaim
EmployeeLoan
EmployeeAdvance
CompanyLoan
Investment
BankAccount
BankTransactionProof
TaxRecord
ProjectCost
ProjectRevenue
Budget
BudgetLine
ApprovalRequest
FinancialAuditLog
```

> **Gap-fill note (v2.0):** v1.0's list stopped at the entities Finance directly owns and did not include the payroll/reconciliation/asset entities that `architecture.md` §7 defines and that this spec now relies on (Sections 23, 56, 58). Added below — same "align with final Prisma schema" caveat applies.

```text
SalaryStructure                            (Section 23.1)
PayrollRun                                 (Section 23.2)
PayslipLine                                (Section 23.2)
AttendanceSalaryRule                       (Section 23.3)
ProjectAdvanceConveyanceReconciliation     (Section 58)
FixedAsset                                 (Section 56)
DepreciationScheduleLine                   (Section 56)
VATLedgerEntry                             (Section 55)
```

Every entity in both lists above also carries a `tenantId` per the confirmed multi-tenant-capable architecture (Section 57), even while the business itself currently operates as a single tenant.

> **Gap-fill note (v3.0):** the cross-check pass (`Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`) surfaced entities this spec relied on implicitly but never named. Added below — same "align with final Prisma schema" caveat applies.

```text
Voucher                                    (Section 61)
VoucherLine                                (Section 61)
ChequeRegisterEntry                        (Section 62.3 — extends BankTransactionProof)
SuspenseEntry                              (Section 63)
RecordEditRequest                          (Section 67 — a specialization of ApprovalRequest)
RecordDeleteRequest                        (Section 67 — a specialization of ApprovalRequest)
PrintPreference                            (Section 66 — per-user, per-document-type letterhead default)
Quotation                                  (Section 69)
QuotationLine                              (Section 69)
```

These names are an implementation-oriented proposal and should be aligned with the final Prisma schema.

---

# 42. Transaction State Model

Financial transactions should use controlled states.

```text
DRAFT
   |
SUBMITTED
   |
PENDING_APPROVAL
   |
APPROVED
   |
POSTED
   |
RECONCILED
   |
CLOSED
```

Possible exception states:

```text
REJECTED
CANCELLED
REVERSED
```

A transaction should not affect finalized financial reports before the required posting/approval rules are satisfied.

---

# 43. Financial Validation Rules

## Journal

```text
Debit > 0 OR Credit > 0
Debit and Credit cannot both be positive on the same line
Total Debit = Total Credit
```

## Payment

```text
Amount > 0
Payment account required
Source/reference required
Bank proof required for bank/cheque settlement
```

## Expense

```text
Category required
Amount required
Payment method required
Branch required
Department/head where applicable
Receipt/proof according to policy
Approval according to threshold
```

## Technician Advance

```text
Project required
Technician required
Approval required
Outstanding cannot become negative
Reconciliation required before closure
```

## Loan

```text
Borrower/lender required
Principal required
Approval required
Repayment schedule required where applicable
```

---

# 44. Financial Controls to Maximize Net Profit Accuracy

The ERP should enforce:

### Control 1 — No untracked cash

Every cash movement must reference a transaction.

### Control 2 — No untracked stock

Every stock movement must originate from a valid inventory transaction.

### Control 3 — No unapproved expense

Expenses above configured thresholds require approval.

### Control 4 — No unrestricted discount

Discounts below minimum margin require approval.

### Control 5 — No unresolved technician advance

Open advances appear on the dashboard until reconciled.

### Control 6 — No unexplained stock loss

Lost/damaged/scrapped stock requires reason and authorization.

### Control 7 — No missing bank proof

Bank/cheque transactions remain incomplete until proof is attached.

### Control 8 — No hidden project cost

Technician, material, conveyance and other direct costs should be attached to projects where applicable.

### Control 9 — No silent financial edits

Posted entries are immutable; corrections use reversal/adjustment.

### Control 10 — No profit without source transactions

P&L must be generated from ledger data.

---

# 45. Daily Finance Closing Checklist

Every day the Finance dashboard should provide:

```text
[ ] Cash balance checked
[ ] Bank transactions checked
[ ] Customer collections posted
[ ] Supplier payments posted
[ ] Technician advances reviewed
[ ] Technician expenses reviewed
[ ] Conveyance reviewed
[ ] Employee advances reviewed
[ ] Loan transactions checked
[ ] Missing bank proofs checked
[ ] Unapproved expenses checked
[ ] Unreconciled advances checked
[ ] Stock/financial anomalies checked
```

---

# 46. Monthly Closing Checklist

```text
[ ] Sales posted
[ ] Purchase posted
[ ] COGS updated
[ ] Inventory valuation verified
[ ] Customer receivables reconciled
[ ] Supplier payables reconciled
[ ] Customer advances reconciled
[ ] Technician advances reconciled
[ ] Employee advances reconciled
[ ] Employee loans reconciled
[ ] Payroll posted
[ ] Bank/cash checked
[ ] Expenses reviewed
[ ] Project P&L reviewed
[ ] Department P&L reviewed
[ ] Trial Balance balanced
[ ] P&L reviewed
[ ] Balance Sheet reviewed
[ ] Cash Flow reviewed
[ ] Period closed
```

---

# 47. Profitability Analytics

The system should answer:

### Which product makes the most profit?

```text
Product
Sales
Units
Revenue
COGS
Gross Profit
Margin %
```

### Which customer is most profitable?

```text
Customer
Revenue
COGS
Service Cost
Discount
Other Cost
Profit
Margin
```

### Which project is losing money?

```text
Project
Revenue
Budget
Actual Cost
Variance
Profit
Margin
```

### Which branch is profitable?

```text
Branch
Revenue
COGS
Expense
Net Profit
Margin
```

### Which department consumes the most money?

```text
Department
Expense
Revenue
Profit
Cost Ratio
```

---

# 48. Recommended Finance Alerts

Real-time notifications:

```text
Low Margin Sale
Large Discount
Project Cost Overrun
Customer Overdue
Supplier Payment Due
Technician Advance Overdue
Employee Loan Installment Due
Missing Bank Proof
Unapproved Expense
Stock Loss
Warranty Cost Spike
Cash Balance Low
Bank Balance Low
High Expense Head
Negative/abnormal margin
```

---

# 49. Export

All financial lists and reports should support:

```text
CSV
PDF
DOCX
XML
```

> **Gap-fill note (v3.0):** alongside these four downloadable formats, every one of these same lists/reports/documents also gets a direct **Print** action — see §66 for the full Universal Print & Letterhead Toggle Engine, which extends this Export control rather than replacing it.

Exports should use the same underlying data source as the UI.

Large reports should be generated as background jobs.

Recommended export reports:

```text
P&L
Balance Sheet
Trial Balance
General Ledger
Cash Flow
Customer Statement
Supplier Statement
AR Aging
AP Aging
Project P&L
Department P&L
Expense Report
Advance Report
Loan Report
Investment Report
Bank Transaction Register
Profit Leakage Report
Day Book
Cash Book
Bank Book
Receipt & Payment Statement
Voucher Register
Suspense Register
Quotation Register
```

---

# 50. Search & Filters

Finance lists should support:

```text
Keyword
Date Range
Status
Branch
Department
Head
Project
Customer
Supplier
Employee
Technician
Account
Payment Method
Approval Status
```

Filters should use AND logic where applicable and display live result counts.

---

# 51. Audit & Security

Financial data is sensitive.

Required controls:

```text
RBAC
Row-level filtering
Branch scoping
Department scoping
Audit log
No hard delete
Approval controls
Period locking
Secure document storage
Encrypted sensitive data where applicable
Backup
Rate limiting
IP allowlist where configured
```

Rate limiting and IP allow-listing are enforced in layers: the mandatory Nginx edge (`architecture.md` §38) provides first-layer, infrastructure-level rate limiting, request-size limits, and TLS termination for every endpoint; the Express application then still enforces its own authentication, RBAC, row-level scoping, and approval controls on top — the edge layer is coarse protection, never a substitute for the application-level controls above.

---

# 52. Accounting Workflow Examples

## 52.1 Credit Sale

```text
Quotation
   ↓
Sales Order
   ↓
Delivery
   ↓
Invoice
   ↓
Revenue + Receivable
   ↓
Payment
   ↓
Cash/Bank + Receivable Reduction
```

## 52.2 Cash Sale

```text
Invoice
   ↓
Revenue + Cash/Bank
```

## 52.3 Purchase on Credit

```text
PO
 ↓
GRN
 ↓
Inventory
 ↓
Supplier Invoice
 ↓
Accounts Payable
 ↓
Supplier Payment
```

## 52.4 Customer Advance

```text
Advance Received
 ↓
Customer Advance Balance
 ↓
Invoice
 ↓
Advance Adjustment
 ↓
Due
```

## 52.5 Technician Project

```text
Project
 ↓
Products Issued
 ↓
Technician Advance
 ↓
Work
 ↓
Used/Returned Products
 ↓
Expenses
 ↓
Conveyance
 ↓
Reconciliation
 ↓
Project Closure
 ↓
Project P&L
```

---

# 53. Profit-Centric Management Rules

The ERP should not only report historical profit; it should help management protect future profit.

## Rule A — Quote Before Cost

Before confirming a sales order:

```text
Selling Price
- Estimated COGS
- Estimated Service Cost
= Estimated Profit
```

## Rule B — Stop Low-Margin Deals

```text
Margin < Minimum
→ Approval
```

## Rule C — Watch Project Overrun

```text
Actual Cost > Budget
→ Alert
```

## Rule D — Reconcile Advances

```text
Advance Outstanding > 0
→ Dashboard Alert
```

## Rule E — Control Warranty Cost

Track:

```text
Warranty Cases
Replacement Cost
Repair Cost
Technician Cost
Product Failure Rate
```

## Rule F — Control Stock Leakage

Track:

```text
Lost
Damaged
Scrapped
Unreturned
Unreconciled
```

---

# 54. Key KPIs

## Company

```text
Revenue
Gross Profit
Gross Margin
Operating Profit
Net Profit
Net Margin
Cash Conversion
Receivable Days
Payable Days
Inventory Value
Inventory Turnover
```

## Sales

```text
Sales
Average Order Value
Gross Margin
Discount %
Low-margin sales
Collection %
```

## Project

```text
Project Revenue
Project Cost
Project Profit
Project Margin
Budget Variance
Cost Overrun
```

## Finance

```text
Collection
Payment
AR
AP
Advance Outstanding
Loan Outstanding
Cash/Bank
Unreconciled Transactions
```

---

# 55. Tax & VAT Accounting

> **Gap-fill note (v2.0):** Neither v1.0 of this spec nor `architecture.md` gave VAT/Tax its own accounting section, even though `TaxRate` (master data), `TaxRecord` (Section 41), Module 29 ("Tax & VAT Management," PRD Section 8.7), and a future "Tax/VAT Return Filing Assistant" (architecture.md Section 24.7) all assume one exists. This section defines the baseline needed for VAT to actually reconcile.

## 55.1 Output VAT and Input VAT

```text
Sales Invoice  → Output VAT   (VAT collected from customer, a liability until remitted)
Purchase Invoice → Input VAT  (VAT paid to supplier, a receivable/credit against Output VAT,
                                where the applicable VAT rules allow input credit)
```

Revenue in the P&L (Section 6, Section 10) must always be recorded **net of VAT** — VAT collected is never company revenue, it is money held on behalf of the tax authority.

## 55.2 VAT Ledger and Net Payable

```text
VATLedgerEntry
  type            OUTPUT | INPUT
  sourceType      INVOICE | PURCHASE_INVOICE | CREDIT_NOTE | DEBIT_NOTE
  sourceId
  taxRateId
  taxableAmount
  vatAmount
  period
  branchId
```

```text
Net VAT Payable (period) = Total Output VAT − Total Input VAT
```

If Input VAT exceeds Output VAT in a period, the balance carries forward as a VAT receivable rather than a cash refund, unless the applicable rules and the finalized accounting architecture say otherwise.

## 55.3 Accounts

```text
2400 VAT Payable / Output VAT   (liability)
1950 VAT Receivable / Input VAT (asset)
```

## 55.4 Reports

```text
VAT Register (Output vs Input, by period/branch)
Net VAT Payable/Receivable Summary
```

Exportable in all four formats (Section 49) — this is also the exact data set a future VAT/Tax Return Filing Assistant (an optional advanced module) would consume; nothing extra needs to be captured later if this baseline is built correctly now.

> The exact VAT rate(s), which product/service categories are VAT-exempt, and whether input-VAT credit applies to every purchase category are matters of Bangladeshi tax law and company policy — not something either source document specifies. These must be confirmed and finalized in the accounting architecture, the same way Section 58 of the source PRD leaves open other tax-treatment specifics.

---

# 56. Fixed Asset & Depreciation Accounting

> **Gap-fill note (v2.0):** v1.0 carried a `1900 Fixed Assets` account and a `7300 Depreciation` expense line in the Chart of Accounts with no entity or posting logic behind either — meaning depreciation, a real expense that reduces Net Profit every month, had nowhere to actually originate from. `architecture.md` Section 24.2 describes a full "Fixed Asset & Depreciation Management" module but places it in the optional/future roadmap (Phase 15). This section defines the **baseline** depreciation posting that Net Profit needs even before that full module is built.

## 56.1 Fixed Asset vs. Sellable Inventory

A `FixedAsset` is something the **company itself** owns and uses (vehicle, tool, laptop, office equipment) — distinct from sellable product Inventory/SKU stock (Section 7). It never enters COGS; it enters the P&L only through depreciation.

```text
FixedAsset
  id
  assetName
  category            VEHICLE | TOOL | LAPTOP | OFFICE_EQUIPMENT | OTHER
  acquisitionCost
  acquisitionDate
  depreciationMethod  STRAIGHT_LINE | REDUCING_BALANCE
  usefulLifeMonths
  salvageValue
  currentBookValue
  assignedTo          technicianId / branchId / department (optional)
  branchId
  status              ACTIVE | DISPOSED | WRITTEN_OFF
```

## 56.2 Depreciation Schedule and Posting

```text
DepreciationScheduleLine
  id
  assetId
  period
  depreciationAmount
  accumulatedDepreciation
  bookValueAfter
  postedJournalEntryId
```

Each period, the scheduled depreciation auto-posts:

```text
Depreciation Expense (7300)         Dr
   Accumulated Depreciation (1910)       Cr
```

Net Book Value on the Balance Sheet is always `acquisitionCost − accumulatedDepreciation`, never the original acquisition cost alone.

## 56.3 Disposal / Write-off

On disposal or scrapping, the asset's cost and accumulated depreciation are both removed, and any difference between disposal proceeds and remaining book value is recognized as a gain/loss under Other Income/Other Expense (Section 4.2, 8000/8200) — never silently absorbed elsewhere.

## 56.4 Reports

```text
Fixed Asset Register
Depreciation Schedule (posted vs. pending)
Net Book Value report, by branch/category
```

> Recommendation: even though the full Fixed Asset & Depreciation *module* (asset assignment workflow, maintenance tracking) can remain in the later, optional phase per the PRD, the **journal-posting mechanism** in Section 56.2 should be available from the Accounting phase (Phase 6) onward — otherwise every month-end Net Profit figure (Section 61) understates true cost by whatever depreciation was never posted.

---

# 57. Multi-Tenant, Branch & Fiscal Period Foundations

> **Gap-fill note (v2.0):** `architecture.md` Section 0 confirms the platform is architected as multi-tenant-capable (`tenantId` required across all entities) even though Brother's Technology System currently operates as a single company with multiple branches — a distinction the same document flags as needing stakeholder confirmation (its Section 26). v1.0 of this Finance spec never mentioned `tenantId` anywhere in its data model (Section 41), and neither source document ever states the company's fiscal year convention. Both are closed here.

## 57.1 Tenant and Branch Scoping

Every entity listed in Section 41 carries both:

```text
tenantId    — even while the business runs as a single tenant today, so no future multi-entity
              or franchise rollout ever requires a data migration
branchId    — already used throughout this spec for branch-wise P&L (Section 30) and
              row-level scoping
```

## 57.2 Fiscal Period Convention — Needs Confirmation

**Resolved (Phase 0, confirmed with Brother's Technology System):** the fiscal year is the **calendar year (1 January – 31 December)**, not the Bangladesh statutory year. This is the boundary used by Period Closing (Section 36), the Monthly/Month-End reports (Sections 46, 61), Year-End Closing (Section 64), and every year-over-year comparison, and is set on the `FiscalPeriod` entity (Section 41) accordingly.

## 57.3 Currency and Timezone

```text
Base currency        BDT (৳) — used consistently throughout this spec
Timezone             Asia/Dhaka — the default for every date/time field and period cutoff
                      (a fiscal period closes at midnight Asia/Dhaka, not UTC)
```

## 57.4 Foreign Currency — Open Question

**Resolved (Phase 0, confirmed with Brother's Technology System): out of scope.** All purchasing reaches the books already converted to BDT — no foreign-currency purchase invoices, exchange-rate capture, or realized/unrealized FX gain-or-loss accounting is built. No FX gain/loss account is added under Other Income/Other Expense (Section 4.2), and the Purchase flow (Section 7.1) does not capture an exchange rate. If this assumption changes in the future (e.g. Brother's Technology System begins settling supplier invoices directly in USD), this section should be reopened before that purchasing pattern goes live, since an unhandled exchange-rate movement would otherwise silently distort COGS and Gross Profit (Section 8).

---

# 58. Project Advance–Conveyance Real-Time Reconciliation Engine

> **Gap-fill note (v2.0):** This is the single largest gap closed in this rebuild. `architecture.md` Section 28 (Module 64) and `prd.md` Section 8.19 both describe a `ProjectAdvanceConveyanceReconciliation` engine in detail — it is the mechanism that actually connects Technician Advance (Section 15) to Payroll (Section 23) to Project P&L (Section 17) — but v1.0 of this Finance spec never mentioned it. Without this section, Technician Advance and Payroll each had their own partial view of the same money, with no defined mechanism forcing them to agree.

## 58.1 Trigger

The moment a `ServiceAssignment`'s `ConveyanceBill`(s) **and** its `ProjectClosureReport` are both approved (Section 16, 17), the system computes one `ProjectAdvanceConveyanceReconciliation` row for that assignment — automatically, not as a manual accounting step.

```text
ProjectAdvanceConveyanceReconciliation
  assignmentId
  technicianId
  totalAdvanceIssued      sum of approved TechnicianAdvance for this assignment
  totalApprovedSpend      sum of approved ConveyanceBill + approved extraCashUsed
                           (from ProjectClosureReport)
  variance                totalApprovedSpend − totalAdvanceIssued
  outcome                 SHORTFALL_DEDUCT | EXCESS_REIMBURSE | BALANCED
  computedAt
  appliedToPayrollRunId   set once pulled into a PayslipLine (Section 23.5) — prevents
                           double-counting
  appliedAt
```

## 58.2 The Three Outcomes

```text
variance < 0   → SHORTFALL_DEDUCT
   Technician spent LESS than the advance. The unspent balance is owed BACK to the
   company and is queued as a payroll deduction.

variance > 0   → EXCESS_REIMBURSE
   Technician spent MORE than the advance (from their own funds). The excess is owed
   TO the technician and is queued as a payroll reimbursement.

variance = 0   → BALANCED
   No payroll effect.
```

Nothing is silently absorbed either way — this follows the same "approval-gated exception" design principle already applied to every other unplanned amount in this spec (Section 44).

## 58.3 Journal Posting — Closing the Interim/Final Gap

At disbursement, the advance is booked as a receivable exactly as Section 15 already describes:

```text
Technician Advance Receivable (1700)   Dr   Advance Amount
   Cash / Bank (1000/1100)                  Cr   Advance Amount
```

At reconciliation, two things happen together, not one after the other:

```text
1. Recognize the ACTUAL cost:
   Technician/Field Expense (6100)        Dr   totalApprovedSpend
      Technician Advance Receivable (1700)     Cr   totalApprovedSpend (up to totalAdvanceIssued)

2a. If SHORTFALL_DEDUCT — remaining receivable balance is the shortfall; it stays open
    on Technician Advance Receivable (1700) until the next PayrollRun clears it:
       Salary Payable (2300) reduced by shortfall
       Technician Advance Receivable (1700)     Cr   shortfall

2b. If EXCESS_REIMBURSE — the technician's own money covered a cost beyond the advance:
       Technician/Field Expense (6100)        Dr   excess
          Employee Payable — Reconciliation (2210)  Cr   excess
    At the next PayrollRun, this payable is paid out:
       Employee Payable — Reconciliation (2210)  Dr   excess
          Salary Payable (2300) / Cash / Bank        Cr   excess
```

The result: **Technician Advance Receivable always nets to zero** for a closed, reconciled project, and the project cost booked is always the *actual* approved spend — never the raw advance figure. This is what makes Section 59's two-stage P&L reconcile without leakage.

## 58.4 Real-Time Visibility

Computed reconciliations push over the same real-time channel already used for live approvals (Section 34): Admin/Accounts sees it land on the Finance/Payroll dashboard (Section 38) instantly; the technician sees it on their own "My Salary" panel (Section 23.4) immediately — well before the figure is formally applied in the next `PayrollRun`.

## 58.5 Reports

```text
Project Advance–Conveyance Reconciliation report — pending vs. applied, by technician/branch
```

Cross-referenced from both the Payroll reports (Section 23.8) and the Technician Advance report (Section 37.10).

---

# 59. Two-Stage Project P&L — Interim vs. Final

> **Gap-fill note (v2.0):** `architecture.md` Section 11A defines project cost as including "Approved/unreconciled TechnicianAdvance treated as cost" — a deliberately interim placeholder — but neither source document ever states what happens to that number once Section 58's reconciliation reveals the technician's *actual* approved spend. Left unresolved, a project's displayed profit would never match its own closing figures, which directly undermines the "100% profit and loss" goal stated in the PRD's Executive Summary. This section makes the two states explicit and shows exactly how a project moves from one to the other with nothing lost.

## 59.1 INTERIM State (while the assignment is open)

```text
Project Profit (INTERIM) =
    Invoice Revenue (net of tax, discount & adjusted CustomerAdvance)
  − Product/Material COGS
  − Approved ConveyanceBills to date
  − Unreconciled TechnicianAdvance (full amount, treated as a cost placeholder)
  − Other approved direct cost
```

## 59.2 FINAL State (once Section 58's reconciliation has run and the assignment is CLOSED)

```text
Project Profit (FINAL) =
    Invoice Revenue (net of tax, discount & adjusted CustomerAdvance)
  − Product/Material COGS
  − Approved ConveyanceBills
  − Actual Reconciled Technician Cost (= totalApprovedSpend, Section 58.1 — never the raw advance)
  − Other approved direct cost
```

## 59.3 Worked Example

Using the figures already established in Section 15:

```text
Advance Issued              ৳20,000
Approved Spend (actual)     ৳14,000
Variance                     ৳6,000  → SHORTFALL_DEDUCT (Section 58.2)

INTERIM Technician Cost used in Project P&L:   ৳20,000  (the full advance)
FINAL Technician Cost used in Project P&L:     ৳14,000  (actual approved spend)

Project Profit (FINAL) = Project Profit (INTERIM) + ৳6,000
```

The ৳6,000 does **not** disappear and does **not** stay in the project's books either — it becomes a `SHORTFALL_DEDUCT` (Section 58), collected from the technician through Payroll (Section 23), and appears in the Payroll ledger, not in Project P&L. This is the "no leakage" guarantee: the money is always somewhere specific, never nowhere.

## 59.4 Display Rule

Every screen, dashboard, or report that shows a Project P&L figure (Sections 17, 37.8, 39, 61) **must label which state it is in** — `INTERIM` or `FINAL` — and must never silently switch between the two without that label. A project still in progress showing an unlabeled profit number is treated as a specification defect, not a rounding matter.

## 59.5 Company-Wide Reconciling Control

The two-stage model changes **where** a cost is attributed (Project Cost vs. Payroll Deduction/Reimbursement); it never changes the **total** money in or out at the company level. As a built-in cross-check, add to the Monthly Closing Checklist (Section 46):

```text
[ ] Sum of all ProjectAdvanceConveyanceReconciliation variances for the period
    = aggregate difference between projects' INTERIM and FINAL profit figures
```

If these two figures do not match, a reconciliation was either missed or double-applied — the same discipline already required for Trial Balance (Section 37.2).

---

# 60. 100% Profit & Loss Coverage Matrix

> **Gap-fill note (v2.0):** This section exists to directly answer the requirement stated plainly in the PRD's Executive Summary and Goals (Sections 2 and 4): *"100% Profit & Loss visibility — company-wide, per project/order, and per department/head."* Every one of the platform's 65 modules is listed below with the exact ledger or report line it feeds, so "100%" is not a slogan — it is a checked, closed list with no unmapped module left over.

| # | Module | P&L / Ledger Treatment | Spec Section |
|---|---|---|---|
| 1 | Authentication & Authorization | No financial posting | — |
| 2 | User & Employee Management | Basis for Payroll | §23 |
| 3 | Role-Based Access Control | No financial posting | — |
| 4 | Dashboard & Business Overview | Reads P&L; posts nothing | §38, §39 |
| 5 | Product & Item Master Management | Defines Revenue/COGS account mapping per product | §4, §6, §7 |
| 6 | Supplier / Vendor Management | Basis for Accounts Payable | §13 |
| 7 | Customer Management | Basis for Accounts Receivable | §11 |
| 8 | Purchase Management | Inventory asset / Accounts Payable | §7.1, §13 |
| 9 | Quotation Management | Pre-revenue; posts nothing until converted | feeds §6 |
| 10 | Sales Order Management | Reserves inventory; posts nothing until invoiced | feeds §6 |
| 11 | Inventory Management | Inventory asset → COGS on issue | §7, §8 |
| 12 | Warehouse & Branch Management | Branch-wise stock/cost scoping | §30 |
| 13 | Batch & Serial Number Management | Cost basis (FIFO/moving-average) for COGS | §7.2 |
| 14 | Challan / Delivery Note Management | Pre-invoice logistics; no posting | — |
| 15 | Invoice & Billing Management | Revenue + Accounts Receivable | §6, §11 |
| 16 | Payment Management | Clears Cash/Bank against AR/AP | §11, §13, §14 |
| 17 | Accounting & Finance | The general ledger itself | §3–§5 |
| 18 | Expense Management | Operating Expense | §9 |
| 19 | Customer Complaint / Ticket Management | No direct posting unless it opens a ServiceAssignment | §17 |
| 20 | Warranty Management | Warranty Replacement Cost (COGS) | §4.2 (5200) |
| 21 | Field Visit Management | Feeds ServiceAssignment cost | §17 |
| 22 | Product Assign & Receive (Custody) | COGS recognized when custody item marked USED | §7.2, §17 |
| 23 | Employee Work Summary & KPI | No financial posting | — |
| 24 | Notification Management | No financial posting | — |
| 25 | Approval Workflow Management | Gates postings; does not itself post | §34 |
| 26 | Reports & Analytics | Reads ledger; posts nothing | §37–§39 |
| 27 | Audit Trail & Activity Logging | No posting; governs immutability | §35 |
| 28 | Document & File Management | No financial posting | — |
| 29 | Tax & VAT Management | VAT Payable / VAT Receivable | §55 |
| 30 | System Settings | No financial posting | — |
| 31 | Numbering & Document Templates | No financial posting | — |
| 32 | API & Third-Party Integrations | No financial posting | — |
| 33 | Search & Global Filtering | No financial posting | — |
| 34 | Import & Export (bulk data) | No financial posting | — |
| 35 | Backup & Data Recovery | No financial posting | — |
| 36 | Security Management | No financial posting | — |
| 37 | System Administration | No financial posting | — |
| 38 | Customer Portal | Reads AR/advance balance | §11, §12 |
| 39 | Vendor / Staff Portal | Reads AP balance | §13 |
| 40 | Mobile / Responsive Requirements | No financial posting | — |
| 41 | Master Data Management | See Modules 5, 6, 7 | §4, §6, §7 |
| 42 | Business/Branch Configuration | No financial posting | — |
| 43 | Business Workflow | Governs the transaction state model | §42 |
| 44 | Status Management | Governs the transaction state model | §42 |
| 45 | Data Management (retention, soft delete) | No posting; governs immutability | §35 |
| 46 | Technician Management | See Modules 21, 22 | §17 |
| 47 | Conveyance & Advance Management + Approval | Technician Advance / Conveyance cost | §15, §16 |
| 48 | Project-wise Profit & Loss | The report itself | §17, §59 |
| 49 | Live Location Tracking / Remote Employee Mgmt | No financial posting | — |
| 50 | Role-scoped Mobile Apps | No financial posting | — |
| 51 | Customer Advance / Partial Payment Management | Customer Advance liability | §12 |
| 52 | Employee Advance & Loan Management | Employee Loan/Advance Receivable | §19, §20 |
| 53 | SKU Full Lifecycle Tracking | Cost-basis trail feeding COGS | §7 |
| 54 | Company Loan Management | Loan Payable / Interest Expense | §21 |
| 55 | Investment Management | Investment Capital | §22 |
| 56 | Universal Document Export Engine | No posting; delivers exports | §49 |
| 57 | Multi-Module Workspace (Draft Autosave) | No posting — drafts never touch committed ledger data | §42 |
| 58 | Department/Head-wise Report Generation | The report itself | §28, §29 |
| 59 | HR & Payroll Management *(optional/future)* | See Module 64 | §23, §58 |
| 60 | Fixed Asset & Depreciation Management *(optional/future)* | Depreciation Expense | §56 |
| 61 | AMC / Recurring Service Contract Management *(optional/future)* | AMC Revenue | §4.2 (4300) |
| 62 | Bank & Cash Reconciliation *(optional/future)* | Validates Cash/Bank balances | §25 |
| 63 | CRM / Lead & Sales Pipeline *(optional/future)* | Pre-revenue; no posting | — |
| 64 | Employee Payroll & Salary Self-Service | Salary Expense + Advance/Conveyance Reconciliation | §23, §58 |
| 65 | Bank Transaction Proof — Cheque / Bank Attachment | Gates completion of any bank/cheque-settled posting | §24 |

**Reading this table:** a module marked "No financial posting" is not a gap — plenty of modules (auth, search, notifications, system admin) are correctly outside the accounting trail by design. The modules that matter are the ones with a named account, ledger, or report in the third column, and every one of those now has a fully specified home in this document. That is what "100%" means here: not that every module touches money, but that every module that *does* touch money has exactly one, unambiguous, checked place it lands.

---

# 61. Voucher Management Layer

> **Gap-fill note (v3.0):** The cross-check document's §6 requires a full Voucher layer — Journal, Payment, Receipt, Contra, Sales, Purchase, Sales Return, Purchase Return, Expense, Adjustment, Opening, and Transfer Vouchers — with numbering, narration, attachments, approval/posting states, print, export, and reversal. v1.0/v2.0 of this spec specified the underlying `JournalEntry`/`JournalLine` pair (§5.1) but never the user-facing Voucher documents that actually create them. This section adds that layer without duplicating §5 — a Voucher is the source document; `JournalEntry`/`JournalLine` remain the ledger-posting mechanism underneath it.

## 61.1 What a Voucher Is

A **Voucher** is the data-entry form Accounts/Cashier actually fills in; on posting, it creates exactly one balanced `JournalEntry` (§5.1) with `sourceModule = "VOUCHER"`, `sourceType = <voucherType>`, `sourceId = voucher.id`. Some vouchers are **auto-generated** by the system the moment a source transaction is approved (a Sales Voucher is created automatically when an Invoice is posted, §6.1; a Purchase Voucher when a Purchase Invoice is posted, §7.1); others are **manually created** by Accounts (Journal, Payment, Receipt, Contra, Adjustment, Opening, Transfer).

## 61.2 Voucher Types

```text
Journal Voucher (JV)          — manual adjustment/correction entries
Payment Voucher (PV)          — any cash/bank outflow (supplier, expense, salary, loan, advance)
Receipt Voucher (RV)          — any cash/bank inflow (customer, other income, advance)
Contra Voucher (CV)           — cash↔bank or bank↔bank transfers within the company
Sales Voucher (SV)            — auto-generated from a posted Invoice (§6.1)
Purchase Voucher (PuV)        — auto-generated from a posted Purchase Invoice (§7.1)
Sales Return Voucher (SRV)    — auto-generated from a Sales Return (§6.2)
Purchase Return Voucher (PRV) — auto-generated from a Purchase Return
Expense Voucher (EV)          — auto-generated from an approved Expense (§9)
Adjustment Voucher (AV)       — stock or other non-cash corrective adjustments
Opening Voucher (OV)          — opening balances at go-live or year-start (§64.5)
Transfer Voucher (TV)         — inter-branch cash/bank/stock transfer
```

## 61.3 Voucher Fields

```text
Voucher
  id
  voucherNumber        e.g. JV-DHK-2026-000123 (see §61.5 for numbering scheme)
  voucherType          JV | PV | RV | CV | SV | PuV | SRV | PRV | EV | AV | OV | TV
  voucherDate
  postingDate
  referenceNumber      optional external reference (cheque no., bank slip no., supplier invoice no.)
  narration            mandatory free-text description
  lines[]              accountId, debit, credit, plus the same dimension tags already on
                        JournalLine (§5.1): customerId, supplierId, employeeId, technicianId,
                        branchId, departmentId, headId, projectId
  attachmentFileId     reuses Document/Attachment
  createdById
  approvedById
  postedById
  status               DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → POSTED
                        (reuses the Transaction State Model, §42, plus REVERSED as an
                        exception state)
  linkedJournalEntryId set once POSTED
  reversalOfVoucherId  set when this voucher is itself a reversal (§61.6)
```

`Total Debit = Total Credit` is validated at the voucher level before it is allowed to move past DRAFT — the same rule already stated for journals in §5.

## 61.4 Manual vs. Auto-Generated — Who Touches What

| Voucher Type | Created By | Approval Needed | Notes |
|---|---|---|---|
| Journal Voucher | Accounts | Yes (Accounts lead/Admin) | For corrections not covered by a reversal (§61.6) |
| Payment Voucher | Accounts/Cashier | Per §34 approval categories | Feeds Cash Book/Bank Book (§62) |
| Receipt Voucher | Accounts/Cashier | Not required for standard collections | Feeds Cash Book/Bank Book (§62) |
| Contra Voucher | Accounts | Accounts lead | Cash↔Bank movement only, never touches P&L |
| Sales / Purchase / Sales Return / Purchase Return / Expense Voucher | System (auto) | Inherits the approval already required on the source document | No re-approval at the voucher layer |
| Adjustment Voucher | Accounts/Warehouse (stock) | Yes — Stock Adjustment approval type (§34) | |
| Opening Voucher | Accounts (go-live only) | Super Admin | See §64.5 |
| Transfer Voucher | Accounts/Branch Manager | Yes | Both branches' Bank Books show the leg that affects them |

## 61.5 Numbering

Per voucher-type prefix + branch code + fiscal year + running sequence:

```text
<PREFIX>-<BRANCH>-<FISCAL_YEAR>-<SEQUENCE>
e.g.  JV-DHK-2026-000123
      RV-CTG-2026-000045
```

Reuses the Numbering & Document Templates system-admin capability already in scope (`architecture.md`, Module 31) — sequence never resets mid-year and is never reused, even across a reversal.

## 61.6 Reversal

A POSTED voucher is never edited or hard-deleted (§3.2 stands unchanged). It is reversed by an equal-and-opposite reversal voucher of the same type, referencing the original via `reversalOfVoucherId`, so both the mistake and its correction remain permanently visible in the Day Book (§62.1). Initiating a reversal on an already-POSTED voucher is itself gated by the Data Edit & Delete Governance rule in §67 — the reversal request needs Super Admin approval before it posts.

## 61.7 Print & Export

Every voucher gets the same Print + 4-format Export control specified in §66, including the option to attach the company letterhead for any voucher a customer/vendor might see printed (e.g., a Receipt Voucher handed to a walk-in customer).

## 61.8 Cross-Check Alignment

This section closes the cross-check document's §6 (Voucher Management) in full — all twelve voucher types and every item in its "Voucher Requirements" checklist (number, date, posting date, reference, narration, lines, debit, credit, attachment, created/approved/posted by, status, audit history, print, PDF export, reversal).

---

# 62. Day Book, Cash Book, Bank Book & Receipt-Payment Statement

> **Gap-fill note (v3.0):** Closes the cross-check document's §7 (Day Book), §8 (Cash Book), §9 (Bank Book), and §10 (Receipt & Payment Statement) — four named reports that did not exist explicitly in v2.0. Cash & Bank Management (§25) covered related ground at a summary level; this section makes each report concrete and adds the cheque lifecycle that §24/§25 never modeled.

## 62.1 Day Book

A single, company-wide, chronological list of **every** posted Voucher (§61) / Journal Entry (§5), regardless of type.

```text
Filters:  Date range · Voucher type · Account · User
Columns:  Date · Voucher No. · Voucher Type · Particulars · Debit · Credit
```

Every row drills down to its source voucher (§68, Drill-Down Standard). This is a **view** over existing `Voucher`/`JournalEntry`/`JournalLine` data, not a new ledger.

## 62.2 Cash Book

The Day Book filtered to the Cash-in-Hand account(s) (COA `1000`).

```text
Opening Cash
+ Cash Receipts
- Cash Payments
± Contra affecting cash
= Closing Cash
```

**Daily Cash Closing:** an end-of-day snapshot comparing system Closing Cash against the physically counted cash-in-drawer. A mismatch requires a **Cash Shortage/Excess Adjustment** — a small Adjustment Voucher (§61.2) posting the difference to a dedicated `7450 Cash Shortage/Excess` (expense) or `8050 Cash Shortage/Excess` (other income) account, with a mandatory reason and the same approval gate as any other Expense (§34). This closing step is added to the Daily Finance Closing Checklist (§45).

## 62.3 Bank Book & Cheque Register

The Day Book filtered to a single Bank Account (one Bank Book per bank account under COA `1100.x`).

```text
Opening Balance
Receipts · Payments · Transfers · Deposits · Withdrawals
Cheque Status
Closing Balance
```

**Cheque Register** — extends `BankTransactionProof` (§24) rather than duplicating it, adding the lifecycle a proof image alone doesn't capture:

```text
ChequeRegisterEntry
  bankTransactionProofId   -> BankTransactionProof (§24) for the image/reference
  chequeStatus             ISSUED | PRESENTED | CLEARED | BOUNCED | CANCELLED
  clearedDate
  bouncedReason
```

A **BOUNCED** cheque automatically reverses the original Payment/Receipt Voucher it was tied to (per §61.6) and, if a bank bounce fee applies, posts a separate `7000 Bank Charges` expense. Bank Book/Cheque Register feeds directly into the future Bank & Cash Reconciliation module (§24.4 of `architecture.md`) once built.

## 62.4 Receipt & Payment Statement

A single umbrella report grouping every receipt and every payment across the whole business for a date range:

```text
Receipts:  Customer Receipt · Other Income Receipt · Advance Receipt · Bank Receipt · Cash Receipt
Payments:  Supplier Payment · Expense Payment · Salary Payment (PayslipLine, §23)
           · Loan Repayment · Advance Payment · Bank Payment · Cash Payment

Columns:  Date range · Account · Voucher type · Cash/Bank · Debit · Credit · Total
```

## 62.5 Common Requirements

All four reports above support: date filter, drill-down to source voucher (§68), Print + 4-format Export (§66), and are added to the standard report list in §37.12–§37.15 and the export list in §49.

---

# 63. Suspense Account Management

> **Gap-fill note (v3.0):** Entirely absent from v1.0/v2.0. The cross-check document's §25 requires a Suspense Account workflow for money that cannot yet be definitively classified — an unidentified bank credit, a receipt that can't yet be matched to an invoice, a payment made before the correct expense head is confirmed.

## 63.1 New COA Accounts

Extends §4.2:

```text
1850 Suspense — Current (Asset)          unallocated payments awaiting reclassification
1860 Suspense — Non-Current (Asset)      long-outstanding items pending resolution
2650 Suspense — Current (Liability)      unallocated receipts awaiting reclassification
2660 General Suspense (Liability)
2670 Suspense — Non-Current (Liability)  long-outstanding items pending resolution
```

## 63.2 Workflow

Any Receipt/Payment/Voucher (§61) can be posted to a Suspense account instead of its final account when the correct classification isn't yet known, flagged `unresolved = true` on the `SuspenseEntry` row. Once the correct account is known, a **Reclassification** action moves the amount from Suspense to its final account via a standard Adjustment Voucher (§61.2) — this requires Accounts/Admin approval via a new `ApprovalRequest.type = SUSPENSE_RECLASSIFICATION` (extends `architecture.md` §10's `ApprovalType` enum).

```text
SuspenseEntry
  id
  voucherId            -> Voucher (§61) originally posted to Suspense
  suspenseAccountId
  amount
  unresolved            Boolean, default true
  reclassifiedToAccountId
  reclassifiedAt
  reclassificationApprovalId
```

## 63.3 Suspense Aging

Uses the same aging buckets already standard in this spec (§11.2: Current / 1–30 / 31–60 / 61–90 / 90+ days). Surfaced on the Finance Dashboard (§38) and added as a mandatory line to both the Daily (§45) and Monthly (§46) Closing Checklists — an unresolved Suspense line older than the business's own tolerance threshold is a Profit Leakage Dashboard candidate (§31).

## 63.4 Cross-Check Alignment

Closes the cross-check document's §25 (Suspense Account Management) in full.

---

# 64. Year-End Closing & Retained Earnings

> **Gap-fill note (v3.0):** Extends §36 (Period Closing). v2.0 specified locking accounting periods (`OPEN → SOFT_CLOSED → CLOSED → LOCKED`) but never described the actual year-end closing journal that zeroes Revenue and Expense into Retained Earnings — the cross-check document's §29 requirement.

## 64.1 Pre-Close Checks

Year-end closing may only run once every check below passes — reusing existing checklists rather than inventing new ones:

```text
[ ] Trial Balance balanced (§37.2)
[ ] Every period in the fiscal year is CLOSED (§36)
[ ] All depreciation for the year posted (§56.2)
[ ] VAT reconciled for every period in the year (§55.2)
[ ] All Project Advance–Conveyance reconciliations applied (§58)
[ ] All Suspense entries reviewed (§63.3)
[ ] Monthly Closing Checklist (§46) complete for every month in the year
```

## 64.2 The Closing Journal

```text
Net Profit/Loss (fiscal year) =
    Total Revenue (4000-series)
  − Total COGS (5000-series)
  − Total Operating Expense (6000/7000-series)
  − Total Other Expense (8200/8300)
  + Total Other Income (8000/8100)
```

Step 1 — zero every Revenue and Expense account for the year, posting the net difference to **Current Year Profit/Loss (3200)**:

```text
[Every Revenue account]      Dr    (its full-year balance)
[Every COGS/Expense account]      Cr    (its full-year balance)
   Current Year Profit/Loss (3200)   Cr/Dr   the net difference
```

Step 2 — transfer 3200's balance into **Retained Earnings (3100)**:

```text
Current Year Profit/Loss (3200)   Dr   (if profit)
   Retained Earnings (3100)            Cr
```
(reversed if the year closed at a loss).

## 64.3 What Happens Next

The fiscal year itself (not just its final period) is marked `CLOSED`. Balance Sheet accounts (Assets/Liabilities/Equity) carry their closing balances forward as the new year's opening balances automatically; Revenue/Expense accounts start the new fiscal year at zero, exactly as any standard accounting close requires.

## 64.4 Reopening a Closed Year

Given how consequential undoing a year-close is, a Year-Reopen action is always routed through the Data Edit & Delete Governance workflow (§67) — it requires explicit Super Admin approval, regardless of who requests it, and is logged with the same rigor as any other `RECORD_EDIT_REQUEST`.

## 64.5 Opening Balances (Go-Live)

The very first "year-end closing" a new deployment performs is really the reverse: loading opening balances via the **Opening Voucher** (§61.2) for every account, before any live transaction is posted — this is the same voucher type used at go-live and referenced in §61.4.

## 64.6 Cross-Check Alignment

Closes the cross-check document's §29 (Year-End Closing) checklist and reinforces §28 (Fiscal Year & Accounting Period).

---

# 65. Enhanced Chart of Accounts — Hierarchy, Control Accounts & Cost Center Mapping

> **Gap-fill note (v3.0):** Extends §4. Closes a real inconsistency between the existing documents: `ui.md` §8 (Chart of Accounts tree manager) already assumes a **5-root COA tree** — "The five root nodes (Assets, Liabilities, Equity, Income, Expenses)" — while this spec's §4.1 defines **8 flat `AccountType` values** (`ASSET, LIABILITY, EQUITY, REVENUE, COGS, EXPENSE, OTHER_INCOME, OTHER_EXPENSE`) with no stated hierarchy. Both are correct at different layers; this section makes the relationship explicit instead of leaving it implicit. It also folds in the cross-check document's §5 requirements (control accounts, cost-center mapping, Suspense placement, and the non-current-asset categories it lists that v2.0 never mentioned).

## 65.1 Two Layers, Reconciled

- **`AccountType`** (8 values, §4.1) is the *posting-level* classification every account carries — it's what lets the P&L engine (§10) and Balance Sheet (§37.4) compute Gross Profit, COGS, and Net Profit correctly.
- **The 5-root COA tree** (`ui.md` §8) is the *display/browsing* hierarchy: Revenue and Other Income nest under an "Income" root; COGS, Expense, and Other Expense nest under an "Expenses" root; Assets, Liabilities, and Equity remain their own roots. Every account still carries its `AccountType` tag underneath, so collapsing the tree for browsing never loses the information reports need.

## 65.2 Account Fields

```text
Account
  id
  accountCode
  accountName
  accountType            ASSET | LIABILITY | EQUITY | REVENUE | COGS | EXPENSE
                         | OTHER_INCOME | OTHER_EXPENSE
  parentAccountId        unlimited-depth parent/child (ui.md §8's tree manager)
  normalBalance          DEBIT | CREDIT (derived from accountType, stored for query speed)
  isControlAccount       true for AR/AP/Inventory/Cash&Bank roll-ups whose balance must
                         always equal its subledger total (§45 of the cross-check document's
                         Critical Reconciliation Tests — already echoed by this spec's own
                         Success Criteria, §75)
  isCashOrBankAccount    Boolean
  taxRateId              optional default VAT mapping (§55)
  costCenterDimensions   which of branchId/departmentId/projectId/headId this account
                         requires on every posting — reuses the existing dimension tags on
                         JournalLine (§5.1); "Cost Center" is not a new, separate entity —
                         it is this configuration of which existing tags are mandatory
  isActive
  openingBalance
  tenantId / branchId    per §57
```

## 65.3 Additions to the Account Groups (§4.2)

```text
Liabilities > Current:      2650 Suspense — Current (see §63.1)
Liabilities > Non-Current:  2660 General Suspense, 2670 Suspense — Non-Current
Assets > Current:           1850 Suspense — Current
Assets > Non-Current:       1860 Suspense — Non-Current
```

**Non-current asset categories — Resolved (Phase 0, confirmed with Brother's Technology System): needed, not dropped.** All three account groups below are kept in the Chart of Accounts:

```text
Investments (outward)    — money BTS itself invests (e.g. a fixed deposit or shares held).
                            Distinct from §22's `Investment` entity, which is capital BTS
                            *receives*.
Tender                    — earnest money / bid security deposits, relevant if BTS
                            bids on tendered government/corporate contracts.
Pre-Production Expenses   — costs incurred before a large installation project formally
                            starts, tracked separately from the Project Cost Overrun
                            control in §18.
```

## 65.4 Control Account Reconciliation

Every `isControlAccount = true` account must reconcile to its subledger as a standing rule, not an occasional check — this is already this spec's own §75 Success Criteria restated with the cross-check document's explicit account pairs made concrete:

```text
Accounts Receivable (1200)   =  sum of all Customer Ledgers (§11.1)
Accounts Payable (2000)      =  sum of all Supplier Ledgers (§13)
Inventory (1400)             =  Stock Ledger valuation (§7)
Cash-in-Hand (1000)          =  Cash Book (§62.2)
Bank Accounts (1100)         =  sum of all Bank Books (§62.3)
Fixed Assets net of 1910     =  Fixed Asset Register (§56.4)
VAT accounts (1950/2400)     =  VAT Register (§55.4)
```

A mismatch on any pair above is treated with the same severity as a Trial Balance that doesn't balance (§37.2).

## 65.5 Commission Management — Deferred (Phase 0, confirmed with Brother's Technology System)

The cross-check document's §24 (Commission Management — agent/salesperson commission on sales) is **not built now**. Whether commission applies to Brother's Technology System's sales is not yet settled, so no posting logic, workflow, or UI is implemented in the initial build. Only the two placeholder COA lines (`Commission Expenses`, 6000-series; `Commissions Received`, 8000-series) are kept, unused, so the feature can be added later without a Chart-of-Accounts migration if it's confirmed and prioritized.

## 65.6 Cross-Check Alignment

Closes the cross-check document's §5 (Chart of Accounts) in full, including every item in its "COA Functional Requirements" checklist.

---

# 66. Universal Print & Letterhead Toggle Engine

> **Gap-fill note (v3.0):** Directly answers two requirements raised explicitly (not sourced from the cross-check document): (1) every report, invoice, challan, quotation, technician conveyance bill — every document and list in the system — needs a **Print** action, not just the existing 4-format Export (§49); (2) printing or exporting any outbound document must **ask whether to include the company letterhead header/footer**, instead of assuming it is always on. This also closes every scattered "[ ] Print" checklist line in the cross-check document (its §6 Voucher, §7 Day Book, §8 Cash Book, §11 General Ledger, §14 Sales, §15 Purchase, §32 P&L, and §43 UI Cross-Check sections all list Print separately from Export).

## 66.1 Print, Alongside Export

Every document and every report in the system — every Voucher (§61), Day Book/Cash Book/Bank Book (§62), General Ledger, Trial Balance, P&L, Balance Sheet, Customer/Supplier Statement, Advance Report, Loan Report, Payslip (§23), Quotation (§69), Invoice, Delivery Challan, Purchase Order, Technician Conveyance Bill (§16), Project Closure Report (§17), and every list/report screen in the application — gets, alongside the existing **Export ▾** control (CSV/PDF/DOCX/XML, §49), a distinct **Print** action. Print renders the exact same shared HTML/Handlebars template already used for the on-screen view and the PDF export (`architecture.md` §16) directly into the browser's (or mobile device's) native print dialog — visually identical to the PDF, but without generating or storing a file. This is implemented once, in the same shared `ExportMenu` component, not rebuilt per module.

## 66.2 The Letterhead Toggle

For any document that represents an **outbound business document** — one that leaves the company or goes in front of a customer/vendor/technician (Quotation, Invoice, Delivery Challan, Purchase Order, Customer Statement, Supplier Statement, and a Technician Conveyance Bill or Project Closure Report at the moment it's handed over for customer sign-off) — triggering Print or PDF Export shows a one-time **Print Options** prompt:

```text
Include company letterhead header/footer?

[ Yes, include letterhead ]     [ No, plain print ]

☐ Remember my choice for this document type
```

- **Yes** wraps the document in the branded header (logo, company name, address, contact, trade license/BIN where applicable) and footer (page number, generated-by/date stamp, authorized-signature line) already implied by "the company's own letterhead" language (`architecture.md` §1.13, PRD §2) — now an explicit, user-controlled choice rather than an always-on assumption.
- **No** renders the identical content on a plain white background with no header/footer branding — useful for internal working copies, draft review, or printing onto pre-printed physical letterhead paper (so the system's own header doesn't double up with the paper's existing print).
- The **"Remember my choice"** checkbox writes a per-user, per-document-type `PrintPreference` default (a lightweight preference row, the same per-user-preference pattern already established for `SavedFilter`, `architecture.md` §18) so a user who always wants letterhead isn't asked every time — the prompt itself always remains reachable to override that default, never fully hidden.
- Purely internal reports (Day Book, General Ledger, Trial Balance, P&L, Balance Sheet, Voucher Register, dashboards) skip the letterhead prompt entirely and print/export plain — letterhead only applies to documents meant to leave the building or go in front of a customer/vendor/technician for signature.

## 66.3 Where It Shows Up

The same shared `ExportMenu` component (`architecture.md` §16, §5) is extended with a "Print" item and, conditionally, the Print Options modal above — one implementation, reused everywhere, exactly like Export and Search/Filter already are.

## 66.4 Cross-Check Alignment

Closes every scattered "[ ] Print" checklist item across the cross-check document, and is the direct implementation of the two explicitly-raised print/letterhead requirements.

---

# 67. Data Edit & Delete Governance — Super Admin Approval Workflow

> **Gap-fill note (v3.0):** Directly answers the explicitly-raised requirement that **all data be editable/deletable only with Super Admin approval**. Generalizes §3.2's existing rule (posted financial entries are never hard-deleted; use reversal/adjustment) from "financial records only" to a platform-wide governance layer, and strengthens the cross-check document's own Rule 8 ("never change historical accounting results without an explicit migration/reconciliation process") from an audit-after-the-fact guarantee into an approval-before-it-happens one.

## 67.1 The Rule

Once any record has left `DRAFT` status under the existing Transaction State Model (§42) — i.e., it has been submitted, approved, or posted — **no one edits or deletes it directly**, regardless of role, including Accounts and Admin. Instead, the action creates an approval request that only a **Super Admin** can clear. Records still in `DRAFT` (a technician's own unsaved conveyance claim, an unsent Quotation, §69) remain freely editable/discardable by their owner — this governance layer starts at submission, not at first keystroke, consistent with the Draft-vs-Committed distinction already established for the Multi-Module Workspace (`architecture.md` §17).

## 67.2 New Approval Types

Extends `architecture.md` §10's `ApprovalType` enum with two new values, reusing the existing generic `ApprovalRequest` engine rather than building a parallel system:

```text
RECORD_EDIT_REQUEST
RECORD_DELETE_REQUEST
```

```text
ApprovalRequest (extended usage)
  type                 RECORD_EDIT_REQUEST | RECORD_DELETE_REQUEST
  refTable / refId     which record
  requestedFieldChanges  before/after JSON diff (reuses the field-level audit pattern, §35)
  reason               mandatory free-text — why the change/deletion is needed
  requestedById
  status               PENDING → APPROVED / REJECTED
  approverRole         fixed to SUPER_ADMIN regardless of what type of record this is —
                        the one deliberate exception to "configurable approver role per
                        type" in architecture.md §10
```

**Resolved (Phase 0, confirmed with Brother's Technology System) — Super Admin's own actions:** there is no role above Super Admin to serve as an independent approver, so **no approval gate applies to a Super Admin's own actions.** Any `ApprovalRequest` (of any `type` — `RECORD_EDIT_REQUEST`, `RECORD_DELETE_REQUEST`, or any other type in `architecture.md` §10's enum) where `requestedById` resolves to a Super Admin is created with `status = APPROVED` immediately, not `PENDING` — it never sits in anyone's approval inbox. This is a platform-wide exception, not specific to edit/delete governance, and generalizes `prd.md` §9.6's self-approval rule for the one role with no supervising role above it. This does **not** change who can approve *other* people's requests — Super Admin remains the approver of record for every other role's `RECORD_EDIT_REQUEST`/`RECORD_DELETE_REQUEST` (§67.2 above) and for whatever other `ApprovalRequest` types name Super Admin as approver elsewhere in this document set; only a Super Admin's own requests skip the gate.

## 67.3 What "Delete" Means Once Approved

- **Financial, inventory, loan, and advance records** — §3.2 still stands unmodified: an approved delete request triggers the appropriate reversal/cancellation mechanism instead of a hard delete (a Voucher Reversal per §61.6, a Credit/Debit Note per §11/§13, or a `CANCELLED` status per §42) — the audit trail always remains complete.
- **Non-financial master data with zero linked transactions** (a duplicate Customer record, a mistakenly-created Product with no purchase/sale history) — an approved delete performs an actual soft delete (`deletedAt` set, per `architecture.md` §22's existing soft-delete convention).

## 67.4 UI Behavior

Attempting to edit or delete a submitted record shows a **"Requires Super Admin approval"** notice in place of the normal Save/Delete button; filing the request is one click. The record itself carries an **"Edit pending approval"** / **"Delete pending approval"** badge, visible to anyone who could otherwise see that record, until the request is resolved. Super Admin sees these in the same **"My Approvals"** inbox already specified (`architecture.md` §10), filterable to this type, with a before/after diff view for edit requests.

## 67.5 What This Does Not Change

This adds a mandatory Super-Admin checkpoint on top of whatever access a role already has under the existing permission model (§40) — it never grants a role visibility or access it didn't already have. A role that could never see a record still can't request to edit or delete it.

## 67.6 Cross-Check Alignment

Directly answers the explicitly-raised requirement, and strengthens the cross-check document's §38/§39 (Audit Trail / Update & Delete History) and Rule 8 beyond what audit logging alone provides.

---

# 68. Universal Report & Dashboard Drill-Down Standard

> **Gap-fill note (v3.0):** Directly answers the explicitly-raised requirement that reporting be available **point/topic/module-wise in a detailed view** — every summary figure anywhere in the system must be clickable through to the transactions that produced it. This also satisfies the cross-check document's repeated "Drill-down to voucher" / "drill-down to ledger" checklist items (its §7 Day Book, §11 General Ledger, and §32 P&L).

## 68.1 The Principle

Every number shown anywhere — a dashboard stat card (§38/§39), a P&L/Balance Sheet/Trial Balance line (§37), a chart data point, an aging-bucket cell, a Profit Leakage line (§31), a KPI (§54) — must be clickable through to the exact list of underlying transactions that produced it. A summary number with no path to its source detail is a specification defect, the same severity already assigned to an unlabeled INTERIM/FINAL P&L figure (§59.4).

## 68.2 Three Tiers, Applied Uniformly

```text
1. Summary          the dashboard/report number itself
        ↓ click
2. Breakdown         a filtered list (reuses the Search & Filter standard, §50),
                     pre-filtered to exactly the accounts/date-range/dimension
                     that produced that number
        ↓ click a row
3. Source Document   the original Voucher (§61) / Invoice / Bill / Journal Entry itself
```

Example: clicking "Technician Cost ৳340,000" on a Project P&L (§17) opens the Breakdown list of every `ConveyanceBill` plus reconciled `TechnicianAdvance` line that summed to that figure; clicking any row opens the originating voucher.

## 68.3 Scope

Every report in the 100% P&L Coverage Matrix (§60) and every report added in §62 (Day Book, Cash Book, Bank Book, Receipt & Payment Statement) inherits this standard automatically — it is a cross-cutting API/UI contract, not a per-report feature to design separately, exactly as Search/Filter (§50) and Export (§49) are already specified as "implement once."

## 68.4 API Contract

Every report/dashboard endpoint that returns an aggregate figure also carries enough of its original filter/aggregation key (account ID range, date range, dimension IDs) for the frontend to call straight through to the Breakdown list without guessing — e.g. a P&L endpoint's "COGS" figure carries what the General Ledger endpoint needs to be called, filtered to exactly that range.

## 68.5 Cross-Check Alignment

Closes the explicitly-raised reporting requirement and every "drill-down" checklist item scattered through the cross-check document.

---

# 69. Quotation-to-Cash Document Suite — Full Specification

> **Gap-fill note (v3.0):** Directly answers the explicitly-raised requirement that **Quotation creation** be a complete, standalone capability, not merely an arrow in a workflow diagram. Quotation is already named as Module 9 in `architecture.md` and referenced in `prd.md` §8.4/§9.2, but neither source document gives it field-level or lifecycle detail — this section completes it. (This is not a cross-check-document gap: Quotation is a pre-revenue sales document outside the generic accounting cross-check's scope entirely, since no accounting entry occurs at this stage — see §69.2.)

## 69.1 Quotation Fields

```text
Quotation
  id
  quotationNumber        prefix QT-, same scheme as §61.5
  customerId
  branchId
  quotationDate
  validUntil
  lineItems[]             product/service, description, quantity, unitPrice, discount%, taxRateId
  subtotal
  discountTotal
  vatTotal
  grandTotal
  termsAndConditions
  salesExecutiveId
  status                  DRAFT → SENT → ACCEPTED → REJECTED → EXPIRED → CONVERTED
  convertedToSalesOrderId
```

## 69.2 No Accounting Posting at This Stage

Consistent with §60's Module 9 row ("Pre-revenue; posts nothing until converted"), a Quotation never touches the Journal (§5) — this section exists purely to make the document-generation and lifecycle side complete, since printing and sending it to a customer is the actual point of "Quotation making."

## 69.3 Document Generation, Print & Letterhead

Uses the same branded template system as Invoice/Challan (`architecture.md` §16), and gets the full Print + 4-format Export control from §66 — including the Letterhead Toggle. Because a Quotation is, by definition, an outbound customer-facing document, its letterhead default is **Yes**, but remains user-togglable per §66.2 like every other outbound document.

## 69.4 Conversion

Accepting a Quotation converts it 1:1 into a Sales Order (`architecture.md` §9.2), copying every line item exactly — no re-keying — and stamps the Quotation `CONVERTED` with a link to the resulting Sales Order, closing the loop already described in PRD §9.4.

## 69.5 Expiry

A Quotation past its `validUntil` date with no customer decision auto-transitions to `EXPIRED` via a scheduled background job (reusing the existing BullMQ infrastructure, `architecture.md` §3) and is excluded from the Sales pipeline's "open" counts.

## 69.6 Reports

```text
Quotation Register          all quotations, status, value, conversion rate
Win/Loss Report              Accepted+Converted vs. Rejected+Expired,
                              by sales executive/branch/product
```

Both feed the Sales Executive dashboard (`ui.md` §12.4) and get Print + 4-format Export (§66).

## 69.7 Cross-Check Alignment

Not a cross-check-document item — added because Quotation creation was separately and explicitly flagged as a must-have, standalone requirement that should not be assumed "already covered" by a one-line arrow in a workflow diagram.

---

# 70. Cross-Check Alignment Matrix

Maps every numbered section of `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` to exactly where it is now addressed in this document (or explicitly flagged as an open item), mirroring the traceability already established by §60's 65-module P&L coverage matrix.

| Cross-Check § | Topic | Status Before v3.0 | Now Addressed In |
|---|---|---|---|
| §4.1 | Double-Entry Accounting Engine | Existed | §2, §5; reinforced by §61 |
| §5 | Chart of Accounts (hierarchy, control accounts) | Partial | §65 (new) |
| §6 | Voucher Management (12 types) | Missing | §61 (new) |
| §7 | Day Book | Missing | §62.1 (new) |
| §8 | Cash Book | Partial (§25) | §62.2 (new) |
| §9 | Bank Book / cheque lifecycle | Partial (§24, §25) | §62.3 (new) |
| §10 | Receipt & Payment Statement | Missing | §62.4 (new) |
| §11 | General Ledger | Existed | §37.1; drill-down via §68 |
| §12 | Accounts Receivable | Existed | §11 |
| §13 | Accounts Payable | Existed | §13 |
| §14 | Sales Module | Existed | §6 |
| §15 | Purchase Module | Existed | §7 |
| §16 | Inventory & Stock Accounting | Existed | §7 |
| §17 | Expense Management | Existed | §9 |
| §18 | VAT & Tax | Existed | §55 |
| §19 | Fixed Asset Management | Existed | §56 |
| §20 | Payroll / Salary | Existed | §23 |
| §21 | Advance & Prepayment | Existed | §15, §19, §20 |
| §22 | Loan Management | Existed | §19, §21 |
| §23 | Investment Management | Partial | §22; non-current-asset variant flagged in §65.3 |
| §24 | Commission Management | Missing | Deferred, §65.5 — confirmed not built in initial scope |
| §25 | Suspense Account Management | Missing | §63 (new) |
| §26 | Cost Center & Department | Existed (branch/dept/head/project) | §65.2 formalizes as `costCenterDimensions` |
| §27 | Budget Management | Existed | §33 |
| §28 | Fiscal Year & Accounting Period | Existed | §36, §57.2 |
| §29 | Year-End Closing | Missing | §64 (new) |
| §30 | Financial Reports (Day/Cash/Bank Book etc.) | Partial | §62, §37 |
| §31–34 | Trial Balance / P&L / Balance Sheet / Cash Flow | Existed | §37.2–§37.5 |
| §35 | Dashboard | Existed | §38, §39 |
| §36 | User, Role & Permission (action-level) | Partial | §40; Edit/Delete action formalized in §67 |
| §37 | Approval Workflow | Existed | §34 |
| §38 | Audit Trail | Existed | §35 |
| §39 | Update & Delete History | Partial | §67 (new) — upgraded from audit-after to approval-before |
| §40–43 | Database / API / UI Cross-Check | Belongs to `architecture.md`, not this document | See `architecture.md` v3.0 |
| §44–45 | Accounting Validation Test Cases / Reconciliation Tests | A QA/test-plan artifact, not a product spec item | Recommend adopting verbatim as the acceptance-test suite at implementation time; reconciliation pairs echoed in §65.4 |
| §46–47 | Security / Backup | Existed | §51 |
| §48 | Existing Application Upgrade Rules | Not applicable — this platform is greenfield, not a retrofit of a live application | — |
| §49 | Recommended Implementation Priority | Existed, compatible | §72 (renumbered Implementation Priority) |
| §50–52 | Cross-check report template / Definition of Done / Developer Instruction | Build-time process guidance, not a spec requirement | Recommend adopting as the phase-by-phase QA sign-off checklist |

**Reading this table:** every row with "Missing" or "Partial" in v2.0 now has a "(new)" section in this v3.0 document, except two deliberately flagged as open items needing stakeholder confirmation (Commission Management, §24; the non-current "Investments/Tender/Pre-Production" asset categories, §65.3) rather than being silently built without evidence they're actually needed.

---

# 71. Month-End Management Report

A one-page management summary should show:

```text
MONTHLY FINANCIAL SUMMARY

Revenue                    ৳
COGS                       ৳
Gross Profit               ৳
Gross Margin               %

Operating Expense          ৳
Operating Profit           ৳

Other Income               ৳
Other Expense              ৳

NET PROFIT                 ৳
NET MARGIN                 %

Cash & Bank                ৳
Receivable                 ৳
Payable                    ৳
Customer Advance           ৳
Technician Advance         ৳
Employee Loan              ৳
Company Loan               ৳
Inventory                  ৳
```

Then:

```text
Top 10 Profitable Projects
Top 10 Loss Projects
Top 10 Low Margin Sales
Highest Expense Categories
AR Aging
AP Aging
Profit Leakage
```

---

# 72. Implementation Priority

Finance development should be phased.

## Phase 1 — Foundation

```text
COA
Account Groups
Journal Entry
Journal Lines
Fiscal Period
Basic Ledger
```

## Phase 2 — Sales & Purchase Accounting

```text
Sales Invoice
Customer Receivable
Purchase
Supplier Payable
Payment
Receipt
COGS
Inventory valuation integration
```

## Phase 3 — Service Finance

```text
Project Revenue
Technician Advance
Technician Expense
Conveyance
Project Cost
Project P&L
```

## Phase 4 — Loans & Investment

```text
Employee Loan
Employee Advance
Company Loan
Investment
Repayment
```

## Phase 5 — Payroll

```text
Payroll
Salary Payable
Deductions
Loan/Advance adjustment
Payment
```

## Phase 6 — Controls

```text
Approval Engine
Bank Proof
Audit
Period Closing
Budget
Margin Control
```

## Phase 7 — Management Intelligence

```text
P&L Dashboard
Cash Flow
Branch P&L
Department P&L
Project P&L
Profit Leakage
Forecast/variance analytics
```

---

# 73. Final Accounting Architecture

The complete finance chain should be:

```text
                    BUSINESS
                       |
        +--------------+--------------+
        |              |              |
       SALES       PROCUREMENT      SERVICE
        |              |              |
        v              v              v
     REVENUE        INVENTORY       PROJECT
        |              |              |
        |              v              |
        |             COGS <----------+
        |              |              |
        +--------------+--------------+
                       |
                 DIRECT COST
                       |
             +---------+---------+
             |                   |
          EXPENSE             PAYROLL
             |                   |
             +---------+---------+
                       |
                  ACCOUNTING
                     LEDGER
                       |
       +---------------+----------------+
       |               |                |
      P&L          BALANCE SHEET    CASH FLOW
       |
       +--------+----------+----------+
       |        |          |          |
     Branch  Department  Project    Head
       |
       v
PROFIT ANALYTICS
       |
       v
PROFIT LEAKAGE CONTROL
       |
       v
MANAGEMENT DECISION
```

---

# 74. Source Alignment

This specification is based primarily on the PRD requirements covering:

- Core accounting principles and ledger integration
- Chart of Accounts, ledger, trial balance, P&L and balance sheet
- Customer advances
- Company loans and investments
- Employee loans/advances
- Project and department/head-wise P&L
- Technician advances, expenses and conveyance
- Payroll, including Employee Payroll & Salary Self-Service (Module 64)
- Bank transaction proof, including the dedicated cheque/bank-account attachment requirement (Module 65)
- Approval engine
- Audit/security
- Universal exports
- Reporting and dashboards
- Tax/VAT, fixed assets, and multi-tenant/fiscal foundations implied by the architecture's data model and localization requirements

The source PRD explicitly establishes these requirements but does not prescribe every individual journal-entry mapping, every COA account number, every tax treatment, or every fiscal-closing rule. Those details must therefore be finalized in the project's accounting architecture before production implementation.

> **Gap-fill note (v2.0):** Modules 64 (Employee Payroll & Salary Self-Service) and 65 (Bank Transaction Proof) were added to `architecture.md` and `prd.md` "after initial requirements gathering" — v1.0 of this Finance spec predates that addition and only partially reflected them. Both are now fully incorporated: Module 64 in Sections 23 and 58, Module 65 in Section 24.

> **Gap-fill note (v3.0):** `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` was cross-checked against this document section-by-section; see §70 for the full alignment matrix. Four additional requirements were raised directly (not sourced from that cross-check document) and are now incorporated: Universal Print on every document/report (§66), a company-letterhead header/footer toggle at print time (§66), Super-Admin-gated edit/delete governance for all data (§67), point/topic/module-wise drill-down on every report (§68), and a fully-specified standalone Quotation module (§69).

---

# 75. Accounting Success Criteria

The module should be considered successful when:

```text
✓ Every material financial transaction is traceable
✓ Every posted journal is balanced
✓ Revenue can be traced to source documents
✓ COGS can be traced to inventory/SKU cost
✓ Project costs can be traced to projects
✓ Technician advances can be reconciled
✓ Customer advances can be tracked from receipt to adjustment
✓ AR/AP balances are reproducible
✓ Bank/cheque transactions have required proof
✓ Financial records cannot be silently altered
✓ Branch/department/head/project P&L is available
✓ P&L, Balance Sheet and Cash Flow are internally consistent
✓ Profit leakage can be identified
✓ Reports can be exported
✓ Management can explain where profit was generated or lost
```

**Added in v2.0:**

```text
✓ Every project's interim P&L converges to its final P&L at closure — no residual gap (Section 59)
✓ Every technician advance/conveyance shortfall or excess reaches payroll exactly once (Section 58)
✓ VAT payable/receivable reconciles to the VAT accounts without manual adjustment (Section 55)
✓ Depreciation is posted on schedule and reflected in Net Profit before month-end close (Section 56)
✓ Every entity carries tenantId/branchId so a future multi-branch or multi-entity rollout never requires a data migration (Section 57)
✓ Every one of the 65 platform modules has a named, non-overlapping landing point in the P&L (Section 60)
```

---

# 76. Golden Rule

The Accounting & Finance module should follow one fundamental rule:

> **No money movement, stock movement, service cost, advance, loan, investment, payroll transaction, or financial adjustment should remain outside the accounting trail.**

The objective is not merely to display a Net Profit number.

The objective is to make that number **traceable, auditable, reproducible, and actionable**.

```text
SOURCE TRANSACTION
      ↓
VALIDATION
      ↓
APPROVAL
      ↓
ACCOUNTING ENTRY
      ↓
LEDGER
      ↓
P&L / BALANCE SHEET / CASH FLOW
      ↓
PROJECT / BRANCH / DEPARTMENT / HEAD ANALYSIS
      ↓
PROFIT LEAKAGE DETECTION
      ↓
MANAGEMENT ACTION
```
