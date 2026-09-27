# FEATURE UPDATE GUIDELINE
## Delivery Challan + Warehouse Damage & Loss Management
### Brother's Technology System

**Document Type:** Feature Update / Upgrade Guideline  
**Purpose:** Extend the existing application without duplicating existing modules, models, APIs, workflows, permissions, inventory logic, accounting logic, or UI patterns.  
**Target:** AI coding agents / Claude Code / human development team  
**Status:** Implementation Guideline  
**Version:** 1.0  
**Date:** 2026-09-08

---

# 1. PURPOSE

This document defines how to upgrade the existing Brother's Technology System application with two tightly related capabilities:

1. **Advanced Delivery Challan Management**
   - Multiple/partial challans against one Sales Order/Project.
   - Inventory deduction at challan confirmation/dispatch.
   - Per-line ordered, reserved, challaned, returned, net delivered and remaining quantities.
   - Partial/full return against a specific challan.
   - Serialized/batch-aware return.
   - Challan reconciliation before final billing/project closure.
   - No forced invoice creation when a challan is created.

2. **Damage & Loss Management**
   - Warehouse-originated damage.
   - Warehouse-originated lost stock.
   - Technician/project-originated damage/loss must remain linked to the existing ProductCustody workflow, not duplicated.
   - Customer-returned damaged goods must reuse the existing return flow and inventory lifecycle.
   - Approval, evidence, disposition, accounting impact and audit trail.
   - Stock adjustment must be traceable and never silently alter inventory.

The implementation must be an **extension of the existing architecture**, not a second inventory/challan system.

---

# 2. SOURCE-OF-TRUTH RULE

Before changing code, the implementation agent MUST inspect the current repository and use the existing application as the source of truth.

Required inspection order:

1. Existing database schema / Prisma schema.
2. Existing Inventory module.
3. Existing Sales Order module.
4. Existing Delivery Challan implementation.
5. Existing StockLedger / StockAdjustment / StockTransfer logic.
6. Existing SerialNumber / Batch logic.
7. Existing SKU Lifecycle Tracking.
8. Existing ProductCustody / Technician workflow.
9. Existing ApprovalRequest / approval engine.
10. Existing accounting posting/reversal logic.
11. Existing AuditLog.
12. Existing RBAC/permission system.
13. Existing document generation / print / export.
14. Existing search/filter/list/detail UI patterns.
15. Existing tests.

Do NOT create a new model/API/component when an existing reusable implementation already provides the required capability.

If an existing feature already performs part of the requested operation, extend it.

---

# 3. EXISTING CAPABILITIES THAT MUST BE REUSED

The existing specification already defines:

- Quotation → Sales Order → Delivery Challan → Invoice → Payment.
- Inventory reservation after Sales Order confirmation.
- Stock ledger, stock adjustment and stock transfer.
- Batch and serial tracking.
- SKU Full Lifecycle Tracking.
- ProductCustody with assigned/used/returned/damaged/lost/sold states.
- ServiceAssignment and project closure.
- Generic ApprovalRequest engine.
- Accounting auto-posting.
- Audit logging.
- Search/filter on module list screens.
- Universal document export/print.
- Edit/delete governance requiring Super Admin approval after submission.
- Universal report/dashboard drill-down.

Therefore:

**DO NOT create:**

- `NewInventory`
- `NewStockLedger`
- `NewChallanInventory`
- `NewTechnicianProductCustody`
- `NewApprovalSystem`
- `NewAuditSystem`
- `NewAccountingPostingSystem`
- `NewSKUHistorySystem`

unless repository inspection proves the existing implementation is missing the required abstraction.

---

# 4. CORE BUSINESS PRINCIPLE

The system must distinguish between:

### A. Physical movement

A Delivery Challan means goods physically leave a warehouse/location.

Therefore:

**Confirmed/Dispatched Challan → inventory quantity decreases from the source warehouse.**

### B. Commercial billing

A Delivery Challan does NOT automatically mean an Invoice.

Therefore:

**Challan ≠ Invoice**

A project may have:

- multiple challans,
- partial delivery,
- product returns,
- installation work,
- additional approved usage,
- customer advances,
- progressive invoices,
- one final consolidated invoice.

---

# 5. TARGET END-TO-END WORKFLOW

```text
Quotation
   ↓
Sales Order / Project
   ↓
Inventory Reservation
   ↓
Delivery Challan #1
   ↓
Inventory Deduction
   ↓
Delivery Challan #2
   ↓
Inventory Deduction
   ↓
Delivery Challan #3
   ↓
Inventory Deduction
   ↓
Optional Return against Challan
   ↓
Inventory Add-back / QC Routing
   ↓
Installation / Field Service
   ↓
Project Completion
   ↓
Challan Reconciliation
   ↓
Progressive Invoice OR Final Consolidated Invoice
   ↓
Payment
   ↓
Project P&L
   ↓
Project Closed
```

---

# 6. DELIVERY CHALLAN — FUNCTIONAL UPDATE

## 6.1 One Sales Order → Many Challans

The system MUST support:

```text
Sales Order SO-1001
    ├── DC-1001
    ├── DC-1002
    ├── DC-1003
    └── DC-1004
```

Each challan can contain only a portion of the Sales Order quantity.

Example:

```text
Ordered Camera = 100

DC-1001 = 30
DC-1002 = 40
DC-1003 = 30

Total Challaned = 100
Remaining = 0
```

The system must never assume one Sales Order has only one Delivery Challan.

---

# 7. SALES ORDER LINE QUANTITY CONTROL

Every product line must expose at minimum:

```text
Ordered Qty
Reserved Qty
Challaned Qty
Returned Qty
Net Delivered Qty
Remaining Qty
```

Recommended calculation:

```text
Net Delivered Qty
    = Challaned Qty - Accepted Return Qty
```

```text
Remaining Qty
    = Ordered Qty - Net Delivered Qty - Cancelled Qty
```

Do not allow negative values.

The UI must clearly show:

```text
Camera
Ordered:       100
Reserved:      100
Challaned:      70
Returned:        5
Net Delivered:  65
Remaining:      35
```

---

# 8. CHALLAN STATUS MODEL

Reuse the existing status model if present.

If current implementation lacks the required states, extend it rather than creating a second status system.

Recommended conceptual states:

```text
DRAFT
CONFIRMED
DISPATCHED
PARTIALLY_RETURNED
FULLY_RETURNED
CLOSED
CANCELLED
```

Important:

- DRAFT does not affect stock.
- CONFIRMED/DISPATCHED must follow the existing inventory posting rule.
- RETURN must create an inventory transaction.
- CLOSED means no further operational changes without governed reversal/edit flow.

---

# 9. INVENTORY DEDUCTION RULE

When a Delivery Challan becomes the application's stock-impacting state:

```text
Warehouse Available Stock
        ↓
      -Qty
        ↓
Stock Ledger / Inventory Transaction
        ↓
SKU Lifecycle Event
```

For serialized products:

```text
Warehouse
   ↓
Reserved
   ↓
Delivered / Issued
```

For batch/non-serialized products:

```text
Warehouse Qty
   ↓
- Delivered Qty
```

The implementation MUST use the existing inventory transaction/ledger service.

Do not directly execute ad-hoc quantity updates from the Challan controller.

---

# 10. ATOMIC TRANSACTION REQUIREMENT

Challan confirmation/dispatch and inventory deduction MUST be atomic.

Example:

```text
BEGIN TRANSACTION

Validate permission
Validate challan status
Validate source warehouse
Validate available/reserved quantity
Validate serial numbers
Create/confirm challan movement
Post inventory ledger transaction
Update inventory balance
Create SKU lifecycle events
Create audit log

COMMIT
```

If any operation fails:

```text
ROLLBACK EVERYTHING
```

Never allow:

```text
Challan = Confirmed
Stock = Not Deducted
```

or:

```text
Stock = Deducted
Challan = Failed
```

---

# 11. PARTIAL CHALLAN CREATION

When creating a new challan from a Sales Order, the UI must automatically calculate the remaining quantity.

Example:

```text
Sales Order:
Camera       Ordered 100
NVR          Ordered 10
HDD          Ordered 20

Already delivered:
Camera 60
NVR 6
HDD 12

New Challan available:
Camera 40
NVR 4
HDD 8
```

The user can choose:

```text
Camera 20
NVR 2
HDD 5
```

System must reject quantities greater than the currently allowable quantity unless an authorized business rule explicitly permits over-delivery.

---

# 12. CHALLAN RETURN MANAGEMENT

A return MUST be created against the original Delivery Challan.

Preferred UI:

```text
Delivery Challan
DC-1001

Actions:
[View]
[Print]
[Return]
[Export]
[History]
```

Clicking Return opens:

```text
Return against DC-1001

Product        Challaned   Already Returned   Return Now
Camera             30             2              [ 4 ]
NVR                 3             0              [ 0 ]
HDD                 6             1              [ 1 ]
```

Never allow return quantity greater than:

```text
Original Challaned Qty - Previously Accepted Return Qty
```

---

# 13. RETURN INVENTORY EFFECT

Example:

```text
Warehouse before challan:
Camera = 100

Challan:
Camera = 40

Warehouse after challan:
Camera = 60

Return:
Camera = 5

Warehouse after return:
Camera = 65
```

The system must create a traceable inventory transaction:

```text
RETURN_AGAINST_CHALLAN
Reference: DC-1001
Qty: +5
Source: Customer/Site
Destination: Warehouse
```

The original Challan must remain unchanged historically.

Do not overwrite the original challan quantity.

Instead:

```text
Challaned = 40
Returned = 5
Net Delivered = 35
```

---

# 14. RETURN CONDITION / QC

A returned product must NOT automatically become sellable stock.

Return flow:

```text
Challan Return
      ↓
Return Received
      ↓
QC
 ┌────┼───────────┐
 ↓    ↓           ↓
GOOD  DAMAGED   FAULTY
 ↓      ↓           ↓
Stock   Damage     Repair/RMA
```

Recommended condition values:

```text
GOOD
OPENED_GOOD
DAMAGED
FAULTY
MISSING_PARTS
```

Inventory destination must be determined by condition.

Example:

```text
GOOD
→ Available Stock

DAMAGED
→ Damaged Stock

FAULTY
→ Repair/RMA Stock

MISSING_PARTS
→ Quarantine / QC Hold
```

---

# 15. SERIALIZED PRODUCT RETURN

For serialized products, the user MUST select the exact serial numbers being returned.

Example:

```text
DC-1001

Camera:
SN001
SN002
SN003
SN004
...
SN030
```

Return:

```text
SN004
SN011
SN019
SN022
```

The system must validate that each serial:

- belongs to the relevant product,
- was actually delivered on the referenced challan,
- has not already been returned,
- is not currently installed/consumed unless an authorized workflow allows removal,
- is not already marked lost/scrapped.

---

# 16. BATCH-TRACKED PRODUCT RETURN

For batch-tracked products:

```text
Product
Batch Number
Delivered Qty
Return Qty
Condition
```

The system must retain batch identity.

Do not convert batch-tracked inventory into anonymous stock.

---

# 17. SKU LIFECYCLE INTEGRATION

The existing SKU Lifecycle system MUST remain the single lifecycle history.

Examples:

### Normal delivery

```text
WAREHOUSE_IN
→ RESERVED
→ SOLD
→ DELIVERED
→ INSTALLED
```

### Returned good product

```text
WAREHOUSE_IN
→ RESERVED
→ SOLD
→ DELIVERED
→ RETURNED_BY_CUSTOMER
→ QC_PASSED
→ WAREHOUSE_IN
```

### Returned damaged product

```text
WAREHOUSE_IN
→ RESERVED
→ SOLD
→ DELIVERED
→ RETURNED_BY_CUSTOMER
→ DAMAGED
```

### Lost product

```text
WAREHOUSE_IN
→ LOST
```

Do not create a separate parallel lifecycle history.

---

# 18. PROJECT / FINAL BILL RECONCILIATION

Before final project billing/closure, system must show:

```text
Sales Order
    ↓
All Challans
    ↓
All Returns
    ↓
Net Delivered
    ↓
Installed / Used
    ↓
Extra Approved Usage
    ↓
Billing
```

Project screen should provide:

```text
Ordered Value
Challaned Value
Returned Value
Net Delivered Value
Installed/Used Value
Extra Approved Value
Previously Invoiced
Customer Advance
Final Billable Amount
```

If undelivered quantity remains, show a warning.

Example:

```text
⚠ 12 units remain undelivered.

[Back]
[Close Project Anyway - Requires Permission]
```

Do not silently close.

---

# 19. PROGRESSIVE BILLING

The existing application supports customer advance/partial payment and progressive/milestone invoicing.

Do not create a new invoice system.

Invoices may be:

```text
Progress Invoice #1
Progress Invoice #2
Final Invoice
```

Final invoice must consider:

```text
Previous invoices
+ Current billable items
+ Approved extra items
- Returns/credit adjustments
- Advance adjustments
```

Exact accounting treatment must reuse the existing Finance/Invoice posting layer.

---

# 20. WAREHOUSE DAMAGE & LOSS — NEW FEATURE

Create a new functional capability under Inventory:

```text
Inventory
 ├── Stock Overview
 ├── GRN
 ├── Stock Transfer
 ├── Delivery Challan
 ├── Returns
 ├── Stock Adjustment
 ├── SKU Lifecycle
 └── Damage & Loss
```

This is a new business workflow, but it MUST reuse the existing inventory, lifecycle, approval and audit infrastructure.

---

# 21. DAMAGE & LOSS TYPES

At minimum:

```text
WAREHOUSE_DAMAGE
WAREHOUSE_LOST
```

Existing technician/project events should continue using:

```text
ProductCustody.status
```

with existing:

```text
DAMAGED
LOST
```

Customer-return damage should remain associated with the Challan Return + QC flow.

Do not create duplicate technician damage/lost records unless repository inspection proves the existing ProductCustody model cannot capture the required evidence/approval/disposition.

---

# 22. WAREHOUSE DAMAGE REPORT

Example:

```text
Damage & Loss
→ New Report
→ Warehouse Damage
```

Form:

```text
Warehouse:        Dhaka Main Warehouse
Product:          Hikvision Camera
Serial/Batch:     SN-XXXX
Quantity:         1
Date:             08-09-2026

Damage Type:      Physical Damage
Reason:           Handling Damage

Description:
Camera body damaged during warehouse movement.

Evidence:
[Upload Photo]

Reported By:
Warehouse User

Estimated Cost:
৳ 8,500

[Save Draft]
[Submit]
```

Submitted record must enter the existing approval system where approval is required.

---

# 23. WAREHOUSE LOST REPORT

Example:

```text
Warehouse: Dhaka Main Warehouse
Product: NVR 32CH
Serial: SN12345

Last Known Rack: A-12
Last Verified Date: 07-09-2026
Reported Date: 08-09-2026

Reason:
Physical stock count discrepancy

Description:
Unit could not be located during cycle count.

Evidence:
[Attachment]

Estimated Cost:
৳ 30,000
```

Recommended status:

```text
REPORTED
→ UNDER_INVESTIGATION
→ APPROVED_LOSS
or
→ FOUND
or
→ REJECTED
```

Only the approved final state should post the permanent inventory loss.

---

# 24. DAMAGE & LOSS STATUS

Recommended conceptual status:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
RECOVERED
REPAIRED
SCRAPPED
WRITTEN_OFF
CLOSED
```

Reuse the existing approval engine rather than creating another approval workflow.

---

# 25. DAMAGE DISPOSITION

After damage approval, user must choose a disposition:

```text
REPAIR
SUPPLIER_RMA
RETURN_TO_VENDOR
SCRAP
QUARANTINE
RECOVERABLE
```

Example:

```text
Damaged Camera
      ↓
Repair
      ↓
QC
 ┌────┴────┐
 ↓         ↓
PASS      FAIL
 ↓         ↓
Available  Scrap/RMA
```

---

# 26. LOST PRODUCT DISPOSITION

Lost product:

```text
Reported
   ↓
Investigation
   ↓
Found?
 ┌──┴──┐
YES    NO
 ↓      ↓
Return  Approved Loss
        ↓
        Inventory Write-off
        ↓
        Accounting Posting
```

Never physically delete the SKU/serial record.

The lifecycle remains permanently traceable.

---

# 27. INVENTORY ACCOUNTING INTEGRATION

Damage/loss must use the existing accounting posting architecture.

For an approved loss:

```text
Inventory Asset       CREDIT
Inventory Loss        DEBIT
```

Exact account names/codes must come from the configured Chart of Accounts.

Do not hard-code account IDs.

For damage:

- If merely moved to Damaged/Quarantine inventory, do not automatically treat the entire cost as an expense unless the business rule requires it.
- If scrapped/write-off occurs, post the applicable inventory loss/write-off entry.
- If repairable, track repair cost separately through the existing expense/cost mechanism.

---

# 28. NO SILENT STOCK ADJUSTMENT

A Damage/Lost event must NOT simply call:

```text
stock.quantity -= X
```

without a business document.

Correct:

```text
Damage/Loss Report
      ↓
Approval
      ↓
Inventory Transaction
      ↓
Stock Ledger
      ↓
SKU Lifecycle
      ↓
Accounting (if applicable)
      ↓
Audit Log
```

Every stock decrease must have a traceable reason/reference.

---

# 29. STOCK COUNT / STOCK TAKE INTEGRATION

Warehouse cycle count can detect discrepancies.

Example:

```text
System Qty = 100
Physical Qty = 97
Variance = -3
```

The system must NOT automatically mark the 3 units as lost.

Instead:

```text
Stock Count
→ Variance
→ Investigation
→ Damage/Loss Report OR Adjustment
→ Approval
→ Posting
```

If the existing StockAdjustment workflow is sufficient, reuse it and link the adjustment to the Damage/Loss reason.

---

# 30. DAMAGE/LOSS COST REPORTING

Reports should support:

```text
Warehouse-wise Damage
Warehouse-wise Loss
Product-wise Damage
Product-wise Loss
Serial-wise Loss
Batch-wise Loss
Month-wise Loss
Project-wise Damage
Technician-wise Damage/Loss
Employee-wise Recovery
Supplier/RMA Recovery
Scrap Value
Total Inventory Loss
```

Existing universal report drill-down must be reused.

Example:

```text
September Inventory Loss
৳ 3,30,000
       ↓ click
Breakdown
       ↓ click
LOSS-2026-001
       ↓ click
Source Damage/Loss Record
```

---

# 31. TECHNICIAN DAMAGE/LOSS — DO NOT DUPLICATE

Existing ProductCustody already supports:

```text
assigned
used
returned
damaged
lost
sold
```

Therefore technician damage/lost must continue through ProductCustody.

Enhancement may add:

```text
damageEvidence
lossReason
reportedAt
approvalRequestId
disposition
recoveryAmount
```

ONLY if those fields do not already exist and repository inspection confirms they are needed.

The system should show:

```text
Technician Custody
→ Damage/Loss action
→ Existing Approval Engine
→ Existing Inventory/Lifecycle
→ Accounting/Recovery where applicable
```

---

# 32. CUSTOMER RETURN DAMAGE — DO NOT DUPLICATE

Customer return must originate from:

```text
Delivery Challan
→ Return
→ QC
→ GOOD / DAMAGED / FAULTY
```

Do not create a second independent CustomerDamage module.

The Return record is the source document.

---

# 33. DATA MODEL GUIDELINE

Before adding tables, inspect existing models.

Likely reuse:

```text
SalesOrder
SalesOrderLine
DeliveryChallan
StockLedger
StockAdjustment
StockTransfer
SerialNumber
Batch
SKULifecycleEvent
ProductCustody
ApprovalRequest
JournalEntry
AuditLog
Document/Attachment
```

Potentially new entities ONLY if the current schema cannot represent the workflow:

```text
DeliveryChallanReturn
DeliveryChallanReturnLine
DamageLossReport
DamageLossLine
```

Do not create duplicate tables if equivalent tables already exist.

---

# 34. RECOMMENDED DELIVERY RETURN RELATIONSHIP

Conceptually:

```text
SalesOrder
   1
   |
   | many
   ↓
DeliveryChallan
   1
   |
   | many
   ↓
DeliveryChallanReturn
```

Each return line references the original challan line.

This allows:

```text
Original Qty
Returned Qty
Remaining Returnable Qty
```

without changing historical records.

---

# 35. RECOMMENDED DAMAGE/LOSS RELATIONSHIP

Conceptually:

```text
DamageLossReport
    |
    ├── Warehouse
    ├── Product
    ├── Serial / Batch
    ├── User
    ├── Reason
    ├── Evidence
    ├── Approval
    ├── Disposition
    ├── Inventory Transaction
    └── Accounting Reference
```

For warehouse stock, the source location is mandatory.

For serialized stock, serial number should be mandatory.

For quantity/batch stock, quantity + batch (where applicable) is mandatory.

---

# 36. API GUIDELINE

Reuse existing REST conventions and `/api/v1/`.

Do not introduce inconsistent routes.

Conceptual endpoints:

```text
GET    /api/v1/delivery-challans
POST   /api/v1/delivery-challans
GET    /api/v1/delivery-challans/:id
POST   /api/v1/delivery-challans/:id/confirm
POST   /api/v1/delivery-challans/:id/dispatch
GET    /api/v1/delivery-challans/:id/returns
POST   /api/v1/delivery-challans/:id/returns
GET    /api/v1/sales-orders/:id/delivery-summary
```

For Damage/Loss:

```text
GET    /api/v1/inventory/damage-loss
POST   /api/v1/inventory/damage-loss
GET    /api/v1/inventory/damage-loss/:id
POST   /api/v1/inventory/damage-loss/:id/submit
POST   /api/v1/inventory/damage-loss/:id/approve
POST   /api/v1/inventory/damage-loss/:id/reject
POST   /api/v1/inventory/damage-loss/:id/disposition
```

These are conceptual contracts. If equivalent routes already exist, extend them instead.

---

# 37. IDEMPOTENCY

All stock-impacting commands must be idempotent.

Especially:

```text
Confirm Challan
Dispatch Challan
Accept Return
Approve Damage/Loss
Post Inventory Adjustment
Post Accounting Entry
```

Double-clicking or retrying a request must NOT deduct stock twice.

Use the existing idempotency mechanism if already implemented.

---

# 38. PERMISSION GUIDELINE

Reuse RBAC and action-level permissions.

Recommended capabilities:

```text
CHALLAN_VIEW
CHALLAN_CREATE
CHALLAN_CONFIRM
CHALLAN_DISPATCH
CHALLAN_RETURN
CHALLAN_PRINT
CHALLAN_EXPORT

DAMAGE_LOSS_VIEW
DAMAGE_LOSS_CREATE
DAMAGE_LOSS_SUBMIT
DAMAGE_LOSS_APPROVE
DAMAGE_LOSS_REJECT
DAMAGE_LOSS_DISPOSITION
DAMAGE_LOSS_WRITE_OFF
DAMAGE_LOSS_EXPORT
```

Do not create a separate permission framework.

Warehouse staff should not automatically gain Finance approval rights.

---

# 39. EDIT/DELETE GOVERNANCE

Once a Challan, Return, Damage/Loss report or stock-impacting transaction is submitted/posted:

- No normal edit.
- No hard delete.
- Existing Edit/Delete Approval mechanism must apply.
- Reversal/correction must create a traceable opposite transaction where applicable.

Historical inventory records must remain auditable.

---

# 40. AUDIT REQUIREMENTS

Record:

```text
Who
What
When
Where
Before
After
Reason
Reference Document
Approval
```

Examples:

```text
DC-1001 confirmed by user X
Camera SN123 dispatched from Dhaka Warehouse

RET-1001 created by user Y
Camera SN123 returned against DC-1001

LOSS-1004 approved by user Z
NVR SN999 marked lost

INV-TXN-xxxx
Inventory reduced by 1

JE-xxxx
Inventory loss posted
```

Use existing AuditLog.

---

# 41. UI — DELIVERY CHALLAN LIST

Recommended columns:

```text
Challan No
Date
Sales Order
Customer
Project
Warehouse
Total Items
Net Delivered
Returned
Status
Created By
Actions
```

Filters:

```text
Date
Branch
Warehouse
Customer
Project
Sales Order
Status
Product
Serial
```

Reuse SearchFilterBar and SavedFilter patterns.

---

# 42. UI — SALES ORDER DELIVERY SUMMARY

Add a dedicated tab/section:

```text
Sales Order
SO-1001

Overview | Items | Challans | Returns | Invoice | Payments | Project | History
```

Challans tab:

```text
DC-1001   30 Camera   10 NVR    Dispatched
DC-1002   40 Camera   4 NVR     Dispatched
DC-1003   30 Camera   3 NVR     Draft
```

Summary cards:

```text
Ordered
Reserved
Challaned
Returned
Net Delivered
Remaining
```

---

# 43. UI — CHALLAN DETAIL

Show:

```text
Challan Number
Customer
Sales Order
Project
Warehouse
Date
Status
```

Items:

```text
Product | Ordered | Challaned | Returned | Net | Serial/Batch
```

Actions according to permission/status:

```text
Confirm
Dispatch
Return
Print
Export
History
```

Never show irrelevant actions.

---

# 44. UI — DAMAGE & LOSS DASHBOARD

Recommended cards:

```text
Damage This Month
Lost This Month
Damage Value
Loss Value
Pending Approval
Under Investigation
Repairable
Scrap
```

Main widgets:

```text
Warehouse-wise Loss
Product-wise Damage
Monthly Trend
Pending Approvals
Recent Incidents
```

Every number must support the existing drill-down standard.

---

# 45. UI — DAMAGE/LOSS DETAIL

Structure:

```text
Incident Header
    ↓
Product / Serial / Batch
    ↓
Warehouse / Location
    ↓
Reason
    ↓
Evidence
    ↓
Investigation
    ↓
Approval
    ↓
Disposition
    ↓
Inventory Impact
    ↓
Accounting Impact
    ↓
Audit History
```

This should be a detail page, not a simple form.

---

# 46. NOTIFICATION REQUIREMENTS

Use the existing notification framework if available.

Notify relevant users for:

```text
Damage/Loss submitted
Approval pending
Damage/Loss approved
Damage/Loss rejected
Large-value loss
Repeated warehouse loss
Return received
QC pending
Project final billing blocked by unresolved reconciliation
```

Do not build a second notification engine.

---

# 47. BUSINESS VALIDATIONS

## Challan

Reject if:

- Sales Order does not exist.
- Sales Order is cancelled/closed.
- Quantity exceeds allowed quantity.
- Warehouse does not have required stock/reservation.
- Serial number is invalid.
- Serial already delivered/returned.
- User lacks permission.

## Return

Reject if:

- Challan is invalid.
- Return quantity exceeds returnable quantity.
- Serial was not on the challan.
- Serial was already returned.
- Product is already scrapped/lost.
- Warehouse destination is invalid.

## Damage/Loss

Reject if:

- Product does not belong to warehouse.
- Serial is not currently at warehouse.
- Quantity exceeds available quantity for a warehouse-originated incident.
- Duplicate open loss report exists for the same serial.
- Required evidence/reason is missing when policy requires it.

---

# 48. DUPLICATE PREVENTION

For serialized products:

```text
One active location/state
One unresolved loss incident
One accepted return for the same delivered unit
```

The system must prevent:

```text
Same Serial
→ Delivered
→ Returned
→ Lost
```

from being posted simultaneously.

State transitions must be validated against current SKU state.

---

# 49. STOCK AVAILABILITY RULE

Stock must be separated conceptually into:

```text
AVAILABLE
RESERVED
IN_TRANSIT / DISPATCHED
TECHNICIAN_CUSTODY
INSTALLED
DAMAGED
REPAIR
QUARANTINE
LOST
SCRAPPED
```

Do not count:

```text
DAMAGED
LOST
SCRAPPED
```

as sellable Available Stock.

Exact storage implementation must reuse the existing inventory architecture.

---

# 50. REPORTING REQUIREMENTS

Add reports only through the existing reporting engine.

Required reports:

### Challan

- Challan Register
- Sales Order Delivery Status
- Partial Delivery Report
- Return against Challan
- Customer Delivery Summary
- Warehouse Dispatch Summary
- Undelivered Order Report
- Project Delivery Reconciliation

### Damage & Loss

- Damage Register
- Loss Register
- Warehouse Loss Report
- Warehouse Damage Report
- Product-wise Damage/Loss
- Serial-wise Incident History
- Monthly Loss Value
- Damage by Reason
- Damage by Warehouse
- Technician Damage/Loss
- Recovery Report
- Scrap Report
- RMA/Repair Recovery Report

All reports must support existing:

```text
Search
Filter
Print
CSV
PDF
DOCX
XML
Drill-down
```

---

# 51. ACCOUNTING SAFETY

The application must never create an accounting entry merely because a draft document exists.

Recommended principle:

```text
Draft Challan
→ No stock posting

Confirmed/Dispatched Challan
→ Inventory posting

Return accepted
→ Inventory reversal/add-back

Damage report submitted
→ No final write-off yet

Damage approved + disposition requiring write-off
→ Inventory/accounting posting

Lost reported
→ No permanent write-off yet

Lost approved
→ Inventory/accounting posting
```

Reuse the existing Finance posting layer.

---

# 52. REVERSAL RULE

If a stock-impacting document needs correction:

Do NOT edit historical stock quantities directly.

Use:

```text
Original Transaction
      ↓
Approved Reversal
      ↓
Corrected Transaction
```

All reversals must preserve audit history.

---

# 53. PROJECT P&L IMPACT

The existing Project P&L system must be reused.

Potential impacts:

### Normal delivered/used product

COGS according to existing ProductCustody/COGS rules.

### Customer return

COGS/inventory treatment must follow the existing return/accounting policy.

### Warehouse damage/loss

Normally this is a company inventory loss, not project COGS, unless explicitly linked to a project-specific incident.

### Technician damage/loss

May be a project/direct cost or recoverable amount depending on the existing business rule and approval outcome.

Do not mix warehouse loss into project P&L merely because the warehouse supplied the project.

---

# 54. ACCEPTANCE CRITERIA — CHALLAN

Feature is accepted only if all are true:

- One Sales Order supports many Challans.
- Partial quantities are supported.
- Remaining quantity is calculated automatically.
- Confirmed/dispatched Challan deducts inventory exactly once.
- Serial/batch validation works.
- Challan does not automatically create Invoice.
- Return can be created against a specific Challan.
- Partial return works.
- Return cannot exceed delivered quantity.
- Returned stock is added back only after the appropriate acceptance/QC state.
- Damaged return does not become available stock automatically.
- Full lifecycle is visible.
- Sales Order delivery summary reconciles all challans and returns.
- Final billing can use the consolidated reconciled data.
- Audit history is preserved.
- Existing permissions and approval rules are respected.

---

# 55. ACCEPTANCE CRITERIA — DAMAGE & LOSS

Feature is accepted only if all are true:

- Warehouse damage can be reported.
- Warehouse lost stock can be reported.
- Warehouse is mandatory.
- Serialized products support exact serial selection.
- Batch products retain batch identity.
- Evidence can be attached using existing file storage.
- Approval uses the existing Approval Engine.
- Approved loss can post inventory impact.
- Damage supports disposition.
- Repair/RMA/Scrap paths are distinguishable.
- Lost product is never hard-deleted.
- Damage/loss creates lifecycle history.
- Inventory ledger contains the reference.
- Accounting uses the existing posting layer.
- No silent stock adjustment occurs.
- Technician damage/loss reuses ProductCustody.
- Customer-return damage reuses Challan Return + QC.
- Reports support drill-down.
- Audit trail is complete.
- Role permissions are enforced.

---

# 56. TEST MATRIX

## Challan Tests

1. Create draft challan.
2. Draft does not affect stock.
3. Confirm challan.
4. Stock decreases exactly once.
5. Retry confirm request.
6. Stock must not decrease twice.
7. Create second partial challan.
8. Remaining quantity recalculates.
9. Attempt over-delivery.
10. System rejects unauthorized over-delivery.
11. Return partial quantity.
12. Stock increases correctly.
13. Return same quantity again.
14. System rejects duplicate return.
15. Return serialized item.
16. Return wrong serial.
17. System rejects wrong serial.
18. Return damaged item.
19. Damaged item goes to correct inventory state.
20. Final billing reconciliation.

## Damage/Loss Tests

1. Create warehouse damage.
2. Submit.
3. Approval pending.
4. Approve.
5. Inventory/lifecycle updates correctly.
6. Create warehouse loss.
7. Investigate.
8. Mark found.
9. Ensure no write-off.
10. Create another loss.
11. Approve loss.
12. Inventory decreases exactly once.
13. Accounting posts exactly once.
14. Retry approval.
15. No duplicate posting.
16. Serial cannot be simultaneously available and lost.
17. Attach evidence.
18. Audit history visible.
19. Technician damage continues through ProductCustody.
20. Customer-return damage continues through Return/QC.

---

# 57. MIGRATION SAFETY

Before migration:

1. Backup database.
2. Inspect existing schema.
3. Identify existing Challan records.
4. Identify existing stock ledger records.
5. Identify existing serial/batch records.
6. Identify existing ProductCustody records.
7. Ensure new fields/tables are backward compatible.
8. Do not rewrite historical transactions unless explicitly required.
9. Run migration in development/staging first.
10. Run regression tests.
11. Verify stock totals before and after migration.
12. Verify accounting balances before and after migration.

---

# 58. IMPLEMENTATION ORDER

Recommended implementation sequence:

```text
STEP 1
Repository/schema inspection

STEP 2
Map existing Challan + Inventory + Lifecycle services

STEP 3
Implement/extend Sales Order delivery summary

STEP 4
Implement multi-challan quantity reconciliation

STEP 5
Implement stock-impacting Challan transaction using existing inventory service

STEP 6
Implement Challan Return using existing inventory/lifecycle services

STEP 7
Implement Return QC routing

STEP 8
Implement Warehouse Damage/Loss capability

STEP 9
Connect Damage/Loss to existing Approval Engine

STEP 10
Connect Damage/Loss to existing Inventory Ledger

STEP 11
Connect Damage/Loss to SKU Lifecycle

STEP 12
Connect approved write-off to existing Finance posting

STEP 13
Build UI

STEP 14
Build reports/drill-down

STEP 15
Add tests

STEP 16
Run full regression

STEP 17
Verify inventory/accounting reconciliation

STEP 18
Update documentation
```

---

# 59. AI AGENT NON-DUPLICATION RULE

Any AI coding agent implementing this feature MUST follow this rule:

> **Before creating a new file, model, service, controller, API endpoint, hook, component, permission, status enum, inventory transaction type, accounting posting function, approval mechanism or lifecycle event, search the existing codebase for an equivalent capability. If an equivalent exists, extend/reuse it. If it does not exist, create the smallest new abstraction necessary and document why it could not be reused.**

The agent must never say:

```text
"I created a new DamageInventoryService"
```

if the repository already has a reusable:

```text
InventoryTransactionService
```

Likewise, it must not create:

```text
NewApprovalService
```

if `ApprovalRequest` already exists.

---

# 60. HANDOFF / CONTINUATION RULE FOR MULTIPLE AI AGENTS

A project may be implemented by multiple AI agents at different times.

Every agent MUST begin by reading:

```text
agent.md
feature-update.md
prd.md
architecture-2.md
```

and inspecting the current repository state.

After completing work, the agent MUST document:

```text
1. What was already implemented.
2. What files were changed.
3. What database migrations were added.
4. What APIs were added/changed.
5. What UI screens were added/changed.
6. What existing services were reused.
7. What business rules were implemented.
8. What tests were run.
9. What tests failed.
10. What remains incomplete.
11. Any known technical debt.
12. Any migration/rollback concern.
13. Exact next recommended step.
```

Do not restart a completed feature from scratch.

Do not replace a working implementation simply because another architecture looks cleaner unless there is a documented reason.

---

# 61. DEFINITION OF DONE

The feature is NOT considered complete merely because the UI exists.

It is complete only when:

```text
UI
 ↓
API
 ↓
Business Validation
 ↓
Database Transaction
 ↓
Inventory Ledger
 ↓
SKU Lifecycle
 ↓
Approval
 ↓
Accounting (where applicable)
 ↓
Audit Trail
 ↓
Reports
 ↓
Tests
```

all work consistently.

---

# 62. FINAL ARCHITECTURAL PRINCIPLE

The application must maintain **one source of truth for inventory**.

The correct conceptual architecture is:

```text
                    ┌─────────────────────┐
                    │     Sales Order     │
                    └──────────┬──────────┘
                               │
                     one-to-many
                               │
               ┌───────────────┼───────────────┐
               ↓               ↓               ↓
          Challan #1      Challan #2      Challan #3
               │               │               │
               └───────────────┼───────────────┘
                               ↓
                     Inventory Transaction
                               ↓
                         Stock Ledger
                               ↓
                       SKU Lifecycle
                               ↓
                  ┌────────────┴────────────┐
                  ↓                         ↓
              Installation              Return
                                            ↓
                                           QC
                                      ┌─────┼─────┐
                                      ↓     ↓     ↓
                                    Good Damage Faulty
                                      ↓     ↓     ↓
                                   Stock  Damage Repair/RMA


Warehouse Stock
      │
      ├── Damage Report → Approval → Inventory/Lifecycle → Disposition
      │
      └── Lost Report → Investigation → Approval → Inventory/Lifecycle → Write-off
```

**Core rule:**

> **Every physical inventory movement must have one authoritative transaction, one lifecycle history, one audit trail, and—when financially relevant—one accounting impact.**

This feature update must extend the existing Brother's Technology System architecture rather than introduce parallel implementations.
