import type { Router } from "express";
import { createSimpleMasterDataRepository, type SimpleMasterDataPrismaDelegate } from "../../master-data/infrastructure/simple-master-data-repository.factory";
import { SimpleMasterDataUseCases } from "../../master-data/application/simple-master-data.use-cases";
import { createSimpleMasterDataRouter } from "../../master-data/presentation/simple-master-data.router-factory";

// §61 Company/Branch/Department (prompt.md's own phase table places this
// module in Phase 1, alongside the schema — but Phase 1's own scope
// (prompt.md §185) is explicitly "schema + RLS + migrations, no business
// logic," so the actual CRUD API for it was always going to land whenever
// a real API was first needed. Built here, now, because Phase 2's own
// Employee/User endpoints already assume branches exist — Branch reuses
// the exact same generic shape as Warehouse/Unit (id/code/name/isActive)
// from modules/master-data, just gated on `identity.*` permissions instead
// of `masterData.*`, since Company/Branch/Department is Identity & Access
// territory in prd.md §6.1's matrix, not Master Data.
export function createBranchRouter(branchDelegate: SimpleMasterDataPrismaDelegate): Router {
  const repo = createSimpleMasterDataRepository(branchDelegate, { resourceLabel: "branch", hasIsActive: true, keyField: "code" });
  const useCases = new SimpleMasterDataUseCases(repo, "branch");
  return createSimpleMasterDataRouter(useCases, {
    path: "branches",
    requiresCode: true,
    managePermission: "identity.manage",
    viewPermission: "identity.view",
  });
}
