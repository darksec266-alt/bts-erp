import { Suspense } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { MasterDataWorkspace } from "../../components/master-data/MasterDataWorkspace";

export const metadata = {
  title: "Master Data Settings | BTS ERP",
  description: "Centralized configuration for categories, brands, units, warehouses, and tax rates.",
};

export default function MasterDataPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading settings...</div>}>
        <MasterDataWorkspace />
      </Suspense>
    </AppShell>
  );
}
