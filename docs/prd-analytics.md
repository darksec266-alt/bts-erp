# PRD Analysis Report — Brother's Technology System

**Prepared as an independent Business / Product / Software Analyst review**
**Reviewed document:** `prd.md` — Product Requirements Document, Version 2.1 (Nginx Edge Layer Update), dated 6 September 2026
**Cross-referenced against:** `architecture.md` (v3.1), `Accounting_and_Finance_Full_Specification.md` (v3.1), `ui.md` (v2.0), `architecture_nginx.md`
**Review date:** 6 September 2026

---

## 1. Project Summary

Brother's Technology System is commissioning a single, unified Business Management Platform to bring its two revenue streams — selling technology hardware (CCTV, networking, computer equipment) and installing/repairing/maintaining it — into one system of record: one PostgreSQL database, one API, one permission model, across multiple branches in Bangladesh.

This is a **greenfield build** (explicitly confirmed in `architecture.md` §37 — not a retrofit of a live application). Scope has grown in three waves: an original core scope, then modules 64–65 (payroll self-service, bank transaction proof) added after initial requirements gathering, then modules 66–71 (voucher management, day/cash/bank book reporting, suspense accounts, universal print & letterhead, Super-Admin edit/delete governance, and universal report drill-down) added via a cross-check against a separate reference document, `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, which was **not** provided alongside the five documents this review covers. The platform now spans **71 modules**. Nginx was added as a mandatory production edge/reverse-proxy layer in the latest revision (v2.1/v3.1 across the document set).

The PRD is unusually mature for a "Draft for Review" — it already carries its own risk register, success metrics, and a 14-item assumptions log. This review pressure-tests it: where it disagrees with its own companion documents, what's still unresolved, and what's absent that a platform of this financial and operational scope would normally need before Phase 0 starts.

---

## 2. Goals

Restated from PRD §4 as outcomes:

1. End-to-end inventory control with full SKU-level lifecycle traceability (procurement → sale/installation → return).
2. End-to-end finance control with 100% Profit & Loss visibility — company-wide, per project, and per department/head.
3. A complete technician field-service workflow (assignment → custody → advance → conveyance → approval → closure) rolled directly into project profitability.
4. Customer advance / partial-payment tracking against projects.
5. Company loan and investment tracking, visible in the books and in cash-flow planning.
6. Employee advance/loan management, reconciled against payroll.
7. Live location tracking and remote employee management.
8. A single role-scoped mobile experience (PWA now, native apps later) instead of separate per-role app builds.
9. A multi-module workspace where switching modules never discards unsaved work.
10. Universal document export (CSV/PDF/Word/XML) and, as of v2.0, universal print with an optional letterhead.
11. Platform-wide data governance — no record changes after submission without Super Admin approval.
12. Drill-down reporting — no dashboard number is a dead end.
13. A standalone Quotation module with its own lifecycle and win/loss reporting.

---

## 3. Actors

**External system actors** the platform depends on or feeds:

| Actor | Role | Source |
|---|---|---|
| Payment gateway (SSLCommerz or equivalent) | Processes customer portal online payments | PRD §11, §14 |
| SMS gateway (provider unconfirmed) | Delivers SMS notifications | PRD §8.14, §14 |
| Email service | Delivers email notifications | PRD §8.14 |
| Google Maps API | Geocoding, live technician tracking, geofencing | PRD §11 |
| S3-compatible object storage | Stores product images, receipts, signed documents, exports | PRD §11 |
| Nginx edge layer | Every request from every human/system actor passes through it first (TLS, routing, rate limiting) before reaching the application | `architecture.md` §38 |
| External auditor / tax software (XML export consumer) | The stated reason XML export exists, but never itself named | PRD §14 |

Human actors are detailed in Section 4 (User Types) below.

**Note:** the XML-consuming external system is currently a placeholder — no specific system has been named to define the schema against (see Assumptions, item 10).

---

## 4. User Types

| Role | Platform | Access Summary | Notes |
|---|---|---|---|
| Super Admin | Web | Everything, incl. system settings/backups; **sole** approver for every Edit/Delete Request platform-wide | Single point of failure — see Section 9.5 |
| Admin | Web | Everything except system-level config | |
| Accounts / Finance | Web | Finance, payments, advances, loans, investments, approvals, reports | Primary approver for most `ApprovalRequest`s |
| HR / Payroll Officer | Web | Employee records, payroll, employee advances/loans, attendance/leave | |
| Branch Manager | Web | Own branch's sales, inventory, staff, reports | Row-level scoped to one branch |
| Sales Executive | Web/Mobile | Quotation, order, customer, own KPIs, customer advance entry | |
| Warehouse / Inventory Staff | Web | Stock, GRN, transfer, adjustment, SKU lifecycle updates | |
| Technician / Field Staff | Mobile PWA only | Only own assignments, custody, advance, conveyance, visit reports | Most restricted role; primary user of offline-tolerant mode |
| Customer | Portal | Own quotations/orders/invoices/tickets/warranty, own advance/due balance | External actor with system access |
| Vendor / Supplier Staff | Portal | Own POs, payments, statement | External actor with system access |

Every internal employee (all roles except Customer and Vendor) additionally gets a personal "My Salary" panel (PRD §8.19).

---

## 5. Functional Requirements

71 modules grouped into 27 functional areas (PRD §8.1–8.27). Module numbers are preserved for direct traceability into `architecture.md` and `prd.md`.

| Area | Modules | Core Requirement |
|---|---|---|
| 8.1 Identity & Access | 1–3 | Login, RBAC, JWT + refresh auth, branch/department scoping |
| 8.2 Master Data | 5,6,7,41 | Product, supplier, customer, warehouse/location masters |
| 8.3 Procurement | 8 | PR → PO → GRN → Purchase Invoice → Payment; serial/batch tagging at GRN |
| 8.4 Sales | 9,10,14,15,16 | Quotation → Order → Challan → Invoice → Payment; letterhead branding |
| 8.5 Inventory & SKU Lifecycle | 11,12,13,53 | Stock ledger, FIFO/moving-average valuation, full unit lifecycle trail |
| 8.6 Field Service & Technician Ops | 21,22,46,47,49 | The platform's core differentiator — order → technician → closure → P&L |
| 8.7 Finance & Accounting | 17,18,29,48,51,52,54,55 | COA, journals, ledger, P&L, advances, loans, investment |
| 8.8 Customer Support | 19,20 | Ticket/complaint management, warranty |
| 8.9 HR & Workforce | 2,23 | Employee records, KPI, attendance/leave |
| 8.10 Reporting & Analytics | 4,26,48,58 | Dashboards, standard + department/head-wise reports |
| 8.11 Universal Document Export | 56 | One data source → CSV/PDF/Word/XML; sync for single records, async for bulk |
| 8.12 Multi-Module Workspace | 57 | Minimize/switch modules; `DraftState` autosave every 5–10s |
| 8.13 Search & Filter Standard | 33 | Search + filter (date/status/branch minimum) on every list screen |
| 8.14 Notifications & Approval | 24,25 | Generic approval engine reused across 12+ transaction types |
| 8.15 Customer & Vendor Portals | 38,39 | Self-service view + online payment (customer only) |
| 8.16 Mobile / Role-Scoped Apps | 50 | PWA now, per-role home screens; native app later, same API |
| 8.17 System Admin, Security & Data Mgmt | 27,28,30–37,42,44,45 | Audit trail, backups, Nginx first-layer + app-layer security |
| 8.18 Optional Advanced Modules | 59–63+ | Full payroll, fixed assets, AMC, bank reconciliation, barcode, CRM, VAT filing, e-signature (Phase 15) |
| 8.19 Payroll & Salary Self-Service | 64 | `PayrollRun`/`PayslipLine`, "My Salary" panel, real-time advance-conveyance reconciliation |
| 8.20 Bank Transaction Proof | 65 | Mandatory proof attachment for every bank/cheque-settled transaction |
| 8.21 Voucher Management | 66 | 12 voucher types; 5 auto-generated, 7 manual; sequential numbering; reversal-only correction |
| 8.22 Day/Cash/Bank Book & Receipt-Payment | 67 | Four standard accounting reports, incl. Cheque Register with auto-reversal on bounce |
| 8.23 Suspense Account Mgmt | 68 | Temporary holding account + aging report for unclassifiable receipts/payments |
| 8.24 Universal Print & Letterhead | 69 | Print alongside export; letterhead prompt on outbound docs only |
| 8.25 Data Edit & Delete Governance | 70 | Super-Admin-only approval for any post-submission edit/delete |
| 8.26 Universal Drill-Down | 71 | Summary → Breakdown → Source Document, on every report figure |
| 8.27 Quotation Module | extends 9 | Full lifecycle: Draft → Sent → Accepted → Rejected → Expired → Converted |

---

## 6. Non-Functional Requirements

As stated in PRD §10 / `architecture.md` §23:

- **Multi-branch awareness** — every major entity carries `branchId`.
- **Offline tolerance** — technician visit reports cache locally, sync on reconnect.
- **Localization** — BDT currency, Bangla + English UI, Asia/Dhaka timezone.
- **Performance** — paginated/indexed list APIs, background jobs for heavy reports/exports.
- **Auditability** — no hard deletes on financial/inventory/loan/advance tables.
- **No lost work** — draft-autosave on every data-entry form.
- **Security** — bcrypt/Argon2 password hashing, RBAC + route guards, CSRF/XSS protection, parameterized queries.
- **Encryption** — HTTPS (TLS terminated at Nginx), at-rest encryption for sensitive fields (payment info, NID uploads).
- **Backup** — automated daily backups, on-demand restore.
- **Edge protection (new, v2.1)** — Nginx-level TLS termination, first-layer rate limiting, request-size limits, security headers.

**Gap:** `architecture_nginx.md` (a full 1,309-line companion document) already defines a layered rate-limit policy, `/health` / `/health/live` / `/health/ready` endpoints, per-upstream failure-handling behavior, and a timeout strategy — none of this operational depth is reflected in the PRD's NFR section, which mentions Nginx in one line. See Section 10, item 1.

---

## 7. Business Rules

Concrete, atomic rules pulled from across the document set — not exhaustive, but the ones a delivery team is likeliest to get wrong if not called out explicitly:

1. A record leaving draft status can never be edited or deleted directly by anyone, including Admin — only a Super-Admin-approved Edit/Delete Request can change it (§8.25).
2. A financial/inventory/loan/advance "delete" is never a hard delete — it's always a reversal or cancellation that preserves the audit trail; only non-financial master data with zero linked transactions gets an actual soft delete (§8.25).
3. A bank/cheque-settled transaction cannot be marked complete/paid without a bank proof attachment, with no exceptions, across salary, supplier payment, customer payment, loan, and investment transactions (§8.20).
4. Full bank account numbers are never stored — only the last 4 digits, masked (§8.20).
5. A posted voucher is never edited or deleted — only reversed by an equal-and-opposite reversal voucher, itself Super-Admin-gated (§8.21).
6. Sales, Purchase, Sales Return, Purchase Return, and Expense vouchers are system-generated automatically at posting; every other voucher type is manually entered (§8.21).
7. A technician's shortfall/excess on project advance vs. actual approved spend is queued as a payroll deduction or reimbursement the moment both the conveyance bill and closure report are approved — visible in real time, before the next payroll run even happens (§8.19).
8. Outbound documents (Quotation, Invoice, Challan, PO, Statement) prompt for a letterhead choice at print/export time; purely internal reports (Ledger, Trial Balance, dashboards) never do (§8.24).
9. A quotation past its validity date with no customer decision auto-expires; accepting one converts it 1:1 into a Sales Order with no re-keying (§8.27).
10. `DraftState` auto-saves every 5–10 seconds and immediately on minimize, keyed by `userId + moduleKey (+ recordId)` — retained for 1 hour per direct stakeholder confirmation (not yet reflected consistently in the source documents themselves — see Section 9.1).
11. Row-level data scoping applies underneath role-based screens — a UI bug can never expose another user's data, because the query itself is filtered server-side.
12. A bounced cheque automatically reverses the original payment/receipt it was recorded against (§8.22).
13. Nginx may never cache authenticated or tenant-specific responses — financial, customer, employee, and inventory data are never edge-cached (`architecture_nginx.md`, Golden Rule 7).

---

## 8. Assumptions

The 14 items PRD §14 lists as needing stakeholder confirmation, with current status added by this review:

| # | Topic | Assumption in the Document | Actual Status |
|---|---|---|---|
| 1 | Company structure | Single company, multi-branch — not multi-tenant SaaS for other clients | **Confirmed** — standalone project, single company (per stakeholder) |
| 2 | Mobile delivery | Unified PWA now; native apps later | Open |
| 3 | Payment gateway | SSLCommerz or equivalent BD aggregator | Open — provider not finalized |
| 4 | Attendance/Leave | In scope | Open on paper, though treated as settled everywhere else in the document |
| 5 | Advance treated as cost | Unreconciled technician advance = project cost until reconciled | Open |
| 6 | SMS gateway | Provider unspecified, free-tier | Open |
| 7 | Employee loan interest | Stated as "interest-bearing" in this table; conflicts elsewhere | **Confirmed: interest-free** (per stakeholder) — documents not yet corrected; see Section 9.1 |
| 8 | Company loan interest accrual | Assumed simple interest on reducing balance | Open — and logically inconsistent with "interest-free" stated elsewhere; see Section 9.1 |
| 9 | Draft retention period | Stated as "kept indefinitely" in this table; conflicts elsewhere | **Confirmed: 1 hour** (per stakeholder) — documents not yet corrected; see Section 9.1 |
| 10 | XML export schema | No target system named | Open |
| 11 | Edit/Delete approver | Only Super Admin, no delegate | Open — already flagged as a continuity risk in PRD §15 |
| 12 | Letterhead default | Defaults to "Yes, include letterhead" | Open |
| 13 | Sales Commission | No BTS requirement raised; appears only in the external cross-check document's generic chart of accounts | Open — see Section 10, item 11 for downstream impact if confirmed |
| 14 | Non-current asset categories | "Investments," "Tender," "Pre-Production Expenses" — generic, unconfirmed as BTS-relevant | Open |

---

## 9. Problems & Inconsistencies Identified

### 9.1 The "Confirmed" section and the "Open Questions" section disagree — on three items, not one

`architecture.md` §0 lists eleven items as already confirmed. Its own §26 ("Open Questions") — and `prd.md` §14, meant to mirror §26 — still list three of those same eleven, with different values:

| Item | §0 says (confirmed) | §26 / PRD §14 says (still "open") | Actual decision |
|---|---|---|---|
| Employee loan interest | Interest-bearing | Interest-free (`architecture.md` §26) / Interest-bearing (`prd.md` §14 — a third, different value) | **Interest-free** |
| Draft retention | 1 hour only | Kept indefinitely | **1 hour** |
| Company loan interest | Interest-free | "Simple interest on reducing balance" needs confirming — which only makes sense if interest exists at all | Unresolved (see below) |

The employee-loan row is the clearest case: three sources state three different values for one fact. This isn't a business disagreement to mediate — it's a document-maintenance gap. Whatever process produced `architecture.md` v3.1 updated §0 without updating §26, and `prd.md` copied wording that now matches neither.

The company-loan item is smaller but is also a genuine, unresolved logical contradiction, not just stale text: if Company Loan is confirmed interest-free (§0), there is nothing for "confirm the accrual method" (§26/PRD §14) to be asking about. Either the loan does carry interest and §0 needs correcting, or it doesn't and that Open Questions row should be removed rather than answered.

**Recommendation:** before Phase 0, reconcile `architecture.md` §0 against §26, and `prd.md` §14 against both, in a single pass — deleting resolved rows instead of letting them accumulate release after release.

### 9.2 A stale module count in the Risk Register

PRD §15 ("Risks & Mitigations") lists the first risk as "Scope size (**63 modules**)." Every other part of the same document — the §8 intro, §5.1 Scope — states **71 modules**. §15 was evidently written before the six cross-check gap-fill modules (66–71) were added, and never updated.

### 9.3 A referenced document this review could not check

Both `prd.md` and `architecture.md` cross-check extensively against `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md` — it's the stated origin of six whole modules (66–71) and two open Assumption rows (Sales Commission, Non-current asset categories). That document wasn't provided alongside the five reviewed here, so this review can confirm the cross-check's *conclusions* are internally consistent with the rest of the PRD, but can't independently verify the cross-check itself was applied completely or correctly. Recommend including it in the next review pass.

### 9.4 A stale version reference inside the PRD itself

`prd.md`'s own title block (line 6) correctly states its Finance-spec source as v3.1 — confirmed against the Finance spec's own header, which does say **Version 3.1**. But `prd.md` §1 (Introduction, body text) still says the Finance spec is "**v3.0**." This is a small but real internal inconsistency worth a one-line fix.

### 9.5 Super Admin is a named single point of failure with an unresolved mitigation

This one is already self-aware in the document (PRD §15 flags it, §14 asks whether a second approver role is needed) — flagged here only to note that of everything in this review, it's the item with the widest blast radius if left unresolved: every Edit/Delete Request platform-wide, across all 71 modules, stalls if one person is unavailable.

---

## 10. Missing Requirements

Gaps this review found that aren't flagged anywhere in the existing Assumptions/Open Questions lists:

1. **No quantitative NFR targets.** Every performance/availability requirement is qualitative — "moderate request rate," "strict rate limit," "the exact limit should follow business requirements" (`architecture_nginx.md` §14–15). Nothing states a target uptime %, p95/p99 API response time, concurrent-user target, actual rate-limit numbers per tier, or maximum upload file size. Infrastructure can't be sized, and Nginx can't be configured, from qualitative language alone.
2. **No Recovery Time / Recovery Point Objectives.** "Automated daily backups" is stated, but not how long a restore may take (RTO) or how much data loss is acceptable in the worst case (RPO) — this matters a great deal for a system of record holding loan, payroll, and inventory data.
3. **No data retention/archival policy.** Financial and inventory records are never hard-deleted, but no retention period is stated for audit logs or exported files, and no archival tier is described for aging historical data — relevant given Bangladesh's statutory bookkeeping retention expectations.
4. **No named regulatory/compliance framework.** PRD §15 flags "review applicable Bangladeshi data-protection rules" as a risk but never names which rules apply — relevant given the platform explicitly captures and stores NID images (§8.20) — nor assigns an owner for that review.
5. **No user onboarding/training/change-management plan.** Ten distinct role types — several field-based and not necessarily technical (Technician, Warehouse Staff) — are getting a new system of record with mandatory GPS check-ins, approval workflows, and mobile self-service, with no stated training plan or phased rollout-per-branch approach.
6. **No formal QA/UAT/acceptance strategy.** Phase completion is defined only as "its own API tests and a working UI slice" (§13) — no UAT sign-off step, staging environment, or defined per-phase acceptance criteria is described.
7. **No browser/device/OS support matrix.** "Lightweight assets for 3G/4G" is stated for Technician/Sales roles, but no minimum Android/iOS version, browser matrix, or minimum device spec is defined — relevant given field staff are the likeliest to carry older or budget devices.
8. **No notification delivery guarantee or channel preference control.** No stated way for a user to opt in/out per channel (email/SMS/push), and no retry/escalation policy if a critical notification — an approval request, for instance — fails to deliver. This compounds the Super Admin bottleneck already flagged (Section 9.5).
9. **No API versioning strategy.** One Express API will be consumed by a PWA today and, per the roadmap, native apps and possibly external integrations (the stated reason XML export exists) later — nothing describes how breaking changes are managed once multiple client versions are in the field.
10. **No zero-disruption deployment strategy.** Technicians work live from the field; nothing describes how deployments avoid interrupting an in-progress mobile session — blue-green deployment, maintenance windows, or graceful Socket.IO reconnection are all unaddressed.
11. **Sales Commission is scoped as a single open question but has unscoped downstream impact.** If confirmed "yes" (Assumptions #13), it isn't just a new chart-of-accounts entry — it implies a new Sales Executive KPI field (§8.10), a new payroll input (§8.19), and a new report type (Commission Register) that don't exist anywhere in the current 71-module scope. Worth resolving early precisely because "yes" is not a small addition.
12. **Multi-currency/FX handling for imports is absent from the PRD**, even though `Accounting_and_Finance_Full_Specification.md` §57.4 raises it as an open question for imported CCTV/networking hardware. If any purchase is ever settled in USD, Gross Profit/COGS could be silently misstated without an explicit policy — this belongs in the PRD's Finance section (§8.7) as much as in the Finance spec.
13. **Fiscal year convention is absent from the PRD**, for the same reason — `Accounting_and_Finance_Full_Specification.md` §57.2 flags Bangladesh statutory year (July–June) vs. calendar year as unresolved, but the PRD's Finance section doesn't mention it at all.

---

## 11. Questions

Beyond the 8 still-genuinely-open rows already tracked in Section 8 (Assumptions), these need a stakeholder answer before or during Phase 0:

1. Given the stakeholder has already verbally confirmed **Employee Loan = interest-free** and **Draft Retention = 1 hour**, who updates `architecture.md` §0/§26 and `prd.md` §14 to state this consistently — and is verbal confirmation sufficient, or does this need sign-off in writing given the documents currently disagree three ways?
2. Does **Company Loan** carry interest or not? If yes, "interest-free" in `architecture.md` §0 needs correcting. If no, the "confirm accrual method" row in Open Questions should be removed rather than answered.
3. Can this review get direct access to `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, to independently verify the six cross-check-derived modules (66–71) and the two accounting-only open items (Sales Commission, Non-current asset categories) rather than relying on this PRD's summary of it?
4. What are the actual numeric targets behind the qualitative NFRs in `architecture_nginx.md` — rate-limit thresholds per tier, max upload size, uptime target, RTO/RPO? These are needed before infrastructure sizing or an actual Nginx config can be written.
5. Is a second, equally-trusted approver role needed for Edit/Delete Requests if the Super Admin is unavailable — already flagged as a risk in PRD §15 but still unanswered in §14?
6. Does Brother's Technology System pay any form of sales commission today, even informally? This single answer determines whether three additional areas (KPI dashboard, payroll, reporting) need scoping now or can safely stay deferred.
7. Is there a target go-live date or phase-by-phase deadline? The roadmap (§13) is sequenced but not dated, which makes the "scope size" risk in §15 hard to actually manage.
8. Who owns the Bangladesh regulatory/compliance review flagged as a risk (§15) — Legal, Accounts, or an external consultant — and by which phase must it conclude?

---

*This review covers `prd.md` v2.1, `architecture.md` v3.1, `Accounting_and_Finance_Full_Specification.md` v3.1, `ui.md` v2.0, and `architecture_nginx.md`, as uploaded 6 September 2026. It does not have access to `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, referenced extensively by the other documents (Section 9.3).*
