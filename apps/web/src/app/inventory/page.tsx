import React, { Suspense } from "react";
import { InventoryModule } from "../../components/inventory/InventoryModule";
import { AppShell } from "../../components/layout/AppShell";

export const metadata = {
  title: "Inventory & Warehouse Operations | BTS ERP",
  description: "Stock ledger, inter-warehouse transfers, serial lifecycle, batch tracking, and loss adjustments",
};

export default function InventoryPage() {
  return (
    <AppShell activePath="/inventory">
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-body font-medium">Loading Inventory Workspace...</p>
            </div>
          </div>
        }
      >
        <InventoryModule />
      </Suspense>
    </AppShell>
  );
}
