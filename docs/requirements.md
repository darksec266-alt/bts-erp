# Requirements Validation & Analysis Report

**Subject:** `prd.md` v2.2 — Brother's Technology System Unified Business Management Platform
**Cross-referenced against:** `architecture.md` v3.1, `Accounting_and_Finance_Full_Specification.md` v3.1, `ui.md` v2.1, `architecture_nginx.md`
**Prepared as:** an independent requirements-engineering / QA validation pass, structured around 16 fixed headings
**Date:** 6 September 2026

### Methodology note

Two of the sixteen headings (§1 Coverage Matrix, §15 Traceability Matrix) are systematic and cover **all 71 modules** — nothing is sampled there. The other fourteen are analytical rather than enumerable: a genuinely exhaustive edge-case or validation-rule list for 71 modules would run to thousands of low-value entries. Those sections are organized by functional cluster and prioritize findings that would actually cause a defect, a financial misstatement, a security gap, or an implementation blocker — not every theoretically possible scenario. Anything that needs a business decision rather than a documentation fix is marked as a question and consolidated in §16.

---

## 1. Requirement Coverage Matrix

Coverage is checked against four places a requirement should show up: the functional description (PRD §8), the data model/API (`architecture.md`), the UI treatment (`ui.md`), and — where money moves — the ledger posting logic (Finance spec). ✅ = present and consistent · ⚠ = present but thin/partial · ❌ = not found.

| # | Module (PRD §) | Functional Spec | Data Model | UI Coverage | Finance Posting | Note |
|---|---|---|---|---|---|---|
| 1–3 | Identity & Access (8.1) | ✅ | ✅ | ✅ (app shell, §3–4 of ui.md) | n/a | |
| 5,6,7,41 | Master Data (8.2) | ✅ | ✅ | ⚠ | n/a | UI spec defines the generic Data Table/Form components these use, not a screen-by-screen layout per master — reasonable for a design *system*, but worth confirming that's intentional |
| 8 | Procurement (8.3) | ✅ | ✅ | ⚠ (same as above) | ✅ | |
| 9,10,14,15,16,27(Quotation) | Sales (8.4, 8.27) | ✅ | ✅ | ✅ (Quotation lifecycle has explicit states) | ✅ | |
| 11,12,13,53 | Inventory & SKU Lifecycle (8.5) | ✅ | ✅ | ⚠ | ✅ | |
| 21,22,46,47,49 | Field Service & Technician Ops (8.6) | ✅ | ✅ | ✅ (dedicated mobile card-stack home screen, ui.md §12) | ✅ | The platform's best-covered area across all four columns |
| 17,18,29,48,51,52,54,55 | Finance & Accounting (8.7) | ✅ | ✅ | ⚠ | ✅ | UI spec covers dashboards, not the ledger/journal entry screens themselves in any detail |
| 19,20 | Customer Support (8.8) | ✅ | ✅ | ⚠ | n/a | |
| 2,23 | HR & Workforce (8.9) | ✅ | ⚠ | ⚠ | n/a | Attendance/Leave explicitly flagged as "not explicitly detailed" (PRD §14) — thinnest functional coverage in the document |
| 4,26,48,58 | Reporting & Analytics (8.10) | ✅ | ✅ | ✅ | n/a | |
| 56 | Document Export (8.11) | ✅ | ✅ | ✅ | n/a | |
| 57 | Workspace/Draft Autosave (8.12) | ✅ | ✅ | ✅ (new taskbar component) | n/a | |
| 33 | Search & Filter (8.13) | ✅ | ⚠ | ✅ | n/a | Stated as a cross-cutting standard rather than a model with its own schema — reasonable, flagged only for completeness |
| 24,25 | Notifications & Approval (8.14) | ⚠ | ✅ | ⚠ | n/a | Functional spec names the engine and reuse pattern but not a full trigger catalog — see §8 below |
| 38,39 | Customer/Vendor Portals (8.15) | ✅ | ✅ | ✅ | n/a | |
| 50 | Mobile/Role-Scoped Apps (8.16) | ✅ | ✅ | ✅ | n/a | |
| 27,28,30–37,42,44,45 | System Admin/Security (8.17) | ✅ | ⚠ | ⚠ | n/a | See §5 (Security Validation) — several sub-areas (secrets management, MFA, dependency scanning) aren't covered by any of the five documents |
| 59–63 | Optional Advanced Modules (8.18) | ✅ (deliberately high-level, Phase 15) | ❌ | ❌ | ⚠ | Intentionally deferred, not a gap |
| 64 | Payroll & Self-Service (8.19) | ✅ | ✅ | ✅ | ✅ | |
| 65 | Bank Transaction Proof (8.20) | ✅ | ✅ | ⚠ | ✅ | |
| 66 | Voucher Management (8.21) | ✅ | ✅ | ⚠ | ✅ | |
| 67 | Day/Cash/Bank Book (8.22) | ✅ | ✅ | ⚠ | ✅ | |
| 68 | Suspense Account (8.23) | ✅ | ✅ | ⚠ | ✅ | No aging-escalation policy once an item ages past the report — see §9 |
| 69 | Print & Letterhead (8.24) | ✅ | ✅ | ✅ | n/a | |
| 70 | Edit/Delete Governance (8.25) | ✅ | ✅ | ✅ (dedicated badge/flow component) | n/a | |
| 71 | Drill-Down Standard (8.26) | ✅ | ⚠ | ⚠ | n/a | Principle is clear; per-report drill-down target isn't enumerated report-by-report |

**Summary:** of 71 modules, the large majority have solid three- or four-way coverage. The weakest links are Attendance/Leave (thin functional detail, self-acknowledged in PRD §14) and the System Admin/Security cluster, where several expected sub-topics (see §5) don't appear in *any* of the five documents rather than just being thin in one.

---

## 2. Missing Flow Analysis

PRD §9 documents six key workflows. These business-logic flows are implied by the functional requirements but have no step-by-step walkthrough anywhere in the five documents:

1. **Purchase Return / Sales Return.** Both have data states (§8.3, §8.4 reference return flows in passing) but no walkthrough of who initiates it, what approval it needs, and how it reverses the original inventory/ledger entries.
2. **Stock Transfer Between Branches.** Multi-branch inventory is central to the platform, but there's no documented flow for moving stock from Branch A's warehouse to Branch B's — only single-branch procurement→sale is walked through.
3. **Warranty Claim → Repair-or-Replace Decision.** §8.8 establishes the ticket/warranty module exists; the decision flow (who decides repair vs. replace, and how that choice affects inventory/COGS) isn't walked through.
4. **GRN Discrepancy Handling.** What happens when a Goods Receipt Note doesn't match the Purchase Order (short-shipment, damaged units, wrong SKU) isn't addressed — only the happy-path PO→GRN→Invoice is documented.
5. **Technician Reassignment Mid-Job.** If a technician becomes unavailable mid-`ServiceAssignment` (illness, resignation), there's no flow for custody handoff or advance-transfer to a replacement technician.
6. **Quotation Revision/Negotiation.** §8.27 documents Draft→Sent→Accepted/Rejected/Expired/Converted, but not a Sent→Revised→Re-sent loop for customer negotiation, which is a normal part of a quotation lifecycle.
7. **New User Provisioning, End to End.** HR records a new hire (§8.9); Identity & Access creates login credentials (§8.1) — but the handoff between "HR onboards an employee" and "IT/Admin provisions their system account and role" isn't walked through as a flow, which matters given Module 70's Super-Admin-gated governance already treats access changes as sensitive.
8. **Fiscal Year-End Close, at the PRD level.** The Finance spec has a detailed closing sequence internally, but it's never surfaced as one of PRD §9's key workflows even though it's one of the highest-stakes recurring processes in the whole platform.

---

## 3. Edge Case Analysis

Organized by cluster; each entry is a scenario the current specification doesn't clearly resolve.

**Inventory & Sales**
- Two branches attempt to sell the last unit of a serialized SKU at the same moment — is there an explicit reservation/lock, or a race condition?
- A quotation is accepted by the customer in the same window it auto-expires — which wins?
- A customer's advance payment exceeds the final order total after a late discount — is the excess refunded, credited forward, or blocked at entry?

**Field Service**
- A technician is assigned but never checks in or submits a conveyance bill — does the `ServiceAssignment` stay open indefinitely, or is there a timeout/escalation?
- A conveyance bill is submitted *after* the project closure report is already approved — §58's reconciliation engine is described as firing when both are approved together; this ordering isn't addressed.
- GPS is unavailable or disabled on the technician's device — is check-in blocked, or does it fall back to a manual/photo-based proof?

**Finance**
- A reversal voucher is itself later found to be wrong — is a reversal-of-a-reversal permitted, or does that require a different mechanism?
- Multi-line journal entries with per-line rounding could fail to sum to a balanced debit/credit total by a paisa — no rounding convention is specified anywhere (confirmed absent from the Finance spec).
- A fiscal period is closed while a `DraftState` transaction for that period still exists unsubmitted — does closing force-discard it, or block the close?

**Payroll**
- An employee resigns mid-cycle while a §58 advance-conveyance reconciliation is still pending against them — how is the shortfall/excess settled without a next payroll run to apply it to?
- A salary structure change is backdated after a `PayrollRun` for that period already posted — is a correction run supported?

**Approvals**
- A second Edit/Delete Request is submitted for a record that already has one pending — does it queue, replace, or get rejected as a duplicate?

---

## 4. Error Handling Validation

| Area | Specified? | Detail |
|---|---|---|
| Field-level input validation (required/format/range) | ❌ | PRD operates at business-requirement level; no field-by-field validation spec exists yet in any of the five documents — reasonable at this stage, but worth flagging so it isn't assumed done |
| Background job failures (BullMQ) | ❌ | BullMQ is named as the job-queue technology (`architecture.md`), but no retry count, backoff policy, or dead-letter/failure-visibility mechanism is specified anywhere — confirmed by direct search of the source text |
| External API failure — Google Maps | ⚠ | Cost-at-scale is flagged as a risk (PRD §15); user-facing fallback behavior if the Maps API is down or over quota is not described |
| External API failure — SMS/Payment gateway | ⚠ | Reliability risk is flagged generically (PRD §15); no specific fallback UX (e.g., what a Customer sees if SSLCommerz times out mid-payment) is described |
| Large export/report generation failure | ⚠ | Heavy reports are routed to background jobs (§8.11), but no failure/retry/notify-user behavior is defined for when that background job itself fails |
| Concurrent edit conflicts (two users editing one record) | ❌ | Not addressed for standard web records (only the technician-offline-sync case is flagged, and only as an unresolved risk — see §13) |

---

## 5. Security Validation

- **Authentication:** JWT + refresh tokens specified; password hashing (bcrypt/Argon2) specified. Password complexity/length rules and **multi-factor authentication are not mentioned anywhere**, including for Super Admin and Accounts/Finance — the two roles with the widest financial blast radius in the whole platform.
- **Authorization:** RBAC plus row-level scoping is a stated principle, but **no exhaustive role × module permission matrix exists** in any of the five documents (confirmed by direct search) — access rules are described narratively per role rather than tabulated, which makes "did we cover every role for every module" hard to verify.
- **Secrets management:** database credentials, JWT signing secret, and third-party API keys (SSLCommerz, Google Maps, SMS) have no stated storage/rotation mechanism (`.env`, Docker secrets, a vault) anywhere in the architecture documents.
- **Dependency/supply-chain security:** no mention of dependency scanning (`npm audit`, Dependabot or equivalent) for a platform that will accumulate a large `package.json` over 71 modules.
- **Security event logging:** the audit trail (Module 27/28) is scoped to financial/inventory/loan/advance *data* changes. Failed login attempts, permission-denied attempts, and privilege/role changes are not explicitly stated as audit-logged, which is a narrower scope than a platform handling payroll and NID data would typically want.
- **Self-approval prevention:** no rule anywhere states that an approver cannot approve their own request (e.g., an Accounts staffer approving their own expense, or a Branch Manager approving their own Edit/Delete Request) — worth an explicit rule rather than an assumed one.

---

## 6. Input & Business Validation

Business-rule validation is well covered for the platform's signature flows (bank proof mandatory before marking paid, posted vouchers immutable, drafts never silently lost). Gaps found:

- No stated cap or validation on customer advance vs. order total (can advance exceed the order? PRD doesn't say either way).
- No stated minimum-margin or discount-floor validation at the Sales/Quotation level (ui.md's anti-pattern section mentions margin awareness for dashboards, but no enforcement rule is stated for the transaction itself).
- No explicit validation that a Quotation, Order, or Invoice total cannot be zero or negative.
- Field-level validation (formats for NID number, phone number, email) is not specified — likely intentional at this stage, but flagged so it's captured before Phase 1 (Master Data) build starts.

---

## 7. Permission & Authorization Validation

- The ten roles are each described narratively (PRD §6) with consistent principles (row-level scoping, mobile-only for Technician, portal-only for Customer/Vendor) — the *principles* are sound and consistently applied everywhere they're mentioned.
- What's missing is a single **role × module** grid confirming, for all 71 modules, exactly which of the ten roles get read/write/approve access. Right now that has to be reconstructed by reading each module's narrative description — workable, but error-prone at this scope, and worth building before Phase 0 as a QA artifact even if it's derived rather than newly decided.
- One specific ambiguity found: if the same Customer buys from two different branches, can Branch A's Sales Executive see that customer's Branch B order history, or is customer data siloed per branch? Neither `prd.md` nor `architecture.md` resolves this.

---

## 8. Notification Validation

Explicitly specified: `ApprovalRequest` creation triggers a notification to the relevant approver (§8.14), across all approval-gated flows.

Not explicitly specified anywhere, despite being clearly useful given the domain:
- Low-stock / reorder-point alert (Inventory).
- Loan/EMI installment due-soon reminder (Employee or Company Loan).
- Warranty-expiring-soon alert (Customer Support).
- Quotation-expiring-soon alert, before it auto-expires (Sales).
- New-assignment-created alert to the technician (Field Service) — implied by the workflow but not named as a notification event.
- Payslip-ready / "My Salary updated" alert (Payroll).

None of these are hard requirements the platform is missing — they're common-sense additions to a notification system this central to the platform's design philosophy ("nothing lost, everything visible"), and worth a decision on which are in scope for Phase 0 vs. later.

---

## 9. Exception Handling & Recovery

- **Lost/damaged custody product:** no write-off or replacement-cost flow is specified for a technician who loses or damages a product held in `ProductCustody`.
- **Mid-run payroll failure:** no recovery state is described if a `PayrollRun` fails partway through processing multiple employees.
- **Bank proof found fraudulent after approval:** the platform mandates proof before marking paid, but doesn't address what happens if a proof is later discovered to be invalid — presumably a reversal, but this isn't stated.
- **Suspense account items that age out completely:** an aging report exists (§8.23) but no policy defines what happens to an item that ages past whatever threshold is eventually set — write-off, forced manual classification, or indefinite hold are all currently equally valid readings.

---

## 10. Cross-Module Dependency Validation

Core dependency chains are logical and mostly well-formed: Payroll depends on Attendance + Employee Loan + the §58 Advance-Conveyance Reconciliation Engine + Salary Structure; Project P&L depends on Service Assignment + Custody + Advance + Conveyance + the originating Sales Order; and — per the platform's central design principle — *every* revenue/cost-generating module depends on the core Accounting Ledger to post into.

**One sequencing risk stands out.** The Release Roadmap (PRD §13) places Sales (Phase 3), Customer Advance (Phase 4), and Service Ops (Phase 5) — all revenue/cost-generating flows whose defining feature is that they auto-post journal entries — *before* Core Accounting (Phase 6, where the Chart of Accounts, journal engine, and ledger are actually built). If Phase 6 is genuinely where the posting engine first exists, Phases 3–5 would have nothing to post into yet. This may be intentional (a minimal posting stub could exist from Phase 0's schema), but that isn't stated anywhere — worth an explicit confirmation before Phase 3 starts, not after.

---

## 11. Accounting / Financial Integrity Validation

- **Double-entry balance:** stated as a rule ("every journal must have total debit = total credit") but not tied to an explicit enforcement mechanism (a DB-level check constraint/trigger vs. an application-layer check that a future bug could bypass). Worth specifying which.
- **Rounding:** no convention is stated anywhere for currency rounding (nearest paisa, round-half-up vs. banker's rounding) — confirmed absent by direct search of the Finance spec. For a system built around exact P&L accuracy, this is a meaningful gap.
- **Posting idempotency:** no idempotency-key or double-submit protection is specified for financial postings anywhere in the architecture — confirmed absent by direct search. A double-click or a client retry on a slow network could, on paper, create a duplicate journal entry with nothing described to stop it.
- **Period-closing lock:** well covered in the Finance spec's closing sequence (pre-close checks, closing journal, reopening rules).
- **Chart of Accounts completeness:** strong coverage against the platform's own transaction types; the two open items (Sales Commission, Non-current asset categories — PRD §14) are the only unresolved parts.

---

## 12. Data Integrity Validation

- Explicit `@unique` constraints are confirmed for several key identifiers (quotation number, voucher number, draft-state composite key) — the pattern is sound where it's visible.
- Not confirmed one way or the other from the available schema excerpts: whether Invoice Number, Employee Code, and NID Number each have an explicit uniqueness constraint (NID in particular should almost certainly be unique per employee/customer to prevent duplicate identity records). This needs a direct check against the full Prisma schema rather than the excerpts included in `architecture.md`'s narrative sections.
- No `onDelete`/cascade behavior is stated anywhere in the reviewed schema excerpts — e.g., what happens to related Invoices if a Customer master record is soft-deleted. Given master-data deletion already requires zero linked transactions (§8.25), this may be moot in practice, but isn't explicitly cross-referenced as the reason.

---

## 13. Offline / Sync Validation

- Offline tolerance is explicitly scoped to technician visit reports (PRD §10) — narrower than the full field workflow. It's not stated whether GPS check-in/out or conveyance bill submission also work offline, which matters since those are equally field-based actions.
- **Conflict resolution policy is an acknowledged, still-open gap** — PRD §15 itself flags "data conflicts when the same visit report is updated from multiple devices" as a risk needing a policy (last-write-wins vs. merge), and no resolution has been added since that risk was first written.
- No sync-failure UX is described (what the technician sees if a queued sync repeatedly fails once connectivity returns).

---

## 14. Auditability Validation

- Financial, inventory, loan, and advance data changes are explicitly covered by the audit trail (Module 27/28), with field-level before/after logging.
- **Identity and access events are not explicitly included in that same audit scope:** user creation/deactivation, role/permission changes, and failed login or permission-denied attempts aren't stated as audit-logged anywhere. For a platform that already treats a *data* edit as needing Super-Admin sign-off (Module 70), the same rigor arguably belongs on *who can act as whom* — this is worth closing rather than assuming it's implicitly covered.

---

## 15. Requirement Traceability Matrix

Forward direction — each of PRD §4's 13 goals, and the modules that satisfy it:

| Goal | Satisfied by |
|---|---|
| SKU-level inventory traceability | Modules 11,12,13,53 |
| 100% P&L visibility (company/project/department) | Modules 17,18,29,48,58,60(finance) |
| Technician field workflow → project profitability | Modules 21,22,46,47,49,58,59(finance) |
| Customer advance/partial payment tracking | Module 51 |
| Company loan & investment tracking | Modules 54,55 |
| Employee advance/loan reconciled against payroll | Modules 52,64 |
| Live location & remote employee management | Modules 22,23 |
| Single role-scoped mobile app (PWA→native) | Module 50 |
| Multi-module workspace, no lost work | Module 57 |
| Universal export + print/letterhead | Modules 56,69 |
| Platform-wide edit/delete governance | Module 70 |
| Drill-down reporting | Module 71 |
| Standalone Quotation module | Module 9 (extended) |

Every stated goal traces to at least one module — no orphaned goals.

**Reverse direction — modules without a clear anchor in §4's original goal list:** Voucher Management (66), Day/Cash/Bank Book (67), and Suspense Account Management (68) exist because of the cross-check gap-fill pass, not because §4 stated a goal they satisfy. This isn't a defect — they're legitimate accounting-hygiene requirements — but §4 (Goals & Objectives) was never updated to reflect them, the same pattern as the stale module count already fixed in §15's risk register. Worth a one-line addition to §4 for completeness, purely for document hygiene.

---

## 16. Requirement Validation Report

Consolidated findings from Sections 1–15, prioritized by consequence. **P0** = should be resolved before or during Phase 0; **P1** = should be resolved before the affected phase starts; **P2** = worth deciding, lower urgency.

**P0 — foundational, affects how Phase 0 is built**
1. Financial-posting idempotency is unspecified (§11) — a double-submit could duplicate a journal entry with nothing in the current design to stop it.
2. The Sales/Customer Advance/Service Ops-before-Core-Accounting sequencing in the Roadmap needs an explicit answer: does Phase 0 include a minimal posting stub, or does Phase 6 need to move earlier? (§10)
3. No role × module permission matrix exists to validate against (§7) — worth building even as a derived artifact, before Phase 0's Auth+RBAC work starts.
4. Rounding convention for currency math is undefined (§11).

**P1 — should be resolved before the affected phase**
5. Conflict-resolution policy for offline technician sync remains an open risk with no owner or decision (§13) — needed before Phase 5 (Service Ops) or Phase 14 (mobile PWA polish).
6. MFA and password policy for Super Admin/Accounts/Finance roles is undecided (§5) — needed before Phase 0's Auth work ships.
7. Secrets management approach (env vars vs. vault) is unspecified (§5) — needed before any environment is deployed.
8. Self-approval prevention isn't stated as a rule for any approval type (§6) — needed before Phase 0's Approval Engine is built (it's a foundational, reusable engine per PRD §8.14).
9. Six missing flows (§2) — Purchase/Sales Return, Stock Transfer, Warranty decision, GRN discrepancy, Technician reassignment, Quotation revision — need at least a lightweight walkthrough before their respective phases.

**P2 — worth deciding, lower urgency**
10. Audit-trail scope for identity/access events, not just financial data (§14).
11. Notification catalog gaps — low-stock, loan-due, warranty/quotation-expiry alerts (§8).
12. Cascade/delete behavior for master data with dependent records (§12).
13. §4 (Goals) hasn't been updated to reflect the three accounting-hygiene modules added since v1.0 (§15) — a documentation-hygiene fix, not a functional one.

---

*This report covers `prd.md` v2.2 as the primary subject, cross-referenced against `architecture.md` v3.1, `Accounting_and_Finance_Full_Specification.md` v3.1, `ui.md` v2.1, and `architecture_nginx.md`. As with the earlier `prd-analytics.md` review, it does not have access to `Accounting_ERP_Existing_Application_Cross_Check_Upgrade_Spec_English.md`, so full independent verification of the six cross-check-derived modules (66–71) is still outstanding.*
