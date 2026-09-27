import React, { Suspense } from "react";
import { ServiceModule } from "../../components/service/ServiceModule";
import { AppShell } from "../../components/layout/AppShell";

export const metadata = {
  title: "Field Service & Technician Management | BTS ERP",
  description: "Customer service tickets, technician dispatch, custody tracking, GPS field logs, and job P&L",
};

export default function ServicePage() {
  return (
    <AppShell activePath="/service">
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-body font-medium">Loading Field Service Workspace...</p>
            </div>
          </div>
        }
      >
        <ServiceModule />
      </Suspense>
    </AppShell>
  );
}
