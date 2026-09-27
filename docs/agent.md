# AGENT.md — Brother's Technology System

**Purpose of this exact file:** everything an AI coding agent (Claude Code or otherwise) needs to safely pick up work on this project — whether it's the first agent ever touching it or the fifth one resuming after a previous agent's context ran out. This file is **static** — it changes only when a genuine architecture/rule decision changes, never as part of normal day-to-day progress. Day-to-day progress lives in a separate, constantly-updated file this document defines the exact shape of (Section 321) — never edit progress into this file directly.
**Built from:** all eight prior project documents, read in full — `prd.md` v2.5, `architecture.md` v3.4, `dfd.md`, `database.md`, `database-schema.md`, `api-spec.md`, `admin-permission-migration-matrix.md`, `prompt.md`.
**Date:** 8 September 2026

---

## 1. Agent Document Overview

Two documents now govern how this project gets built: `prompt.md` (the phase-by-phase build sequence and its 300-point process discipline) and this file, `AGENT.md` (agent identity, quick orientation, and — its real reason for existing — the cross-session/cross-agent continuity protocol). Sections 1–290 below map every requested heading to whichever of the nine project documents already answers it in full; **Sections 291–390 are this document's actual new content** and are written in full, not as pointers, since no prior document defined multi-agent handoff.

## 2. Purpose of AGENT.md

To make an agent's *first five minutes* on this project safe: know who it's building for, know which documents are authoritative, know exactly how to check what's already done before writing anything, and know exactly what to leave behind when its own session ends.

## 3. Project Identity

Brother's Technology System — a Unified Business Management Platform (ERP) for a Bangladeshi company selling technology hardware (CCTV, networking, computer equipment) and providing installation/repair/maintenance services, across multiple branches. Greenfield build (`architecture.md` §37). 75 modules (`prd.md` §5).

## 4. Project Mission

Unchanged from `prd.md` §2. Not restated.

## 5. Business Domain Overview

Unchanged from `prd.md` §3. Not restated.

## 6. Project Scope

Unchanged from `prd.md` §5 / `prompt.md` §5. Not restated.

## 7. Core System Principles

Unchanged from `database.md` §1's three rules (ledger is the one source of truth for money; nothing financial is ever hard-deleted; branch scoping is enforced twice, app-layer and RLS) plus `architecture.md` §2. These three rules are this project's most-violated-by-shortcut risk if an agent is ever tempted to take one under time pressure — repeated here for that reason alone, not because they're undocumented elsewhere.

## 8. Source of Truth Documents

| Document | Covers |
|---|---|
| `prd.md` | Business requirements, roles, workflows, roadmap |
| `architecture.md` | System architecture, DDD, layers, events, infra |
| `dfd.md` | Data flow diagrams, process decomposition |
| `database.md` + `database-schema.md` | Full schema, ~86 tables |
| `api-spec.md` | Every endpoint and contract |
| `admin-permission-migration-matrix.md` | Admin role family permissions |
| `prompt.md` | Build phases, process discipline, the 300-point execution rulebook |
| **This file + its handoff record (Section 321)** | Agent identity + continuity |

## 9. Source Document Hierarchy

Unchanged from `prompt.md` §4: `prd.md` → `architecture.md` → `database-schema.md` → `api-spec.md` → `prompt.md` → this file. Not restated.

## 10. Source Conflict Resolution Rules

Unchanged from `prompt.md` §4 (stop and report, never silently pick a side). Not restated.

## 11. Agent Responsibility

Implement against the nine documents above; never re-derive a business rule from general ERP knowledge when one of these documents already states it; never resolve a genuinely open question (`prd.md` §14) by guessing.

## 12. Agent Operating Mode

Backend-first (`prompt.md` §12), one phase at a time (`prompt.md` §184–204), one feature at a time within a phase (`prompt.md` §226), every phase closed out by the mandatory validation gate (`prompt.md` §225a) before the next one starts.

---

## Project Understanding (Sections 13–31)

Every heading below is a **one-line orientation plus a pointer** — the full model is in `prd.md`/`architecture.md`, never re-derived here. This section exists so a new agent can read *this document alone* and know enough to not misunderstand the domain before opening the source documents in detail.

| § | Model | One-line orientation | Full detail |
|---|---|---|---|
| 13 | Business Model | Sells hardware + sells service on that hardware (and, since Module 72, service with no hardware sale at all) — two revenue types sharing one system of record | `prd.md` §1–3 |
| 14 | Organization Structure | Single company, multiple branches, department as a reporting dimension (not an access boundary) | `prd.md` §3, `database-schema.md` §19 |
| 15 | Company / Tenant Model | Multi-tenant-*capable*, single-tenant actual use, decision pending | `prd.md` §14, `database-schema.md` §18 |
| 16 | Branch Model | The real access boundary — RLS-enforced, every operational table carries `branchId` | `database-schema.md` §18 |
| 17 | Department Model | Tagging/reporting only, not RLS-scoped — Accounts sees every department | `database-schema.md` §19 |
| 18 | Employee / User Model | `Employee` is the HR record; `User` is the optional login — not every Employee has one | `database-schema.md` §3 |
| 19 | Customer Model | Can exist with zero Sales history (`isServiceOnly`, Module 72) | `database-schema.md` §3 |
| 20 | Supplier / Vendor Model | Standard master data + a Vendor Portal login | `database-schema.md` §32 |
| 21 | Product / SKU Model | `Product` (not "SKU" — a naming question resolved during this project's own build, see `database-schema.md`'s note on the conflict found and rejected) | `database-schema.md` §3 |
| 22 | Warehouse / Inventory Model | Stock ledger per product-per-warehouse, full serial/batch lifecycle traceability | `database-schema.md` §26 |
| 23 | Sales Model | Quotation → Order → Challan (+ Return, Module 73) → Invoice → Payment | `database-schema.md` §27 |
| 24 | Procurement Model | PR → PO → GRN → Purchase Invoice → Payment | `database-schema.md` §28 |
| 25 | Service / Technician Model | The platform's signature flow — Assignment → Custody → Advance → Conveyance → Closure → auto P&L | `database-schema.md` §29, `architecture.md` §42 |
| 26 | Project / Installation Model | A `ServiceAssignment` **is** the project — no separate Project entity | `architecture.md` §39 |
| 27 | Finance & Accounting Model | Single ledger every other context posts into, never the reverse | `database-schema.md` §25, `architecture.md` §41 |
| 28 | HR & Payroll Model | Attendance/Leave/Salary/Payroll, plus a reporting-only Performance layer (Module 75, zero new tables) | `database-schema.md` §30 |
| 29 | Loan & Investment Model | Company Loan, Investment, Employee Advance — all interest-treatment specifics per `prd.md` §14's decisions | `database-schema.md` §31 |
| 30 | Reporting Model | Views/materialized views over transactional tables, never a second data store | `database.md` §16 |
| 31 | Approval & Governance Model | One reusable engine (`ApprovalRequest`), no self-approval ever (DB-enforced) | `database-schema.md` §33 |

---

## Architecture Rules (Sections 32–49) → Technology & Infrastructure (50–61) → Database Discipline (62–80) → API Discipline (81–102) → Authentication & Security (103–119) → Financial Safety Rules (120–141)

**All fully specified in `architecture.md`, `database-schema.md`, `api-spec.md`, and `prompt.md` — not re-derived a third time in this file.** The table below is the map; when a task touches one of these areas, the agent opens the cited section directly rather than searching.

| AGENT.md § | Topic | Authoritative section |
|---|---|---|
| 32–36 | System/Modular Monolith/DDD/Clean/Hexagonal Architecture | `architecture.md` §2, §39–42; `prompt.md` §13–17 |
| 37–39 | Bounded Context / Domain / Module Boundary | `architecture.md` §39, §41; `prompt.md` §18–20 |
| 40 | Layer Dependency | `architecture.md` §40; `prompt.md` §17 |
| 41 | Repository Structure | `prompt.md` §128–129 |
| 42–43 | Cross-Module Dependency / Communication | `architecture.md` §41; `prompt.md` §20–21 |
| 44 | Shared Kernel / Building Blocks | `architecture.md` §39 (Platform/Cross-Cutting context) |
| 45 | Service Contract | `api-spec.md` §3, §43 |
| 46–48 | Domain Event / Outbox / Event Handler | `architecture.md` §44; `prompt.md` §22–23, §143 |
| 49 | Sync vs Async Processing | `architecture.md` §46 (background jobs) vs. §44 (in-process events) |
| 50–61 | Tech Stack, every named technology's rules | `architecture.md` §3, §38, §46–51; `prompt.md` §144–152, §169–183 |
| 62–80 | Every database discipline heading (schema-as-truth, entity/relationship/PK/FK/constraint/index/enum/decimal/date/tenant/branch/audit/soft-delete/immutable/migration/seed/integrity/concurrency rules) | `database-schema.md` §1–§24, §50–56; `prompt.md` §25–30, §142–152, §174–178 |
| 81–102 | Every API discipline heading (versioning/naming/method/request/response/DTO/validation/auth/authz/permission/scope/pagination/filter/sort/search/idempotency/transaction/error/security/audit) | `api-spec.md` §1–§42; `prompt.md` §41–56 |
| 103–119 | Every security/identity heading (auth/password/JWT/refresh/session/RBAC/guard/RLS/CSRF/XSS/SQLi/rate-limit/sensitive-data/upload/admin/audit) | `architecture.md` §22, §55; `api-spec.md` §5–6, §42; `database-schema.md` §18, §55; `admin-permission-migration-matrix.md` (Section 118, Admin Security specifically); `prompt.md` §153–168 |
| 120–141 | Every financial-safety heading (single-source-of-truth/double-entry/debit-credit/posting/state/immutability/reversal/invoice/purchase/inventory/service-cost/advance/loan/investment/expense/bank-proof/suspense/P&L/audit/edit-delete-governance accounting rules) | `database-schema.md` §7, §11, §25, §31, §58.1–58.2 (`architecture.md`); `prompt.md` §34–36 |

---

## Business Workflow Discipline (Sections 142–153)

Mostly pointers, with one genuinely new synthesis (Section 143's explicit state machine, which existed as scattered per-entity enums but not as one named universal pattern until now):

**142. Record Lifecycle Rules** — `database-schema.md` §17, §33.

**143. Draft → Submit → Approval Workflow — the universal shape, named explicitly for the first time:** `DRAFT` (freely editable, autosaved via `DraftState`, `prompt.md` §115) → `SUBMITTED` (locked, per `prd.md` §8.25 — no direct edit past this point) → `PENDING_APPROVAL` (if the entity type requires one, `api-spec.md` §18) → `APPROVED`/`REJECTED` → `POSTED` (for anything financial — a separate step from "approved," since approval is a governance gate and posting is the ledger-writing act, `database-schema.md` §11) → terminal states (`CLOSED`, `CANCELLED`, `REVERSED`) reached only from `POSTED`/`APPROVED`, never from `DRAFT` directly. Every entity's specific enum (`QuotationStatus`, `AssignmentStatus`, `JournalStatus`, `TicketStatus`, etc. — `database-schema.md` §8, `prompt.md` §38) is this shape specialized to that entity, not a competing pattern.

**144–148. Approval / Rejection / Posting / Cancellation / Reversal Rules** — `api-spec.md` §18, §38; `database-schema.md` §11.

**149–150. Edit Request / Delete Request Rules** — `prd.md` §8.25, `api-spec.md` §18.

**151. Document State Transition Rules** — `api-spec.md` §38's table, extended by Section 143 above.

**152. Cross-Module Workflow Rules** — `prd.md` §9's Key Workflows (including §9.13–9.14).

**153. Exception Handling Rules** — `architecture.md` §53; `api-spec.md` §40.

## Module Awareness (Sections 154–174)

**One table, not 21 prose sections** — same reasoning as `prompt.md` §57–127: every module's actual rules live in the source documents; an agent working on a module opens that module's row in `prompt.md`'s existing 71-row table (§57–127) directly. This section maps AGENT.md's requested 21 "Agent Rules" headings onto that same table rather than duplicating it a third time.

| § | Agent Rules for | `prompt.md` §57–127 rows |
|---|---|---|
| 154 | Identity & RBAC | 57–59 |
| 155 | Master Data | 60–65, 71 |
| 156 | Procurement | 66–69, 63 |
| 157 | Inventory | 70, 72–74 |
| 158 | Sales | 75, 77–79, 82 |
| 159 | Quotation | 76 |
| 160 | Payment & Advance | 80–81 |
| 161 | Service & Technician | 83, 85–87, 89–90 |
| 162 | Warranty | 88 |
| 163 | Project / Installation | 89 |
| 164 | HR & Payroll | 91–94 |
| 165 | Loan & Investment | 95–97 |
| 166 | Finance & Accounting | 98–104, 107–108 |
| 167 | Approval & Governance | 111–112 |
| 168 | Reporting | 106, 109–110, 113, 118–119 |
| 169 | Notification | 114 |
| 170 | Draft & Workspace | 115 |
| 171 | Document / Export / Print | 116–117 |
| 172 | Portal | 125–127 |
| 173 | Audit | 123 |
| 174 | System Administration | 122, 124 |

## Coding Standards (Sections 175–191)

Fully specified — `prompt.md` §128–152 (implementation standards) and §265–270 (naming, comments, error messages, logging, commits). Not restated. One addition genuinely new to this heading set:

**189. DRY / KISS / SOLID Rules** — applied through this project's existing lens, not as abstract principles: DRY *is* the non-duplication discipline every one of this project's nine documents has followed at every revision (check before adding, `prompt.md` §258); KISS favors `prompt.md` §17's four-layer shape over any cleverer pattern; SOLID's Single Responsibility is `prompt.md` §134's one-use-case-per-action rule, concretely.

---

## AI Agent Behavior (Sections 192–210)

Nineteen of these directly correspond to `prompt.md` §253–270 (Section 192 = Read-Before-Modify = `prompt.md` §255; 193–194 = Existing-Code Inspection = §258; 195–196 = No-Unapproved-Assumption/No-Invented-Requirements = §256; 197–199 = No-Silent-Change to Architecture/DB/API = §257, §262; 200–201 = Never Break Existing / Backward Compatibility = §263; 202–203 = Existing Code Reuse / Minimal Change = §258–259; 204–208 = Dependency/Migration/Financial/Security Safety = §259–261). **Not restated — `prompt.md` §253–270 is the authoritative version.**

Two headings here are genuinely more specific than anything `prompt.md` stated, because they're about *this project's* handoff reality specifically, not general AI-agent hygiene:

**209. User Confirmation Rules for High-Risk Changes** — a destructive or hard-to-reverse action (dropping a column with production-shaped data, changing a financial calculation already relied on by posted records, narrowing a role's access in a way that could lock someone out) is never taken by an agent working unattended between user check-ins — it's queued as an explicit question in the handoff record (Section 342, "Important Decisions Made" / Section 343, "Assumptions Made") for the user to confirm, exactly as this project's own history already modeled (the Admin correction, the cuid-vs-uuid resolution — both surfaced as explicit questions before being applied, never applied silently).

**210. Assumption Documentation Rules** — every assumption an agent makes to keep moving (not every open question needs to block progress) is written into the handoff record's Section 343 the moment it's made, not reconstructed from memory at session end — an assumption made and forgotten by the same agent is functionally identical to an assumption never surfaced at all.

## Feature Development Protocol (Sections 211–224)

Fully specified — `prompt.md` §226–237. Not restated; every heading here (Feature Request Intake, Requirement Interpretation, Traceability, Dependency/Impact Analysis across DB/API/Domain/Security/Accounting/Event/Testing, Implementation Order, Completion Criteria) maps one-to-one onto `prompt.md`'s existing feature template.

## Change Management (Sections 225–235)

**Genuinely new as its own named discipline** — prior documents had the *outcome* (every revision note in this project's history) but not a stated *process* for deciding when a change is big enough to need one.

**225. Change Request Rules** — any change to an already-decided rule (not a new addition — an actual change) gets a named entry in the relevant document's revision-note history (the pattern every `prd.md`/`architecture.md` version has followed) before it's implemented, not after.

**226–231. Schema / API / Business Rule / Permission / Workflow / Financial Rule Change Rules** — each follows Section 225 above, with the additional gate already stated in its own domain: schema changes follow `database-schema.md` §50's migration discipline; API changes follow `api-spec.md` §2's versioning rule; financial rule changes follow Section 120–141's safety rules above (never silent, ever).

**232. Documentation Change Rules** — `prompt.md` §224/§286: a change big enough to need Section 225's process is big enough to require the source document itself being updated in the same PR, not "documented later."

**233. Versioning Rules** — this project's own document versioning pattern (v2.5, v3.4, etc.) extended to code: a schema/API version bump (Sections 42, `prompt.md`) is the code-level mirror of a document version bump — both happen together, never one without the other.

**234. Changelog Rules** — the accumulated revision notes across all nine documents *are* this project's changelog — no separate changelog file duplicates them; Section 337 (Documentation Changes, in the handoff record) points back to whichever document's revision note covers a given session's work.

**235. Regression Protection Rules** — `prompt.md` §248, restated as a change-management gate specifically: no change ships without the existing regression suite passing against it first.

## Testing Discipline (Sections 236–250)

Fully specified — `prompt.md` §238–252, one-to-one (236↔238, 237↔239, ... 250↔ the security-specific slice of §242/§244 combined). Not restated.

## Validation & Quality Gate (Sections 251–261)

Fully specified — `prompt.md` §225a (the phase-end 3-part gate) and §271–280 (Build Verification). **Section 261, "Final Quality Gate," is `prompt.md` §225a itself** — the same gate, not a second one; an agent does not run two different validation processes depending on which document it read most recently.

## Documentation Discipline (Sections 262–270)

**262. Documentation Source Rules** — Section 8 above (the nine authoritative documents); no tenth document is ever created to explain something one of the nine should have covered — it gets added to the right one of the nine instead (`prompt.md` §258's non-duplication check, applied to documentation itself).

**263–268. Code / API / Database / Architecture / Migration / Business Rule Documentation** — `prompt.md` §267 (code comments cite source sections) plus each artifact's own existing self-documentation (`api-spec.md` §49's OpenAPI generation, `database-schema.md`'s inline Prisma comments already modeled throughout its schema blocks).

**269. Change Documentation** — Section 225 above.

**270. Known Issue Documentation** — lives in the handoff record's Section 339–341 (errors/warnings/blockers) during active work, and is folded into the relevant source document's own "still open" list (`prd.md` §14, `dfd.md` §16, etc.) once a phase completes — never left only in a handoff file that a future reader might not think to check.

## Production Readiness (Sections 271–280)

Fully specified — `prompt.md` §271–280 (Build Verification) covers this ground already under different heading names (Environment/Database/Security/API/Queue/Backup/Monitoring/Logging/Recovery/Deployment Readiness ↔ `prompt.md`'s Pre-Build/Post-Phase/Schema/API/Architecture/Security/Financial/Completeness Validation). Not restated.

## Final Agent Rules (Sections 281–290)

**281. Definition of Correct Implementation** — passes `prompt.md` §225a in full.

**282. Definition of Complete Feature** — `prompt.md` §237's acceptance criteria met.

**283. Definition of Safe Change** — Section 209 above satisfied (no unconfirmed high-risk action taken).

**284. Definition of Production-Ready Code** — `prompt.md` §290–291.

**285–287. Mandatory Pre-Commit / Pre-Merge / Pre-Deployment Checklists** — Section 361's Exit Protocol (pre-commit, every session) escalating to `prompt.md` §225a (pre-merge, every phase) escalating to `prompt.md` §291 (pre-deployment, production readiness) — three checkpoints of increasing scope, not three unrelated checklists.

**288. Agent Stop Conditions** — a source-document conflict (Section 10), a high-risk change needing confirmation (Section 209), or a phase prerequisite (`prompt.md` §206) not actually met — any of these stops forward progress until resolved, rather than working around it.

**289. Escalation Conditions** — the same three conditions as Section 288, escalated to the user via the handoff record's Section 341 (Blockers) rather than the agent guessing past them.

**290. Final Non-Negotiable Rules** — Section 7 above (the three core system principles) plus Sections 120–141 (financial safety) — the handful of rules this entire document set treats as never subject to a "just this once" exception, listed together here as the single shortest thing an agent should re-read if it's ever tempted to cut a corner under time pressure.

---

# Agent Handoff & Continuity — This Document's Core Purpose

Everything above this line already existed across the other eight documents in some form. **Everything below is new** — designed specifically so that when one agent's context/session ends and another begins, the second agent has everything the first one had, loses no decision, repeats no work, and cannot silently diverge from what's already built.

## Agent Handoff & Continuity — Overview (Sections 291–320)

### 291. Multi-Agent Development Strategy

Three files, three different lifespans, never merged into one:

| File | Lifespan | Updated by |
|---|---|---|
| **`AGENT.md`** (this file) | Changes only when a genuine rule/architecture decision changes — rare | Whoever makes that decision, with a revision note (Section 225) |
| **`HANDOFF.md`** | Overwritten at the end of every single agent session — always reflects only the *most recent* session | The exiting agent (Section 361) |
| **`PROGRESS.md`** | Accumulates across the whole project's life — never overwritten, only appended/updated per phase | Every agent, incrementally, as phases/modules/features complete |

An agent starting a session reads all three, in that order (Section 348).

### 292. Agent Handoff Architecture

`AGENT.md` answers "what are the rules." `HANDOFF.md` answers "what did the last agent do, and what do I do first." `PROGRESS.md` answers "where does the whole project stand." No single file tries to answer all three — that's what caused the 300-heading `prompt.md` and this 390-heading document to need separating in the first place (static process rules vs. dynamic per-session state vs. cumulative project state are three genuinely different kinds of information with three different update frequencies).

### 293. Persistent Development State

"State" means: anything a new agent would otherwise have to reconstruct by re-reading the entire codebase and git history to figure out. Sections 294–315 name every category of this project's state that qualifies — each one is a required field in `HANDOFF.md`'s template (Section 321) and/or `PROGRESS.md`'s matrices (Section 381).

### 294–315. State Categories (each a required `HANDOFF.md`/`PROGRESS.md` field — see Sections 321, 381)

Current Project State · Completed Work · In-Progress Work · Pending Work · Blocked Work · Failed Attempts (**including *why* an approach was abandoned** — so the next agent doesn't retry the same dead end) · Known Issues & Technical Debt · Active Phase · Active Module · Active Feature · Current Task · Last Completed Step · Next Required Step · Current Database Migration State · Current API Implementation State · Current Domain Implementation State · Current Test Implementation State · Current Documentation State · Uncommitted/Incomplete Changes · Temporary Workarounds (**with an explicit removal condition**, never left permanent by default) · Environment/Configuration State · Dependency Changes.

### 316. Agent-to-Agent Context Handoff Rules

A handoff is **written**, never verbal/implicit — an agent does not rely on the user to relay context between sessions from memory. `HANDOFF.md` is the entire context transfer mechanism; if it's incomplete, the next agent's first move (Section 348) is to reconstruct the gap from git/tests before writing new code, not to guess.

### 317. Mandatory Handoff Report

Section 321's template, filled in completely — "mandatory" means every field present, even if the honest answer is "none" (an empty Blockers field is a real, useful signal; a *missing* Blockers field means the next agent can't tell whether there were none or whether the last agent just didn't check).

### 318. Agent Session Summary

The human-readable top of `HANDOFF.md` (Section 321's first few fields) — what a user skimming would want to know in 30 seconds, before the fuller machine-checkable detail below it.

### 319. Before-Exit Checklist

Section 361–369 in full.

### 320. Next-Agent Startup Checklist

Section 348–360 in full.

## Mandatory Agent Handoff Record — The `HANDOFF.md` Template (Sections 321–347)

**Section 321, "Handoff File Standard," is this entire template.** Copy it into `HANDOFF.md` at the end of every session, filled in completely — an agent overwrites the previous session's file with its own, since only the *most recent* handoff is ever needed (older ones are recoverable from git history on the file itself, never from a growing single document).

```markdown
# HANDOFF.md — Session record

**Session ended:** <timestamp>
**Agent:** <model/session identifier if available>

## 322–325. Where This Session Was Working
- Current Phase: <one of prompt.md §184–204's 21 phases>
- Current Module: <one of prompt.md §57–127's 75 modules (table extended for 73-75)>
- Current Feature: <the specific feature within that module, prompt.md §226>
- Task Objective: <one sentence — what this session was trying to accomplish>

## 326. Work Completed
<bulleted list — specific and verifiable, not "worked on X">

## 327–329. File Inventory
- Files Created: <list>
- Files Modified: <list>
- Files Deleted: <list — and why, per Section 371's rule>

## 330–337. What Changed, By Layer
- Database Changes: <tables/columns/indexes touched>
- Migration Status: <applied / pending / rolled back — never ambiguous>
- API Changes: <endpoints added/modified>
- Domain Changes: <entities/value objects/domain services>
- Event / Queue Changes: <new events, new job types>
- Security / Permission Changes: <any RolePermission or RLS policy touched — flagged prominently, never buried in a general file list>
- Test Changes: <what's covered now that wasn't>
- Documentation Changes: <which of the 9 source documents got a revision note this session, if any>

## 338. Remaining Tasks
<what's left in the current feature/module — specific enough that the next agent doesn't have to guess scope>

## 339–341. Problems
- Known Errors: <actual failing tests/builds, if any were left failing and why>
- Known Warnings: <non-blocking but real>
- Blockers: <Section 288's stop conditions, if any are still open — this field being non-empty means the next agent's first job is resolving it, not starting new work>

## 342–344. Decisions and Uncertainty
- Important Decisions Made: <anything Section 209 flagged, and how it was resolved, if it was>
- Assumptions Made: <Section 210 — every one, even ones that felt minor at the time>
- Things Not Yet Verified: <written but not tested, tested but not against real data, etc. — honest uncertainty, not implied confidence>

## 345–347. Exactly What to Do Next
- Exact Next Step: <one concrete action, not "continue Module X">
- Recommended Next Command: <the actual command to run first — a test, a migration, a specific file to view>
- Recommended Next File to Inspect: <the one file most likely to disagree with the next agent's assumptions if not checked first>
```

---

## Agent Startup / Resume Protocol (Sections 348–360)

**Run in this exact order, every session, with no step skipped even if the agent "remembers" a previous session (a fresh context window has no actual memory — treat every session as the first one for verification purposes, even the tenth):**

1. **(348) Mandatory Repository Inspection Before Work** — before reading any document, run a quick repo scan (file tree, `git log --oneline -20`) to get a raw, unfiltered sense of what exists, independent of what any document *claims* exists.
2. **(349) Read `AGENT.md` First** — this file, in full.
3. **(350) Read Current Handoff State** — `HANDOFF.md`, in full. If it doesn't exist, this is genuinely the first session — proceed to Section 351 and treat `PROGRESS.md` as starting from zero.
4. **(351) Read Source-of-Truth Documents** — at minimum, the specific sections `HANDOFF.md`'s Section 322–325 fields point to (current phase/module/feature) — not necessarily all nine documents cover to cover again, but never zero of them.
5. **(352) Inspect Git Status** — uncommitted changes, unpushed commits — reconcile against `HANDOFF.md`'s Section 327–329 file inventory; a mismatch here is resolved before anything else (Section 373).
6. **(353) Inspect Recent Changes** — `git diff` against the last few commits, cross-checked against Section 326's "Work Completed" claims.
7. **(354) Inspect Current Migration State** — `prisma migrate status` against the actual database, cross-checked against `HANDOFF.md` Section 331.
8. **(355) Inspect Current API State** — does the API actually start; do the contract tests (Section 240) actually pass right now, before any new code is written.
9. **(356) Inspect Current Test State** — full test suite run, current pass/fail baseline established *before* touching anything, so a test that fails after this session's changes is unambiguously this session's responsibility.
10. **(357) Identify Last Completed Work** — reconciling Sections 352–356 above against `HANDOFF.md`.
11. **(358) Identify First Pending Work** — `HANDOFF.md` Sections 338/345 plus `PROGRESS.md`'s incomplete-features list (Section 384).
12. **(359) Confirm Existing Implementation Before Rebuilding** — Section 371's rule, applied at session start specifically: if Section 357's finding disagrees with what the new work was about to build, stop and reconcile before writing a duplicate.
13. **(360) Resume From Last Verified State** — start work only once Steps 1–12 all agree with each other; a disagreement anywhere in this list is itself a Section 288 stop condition, not a detail to note and continue past.

## Agent Exit Protocol (Sections 361–369)

**Run before ending a session for any reason — context limit, task completion, or a deliberate stopping point. Never skip this because "it's just a quick session" — a short session with no exit record is exactly as costly to the next agent as a long one.**

1. **(361) Mandatory State Update Before Exit** — `HANDOFF.md` rewritten in full (Section 321's template), not incrementally patched from the previous session's file — a fresh, complete, accurate snapshot of *this* session's end state.
2. **(362) Mandatory Handoff Documentation** — Section 361 satisfied means this step is done; called out separately only because it's the single most important exit step and deserves its own checklist line.
3. **(363) Mandatory Changed-File Inventory** — `HANDOFF.md` Sections 327–329, verified against `git status` one more time immediately before writing them (not from memory of what was touched earlier in the session).
4. **(364) Mandatory Test Result Recording** — the actual pass/fail state, run one final time at exit, not carried over from earlier in the session (code written since the last test run is untested by definition).
5. **(365) Mandatory Error Recording** — `HANDOFF.md` Section 339, populated from the Section 364 run, not from memory.
6. **(366) Mandatory Migration Recording** — `HANDOFF.md` Section 331, confirmed against `prisma migrate status` one final time.
7. **(367) Mandatory Next-Step Recording** — `HANDOFF.md` Section 345–347, specific enough that Section 358 (the next agent's "identify first pending work" step) requires zero guessing.
8. **(368) Mandatory Git / Commit State Recording** — every change committed, or explicitly noted as deliberately uncommitted with a reason (`HANDOFF.md` Section 312) — never left in an ambiguous half-committed state with no explanation.
9. **(369) Never Leave Work Without Context** — the summary rule behind Steps 1–8: if a step above feels like it can be skipped "just this once" because the session ran out of time, that is precisely the session where skipping it costs the next agent the most — this step exists to name that temptation directly, not because Steps 1-8 needed a ninth checklist item.

## Cross-Agent Safety Rules (Sections 370–380)

**370. Never Repeat Completed Work** — Section 357/359's reconciliation is what prevents this; a feature marked complete in `PROGRESS.md` is re-verified (Section 355–356), never blindly re-implemented because a new agent didn't trust or didn't check the record.

**371. Never Overwrite Another Agent's Work Without Inspection** — Section 255 (`prompt.md`, Read-Before-Modify) applied specifically across an agent boundary: a file another session touched gets read in full before any edit, even if `HANDOFF.md` describes what was done to it — the description is a summary, not a substitute for reading the actual current content.

**372. Never Assume Previous Agent's Work Is Correct** — Section 356's fresh test run exists precisely because a previous session's "Work Completed" claim (Section 326) is a report, not a guarantee — verify, then trust, never the other way around.

**373. Verify Before Continuing** — the whole of Section 348–360, restated as the one-line rule it implements.

**374. Preserve Existing Decisions** — `prompt.md` §257 (No-Silent-Change), applied across agents specifically: a decision recorded in `HANDOFF.md` Section 342 or any source document's revision note is binding on the next agent exactly as if that agent had made it — not up for silent reconsideration.

**375. Record Any Decision Change** — if a later agent genuinely needs to reverse an earlier decision (new information, a user correction), that reversal follows Section 225's change-management process — logged with its own reasoning, never a silent overwrite of Section 374's record.

**376–380. Preserve Database / API / Financial / Security / Backward-Compatibility Integrity Across Agents** — Sections 62–141 and Section 200–201, restated as a cross-agent guarantee specifically: none of these rules gets weaker because a *different* agent is now doing the work — the rules belong to the project, not to whichever agent originally wrote them.

## Project Progress Control — The `PROGRESS.md` Template (Sections 381–390)

Unlike `HANDOFF.md` (overwritten every session), `PROGRESS.md` **accumulates** — each phase/module/feature's row is added or updated as it completes, never wholesale rewritten. Initialize it at the start of Phase 0 with every row already listed as `NOT_STARTED`, and update rows to `IN_PROGRESS`/`DONE`/`BLOCKED` as `HANDOFF.md`'s session records confirm actual, verified progress (Section 372 — a row moves to `DONE` only after Section 356/364's test verification, never on the strength of a session's own unverified claim).

```markdown
# PROGRESS.md — Master Project Progress

## 381. Master Project Progress Matrix
| Phase (prompt.md §184–204) | Status | Modules Done / Total | Last Updated |
|---|---|---|---|
| 0 — Project Scaffold | NOT_STARTED | 0/1 | — |
| 1 — Database Foundation | NOT_STARTED | 0/1 | — |
| ... (all 21 phases, seeded at project start) |

## 382. Phase Completion Matrix
(one row per phase, expanding prompt.md §225a's 3-part gate result: Security ✓/✗, Build ✓/✗, Requirements-Gap ✓/✗ — a phase is DONE only when all three are ✓)

## 383. Module Completion Matrix
(one row per prompt.md §57–127's 75 modules — Status, Phase, % of features done)

## 384. Feature Completion Matrix
(one row per feature within a module — the finest-grained tracking level; this is what Section 358's "first pending work" query actually reads)

## 385. Database Completion Matrix
(one row per database-schema.md §5's ~86 tables — Migrated ✓/✗, RLS Policy ✓/✗, Seeded ✓/✗)

## 386. API Completion Matrix
(one row per api-spec.md §11–36's endpoints — Implemented ✓/✗, Contract-Tested ✓/✗)

## 387. Test Completion Matrix
(coverage by category, prompt.md §238–252 — not a % coverage number alone, since prompt.md §242's point was that role-coverage breadth matters more than a raw percentage)

## 388. Documentation Completion Matrix
(one row per the 9 source documents — Current Version, Last Revision Note Date — flags a document that hasn't been touched in a suspiciously long time relative to how much code has shipped, per Section 232's rule)

## 389. Requirement Coverage Status
(prompt.md §250/§276 — one row per prd.md §8 functional area, Tested ✓/✗)

## 390. Overall Project Completion Status
(one summary line, computed from 381–389, never hand-asserted independently of them — "62% complete" means something specific and re-derivable, not a feeling)
```

---

*This document plus `prompt.md` are now the complete governing pair for this project's build. `AGENT.md` is read once per session (Section 349) and changes rarely; `HANDOFF.md` is written every session (Section 361) and read every session (Section 350); `PROGRESS.md` accumulates across the whole project and is the one artifact that answers "where does this stand overall" without needing to reconstruct it from git history or from asking the user. Together, these three files are what make Section 288's promise — that switching agents never breaks the flow or cracks the project — actually operational rather than aspirational.*
