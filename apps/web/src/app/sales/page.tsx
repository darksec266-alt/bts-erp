"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../components/layout/AppShell";
import { SalesModule } from "../../components/sales/SalesModule";

function SalesContent({ selectedBranchId }: { selectedBranchId?: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as "quotations" | "orders" | "projects" | "challans" | "invoices" | null;

  return <SalesModule selectedBranchId={selectedBranchId} initialTab={tab || undefined} />;
}

export default function SalesPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  return (
    <AppShell
      selectedBranchId={selectedBranchId}
      onBranchChange={setSelectedBranchId}
    >
      <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading Sales...</div>}>
        <SalesContent selectedBranchId={selectedBranchId} />
      </Suspense>
    </AppShell>
  );
}
