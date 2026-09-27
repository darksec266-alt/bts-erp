import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brother's Technology System",
  description: "Unified Business Management Platform",
};

// Sidebar shell (ui.md §7 — Application Shell & Navigation) lands once
// authentication (Phase 2) exists to gate it. Phase 0 renders bare children
// only — no chrome, no nav, deliberately.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
