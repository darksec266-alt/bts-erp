# REPORT FEATURE UPDATE GUIDELINE

## Reporting Catalog, Data Mapping, KPI & Drill-Down Standard

**Target Application:** Brother's Technology System  
**Document Type:** Feature Update / Upgrade Guideline  
**Version:** 1.0  
**Date:** 2026-09-08

---

## 1. Purpose

This document updates the reporting specification of the existing application.

**This is NOT a request to build a new reporting system.**

The existing PRD and Architecture already define Reporting & Analytics, Universal Report Export, Universal Print, Search/Filter, Dashboard, Drill-down reporting, Company-wide P&L, Project/Order-wise P&L, customer/technician/branch/product reporting, Department/Head-wise P&L and employee/technician performance visibility.

This update only adds and standardizes reports required by the expanded workflows:

1. Challan & Partial Delivery
2. Challan Return
3. Warehouse Damage & Lost
4. Employee Work Tracking & Performance
5. Operational reconciliation
6. Source-data traceability

The existing reporting engine, filter engine, export engine, print engine, dashboard components and universal drill-down architecture **MUST be reused**.

---

## 2. Source Documents

Before changing code, the AI agent MUST read:

- `prd.md`
- `architecture.md`
- `database.md`
- `feature-update.md`
- `employee-work-performance-feature-update.md`
- Existing accounting/finance specification
- Existing requirements/cross-check documents
- Existing report implementation in the repository

If filenames differ, use the repository's canonical equivalents.

---

## 3. Existing Reporting Principle

All reporting must follow:

```text
Dashboard / Report Total
        ↓
Breakdown
        ↓
Exact Source Records
        ↓
Source Document
        ↓
Underlying Transaction / Ledger
```

Every important total MUST be traceable.

Example:

```text
Inventory Loss = ৳250,000
        ↓
Loss Breakdown
        ↓
Damage/Lost Records
        ↓
Product / Serial
        ↓
Warehouse / Custody
        ↓
Inventory Transaction
        ↓
Approval / Accounting Entry
```

---

## 4. Non-Duplication Rule

The AI agent MUST NOT create a parallel:

- Report Engine
- Dashboard Engine
- Export Engine
- Print Engine
- Drill-down Engine
- Filter Engine
- Accounting Report Engine
- Employee Report Engine
- Inventory Report Engine

when an equivalent implementation already exists.

Required architecture:

```text
Existing Reporting Infrastructure
              +
New Report Definitions
              +
New Queries / Aggregations
              +
Existing Drill-down
              +
Existing Export / Print
```

---

## 5. Master Report Registry

If the application already has a report registry/configuration system, extend it.

Each report definition should conceptually contain:

```text
reportCode
reportName
module
description
dataSource
secondarySources
filters
columns
calculationRules
permissions
drillDownTarget
exportFormats
printSupported
dateBasis
organizationScope
branchScope
status
```

Do not create a new database table solely for this if an existing mechanism can support it.

Each report should be classified:

```text
EXISTING
DEFINED_NOT_IMPLEMENTED
ENHANCEMENT_REQUIRED
NEW_REPORT
DEPRECATED
```

The implementation agent must inspect the actual codebase before deciding.

---

# 6. Report Categories

Logical report navigation:

```text
REPORTS
├── Executive Dashboard
├── Sales
├── Quotations
├── Customers
├── Projects
├── Service
├── Technicians
├── Employees
├── Inventory
├── Challan & Returns
├── Damage & Lost
├── Purchase
├── Suppliers
├── Finance & Accounting
├── Accounts Receivable
├── Accounts Payable
├── Cash & Bank
├── Advances & Loans
├── Payroll
├── Tax / VAT
├── Fixed Assets
├── Department / Head
└── Audit & Activity
```

Use the existing UI navigation conventions.

---

# 7. Sales Reports

Required/reusable:

- Sales Order Register
- Sales Order Status
- Sales Order Outstanding
- Sales by Customer
- Sales by Product
- Sales by Branch
- Sales by Sales Executive
- Invoice Register
- Invoice Status
- Sales Return Register
- Sales Return Summary

### Sales Order Register

Columns:

```text
Order No
Order Date
Customer
Project
Sales Executive
Branch
Order Value
Tax
Discount
Net Value
Status
```

Drill-down:

```text
Sales Order
→ Order Lines
→ Challans
→ Returns
→ Invoice
→ Payment
```

---

# 8. Quotation Reports

Reuse the existing quotation module.

Required:

- Quotation Register
- Quotation Status
- Quotation Value
- Win/Loss Report
- Win/Loss by Sales Executive
- Win/Loss by Branch
- Win/Loss by Product
- Conversion Rate

Conversion:

```text
Converted Eligible Quotations
/
Eligible Quotations
× 100
```

Use the existing quotation eligibility rules.

---

# 9. Customer Reports

Required:

- Customer Register
- Customer Statement
- Customer Sales
- Customer Invoice
- Customer Payment
- Customer Advance
- Customer Advance Adjustment
- Customer Outstanding
- Customer Aging
- Customer Project Summary
- Customer Service Summary
- Customer Profitability

Advance report:

```text
Received
Adjusted
Refunded
Outstanding
```

Every amount must drill down to its source transaction.

---

# 10. Project Reports

Required:

- Project Register
- Project Status
- Project Revenue
- Project Cost
- Project Profit
- Project Margin
- Project P&L
- Project Expense
- Project Product Usage
- Project Challan
- Project Return
- Project Customer Advance
- Project Technician Cost
- Project Conveyance
- Project Closure
- Project Cost Reconciliation

Do not create a second profitability calculation.

Use the existing P&L model.

Conceptually:

```text
Project Revenue
− Applicable COGS
− Approved Direct Costs
− Approved Conveyance
− Applicable Technician Cost
− Other Direct Project Costs
= Project Profit
```

Exact accounting rules must follow the existing Finance/Architecture specification.

---

# 11. Service Reports

Required:

- Service Assignment Register
- Service Order Register
- Complaint Register
- Open Service
- In Progress Service
- Completed Service
- Pending Service
- Overdue Service
- Warranty Service
- Paid Service
- Service Response Time
- Service Resolution Time
- Service Cost
- Service Revenue
- Service Profitability
- Customer-wise Service
- Technician-wise Service

Reuse existing ServiceAssignment, ticket, SLA and service entities.

---

# 12. Technician Reports

Required:

- Technician Work Register
- Technician Service
- Technician Project Work
- Technician Completed Work
- Technician Pending Work
- Technician Overdue Work
- Technician Assignment
- Technician Product Custody
- Technician Product Usage
- Technician Product Return
- Technician Advance
- Technician Advance Outstanding
- Technician Conveyance
- Technician Expense
- Technician Damage/Lost
- Technician Project Contribution
- Technician Performance

Where reliable GPS/time data exists:

- Visits
- Time on Site
- Travel Distance

Do not create a second location tracking system.

---

# 13. Employee Work Reports

Implement the reporting requirements from `employee-work-performance-feature-update.md`.

Required:

### Employee Work Ledger

```text
Employee
Date
Activity Type
Reference
Customer
Project
Site
Start
End
Duration
Status
Outcome
Supervisor
Customer Acceptance
```

### Employee Assignment Report

```text
Assigned
Accepted
Started
In Progress
Completed
Verified
Customer Accepted
Closed
```

**Assigned ≠ Completed.**

### Employee Workload

```text
Employee
Assigned
In Progress
Pending
Overdue
Completed
```

### Employee Performance

```text
Total Assigned
Completed
Pending
Overdue
Completion %
On-Time %
Customer Acceptance %
Rework %
Average Response Time
Average Resolution Time
```

If the source data is insufficient, return `N/A`, not an invented zero.

---

# 14. Employee Project Contribution

Report:

```text
Employee
Project
Customer
Role
Tasks
Completed
Pending
Rework
Products Used
Site Visits
Hours (only when reliable)
```

Do not fabricate hours.

---

# 15. Employee Customer-wise Work

Answer:

> Which customers did this employee work for and how much?

Columns:

```text
Employee
Customer
Projects
Service Calls
Installations
Maintenance
Completed
Pending
Overdue
```

---

# 16. Employee Product Accountability

Reuse existing ProductCustody.

Show:

```text
Products Assigned
Products Used
Products Installed
Products Returned
Products Damaged
Products Lost
```

For serialized products:

```text
Product
Serial
Project
Custody
Usage
Return
Final State
```

No duplicate custody record.

---

# 17. Inventory Reports

Required/reusable:

- Stock Summary
- Current Stock
- Warehouse-wise Stock
- Branch-wise Stock
- Product-wise Stock
- Category-wise Stock
- Stock Movement
- Stock In
- Stock Out
- Stock Transfer
- Stock Adjustment
- Stock Valuation
- Low Stock
- Out of Stock
- Serial-wise Stock
- Batch-wise Stock
- SKU Current Status
- SKU Lifecycle Timeline
- Product Usage
- Product Return
- Product Custody

---

# 18. SKU Lifecycle Report

For serialized/batch units, show the existing lifecycle:

```text
PO Raised
→ GRN
→ Warehouse In
→ QC
→ Reserved
→ Issued
→ Sold
→ Delivered
→ Installed
→ Returned
→ Warranty
→ Repaired/Replaced
→ Damaged/Lost
→ Scrapped
→ Transferred
```

Use the existing immutable lifecycle history where available.

---

# 19. Challan Reports

This is an expanded reporting area.

Required:

- Challan Register
- Challan Detail
- Customer-wise Challan
- Project-wise Challan
- Warehouse Dispatch Report
- Challan Status
- Partial Delivery Report
- Full Delivery Report

### Challan Register

```text
Challan No
Date
Customer
Project
Sales Order
Warehouse
Destination
Status
Total Qty
```

### Challan Detail

```text
Product
SKU
Serial
Batch
Ordered Qty
Challaned Qty
Returned Qty
Net Delivered Qty
Remaining Qty
```

---

# 20. Challan Return Reports

Required:

- Challan Return Register
- Challan-wise Return
- Customer Return
- Project Return
- Product Return
- Serial-wise Return
- Batch-wise Return
- Return Reason
- Return Status
- Pending Return QC
- Returned Good
- Returned Damaged
- Returned Faulty
- Returned Scrap

---

# 21. Order → Challan → Return Reconciliation

This report is mandatory.

Columns:

```text
Sales Order
Product
Ordered
Challaned
Returned
Net Delivered
Remaining
```

Formula:

```text
Net Delivered = Challaned − Returned
Remaining = Ordered − Net Delivered
Delivery % = Net Delivered / Ordered × 100
```

Returned quantity must not continue to count as delivered.

---

# 22. Challan Outstanding Report

Show records where:

```text
Remaining Qty > 0
```

Columns:

```text
Customer
Project
Order
Challan
Product
Ordered
Delivered
Returned
Remaining
Days Outstanding
```

---

# 23. Damage & Lost Reports

Required:

- Damage Register
- Lost Register
- Damage/Lost Summary
- Warehouse-wise Damage
- Warehouse-wise Lost
- Product-wise Damage
- Product-wise Lost
- Serial-wise Damage
- Serial-wise Lost
- Batch-wise Damage
- Batch-wise Lost
- Project-wise Damage
- Project-wise Lost
- Employee-wise Damage
- Employee-wise Lost
- Technician-wise Damage
- Technician-wise Lost
- Monthly Damage/Lost
- Damage/Lost Value
- Scrap Value
- Recovery Value
- Supplier/RMA Recovery
- Inventory Loss Summary

---

# 24. Warehouse Damage Report

Answer:

> Which products became damaged while in warehouse custody?

Columns:

```text
Warehouse
Product
SKU
Serial/Batch
Quantity
Damage Date
Reason
Reported By
Approved By
Disposition
Value
```

Drill-down:

```text
Damage Record
→ Product
→ Serial/Batch
→ Warehouse
→ Inventory Transaction
→ Approval
→ Accounting Impact
```

---

# 25. Warehouse Lost Report

Answer:

> Which products were lost from warehouse custody?

Columns:

```text
Warehouse
Product
Serial/Batch
Quantity
Lost Date
Last Known Location
Reported By
Approved By
Recovery Status
Value
```

Do not automatically assign financial liability to an employee.

---

# 26. Damage/Lost Value Report

Show:

```text
Quantity
Unit Cost
Gross Loss Value
Recovered Value
Net Loss Value
```

Formula:

```text
Gross Loss = Quantity × Applicable Cost Basis
Net Loss = Gross Loss − Approved Recovery
```

Use existing inventory valuation/accounting rules for cost basis.

---

# 27. Employee/Technician Damage & Lost

Show:

```text
Employee/Technician
Products Issued
Used
Returned
Damaged
Lost
Damage Value
Loss Value
Recovered
Net Loss
```

This is an accountability report.

It is NOT automatically a payroll deduction.

---

# 28. Purchase Reports

Required/reusable:

- Purchase Order Register
- Purchase Order Status
- GRN Register
- Purchase Register
- Purchase Return
- Supplier-wise Purchase
- Product-wise Purchase
- Purchase Cost Analysis
- GRN Discrepancy
- Supplier Payment
- Supplier Outstanding

---

# 29. Supplier Reports

Required:

- Supplier Register
- Supplier Statement
- Supplier Purchase
- Supplier Payable
- Supplier Aging
- Supplier Payment
- Supplier Return
- Supplier/RMA Recovery

---

# 30. Finance & Accounting Reports

Reuse the existing accounting source of truth.

Required:

- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow
- Account Ledger
- Voucher Register
- Journal Register
- Receipt Register
- Payment Register
- Expense Register
- Adjustment Register
- Day Book
- Cash Book
- Bank Book
- Receipt & Payment Statement
- Suspense Account

Do not create a separate accounting report calculation engine.

---

# 31. Accounts Receivable

Required:

- Customer Receivable
- Customer Aging
- Invoice Outstanding
- Overdue Invoice
- Customer Advance
- Advance Adjustment
- Collection Report

---

# 32. Accounts Payable

Required:

- Supplier Payable
- Supplier Aging
- Overdue Payable
- Supplier Payment
- Supplier Outstanding

---

# 33. Cash & Bank Reports

Required:

- Day Book
- Cash Book
- Bank Book
- Receipt & Payment Statement
- Bank Transaction Register
- Cheque Register
- Bank-wise Transaction
- Cash Position
- Bank Position
- Missing Bank/Cheque Proof Report

Reuse existing bank/cheque proof governance.

---

# 34. Advances & Loans

### Technician

- Technician Advance Register
- Advance Issued
- Advance Adjusted
- Advance Outstanding
- Advance Reconciliation

### Employee

- Employee Advance
- Employee Loan
- Loan Outstanding
- Installment Schedule
- Salary Deduction

### Company

- Company Loan Register
- Loan Repayment
- Loan Outstanding
- Overdue Installments
- Investment Register

---

# 35. Payroll Reports

Where Payroll is implemented:

- Payroll Register
- Payroll Run
- Payslip
- Salary History
- Attendance Deduction
- Advance Deduction
- Loan Deduction
- Employee Net Pay
- Payroll Payment
- Payroll Accounting
- Project Advance-Conveyance Reconciliation

---

# 36. Tax / VAT Reports

Where supported by the existing tax/VAT module:

- Tax Register
- VAT Input
- VAT Output
- Tax Summary
- VAT Summary
- Return-ready Summary

Do not claim legal filing compliance unless actually implemented and validated.

---

# 37. Fixed Asset Reports

If the Fixed Asset module is implemented:

- Asset Register
- Asset Category
- Asset Acquisition
- Asset Assignment
- Depreciation
- Accumulated Depreciation
- Book Value
- Disposal

---

# 38. Department / Head Reports

Required:

- Department Revenue
- Department Cost
- Department Expense
- Department Profit
- Department P&L
- Head-wise Revenue
- Head-wise Expense
- Head-wise Profit
- Head-wise P&L
- Branch-wise P&L
- Comparative Department P&L

Use existing accounting dimensions.

---

# 39. Management Dashboard

Executive dashboard may show:

```text
Sales
Purchase
Collection
Receivable
Payable
Inventory Value
Project Revenue
Project Cost
Project Profit
Service Revenue
Service Cost
Employee Work
Technician Performance
Damage/Lost
Cash
Bank
Expense
Net Profit
```

Every supported card must be clickable to its breakdown/source records.

---

# 40. Audit & Activity Reports

Required:

- Audit Log
- User Activity
- Login History
- Approval History
- Record Edit History
- Record Delete Approval History
- Inventory Change History
- Financial Change History
- Employee Activity
- Document History

Reuse existing AuditLog and approval infrastructure.

---

# 41. Universal Filter Standard

Common filters where relevant:

```text
Date Range
Organization
Branch
Department
Employee
Technician
Customer
Supplier
Project
Service
Warehouse
Product
SKU
Serial
Batch
Status
```

Only display filters relevant to the report.

---

# 42. Date Basis

Every report must document which date controls the filter.

Examples:

```text
Sales → Invoice/Order Date according to report definition
Challan → Challan Date
Return → Return Date
Damage → Damage Date
Lost → Loss Date
Employee Work → Activity/Completion Date
Payment → Payment Date
Purchase → PO/GRN/Purchase Date
```

Do not silently mix dates.

---

# 43. KPI Rules

Every KPI must have a documented formula.

Examples:

```text
Completion %
= Completed Eligible Work / Eligible Assigned Work × 100

On-Time %
= On-Time Completed / Completed With Due Date × 100

Rework %
= Rework Jobs / Eligible Completed Jobs × 100

Delivery %
= Net Delivered / Ordered × 100

Project Profit
= Revenue − Applicable Costs

Net Inventory Loss
= Gross Loss − Approved Recovery
```

Use the exact domain rules already defined by the application.

---

# 44. N/A Rule

If source data is insufficient:

```text
N/A
```

Examples:

```text
No Due Date → On-Time = N/A
No Time Tracking → Hours = N/A
No Customer Acceptance Data → Acceptance = N/A
```

Never hide missing data behind `0`.

---

# 45. Cancellation Rule

Cancelled records must follow existing business rules.

Do not automatically count cancelled:

```text
Assignment
Order
Invoice
Challan
```

as completed or failed.

Keep statuses distinct:

```text
Cancelled
Completed
Pending
Rejected
Closed
```

---

# 46. Reassignment Rule

Employee reassignment must preserve history.

Example:

```text
Rahim
  ↓
Reassigned to Karim
```

Keep:

```text
Original Employee
New Employee
Date
Reason
Changed By
```

Do not overwrite historical assignment records.

---

# 47. Multi-Employee Attribution

If multiple employees work on one job:

```text
Primary
Assistant
Supervisor
```

reuse the existing assignment model.

Do not fabricate contribution percentages.

Prefer task-level attribution when the source data supports it.

---

# 48. Report Performance

Use existing:

- Pagination
- Server-side filtering
- Aggregation
- Indexes
- Caching
- Query/report services

Do not load the entire database into the browser.

Inspect `database.md` before adding indexes.

---

# 49. Financial Consistency

Financial reports must reconcile:

```text
Operational P&L
        ↕
Journal Entries
        ↕
Trial Balance
        ↕
Financial Statements
```

Project P&L must not become a second accounting truth.

---

# 50. Inventory Consistency

Inventory reports must derive from existing:

```text
Stock Ledger
SKU Lifecycle
ProductCustody
Challan
Return
Damage/Lost
Adjustment
Transfer
```

Do not maintain a separate stock balance only for reporting.

---

# 51. Reconciliation Tests

Examples:

```text
Total Warehouse Stock
=
Valid Stock Ledger / SKU balances

Net Delivered
=
Challaned − Returned

Project Profit
=
Revenue − Applicable Costs

Customer Outstanding
=
Invoices − Payments − Valid Adjustments

Inventory Loss
=
Approved Damage/Lost Quantity × Cost Basis − Recovery
```

Use exact existing domain/accounting rules.

---

# 52. Empty States

Every report must handle:

```text
No data
No permission
Invalid date range
No matching filter
Incomplete source data
```

Example:

```text
No records found for the selected filters.
```

---

# 53. UI Standard

Reuse existing:

```text
PageHeader
StatCard
FilterBar
DataTable
Tabs
StatusBadge
Chart
Drawer
Modal
ExportMenu
Print
Pagination
DrillDown
```

Recommended:

```text
Report Title
Description
Filters
KPI Cards
Chart / Summary
Detailed Table
Export / Print
Drill-down
```

Do not create a visually unrelated report system.

---

# 54. API Standard

Reuse the existing `/api/v1/` conventions.

Conceptual endpoints only:

```text
GET /api/v1/reports/sales
GET /api/v1/reports/projects
GET /api/v1/reports/service
GET /api/v1/reports/inventory
GET /api/v1/reports/challans
GET /api/v1/reports/challan-returns
GET /api/v1/reports/damage-loss
GET /api/v1/reports/employees/work
GET /api/v1/reports/employees/performance
GET /api/v1/reports/technicians/performance
GET /api/v1/reports/finance
```

If equivalent endpoints exist, extend them.

Do not create duplicate APIs.

---

# 55. Export & Print

Use the existing Universal Document Export Engine and Universal Print mechanism.

Where already supported:

```text
CSV
PDF
DOCX
XML
Print
```

Do not create report-specific export/print implementations.

---

# 56. Permission Standard

Reports must respect existing:

```text
Organization
Branch
Department
Team
Role
```

Recommended:

### Employee
Own permitted data.

### Supervisor
Team data.

### Manager
Department/branch data.

### Finance
Authorized financial reports.

### Admin
Authorized organization data.

### Super Admin
Full authorized scope.

UI hiding is not sufficient. API authorization is mandatory.

---

# 57. No Fabricated Data

Never calculate:

```text
Employee Hours
Employee Revenue
Employee Profit
Customer Acceptance
On-Time %
```

unless the underlying records support the calculation.

Missing source data must be:

```text
N/A
```

---

# 58. Report Versioning

If a report formula changes, record:

```text
Old Definition
New Definition
Effective Date
Reason
```

Historical financial reporting must remain reproducible according to accounting-period rules.

---

# 59. AI Agent Implementation Workflow

Before coding:

```text
1. Read agent.md
2. Read prd.md
3. Read architecture.md
4. Read database.md
5. Read feature-update.md
6. Read employee-work-performance-feature-update.md
7. Inspect existing reports
8. Inspect report engine
9. Inspect export/print
10. Inspect drill-down
11. Map source entities
12. Identify missing reports
13. Produce implementation plan
14. Implement only required changes
15. Run tests
16. Update report registry
17. Update documentation
18. Create handoff
```

The agent must first report:

```text
EXISTING REPORTS
MISSING REPORTS
REPORTS REQUIRING ENHANCEMENT
DUPLICATE REPORTS TO REUSE
NEW DATA REQUIRED
```

Do not blindly start creating report files.

---

# 60. Report Source Mapping

Before implementing a report, document:

```text
Report
 ↓
Primary Entity
 ↓
Related Entities
 ↓
Filters
 ↓
Aggregation
 ↓
Formula
 ↓
Drill-down
```

Example:

```text
Challan Reconciliation
 ↓
SalesOrder
 ↓
DeliveryChallan
 ↓
ChallanLine
 ↓
ChallanReturn
 ↓
Inventory/SKU
 ↓
Aggregation
 ↓
Report
```

---

# 61. Handoff Between AI Agents

Every agent finishing report work MUST leave:

```text
REPORT FEATURE:
Current Status:

COMPLETED REPORTS:
- ...

ENHANCED REPORTS:
- ...

NEW QUERIES:
- ...

FILES CHANGED:
- ...

DATABASE CHANGES:
- ...

API CHANGES:
- ...

UI CHANGES:
- ...

TESTS:
- ...

KNOWN ISSUES:
- ...

NOT IMPLEMENTED:
- ...

NEXT AGENT MUST START FROM:
- ...
```

The next agent MUST read the handoff and continue from the current state.

Never rebuild completed work.

---

# 62. Test Matrix

## Sales
- Sales Order Register
- Delivery status
- Invoice reconciliation

## Challan
- Challan Register
- Partial delivery
- Full delivery
- Return
- Multiple returns
- Order reconciliation
- Serial reconciliation

## Inventory
- Stock
- Movement
- Transfer
- Adjustment
- SKU lifecycle

## Damage/Lost
- Warehouse damage
- Warehouse lost
- Technician damage
- Employee damage
- Serial loss
- Batch loss
- Recovery
- Scrap

## Employee
- Assignment
- Completion
- Pending
- Overdue
- On-time
- Rework
- Customer acceptance
- Project contribution
- Product custody

## Finance
- GL
- Trial Balance
- P&L
- Balance Sheet
- Cash Flow
- AR
- AP
- Day Book
- Cash Book
- Bank Book

## Security
- Employee access
- Supervisor access
- Manager access
- Finance access
- Admin access
- Unauthorized API access

## Drill-down
Every supported summary must open the correct source records.

---

# 63. Acceptance Criteria

This update is complete only when:

- Existing report infrastructure is reused.
- Existing dashboard infrastructure is reused.
- Existing export engine is reused.
- Existing print engine is reused.
- Existing drill-down engine is reused.
- New Challan reports are available.
- Challan Return reports are available.
- Order/Challan/Return reconciliation works.
- Warehouse Damage/Lost reports are available.
- Technician Damage/Lost reports are available.
- Employee Work reports are available.
- Employee Performance reports are available.
- Inventory reports remain consistent.
- Project P&L remains consistent.
- Finance reports remain consistent.
- Customer reports remain consistent.
- Filters work.
- Date basis is correct.
- RBAC is enforced.
- Drill-down reaches source data.
- Export works.
- Print works.
- No duplicate reporting system is created.
- No duplicate inventory/accounting source is created.
- Tests pass.
- Documentation is updated.
- Agent handoff is recorded.

---

# 64. Final Architecture

```text
                    EXISTING BUSINESS MODULES
                              │
       ┌───────────┬──────────┼──────────┬───────────┐
       ↓           ↓          ↓          ↓           ↓
     Sales      Project     Service   Inventory   Finance
       │           │          │          │           │
       └───────────┴──────────┼──────────┴───────────┘
                              ↓
                     Existing Data Model
                              ↓
                    Existing Report Engine
                              ↓
                  ┌───────────┴───────────┐
                  ↓                       ↓
             Aggregation              Drill-down
                  ↓                       ↓
             KPI / Summary          Source Records
                  │                       │
                  └───────────┬───────────┘
                              ↓
                    Existing Export / Print
```

New features plug into the existing system:

```text
Challan
   ↓
Challan Reports
   ↓
Existing Report Engine

Challan Return
   ↓
Return/Reconciliation Reports
   ↓
Existing Report Engine

Damage/Lost
   ↓
Loss Reports
   ↓
Existing Report Engine

Employee Work
   ↓
Employee Performance Reports
   ↓
Existing Report Engine
```

## Final Rule

The reporting layer is NOT a place where business transactions are recreated.

Correct:

```text
Business Transaction
        ↓
Existing Source of Truth
        ↓
Report Query
        ↓
Calculation
        ↓
Report
        ↓
Drill-down
```

Incorrect:

```text
Business Transaction
        ↓
Copy data into report table
        ↓
Second stock/accounting/employee system
        ↓
Report
```

The application must preserve:

> **One source of truth, many reports.**

And:

> **Every important number must be explainable and traceable to the exact underlying business records.**
