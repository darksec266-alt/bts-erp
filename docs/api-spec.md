# API Specification

**Subject:** Brother's Technology System — Unified Business Management Platform
**Built from:** `prd.md` v2.4, `database-schema.md`, `database.md`, cross-checked against `architecture.md` v3.3 and `dfd.md`
**Scope:** 50 headings — this is the interface layer sitting directly on top of the already-designed data layer. Every endpoint below maps to a real table (§43) and a real requirement (§44); nothing here introduces a new business rule that isn't already decided in one of the source documents.
**Date:** 7 September 2026

---

## 1. API Specification Overview

One REST API, one Express application (`architecture.md` §2's Modular Monolith), serving the Next.js web/PWA client, the future native app, and the Customer/Vendor portals — all through the same `/api/v1/` surface, differentiated by auth token and role, not by separate API versions per client. This document specifies every module's endpoints at the level a frontend developer or Claude Code needs to start building against — method, path, purpose, auth, and the business rules that make an endpoint's behavior non-obvious from its name alone. Full JSON Schema request/response bodies are generated from the Prisma models (`database-schema.md` §6, §25–§40) at build time via a shared type layer, not hand-duplicated in this document — this document is the contract for *behavior*, the generated types are the contract for *shape*.

## 2. API Version Control & Lifecycle

- **URL-path versioning: `/api/v1/...`** (`architecture.md` §3, §43 — unchanged, restated as the governing rule for everything below).
- A breaking change (removing a field, changing a type, changing required-ness) ships as `/api/v2/...` running alongside `/v1/`, never as an in-place change. A non-breaking change (adding an optional field, adding a new endpoint) ships directly into `/v1/`.
- **Deprecation:** a `Deprecation` and `Sunset` HTTP header (RFC 8594) on any `/v1/` endpoint once `/v2/` covers it, with a minimum 90-day sunset window before `/v1/` actually stops serving that endpoint — long enough for the PWA's own release cycle (`architecture.md` §50) plus any native-app store review delay.
- **No `/v0/` ever existed and none of this platform's 75 modules are exempt from `/v1/`** — versioning was designed in from Phase 0 (`prd.md` §13), not retrofitted.

## 3. API Architecture

- **Resource-oriented REST**, not RPC — `architecture.md` §43's rule, unchanged: `POST /api/v1/service-assignments/:id/close`, never `POST /api/v1/closeServiceAssignment`.
- **Cross-context calls never leave the process as HTTP.** Because this is a Modular Monolith (`architecture.md` §2), when the Sales API needs Master Data, that's an in-process Application-layer call (`architecture.md` §41), not a second HTTP round-trip — there is no internal service mesh, and none of the 26 domain sections below (§11–§36) should be read as separate services.
- **Every endpoint sits behind Nginx** (`architecture.md` §38) for TLS/rate-limiting/routing before it reaches Express — not repeated per-endpoint below, since it's uniformly true.
- **Stateless.** No server-side session; every request carries its own JWT (§5). This is what makes `architecture.md` §50's horizontal scaling (just running more Express containers) work without a sticky-session requirement.

## 4. API Naming & Convention

| Rule | Example |
|---|---|
| Resource paths: plural, kebab-case | `/service-assignments`, `/purchase-orders` |
| Nested resources for genuine ownership only | `/quotations/:id/lines` (a line has no meaning without its quotation, `database.md` §4) — **not** `/customers/:id/quotations` (a Quotation is independently addressable; use `?customerId=` filtering instead, §30) |
| Actions that aren't pure CRUD: a verb sub-path on the resource | `POST /service-assignments/:id/close`, `POST /quotations/:id/accept` |
| Query params: `camelCase`, matching the Prisma field name exactly | `?branchId=...&status=OPEN` — no translation layer between API query params and DB column names |
| IDs in paths: always the `cuid` primary key (`database-schema.md` §9), never a business-key number | `/quotations/:id` where `:id` is the `cuid`, not the `quotationNumber` — the human-readable number is a query param or response field, never a lookup key, so it stays free to ever change format without breaking a URL |

## 5. Authentication

- `POST /api/v1/auth/login` → `{ email, password }` → issues a short-lived access JWT + a rotating refresh token (`architecture.md` §22).
- `POST /api/v1/auth/mfa/verify` → `{ mfaToken, code }` — **required as a second step, before the real access token is issued, only for Super Admin and Accounts/Finance roles** (`prd.md` §10.5). Every other role's login completes at step one. **Security fix from this document set's audit:** a 6-digit code has only one million possibilities, and this endpoint had no rate-limit of its own — it now gets its own strict tier in `architecture_nginx.md`'s policy (tighter than the general auth-endpoint tier) plus an application-layer lockout after 5 failed codes against one `mfaToken`, which invalidates that token and forces a fresh login rather than allowing further guesses against it.
- `POST /api/v1/auth/refresh` → rotates the refresh token; the old one is invalidated immediately (no refresh-token reuse window).
- `POST /api/v1/auth/logout` → revokes the current refresh token; does not invalidate other active sessions for the same user (a user logged in on both desktop and the PWA logging out of one doesn't lose the other).
- **Portal auth is a separate pair of endpoints** (`/api/v1/portal/auth/login` for Customer/Vendor) issuing a token scoped so every subsequent portal request is restricted to `WHERE customerId = :self` at the Application layer (`architecture.md` §55.4) — never the same token type as an internal role.

## 6. Authorization & Permission

- Every authenticated request carries a role claim; every route declares the roles allowed to call it (`prd.md` §6.1's Role × Functional-Area matrix, restated per-endpoint in §11–§36 only where it's *not* simply "matches the matrix" — most endpoints don't repeat the whole matrix, they just note the one or two roles that matter for that specific action).
- **Row-level scope is enforced in the Application layer on every query, not just the route guard** (`architecture.md` §40) — a Branch Manager's JWT restricts their queries to their own `branchId` server-side, backed by the database's RLS policy (`database-schema.md` §18) as the second, independent layer.
- **Permission codes** (`database-schema.md` §3, dot-namespaced: `sales.quotation.create`) are what a route guard actually checks — a role is a named bundle of permission codes (`RolePermission`), not a hardcoded list per route, so adding an eleventh role later is a data change, not a code change. **This is what makes the Admin correction (`prd.md` §6) an API-layer non-event:** no route guard anywhere in §11–§36 checks `role === 'ADMIN'` directly; every one checks a permission code, so narrowing what Admin can do is a `RolePermission` data change, never a route-guard code change.

## 7. Common API Components

Shared across every endpoint in §11–§36, not repeated per-domain:

- **Response envelope** (`architecture.md` §43): `{ "data": {...}, "meta": { "requestId": "..." }, "error": null }`.
- **Idempotency-Key header** — required on every `POST`/`PATCH` that creates or mutates a financial record (§39); optional but honored anywhere else.
- **Pagination** — cursor-based (§30), never offset, on every list endpoint.
- **Standard query params on every list endpoint:** `?cursor=`, `?limit=` (default 25, max 100), `?sort=`, plus whatever domain-specific filters that endpoint's section names.
- **`X-Request-Id`** — generated at Nginx (`architecture.md` §38.10), echoed in every response's `meta.requestId`, and the correlation ID every structured log line carries (`architecture.md` §52).

## 8. HTTP Status Codes

| Code | Used for |
|---|---|
| `200 OK` | Successful `GET`/`PATCH`/action endpoints |
| `201 Created` | Successful `POST` that creates a resource — body includes the created resource |
| `204 No Content` | Successful `DELETE` (soft-delete, §17 `database.md`) — nothing to return |
| `400 Validation Error` | Field-level validation failure (§37) |
| `401 Auth Error` | Missing/expired/invalid token |
| `403 Forbidden` | RBAC or row-level-scope denial, **and** the self-approval conflict (§18) |
| `404 Not Found` | No such resource, or (deliberately, for row-scoped resources) a resource that exists but the caller has no access to — a 404 rather than a 403 in the *scope* case specifically, so a Branch Manager can't distinguish "doesn't exist" from "exists in another branch" by response code alone |
| `409 Conflict` | Optimistic-lock version mismatch (`database-schema.md` §24), duplicate idempotency key with different body, self-approval attempt |
| `422 Unprocessable Entity` | Passes field validation but fails a Business Integrity Rule (§38) — e.g., a `PAID_SERVICE_REQUEST` ticket's `ServiceAssignment` creation attempted before its Quotation is `ACCEPTED` |
| `429 Too Many Requests` | Rate limit (`architecture_nginx.md` tiers, passed through) |
| `500 Internal Error` | Unhandled — logged to error tracking (`architecture.md` §52), generic message to the client |

## 9. API Module Map

26 domain sections (§11–§36) below, mapped to `prd.md` §8's functional areas and `database-schema.md`'s bounded contexts — one-to-one, not a new grouping:

| API Section | PRD Functional Area | Primary Tables |
|---|---|---|
| §11 Identity & Auth | 8.1 | `User`, `Role`, `Permission` |
| §12 User & Employee | 8.1, 8.9 | `Employee`, `Department` |
| §13 Master Data | 8.2 | `Customer`, `Supplier`, `Product`, `Warehouse` |
| §14 Procurement | 8.3 | `PurchaseRequest`→`SupplierPayment` |
| §15 Sales | 8.4, 8.27 | `Quotation`→`CreditNote` |
| §16 Inventory | 8.5 | `StockLedger`, `SerialNumber` |
| §17 Service & Technician | 8.6, 8.28 | `ServiceAssignment` cluster, `Ticket` |
| §18 Approval | 8.14 | `ApprovalRequest` |
| §19 Finance & Accounting | 8.7 | `JournalEntry`, `Voucher`, `ChartOfAccounts` |
| §20 Loan & Investment | 8.7 | `CompanyLoan`, `Investment`, `EmployeeAdvance` |
| §21 HR & Payroll | 8.9, 8.19 | `Attendance`→`PayslipLine` |
| §22 Reporting | 8.10 | Views (`database.md` §16) |
| §23 Universal Drill-Down | 8.26 | `JournalLine` (drill target) |
| §24 Document, Export & Print | 8.11, 8.24 | `ExportJob`, `PrintPreference` |
| §25 File & Attachment | (cross-cutting) | `Document` |
| §26 Bank Transaction Proof | 8.20 | `BankTransactionProof`, `ChequeRegisterEntry` |
| §27 Notification | 8.14 | `Notification` |
| §28 Draft & Workspace | 8.12 | `DraftState` |
| §29 Audit | 8.17 | `AuditLog` |
| §30 Search, Filter & Pagination | 8.13 | (cross-cutting) |
| §31 Import & Bulk | (not separately in `prd.md` — see §31's own note) | — |
| §32 System Administration | 8.17 | `SystemSetting`, `FeatureFlag` |
| §33 Portal | 8.15 | Narrow views over Sales/Finance |
| §34 Realtime/WebSocket | (cross-cutting, `architecture.md` §47) | — |
| §35 Background Job/Queue | (cross-cutting, `architecture.md` §46) | — |
| §36 External Integration | (cross-cutting, `architecture.md` §3) | `PaymentGatewayTransaction`, `SmsLog`, `EmailLog`, `MapsGeocodeCache` |

## 10. Endpoint Documentation Standard

Every endpoint in §11–§36 is documented in this compact form — enough to start building against without repeating the full JSON shape already defined by the Prisma models (§1):

**`METHOD /path`** — one-line purpose · **Roles:** who may call it (blank = any authenticated role with row-level access) · **Notes:** only when the endpoint's behavior isn't obvious from its name (a business rule, a side effect, a non-standard status code).

---

## 11. Identity & Authentication API

Login/refresh/logout/MFA already specified in full in §5 — not repeated. This section is Role/Permission administration.

- **`GET /roles`** — list all 10 roles. **Roles:** Super Admin.
- **`GET /roles/:id/permissions`** — a role's full permission bundle.
- **`PATCH /roles/:id/permissions`** — add/remove permission codes. **Roles:** Super Admin only. **Notes:** writes an `AuditLog` row tagged `security` (`architecture.md` §52) — a permission change is exactly the class of event that scope was added to cover.
- **`GET /permissions`** — the full catalog of dot-namespaced permission codes (`database-schema.md` §3).

## 12. User & Employee API

- **`POST /employees`** / **`GET /employees`** / **`GET /employees/:id`** / **`PATCH /employees/:id`** — standard CRUD. **Roles:** HR/Payroll Officer, Admin, Super Admin. **Notes:** `PATCH` after the record leaves draft goes through the Edit Request flow (§18), not a direct write (`prd.md` §8.25).
- **`POST /employees/:id/provision-user`** — creates the linked `User` record and sends a first-login credential. **Roles:** Admin, Super Admin. **Notes:** the explicit fix for the previously-missing HR→IT handoff flow (`prd.md` §9's Missing Flow Analysis).
- **`PATCH /users/:id/deactivate`** — soft-deletes the login without touching the `Employee` record. **Notes:** logged to `AuditLog` as a `security`-tagged event.
- **`GET /employees/me`** — the calling user's own Employee record (used by every role's profile screen).

## 13. Master Data API

Identical CRUD shape across `Customer`, `Supplier`, `Product`, `Category`, `Brand`, `Unit`, `Warehouse`, `TaxRate` — one template, applied per resource:

- **`POST /customers`**, **`GET /customers`** (filters: `?branchId=`, `?isServiceOnly=`, `?search=`), **`GET /customers/:id`**, **`PATCH /customers/:id`**, **`DELETE /customers/:id`** (blocked with `422` if any linked transaction exists — `database.md` §8.25's rule, surfaced as this specific status code). Same five-endpoint shape for `/suppliers`, `/products`, `/categories`, `/brands`, `/units`, `/warehouses`, `/tax-rates`.
- **`GET /products/:id/stock`** — cross-reads Inventory (§16) for this product's on-hand quantity per warehouse; kept as a Master Data convenience endpoint rather than forcing every Product screen to make a second call into `/inventory`.

## 14. Procurement API

- **`POST /purchase-requests`**, **`GET /purchase-requests`**, **`POST /purchase-requests/:id/approve`** — the last one delegates to §18's Approval API rather than being a bespoke approval action.
- **`POST /purchase-orders`** (from an approved PR or standalone) → **`GET /purchase-orders/:id`**.
- **`POST /purchase-orders/:id/receive`** — records a `GoodsReceiptNote`. **Notes:** body includes a `status` of `COMPLETE`/`PARTIAL`/`DISCREPANT` (`prd.md` §9.9); a `DISCREPANT` result auto-files an `ApprovalRequest` (§18) rather than requiring a separate call.
- **`POST /purchase-invoices`**, **`POST /purchase-invoices/:id/payments`** — the payment endpoint requires `Idempotency-Key` (§7) since it's a financial write.
- **`POST /purchase-returns`** — implements `prd.md` §9.7's Purchase Return flow.

## 15. Sales API

- **`POST /quotations`**, **`GET /quotations`** (filters: `?status=`, `?customerId=`, `?branchId=`), **`GET /quotations/:id`**, **`PATCH /quotations/:id`** (draft only).
- **`POST /quotations/:id/send`**, **`POST /quotations/:id/accept`**, **`POST /quotations/:id/reject`** — status-transition actions, not generic `PATCH`, per §38's rule that workflow transitions are always named actions.
- **`POST /quotations/:id/revise`** — creates a new version, sets the original's status to `SUPERSEDED` (`prd.md` §9.12). **Notes:** response includes both the new Quotation and the superseded one's id.
- **`POST /sales-orders`** (usually from an accepted Quotation) → **`POST /sales-orders/:id/challans`** → **`POST /sales-orders/:id/invoices`**.
- **`POST /invoices/:id/payments`** — **Notes:** `Idempotency-Key` required; if `method=SSLCOMMERZ`, delegates to §36's gateway integration and the response is `202 Accepted` pending the gateway webhook, not `201`.
- **`POST /invoices/:id/credit-notes`**.
- **`GET /sales-orders/:id/fulfillment`** — the Ordered/Challaned/Returned/NetDelivered/Remaining view (`database-schema.md` §27, Module 73).
- **`POST /delivery-challans/:id/returns`** — `{ lines: [{ challanLineId, quantity, condition: GOOD|DAMAGED|FAULTY|MISSING_PARTS }] }`. **Notes:** returns `422` if any line's quantity would exceed that line's original Challan quantity (`architecture.md` §58.1's domain guard). A `DAMAGED`/`FAULTY` line auto-creates a linked `DamageLossReport` (§16 below) in the same call — the client never files the two separately.

## 16. Inventory API

- **`GET /stock`** (filters: `?warehouseId=`, `?productId=`, `?belowReorderPoint=true`) — the query behind the low-stock notification (`prd.md` §10.6).
- **`POST /stock-adjustments`** — files an `ApprovalRequest` if above a threshold (`prd.md` §9's business rule), otherwise applies immediately.
- **`POST /stock-transfers`**, **`POST /stock-transfers/:id/receive`** — implements `prd.md` §9.8; a quantity mismatch at receive routes into the same discrepancy handling as §14's GRN endpoint.
- **`GET /serial-numbers/:serial/history`** — the full `SKULifecycleEvent` trail for one physical unit (`prd.md` §2's traceability requirement, directly as an endpoint).
- **`POST /damage-loss-reports`** — `{ warehouseId, lines: [{ productId, serialNumberId?, quantity, costBasis }], reason, evidenceFileId? }` (Module 74, `prd.md` §8.30). **Notes:** creates the report only — zero inventory/financial effect until approved.
- **`POST /damage-loss-reports/:id/approve`** — delegates to §18's Approval API; returns `409` on a self-approval attempt, identical to every other approval endpoint. **Notes:** request body includes `disposition: SCRAP|RETURN_TO_STOCK|REPAIR|RMA|WRITE_OFF` — required at approval time, not report time, since the disposition decision is what approval actually is.
- **`GET /damage-loss-reports/:id`** — includes `grossLoss`/`recovery`/`netLoss`, never just the net figure alone (`prd.md` §8.30).

## 17. Service & Technician API

The platform's signature flow (`prd.md` §9.1, §9.3, §9.7's Module 72 branch) — the largest single domain section.

- **`POST /tickets`** — `{ ticketType: WARRANTY_CLAIM | PAID_SERVICE_REQUEST, ... }`. **Notes:** `serialNumberId` required if `WARRANTY_CLAIM`, omitted if `PAID_SERVICE_REQUEST` (`database-schema.md` §7.12/§57).
- **`POST /tickets/:id/service-quotation`** — creates the linked Service Quotation (a normal `Quotation`, §15, with `ticketId` set). **Roles:** Sales Executive, Branch Manager. **Notes:** only valid for `PAID_SERVICE_REQUEST` tickets — `422` otherwise.
- **`POST /service-assignments`** — `{ sourceType: SALES_ORDER | INVOICE | TICKET, sourceId }`. **Notes:** for `sourceType=TICKET` where the ticket is `PAID_SERVICE_REQUEST`, returns `422` unless the linked Quotation's `status=ACCEPTED` (`architecture.md` §57.2's guard, surfaced here as the actual API-level error).
- **`POST /service-assignments/:id/technicians`** — assign/reassign a technician (`prd.md` §9.11).
- **`POST /service-assignments/:id/custody`** — issue `ProductCustody`.
- **`POST /service-assignments/:id/advance`** — issue `TechnicianAdvance`. **Notes:** financial write, `Idempotency-Key` required.
- **`POST /service-assignments/:id/checkin`** / **`.../checkout`** — GPS check-in/out (`prd.md` §10.1). **Notes:** accepts a queued/offline-timestamped submission (body carries the original client-side `occurredAt`, not just server receipt time) — the API contract for `architecture.md` §47's offline-sync tolerance.
- **`POST /service-assignments/:id/conveyance-bills`** — routes to §18's Approval API automatically.
- **`POST /service-assignments/:id/close`** — files the `ProjectClosureReport`, including `customerSignatureFileId` (a prior `/files` upload, §25). **Notes:** this is `architecture.md` §42's fully-worked low-level example, made concrete as one endpoint — internally it's the one `$transaction` §9 (`database-schema.md`) describes, then the `ServiceAssignmentClosed` event (§47 below), then §58's reconciliation, then the Ticket auto-close (`architecture.md` §57.2).
- **`GET /service-assignments/:id/pnl`** — project P&L, `INTERIM` or `FINAL` labeled per Finance spec §59 — never unlabeled.

## 18. Approval API

One generic engine, reused by every domain above rather than each having its own approve/reject endpoints:

- **`GET /approvals`** (filters: `?status=PENDING`, `?approvalType=`) — the calling user's approval inbox, row-scoped.
- **`POST /approvals/:id/approve`** / **`POST /approvals/:id/reject`**. **Notes:** returns `409 Conflict` if `requestedById === callingUserId` (the self-approval `CHECK` constraint, `database-schema.md` §33, surfaced as this specific status) — this is the one API-level place Module 72's still-open "who approves Super Admin's own request" gap (`prd.md` §14) becomes directly visible: the endpoint exists and enforces the rule correctly, but for a Super-Admin-initiated request there is currently no *other* endpoint or role that can call it successfully.
- **`POST /edit-requests`** / **`POST /delete-requests`** — file a governance request against any post-draft record (`prd.md` §8.25); resolved through the same `/approvals/:id/approve` action above, not a separate resolution endpoint.

## 19. Finance & Accounting API

- **`GET /chart-of-accounts`**, **`POST /chart-of-accounts`** (Super Admin/Accounts only).
- **`POST /journal-entries`** — direct manual entries (Accounts only; every other module posts internally via the Application layer, `architecture.md` §41, never through this public endpoint). **Notes:** `Idempotency-Key` required; `422` if debit ≠ credit (the DB trigger's error surfaced through the Application layer, `database-schema.md` §7).
- **`POST /journal-entries/:id/reverse`** — creates the linked reversal entry; **never** a `DELETE` on a posted entry (no such endpoint exists at all, deliberately — `database.md` §1's Rule 2).
- **`POST /vouchers`** (`type` from `database-schema.md` §25's 12 types) → **`POST /vouchers/:id/post`** → **`POST /vouchers/:id/reverse`**.
- **`GET /ledger`**, **`GET /trial-balance`**, **`GET /profit-and-loss`**, **`GET /balance-sheet`** — all read `database.md` §16's views, all require `?branchId=&fiscalPeriodId=` at minimum (§22 of `database-schema.md`'s query-strategy rule against an unfiltered scan).
- **`POST /fiscal-periods/:id/close`** — the one endpoint that runs at `SERIALIZABLE` isolation (`database-schema.md` §9/§23).
- **`GET /suspense-entries`**, **`POST /suspense-entries/:id/resolve`**.

## 20. Loan & Investment API

- **`POST /company-loans`**, **`GET /company-loans/:id/repayment-schedule`**, **`POST /company-loans/:id/repayments`**.
- **`POST /investments`**, **`POST /investments/:id/withdraw`**.
- **`POST /employees/:id/advances`** — `interestBearing` defaults to `false` (the resolved decision, `database-schema.md` §31) and is not exposed as a settable field on this endpoint at all — enforcing the resolution at the API layer, not just the DB default.
- **`GET /employees/:id/advances/:advanceId/installments`**.

## 21. HR & Payroll API

- **`POST /attendance`** (bulk-friendly — see §31), **`GET /attendance?employeeId=&month=`**.
- **`POST /leave-requests`**, resolved via §18's Approval API.
- **`POST /payroll-runs`** → **`POST /payroll-runs/:id/process`** (the `SELECT FOR UPDATE`-guarded transition, `database-schema.md` §24 — returns `409` if already `PROCESSING`) → **`POST /payroll-runs/:id/finalize`**.
- **`GET /payroll-runs/:id/payslips`**, **`GET /employees/me/payslips`** ("My Salary," `prd.md` §8.19, row-scoped to self by construction).
- **`GET /reconciliations?status=unapplied`** — the queue of `ProjectAdvanceConveyanceReconciliation` rows waiting for the next `PayrollRun`.
- **`GET /employees/:id/work`**, **`GET /employees/:id/performance`**, **`GET /employees/:id/workload`** (Module 75, `prd.md` §8.31). **Notes:** every field is read from the `employee_work_summary` view and its siblings (`architecture.md` §58.3) — there is no corresponding `POST`/`PATCH` anywhere in this API for a performance metric, ever (§39's "no manual KPI editing" rule, restated here as the concrete absence of a write endpoint). A metric with insufficient source data returns `null` with a `"reason"` field explaining why, not a fabricated `0`.
- **`GET /reports/employees/performance`**, **`GET /reports/teams/performance`** — role-scoped per §35's rule below (Employee: self; Supervisor: team; Manager: department; Admin/Super Admin: all authorized).

## 22. Reporting API

- **`GET /reports/dashboard`** — role-aware; returns the specific stat cards/charts `ui.md` §12 defines for the calling role.
- **`GET /reports/:reportKey`** (`reportKey` from a fixed catalog: `quotation-register`, `win-loss`, `stock-valuation`, `department-pnl`, etc.) — heavy ones (`architecture.md` §46) return `202 Accepted` with a `GET /export-jobs/:id` polling URL (§24) instead of the report body directly.

## 23. Universal Drill-Down API

- **`GET /drill-down/:reportKey/:summaryRowId`** — one generic endpoint implementing `prd.md` §8.26's Summary→Breakdown→Source Document pattern for every report, rather than a bespoke drill-down endpoint per report. **Notes:** the response's `breakdown` array items each carry their own `sourceDocumentUrl`, so a client can recurse (Breakdown→Source) with the same endpoint shape rather than a third, different call type.

## 24. Document, Export & Print API

- **`POST /export-jobs`** — `{ resourceType, resourceId, format: CSV|PDF|WORD|XML }`. **Notes:** synchronous for a single record, `202`+background job (§35) for anything bulk (`architecture.md` §16's existing rule).
- **`GET /export-jobs/:id`** — poll for completion; `data.downloadUrl` is a presigned S3 URL (§25) once ready.
- **`GET /print-preferences`** / **`PATCH /print-preferences`** — the letterhead-toggle default (`prd.md` §14, still open — this endpoint exists and works regardless of which default is eventually chosen).

## 25. File & Attachment API

- **`POST /files/presign`** — returns a presigned S3 PUT URL (`architecture.md` §48); the actual file bytes go straight to S3, never through Express. **Notes:** this is the one "upload" endpoint that doesn't accept a file body at all — by design, per `architecture.md` §48's bandwidth reasoning.
- **`GET /files/:id`** — returns a short-lived (5-min) presigned GET URL, after checking the caller's access to the file's *parent entity*, never the file's own ACL independently (`architecture.md` §48).

## 26. Bank Transaction Proof API

- **`POST /bank-proofs`** — `{ sourceModule, sourceId, accountNumberLast4, proofFileId }`. **Notes:** the request body never accepts a full account number field at all — there is no code path in this API that could accidentally receive or store one (`prd.md` §8.20).
- **`GET /cheque-register`**, **`POST /cheque-register/:id/mark-bounced`** — auto-reverses the linked payment/receipt (`prd.md` §9's cheque-bounce rule).

## 27. Notification API

- **`GET /notifications`** (row-scoped to self), **`PATCH /notifications/:id/read`**.
- **`PATCH /notifications/preferences`** — per-channel opt-out, **except** `ApprovalRequest`-tied notifications, which reject an attempt to disable them entirely with `422` (`prd.md` §10.6's rule, enforced here).

## 28. Draft & Workspace API

- **`PUT /drafts/:moduleKey`** (upsert, keyed by `userId+moduleKey[+recordId]`, `database.md` §36) — called every 5–10s by the client (`prd.md` §8.12); **not** a `POST`, deliberately, since the semantics are always "replace my current draft for this," matching `PUT`'s idempotent-replace meaning exactly.
- **`DELETE /drafts/:moduleKey`** — explicit discard.
- **`GET /drafts`** — the Multi-Module Workspace taskbar's data source (`ui.md` §8).

## 29. Audit API

- **`GET /audit-logs`** (filters: `?entityType=&entityId=`, `?actorId=&from=&to=`). **Roles:** Super Admin only (`architecture.md` §22). **Notes:** always paginated (§30), never a bulk export without going through §24's async export path — `AuditLog` is this platform's largest table (`database-schema.md` §6) and a synchronous unfiltered read against it is exactly the query §22 of `database-schema.md` already warns against.

## 30. Search, Filter & Pagination API

Not a separate resource — the standard every list endpoint above already follows (§7): `?cursor=`, `?limit=`, `?sort=`, plus a `?search=` free-text param on every resource with a natural search field (name, number, phone). One addition genuinely new to this section: **`GET /saved-filters?moduleKey=`** / **`POST /saved-filters`** — persists a user's filter combination (`SavedFilter`, `architecture.md` §7.16) so a frequently-used filter set doesn't need re-entering每 visit.

## 31. Import & Bulk API

**Not a `prd.md` module on its own** — flagged here as a genuine small gap this specification surfaces: `prd.md` names CSV/PDF/Word/XML *export* extensively (§8.11) but never describes bulk *import* (e.g., HR uploading a CSV of a month's attendance instead of one `POST /attendance` per employee per day). This document adds the minimal endpoint the schema already supports without a data-model change:

- **`POST /bulk/attendance`**, **`POST /bulk/products`**, **`POST /bulk/stock-adjustments`** — each accepts a CSV, validates every row against §37's rules before writing anything, and returns a per-row success/failure report rather than an all-or-nothing transaction (a 500-row upload with 3 bad rows should not discard the other 497 lightly-reviewable good ones). **This gap and this minimal fix are noted in §50's Completeness Report — a fuller bulk-import policy (which resources, size limits, async vs. sync) is a product decision beyond what this document can resolve alone.**

## 32. System Administration API

- **`GET /settings`** / **`PATCH /settings/:key`** (`SystemSetting`, `database-schema.md` §39) — Super Admin only, `AuditLog`-tracked on every change.
- **`GET /feature-flags`** / **`PATCH /feature-flags/:key`**.
- **`GET /health`**, **`GET /health/live`**, **`GET /health/ready`** — unauthenticated, per `architecture_nginx.md`'s existing spec, not re-derived here.

## 33. Portal API

Separate namespace, `/api/v1/portal/...`, not just separate auth (§5) — a structurally narrower surface, per `architecture.md` §39's anti-corruption-layer principle:

- **`GET /portal/quotations`**, **`GET /portal/invoices`**, **`GET /portal/balance`** (Customer) — each returns a portal-specific view model, never the internal `Quotation`/`Invoice` shape directly (`architecture.md` §55.4).
- **`POST /portal/invoices/:id/pay`** — the one portal write endpoint, delegating to §36's payment gateway integration.
- **`GET /portal/purchase-orders`**, **`GET /portal/statement`** (Vendor).
- **No portal endpoint accepts a `branchId` or internal `cuid` from the client at all** — every portal query is scoped server-side from the token alone (§5), never from a client-supplied filter, which is the concrete API-level implementation of `architecture.md` §39's "Customer/Vendor never gets direct model access" rule.

## 34. Realtime / WebSocket API

Not HTTP — documented here for completeness since it's part of the same API surface conceptually (`architecture.md` §47):

- Socket.IO connection at `/socket.io`, authenticated via the same JWT (as a connection-time auth token, not a header).
- Rooms joined automatically on connect, server-assigned from the token's role/branch — never client-requested (`architecture.md` §47): `branch:<branchId>`, `user:<userId>`, and `approval-inbox:<role>` if the role is an approver.
- Events pushed: `approval.new`, `assignment.updated`, `notification.new`, `salary.updated` — named to match the domain events they're triggered by (§47 below), not a separate naming scheme.

## 35. Background Job / Queue Contract

Not client-facing HTTP — the internal contract §46 (`architecture.md`) already specifies (retry policy, dead-letter, queue catalog), restated here only as: **every job payload includes the same `Idempotency-Key` concept as §7's HTTP rule** (`architecture.md` §46), so a retried job is indistinguishable, from the data's perspective, from a retried HTTP request — one idempotency mechanism, not two.

## 36. External Integration API

Not this platform's own endpoints — the contracts this platform *consumes*:

- **SSLCommerz:** `POST` to initiate, webhook callback to `/api/v1/webhooks/sslcommerz` (signature-verified before processing, per §42) — writes a `PaymentGatewayTransaction` (`database-schema.md` §40) regardless of outcome.
- **SMS/Email gateways:** outbound-only, no inbound webhook — delivery status polled or assumed from the provider's own send-response, logged to `SmsLog`/`EmailLog`.
- **Google Maps:** geocoding/directions calls, results cached (`MapsGeocodeCache`, `database-schema.md` §40) — never proxied through a public endpoint of this platform's own, always a server-to-server call from the Application layer.

---

## 37. Validation Rules

Two layers, matching `database-schema.md` §41's shape/vs/integrity distinction, restated at the API boundary specifically:

- **Request-shape validation** (required fields, types, string formats) rejects with `400` before any Application-layer code runs — a schema-validation middleware (e.g., Zod) generated from the same Prisma models this whole document set is built on, so the validation schema and the database schema can never silently drift apart.
- **Business Integrity validation** (§38 below) rejects with `422`, after shape validation passes — the distinction matters because a `400` means "you sent something malformed," while a `422` means "you sent something well-formed that isn't allowed right now," and a frontend needs to handle those two cases differently (fix the form vs. explain why the action isn't available).

## 38. Business State & Workflow API Rules

Every status-transition action (§10's "named action, not generic PATCH" rule) is only callable from specific prior states — enforced at the Application/Domain layer (`architecture.md` §40), surfaced via `422` on an invalid transition:

| Entity | Valid transitions |
|---|---|
| `Quotation` | `DRAFT→SENT→{ACCEPTED,REJECTED,EXPIRED}→CONVERTED`; `SENT→`(new version)`→SUPERSEDED` |
| `Ticket` | `OPEN→{`(warranty: straight to assignment)`, QUOTE_PENDING→QUOTE_ACCEPTED}→ASSIGNED→IN_PROGRESS→RESOLVED→CLOSED` |
| `ServiceAssignment` | `ASSIGNED→IN_PROGRESS→COMPLETED→CLOSED` (or `→CANCELLED` from any pre-`CLOSED` state) |
| `JournalEntry`/`Voucher` | `DRAFT→POSTED→REVERSED` — **never** `POSTED→DRAFT` or `POSTED→`(edited)`→POSTED` (no such transition exists in the API at all) |
| `PayrollRun` | `DRAFT→PROCESSING→FINALIZED→PAID` — `PROCESSING` is lock-guarded (§17, `database-schema.md` §24) |
| `ApprovalRequest` | `PENDING→{APPROVED,REJECTED}` — terminal, no re-opening; a rejected request must be re-filed as a new one |

## 39. Financial API Transaction Rules

- **Every endpoint that posts a `JournalEntry`, `Voucher`, `Payment`, or `SupplierPayment` requires `Idempotency-Key`** (§7) — enforced by middleware on that specific route group, not left to each handler to remember.
- **Money in request bodies is always a string, not a JSON number** (`"14500.50"`, not `14500.50`) — avoids floating-point round-tripping through JSON parsers before it ever reaches `database-schema.md` §23's `numeric(14,2)` columns; parsed to `Decimal` immediately on receipt.
- **A financial write's response always echoes the resulting balance/total**, not just the created row's own fields — e.g., `POST /invoices/:id/payments` returns the payment *and* the invoice's updated `amountDue`, so the client never needs a second `GET` to know whether the invoice is now fully paid.
- **No financial `DELETE` endpoint exists anywhere in this API** — confirmed across every section above; the only removal mechanism is the `/reverse` action pattern (§19).

## 40. Error Handling Architecture

`architecture.md` §53 already specifies the global error middleware and taxonomy — unchanged, restated as governing every endpoint in §11–§36 without exception. External-dependency failures (§36) are translated to the specific codes §53 already names (`MAPS_UNAVAILABLE`, `PAYMENT_GATEWAY_TIMEOUT`) rather than a generic `500`.

## 41. Standard Error Response

```json
{
  "data": null,
  "meta": { "requestId": "req_8f2a1c" },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "grandTotal must be a positive amount",
    "fields": { "grandTotal": "must be greater than 0" }
  }
}
```
`code` is always one of §8's taxonomy names (`architecture.md` §53) — never a raw stack trace or database error message, which is filtered out before the response leaves the Application layer regardless of environment (not just in production) since this project has no separate "verbose in dev" error mode to keep the two code paths from silently diverging.

## 42. API Security Requirements

Consolidated from `architecture.md` §22/§55 and this document's own §5/§6, not a new policy:

- TLS everywhere (Nginx-terminated, §3), MFA for Super Admin/Accounts-Finance (§5), RBAC + row-level scope on every request (§6), rate limiting per tier (`architecture_nginx.md`, passed through as `429`), `Idempotency-Key` on financial writes (§39), no full card/account numbers ever accepted in any request body (§26), and every 🔴-tagged field (`dfd.md` §1's convention) encrypted at rest regardless of which endpoint wrote it.
- **CORS:** the API only accepts requests from this platform's own known origins (the Next.js app's domain, the PWA's registered scope) — no wildcard origin, ever, given the financial data this API serves.

## 43. API ↔ Database Mapping

Every domain section (§11–§36) already names its primary tables inline and in §9's module map — this section is the reverse direction, confirming no `database-schema.md` table lacks an API surface: all ~86 tables are reachable through at least one endpoint above, except the four Finance **views** (`Ledger`/`TrialBalance`/`ProfitAndLoss`/`BalanceSheet`, `database.md` §16), which are reachable only through `GET` (§19) — consistent with them being derived, read-only data with no legitimate `POST`/`PATCH` surface at all.

## 44. API ↔ Requirement Traceability

Every `prd.md` §8 functional area maps to exactly one API section via §9's table — bidirectional, since §9 was built directly from `prd.md`'s own module numbers rather than a separate scheme. The one requirement `prd.md` names with **no** corresponding endpoint above: `prd.md` §10.11 (Training & Onboarding) — correctly so, since training isn't an API concern; flagged here only to confirm its absence from this document is deliberate, not missed.

## 45. API ↔ DFD Mapping

Every DFD Level 2 process (`dfd.md` §4) maps to one or more endpoints:

| DFD Process | API Endpoint(s) |
|---|---|
| 4.1–4.5 Sales sub-processes | §15 |
| 6.0a–6.0b (Module 72 intake) | §17's `/tickets`, `/tickets/:id/service-quotation` |
| 6.1–6.5 Service/Technician | §17 |
| 7.1–7.5 Accounting | §19 |
| 8.1–8.4 Payroll | §21 |
| A.1–A.4 Approval | §18 |
| 9.1–9.3 Reporting/Drill-down | §22, §23 |

`dfd.md`'s Balance Matrix (§13) has no API-layer equivalent needed — it validated the DFD's own internal consistency, not something an endpoint enforces at runtime.

## 46. API ↔ DDD Mapping

Every API section (§11–§36) belongs to exactly one bounded context from `architecture.md` §39 — restated as the rule this whole document was built against: **no endpoint in §11–§36 crosses a bounded-context boundary itself.** Where an endpoint's *implementation* needs another context's data (e.g., §17's Service Assignment endpoints reading Master Data for a Product), that's an in-process Application-layer call (§3, §41 `architecture.md`), never a second public endpoint the client is expected to call first.

## 47. API ↔ Event Mapping

Every domain event `architecture.md` §44 catalogs is fired by exactly one endpoint above, restated here as the direct link:

| Event | Fired by |
|---|---|
| `SalesInvoicePosted` | §15's `POST /invoices` (on posting, not creation) |
| `ServiceAssignmentClosed` | §17's `POST /service-assignments/:id/close` |
| `ConveyanceBillApproved` | §18's `POST /approvals/:id/approve` (when `approvalType=CONVEYANCE_BILL`) |
| `EditDeleteRequestApproved` | §18's `POST /approvals/:id/approve` (when `approvalType∈{EDIT_REQUEST,DELETE_REQUEST}`) |
| `PayrollRunCompleted` | §21's `POST /payroll-runs/:id/finalize` |
| `StockBelowReorderPoint` | Not fired by an endpoint at all — a scheduled background job (§35) checking §16's `/stock` data, included here to confirm its absence from the endpoint list above is correct, not an oversight |
| `PaidServiceQuotationAccepted` | §15's `POST /quotations/:id/accept`, specifically when `quotation.ticketId` is set (Module 72) |

## 48. API Testing Specification

- **Contract tests** generated from the same Prisma-derived schema (§1) validate every response shape against it automatically — a response that drifts from the model fails CI before it ships, closing the exact risk `architecture.md` §56's Validation Report flagged about the Finance posting interface needing a contract-test suite.
- **Every status-transition rule in §38** gets an explicit test for both the valid transition and at least one invalid one (asserting the `422`) — a workflow bug is far more often "allowed a transition that shouldn't be" than "blocked a valid one," so the invalid-case tests matter at least as much as the happy path.
- **Idempotency tests** on every §39-covered endpoint: same `Idempotency-Key` + same body → identical response, no duplicate row created — run against a real Postgres instance (not mocked), since this is precisely the kind of behavior that's easy to fake in a mock and easy to get subtly wrong against a real database.
- **RLS tests** (`database-schema.md` §18): a request scoped to Branch A must never be able to retrieve a Branch B row through any endpoint, tested by attempting it directly against every list/get endpoint above, not just spot-checked on a few.

## 49. API Documentation Formats

- **OpenAPI 3.1** generated from the route definitions + the Prisma-derived request/response types (§1) — this document is the human-readable narrative *behind* that generated spec (the "why," matching `prd.md`'s own PRD-vs-architecture division of labor), not a replacement for it.
- **Postman/Insomnia collection** exported from the same OpenAPI source, kept in sync automatically rather than hand-maintained separately.
- **This document itself (`api-spec.md`)** is the one that should be read first by a new developer or by Claude Code starting a new module — the generated OpenAPI spec is what a client SDK or a testing tool consumes.

## 50. API Validation & Completeness Report

**Coverage:** all 75 modules (`prd.md` §5, including Modules 72-75) have at least one endpoint above; all ~86 tables (`database-schema.md` §5) are reachable (§43); every domain event (`architecture.md` §44) has a firing endpoint (§47) except the one background-job-triggered event, correctly excluded.

**Modules 73–75 (Challan Return, Damage/Loss, Employee Performance) added in a follow-up round:** endpoints in §15/§16/§21 above. Module 75 correctly has no `POST`/`PATCH` performance endpoint anywhere — matching `architecture.md` §58.3's reporting-layer-only design, restated here as an absence rather than an oversight. The Admin role correction (`prd.md` §6) required zero endpoint changes anywhere in §11–§36, confirmed in §6 above — permission-code-based route guards meant the correction is entirely a data change.

**One genuine gap found and given a minimal fix, not left silent:** Import & Bulk (§31) is not a `prd.md`-named module at all — export is extensively specified, bulk import isn't. This document adds the minimal three endpoints the existing schema already supports without any data-model change, and explicitly flags that a fuller bulk-import policy (file size limits, which resources, synchronous vs. background-job for a large file) is a product decision this document can't make alone — the same category of finding as `requirements.md`'s original Missing Requirements analysis, surfaced again here because building the actual endpoint list is what made this specific gap visible.

**What this document deliberately doesn't do:** repeat request/response JSON bodies already fully determined by `database-schema.md`'s Prisma models (§1), invent a new business rule not already decided somewhere in `prd.md`/`architecture.md`/`database-schema.md`, or resolve any of the platform's existing open questions (payment gateway provider, fiscal year convention, the Super-Admin-self-approval gap surfaced again in §18) — every one of those is referenced at the specific endpoint it affects, not re-litigated here.
