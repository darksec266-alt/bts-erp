# Product Requirements Document (PRD)
## Brother's Technology System — Unified Business Management Platform

**Version:** 2.5 (Challan Return, Damage/Loss, Employee Performance & Admin Correction)
**Date:** September 8, 2026
**Source document:** architecture.md (v3.4) + Accounting_and_Finance_Full_Specification.md (v3.1)
**Status:** Draft for Review

**v2.0 revision note:** cross-checked against `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` plus four explicitly-raised requirements (universal print, company-letterhead toggle at print time, Super-Admin-gated edit/delete governance, and point/topic/module-wise report drill-down), on top of a fully-specified standalone Quotation module. Sections 1–7 and 9–16 are extended in place; Section 8 gains new subsections 8.21–8.27. Nothing from v1.0 was removed.

**v2.1 revision note:** `architecture.md` was updated to v3.1, adding **Nginx** as the mandatory production Edge / Reverse Proxy / TLS layer (its new Section 38, based on the companion `architecture_nginx.md`). This PRD's Section 11 (Technical Architecture Overview) and Section 8.17 (Security) are updated to reflect it. No business requirement, scope, or module change — this is an infrastructure-layer addition only.

**v2.2 revision note:** Closes gaps found in an independent PRD review. Corrected: the stale "63 modules" figure in Section 15 (now 71), the Finance-spec version reference in Section 1 (now correctly v3.1), and the Employee Loan interest value in Sections 8.7 and 14 (now interest-free, matching the stakeholder's direct confirmation — `architecture.md` itself still needs the same correction, see Section 14). Section 14's Draft Retention row is marked resolved (1 hour, per direct stakeholder confirmation). Section 14's Company Loan interest-accrual row is reworded to expose a real unresolved contradiction rather than presenting it as settled, and gains two new rows (Fiscal year convention, Foreign-currency/FX handling) carried over from open questions in the Finance spec that this PRD had not previously surfaced. Section 10 (Non-Functional Requirements) is expanded from a flat list into subsections with concrete draft targets — previously every NFR was qualitative only. New targets in Section 10 are marked **[Proposed]** and are starting points for stakeholder discussion, not decisions already made. This document still does not have access to `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, referenced repeatedly above — see the note at the end of Section 1.

**v2.3 revision note:** Closes gaps found in a follow-up 16-point requirements validation pass, with three stakeholder decisions now resolved: (1) Section 13's roadmap now specifies a minimal Posting/Ledger Stub in Phase 0, with the full Core Accounting build staying in Phase 6 — this closes a sequencing risk where Sales/Customer Advance/Service Ops (Phases 3–5) would otherwise auto-post into a ledger that didn't exist yet; (2) Section 10.5 now states MFA is mandatory for Super Admin and Accounts/Finance; (3) Section 9.6 now states an approver can never clear their own Edit/Delete Request, including Super Admin — which surfaces a new, more urgent version of Section 14's existing "Edit/Delete approver" question (see that row). Also added: a Role × Functional-Area permission matrix (Section 6.1); six previously-undocumented workflows (Section 9.7–9.12: Purchase/Sales Return, Stock Transfer, Warranty Decision, GRN Discrepancy, Technician Reassignment, Quotation Revision); financial-posting idempotency and a proposed rounding convention (Section 10.12); secrets-management and audit-scope additions (Sections 10.5, 10.4); missing notification triggers (Section 10.6); and a Goals line (Section 4) covering the three accounting-hygiene modules added in v2.0 that were never reflected there.

**v2.4 revision note — Service-Only Customer Workflow (Module 72):** adds support for a customer who calls in for **paid** service work with no prior purchase or active warranty from Brother's Technology System — the requested flow was Call → Ticket → Service Quotation → Customer Approval → Assignment → Technician → Field Work → Parts Used → Labour/Conveyance → Sign-off → Invoice → Payment → P&L → Closed. **Before adding anything, this revision checked the existing Section 9.3 (Complaint to Resolution) flow and the Section 9.1 (Service Order → Technician → Closure → P&L) flow against every step of that request — the result is that twelve of the fourteen steps already exist and are reused unchanged; only two things were actually missing:** (1) Section 9.3's flow assumed every ticket goes through a *serial/warranty check*, with no branch for a ticket that isn't tied to a prior purchase at all, and (2) there was no cost-approval gate before dispatching a technician on non-warranty work — reasonable for warranty repairs (free to the customer) but not for paid service (the customer needs to see and accept a price first). Module 72 is these two additions plus the explicit branch connecting them into the existing flow — not a parallel or duplicate workflow. See Section 8.28 for exactly what's new versus reused, and the rewritten Section 9.3 for the branched flow.

**v2.5 revision note — Challan Return, Warehouse Damage/Loss, Employee Performance, Admin correction:** built from five uploaded specification/guideline documents, read in full, cross-checked line-by-line against this PRD and `architecture.md` before anything was added, specifically to avoid duplicating machinery that already existed. Three new modules added: **Module 73 — Delivery Challan Return Management** (Section 8.29): a full return path for goods already delivered against a Challan, with condition-based routing (good stock / damaged / missing parts) and line-level Ordered/Challaned/Returned/Remaining tracking that didn't exist before. **Module 74 — Warehouse Damage & Loss Management** (Section 8.30): report → approve → dispose workflow for damage/loss discovered inside the warehouse specifically (distinct from Module 72's technician-custody damage handling — not a duplicate of it). **Module 75 — Employee Work & Performance Reporting Layer** (Section 8.31): explicitly a reporting/aggregation layer over existing `ServiceAssignment`/`Ticket`/`ProductCustody`/`Attendance` data, not a new transactional system — every KPI is calculated and drill-down-traceable, never manually edited, and shows `N/A` rather than a fabricated value when source data is insufficient. **One correction to an existing decision, applied with full transparency (not silently):** Section 6's Admin role is changed from "everything except system-level config" to permission-driven/configurable, per a security review that flagged the previous definition as too broad for this platform's financial sensitivity — Section 6 states exactly what changed and why, and explicitly requires a user-by-user permission migration matrix before this touches any real account. The five source documents also repeatedly referenced a sixth, `employee-work-performance-feature-update.md`, which was initially missing and was separately supplied and read in full before Module 75 was finalized.

---

## Table of Contents

1. [Introduction & Purpose](#1-introduction--purpose)
2. [Executive Summary](#2-executive-summary)
3. [Business Context](#3-business-context)
4. [Goals & Objectives](#4-goals--objectives)
5. [Scope](#5-scope)
6. [User Roles & Access Model](#6-user-roles--access-model)
7. [Core Design Principles](#7-core-design-principles)
8. [Functional Requirements](#8-functional-requirements)
9. [Key Workflows](#9-key-workflows)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Technical Architecture Overview](#11-technical-architecture-overview)
12. [Suggested Success Metrics](#12-suggested-success-metrics)
13. [Release Roadmap](#13-release-roadmap)
14. [Assumptions & Open Questions](#14-assumptions--open-questions)
15. [Risks & Mitigations](#15-risks--mitigations)
16. [Glossary](#16-glossary)

---

## 1. Introduction & Purpose

This document is the Product Requirements Document (PRD) for the full Business Management Platform planned for Brother's Technology System. It is built on top of the technical `architecture.md` (v3.1) and `Accounting_and_Finance_Full_Specification.md` (v3.1) documents — but instead of technical design, stack, and data-model detail, it focuses on business requirements, scope, user roles, and feature-level requirements.

This PRD can be used to:

- Align stakeholders on product scope and priority, and get sign-off.
- Guide the development team or Claude Code as a single source of truth for phase-by-phase builds.
- Help anyone new joining the project quickly understand the full product context.

Technical detail (Prisma schema, API contracts, sequence diagrams) remains in the original `architecture.md`; this PRD explains the "what and why," while the technical "how" belongs in `architecture.md`.

**Note on source completeness:** this PRD and `architecture.md` both cross-check against `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` (see the v2.0 revision note above) — that document itself has not been circulated alongside this PRD. Modules 66–71 and two Section 14 assumption rows (Sales Commission, Non-current asset categories) trace back to it; anyone continuing this review should request it directly rather than relying on this PRD's summary of its conclusions.

---

## 2. Executive Summary

Brother's Technology System sells technology products (hardware) along with installation, repair, and maintenance services. The goal of this platform is to bring inventory, sales, procurement, field service, finance, HR, and mobile operations into a single system of record: one PostgreSQL database, one API, and one permission model.

Once live, the platform will guarantee:

- Full SKU-level lifecycle traceability for every sold/used unit, from procurement through installation/warranty.
- 100% Profit & Loss visibility at every level — company-wide, project-wise, and department/head-wise.
- A complete technician field workflow — assignment, product custody, cash advance, conveyance bills, Admin/Accounts approval, and project closure — all rolled into project profitability.
- Full tracking of three money flows: customer advance/partial payments, company loans and investment, and employee advances/loans.
- An installable, role-scoped mobile app (PWA) with its own home screen per user role, with a future upgrade path to native React Native apps.
- Every generated invoice, challan, purchase order, and report downloadable in CSV, PDF, Word (DOCX), and XML.
- No unsaved work is ever lost when switching or minimizing between modules — it is auto-saved as a draft.
- Every module's list screen has its own search and filter, not just a single global search bar.
- Every document and report — not just downloadable files — can also be **printed directly**, and any outbound document (Quotation, Invoice, Challan, Statement) asks whether to include the company letterhead header/footer before printing.
- Once any record is submitted, editing or deleting it always requires **Super Admin approval** — no one, regardless of role, changes committed data unilaterally.
- Every dashboard figure and report line **drills down** to the exact transactions behind it — reporting is never a dead-end number.
- **Quotation creation** is a complete, standalone capability — branded, printable, convertible to a Sales Order, and tracked through win/loss reporting.

The platform will be built on Next.js (frontend, also installable as a PWA) + Express.js API + PostgreSQL (Prisma ORM), sharing the same codebase and API across web and mobile. Full technical stack detail is in Section 11.

---

## 3. Business Context

Brother's Technology System's business runs on two revenue streams — (a) selling hardware/technology products, and (b) installing, repairing, and maintaining those products. Because these run together, the business needs a system that tracks not just inventory/sales, but also technicians' field work, the products/equipment in their hands, cash advances and expenses — and ultimately computes the actual profit/loss of every project.

At the same time, the company itself takes loans and receives investment, and occasionally needs to give employees salary advances or loans — both of these flows also need to be correctly reflected in the books. The business is run across multiple branches, so every core entity needs branch-level awareness.

---

## 4. Goals & Objectives

The platform will achieve the following business goals:

- End-to-end inventory control: procurement → warehouse → serial/batch → sale → return — with full SKU-level lifecycle traceability.
- End-to-end finance control: invoicing, payments, accounting, expenses, and 100% P&L visibility — company-wide, per project/order, and per department/head.
- Customer, vendor, technician, and service management as first-class modules.
- A complete technician workflow: assign a technician (and specific products/equipment) to an order/invoice/project; issue project-wise cash advances; let technicians submit conveyance bills and record extra products/cash used from their own mobile dashboard; route all of this through Admin/Accounts approval; close the project; and roll everything into project profitability.
- Customer advance/partial payment handling for projects — tracking what's received, what's adjusted, and what's still due.
- Company loan and investment tracking — visible in the books and in cash-flow planning.
- Employee advance/loan management — tracked and reconciled against payroll.
- Live location tracking for technicians/employees during assigned tasks, and remote employee management overall.
- Role-scoped mobile app access — every user gets an app experience scoped to only what their role allows.
- A multi-module workspace — a user working inside one module can minimize it and open another without losing any in-progress (unsaved) work; unsaved work is kept as a draft, never deleted.
- Universal document export — every invoice, challan, purchase order, and generated report can be downloaded as CSV, PDF, Word (DOCX), or XML.
- Search and filter on every module's list screens, not just a global search.
- Branded document generation (Quotation, Invoice, Challan) on the company's own letterhead, sent and tracked from inside the system.
- Centralized document/file storage for all business documents.
- **(Added after initial requirements gathering)** Employee payroll and salary self-service, managed from the HR module — including attendance-wise salary, advance/other-dues deductions, and a real-time project-wise advance-vs-conveyance reconciliation visible to both employees and Admin.
- **(Added after initial requirements gathering)** Mandatory cheque/bank-account proof attachment for every transaction settled by bank or cheque, anywhere in the platform.
- **(Cross-check gap-fill)** Universal print on every document and report, with a company-letterhead header/footer the user chooses at print time rather than one baked in permanently.
- **(Cross-check gap-fill)** Data edit/delete governance — once submitted, no record is edited or deleted without explicit Super Admin approval, platform-wide.
- **(Cross-check gap-fill)** Drill-down reporting — every dashboard figure and report total is clickable through to the exact transactions behind it.
- **(Cross-check gap-fill)** A fully-specified, standalone Quotation module — creation, branded printing, conversion to Sales Order, and win/loss tracking.
- **(Cross-check gap-fill)** Full accounting-hygiene coverage — every voucher type, the standard Day Book/Cash Book/Bank Book/Receipt-Payment reports, and a Suspense Account for anything that can't be classified immediately, so the books are audit-ready by standard bookkeeping norms, not just internally consistent.

---

## 5. Scope

### 5.1 In-Scope

Modules 1–52 (listed in Section 8) form the core operational scope (Identity, Master Data, Procurement, Sales, Inventory, Field Service, Finance, basic HR-related features, Reporting, Portals, System Admin). Alongside these, the seven capabilities Brother's Technology System specifically requested (Modules 53–58) — SKU Full Lifecycle Tracking, Company Loan Management, Investment Management, Universal Document Export Engine, Multi-Module Workspace, and Department/Head-wise Reporting — are part of the same in-scope phase. Modules 64–65 (Payroll Self-Service, Bank Transaction Proof) were added after initial requirements gathering. **Modules 66–71 (Voucher Management, Day Book/Cash Book/Bank Book/Receipt-Payment Statement, Suspense Account Management, Universal Print & Letterhead Toggle, Data Edit & Delete Governance, and Universal Report Drill-Down) close the cross-check gap-fill pass and are in-scope from the same phases as the modules they extend** (Section 8.21–8.26). **Module 72 (Service-Only Customer Workflow, Section 8.28) extends the existing Customer Support and Field Service modules to cover paid, non-warranty service requests — see Section 8.28 for what it adds versus what it reuses unchanged. Modules 73–75 (Delivery Challan Return Management, Warehouse Damage & Loss Management, Employee Work & Performance Reporting Layer — Sections 8.29–8.31) close gaps found in a follow-up review of five detailed feature/integrity/security specifications; Module 75 in particular is a reporting layer over existing data, not a new transactional module.**

### 5.2 Out-of-Scope / Future Phase

- Native mobile apps (React Native/Expo) — a PWA is considered sufficient for the initial release; native apps are a future upgrade path (Section 20 of architecture.md).
- The additional advanced modules proposed in Section 24 of architecture.md (full HR & Payroll, Fixed Asset & Depreciation, AMC Contract Management, Bank Reconciliation, Barcode/QR Printing, CRM Pipeline, VAT Filing Assistant, E-Signature) — these are optional, in roadmap Phase 15, prioritized as needed.
- Selling this as a commercial multi-tenant SaaS to multiple different client companies — the current assumption is that this is a single company (Brother's Technology System) used across multiple branches, not sold as a subscription to other clients (needs confirmation — see Section 14, first row). The underlying architecture retains multi-tenant capability (`tenantId`) so it can be extended later if needed.

---

## 6. User Roles & Access Model

Access control is enforced at two levels: role-based (menu/route-level RBAC) and row-level filtering (data level) — so that even if the UI has a bug, one user can never see another user's data.

**Admin role correction (this revision):** previously stated as "everything except system-level config" — broad, near-unrestricted access. A review of the platform's role-based-access requirements flagged this as too coarse for a platform of this financial sensitivity: Admin is now **permission-driven**, assembled from the same `Permission`/`RolePermission` bundles as every other role (Section 6.1), not a hardcoded "almost everything." In practice this means Brother's Technology System can configure one broad Admin, or several narrower ones (e.g., an Operations Admin without Finance write access, a Branch Admin scoped to one branch) — the platform supports either without a schema change. **Before this changes any real user's access, a full existing-Admin-user permission migration matrix must be produced and reviewed** (which specific permissions each current Admin keeps) — this PRD records the corrected *model*; the migration itself is an implementation-time step, not a decision this document makes on anyone's behalf.

| Role | Primary Platform | Typical Access |
|---|---|---|
| Super Admin | Web | Everything, including system settings and backups |
| Admin | Web | **Configurable permission bundle** — broad by default, narrowable per the correction above; never automatically includes system-level config |
| Accounts / Finance | Web | Finance, payments, advances, loans, investments, approvals, reports |
| HR / Payroll Officer | Web | Employee records, payroll, employee advances/loans, attendance/leave |
| Branch Manager | Web | Own branch's sales, inventory, staff, reports |
| Sales Executive | Web/Mobile | Quotation, order, customer, own KPIs, customer advance entry |
| Warehouse / Inventory Staff | Web | Stock, GRN, transfer, adjustment, SKU lifecycle updates |
| Technician / Field Staff | Mobile PWA | Only own assignments, custody, advance, conveyance, visit reports — nothing else |
| Customer | Portal | Own quotations/orders/invoices/tickets/warranty, own advance/due balance |
| Vendor / Supplier Staff | Portal | Own POs, payments, statement |

### 6.1 Permission Matrix (Role × Functional Area)

Added to close a gap found in review: the table above states access narratively per role; this matrix makes it checkable per functional area. **F** = Full access, **O** = Own-branch/own-records only, **R** = Read-only, **A** = Approves (in addition to own access), **—** = No access. This is derived from the narrative descriptions already in this PRD, not a new decision — treat it as the artifact to validate against during Phase 0's RBAC build, and correct here if a narrower reading was intended anywhere. **Admin's column below is the default/broadest configuration** — the row-by-row correction above means an actual deployment may narrow any cell in this column per-Admin without a schema change.

| Functional Area | Super Admin | Admin | Accounts/Finance | HR/Payroll | Branch Mgr | Sales Exec | Warehouse | Technician | Customer | Vendor |
|---|---|---|---|---|---|---|---|---|---|---|
| Identity & Access | F | O | — | — | — | — | — | — | — | — |
| Master Data | F | F | R | R | O | R | O | — | — | — |
| Procurement | F | F | A | — | O | — | O | — | — | R (own POs) |
| Sales & Quotation | F | F | R | — | O | O | — | — | R (own) | — |
| Inventory & SKU | F | F | R | — | O | R | O | R (own custody) | — | — |
| Field Service & Technician Ops | F | F | A | — | O | R (own) | — | O | R (own) | — |
| Finance & Accounting | F | F | F | R (payroll-linked) | R (own branch) | — | — | — | R (own balance) | R (own statement) |
| Customer Support | F | F | — | — | O | O | — | O (own ticket) | O (own) | — |
| HR & Workforce | F | F | R | F | O | — | — | O (own record) | — | — |
| Reporting & Analytics | F | F | F | R | O | R (own KPI) | R (own) | R (own) | — | — |
| Notifications & Approval | F | F | A | A | A (own branch) | R | R | R | R | R |
| Portals | F | F | — | — | — | — | — | — | O | O |
| System Admin & Security | F | R | — | — | — | — | — | — | — | — |
| Edit/Delete Governance (approver) | A (with the exception below) | — | — | — | — | — | — | — | — | — |

The last row already reflects the v2.3 self-approval rule (Section 9.6): Super Admin approves everyone else's Edit/Delete Requests, but not their own — see Section 14 for the resulting open question.

---

## 7. Core Design Principles

- **Single system of record** — one database, one API, one permission model; not siloed spreadsheets or side tools.
- **Everything traceable to money** — every stock movement, technician action, loan, advance, and approval eventually posts to the accounting ledger, so P&L is always derivable, not reconstructed manually.
- **Approval-gated exceptions** — anything outside the plan (extra product used, extra cash spent, discount, stock adjustment, employee loan, stock write-off) is not silently allowed; it becomes an `ApprovalRequest` that Accounts/Admin must clear.
- **Row-level scoping, not just role-based screens** — a technician's dashboard query is filtered at the data layer, so it's impossible to leak other users' data even if the UI has a bug.
- **Mobile-first for field roles, desktop-first for back-office roles** — same API, same database, either way.
- **Nothing in progress is ever silently lost** — switching modules, losing connectivity, or closing the app must never discard a user's unsaved input; it becomes a recoverable draft.
- **Every document is portable** — anything the system generates for a human to read (invoice, report, statement) leaves the system in the format the recipient needs — CSV for a spreadsheet, PDF for printing/emailing, Word for further editing, XML for another system to ingest.
- **Find anything in two actions** — every list screen in every module supports search plus structured filters, so no one has to scroll a large table to find one record.
- **Nothing changes after submission without a Super Admin's sign-off** — once a record leaves draft status, editing or deleting it is never a same-role action, no matter how senior; it becomes an approval request only a Super Admin can clear (Section 8.25).

---

## 8. Functional Requirements

The 75 modules (Section 8 of architecture.md) are grouped below by functional area, so that the business purpose and key requirements of each area are clear. Numbers in parentheses map to the Module # in architecture.md for traceability.

### 8.1 Identity & Access Management (Modules 1–3)

- User login, profile, and role assignment.
- Role-Based Access Control (RBAC) — menu/route level, plus row-level data scoping as described in Section 6.
- JWT access + refresh token-based authentication, with refresh rotation.
- Branch- and department-based user scoping.

### 8.2 Master Data Management (Modules 5, 6, 7, 41)

- Product/item master — category, brand, unit, tax rate.
- Supplier/vendor master, including contact information.
- Customer master, supporting multiple addresses.
- Warehouse/zone/rack/bin-level stock location master.

### 8.3 Procurement (Module 8)

- Full flow: Purchase Request → Purchase Order → Goods Receipt Note (GRN) → Purchase Invoice → Supplier Payment.
- Purchase Return handling.
- Serial/batch tagging at GRN time, which writes directly into SKU Lifecycle events (Section 8.5).

### 8.4 Sales (Modules 9, 10, 14, 15, 16)

- Full flow: Quotation → Sales Order → Delivery Challan → Invoice → Payment / Credit Note.
- Branded quotation/invoice/challan generation on the company's own letterhead, sent and tracked from inside the system.
- Inventory reservation once a Sales Order is confirmed.
- Customer advance/partial payment adjustment against invoices (linked to Section 8.7).

### 8.5 Inventory & SKU Lifecycle Tracking (Modules 11, 12, 13, 53)

- Stock ledger, stock adjustment, stock transfer (between branches), FIFO/moving-average valuation.
- Batch and serial number tracking.
- SKU Full Lifecycle Tracking (Module 53) — an immutable record of every stage-change of every serialized/batch unit: PO Raised → GRN Received → Warehouse In → QC Passed/Failed → Reserved → Issued to Technician → Sold → Delivered → Installed → Returned by Customer → Warranty Claim Raised → Repaired/Replaced/Damaged/Lost/Scrapped → Transferred (Branch).
- Instantly view the full timeline of any unit ("where is this unit right now, and in what state") by scanning/searching it.

### 8.6 Field Service & Technician Operations (Modules 21, 22, 46, 47, 49)

This is Brother's Technology System's most important differentiator — the full journey of an order going into the field: order → technician → product issue → advance → field work → conveyance → approval → closure → P&L.

- Create a `ServiceAssignment` ("project") from an order/invoice/ticket and assign one or more technicians.
- Issue catalog products or manual/custom items to a technician as custody, with a cost snapshot and status (assigned/used/returned/damaged/lost/sold) — every status change is also reflected in SKU Lifecycle.
- Issue project-wise cash advances to technicians, reconciled against actual spend at project closure.
- Let technicians submit travel/food/misc expense claims (with receipt photos) from their own mobile dashboard.
- GPS-based check-in/check-out, with geofence validation (confirming the technician is actually at the customer's address).
- Project closure report — what was used, what was returned, what extra was taken, how much extra cash was spent, and customer sign-off.
- Conveyance bills, extra product usage, and closure all route through Accounts/Admin approval (Section 8.14).
- Live GPS tracking during active assignments, a live map for Admin, and an employee-wise performance dashboard based on visits/time/distance.

### 8.7 Finance & Accounting (Modules 17, 18, 29, 48, 51, 52, 54, 55)

- Chart of Accounts, auto-posted journal entries (from sales/purchase/service operations), Ledger, Trial Balance, P&L, Balance Sheet.
- Expense management and Tax/VAT management.
- Customer Advance / Partial Payment (Module 51) — tracking what's received, what's adjusted, and what's still due for advances taken before or during a project.
- Company Loan Management (Module 54) — assumed interest-free; repayment schedule and outstanding reports.
- Investment Management (Module 55) — supports custom calculation/flexible withdrawal based on investor preference.
- Employee Advance & Loan Management (Module 52) — interest-free, with automatic installment deduction from payroll.
- Project-wise and Department/Head-wise P&L (Module 48) — every journal line and expense carries a `departmentId`/`headId`, so reports can be generated for any single department or compared side by side across all departments.

### 8.8 Customer Support (Modules 19, 20)

- Customer complaint/ticket management — from ticket creation through serial/warranty verification, technician assignment (following the Section 8.6 flow), repair/replacement, to customer sign-off.
- **A ticket is typed at creation as `WARRANTY_CLAIM` (tied to a previously-sold `SerialNumber`, repair/replace at no charge) or `PAID_SERVICE_REQUEST` (Section 8.28 — no prior purchase required, chargeable).** This is the one change this revision makes here; everything else in this section is unchanged.
- Warranty management, linked to SKU lifecycle.

### 8.9 HR & Workforce (Modules 2, 23)

- User and employee management (core profile/records).
- Employee work summary and KPI — for technicians, computed from visit count, resolution time, and total conveyance/advance amounts.
- Attendance/Leave management — included in scope.

### 8.10 Reporting & Analytics (Modules 4, 26, 48, 58)

- Business overview dashboard.
- Standard reports — sales, inventory, customer/supplier, finance.
- Project-wise P&L, company-wide P&L/Trial Balance/Balance Sheet.
- Department/Head-wise report generation (Module 58) — a P&L, expense breakdown, or budget-vs-actual report for any single head (Sales, Service, Warehouse, HR, Admin/Finance) or comparing all heads side by side, for any date range.
- SKU current-status report and per-unit SKU timeline.
- Advance vs. Adjusted vs. Outstanding report, customer-wise and project-wise.
- Company Loan Register and Repayment/Overdue report, and Investment Register.
- Employee Loan/Advance outstanding and deduction-schedule report.
- Technician performance and cost report; pending-approvals aging report and unreconciled-advances report.
- Every report is searchable/filterable (Section 8.13) and exportable in all four formats (Section 8.11).

### 8.11 Universal Document Export Engine (Module 56)

The requirement (as originally phrased by Brother's Technology System): every generated report, invoice, and document must be downloadable in CSV, PDF, Word, and XML.

- One shared rendering layer per document type — built once from a single data source, then adapted to four output formats, so the PDF, Word file, CSV, and XML for the same document always agree with each other.
- Single-record exports (e.g., one invoice) are generated synchronously/near-instantly; list/report exports (e.g., a 3-month sales report) are processed in the background and delivered as a notification with a download link, so heavy exports never freeze the UI.
- CSV — flat tabular data; PDF — print-ready, rendered with the company letterhead; Word (DOCX) — edit-ready for accountants/office staff who need to annotate before sending; XML — schema-versioned structured export for feeding external systems (auditor tools, tax software, integration partners).
- Every list screen, report screen, and single-document view gets the same **Export ▾** control — implemented once as a shared component, not rebuilt per module.

### 8.12 Multi-Module Workspace & Draft Autosave (Module 57)

The requirement: while working in one module, the user must be able to minimize it and switch to another, and the in-progress work in the first module must never be lost — it should be kept as a draft.

- The web/PWA shell works like an OS-style, lightweight module taskbar/tab-bar — several modules can be open at once, one active, the rest minimized.
- Opening a second module never closes or discards the first — it minimizes to the taskbar.
- While a module is open, its in-progress form state is auto-saved as a `DraftState` every 5–10 seconds (and immediately on minimize), keyed by `userId + moduleKey (+ recordId)`.
- Reopening a minimized module from the taskbar restores its exact draft state instantly — nothing needs to be retyped.
- Already-submitted/committed data (a saved invoice, a saved GRN, a posted journal entry) is never affected by this mechanism — drafts only ever hold unsubmitted input.
- Drafts are server-side and user-scoped, so they survive logout, browser close, or even switching devices.
- On next login, if unfinished drafts exist, the system prompts: "Continue where you left off?" — restoring every minimized module exactly as it was.
- This workspace layer applies uniformly across every module — implemented once as a cross-cutting UI layer, not rebuilt per module.

### 8.13 Search & Filter Standard (Module 33)

The requirement: every module needs its own search and filter, not just a global search bar.

- A search bar on every list screen (keyword search across key text fields — name, code, invoice number, customer, serial number, etc.).
- A filter panel — always including at least date range, status, and branch (where applicable), plus module-specific fields.
- Filters combine with AND logic, and the result count updates live.
- Saved filter presets — a frequently-used search+filter combination can be saved and reopened in one click.
- Search/filter state itself is part of a module's `DraftState` — switching away and back restores the exact filter that was applied.
- Implemented once as a shared `SearchFilterBar` component, not rebuilt from scratch per module.

### 8.14 Notifications & Approval Workflow (Modules 24, 25)

- A generic approval workflow engine — reused across conveyance bills, advances, extra product usage, project closure, purchase orders, stock adjustments, expenses, discounts, credit-limit overrides, warranty replacements, employee loans, customer advance refunds, and company loan disbursements.
- Notifications via email, a local SMS gateway (free-tier solution), and web push.
- Live approval-inbox updates (real-time, via Socket.IO/SSE).

### 8.15 Customer & Vendor Portals (Modules 38, 39)

- Customer portal — view own quotations/orders/invoices/tickets/warranty, online payment (integrated with a payment gateway), and own advance/due balance.
- Vendor/supplier portal — view own POs, payments, and statement.

### 8.16 Mobile / Role-Scoped App Strategy (Module 50)

The requirement: every user type needs its own mobile app experience. Achieved two ways, on the same underlying API:

- Primary approach: one Next.js app, installable as a role-scoped PWA. After login, each role gets its own home screen, menu, and icon (a role-branded PWA manifest).
- Future upgrade path: once the PWA version is validated, wrap the same API in React Native (Expo) for true native, per-role apps — no backend changes needed.
- Offline caching, camera (barcode/photos/signatures), GPS check-in/out, push notifications, and lightweight assets for 3G/4G for Technician and Sales roles.
- Every mobile screen inherits the same search/filter standard and export options as its desktop counterpart.

### 8.17 System Administration, Security & Data Management (Modules 27, 28, 30–37, 42, 44, 45)

- Audit trail and activity logging — field-level before/after logs on all financial, inventory, loan, and advance writes.
- Document and file management — centralized storage.
- System settings, numbering and document templates, import/export (bulk data).
- Backup and data recovery — automated daily backups plus on-demand backup/restore.
- Security management — first-layer rate limiting and request-size limits enforced at the mandatory Nginx edge (`architecture.md` §38), plus IP allow-listing for Admin/Warehouse routes and full authentication/authorization enforced by the application on top.
- Status management (status enums per entity) and data retention/soft-delete policy — no hard deletes on financial, inventory, loan, or advance tables.

### 8.18 Optional / Future Advanced Modules (Modules 59–63 + additional)

These are not part of the core scope but are natural extensions of Brother's Technology System's existing needs — can be picked up in a future phase based on priority (Section 13, Phase 15):

- HR & Payroll Management — full payroll runs, payslip generation, tax/PF handling.
- Fixed Asset & Depreciation Management — tracking the company's own assets (vehicles, tools, laptops), separate from sellable inventory.
- AMC / Recurring Service Contract Management — scheduled preventive-maintenance visits and renewal reminders for customers on annual maintenance contracts.
- Bank & Cash Reconciliation — matching bank statement lines against system-recorded payments/expenses.
- Barcode/QR Label Printing — for each serialized unit, linked to its SKU lifecycle trail.
- CRM / Lead & Sales Pipeline — a pre-sales funnel (Lead → Qualified → Quotation) ahead of the Quotation module.
- Tax/VAT Return Filing Assistant — compiling already-captured VAT/tax data into an NBR-ready return format.
- E-Signature Integration — digital sign-off on quotations, project closure reports, and delivery challans.

### 8.19 Employee Payroll & Salary Self-Service (Module 64 — added after initial requirements gathering)

Salary administration moves fully into the HR module, with a personal, real-time salary view for every employee.

- HR/Admin manage a `SalaryStructure` (basic + allowances) per employee and run attendance-wise payroll for any branch/month as a `PayrollRun` — each employee's payslip line is computed automatically (attendance deductions, loan installment due, other approved dues, project advance-conveyance effect), never manually re-typed.
- Every internal employee — regardless of role (Technician, Sales Executive, Warehouse Staff, Branch Manager, Accounts, HR, Admin, Super Admin) — gets a personal **"My Salary"** panel on their own dashboard/mobile home screen, scoped to their own records only, showing:
  - Total salary and a full month-by-month payslip history.
  - The running/current month's live-computed expected salary, reflecting attendance to date, loan deductions, other dues, and any pending advance-conveyance items.
  - A clear breakdown of what's deducted from advance, what's deducted for other dues, and what's added or deducted from project advance-conveyance reconciliation.
- **Project-wise advance vs. conveyance reconciliation:** the moment a technician's conveyance bills and project closure report are approved for a project, the system compares the approved spend against the advance issued. If the technician spent less than the advance, the shortfall is queued as a salary deduction; if they spent more, the excess is queued as a reimbursement. This updates in real time on the Admin dashboard and on the employee's own "My Salary" panel — well before it is formally applied in the next payroll run.
- Salary can be paid by cash, bank, or mobile banking; a bank payment cannot be marked paid until a bank proof is attached (Section 8.20).
- Reports (search/filter + 4-format export): Payroll Register, Attendance Deduction report, Advance-Conveyance Reconciliation report (pending vs. applied), and per-employee Salary History.

### 8.20 Bank Transaction Proof — Cheque & Bank Account Attachment (Module 65 — added after initial requirements gathering)

Any transaction settled by bank or cheque, anywhere on the platform — salary payment, supplier payment, customer payment, customer advance, company loan disbursement/repayment, or investment receipt — requires the same proof-attachment step before it can be marked complete.

- Captures bank name, account name, a masked account number (last 4 digits only — full account numbers are never stored), an optional cheque number, the transaction date, and an image upload of the cheque/checkbook leaf or the bank deposit/transfer slip.
- Attaching a bank proof is mandatory, not optional, the moment a transaction's payment method is set to bank or cheque — the record cannot be marked completed/paid without it.
- The same "Attach Bank Proof" control appears on every relevant transaction screen (Payment, Payroll, Supplier Payment, Loan, Investment, Customer Advance) as one shared component.
- Reports: Bank Transactions Register, filterable by whether proof is attached or missing, so Accounts can flag undocumented transactions.

### 8.21 Voucher Management Layer (Module 66 — cross-check gap-fill)

Every accounting entry is created through a **Voucher** — the familiar accounting-software entry form — rather than a raw journal screen:

- Twelve voucher types: Journal, Payment, Receipt, Contra, Sales, Purchase, Sales Return, Purchase Return, Expense, Adjustment, Opening, and Transfer.
- Sales, Purchase, Sales Return, Purchase Return, and Expense vouchers are generated **automatically** the moment their source document posts — no re-keying, no separate approval at the voucher layer.
- Journal, Payment, Receipt, Contra, Adjustment, Opening, and Transfer vouchers are entered manually by Accounts/Cashier and follow the same approval rules already used elsewhere in Finance.
- Every voucher gets a unique, sequential number (per type, per branch, per fiscal year), full narration, optional attachment, and a status trail (Draft → Submitted → Approved → Posted).
- A posted voucher is never edited or deleted — it is reversed by an equal-and-opposite reversal voucher, itself gated by Super Admin approval (Section 8.25).
- **Reports** (search/filter + 4-format export + print): Voucher Register, filterable by type/status/branch/date.

### 8.22 Day Book, Cash Book, Bank Book & Receipt-Payment Statement (Module 67 — cross-check gap-fill)

Four standard accounting reports that were previously only implicit in general Cash & Bank Management:

- **Day Book** — every posted transaction, company-wide, in date order, drilling down to its source voucher.
- **Cash Book** — the same view scoped to cash, with a Daily Cash Closing step comparing system cash to physically counted cash, and a shortage/excess adjustment when they don't match.
- **Bank Book** — the same view scoped to each bank account, including a **Cheque Register** that tracks a cheque from issue through cleared/bounced/cancelled — a bounced cheque automatically reverses the original payment/receipt.
- **Receipt & Payment Statement** — every receipt and every payment across the business for a date range, split by cash/bank.
- **Reports:** all four, with search/filter, 4-format export, and print.

### 8.23 Suspense Account Management (Module 68 — cross-check gap-fill)

For money that can't yet be classified — an unidentified bank credit, a receipt that can't yet be matched to an invoice:

- Any receipt/payment can be posted to a Suspense account instead of its final account when the correct classification isn't yet known.
- Reclassifying a suspense item to its final account requires Accounts/Admin approval.
- A Suspense Aging report (same aging buckets used elsewhere) surfaces on the Finance Dashboard so nothing sits unresolved indefinitely.

### 8.24 Universal Print & Letterhead Toggle (Module 69 — extends Module 56, Section 8.11)

Directly answers the requirement that every report, invoice, challan, quotation, and technician conveyance bill get a **Print** option, and that any print/export ask about the company letterhead:

- Every document and every report — not just Invoice/Quotation/Challan — gets a **Print** action alongside the existing 4-format Export, rendering the identical branded template directly into the browser's/device's print dialog.
- For any **outbound** document (Quotation, Invoice, Challan, Purchase Order, Customer/Supplier Statement, a Conveyance Bill or Project Closure Report at hand-over), triggering Print or PDF Export first asks: *"Include company letterhead header/footer? Yes / No"* — with an optional "remember my choice" per document type.
- Purely internal reports (Day Book, Ledger, Trial Balance, P&L, Balance Sheet, dashboards) skip the letterhead prompt and print plain.
- Implemented once as a shared control, not rebuilt per module.

### 8.25 Data Edit & Delete Governance — Super Admin Approval (Module 70 — extends Module 25, Section 8.14)

Directly answers the requirement that all data be editable/deletable only with Super Admin's approval:

- Once a record leaves draft status, no one — including Accounts and Admin — edits or deletes it directly. The action instead creates an Edit or Delete Request that only the **Super Admin** role can approve, regardless of who would normally approve that type of record.
- Records still in draft (an unsaved conveyance claim, an unsent quotation) remain freely editable by their owner — this governance starts at submission, not at first keystroke.
- For financial/inventory/loan/advance records, an approved "delete" still never means a hard delete — it triggers the appropriate reversal or cancellation, so the audit trail stays complete. For non-financial master data with no linked transactions, an approved delete performs an actual (soft) delete.
- The record shows an "Edit pending approval" / "Delete pending approval" badge until the Super Admin decides, with a before/after diff view for edits.
- This adds a checkpoint on top of the existing permission model — it never grants a role access it didn't already have.

### 8.26 Universal Report & Dashboard Drill-Down Standard (Module 71 — cross-check gap-fill)

Directly answers the requirement that reporting be available point/topic/module-wise in a detailed view:

- Every number shown anywhere — a dashboard stat card, a P&L/Balance Sheet/Trial Balance line, a chart data point, an aging-bucket cell, a KPI — is clickable through three tiers: **Summary → Breakdown (filtered transaction list) → Source Document** (the original voucher/invoice/bill).
- This is implemented once as a cross-cutting standard every report inherits automatically, exactly like Search/Filter (Section 8.13) and Export (Section 8.11) already are — not designed separately per report.

### 8.27 Quotation Module — Full Specification (extends Module 9, Section 8.4)

Directly answers the requirement that Quotation creation be a complete, standalone capability, not merely a step in the Sales flow diagram:

- Full quotation document: customer, branch, line items (product/service, quantity, price, discount, tax), totals, terms, sales executive, and a status lifecycle — Draft → Sent → Accepted → Rejected → Expired → Converted.
- No accounting entry happens at quotation stage — it is pre-revenue; the point of this module is complete document generation and lifecycle tracking.
- Gets the full Print + 4-format Export control including the Letterhead Toggle (Section 8.24), defaulting to "Yes" since a quotation is, by definition, an outbound customer document.
- Accepting a quotation converts it 1:1 into a Sales Order, copying every line item — no re-keying.
- A quotation past its validity date with no customer decision automatically expires.
- **Reports:** Quotation Register (status, value, conversion rate) and a Win/Loss Report by sales executive/branch/product.

### 8.28 Service-Only Customer Workflow (Module 72 — extends Modules 9, 19, 20, 21, 22, Sections 8.4, 8.6, 8.8)

Covers a customer who calls in for **paid** service/installation/repair work with no prior purchase or active warranty from Brother's Technology System. Written to be explicit about what's reused unchanged versus genuinely new, per the analysis behind the v2.4 revision note.

**Reused unchanged — no new entity, no duplicate logic:**
- The `Quotation` model already supports service/labour-only line items with no product attached (`productId` nullable) — a "Service Quotation" is simply a Quotation used this way. No new document type.
- `ServiceAssignment.sourceType` already accepts `TICKET` as a valid origin, alongside `SALES_ORDER`/`INVOICE` — a paid-service ticket creates its `ServiceAssignment` exactly the same way a warranty ticket does.
- Technician assignment, product/parts custody, technician advance, GPS check-in/out, conveyance billing, and the approval engine (Section 8.6) — identical for both warranty and paid-service assignments; there is exactly one Field Service engine, not two.
- `ProjectClosureReport` already carries a customer-signature field — "Customer Sign-off" was already fully specified (Section 8.6); this revision didn't need to add it.
- Invoice and Payment (Section 8.4) — a paid service assignment's Invoice is generated directly from its `ProjectClosureReport` rather than from a `DeliveryChallan`, since no physical goods are being delivered; this is an existing Invoice, sourced differently, not a new "Service Invoice" document type.
- Project P&L (Section 8.7) is already computed per `ServiceAssignment` regardless of what created it.

**Genuinely new — the two gaps this revision closes:**
- **Ticket typing + optional serial link.** A ticket no longer assumes a prior purchase: `Ticket.ticketType` is `WARRANTY_CLAIM` or `PAID_SERVICE_REQUEST`, and `Ticket.serialNumberId` is nullable — required for a warranty claim, absent for a paid service request against equipment (or an install) Brother's Technology System never sold.
- **A mandatory cost-approval gate before dispatch, for paid tickets only.** A `WARRANTY_CLAIM` ticket can go straight to a `ServiceAssignment` (repair is free to the customer, no cost decision needed). A `PAID_SERVICE_REQUEST` ticket must first get a Service Quotation created and **Accepted by the customer** — only then can the `ServiceAssignment` be created. This is the actual reason this needed its own module number: it's a new business rule gating an existing transition, not new machinery.

### 8.29 Delivery Challan Return Management (Module 73 — extends Module 9's Sales chain, Section 8.4)

Closes a real gap: one Sales Order can already be fulfilled by multiple partial Delivery Challans, but there was no return path once goods left the warehouse against a Challan.

- **Line-level quantity tracking on every Sales Order line:** Ordered, Reserved, Challaned (delivered-so-far), Returned, Net Delivered (`Challaned − Returned`), and Remaining (`Ordered − Net Delivered`) — all five kept current as Challans and Returns post against the order, not recomputed ad hoc per screen.
- **Physical movement and commercial billing are tracked separately.** A Challan documents goods leaving the warehouse; it is not itself an Invoice line. This separation is what makes partial delivery, partial return, and progressive billing against one Sales Order possible without the three fighting each other.
- **Delivery Challan Return** is a first-class document (not a note on the original Challan): references the originating Challan and its lines, records a per-line **condition** — `GOOD` (returns to sellable stock), `DAMAGED`/`FAULTY` (routes to Warehouse Damage & Loss, Section 8.30, never back to sellable stock), or `MISSING_PARTS` (routes to an exception queue, not silently accepted as `GOOD`).
- Serialized and batch-tracked products carry their serial/batch identity through the return, so a returned unit's SKU lifecycle (Section 8.5) shows the full return, not just a quantity delta.
- A return that would make **Returned > Challaned** for any line is rejected outright — not flagged for review after the fact.
- Where a Sales Order is linked to a Service Assignment's project billing (Module 72's chain, and the general Field Service flow), a Challan Return recalculates the project's Interim/Final P&L labeling (Finance spec §59) the same way a Section 9's reconciliation event does — a returned product is a real cost reduction, not a number to reconcile manually later.

### 8.30 Warehouse Damage & Loss Management (Module 74 — new, reuses the Approval Engine and Finance posting from Sections 8.14, 8.7)

Not a duplicate of Module 72's technician-custody damage/loss handling or Section 9.10's warranty replacement — this module is specifically for damage/loss discovered **inside the warehouse** (a failed stock count, a damaged incoming shipment not caught at GRN, a shelf-life write-off), which had no reporting path at all before this revision.

- **Report → Approve → Dispose**, in that order — a `DamageLossReport` records what happened (product, serial/batch, quantity, reason, evidence photo); approval (Section 8.14's engine, above a to-be-configured value threshold) precedes any inventory or financial effect, never the other way around.
- **Disposition types**, set at approval: `SCRAP` (removed from stock permanently), `RETURN_TO_STOCK` (the report was raised in error or the item is actually sellable), `REPAIR` (routes into a repair sub-flow before a second disposition decision), `RMA` (returned to the original supplier — links to Section 8.3's Purchase Return), `WRITE_OFF` (a financial loss with no further inventory action).
- **Valuation:** Gross Loss = quantity × the item's cost basis (not sale price); Net Loss = Gross Loss − any recovery (an RMA credit, an insurance claim, a supplier replacement) — both figures, not just the net, are visible on every report and every rollup.
- **This is explicitly not automatic employee financial liability.** A damage/loss report identifies what happened to the stock; whether a specific employee is billed for it is a separate, explicitly-approved decision (Section 8.14's engine again), never an automatic deduction triggered by the report itself.

### 8.31 Employee Work & Performance Reporting Layer (Module 75 — a reporting layer, not a new transactional system; reuses Sections 8.6, 8.9, 8.19)

**Architectural principle, stated up front because it governs everything else in this section: this is an aggregation/reporting layer over `ServiceAssignment`, `Ticket`, `ProductCustody`, `Attendance`, and the Approval/Audit engines — not a parallel work-tracking system.** No employee activity is recorded twice; every number this section's dashboards show must be traceable, by drill-down, to the existing record that produced it.

- **Assignment lifecycle, extended for accurate performance reporting:** `ASSIGNED → ACCEPTED → STARTED → IN_PROGRESS → COMPLETED → VERIFIED → CUSTOMER_ACCEPTED → CLOSED` — "assigned" is never counted as "completed"; a dashboard showing 20 assigned and 15 completed shows both numbers, not one derived from the other.
- **KPIs are always calculated from source records, never manually edited.** Completion Rate, On-Time %, Rework Rate, Customer Acceptance % — each has a precise formula (Section 9's data-integrity companion documents carry the exact formulas); none of them is a field a manager can type a new value into. A business adjustment, if ever needed, goes through a governed adjustment mechanism (reason, approver, audit trail) that keeps the original calculated value visible alongside it.
- **A KPI with insufficient source data shows `N/A`, never a fabricated `0%`.** No due date on a job means no On-Time percentage is calculated for it at all — it does not silently count as late.
- **Reassignment preserves history.** Moving a job from one technician to another keeps "originally assigned to," "reassigned to," the reason, and who changed it — never overwritten. Multi-employee work (a primary technician plus an assistant) uses whatever attribution model the existing assignment data actually supports; this section never fabricates a contribution percentage that isn't backed by real per-employee activity records.
- **Employee performance is explicitly not financial value.** "Completed 20 jobs" does not imply a currency figure unless a separate, existing business rule (billable project contribution, Section 8.7) already defines one — this section does not invent employee-level revenue attribution.
- **Reports:** Employee Work Ledger, Employee Assignment/Completion/Pending/Overdue Report, Employee↔Customer and Employee↔Project cross-tabs, Team/Department Performance, Workload Report, Employee Product Custody/Usage/Return/Damage-Loss — all built on Section 8.11's existing export engine and Section 8.26's existing drill-down standard, not a second reporting stack.

---


## 9. Key Workflows

### 9.1 Service Order → Technician → Closure → P&L

The most important end-to-end flow on the platform:

- Sales creates a Sales Order/Invoice requiring field service → a `ServiceAssignment` is created and a technician is assigned.
- Required products/equipment (catalog or custom) are assigned to the technician's custody.
- The technician requests an advance if needed; Accounts/Admin approves and pays it.
- The technician checks in at the customer site (GPS-logged), does the work, and logs notes/photos.
- Used/returned products are marked; any extra items taken are flagged.
- The technician submits a conveyance bill (with a receipt photo); checks out; and submits a project closure report (extra cash used, customer signature).
- Conveyance bills, extra usage, and closure all route to Accounts/Admin as `ApprovalRequest`s.
- On approval, the system automatically posts journal entries (COGS, technician expense) and SKU lifecycle events, computes the project's P&L, and sets the `ServiceAssignment` status to CLOSED.

### 9.2 Standard Sales & Purchase Flows

- **Quotation to Payment:** Create Quotation → convert to Sales Order → reserve inventory → generate Delivery Challan → dispatch → issue Invoice → record payment (net of any adjusted Customer Advance).
- **Purchase to Stock:** Purchase Requisition → Purchase Order → GRN → serial/batch tagging (SKU Lifecycle: PO Raised → GRN Received → Warehouse In) → stock allocation → Purchase Invoice → Supplier Payment.

### 9.3 Complaint to Resolution (branches at ticket type, Section 8.28)

- Ticket created, typed as `WARRANTY_CLAIM` or `PAID_SERVICE_REQUEST` (Section 8.28).
- **Warranty branch (unchanged from earlier versions):** serial/warranty check → technician assigned (creates a `ServiceAssignment`, following the Section 9.1 flow) → repair/replace (writes a SKU lifecycle event) → customer sign-off → ticket closed. No cost approval — the repair is free to the customer.
- **Paid-service branch (new, Section 8.28):** Service Quotation created (labour/parts line items, no product custody required at quote stage) → **customer Accepts the quotation** → `ServiceAssignment` created from the ticket → technician assigned, from here on **identical to the Section 9.1 flow** (custody, advance, field work, conveyance, closure, customer sign-off) → Invoice generated directly from the closure report → Payment recorded → project P&L computed → ticket closed.
- Both branches converge on the same `ServiceAssignment` engine from technician assignment onward — the branch only decides how the assignment gets created and whether money changes hands.

### 9.4 Customer Advance / Partial Payment Flow

- The customer pays an advance against a project/order → the system records it and credits the customer's balance.
- When the final invoice is generated, the relevant advance is automatically surfaced for adjustment.
- At any time, Accounts (or the customer themselves) can see what's received, what's been adjusted, and what's still due (Section 8.10 reports).

### 9.5 Print & Letterhead Toggle Flow

- User clicks **Print** (or **Export → PDF**) on any document.
- If it's an outbound document (Quotation, Invoice, Challan, PO, Statement, a Conveyance Bill/Closure Report being handed over), the system asks: *"Include company letterhead header/footer?"*
- The chosen option renders immediately — with letterhead (logo, address, signature line) or plain — and the user can optionally save that choice as their default for that document type going forward.
- Internal reports (Ledger, Trial Balance, P&L, dashboards) skip the prompt and print plain.

### 9.6 Edit / Delete Approval Flow

- A user attempts to edit or delete a record that has already left draft status.
- Instead of a normal Save/Delete action, the system shows **"Requires Super Admin approval"** and files an Edit/Delete Request with one click, capturing the reason and (for edits) the before/after field changes.
- The record is badged **"Edit pending approval"** / **"Delete pending approval"** until resolved.
- The Super Admin reviews it in their Approval Inbox alongside every other pending item, and approves or rejects it.
- **An approver can never clear their own request — including the Super Admin.** If the Super Admin is the one requesting the edit/delete, the system must route it elsewhere rather than showing them their own item as approvable. **This is currently unresolved:** since Super Admin is the only approver role defined for this flow (Section 6.1), there is no stated fallback for exactly this case. See Section 14 ("Edit/Delete approver") — this rule makes that question more urgent than a simple availability fallback; it's now a structural gap whenever Super Admin initiates the change themselves, not just an edge case.
- On approval: a financial/inventory/loan/advance record is reversed/cancelled (never hard-deleted); a non-financial master-data record with no linked transactions is soft-deleted.

### 9.7 Purchase Return / Sales Return

- **Purchase Return:** a received GRN item is found faulty/wrong/excess after receipt → Warehouse or Accounts initiates a Purchase Return referencing the original GRN → the affected units' SKU Lifecycle status moves to `RETURNED_TO_SUPPLIER` → an `ApprovalRequest` routes to Accounts (this is a financial reversal) → on approval, the original Purchase Invoice is adjusted via a debit note and the supplier's payable balance is reduced.
- **Sales Return:** a customer returns a delivered/invoiced item → Sales or the Customer Portal initiates a Sales Return referencing the original Invoice → SKU Lifecycle status moves to `RETURNED_BY_CUSTOMER` → routes to Accounts as an `ApprovalRequest` → on approval, a credit note is issued against the original Invoice and the customer's balance is adjusted.
- Both share the same underlying pattern as every other financial reversal on this platform: never edit the original document, always post an offsetting entry against it.

### 9.8 Stock Transfer Between Branches

- Branch A's Warehouse/Inventory Staff (or Branch Manager) initiates a transfer request for specific SKUs/quantities to Branch B.
- The transfer is dispatched (stock leaves Branch A's on-hand count, moves to an `IN_TRANSIT` state) and received at Branch B (Branch B's Warehouse staff confirms receipt, stock lands in Branch B's on-hand count).
- A quantity mismatch at receipt (damaged/short in transit) follows the same discrepancy pattern as Section 9.9 (GRN Discrepancy) rather than a separate mechanism.
- No approval gate is assumed for a same-company inter-branch transfer (unlike a customer-facing return); this should be confirmed if Brother's Technology System wants Accounts visibility before transfer, not just after.

### 9.9 GRN Discrepancy Handling

- At Goods Receipt, the received quantity/condition doesn't match the Purchase Order (short-shipped, damaged, or wrong SKU).
- The GRN is recorded as **Partial** or **Discrepant** rather than blocking receipt entirely — the correctly-received portion still enters stock and SKU Lifecycle immediately.
- The discrepancy itself becomes an `ApprovalRequest` to Accounts/Admin with three resolutions: request a supplier replacement/credit note (adjusts the Purchase Invoice), accept a partial short-shipment permanently (adjusts the PO's outstanding quantity), or reject the entire GRN.

### 9.10 Warranty Claim → Repair-or-Replace Decision

- A support ticket (Section 8.8) is confirmed under warranty against the unit's SKU Lifecycle history.
- The assigned technician or Branch Manager records a recommendation (repair vs. replace) with cost/stock impact attached; Accounts/Admin approval is required only if a replacement unit's cost exceeds a to-be-defined threshold (no threshold is set anywhere yet — flagged for confirmation).
- **Repair path:** follows the standard Service Assignment flow (Section 9.1) with no Sales Order behind it — cost is a warranty expense, not project revenue.
- **Replace path:** the faulty unit's SKU Lifecycle status moves to `RETIRED_WARRANTY`, a new unit is issued from stock, and the replacement cost posts as a warranty expense.

### 9.11 Technician Reassignment Mid-Assignment

- A `ServiceAssignment` needs a new technician mid-job (illness, resignation, escalation).
- Any `ProductCustody` held by the original technician transfers to the replacement — this is itself a custody handoff requiring both technicians' confirmation (or Admin override if the original technician is unreachable).
- Any advance already issued to the original technician is handled one of two ways depending on whether field work has started: **not yet started** → the advance is reassigned to the new technician; **already in progress** → the original technician's partial spend is reconciled as if the assignment closed for them (Section 58's reconciliation engine, `Accounting_and_Finance_Full_Specification.md`), and a fresh advance is issued to the replacement for the remaining work.

### 9.12 Quotation Revision (Negotiation Loop)

- A **Sent** quotation doesn't have to resolve directly to Accepted/Rejected — the customer (or Sales, on their behalf) can request changes.
- This creates a new quotation version linked to the original (not a silent edit — Section 7's governance principle applies here too), moving the original to a **Superseded** state and the new version to **Sent**.
- The cycle can repeat; only the current (latest, non-superseded) version can be Accepted and converted to a Sales Order. Win/loss reporting (Section 8.27) tracks the whole chain, not just the final version, so negotiation activity is visible in reporting.

### 9.13 Delivery Challan Return (Module 73, Section 8.29)

- Customer or Warehouse initiates a return referencing a specific, previously-issued Delivery Challan and its lines.
- Each returned line gets a condition: **Good** → stock re-enters the sellable `StockLedger` balance immediately; **Damaged/Faulty** → routes directly into a Warehouse Damage & Loss report (Section 9.14) rather than touching sellable stock at all; **Missing Parts** → routes to an exception queue for Warehouse/Accounts review, never silently treated as a full good return.
- The Sales Order's Returned/Net Delivered/Remaining figures update in the same transaction as the stock movement — never as a separate reconciliation step run later.
- If the order is tied to a Service Assignment's project billing, the project's P&L is recalculated (still labeled Interim or Final per the existing rule, Finance spec §59) so a return is reflected the same day, not at month-end.

### 9.14 Warehouse Damage & Loss (Module 74, Section 8.30)

- Warehouse Staff (or a Challan Return, Section 9.13) raises a Damage & Loss report: product, serial/batch, quantity, reason, photo evidence.
- Routes to Approval (Section 8.14's existing engine) — no inventory or financial effect happens before approval.
- On approval, a disposition is set (Scrap / Return to Stock / Repair / RMA to supplier / Write-off) and the corresponding inventory and Finance postings follow automatically from that disposition — never entered as two separate manual steps that could drift apart.
- Employee financial liability for the loss, if any, is a distinct, separately-approved decision — never an automatic consequence of the report itself.

---

## 10. Non-Functional Requirements

Previously a flat list; reorganized below into subsections so each area can be owned and confirmed independently. Items marked **[Proposed]** are draft starting points added by review, not decisions the business has made yet — everything else was already stated.

### 10.1 Multi-Branch, Offline & Localization

- Multi-branch aware throughout — every major entity carries `branchId`.
- Offline-tolerant field data entry — technician visit reports cache locally and sync on reconnect.
- Localization — BDT currency, Bangla + English UI strings, Asia/Dhaka timezone default.
- **[Proposed]** Conflict-resolution policy for offline sync, closing the risk already flagged in Section 15: last-write-wins by timestamp for most fields, but any conflicting edit to a financial field (advance amount, conveyance total) is instead flagged for manual Accounts review rather than auto-resolved — silently picking a financial number is worse than asking.

### 10.2 Performance

- Paginated list APIs, indexed search, background jobs for heavy reports/exports.
- **[Proposed]** p95 API response time under 500ms for list/detail views; under 3 seconds for report/export generation before it's handed off to a background job.
- **[Proposed]** Sizing should assume current branch/employee/transaction volume plus 3x headroom. Actual concurrent-user and daily-transaction-volume figures are needed from the business to size infrastructure precisely.

### 10.3 Availability, Backup & Disaster Recovery

- Automated daily database backups plus on-demand backup/restore.
- **[Proposed]** 99% uptime target during business hours, excluding announced maintenance windows scheduled outside peak hours.
- **[Proposed]** Recovery Point Objective (RPO) of 24 hours, matching the daily backup cadence; Recovery Time Objective (RTO) of 4 hours for a full restore.
- **[Proposed]** Backup retention of 90 days rolling, with month-end snapshots kept longer to align with the statutory retention period referenced in 10.7.

### 10.4 Auditability & Data Governance

- No hard deletes on financial/inventory/loan/advance tables — reversal/cancellation plus audit trail only (Section 8.25).
- No lost work — the draft-autosave guarantee applies to every data-entry form in every module.
- **[Proposed]** Audit-log retention should match the backup retention in 10.3 at minimum, ideally aligned with the statutory period in 10.7 — needs a final figure from Accounts/Finance.
- **[Proposed]** Audit scope extends to identity/access events, not just financial data: user creation/deactivation, role or permission changes, and failed-login/permission-denied attempts are all logged with the same before/after rigor as a financial record change. Module 70's edit/delete governance already treats a data change as needing accountability; the same standard should apply to who is allowed to act as whom.
- **[Proposed]** Cascade behavior on master-data deletion: a master record (Customer, Supplier, Product) with any linked transaction cannot be deleted at all — consistent with Section 8.25's existing "no delete with linked transactions" rule, stated here explicitly so it's not assumed differently by whoever builds the data model.

### 10.5 Security

- Password hashing via bcrypt/Argon2, RBAC plus permission-based route guards, CSRF/XSS protection, ORM-parameterized queries (SQLi-safe by default).
- Encryption in transit (HTTPS, terminated at the mandatory Nginx edge — `architecture.md` §38.6) and at rest for sensitive fields (customer payment info, NID uploads).
- **Resolved: multi-factor authentication is mandatory for Super Admin and Accounts/Finance roles**, confirmed directly by the stakeholder — the two roles with the widest financial blast radius. Other roles are not required to use MFA at this time.
- **[Proposed]** Session timeout after 30 minutes of inactivity for web roles; longer (8 hours) for the Technician mobile PWA given field connectivity gaps. Account lockout after 5 consecutive failed login attempts.
- `architecture_nginx.md` describes rate limits and request-size limits only in qualitative terms ("moderate," "strict") — actual numeric thresholds per endpoint tier are still needed before those policies can be configured; ownership sits with whoever maintains `architecture_nginx.md`.
- **[Proposed]** Secrets (database credentials, JWT signing secret, SSLCommerz/Google Maps/SMS API keys) are never committed to source control — `.env` files for local development, a secrets manager or Docker secrets for staging/production, with rotation on any suspected compromise.
- **[Proposed]** Dependency/supply-chain scanning (e.g., `npm audit` or Dependabot) runs as part of CI, given the size this dependency tree will reach across 75 modules.

### 10.6 Notifications

- Delivery channels: in-app, email, SMS (Section 8.14).
- **[Proposed]** Users may opt out of non-critical notifications per channel, but any notification tied to an `ApprovalRequest` awaiting them is always delivered on at least one channel and can't be fully disabled — this matters given the Super Admin bottleneck flagged in Section 15.
- **[Proposed]** A failed SMS/email send retries at least once before falling back to in-app-only. Exact retry behavior depends on whichever SMS/email provider is eventually selected (Section 14).
- **[Proposed]** Notification catalog, beyond the approval-engine triggers already specified: low-stock/reorder-point alert (Inventory), loan/EMI installment due-soon reminder (Employee or Company Loan), warranty-expiring-soon alert (Customer Support), quotation-expiring-soon alert sent before the auto-expiry in Section 8.27, new-assignment-created alert to the technician (Field Service), and payslip-ready/"My Salary updated" alert (Payroll). None of these were in the original notification scope; confirm which are wanted for the initial release vs. deferred.

### 10.7 Regulatory & Compliance

- Sensitive personal data is collected (NID images, payment details) and must be handled under applicable Bangladeshi data-protection expectations (risk noted in Section 15).
- This PRD does not currently name which specific regulations apply, or assign an owner for that review — tracked as an open item in Section 14 territory; needs a named owner (Legal, Accounts, or an external consultant) and a target phase.
- **[Proposed]** Financial records retained in line with standard Bangladeshi bookkeeping/tax retention expectations — exact period to be confirmed by Accounts/Finance or a tax advisor, then applied consistently in 10.3 and 10.4.

### 10.8 Browser, Device & Support Matrix

- **[Proposed]** Minimum support: last 2 major versions of Chrome, Safari, and Edge for desktop back-office roles; Android 9+ and iOS 14+ for the Technician/Sales mobile PWA, since field staff are the likeliest to carry older or budget devices.
- The existing "lightweight assets for 3G/4G" requirement should be paired with a defined data-usage budget per page once real device testing begins.

### 10.9 API Versioning & Compatibility

- **[Proposed]** Adopt a simple `/api/v1/` prefix from Phase 0, so a future breaking change doesn't force a flag-day migration across every client (PWA, and later native apps and any external integration) at once.

### 10.10 Deployment & Release Strategy

- **[Proposed]** Releases should avoid interrupting technicians mid-assignment: Socket.IO clients reconnect gracefully after a deploy, and releases are scheduled outside typical field-work hours until a zero-downtime deployment approach is in place.

### 10.11 Training & Onboarding

- Ten distinct role types — several field-based and not necessarily technical (Technician, Warehouse Staff) — are moving onto a new system of record with mandatory GPS check-ins and approval workflows.
- No training plan or phased per-branch rollout sequencing exists anywhere in this document set yet. This needs input from whoever owns rollout — not a default proposed here, since it depends on training resources and branch readiness this review has no visibility into.

### 10.12 Financial Posting Integrity

- **[Proposed]** Every financial posting (journal entry, payment, voucher) carries a client-generated idempotency key, so a double-click or a network-retry resubmission is detected and rejected server-side instead of creating a duplicate entry. This closes a gap found in review — no such protection exists in the design today.
- **[Proposed]** Rounding convention: all monetary values are stored to 2 decimal places (paisa-level precision); any rounding required during calculation (tax, commission, pro-rated amounts) uses standard round-half-up, applied consistently everywhere it happens rather than left to whichever module implements it first.
- **[Proposed]** Double-entry balance (Section 11 principle) is enforced by a database-level constraint or trigger, not application-code logic alone, so a future code bug can't post an unbalanced journal entry undetected.

---

## 11. Technical Architecture Overview

The full technical design (data model, API contracts, sequence diagrams) is detailed in `architecture.md`. This is a summary, so this PRD is self-contained for both product and technical readers.

| Layer | Technology | Why |
|---|---|---|
| Frontend (Web + Admin) | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | SSR for dashboards/reports, fast iteration |
| Field/Mobile | Same Next.js app, installable as a role-scoped PWA | Avoids maintaining a separate native codebase per role |
| Backend API | Node.js + Express.js + TypeScript | Simple, well-understood, easy to extend module by module |
| ORM / DB | Prisma ORM + PostgreSQL | Strong relational integrity — essential for accounting/inventory/loan correctness |
| Background Jobs | BullMQ + Redis | Scheduled reports, reminders, backups, notification fan-out, heavy exports |
| Realtime | Socket.IO (or SSE) | Live technician location, live notifications, live approval-inbox updates |
| File Storage | S3-compatible object storage | Product images, receipts, visit photos, signed documents, exports |
| Maps/Location | Google Maps API | Geocoding, live tracking map, geofencing |
| Document Export | Puppeteer (PDF), `docx` (Word), `csv-stringify` (CSV), `xmlbuilder2` (XML) | One shared renderer, four output adapters |
| Payments (Customer Portal) | SSLCommerz or an equivalent BD aggregator | Gateway choice needs confirmation — see Section 14 |
| **Edge / Reverse Proxy** | **Nginx (mandatory)** | Production entry point — TLS termination, routing, security headers, first-layer rate limiting; hides app ports (`architecture.md` §38) |
| Deployment | Docker Compose (nginx + web + api + worker + postgres + redis) → VPS/Cloud | Only Nginx publishes public ports 80/443 |

At a high level, every request from any of the five client types (Admin/Accounts, Sales/Warehouse/HR, Technician mobile PWA, Customer Portal, Vendor/Staff Portal) first reaches the **Nginx edge layer**, which terminates TLS and routes it to either the Next.js web app or the Express.js API. The API then routes through six core services — Auth/RBAC middleware, the Approval Workflow Engine, the Notification Service, the Reporting/P&L Engine, the Accounting Posting Engine, and the Universal Document Export Engine, plus the Draft/Workspace State Service — down to PostgreSQL, Redis, and S3. External integrations include Google Maps API, an SMS/Email gateway, and a payment gateway. Nginx owns the network boundary only — it never makes authentication, RBAC, or business-rule decisions (`architecture.md` §38.4, §22).

---

## 12. Suggested Success Metrics

The metrics below are derived from the goals in Section 4 — they are not stated directly in `architecture.md`; stakeholders should confirm final target numbers at PRD sign-off.

- Percentage of closed `ServiceAssignment`s with an auto-generated project-wise P&L: target 100%.
- Instances of unsaved data lost due to module switching/minimizing: target zero.
- Average technician-advance reconciliation time (advance issue to closure), compared against the current manual process.
- Successful export rate across all four formats (CSV/PDF/Word/XML) for every generated invoice/report.
- Average age (aging) of pending approval requests, kept within a defined SLA.
- Percentage of serialized units with a complete, gap-free SKU lifecycle timeline.
- Percentage of outbound documents printed/exported with a deliberate (not accidental) letterhead choice — i.e., the prompt was shown and answered, never silently skipped.
- Average time-to-resolution for Edit/Delete Requests in the Super Admin's approval inbox, kept within a defined SLA.
- Percentage of dashboard/report figures with a working drill-down path to source transactions: target 100%.

---

## 13. Release Roadmap

The phased build plan proposed in `architecture.md`, Section 25:

| Phase | Deliverable |
|---|---|
| 0 | Repo scaffold, full Prisma schema, Auth + RBAC, Branch/Warehouse setup, shared SearchFilterBar + ExportMenu UI components, **and a minimal Posting/Ledger Stub** (bare journal-entry table + a single "post a balanced entry" function, no COA management UI, no reports) so Phases 3–5 have somewhere to post into |
| 1 | Master data: Product, Category, Customer, Supplier, Warehouse, Tax — with search/filter on every list screen from day one |
| 2 | Purchase → GRN → Inventory core (stock, batch, serial, adjustment, transfer) + SKU Lifecycle Tracking wired in from the first stock event — **Module 74 (Warehouse Damage & Loss, Section 8.30) ships here, since it needs the same stock/serial/batch model this phase already builds** |
| 3 | Sales: Quotation → Sales Order → Delivery Challan → Invoice → Payment, with branded templates and the 4-format Export Engine live from this phase; full Quotation lifecycle (Section 8.27) and Print + Letterhead Toggle (Section 8.24) ship in the same phase — **Module 73 (Delivery Challan Return, Section 8.29) ships in this same phase, since it's the same Sales Order/Challan data extended with a return path, not a separate build** |
| 4 | Customer Advance / Partial Payment, wired into Sales Order and Invoice |
| 5 | Service Ops module: ServiceAssignment, TechnicianAssignment, ProductCustody, Advance, ConveyanceBill, Closure, Approval engine — Data Edit & Delete Governance (Section 8.25) ships as an extension of the Approval Engine in this same phase |
| 6 | **Full Core Accounting**, built out from the Phase 0 stub: Chart of Accounts management, Voucher Management Layer (Section 8.21), full auto-posting rules from Phases 2–5, Ledger, Trial Balance, P&L, Balance Sheet, Day Book/Cash Book/Bank Book/Receipt-Payment Statement (Section 8.22), Suspense Account Management (Section 8.23) |
| 7 | Company Loan & Investment Management, Employee Advance & Loan Management, wired into Accounting and Payroll |
| 8 | Warranty, Ticket/Complaint management (linked into Service Ops and SKU Lifecycle) — **Module 72 (Service-Only Customer Workflow, Section 8.28) ships here too: it's the same Ticket and ServiceAssignment work as the rest of this phase, plus the ticketType field and the paid-service quotation-approval gate** |
| 9 | Employee management: Timesheet, KPI, Attendance/Leave, Live Location Tracking |
| 10 | Multi-Module Workspace (taskbar, minimize/switch, DraftState autosave) rolled out across all modules built so far |
| 11 | Dashboards and full Reports/Analytics, including Project-wise and Department/Head-wise P&L, built against the Universal Drill-Down Standard (Section 8.26) from the first report onward — **Module 75 (Employee Work & Performance Reporting Layer, Section 8.31) ships here, as a reporting layer over data every earlier phase already produced** |
| 12 | Customer Portal + Vendor/Staff Portal, Notifications (email/SMS/push) |
| 13 | System Settings, Numbering templates, Import/Export, Backup, Audit Trail, Security hardening |
| 14 | Mobile PWA polish per role: offline sync, camera/GPS integration, push notifications, role-scoped install |
| 15 | Optional advanced modules (Section 8.18), prioritized by Brother's Technology System as needed |

Each phase ships with its own API tests and a working UI slice (including search/filter and export) before moving to the next.

**Added after initial requirements gathering:** Bank Transaction Proof (Section 8.20) is a cross-cutting capability best introduced alongside the Accounting phase (Phase 6), so it's in place before Company Loan, Employee Loan, and Payroll payments (Phase 7 onward) need it. Employee Payroll & Salary Self-Service (Section 8.19) extends the payroll work already planned in Phase 7, with the "My Salary" panel shipping alongside the dashboards work in Phase 11 and mobile self-service polish in Phase 14.

**Cross-check gap-fill (this revision):** Voucher Management, Day Book/Cash Book/Bank Book/Receipt-Payment Statement, and Suspense Account Management (Sections 8.21–8.23) all extend the Accounting phase (Phase 6). Data Edit & Delete Governance (Section 8.25) extends the Approval Engine already scheduled in Phase 5. Universal Print & Letterhead Toggle (Section 8.24) and the full Quotation module (Section 8.27) both extend the Sales phase (Phase 3). The Drill-Down Standard (Section 8.26) is built into every report from Phase 11 onward rather than retrofitted later.

**Requirements-validation follow-up (this revision):** the Phase 0 Posting/Ledger Stub is a direct response to a sequencing risk found in review — Phases 3–5 all auto-post journal entries as part of their core function, which would have nothing to post into before Phase 6 previously existed. The stub is intentionally minimal (a table and a posting function, not a UI) so Phase 6 remains where the real Chart-of-Accounts, ledger, and reporting work happens; Phase 0 just gives the earlier phases a valid target.

---

## 14. Assumptions & Open Questions

The following items are treated as assumptions in `architecture.md` but need final confirmation from stakeholders (Section 26):

| Topic | Assumption Made Here | Needs Confirmation |
|---|---|---|
| Company structure | Single company, multiple branches — not a multi-tenant SaaS for other clients | Y/N |
| Mobile delivery | Unified role-scoped PWA now; native apps (React Native) as a later phase | Y/N |
| Payment gateway | SSLCommerz (or an equivalent BD aggregator) for customer portal online payments | Confirm provider |
| Attendance/Leave | Included as part of "full remote employee management," though not explicitly detailed | Y/N |
| Advance treated as cost | Unreconciled technician advance counted as a project cost until reconciled at closure | Y/N |
| SMS gateway | Provider not yet specified — needs selection (e.g., a local aggregator) | Confirm provider |
| Employee loan interest | **Resolved: interest-free**, salary-deducted — confirmed directly by the stakeholder. Section 8.7 above is corrected to match; `architecture.md` §0 (which still says "interest-bearing") and its §26 still need the same correction. | Resolved |
| Company loan interest | **Resolved (Phase 0):** Company Loan is neither uniformly interest-free nor uniformly interest-bearing — either can occur, decided per loan. `CompanyLoan` carries its own `interestRate` field (see `Accounting_and_Finance_Full_Specification.md` §21); `architecture.md` §0's "interest-free" statement is corrected to match. | Resolved |
| Draft retention period | **Resolved: 1 hour** after last edit if not submitted — confirmed directly by the stakeholder, and already matches `architecture.md` §0; only `architecture.md` §26 still needs correcting to match. | Resolved |
| XML export schema | No external system named yet to define the exact XML schema against | Confirm target system(s) |
| Edit/Delete approver | **Resolved (Phase 0):** rather than adding a second approver role, a Super Admin's own actions/requests skip the approval gate entirely — no `ApprovalRequest` where the requester is a Super Admin ever sits `PENDING`; it is created already `APPROVED` (see `Accounting_and_Finance_Full_Specification.md` §67.2). Section 9.6's self-approval restriction is unchanged for every other role. | Resolved |
| Letterhead default | Assumed outbound documents (Quotation, Invoice, Challan, PO, Statements) default the Print Options toggle to "Yes, include letterhead" | Y/N |
| Sales Commission | **Resolved (Phase 0): deferred, not built now** — whether commission applies is not yet settled, so no Sales Executive KPI field, payroll input, or Commission Register report is built in the initial scope. Only the two placeholder Chart-of-Accounts lines are kept (see `Accounting_and_Finance_Full_Specification.md` §65.5). | Resolved (deferred) |
| Non-current asset categories | **Resolved (Phase 0):** all three ("Investments" outward, "Tender," "Pre-Production Expenses") are confirmed needed and kept in the Chart of Accounts (see `Accounting_and_Finance_Full_Specification.md` §65.3). | Resolved |
| Fiscal year convention | **Resolved (Phase 0): calendar year** (1 January – 31 December), not the Bangladesh statutory year (see `Accounting_and_Finance_Full_Specification.md` §57.2). | Resolved |
| Foreign currency / FX handling | **Resolved (Phase 0): out of scope.** All purchasing reaches the books already converted to BDT; no FX gain/loss accounting or exchange-rate capture is built (see `Accounting_and_Finance_Full_Specification.md` §57.4). | Resolved |
| Admin permission migration | **Resolved and signed off:** `admin-permission-migration-matrix.md` defines the default Admin profile plus five narrower ones (Operations/Branch/Service/Inventory/Project Admin); all six are needed from day one, not added later (see that document's Section 6, now signed off). | Resolved |
| Damage/Loss approval threshold | Section 8.30 requires approval before any disposition, but no specific value (amount or quantity) above which approval is mandatory has been set — assumed "always required" until a threshold is confirmed | Confirm whether a below-threshold auto-approval tier is wanted, or if every report requires approval regardless of value |

**Note:** Section 0 of `architecture.md` states a multi-tenant SaaS architectural assumption (`tenantId` on every entity), while the first row above assumes a single-company/multi-branch business model. These are not necessarily contradictory — the underlying architecture is being kept multi-tenant-capable for the future, while current business usage is single-tenant. Still, this is worth explicitly confirming with stakeholders to avoid future misunderstanding.

---

## 15. Risks & Mitigations

The risks below are suggested based on a review of `architecture.md`'s scope and assumptions — they are not stated directly in the source document, and are added here for planning purposes.

| Risk | Impact | Suggested Mitigation |
|---|---|---|
| Scope size (75 modules) | Delivery delays, scope creep | Strictly follow the phasing in Section 13; keep Phase 15 modules priority-driven |
| Approval bottleneck | If the Accounts/Admin team is under-resourced, `ApprovalRequest`s pile up and block technicians/sales | Add an approval-aging report and escalation rules |
| Offline sync conflicts | Data conflicts when the same visit report is updated from multiple devices | Clearly define a conflict-resolution policy (e.g., last-write-wins or merge rules) |
| Free-tier SMS gateway dependency | Low reliability/throughput, missed critical notifications | Evaluate a paid fallback gateway |
| Google Maps API cost at scale | Budget increases as technician/employee count grows | Set up quota monitoring and billing alerts |
| Sensitive data (NID, payment info) | Data breach risk, regulatory compliance concerns | Ensure the encryption noted in Section 10 is enforced and review applicable Bangladeshi data-protection rules |
| Super Admin single point of failure | Every edit/delete on submitted data needs Super Admin sign-off (Section 8.25), and Super Admin's own actions are auto-approved with no independent check (Section 14, "Edit/Delete approver," resolved). If that person is unavailable, other roles' corrections stall platform-wide; if that account is compromised, nothing else in the system can block its actions | Monitor Edit/Delete Request aging the same way approval-aging is already tracked; treat Super Admin credential security (Section 10) as the primary control, since no in-app approval gate applies to this role |

---

## 16. Glossary

- **ServiceAssignment ("Project")** — the field-service unit of work tied to an order/invoice/ticket.
- **Custody** — products/equipment currently in a technician's possession for a specific project.
- **Reconciliation** — matching an advance against actual approved spend at project closure (technician), or against payroll deductions (employee loan).
- **SKU Lifecycle** — the full, ordered trail of stage-changes one serialized/batch unit goes through from purchase order to its final state.
- **Draft State** — a user's unsaved, in-progress form data for a module, auto-saved so switching or minimizing modules never loses it.
- **P&L (Project-wise / Department-wise)** — profitability computed per order/assignment or per department, distinct from the company's standard accounting P&L but reconciled through auto-posted journal entries.
- **PRD (Product Requirements Document)** — this document; captures business requirements, scope, and feature-level detail.
- **RBAC (Role-Based Access Control)** — role-based menu/route-level access control.
- **PWA (Progressive Web App)** — a web app that can be installed and used like a native app on mobile devices.
- **PayrollRun / PayslipLine** — a single month's payroll batch for a branch, and the computed, per-employee salary line within it (added after initial requirements gathering — Section 8.19).
- **BankTransactionProof** — the required bank name, account details, and cheque/slip image attached to any transaction settled by bank or cheque (added after initial requirements gathering — Section 8.20).
- **Voucher** — the user-facing transaction-entry document (Payment, Receipt, Journal, Contra, etc.) that creates an accounting journal entry on posting (Section 8.21).
- **Suspense Account** — a temporary holding account for money that cannot yet be definitively classified, resolved via an approved reclassification (Section 8.23).
- **Drill-Down** — the standard path (Summary → Breakdown → Source Document) every report figure supports, so no number is a dead end (Section 8.26).
- **Print Options / Letterhead Toggle** — the prompt shown when printing or exporting an outbound document, asking whether to include the company letterhead header/footer (Section 8.24).
- **Record Edit/Delete Request** — the Super-Admin-gated approval request created whenever anyone attempts to edit or delete a submitted/posted record (Section 8.25).
