"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "../../components/layout/AppShell";
import { ReportsModule, type ReportTab } from "../../components/reports/ReportsModule";

function ReportsContent({ selectedBranchId }: { selectedBranchId?: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as ReportTab | null;

  return (
    <ReportsModule
      selectedBranchId={selectedBranchId}
      initialTab={tab || "vat"}
    />
  );
}

export default function ReportsPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  return (
    <AppShell
      activePath="/reports"
      selectedBranchId={selectedBranchId}
      onBranchChange={setSelectedBranchId}
    >
      <Suspense fallback={<div className="p-8 text-center text-text-muted">Loading Reports...</div>}>
        <ReportsContent selectedBranchId={selectedBranchId} />
      </Suspense>
    </AppShell>
  );
}
