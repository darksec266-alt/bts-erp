"use client";

import React, { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { CustomerList } from "../../components/customers/CustomerList";

export default function CustomersPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  return (
    <AppShell
      activePath="/customers"
      selectedBranchId={selectedBranchId}
      onBranchChange={setSelectedBranchId}
    >
      <CustomerList selectedBranchId={selectedBranchId} />
    </AppShell>
  );
}
