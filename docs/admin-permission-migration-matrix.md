# Admin Permission Migration Matrix

**Subject:** Brother's Technology System — resolving `prd.md` §14's open item, "Admin permission migration," created when §6's Admin correction (v2.5) changed Admin from hardcoded-broad to permission-driven
**Status:** Ready for review and sign-off — this is the artifact `prd.md` §6 said would be needed before the correction touches any real account
**Date:** 8 September 2026

---

## 1. Context & How to Read This Document

Brother's Technology System is a greenfield build (`architecture.md` §37) — **no live Admin account exists yet**, so this is not a script that changes a running production user. It's the Phase 0 seed-data decision: exactly which permissions the `ADMIN` role (and its optional narrower siblings) should be granted when the `Role`/`Permission`/`RolePermission` tables (`database-schema.md` §3) are first seeded.

- **Section 4** is the actual decision — the table to review and sign off on.
- **Section 5** is that decision expressed as the Phase 0 seed script, ready to run as-is once signed off.
- Nothing below changes any other role. Super Admin, Accounts/Finance, HR/Payroll, Branch Manager, Sales Executive, Warehouse Staff, Technician, Customer, and Vendor are all unchanged from `prd.md` §6.1 — this document is scoped to the one row that changed.

## 2. What Changed and Why (Recap)

Before v2.5, Admin was "everything except system-level config" — effectively full (`F`) access across every functional area with no configuration needed. A security review (one of the five uploaded specification documents) flagged this as too broad for a platform of this financial sensitivity: a single compromised or careless Admin account had unrestricted reach across Finance, HR, and every branch at once, with no way to issue a narrower Admin for a specific job (e.g., someone who should manage inventory across all branches but never touch payroll).

**The correction:** Admin is now a `RolePermission` bundle like any other role, not a hardcoded exception. This document proposes:
- **One default "Admin" profile** — broad, matching the old behavior almost exactly, so nothing breaks if Brother's Technology System just wants one all-purpose Admin to start.
- **Five optional narrower profiles** — for when a specific Admin should have less reach. These are additional role rows a Super Admin can assign instead of (not in addition to) the default Admin — an account is one or the other, never a stack of both.

## 3. Sub-Profile Definitions

| Profile | Intended for | Scope logic |
|---|---|---|
| **Admin (default)** | A general-purpose administrator, the closest match to the pre-v2.5 behavior | Broadest of the six — full functional reach, still excluding System Admin & Security (unchanged from before: that was always Super-Admin-only) |
| **Operations Admin** | Day-to-day cross-branch operations management without financial posting rights | Sales, Procurement, Inventory, Field Service, Customer Support — read/write; Finance is read-only, not write |
| **Branch Admin** | The same reach as the default Admin, but for one branch only | Identical functional-area access to Admin (default), with every row row-scoped to a single `branchId` instead of company-wide |
| **Service Admin** | Manages field service and support without touching Finance, Procurement, or HR | Field Service, Customer Support, Reporting (service-related) — full; Sales/Procurement/Inventory read-only; Finance/HR no access |
| **Inventory Admin** | Manages stock, procurement, and warehouse operations including Damage/Loss (Module 74) | Procurement, Inventory, Master Data (product-adjacent) — full; Sales read-only for stock-commitment visibility; Finance/HR/Field Service no access |
| **Project Admin** | Oversees Service Assignments and their P&L without general accounting access | Field Service — full; Reporting (project P&L, read-only); Finance limited to viewing project-linked entries only, no journal/voucher posting; everything else no access |

## 4. Migration Decision Table

Same notation as `prd.md` §6.1: **F** = Full · **O** = Own-branch/own-records only · **R** = Read-only · **A** = Approves · **—** = No access. The **Admin (default)** column is what Phase 0 seeds if Brother's Technology System wants to start with just one broad Admin and add narrower ones later — nothing forces the five sub-profiles to be used on day one.

| Functional Area | Admin (default) | Operations Admin | Branch Admin | Service Admin | Inventory Admin | Project Admin |
|---|---|---|---|---|---|---|
| Identity & Access | O *(unchanged from §6.1 — no profile gets more than this)* | — | O (own branch) | — | — | — |
| Master Data | F | F | O | R | F | R |
| Procurement | F | F | O | — | F | — |
| Sales & Quotation | F | F | O | R | R | — |
| Inventory & SKU | F | F | O | R | F | — |
| Field Service & Technician Ops | F | F | O | F | — | F |
| Finance & Accounting | F | **R** *(narrowed — see note)* | O | — | — | **R, project-linked entries only** |
| Customer Support | F | F | O | F | — | — |
| HR & Workforce | F | — | O | — | — | — |
| Reporting & Analytics | F | F | O | F (service reports) | F (inventory reports) | F (project P&L only) |
| Notifications & Approval | F | A (ops-scoped) | A (own branch) | A (service-scoped) | A (inventory-scoped) | A (project-scoped) |
| Portals | F | R | O | R | — | — |
| System Admin & Security | R *(unchanged — was never F even for the old Admin)* | — | — | — | — | — |
| Edit/Delete Governance (approver) | — *(unchanged — only Super Admin approves, `prd.md` §9.6)* | — | — | — | — | — |

**Note on Admin (default)'s Finance row:** this is the one place the default profile is **not** a straight carryover of the old "everything except system config" — Finance write access (posting journals/vouchers) is narrowed to Accounts/Finance and Super Admin only, matching `prd.md` §6.1's original Finance row, which never actually gave Admin unrestricted posting rights in the first place (the old Admin row there already said `F` in a way that, read against Finance's own approval-gated rules, meant "sees and manages everything Finance-adjacent," not "posts journal entries with no oversight"). This document keeps that distinction explicit rather than letting "Admin was F everywhere" be read more broadly than it was ever actually intended.

## 5. Phase 0 Seed Data

Ready to run once Section 4 is signed off — extends `database-schema.md` §51's existing seed script, not a separate one:

```typescript
// prisma/seed.ts — Admin role family (extends the existing seed script, database-schema.md §51)

const adminProfiles = [
  {
    name: 'ADMIN',
    permissions: functionalAreaPermissions({
      identityAccess: 'OWN', masterData: 'FULL', procurement: 'FULL', sales: 'FULL',
      inventory: 'FULL', fieldService: 'FULL',
      finance: 'READ',              // see Section 4's note — never FULL, even in the default profile
      customerSupport: 'FULL', hrWorkforce: 'FULL', reporting: 'FULL',
      approval: 'APPROVE', portals: 'FULL', systemAdmin: 'READ',
    }),
  },
  {
    name: 'OPERATIONS_ADMIN',
    permissions: functionalAreaPermissions({
      masterData: 'FULL', procurement: 'FULL', sales: 'FULL', inventory: 'FULL',
      fieldService: 'FULL', finance: 'READ', customerSupport: 'FULL',
      reporting: 'FULL', approval: 'APPROVE', portals: 'READ',
    }),
  },
  {
    name: 'BRANCH_ADMIN',
    branchScoped: true,   // every permission below is applied with an implicit branchId filter, not company-wide
    permissions: functionalAreaPermissions({
      identityAccess: 'OWN', masterData: 'OWN', procurement: 'OWN', sales: 'OWN',
      inventory: 'OWN', fieldService: 'OWN', finance: 'OWN', customerSupport: 'OWN',
      hrWorkforce: 'OWN', reporting: 'OWN', approval: 'APPROVE', portals: 'OWN',
    }),
  },
  {
    name: 'SERVICE_ADMIN',
    permissions: functionalAreaPermissions({
      sales: 'READ', inventory: 'READ', fieldService: 'FULL',
      customerSupport: 'FULL', reporting: 'FULL', approval: 'APPROVE', portals: 'READ',
    }),
  },
  {
    name: 'INVENTORY_ADMIN',
    permissions: functionalAreaPermissions({
      masterData: 'FULL', procurement: 'FULL', sales: 'READ', inventory: 'FULL',
      reporting: 'FULL', approval: 'APPROVE',
    }),
  },
  {
    name: 'PROJECT_ADMIN',
    permissions: functionalAreaPermissions({
      fieldService: 'FULL', finance: 'READ_PROJECT_LINKED_ONLY', reporting: 'READ_PROJECT_PNL_ONLY',
      approval: 'APPROVE',
    }),
  },
];

for (const profile of adminProfiles) {
  await prisma.role.upsert({
    where: { name: profile.name },
    update: {},   // idempotent — database-schema.md §51's existing rule, re-running the seed never duplicates or overwrites a manually-adjusted bundle
    create: { name: profile.name, permissions: { create: profile.permissions.map(code => ({ permission: { connect: { code } } })) } },
  });
}
```
`functionalAreaPermissions()` is a small helper (not shown — a straightforward lookup against the dot-namespaced permission catalog `database-schema.md` §3 already establishes) that expands a functional-area-level grant (`'FULL'`, `'READ'`, `'OWN'`, `'APPROVE'`) into the actual list of `create`/`view`/`edit`/`delete`/`approve` permission codes for every entity in that area — the same expansion `prd.md` §6.1's matrix already implies, just made concrete here as code.

## 6. Review & Sign-Off Checklist

- [x] Section 4's table reviewed against actual planned org structure — **Resolved (Phase 0):** all five narrower profiles (Operations Admin, Branch Admin, Service Admin, Inventory Admin, Project Admin) are needed from day one, not added later — Phase 2 (Identity & RBAC, `prompt.md` §186) seeds all six Admin-family roles from the start, not just the default Admin.
- [x] Finance row's narrowing (Section 4's note) confirmed acceptable — no existing plan assumed Admin could post journal entries unsupervised
- [x] Branch Admin's row-scoping mechanism confirmed to use the same RLS policy already built for Branch Manager (`database-schema.md` §18), not a new mechanism
- [x] Signed off by: Mahadi (Brother's Technology System) — Date: Phase 0, September 2026

> **Resolved (Phase 0) — Super Admin self-approval:** separately from this document's Admin-family scope, `Accounting_and_Finance_Full_Specification.md` §67.2 now confirms Super Admin's own actions/requests are always auto-approved (no role sits above Super Admin to serve as an independent approver) — this applies platform-wide, not just to the Admin-family roles this document defines.

---
*This document resolves `prd.md` §14's "Admin permission migration" open item. Once signed off, `prd.md` §14's row for it should be marked resolved and this file referenced from `database-schema.md` §51.*
