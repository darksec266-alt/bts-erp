// Phase 2 — Identity & RBAC seed data (prompt.md §186).
//
// Seeds: the permission catalog, all 15 roles (prd.md §6's 10-role table,
// with Admin expanded into 6 Admin-family profiles per
// admin-permission-migration-matrix.md — 10 - 1 + 6 = 15), and their
// RolePermission bundles from prd.md §6.1's matrix / the migration
// matrix's §4 table.
//
// Idempotent throughout (database-schema.md §51's rule): every upsert is
// keyed by a unique business key, so re-running this script never
// duplicates or overwrites a manually-adjusted bundle.
//
// SCOPE NOTE: prd.md §6.1's matrix is expressed at the functional-area
// level (13 areas × F/O/R/A/—), not as a full enumeration of every one of
// the ~300+ entity-level permission codes the 75 modules would eventually
// need (api-spec.md §6's dot-namespaced codes, one create/view/edit/delete
// per entity). Enumerating all of those now, before the modules that need
// them exist, would be inventing detail the source document doesn't
// specify yet. This seed builds one representative permission code per
// functional area per action (e.g. "sales.manage" for F, "sales.view" for
// R) — enough for Phase 2's RBAC middleware to be genuinely exercised
// end-to-end — and each later phase adds that module's real, specific
// codes to the catalog and to every role's bundle that matrix cell implies,
// without restructuring anything here.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// prd.md §6.1's 13 functional areas, dot-namespaced.
const FUNCTIONAL_AREAS = [
  "identity", "masterData", "procurement", "sales", "inventory",
  "fieldService", "finance", "customerSupport", "hrWorkforce",
  "reporting", "notificationApproval", "portals", "systemAdmin",
] as const;
type FunctionalArea = (typeof FUNCTIONAL_AREAS)[number];

// One permission code per area per representative action — see SCOPE NOTE.
const AREA_PERMISSIONS: Record<FunctionalArea, string[]> = Object.fromEntries(
  FUNCTIONAL_AREAS.map((area) => [area, [`${area}.manage`, `${area}.view`, `${area}.approve`]])
) as Record<FunctionalArea, string[]>;

// prd.md §6.1's matrix, F/O/R/A/— per role. "OWN" (O) is enforced at the
// Application/RLS layer (branchId scoping, Phase 1's 001_rls_policies.sql)
// on top of the same "manage"/"view" codes as "F" — a role scoped to O gets
// the same permission codes as F, filtered by branchId, not a different
// code (architecture.md §40).
type Grant = "F" | "O" | "R" | "A" | "-";
const ROLE_MATRIX: Record<string, Partial<Record<FunctionalArea, Grant>>> = {
  SUPER_ADMIN: Object.fromEntries(FUNCTIONAL_AREAS.map((a) => [a, "F"])) as Record<FunctionalArea, Grant>, // "*" wildcard, seeded separately below
  ADMIN: { identity: "O", masterData: "F", procurement: "F", sales: "F", inventory: "F", fieldService: "F", finance: "R", customerSupport: "F", hrWorkforce: "F", reporting: "F", notificationApproval: "A", portals: "F", systemAdmin: "R" },
  OPERATIONS_ADMIN: { masterData: "F", procurement: "F", sales: "F", inventory: "F", fieldService: "F", finance: "R", customerSupport: "F", reporting: "F", notificationApproval: "A", portals: "R" },
  BRANCH_ADMIN: { identity: "O", masterData: "O", procurement: "O", sales: "O", inventory: "O", fieldService: "O", finance: "O", customerSupport: "O", hrWorkforce: "O", reporting: "O", notificationApproval: "A", portals: "O" },
  SERVICE_ADMIN: { sales: "R", inventory: "R", fieldService: "F", customerSupport: "F", reporting: "F", notificationApproval: "A", portals: "R" },
  INVENTORY_ADMIN: { masterData: "F", procurement: "F", sales: "R", inventory: "F", reporting: "F", notificationApproval: "A" },
  PROJECT_ADMIN: { fieldService: "F", finance: "R", reporting: "R", notificationApproval: "A" },
  ACCOUNTS_FINANCE: { masterData: "R", procurement: "A", sales: "R", inventory: "R", fieldService: "A", finance: "F", hrWorkforce: "R", reporting: "F", notificationApproval: "A", portals: "-" },
  HR_PAYROLL: { finance: "R", hrWorkforce: "F", reporting: "R", notificationApproval: "A" },
  BRANCH_MANAGER: { masterData: "O", procurement: "O", sales: "O", inventory: "O", fieldService: "O", finance: "R", customerSupport: "O", hrWorkforce: "O", reporting: "O", notificationApproval: "A", portals: "-" },
  SALES_EXECUTIVE: { masterData: "R", sales: "O", inventory: "R", fieldService: "R", customerSupport: "O", reporting: "R" },
  WAREHOUSE_STAFF: { masterData: "O", procurement: "O", inventory: "O", reporting: "R" },
  TECHNICIAN: { fieldService: "O", customerSupport: "O", reporting: "R" },
  CUSTOMER: { sales: "R", fieldService: "R", finance: "R", customerSupport: "O", portals: "O" }, // "own" enforced by customerId scoping, not branchId — Phase 17's Portal API
  VENDOR: { procurement: "R", finance: "R", portals: "O" },
};

function permissionsForGrant(area: FunctionalArea, grant: Grant): string[] {
  const [manage, view, approve] = AREA_PERMISSIONS[area] as [string, string, string];
  switch (grant) {
    case "F":
    case "O":
      return [manage, view]; // O differs from F by RLS scoping, not by which codes are granted
    case "R":
      return [view];
    case "A":
      return [approve, view];
    case "-":
    default:
      return [];
  }
}

async function main() {
  // 1. Permission catalog — every code any role below references.
  const allCodes = new Set<string>(["*"]); // "*" = Super Admin's wildcard (domain/auth-types.ts's hasPermission)
  for (const codes of Object.values(AREA_PERMISSIONS)) for (const c of codes) allCodes.add(c);

  for (const code of allCodes) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  console.log(`[seed] Permission catalog: ${allCodes.size} codes`);

  // 2. Roles + their RolePermission bundles.
  for (const [roleName, areaGrants] of Object.entries(ROLE_MATRIX)) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });

    const codesForRole = new Set<string>();
    if (roleName === "SUPER_ADMIN") {
      codesForRole.add("*");
    } else {
      for (const [area, grant] of Object.entries(areaGrants) as [FunctionalArea, Grant][]) {
        for (const code of permissionsForGrant(area, grant)) codesForRole.add(code);
      }
    }

    for (const code of codesForRole) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
    console.log(`[seed] Role ${roleName}: ${codesForRole.size} permission codes`);
  }

  console.log(`[seed] Done — ${Object.keys(ROLE_MATRIX).length} roles seeded (admin-permission-migration-matrix.md §6: all six Admin-family profiles included from day one).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
