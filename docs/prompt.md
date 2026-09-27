# Master Build Prompt — Brother's Technology System

**Purpose:** the single operational playbook an AI coding agent (Claude Code) or a developer follows to build this platform, phase by phase. This document does not re-derive business requirements, architecture, schema, or API contracts already fully specified elsewhere — it tells the builder **where that specification lives and how to apply it**, and adds the **process, sequencing, and verification rules** that didn't exist as their own document before. Where a heading below is already fully answered by an existing document, this document says so in one line and moves on, rather than restating it — the same non-duplication discipline every prior document in this set has followed.
**Built from:** `prd.md` v2.5, `architecture.md` v3.4, `dfd.md`, `database.md`, `database-schema.md`, `api-spec.md`, `admin-permission-migration-matrix.md` — all seven read in full before this document was structured.
**Date:** 8 September 2026

---

## 1. Prompt Document Overview

This is a **process document**, the eighth in this project's document set, sitting one level above the other seven: `prd.md` says *what* to build, `architecture.md`/`database-schema.md`/`api-spec.md` say *how* it's structured, and this document says *in what order, under what discipline, and how to know each step is actually done*. A builder should have this document open continuously and the other seven open as reference — this one tells you which one to check next, not what's in them.

## 2. Project Objective

Unchanged from `prd.md` §2 (Executive Summary) — not restated. One operational reading of it that matters for this document specifically: the objective is a **working, verified increment at the end of every phase**, not a working system only at the very end. Section 15 below (the phase-end gate) exists because of this reading.

## 3. Source of Truth Documents

| Document | Authoritative for |
|---|---|
| `prd.md` | Business requirements, scope, roles, workflows, roadmap phases (source numbering) |
| `architecture.md` | System architecture: DDD, layers, bounded contexts, dependencies, events, transactions, infra |
| `dfd.md` | Data flow, process decomposition, security/sensitivity tagging per flow |
| `database.md` + `database-schema.md` | The consolidated Prisma schema, all ~86 tables, constraints, indexes |
| `api-spec.md` | Every endpoint, request/response envelope, error taxonomy |
| `admin-permission-migration-matrix.md` | The Admin role family's exact permission bundles |
| **This document (`prompt.md`)** | Build sequencing, phase structure, AI-agent execution discipline, verification gates |

## 4. Source Document Priority & Conflict Resolution

If two source documents disagree, priority order is: **`prd.md` (business intent) → `architecture.md` (system design) → `database-schema.md` (data layer) → `api-spec.md` (interface layer) → this document (process)**. This document is deliberately last — it governs *how* to build, never *what*. **If a genuine conflict is found between source documents during a build, the agent must stop and report it rather than silently picking a side** — this matches the discipline `data-integrity-and-reconciliation.md` §3 already established, restated here as this project's general rule, not just an integrity-domain one. Every prior revision round in this document set (`prd.md`'s v2.2 through v2.5 revision notes) has already resolved the conflicts found up to this point; anything genuinely new found during implementation follows this same escalation path rather than an ad hoc fix.

## 5. Project Scope

Unchanged from `prd.md` §5 — 75 modules, phased per `prd.md` §13 and re-sequenced into 21 build phases here (Section 34).

## 6. Out of Scope

Unchanged from `prd.md` §5.2 (whatever that section names as explicitly deferred) plus `prd.md` §8.18's Optional Advanced Modules (Phase 15 in `prd.md`'s numbering, folded into this document's Phase 20 — Section 34) — deferred, not excluded, and not to be built ahead of its phase without an explicit scope-change decision logged the way Section 4 above requires.

## 7. Core Product Definition

Unchanged from `prd.md` §1–§2. Not restated.

## 8. Business Domain Overview

Unchanged from `prd.md` §3 (Business Context). Not restated.

## 9. System Actors & Roles

Unchanged from `prd.md` §6, as corrected in v2.5 (Admin is now permission-driven — `admin-permission-migration-matrix.md` is the actual seed data for this). Ten role families total, counting the five optional Admin sub-profiles as configurations of one role, not five new roles.

## 10. Multi-Tenant / Company / Branch Model

Unchanged from `architecture.md` §2/§18 (`database-schema.md`) — multi-tenant-*capable* architecture, single-tenant actual current use, `tenantId` present but inactive pending the still-open business decision (`prd.md` §14). Branch scoping is active from Phase 0 (Section 34) via both the Application-layer check and Postgres RLS (`database-schema.md` §18) — never one without the other, from the very first branch-scoped table onward.

## 11. Technology Stack

Unchanged from `architecture.md` §3. Not restated.

## 12. Backend-First Development Strategy

**New in this document.** The backend (API + database) is built and independently verified (Section 15's gate) for a phase **before** any frontend work for that phase starts — a phase's frontend consumes an already-working, already-tested API, never a contract still in flux. This is what makes `architecture.md` §48's contract-testing approach ("a response that drifts from the model fails CI") actually enforceable in practice: if frontend and backend were built in lockstep, a drifting contract could get silently "fixed" on the frontend side instead of caught.

---

## 13. Overall System Architecture

Fully specified — `architecture.md` §2 (principles), §4 (High-Level Architecture). Not restated.

## 14. Modular Monolith Architecture

Fully specified — `architecture.md` §2, §41 (Module Dependency Rules), §50's explicit non-goal (never split into services as a default scaling response). Not restated.

## 15. DDD Architecture Rules

Fully specified — `architecture.md` §39 (Bounded Context Map), §41 (Dependency Rules), §44 (Domain Events). Not restated. **One execution rule new here:** every module's build (Section 34's phases) starts by re-reading its bounded context's row in `architecture.md` §39 before writing a line of code — confirming which context owns the entity being built and which contexts it's allowed to depend on.

## 16. Clean / Hexagonal Architecture Rules

Fully specified — `architecture.md` §40 (Layered Architecture: Presentation/Application/Domain/Infrastructure) and §42 (the worked Low-Level Architecture example). Not restated.

## 17. Domain / Application / Infrastructure / Presentation Layers

Fully specified — `architecture.md` §40's table (responsibilities, allowed dependencies) and §42's worked call-shape example. Not restated. **One execution rule new here:** every new file created during a phase (Section 34) goes into exactly one of these four layers' folder (Section 129 below) — a file that seems to belong to two layers at once is a sign the design needs to be reconsidered before writing it, not a sign to put it in whichever folder is closer.

## 18. Bounded Context Definition

Fully specified — `architecture.md` §39. Not restated.

## 19. Module Boundary Rules

Fully specified — `architecture.md` §41 (peer contexts never import each other's Domain/Infrastructure directly; Finance is never imported by anything upstream of it). Not restated.

## 20. Module Dependency Rules

Fully specified — `architecture.md` §41's full dependency graph and the two hard rules for Claude Code (restated as this document's Section 19, not duplicated a third time). Not restated.

## 21. Cross-Module Communication Rules

Fully specified — `architecture.md` §41 (in-process Application-layer calls, never internal HTTP) and §44 (domain events for anything that should be decoupled rather than a direct call). Not restated.

## 22. Domain Event Architecture

Fully specified — `architecture.md` §44 (mechanism, naming, the event catalog) and §47 (event↔API mapping in `api-spec.md`). Not restated.

## 23. Outbox Event Architecture

**Not previously named as its own pattern** — `architecture.md` §44 already specifies "an in-process EventEmitter-based bus... backed by a `DomainEvent` outbox table for anything that must survive a process restart or fan out to a BullMQ worker." This section makes the outbox table's shape explicit, since §44 named it but didn't show its schema:

```prisma
model DomainEventOutbox {
  id          String   @id @default(cuid())
  eventType   String                          // "ServiceAssignmentClosed", etc. — architecture.md §44's catalog
  payload     Json
  publishedAt DateTime?                       // null = not yet picked up by a worker
  createdAt   DateTime @default(now())

  @@index([publishedAt, createdAt])            // "unpublished events, oldest first" — the exact query a relay worker runs
}
```
Written in the **same transaction** as the event-triggering change (`architecture.md` §45's transaction-boundary rule), then relayed to BullMQ/Socket.IO by a small poller — this is what makes `architecture.md` §44's "emit after commit, never inside it" rule actually safe against a process crash between commit and emit: the event already exists on disk, waiting to be relayed, even if the process that committed it dies immediately after.

## 24. Transaction Boundary Rules

Fully specified — `architecture.md` §45 and `database-schema.md` §9/§23 (isolation levels). Not restated.

## 25. Database Architecture Rules

Fully specified — `database.md` §1 (the three governing rules) and `database-schema.md` §2–§4. Not restated.

## 26. Prisma Schema Implementation Rules

Fully specified — `database-schema.md` §6 (points to `database.md` §3 + `database-schema.md` §25–§40 + `architecture.md` §58 as the complete, consolidated schema). Not restated.

## 27. Entity & Table Implementation Rules

Fully specified — `database-schema.md` §15 (Common/Base Fields pattern every table follows) and §9 (Primary Keys). Not restated.

## 28. Relationship Implementation Rules

Fully specified — `database-schema.md` §10 (the `Restrict`/`Cascade`/`SetNull` rule) and §7 (the one deliberate polymorphic-association exception). Not restated.

## 29. Index & Constraint Implementation Rules

Fully specified — `database-schema.md` §11–§13, §20–§21. Not restated.

## 30. Enum Implementation Rules

Fully specified — `database-schema.md` §8/§14, including the native-enum-vs-`String+CHECK` judgment call for volatile enums. Not restated.

---

## 31. Multi-Tenant & Branch Data Isolation

Fully specified — `database-schema.md` §18 (RLS as the second, independent layer under app-level scoping). Not restated. **Execution rule:** every new branch-scoped table's migration (Section 175) includes its RLS policy in the *same* migration that creates the table — never added later as a follow-up, which is exactly the gap that lets a table go live unprotected even briefly.

## 32. Audit & History Architecture

Fully specified — `database-schema.md` §12/§16 (the `AuditLog` table, no history-table-per-entity). Not restated.

## 33. Soft Delete & Record Lifecycle Rules

Fully specified — `database-schema.md` §13/§17. Not restated.

## 34. Financial Data Integrity Rules

Fully specified across `database-schema.md` §11 (Accounting Transaction Rules), `database.md` §1 (Rule 2, no hard deletes), and the `data-integrity-and-reconciliation.md` source specification's 101 rules (the ones that changed anything are already folded into the six core documents via the v2.5 round; the ones that only validated existing design — the large majority — are not separately restated here since they'd just repeat `database-schema.md`). Not restated further.

## 35. Accounting Posting Architecture

Fully specified — `database-schema.md` §7 (Finance & Accounting Data Model, full schema), §11, and the debit=credit DB trigger. Not restated.

## 36. Immutable Financial Record Rules

Fully specified — `database.md` §1 Rule 2, `database-schema.md` §13 (no `deletedAt` on financial tables at all), §11 ("never `UPDATE` a posted entry — a fresh reversal row instead"). Not restated.

## 37. Authentication Architecture

Fully specified — `api-spec.md` §5, `architecture.md` §22. Not restated.

## 38. Authorization & RBAC Architecture

Fully specified — `api-spec.md` §6, `prd.md` §6.1's permission matrix, `admin-permission-migration-matrix.md` for the Admin family specifically. Not restated.

## 39. Permission & Scope Enforcement

Fully specified — `api-spec.md` §6 (permission codes, row-level scope enforced in the Application layer + RLS). Not restated.

## 40. JWT / Refresh Token Architecture

Fully specified — `api-spec.md` §5 (access + rotating refresh, MFA as a second step for Super Admin/Accounts-Finance). Not restated.

## 41. API Architecture

Fully specified — `api-spec.md` §3. Not restated.

## 42. API Versioning Rules

Fully specified — `api-spec.md` §2 (`/api/v1/`, deprecation via `Deprecation`/`Sunset` headers, 90-day minimum sunset). Not restated.

## 43. API Naming & Convention

Fully specified — `api-spec.md` §4. Not restated.

## 44. Common API Standards

Fully specified — `api-spec.md` §7 (envelope, idempotency header, pagination, `X-Request-Id`). Not restated.

## 45. Request Validation Rules

Fully specified — `api-spec.md` §37 (shape validation → `400`, Business Integrity validation → `422`, and why the distinction matters to a frontend). Not restated.

## 46. Response Standardization

Fully specified — `api-spec.md` §7's envelope, §41's exact example. Not restated.

## 47. Error Handling Architecture

Fully specified — `api-spec.md` §40, `architecture.md` §53. Not restated.

## 48. Error Code & Error Response Standard

Fully specified — `api-spec.md` §8 (status codes) and §41 (response shape, `code`/`message`/`fields`). Not restated.

## 49. HTTP Status Code Rules

Fully specified — `api-spec.md` §8, including the deliberate `404`-not-`403` choice for row-scope denial. Not restated.

## 50. Idempotency Rules

Fully specified — `api-spec.md` §39, `database-schema.md` §11. Not restated.

## 51. Pagination / Filtering / Sorting / Search

Fully specified — `api-spec.md` §30 (cursor-based, `?search=` on every resource with a natural search field, `SavedFilter`). Not restated.

## 52. API Audit Requirements

Fully specified — `api-spec.md` §29 (`AuditLog` endpoint, Super-Admin-only, always paginated). Not restated.

## 53. API Security Requirements

Fully specified — `api-spec.md` §42. Not restated.

## 54. API ↔ Database Mapping Rules

Fully specified — `api-spec.md` §43 (every table reachable, the four Finance views' `GET`-only exception). Not restated.

## 55. API ↔ Domain Mapping Rules

Fully specified — `api-spec.md` §46 (no endpoint crosses a bounded-context boundary itself). Not restated.

## 56. API ↔ Event Mapping Rules

Fully specified — `api-spec.md` §47 (every domain event's firing endpoint, including the one deliberately-endpoint-less background-triggered event). Not restated.

---

## Module-by-Module Build Instructions (Sections 57–127)

71 module-build sections, given here as **one table**, not 71 prose subsections — every module's actual business rule, schema, and endpoints are already fully specified in the other six documents; repeating that per module here would be the exact duplication this entire document set has avoided at every prior revision. Each row is what an agent needs to locate the real specification and know which build phase (Section 34) it belongs to.

| § | Module | `prd.md` | `database-schema.md` | `api-spec.md` | Phase (§34) |
|---|---|---|---|---|---|
| 57 | Identity & Authentication | §8.1 | §3 (§15) | §5, §11 | 2 |
| 58 | User & Employee | §8.1, §8.9 | §3 | §12 | 2 |
| 59 | Role & Permission | §6, §6.1 | §3 | §11 | 2 |
| 60 | Master Data | §8.2 | §3 (pattern) | §13 | 3 |
| 61 | Company / Branch / Department | §8.2 | §3 | §13 | 1 (Section 34) |
| 62 | Customer | §8.2 | §3, §32 | §13 | 3 |
| 63 | Supplier / Vendor | §8.2 | §32 | §13 | 4 |
| 64 | Product / SKU | §8.2 | §3 (pattern) | §13 | 3 |
| 65 | Category / Brand / Unit | §8.2 | §3 (pattern) | §13 | 3 |
| 66 | Procurement (overview) | §8.3 | §28 | §14 | 4 |
| 67 | Purchase Requisition | §8.3 | §28 | §14 | 4 |
| 68 | Purchase Order | §8.3 | §28 | §14 | 4 |
| 69 | GRN | §8.3, §9.9 | §28 | §14 | 4 |
| 70 | Inventory (overview) | §8.5 | §26 | §16 | 5 |
| 71 | Warehouse | §8.2, §8.5 | §3 (Master Data) | §13 | 3 |
| 72 | Batch / Serial Tracking | §8.5 | §26 | §16 | 5 |
| 73 | Stock Transfer | §9.8 | §26 | §16 | 5 |
| 74 | Stock Adjustment | §8.5 | §26 | §16 | 5 |
| 75 | Sales (overview) | §8.4 | §27 | §15 | 6 |
| 76 | Quotation | §8.27, §9.12 | §27 | §15 | 6 |
| 77 | Sales Order | §8.4, §8.29 | §27, §51 (fulfillment view) | §15 | 6 |
| 78 | Delivery Challan (+ Return, Module 73) | §8.29, §9.13 | §27, §58.1 (`architecture.md`) | §15 | 6 |
| 79 | Invoice | §8.4 | §27 | §15 | 6 |
| 80 | Customer Advance | §8.7 | §3 (`database.md`) | §15 (payments) | 7 |
| 81 | Payment & Collection | §8.4 | §27 | §15, §36 | 7 |
| 82 | Credit Note / Debit Note | §8.4 | §27 | §15 | 6 |
| 83 | Service & Technician (overview) | §8.6 | §29 (`architecture.md` §7.7) | §17 | 8 |
| 84 | Service Ticket | §8.8, §8.28, §9.3 | §7.12 (`architecture.md`) | §17 | 8, 13 |
| 85 | Field Visit | §8.6, §9.1 | §29 | §17 | 8 |
| 86 | Technician Assignment | §8.6 | §29 | §17 | 8 |
| 87 | Product Custody | §8.6 | §29 | §17 | 8 |
| 88 | Warranty | §8.8, §9.10 | §7.12 (`architecture.md`) | §17 | 13 |
| 89 | Project / Installation | §8.6, §9.1 | §29 | §17 | 8 |
| 90 | Technician Advance & Expense | §8.6 | §29 | §17 | 8 |
| 91 | HR (overview) | §8.9 | §30 | §21 | 12 |
| 92 | Attendance | §8.9 | §30 | §21 | 12 |
| 93 | Leave | §8.9 | §30 | §21 | 12 |
| 94 | Payroll | §8.19 | §30 | §21 | 12 |
| 95 | Employee Loan | §8.7 | §31 | §20 | 11 |
| 96 | Company Loan | §8.7 | §31 | §20 | 11 |
| 97 | Investment | §8.7 | §31 | §20 | 11 |
| 98 | Expense | §8.7 | §25 (Voucher) | §19 | 10 |
| 99 | Chart of Accounts | §8.7 | §3 (`database.md`) | §19 | 10 |
| 100 | Voucher | §8.21 | §25 | §19 | 10 |
| 101 | Ledger | §8.7 | §16 (`database.md`, view) | §19 | 10 |
| 102 | Day Book / Cash Book / Bank Book | §8.22 | §25 | §19 | 10 |
| 103 | Receipt / Payment Statement | §8.22 | §25 | §19 | 10 |
| 104 | Suspense | §8.23 | §25 | §19 | 10 |
| 105 | Bank Transaction Proof | §8.20 | §25 | §26 | 7, 10 |
| 106 | Financial Reporting (overview) | §8.10 | §37 (`database.md`) | §22 | 14 |
| 107 | P&L | §8.7 | §16 (`database.md`, view) | §19, §22 | 10, 14 |
| 108 | Balance Sheet | §8.7 | §16 (`database.md`, view) | §19, §22 | 10, 14 |
| 109 | Cash Flow | §8.10 | §16 (`database.md`, view) | §22 | 14 |
| 110 | Project / Department / Head-wise P&L | §8.10 | §19 (Dept/Project scoping) | §22 | 14 |
| 111 | Approval Workflow | §8.14 | §33 | §18 | 9 |
| 112 | Edit / Delete Governance | §8.25 | §33 | §18 | 9 |
| 113 | Universal Drill-Down | §8.26 | §22 (Query Strategy) | §23 | 14 |
| 114 | Notification | §8.14, §10.6 | §34 | §27 | 15 |
| 115 | Draft & Workspace | §8.12 | §36 | §28 | 16 |
| 116 | File & Attachment | (cross-cutting) | §35 | §25 | 18 |
| 117 | Document / Print / Export | §8.11, §8.24 | §37 (`database.md`) | §24 | 18 |
| 118 | Reporting (overview) | §8.10 | §37 | §22 | 14 |
| 119 | Dashboard | §8.10 | §16 (views) | §22 | 14 |
| 120 | Search | §8.13 | §30 (`database-schema.md`) | §30 | throughout — see Section 130 below |
| 121 | Import / Bulk Processing | (gap found and minimally closed — `api-spec.md` §31) | §26/§27's tables | §31 | 18 |
| 122 | System Configuration | (gap found and closed — `architecture.md` §58's pattern, `database-schema.md` §39) | §39 | §32 | 19 |
| 123 | Audit | §8.17 | §38 | §29 | throughout — see Section 130 below |
| 124 | System Administration | §8.17 | §39 | §32 | 19 |
| 125 | Customer Portal | §8.15 | (narrow views, no new tables) | §33 | 17 |
| 126 | Vendor Portal | §8.15 | (narrow views, no new tables) | §33 | 17 |
| 127 | Employee / Technician Portal | §8.16 (the PWA itself) | — | (uses §17's endpoints, scoped) | 8, 14 (mobile polish) |

---

## Backend Implementation Standards (Sections 128–152)

Genuinely new — conventions for the actual codebase that no prior document specified at this level of concreteness.

### 128. Project Repository Structure

```
/src
  /modules/<context>/           # one folder per architecture.md §39 bounded context
    /domain/                    # entities, value objects, domain services — no framework imports
    /application/               # use-cases, orchestration
    /infrastructure/            # Prisma repositories, external clients
    /presentation/               # Express routes, DTOs, mappers
  /shared/                      # cross-cutting: response envelope, error taxonomy, middleware
  /jobs/                        # BullMQ processors, one file per queue (architecture.md §46)
prisma/
  schema.prisma
  seed.ts
  migrations/
```

### 129. Module Folder Structure

Each `/modules/<context>/` folder mirrors `architecture.md` §40's four layers exactly (Section 17 above) — a file's folder tells you its layer before you even open it.

### 130. Domain Entity Rules

Plain TypeScript classes, no Prisma import, no HTTP import. An entity's methods enforce its own invariants (e.g., `ServiceAssignment.validateCloseable()` per `architecture.md` §42's worked example) — invariant logic never lives in a route handler or a repository.

### 131. Value Object Rules

Immutable, equality-by-value, used for anything that's a *shape* rather than an *identity* — money (already `Decimal`-typed per `database-schema.md` §23, but wrapped in a `Money` value object at the Domain layer for arithmetic that enforces the rounding convention, `prd.md` §10.12), a date range, an address.

### 132. Repository Interface Rules

Defined in the Domain layer (an interface, no implementation), implemented in Infrastructure — this is what makes `architecture.md` §41's "Application depends on Domain/Infrastructure via interfaces" concrete: Application code imports the Domain-layer interface, never the Infrastructure-layer Prisma class directly.

### 133. Repository Implementation Rules

One repository per aggregate root (roughly, per top-level model in `database-schema.md` §25–§40 that other models hang off of — `ServiceAssignment`, not `TechnicianAssignment` separately). A repository method returns a Domain entity, never a raw Prisma result.

### 134. Use Case / Application Service Rules

One use-case class per meaningful action (`CloseServiceAssignment`, `AcceptQuotation`) — matches `api-spec.md` §10's "named action, not generic PATCH" endpoint rule one-to-one; if an endpoint exists, there is exactly one use-case class behind it.

### 135. Domain Service Rules

For logic that doesn't belong to any single entity (the §58.1 `architecture.md` fulfillment calculation spanning `SalesOrderLine`/`DeliveryChallanLine`/`DeliveryChallanReturnLine`) — a stateless Domain-layer service, still no framework imports.

### 136. Controller Rules

Express route handler: auth guard → parse/validate request (Section 141) → call exactly one Application-layer use-case → format the result in `api-spec.md` §7's envelope. Never more than a few lines of actual logic — anything more is a sign logic leaked out of the Application/Domain layer.

### 137. Middleware Rules

Auth, request-ID assignment (already at Nginx, `architecture.md` §38.10, but re-asserted here if missing), idempotency-key checking (`api-spec.md` §39), and the global error handler (`architecture.md` §53) — applied at the Express app level, not per-route, so no route can accidentally skip one.

### 138. Guard / Policy Rules

A route's permission-code requirement (`api-spec.md` §6) is declared once, next to the route definition, checked by shared middleware — never re-implemented per handler.

### 139. DTO Rules

Request/response shapes are generated from the Prisma models (`api-spec.md` §1) plus a thin hand-written layer for fields that differ from the DB shape (a portal view model, `architecture.md` §55.4) — a DTO is never hand-duplicated field-by-field from a model that already exists.

### 140. Mapper Rules

Domain entity ↔ DTO conversion lives in the Presentation layer only (Section 17) — Infrastructure maps Prisma rows to Domain entities; Presentation maps Domain entities to DTOs. Two separate mapping steps, never collapsed into one Prisma-row-to-DTO shortcut, since that's exactly the kind of shortcut that leaks a raw DB column into an API response it was never authorized to leave through.

### 141. Validation Schema Rules

One schema (Zod or equivalent) per request shape, colocated with its DTO (Section 139) — this is the literal implementation of `api-spec.md` §37's shape-validation layer.

### 142. Database Transaction Rules

Unchanged from `database-schema.md` §9/§23/Section 24 above. Not restated — this heading exists in the outline at the implementation-standards level because a `$transaction` call is something a use-case (Section 134) actually writes, not just a policy; the policy itself lives in the documents already cited.

### 143. Event Handler Rules

A subscriber to a domain event (`architecture.md` §44) is a small, single-purpose Application-layer class — `PostSalesInvoiceOnPosted`, not a growing dispatch function with a switch statement per event type.

### 144. Background Job Rules

Unchanged from `architecture.md` §46 (queue catalog, retry policy). Not restated.

### 145. Queue / BullMQ Rules

Unchanged from `architecture.md` §46. Not restated.

### 146. Redis Rules

Unchanged from `architecture.md` §51 (caching — what's cached, what's never cached) and `database-schema.md` §3 (sessions). Not restated.

### 147. Realtime / Socket.IO Rules

Unchanged from `architecture.md` §47, `api-spec.md` §34. Not restated.

### 148. File Storage Rules

Unchanged from `architecture.md` §48, `api-spec.md` §25. Not restated.

### 149. Numbering / Document Sequence Rules

Unchanged from `database-schema.md` §24 (business-key document numbers, branch/year/sequence pattern, never reused). Not restated.

### 150. Money / Currency Handling Rules

Unchanged from `database-schema.md` §23 (`numeric(14,2)`, never float), `prd.md` §10.12 (rounding convention), `api-spec.md` §39 (money as a string in request bodies). Not restated.

### 151. Date / Timezone Rules

Unchanged from `database-schema.md` §3 (`Asia/Dhaka` connection default, `timestamptz` storage, never naive local time). Not restated.

### 152. Precision / Decimal Handling Rules

Unchanged from `database-schema.md` §23/§12 (2 decimal places, round-half-up). Not restated.

---

## Security & Reliability (Sections 153–168)

### 153. Security Baseline

Unchanged from `architecture.md` §22, `api-spec.md` §42. Not restated.

### 154. Input Security

Section 141's validation schema is also the injection-prevention boundary — combined with Prisma's parameterized queries (`architecture.md` §22), no raw string concatenation into a query anywhere in this codebase, checked in code review (Section 258).

### 155. Authentication Security

Unchanged from `api-spec.md` §5 (MFA for Super Admin/Accounts-Finance), `architecture.md` §22. Not restated.

### 156. Authorization Security

Unchanged from `api-spec.md` §6, Section 39 above. Not restated.

### 157. Tenant Isolation Security

Unchanged from `database-schema.md` §18. Not restated.

### 158. SQL / Prisma Security

Prisma's parameterized queries by default (`architecture.md` §22); the two raw-SQL exceptions in this whole schema (the debit=credit trigger, `database-schema.md` §7; the materialized views, `database.md` §16) are reviewed with the same rigor as a migration (Section 175), never treated as "just SQL, less scrutiny."

### 159. XSS / CSRF Protection

Unchanged from `architecture.md` §22. Not restated.

### 160. Rate Limiting

Unchanged from `architecture_nginx.md`'s tiers (public API / auth endpoints / uploads / private API), passed through as `429` (`api-spec.md` §8). **Still an open item, restated from `requirements.md`'s original finding, not yet resolved:** the actual numeric thresholds per tier — Phase 19 (Section 34, Security Hardening) is where these must finally be set, not deferred further.

### 161. Sensitive Data Protection

Unchanged from `database-schema.md` §55 (RLS + field-level encryption for 🔴-tagged columns, `dfd.md` §1's convention). Not restated.

### 162. Password Security

Unchanged from `architecture.md` §22 (bcrypt/Argon2), `database-schema.md` §24 (Section 42's proposed complexity/lockout rules from `prd.md` §10.5). Not restated.

### 163. Token Rotation & Session Security

Unchanged from `api-spec.md` §5 (refresh rotation, no reuse window). Not restated.

### 164. Audit Security

Unchanged from `database-schema.md` §12/§16 (identity/access events included in audit scope, not just financial). Not restated.

### 165. File Upload Security

Unchanged from `architecture.md` §48 (presigned URLs, never proxied through Express, access checked against the parent entity). Not restated.

### 166. Backup & Recovery

Unchanged from `architecture.md` §54, `database-schema.md` §53. Not restated.

### 167. Disaster Recovery

Unchanged from `architecture.md` §54 (RTO 4h/RPO 24h, quarterly restore drill). Not restated.

### 168. Failure Handling & Recovery

Unchanged from `architecture.md` §53, `api-spec.md` §40. Not restated.

## Development & Build Process (Sections 169–183)

### 169. Development Environment Setup

Docker Compose (`architecture.md` §38's service topology) brings up Postgres, Redis, the API, and the web app locally in one command — no developer runs Postgres/Redis natively, so "works on my machine" never means a different DB/Redis version than production.

### 170. Environment Variables

Per `architecture.md` §49 — `.env` locally (git-ignored, `.env.example` committed), platform-injected in staging/prod, never baked into an image. `SystemSetting` (`database-schema.md` §39) holds anything that isn't a secret and might change without a deploy — the two are never conflated.

### 171. Docker / Docker Compose Setup

Unchanged from `architecture.md` §38 (Nginx, Next.js `:3000`, Express `:4000`, Postgres/Redis internal-only). Not restated.

### 172. PostgreSQL Setup

Unchanged from `database-schema.md` §3 (version, pooling, timeout settings). Not restated.

### 173. Redis Setup

Unchanged from `architecture.md` §46 (BullMQ)/§47 (Socket.IO adapter)/§51 (cache). Not restated.

### 174. Prisma Setup

Standard — `schema.prisma` at the repo root, `prisma generate` in the build step, client imported only from Infrastructure-layer repositories (Section 132), never directly in a route handler (Section 136).

### 175. Migration Strategy

Unchanged from `database-schema.md` §50 (additive-first, reviewed like code, enum-change discipline). Not restated.

### 176. Seed Strategy

Unchanged from `database-schema.md` §51 + `admin-permission-migration-matrix.md` §5 (Admin family specifically). Not restated.

### 177. Development Data Strategy

Seed data (Section 176) plus each developer's own locally-created test records — never a shared mutable dev database, since two developers' manual test data colliding is a recurring, avoidable source of "why is this broken" that has nothing to do with the actual code.

### 178. Test Data Strategy

Unchanged from `database-schema.md` §52 (`faker.seed(42)`, realistic Bangladeshi data, never production-touching). Not restated.

### 179. Logging Setup

Unchanged from `architecture.md` §52 (structured `pino` JSON, correlation ID from Nginx). Not restated.

### 180. Monitoring Setup

Unchanged from `architecture.md` §52 (Prometheus/Grafana) + `database-schema.md` §56 (the three Postgres-specific metrics added there). Not restated.

### 181. Health Check System

Unchanged from `architecture_nginx.md` (`/health`, `/health/live`, `/health/ready`), surfaced in `api-spec.md` §32. Not restated.

### 182. Background Worker Setup

Unchanged from `architecture.md` §46. Not restated.

### 183. Scheduled Job Setup

Unchanged from `architecture.md` §46 (backup queue, off-peak only) plus the recurring jobs this document set has named elsewhere: `DraftState` 1-hour expiry (`prd.md` §14), `SuspenseEntry` aging recalculation (`database-schema.md` §25), materialized view refresh (`database.md` §16).

---

## Step-by-Step Execution Rules — The 21 Build Phases (Sections 184–204)

Re-sequenced from `prd.md` §13's 16 phases into 21 more granular ones, matching the structure this document was commissioned against — every phase below names which `prd.md` §13 phase(s) it corresponds to, so the two numbering schemes never drift apart silently.

| § | Phase | `prd.md` §13 phase | What ships |
|---|---|---|---|
| 184 | 0 — Project Scaffold | 0 (part) | Repo structure (§128), Docker Compose (§171), CI skeleton, no business logic yet |
| 185 | 1 — Database Foundation | 0 (part) | Full `schema.prisma`, RLS policies, the Posting/Ledger Stub (`prd.md` §13's Phase 0 note), migrations working end to end |
| 186 | 2 — Identity & RBAC | 0 (part) | §57–59: Auth, User/Employee, Role/Permission — incl. the Admin family (`admin-permission-migration-matrix.md`) |
| 187 | 3 — Master Data | 1 | §60–65, §71 |
| 188 | 4 — Procurement | 2 (part) | §66–69, §63 |
| 189 | 5 — Inventory | 2 (part) | §70, §72–74, incl. Module 74 (Damage/Loss) |
| 190 | 6 — Sales & Quotation | 3 | §75–79, §82, incl. Module 73 (Challan Return) |
| 191 | 7 — Customer Advance & Payments | 4 | §80–81, §105 (Bank Proof, partial) |
| 192 | 8 — Service & Technician | 5 | §83–87, §89–90, incl. Module 72 (Service-Only Customer) |
| 193 | 9 — Approval & Governance | 5 (part) | §111–112 |
| 194 | 10 — Accounting & Finance | 6 | §99–104, §107–108 (posting side) |
| 195 | 11 — Loans & Investment | 7 | §95–97 |
| 196 | 12 — HR & Payroll | 9 | §91–94 |
| 197 | 13 — Warranty & Ticket | 8 | §84 (extended), §88 |
| 198 | 14 — Reporting & Drill-Down | 11 | §106, §109–110, §113, §118–119, incl. Module 75 (Employee Performance) |
| 199 | 15 — Notifications & Realtime | 12 (part) | §114 |
| 200 | 16 — Draft & Workspace | 10 | §115 |
| 201 | 17 — Portal APIs | 12 (part) | §125–127 |
| 202 | 18 — Import / Export / Print | 13 (part) | §116–117, §121 |
| 203 | 19 — Security Hardening | 13 (part) | §122, §124, §153–168's remaining open items (rate-limit numbers, etc.) |
| 204 | 20 — Production Readiness | 13 (part), 14 | Section 271–280's full validation pass, mobile PWA polish (`prd.md` §13 Phase 14) |

Phase 15 of `prd.md` §13 (Optional Advanced Modules) has no corresponding numbered phase here — it's post-Phase-20, pulled in module-by-module as Brother's Technology System prioritizes, per `prd.md` §8.18's existing framing.

## Mandatory Structure Inside Every Phase (Sections 205–225)

**This is the one template applied identically to all 21 phases above** — defined once, here, rather than 21 times. Every phase (Section 184–204) produces exactly this structure before it's considered started, in progress, or done.

**205. Phase Objective** — one paragraph, copied from this document's phase table (above) plus the specific modules table rows (Section 57–127) it covers.

**206. Prerequisites** — which earlier phases must already be complete (Section 225's checklist passed) — a phase never starts against an unfinished dependency, even if the code would technically run.

**207. Source Requirements** — the exact `prd.md`/`architecture.md`/`database-schema.md`/`api-spec.md` section numbers this phase implements, pulled directly from Section 57–127's table.

**208. Database Changes** — which new tables/columns/indexes/views this phase adds, referencing `database-schema.md` directly (never re-specified here).

**209. Prisma Changes** — the actual migration this phase's Section 208 requires (Section 175's rules apply).

**210. Domain Layer Implementation** — which entities/value objects/domain services (Sections 130–131, 135) this phase writes.

**211. Application Layer Implementation** — which use-cases (Section 134) this phase writes, one per endpoint per Section 134's 1:1 rule.

**212. Infrastructure Layer Implementation** — which repositories (Sections 132–133) and external-integration clients (Section 36, `api-spec.md`) this phase writes.

**213. API Endpoints** — the exact endpoint list from `api-spec.md`'s corresponding section(s), copied as a checklist, not re-described.

**214. Validation Rules** — this phase's request-shape (Section 141) and Business Integrity (`api-spec.md` §38) rules, referenced not restated.

**215. Authorization Rules** — which roles/permission codes this phase's endpoints require, from `prd.md` §6.1 and `admin-permission-migration-matrix.md` where Admin-family access is involved.

**216. Transaction Rules** — which of this phase's writes need a `$transaction` (Section 24/142) — named explicitly per endpoint, not assumed.

**217. Events** — which domain events (`architecture.md` §44) this phase's writes emit, and which existing events from earlier phases this phase's use-cases subscribe to.

**218. Background Jobs** — which of `architecture.md` §46's queue this phase's async work uses.

**219. Notifications** — which of `prd.md` §10.6's catalog this phase triggers.

**220. Audit Requirements** — confirmation this phase's writes are covered by `AuditLog` (Section 32) — for a new table, this is a checklist item, not new design.

**221. Error Handling** — this phase's specific `422` Business Integrity cases (beyond the generic taxonomy, Section 47), if any are new.

**222. Test Requirements** — Section 238–252's strategy, applied to this phase's specific endpoints/rules.

**223. Seed / Demo Data** — this phase's additions to Section 176/178, if this phase introduces a new table needing seed rows.

**224. Documentation Updates** — if this phase's implementation reveals a genuine gap or correction in any of the seven source documents (Section 3), that document is updated the same way every prior revision round in this project has been (a clear revision note, not a silent edit) — **this is where a real implementation-time finding closes the loop back into the specification**, rather than living only in code comments.

**225. Phase Completion Checklist** — the phase is not "done" until every one of Sections 205–224 above has a concrete answer, **and** the mandatory end-of-phase validation below (Section 225a) passes.

### 225a. Mandatory End-of-Phase Validation (Security · Build · Requirements Gap)

**Added specifically per this document's brief — every one of the 21 phases above runs this exact three-part check before moving to the next phase, no exceptions:**

1. **Security check:** every new endpoint (Section 213) has a permission-code guard (Section 215) and, if branch-scoped, an active RLS policy (Section 31/157); every new 🔴-tagged field (`dfd.md` §1) is encrypted or masked per Section 161; every new table follows Section 33's soft-delete/immutability rule correctly for its data class (financial vs. master data).
2. **Build check:** the full monorepo builds with zero TypeScript errors, `prisma migrate deploy` runs clean against a fresh database, and the contract tests (`architecture.md` §56, `api-spec.md` §48) pass against this phase's new endpoints specifically, not just the suite as a whole.
3. **Requirements gap check:** this phase's actual output (tables, endpoints, business rules implemented) is re-diffed against **all seven source documents** (Section 3) — not just the sections this phase was scoped to (Section 207) — specifically looking for: a table or endpoint another document already implies but this phase's Section 207 scope missed; a business rule stated in `prd.md`/`data-integrity-and-reconciliation.md`'s already-incorporated findings that this phase's code doesn't actually enforce; or a cross-module dependency (`architecture.md` §41) this phase's implementation violates. **Any gap found here is logged the same way Section 4's conflict-resolution rule requires — reported, not silently patched — and either fixed before the phase is marked done or explicitly deferred with a reason, never left unrecorded.**

This three-part check is what makes Section 206's "prerequisites" meaningful for the *next* phase — a phase's prerequisite isn't "the code exists," it's "the code exists **and** passed its own Section 225a."

---

## Feature Implementation Rules (Sections 226–237)

**Another reusable template, defined once** — applied to any individual feature within a phase (a phase, Section 184–204, is usually several features; this is the finer-grained unit).

**226. Feature-by-Feature Development Protocol** — one feature = one use-case (Section 134) = one or a small number of endpoints (Section 213) = one PR. Never a PR spanning multiple unrelated features, since that's what makes Section 224's "which document needs updating" hard to answer later.

**227. Feature Dependency Resolution** — checked against Section 20/Section 41 (`architecture.md`) before starting — a feature that needs another not-yet-built feature's data is either resequenced or stubbed with an explicit, logged placeholder (never a silent assumption, Section 256).

**228. Feature Input / Output Definition** — the DTO (Section 139) in and out — defined before the use-case's internal logic is written, not after.

**229. Feature Database Mapping** — which exact tables/columns (`database-schema.md` §46–§47) this feature touches.

**230. Feature API Mapping** — which exact endpoint(s) (`api-spec.md`) this feature implements.

**231. Feature Permission Mapping** — which permission code(s) (Section 39) gate this feature.

**232. Feature Workflow Mapping** — which `prd.md` §9 (or the newer §9.13/§9.14) key workflow this feature is a step of.

**233. Feature Event Mapping** — which `architecture.md` §44 event(s) this feature emits or subscribes to.

**234. Feature Audit Mapping** — confirmed covered by `AuditLog` (Section 32) — a checklist item, not new design, same as Section 220.

**235. Feature Error Mapping** — which specific `422`/`409` cases (Section 8, `api-spec.md`) this feature can return, beyond the generic taxonomy.

**236. Feature Test Mapping** — which of Section 238–252's test categories apply, and the specific test file(s).

**237. Feature Acceptance Criteria** — written as a checklist before the feature is coded (not after, as a retrofit) — "given X, when Y, then Z," directly testable against Section 236's tests.

## Testing & Validation (Sections 238–252)

### 238. Unit Testing Strategy

Domain layer (Sections 130–131, 135) gets the heaviest unit-test coverage — pure functions/classes, no database, fast. A Domain invariant (Section 130) without a unit test asserting it's actually enforced is treated as not-yet-done, not "probably fine."

### 239. Integration Testing Strategy

Application + Infrastructure layers, against a real (test) Postgres instance — never mocked, per `api-spec.md` §48's explicit reasoning for idempotency/RLS tests specifically, generalized here to every integration test.

### 240. API Testing Strategy

Contract tests (`api-spec.md` §48) generated from the same schema every DTO (Section 139) is generated from — a response drifting from the model fails here before it ever reaches a human reviewer.

### 241. Database Testing Strategy

Every `CHECK` constraint and trigger (`database-schema.md` §12) gets a test that attempts to violate it and asserts the database itself rejects the write — not just that the Application layer happens to prevent it, since Section 154/158's defense-in-depth posture means both layers need independent verification.

### 242. Authorization Testing

Every permission code (Section 39) gets both a positive test (the intended role succeeds) and a negative test (every other role gets `403`/`404` per Section 49's rule) — Section 242 exists specifically because `requirements.md`'s original Security Validation finding was that RBAC coverage is easy to assert and easy to leave partially untested; this makes "every role tested against every endpoint" the actual bar, not "the happy path role was tested."

### 243. Multi-Tenant Isolation Testing

`api-spec.md` §48's RLS test description, generalized: attempted against **every** list/get endpoint (`api-spec.md` §11–§36), not spot-checked.

### 244. Financial Integrity Testing

Idempotency (`api-spec.md` §48), debit=credit trigger (§241 above), the `no_self_approval`/`damage_loss_no_self_approval` constraints (`database-schema.md` §33, `architecture.md` §58.2) — every one of Section 34's rules gets a test that tries to violate it.

### 245. Transaction / Concurrency Testing

Optimistic-lock conflict (two concurrent updates, one must get `409`) and the pessimistic-lock cases (`database-schema.md` §24: stock decrement, `PayrollRun` processing) — tested with genuinely concurrent requests (a test harness firing both at once), not sequential calls that never actually race.

### 246. Event / Queue Testing

A published domain event (Section 22–23) is asserted to actually reach its subscriber(s) in a test environment, and a job that exhausts its retries (`architecture.md` §46) is asserted to land in the dead-letter queue, not silently vanish.

### 247. Error Handling Testing

Every named `422`/`409` case across this document set (collected in Section 235's per-feature mapping) has an explicit test — restating `api-spec.md` §48's "invalid transitions matter as much as valid ones" rule as a coverage requirement, not just a reminder.

### 248. Regression Testing

The full contract-test + integration-test suite (Sections 239–240) runs on every PR, not just before a release — a regression is cheapest to catch the moment it's introduced.

### 249. End-to-End Workflow Testing

One E2E test per `prd.md` §9 key workflow (including §9.13/§9.14) — the actual multi-step business flow, browser-to-database, not just its individual API calls in isolation.

### 250. Requirement Traceability Testing

Every `prd.md` §8 functional requirement has at least one test traceable to it — the practical check behind Section 292/293's completeness matrices (below), run continuously rather than assembled only at the end.

### 251. Cross-Module Validation

A test suite specifically for `architecture.md` §41's dependency rules — asserting (via a lint rule or an architecture-test tool, not just code review) that no peer context imports another's Domain/Infrastructure directly, and Finance is never imported by anything upstream.

### 252. Final Backend Validation

Section 271–280's full pass, run once before Phase 20 (Production Readiness) is considered complete — not a new set of checks, the cumulative confirmation that every phase's Section 225a passed and nothing regressed since.

---

## Claude Code / AI Agent Execution Rules (Sections 253–270)

Consolidated from `data-integrity-and-reconciliation.md`'s AI Agent Database Change Protocol, `role-based-access-and-dashboard-feature-update.md`'s "Claude Must Not" list, `report-feature-update.md`'s AI Agent Implementation Workflow, and — concretely — the same discipline this document set's own seven prior revisions have already followed throughout this project.

**253. AI Development Role** — the agent implements against the seven source documents (Section 3); it does not re-derive business rules from general knowledge when a source document already states one, and does not invent a rule a source document leaves genuinely open (`prd.md` §14's list) without flagging it per Section 256.

**254. Source-of-Truth Compliance** — Section 4's priority order, applied on every ambiguous call.

**255. Read-Before-Modify Rule** — before touching any existing file, read its current content in full — never assume its shape from a filename or a memory of an earlier version. This project's own document-revision history (every `prd.md`/`architecture.md` version bump) has followed exactly this rule at every round.

**256. No-Unapproved-Assumption Rule** — a genuinely undecided business question (`prd.md` §14's table) is never silently resolved by the agent choosing a default — it's flagged, exactly as this project's `admin-permission-migration-matrix.md` and every "still open" item across all seven documents already models.

**257. No-Silent-Change Rule** — an existing decision is never modified without it being visible in a revision note (every `prd.md`/`architecture.md` version's revision note is the template) — restating this project's own now-established pattern (e.g., the v2.5 Admin correction) as the general rule for all future changes, not just that one.

**258. Existing-Code Inspection Rule** — before adding a table/endpoint/component, check whether it already exists under a different name — the same non-duplication check this document set's every module addition (72, 73, 74, 75) was built on.

**259. Dependency Safety Rule** — a new package is added only when Section 11 (Technology Stack)'s existing choices genuinely don't cover the need — never a second library for something already solved (a second date library, a second HTTP client).

**260. Database Safety Rule** — Section 175's migration discipline; additionally, no migration that could lock a large table for an extended period runs without an explicit maintenance-window plan (ties to Section 167).

**261. Financial Safety Rule** — Section 34–36's rules are non-negotiable — no shortcut, no "just for now" direct edit to a posted financial row, ever, regardless of how urgent the fix seems. If a financial bug is found, the fix is a new reversal/correction transaction (Section 36), never an `UPDATE`.

**262. API Contract Safety Rule** — Section 42's versioning rule — a breaking change is never shipped into `/v1/` in place.

**263. Backward Compatibility Rule** — Section 175's additive-first migration pattern, applied to API changes too: an old client (a cached PWA, a slow-to-update native app) must keep working through a rolling deploy (`architecture.md` §50).

**264. Migration Safety Rule** — Section 260, restated as: every migration is reversible or has an explicit, tested rollback plan before it runs against anything beyond a local dev database.

**265. Code Quality Rules** — TypeScript strict mode, no `any` without a comment explaining why it's unavoidable, one exported class/function's worth of responsibility per file as a soft guideline (not a hard line count).

**266. Naming Convention Rules** — `database-schema.md` §24's conventions extended to code: a Domain entity class matches its Prisma model name exactly (`ServiceAssignment`, not `Assignment` or `ServiceAssignmentEntity`); a use-case class is a verb phrase (`CloseServiceAssignment`, not `ServiceAssignmentCloser`).

**267. Comment / Documentation Rules** — a comment explains *why*, never restates *what* the next line already says; a non-obvious business rule (anything from `prd.md`/the integrity guideline that isn't self-evident from the code) gets a one-line comment citing the source section, so a future reader isn't left reverse-engineering intent.

**268. Error Message Rules** — Section 48's taxonomy — a user-facing error message is specific and actionable (`api-spec.md` §13's copy-quality bar, extended from `ui.md` §13 originally written for the frontend, applied here to backend-generated error text too), never a bare stack trace or a generic "something went wrong."

**269. Logging Rules** — Section 179 — structured, correlation-ID-tagged, `security`-tagged for the specific event classes Section 164 names.

**270. Commit / Change Tracking Rules** — one logical change per commit, referencing the Section 207 source-requirement section(s) it implements, so `git blame` on any line eventually traces back to a specific PRD/architecture requirement — the code-level version of Section 293's traceability matrix.

---

## Build Verification (Sections 271–280)

**271. Pre-Build Validation** — Section 3's seven documents are all present and at the version this document's header (§0) cites; a build never starts against a source document known to be stale.

**272. Post-Module Validation** — Section 225a, run at module granularity in addition to phase granularity when a phase (Section 184–204) bundles several modules — a module doesn't wait for its whole phase to finish before its own security/build/gap check runs.

**273. Post-Phase Validation** — Section 225a in full, at the phase boundary — this is the primary, named instance of the check this document's brief specifically required.

**274. Database Schema Validation** — `database-schema.md` §59's own checklist, re-run against the actual deployed schema (not just the design document) at the end of every phase that touched the schema.

**275. API Specification Validation** — `api-spec.md` §50's own checklist, re-run against the actual deployed API.

**276. Requirement Coverage Validation** — Section 250's traceability tests, aggregated: every `prd.md` §8 functional area has at least one passing test by the time its phase (Section 184–204) is marked done.

**277. Architecture Compliance Validation** — Section 251's cross-module dependency test suite, plus a manual spot-check that Section 40 (`architecture.md`)'s layering wasn't violated by a shortcut under deadline pressure.

**278. Security Validation** — Section 225a's security check, aggregated across all phases completed so far — not just the newest phase, since a security regression in an earlier phase is exactly the kind of thing later work can silently reintroduce (e.g., a new query that bypasses RLS by using `prisma.$queryRaw` carelessly).

**279. Financial Integrity Validation** — Section 244's test suite, plus a manual reconciliation check (`data-integrity-and-reconciliation.md`'s own Reconciliation Dashboard concept, §72–80 of that source document) run against real accumulated test/demo data, not just unit-level assertions.

**280. Final System Completeness Validation** — every module in Section 57–127's table has a passing Section 225a from its phase; every item in Section 3's seven source documents' own "still open" lists (`prd.md` §14, `requirements.md`'s carried-forward items, `dfd.md` §16, `database-schema.md` §59) is either resolved or explicitly, visibly still deferred — never quietly dropped.

## Output Requirements (Sections 281–289)

**281. Required Code Output** — the actual implementation, per Section 128's structure, for every module a phase covers.

**282. Required File Output** — migrations (Section 209), seed updates (Section 223), new/updated tests (Section 236) — a phase's PR is incomplete without all three where applicable, not just the feature code.

**283. Required Database Output** — the migration applied to a real (test) database, not just a `schema.prisma` diff — Section 274 checks the actual deployed state, not the intended one.

**284. Required API Output** — the OpenAPI spec (`api-spec.md` §49) regenerated and diffed against the previous version, confirming no unintended breaking change slipped in under Section 262's rule.

**285. Required Test Output** — a test report showing Section 236/222's required tests present and passing, not just "tests exist somewhere."

**286. Required Documentation Output** — Section 224's rule: any of the seven source documents genuinely touched by this phase's findings gets its own revision note, matching this project's established pattern exactly.

**287. Required Migration Output** — the actual `.sql` migration file, reviewed per Section 260, checked into `prisma/migrations/`.

**288. Required Seed Output** — `prisma/seed.ts`'s diff for this phase, idempotent per `database-schema.md` §51's existing rule.

**289. Required Validation Report** — Section 225a's three-part result (security/build/requirements-gap), written down per phase — not just "it passed," but what was specifically checked, matching the level of detail this document set's own validation reports (`requirements.md` §16, `database-schema.md` §60, `api-spec.md` §50) have modeled throughout.

## Final Completion (Sections 290–300)

**290. Definition of Done** — a module is done when: its Section 225a passed, its Section 237 acceptance criteria are met, and its Section 224 documentation updates (if any) are committed. A phase is done when every module in it meets that bar **and** the phase-level Section 225a also passed.

**291. Production Readiness Checklist** — Section 271–280 in full, plus Section 34 (Phase 20)'s remaining Security Hardening items (rate-limit numbers, Section 160) confirmed set, not still placeholder.

**292. Full Feature Coverage Matrix** — one row per `prd.md` §8 functional area (mirroring `prd.md` §5's own module count), columns for PRD/Architecture/DB/API/Tests/Deployed — assembled incrementally per Section 250/276, not compiled from scratch at the end.

**293. Requirement ↔ Database ↔ API ↔ Code Traceability** — the same mapping `api-spec.md` §43–§47 already established (API↔DB, API↔Requirement, API↔DFD, API↔DDD, API↔Event) extended one layer further, to the actual code (Section 270's commit-tracking rule is what makes this traceable without a separate manually-maintained matrix).

**294. Known Limitations** — carried forward from every source document's own "still open" section (Section 280) — never silently resolved by omission in the final report.

**295. Pending Decisions / Open Questions** — `prd.md` §14's table, as it stands at project completion — some items may still be genuinely open even at production readiness (e.g., payment gateway provider might remain unconfirmed until a commercial decision is made) — that's an accurate final state, not a failure of this document.

**296. Final Architecture Compliance Report** — `architecture.md` §56's Validation Report, re-run one final time against the as-built system.

**297. Final Database Compliance Report** — `database-schema.md` §60, re-run one final time.

**298. Final API Compliance Report** — `api-spec.md` §50, re-run one final time.

**299. Final Security Compliance Report** — Section 278's aggregated check, as a standalone final sign-off document.

**300. Final Project Completion Report** — one document synthesizing Sections 291–299 — the project's own version of every phase's Section 225a, at the whole-system scale.

---

*This document resolves the request for a master build prompt covering all 300 requested headings. Sections that were already fully answered by `prd.md`/`architecture.md`/`dfd.md`/`database.md`/`database-schema.md`/`api-spec.md`/`admin-permission-migration-matrix.md` are pointers, not restatements — consistent with the non-duplication discipline every prior revision of this document set has followed. The explicitly requested addition — a mandatory security/build/requirements-gap check after every phase — is Section 225a, referenced from every one of the 21 phases (Section 184–204) and from Section 273 as the standing rule for the whole build, not a one-time instruction.*
