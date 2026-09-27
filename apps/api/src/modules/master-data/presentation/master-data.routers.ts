import type { Router } from "express";
import { createSimpleMasterDataRepository, type SimpleMasterDataPrismaDelegate } from "../infrastructure/simple-master-data-repository.factory";
import { SimpleMasterDataUseCases } from "../application/simple-master-data.use-cases";
import { createSimpleMasterDataRouter } from "./simple-master-data.router-factory";

// The structural subset of the real Prisma client this whole family of six
// resources needs — one delegate property per model, each shaped like
// SimpleMasterDataPrismaDelegate. Same "no generated client" reasoning as
// every other Prisma-touching interface in this codebase.
export interface SimpleMasterDataPrismaClient {
  category: SimpleMasterDataPrismaDelegate;
  brand: SimpleMasterDataPrismaDelegate;
  unit: SimpleMasterDataPrismaDelegate;
  warehouse: SimpleMasterDataPrismaDelegate;
  department: SimpleMasterDataPrismaDelegate;
  taxRate: SimpleMasterDataPrismaDelegate;
}

// prompt.md §187 (Phase 3) + api-spec.md §13: six resources, one shared
// CRUD shape each. Returns one Router per resource rather than a single
// merged one, purely so app.ts's mount list stays legible about which
// path belongs to which resource — Express doesn't care either way.
export function createMasterDataRouters(prisma: SimpleMasterDataPrismaClient): Router[] {
  const resources: { delegate: SimpleMasterDataPrismaDelegate; path: string; label: string; keyField: "name" | "code" }[] = [
    { delegate: prisma.category, path: "categories", label: "category", keyField: "name" },
    { delegate: prisma.brand, path: "brands", label: "brand", keyField: "name" },
    { delegate: prisma.unit, path: "units", label: "unit", keyField: "code" },
    { delegate: prisma.warehouse, path: "warehouses", label: "warehouse", keyField: "code" },
    { delegate: prisma.department, path: "departments", label: "department", keyField: "name" },
    { delegate: prisma.taxRate, path: "tax-rates", label: "tax rate", keyField: "name" },
  ];

  return resources.map(({ delegate, path, label, keyField }) => {
    const repo = createSimpleMasterDataRepository(delegate, { resourceLabel: label, hasIsActive: true, keyField });
    const useCases = new SimpleMasterDataUseCases(repo, label);
    // masterData.manage / masterData.view: same functional-area codes
    // seed.ts already seeds (prd.md §6.1's matrix) — a role with only "R"
    // on masterData (e.g. Sales Executive) can still look these up, just
    // not edit them.
    return createSimpleMasterDataRouter(useCases, {
      path,
      requiresCode: keyField === "code",
      managePermission: "masterData.manage",
      viewPermission: "masterData.view",
    });
  });
}
