# PROGRESS.md — Master Project Progress

**Project:** Brother's Technology System
**Template defined in:** `AGENT.md` §381–390
**Status as of:** 22 September 2026 — Phases 0 through 4 all in progress (Phase 4 code-complete). Phase 0's repo/build/test verified; Phase 1's 96-model schema drafted and statically verified; Phase 2's identity/RBAC fully built; Phase 3's master-data resources fully built; **Phase 4's full Procurement API (all 5 tracked modules + api-spec.md §14's Purchase Invoice/Payment/Return) now built** — 202 tests passing across the whole monorepo. None of the five phases' Docker/Postgres-dependent piece has actually run yet (see `HANDOFF.md`). Every other row is still a true `NOT_STARTED` baseline.

**How to update this file:** append/update rows as work is verified (`AGENT.md` §372 — a row moves to `DONE` only after its Section 356/364 test verification, never on an unverified session claim alone). This file accumulates across the whole project — never wholesale-rewritten, only rows updated. See `HANDOFF.md` for the current session's detail; this file is the cross-session summary.

---

## 381. Master Project Progress Matrix

| Phase | Status | Modules (this phase) | Source | Last Updated |
|---|---|---|---|---|
| 0 — Project Scaffold | **IN_PROGRESS** — see note | — (infrastructure only, no business module) | `prompt.md` §184 | 16 Sept 2026 |
| 1 — Database Foundation | **IN_PROGRESS** — schema drafted, not yet migrated | 0/1 | `prompt.md` §185 | 16 Sept 2026 |
| 2 — Identity & RBAC | **IN_PROGRESS** — all 3 modules built and tested (94 tests); real-database run still pending | 3/3 | `prompt.md` §186 | 18 Sept 2026 |
| 3 — Master Data | **IN_PROGRESS** — Customer/Product/Category/Brand/Unit/Warehouse/Department/Branch built and tested; real-DB run still pending | 4/5 | `prompt.md` §187 | 19 Sept 2026 |
| 4 — Procurement | **IN_PROGRESS** — all 5 core modules + Purchase Invoice/Payment/Return (api-spec.md §14's full endpoint list) built and tested; real-DB run pending | 5/5 | `prompt.md` §188 | 22 Sept 2026 |
| 5 — Inventory | NOT_STARTED | 0/4 | `prompt.md` §189 | — |
| 6 — Sales & Quotation | NOT_STARTED | 0/6 | `prompt.md` §190 | — |
| 7 — Customer Advance & Payments | NOT_STARTED | 0/3 | `prompt.md` §191 | — |
| 8 — Service & Technician | NOT_STARTED | 0/8 | `prompt.md` §192 | — |
| 9 — Approval & Governance | NOT_STARTED | 0/2 | `prompt.md` §193 | — |
| 10 — Accounting & Finance | NOT_STARTED | 0/9 | `prompt.md` §194 | — |
| 11 — Loans & Investment | NOT_STARTED | 0/3 | `prompt.md` §195 | — |
| 12 — HR & Payroll | NOT_STARTED | 0/4 | `prompt.md` §196 | — |
| 13 — Warranty & Ticket | NOT_STARTED | 0/1 | `prompt.md` §197 | — |
| 14 — Reporting & Drill-Down | NOT_STARTED | 0/6 | `prompt.md` §198 | — |
| 15 — Notifications & Realtime | NOT_STARTED | 0/1 | `prompt.md` §199 | — |
| 16 — Draft & Workspace | NOT_STARTED | 0/1 | `prompt.md` §200 | — |
| 17 — Portal APIs | NOT_STARTED | 0/2 | `prompt.md` §201 | — |
| 18 — Import / Export / Print | NOT_STARTED | 0/3 | `prompt.md` §202 | — |
| 19 — Security Hardening | NOT_STARTED | 0/2 | `prompt.md` §203 | — |
| 20 — Production Readiness | NOT_STARTED | — (validation/hardening only) | `prompt.md` §204 | — |

**Note:** Phases 0 and 20 legitimately show no module count — they're infrastructure/validation phases (scaffold, and final production-readiness checks), not business-module phases. This is accurate, not a data gap.

**Phase 0 detail (not `DONE` yet — one piece unverified):** repo structure (`prompt.md` §128), the Express/Next.js scaffold, and the CI skeleton are built and **empirically verified** this session — `npm install`, typecheck, lint, build, and the Jest suite (3/3) all pass, and the compiled server was actually started and hit with real HTTP requests (`HANDOFF.md` has the full list). **Docker Compose itself (`prompt.md` §171) has not been run even once** — the session that built it had no Docker daemon available. Do not mark this phase `DONE` until `docker compose up` is confirmed clean per `HANDOFF.md`'s "Exactly What to Do Next."

**Phase 1 detail (not `DONE` yet — the harder piece unverified):** the full `schema.prisma` (91 models, 21 enums), RLS policies, reporting views, and the Posting/Ledger Stub are drafted and pass every static check this session could run without a working Prisma engine (see `HANDOFF.md` for the exact list) — including a real 4/4-passing Jest suite for the Posting Stub's balance/idempotency logic. **`prisma generate` and `prisma migrate dev` have never actually run** — this sandbox cannot reach `binaries.prisma.sh` to fetch Prisma's query-engine binary. Do not mark this phase `DONE` until a real migration succeeds against a real Postgres instance per `HANDOFF.md`'s "Exactly What to Do Next."

**Phase 2 detail (not `DONE` yet — real-database piece unverified):** **all three modules are now built and tested** — the auth flow (login, MFA enrollment + verification for Super Admin/Accounts-Finance, refresh-with-rotation, logout), Employee CRUD + user provisioning/deactivation (with a Phase-1-schema fix along the way — Employee's NID field is now correctly split into an encrypted value and a separate deterministic hash for uniqueness, since a randomized-IV ciphertext can never back a `@unique` constraint meaningfully), and Role/Permission administration (list/get/replace a role's bundle, list the catalog, every endpoint Super-Admin-gated). 94 tests passing across the whole monorepo, typecheck/lint/build all clean. **What's left is deliberately deferred, not silently skipped:** routing employee edits through an Edit Request once Phase 9 exists, real credential delivery once Phase 15 exists, and — same as every phase so far — this has never run against a real Postgres instance.

**Phase 3 detail (not `DONE` yet — real-database piece unverified, Supplier deliberately deferred):** built a **generic, shared CRUD implementation** for the six resources that are all genuinely the same id/name-or-code/isActive shape (Category, Brand, Unit, Warehouse, Department, TaxRate) — one factory, not six hand-copied modules — plus Branch (reusing that same generic factory, but under Identity permissions, closing a gap Phase 1 left open) and two richer bespoke modules for Customer (with addresses) and Product. 141 tests passing across the whole monorepo, typecheck/lint/build all clean. Two small Phase-1 schema oversights caught and fixed along the way (`Department`/`Unit` were both missing `isActive`). **Supplier/Vendor (§63) is deliberately NOT built this session** — it's Phase 4's module per `PROGRESS.md`'s own phase mapping, even though api-spec.md §13 describes it in the same breath as Customer/Product.

**Phase 4 detail (complete — Supplier, Purchase Requisition, Purchase Order, GRN, Purchase Invoice, Supplier Payment, and Purchase Return all built; real-database piece still unverified, same as every prior phase):** found and fixed five real Phase-1 schema gaps across this phase's two sessions (`PurchaseRequest`/`PurchaseOrder`/`GoodsReceiptNote` had no line items; `SupplierPayment` had no idempotency-key column despite api-spec.md §14 requiring one; `PurchaseReturn` had a single bare quantity instead of line items) plus a genuine editing bug caught by this project's own static relation check. Built a **generic Approval engine** (`shared/approval`) ahead of its formal Phase 9 slot — now used by Purchase Requisition, GRN discrepancy, and Purchase Return alike. 202 tests passing across the whole monorepo, typecheck/lint/build all clean. Phase 4 is now code-complete against both `PROGRESS.md`'s 5 tracked modules and every endpoint api-spec.md §14 describes.

## 382. Phase Completion Matrix

Expands the row above with `prompt.md` §225a's 3-part gate — a phase moves to `DONE` in Section 381 only once every column below is ✓ for it.

| Phase | Security ✓/✗ | Build ✓/✗ | Requirements-Gap ✓/✗ | Overall |
|---|---|---|---|---|
| 0 | N/A — no auth/data surface exists yet at this phase | ✓ install/typecheck/lint/build/test all pass; ✗ `docker compose up` unrun | ✗ — `prompt.md` §184's Docker Compose deliverable is built but not run | IN_PROGRESS |
| 1 | N/A — RLS policies drafted (`sql/001_rls_policies.sql`) but not applied to a real database yet | ✓ static schema checks pass (91 models, all relations bidirectional, no dupes — see `HANDOFF.md`); ✓ Posting Stub's 4 tests pass; ✗ `prisma generate`/`migrate dev` unrun (sandbox network limitation) | ✗ — `prompt.md` §185's "migrations working end to end" not yet true | IN_PROGRESS |
| 2 | ✓ RBAC guard, MFA (incl. enrollment) for Super Admin/Accounts-Finance, PII encryption for NID, AuditLog on every security-relevant write | ✓ all 94 monorepo tests pass, typecheck/lint/build all clean | ✗ — everything `prompt.md` §186 asks for is built (all 3 modules), but "migrations working end to end" (this phase's real-database run) is still pending, same as Phase 1 | IN_PROGRESS |
| 3 | N/A — masterData.manage/.view and identity.manage/.view enforced per-route, matching prd.md §6.1's matrix; no new attack surface beyond Phase 2's | ✓ all 141 monorepo tests pass, typecheck/lint/build all clean | ✗ — Supplier/Vendor (§63) deliberately deferred to Phase 4; real-database run still pending | IN_PROGRESS |
| 4–20 | — | — | — | NOT_STARTED (all 17) |

## 383. Module Completion Matrix

One row per `prompt.md` §57–127's 71 build-instruction rows (the same granularity `prompt.md` itself uses — a few rows, like Portal, cover more than one `prd.md` module together; Modules 72–75 are folded into their extending rows: 72→84, 73→78, 74→74, 75→198's phase).

| § | Module | Status | Phase | % Features Done | Last Updated |
|---|---|---|---|---|---|
| 57 | Identity & Authentication | IN_PROGRESS — login/MFA-enrollment/MFA-verify/refresh/logout built + tested; not yet run against a real DB | 2 | ~95% | 18 Sept 2026 |
| 58 | User & Employee | IN_PROGRESS — CRUD + provisioning + deactivation built + tested; not yet run against a real DB | 2 | ~90% | 18 Sept 2026 |
| 59 | Role & Permission | IN_PROGRESS — seed data, RBAC guard, and management endpoints all built + tested; not yet run against a real DB | 2 | ~90% | 18 Sept 2026 |
| 60 | Master Data | IN_PROGRESS — generic CRUD factory built + tested (the shared pattern §62/§64/§65/§71 build on) | 3 | 100% | 19 Sept 2026 |
| 61 | Company / Branch / Department | IN_PROGRESS — Branch + Department CRUD built + tested, closing a gap Phase 1 left schema-only | 1 | ~90% | 19 Sept 2026 |
| 62 | Customer | IN_PROGRESS — CRUD + addresses built + tested; not yet run against a real DB | 3 | ~90% | 19 Sept 2026 |
| 63 | Supplier / Vendor | IN_PROGRESS — CRUD + contacts built and tested; not yet run against a real DB | 4 | ~90% | 20 Sept 2026 |
| 64 | Product / SKU | IN_PROGRESS — CRUD built + tested; not yet run against a real DB | 3 | ~85% | 19 Sept 2026 |
| 65 | Category / Brand / Unit | IN_PROGRESS — built from the generic factory + tested | 3 | ~90% | 19 Sept 2026 |
| 66 | Procurement (overview) | IN_PROGRESS — generic Approval engine (shared/approval) built ahead of Phase 9, backing this phase's own approval needs | 4 | — | 20 Sept 2026 |
| 67 | Purchase Requisition | IN_PROGRESS — create/get/list/approve/reject built and tested; not yet run against a real DB | 4 | ~90% | 20 Sept 2026 |
| 68 | Purchase Order | IN_PROGRESS — create (PR-linked or standalone)/get/list built and tested; not yet run against a real DB | 4 | ~85% | 20 Sept 2026 |
| 69 | GRN | IN_PROGRESS — receive (with discrepancy auto-approval)/get/list built and tested; not yet run against a real DB | 4 | ~85% | 20 Sept 2026 |
| 70 | Inventory (overview) | NOT_STARTED | 5 | 0% | — |
| 71 | Warehouse | IN_PROGRESS — built from the generic factory + tested | 3 | ~90% | 19 Sept 2026 |
| 72 | Batch / Serial Tracking | NOT_STARTED | 5 | 0% | — |
| 73 | Stock Transfer | NOT_STARTED | 5 | 0% | — |
| 74 | Stock Adjustment (+ Damage/Loss, Module 74) | NOT_STARTED | 5 | 0% | — |
| 75 | Sales (overview) | NOT_STARTED | 6 | 0% | — |
| 76 | Quotation | NOT_STARTED | 6 | 0% | — |
| 77 | Sales Order | NOT_STARTED | 6 | 0% | — |
| 78 | Delivery Challan (+ Return, Module 73) | NOT_STARTED | 6 | 0% | — |
| 79 | Invoice | NOT_STARTED | 6 | 0% | — |
| 80 | Customer Advance | NOT_STARTED | 7 | 0% | — |
| 81 | Payment & Collection | NOT_STARTED | 7 | 0% | — |
| 82 | Credit Note / Debit Note | NOT_STARTED | 6 | 0% | — |
| 83 | Service & Technician (overview) | NOT_STARTED | 8 | 0% | — |
| 84 | Service Ticket (+ Module 72, Service-Only Customer) | NOT_STARTED | 8, 13 | 0% | — |
| 85 | Field Visit | NOT_STARTED | 8 | 0% | — |
| 86 | Technician Assignment | NOT_STARTED | 8 | 0% | — |
| 87 | Product Custody | NOT_STARTED | 8 | 0% | — |
| 88 | Warranty | NOT_STARTED | 13 | 0% | — |
| 89 | Project / Installation | NOT_STARTED | 8 | 0% | — |
| 90 | Technician Advance & Expense | NOT_STARTED | 8 | 0% | — |
| 91 | HR (overview) | NOT_STARTED | 12 | 0% | — |
| 92 | Attendance | NOT_STARTED | 12 | 0% | — |
| 93 | Leave | NOT_STARTED | 12 | 0% | — |
| 94 | Payroll | NOT_STARTED | 12 | 0% | — |
| 95 | Employee Loan | NOT_STARTED | 11 | 0% | — |
| 96 | Company Loan | NOT_STARTED | 11 | 0% | — |
| 97 | Investment | NOT_STARTED | 11 | 0% | — |
| 98 | Expense | NOT_STARTED | 10 | 0% | — |
| 99 | Chart of Accounts | NOT_STARTED | 10 | 0% | — |
| 100 | Voucher | NOT_STARTED | 10 | 0% | — |
| 101 | Ledger | NOT_STARTED | 10 | 0% | — |
| 102 | Day Book / Cash Book / Bank Book | NOT_STARTED | 10 | 0% | — |
| 103 | Receipt / Payment Statement | NOT_STARTED | 10 | 0% | — |
| 104 | Suspense | NOT_STARTED | 10 | 0% | — |
| 105 | Bank Transaction Proof | NOT_STARTED | 7, 10 | 0% | — |
| 106 | Financial Reporting (overview) | NOT_STARTED | 14 | 0% | — |
| 107 | P&L | NOT_STARTED | 10, 14 | 0% | — |
| 108 | Balance Sheet | NOT_STARTED | 10, 14 | 0% | — |
| 109 | Cash Flow | NOT_STARTED | 14 | 0% | — |
| 110 | Project / Department / Head-wise P&L | NOT_STARTED | 14 | 0% | — |
| 111 | Approval Workflow | IN_PROGRESS — the generic engine itself (`shared/approval`) was built early, in Phase 4, since Purchase Requisition genuinely needed it; the inbox endpoint (`GET /approvals`) this row is really about is still not built | 9 | ~30% | 20 Sept 2026 |
| 112 | Edit / Delete Governance | NOT_STARTED | 9 | 0% | — |
| 113 | Universal Drill-Down | NOT_STARTED | 14 | 0% | — |
| 114 | Notification | NOT_STARTED | 15 | 0% | — |
| 115 | Draft & Workspace | NOT_STARTED | 16 | 0% | — |
| 116 | File & Attachment | NOT_STARTED | 18 | 0% | — |
| 117 | Document / Print / Export | NOT_STARTED | 18 | 0% | — |
| 118 | Reporting (overview) | NOT_STARTED | 14 | 0% | — |
| 119 | Dashboard | NOT_STARTED | 14 | 0% | — |
| 120 | Search | NOT_STARTED | cross-cutting, all phases | 0% | — |
| 121 | Import / Bulk Processing | NOT_STARTED | 18 | 0% | — |
| 122 | System Configuration | NOT_STARTED | 19 | 0% | — |
| 123 | Audit | NOT_STARTED | cross-cutting, all phases | 0% | — |
| 124 | System Administration | NOT_STARTED | 19 | 0% | — |
| 125 | Customer Portal | NOT_STARTED | 17 | 0% | — |
| 126 | Vendor Portal | NOT_STARTED | 17 | 0% | — |
| 127 | Employee / Technician Portal | NOT_STARTED | 8, 14 (mobile polish) | 0% | — |

**Module 75 (Employee Work & Performance) note:** has no dedicated row above — it's a reporting layer with zero new tables (`architecture.md` §58.3), tracked as part of row 198's Phase 14 reporting work, not as its own module build.

## 384. Feature Completion Matrix

Empty at project start — populated per-module as each module (Section 383) is broken into its actual features (`prompt.md` §226). Add rows here the moment a module's Phase (Section 206, `prompt.md`) begins, not before.

| Module § | Feature | Status | Last Updated |
|---|---|---|---|
| *(none yet — first entries land when Phase 2 / §57 starts)* | | | |

## 385. Database Completion Matrix

One row per `database-schema.md` §5's ~86 tables. Populated as each table is actually migrated against a real database — a table existing in `schema.prisma` is not the same as this row turning ✓ (`AGENT.md` §372's rule: verified, not claimed).

**Current state:** all 91 models are drafted in `packages/db/prisma/schema.prisma` (0 of them migrated against a real Postgres yet — `prisma generate`/`migrate dev` could not run in this session's sandbox, see `HANDOFF.md`). Individual per-table rows below start getting filled in once a real migration actually succeeds; until then, one summary row stands in for all 91 so this section reflects reality rather than 91 identical placeholder rows.

| Table | Migrated ✓/✗ | RLS Policy ✓/✗ | Seeded ✓/✗ | Last Updated |
|---|---|---|---|---|
| *(all 91 models — schema drafted)* | ✗ (0/91) | ✗ (0/91, though written in `sql/001_rls_policies.sql`) | ✗ (0/91) | 16 Sept 2026 |

## 386. API Completion Matrix

One row per `api-spec.md` §11–36's endpoints. Empty at project start.

| Endpoint | Implemented ✓/✗ | Contract-Tested ✓/✗ | Last Updated |
|---|---|---|---|
| *(none yet)* | | | |

## 387. Test Completion Matrix

Coverage by category (`prompt.md` §238–252) — not a bare % number, since role-coverage breadth (`prompt.md` §242) matters more than raw line coverage.

| Category | Status | Notes |
|---|---|---|
| Unit (Domain layer) | IN_PROGRESS | 94 tests passing across the monorepo — identity module (auth, employee, role/permission) + Phase 1's Posting Stub. See `HANDOFF.md` for the full breakdown. |
| Integration (Application+Infra) | IN_PROGRESS | Login/Refresh/Logout use cases tested against mocked repositories; real Prisma-backed integration untested (no DB available this session) |
| API Contract | IN_PROGRESS | 4 auth endpoints tested via supertest (mocked use cases) — envelope shape, status codes |
| Database (CHECK/trigger) | NOT_STARTED | |
| Authorization (per-role, positive+negative) | IN_PROGRESS | `requirePermission` middleware: allow/deny/wildcard cases tested; real per-role end-to-end (seeded roles against real endpoints) not yet possible without a migrated DB |
| Multi-Tenant/Branch Isolation (RLS) | NOT_STARTED | Policies written (`sql/001_rls_policies.sql`), never executed |
| Financial Integrity | IN_PROGRESS | Posting Stub's balance/idempotency invariants (Phase 1) |
| Concurrency | NOT_STARTED | |
| Event/Queue | NOT_STARTED | |
| End-to-End Workflow | NOT_STARTED | |

## 388. Documentation Completion Matrix

| Document | Current Version | Last Revision Note Date |
|---|---|---|
| `prd.md` | v2.5 | 16 Sept 2026 — §14/§15 open items resolved, Phase 0 |
| `architecture.md` | v3.4 | 16 Sept 2026 — §26 open items resolved, Phase 0 |
| `dfd.md` | (unversioned, dated) | 8 Sept 2026 |
| `database.md` | (unversioned, dated) | 8 Sept 2026 |
| `database-schema.md` | (unversioned, dated) | 8 Sept 2026 |
| `api-spec.md` | (unversioned, dated) | 8 Sept 2026 |
| `admin-permission-migration-matrix.md` | v1 | 16 Sept 2026 — signed off, §6 |
| `Accounting_and_Finance_Full_Specification.md` | (unversioned, dated) | 16 Sept 2026 — §21/§57.2/§57.4/§65.3/§65.5/§67.2/§70 resolved, Phase 0 |
| `prompt.md` | v1 | 8 Sept 2026 |
| `AGENT.md` | v1 | 8 Sept 2026 |
| `ui.md` | v3.0 | 8 Sept 2026 |

A document that hasn't been touched in a suspiciously long time relative to how much code has shipped (`AGENT.md` §232) gets flagged here manually once real build work starts.

## 389. Requirement Coverage Status

One row per `prd.md` §8 functional area. Empty at project start.

| Functional Area (`prd.md` §8.x) | Tested ✓/✗ | Last Updated |
|---|---|---|
| *(none yet — populated per `prompt.md` §250/§276 as each area's tests land)* | | |

## 390. Overall Project Completion Status

**~7-8% complete** (Phases 0-4 in progress, none counted as done). 0 of 21 phases fully `DONE` (Section 381), 12 of 71 module-build rows substantially built (§57/§58/§59 ~90-95% each, §60/§61/§62/§64/§65/§71 ~85-100% each, §63/§67/§68/§69 ~85-90% each), 0 of 96 tables actually migrated (Section 385 — though the full schema is drafted), 68 endpoints implemented and tested (44 from Phases 2-3 + full Phase 4 Procurement API: 6 supplier + 5 purchase-request + 3 purchase-order + 3 grn + 2 purchase-invoice + 1 supplier-payment + 4 purchase-return + 2 generic approval). This number is always re-derived from Sections 381–389 above — never hand-asserted independently of them (`AGENT.md` §390's own rule).
