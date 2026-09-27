import React, { Suspense } from "react";
import { ProcurementModule } from "../../components/procurement/ProcurementModule";
import { AppShell } from "../../components/layout/AppShell";

export const metadata = {
  title: "Procurement & Supply Chain | BTS ERP",
  description: "Enterprise Sourcing, Requisitions, Purchase Orders, and Goods Receipts",
};

export default function ProcurementPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-body font-medium">Loading Procurement Workspace...</p>
            </div>
          </div>
        }
      >
        <ProcurementModule />
      </Suspense>
    </AppShell>
  );
}
