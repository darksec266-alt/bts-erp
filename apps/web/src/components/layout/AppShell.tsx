"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Users,
  Package,
  Layers,
  Warehouse,
  Truck,
  ShieldCheck,
  UserCheck,
  ScrollText,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Wrench,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  BarChart3,
} from "lucide-react";
import { api, type AuthUser } from "../../lib/api";

interface AppShellProps {
  children: React.ReactNode;
  activePath?: string;
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}

interface NavLeaf {
  label: string;
  path: string;
}

interface NavSection {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavLeaf[];
}

interface NavGroup {
  title: string;
  items: NavSection[];
}

// ─── Sidebar Nav ─────────────────────────────────────────────────────────────

const SidebarNav: React.FC<{
  groups: NavGroup[];
  collapsed: boolean;
  activePath?: string;
  onItemClick: () => void;
}> = ({ groups, collapsed, activePath, onItemClick }) => {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const expanded: Record<string, boolean> = {};
    groups.forEach((g) =>
      g.items.forEach((item) => {
        if (item.children) {
          const base = item.path.split("?")[0];
          const anyActive = item.children.some((child) =>
            pathname.startsWith(child.path.split("?")[0])
          );
          if (anyActive || pathname.startsWith(base)) {
            expanded[item.path] = true;
          }
        }
      })
    );
    setOpenSections((prev) => ({ ...prev, ...expanded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const searchParams = useSearchParams();

  const isLeafActive = (path: string): boolean => {
    const [base, query] = path.split("?");
    const childParams = new URLSearchParams(query || "");
    const childTab = childParams.get("tab");

    if (activePath) {
      if (activePath === path) return true;
      const [activeBase, activeQuery] = activePath.split("?");
      if (activeBase !== base) return false;
      const activeTab = new URLSearchParams(activeQuery || "").get("tab");
      return (activeTab || null) === (childTab || null);
    }

    if (pathname !== base) return false;

    // Both match pathname, now check tab query parameter
    const currentTab = searchParams ? searchParams.get("tab") : null;
    if (childTab) {
      return currentTab === childTab;
    }
    // Child has no tab query param: it is active only when no tab is present or tab is the default root tab
    if (!currentTab) return true;
    if (base === "/sales" && currentTab === "quotations") return true;
    if (base === "/procurement" && (currentTab === "requests" || currentTab === "purchase-requests")) return true;
    if (base === "/inventory" && currentTab === "balances") return true;
    if (base === "/service" && currentTab === "tickets") return true;
    if (base === "/master-data" && currentTab === "categories") return true;
    if (base === "/reports" && currentTab === "vat") return true;
    return false;
  };

  const isSectionActive = (item: NavSection): boolean => {
    if (!item.children || item.children.length === 0) {
      return isLeafActive(item.path);
    }
    return item.children.some((c) => isLeafActive(c.path));
  };

  const toggleSection = (key: string) => {
    if (collapsed) return;
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <nav className="space-y-5">
      {groups.map((group, gi) => (
        <div key={gi}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/50 select-none">
              {group.title}
            </p>
          )}
          {collapsed && gi > 0 && <div className="my-3 h-px bg-white/10" />}

          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isSectionActive(item);
              const hasChildren = !!(item.children && item.children.length > 0);
              const isOpen = openSections[item.path];

              if (collapsed) {
                return (
                  <div key={item.path} className="relative group/tip">
                    <Link
                      href={item.path}
                      onClick={onItemClick}
                      className={`flex items-center justify-center w-10 h-10 mx-auto rounded-md transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </Link>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 hidden group-hover/tip:block pointer-events-none">
                      <div className="bg-ink text-white text-[11px] font-medium px-2.5 py-1.5 rounded-md shadow-elevation-2 whitespace-nowrap">
                        {item.label}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.path}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleSection(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors ${
                        active
                          ? "bg-sidebar-bg-hover text-white font-medium"
                          : "text-sidebar-text hover:bg-sidebar-bg-hover/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform text-sidebar-text/50 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.path}
                      onClick={onItemClick}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${
                        active
                          ? "bg-primary text-white font-medium"
                          : "text-sidebar-text hover:bg-sidebar-bg-hover/60 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )}

                  {hasChildren && isOpen && (
                    <div className="ml-7 mt-0.5 mb-1 space-y-0.5 border-l border-white/10 pl-3">
                      {item.children!.map((child) => {
                        const childActive = isLeafActive(child.path);
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onClick={onItemClick}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                              childActive
                                ? "text-white font-semibold bg-primary/20"
                                : "text-sidebar-text/80 hover:text-white hover:bg-sidebar-bg-hover/50"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                childActive ? "bg-primary" : "bg-sidebar-text/40"
                              }`}
                            />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const Breadcrumb: React.FC = () => {
  const pathname = usePathname();
  const segments: { label: string }[] = [];

  if (pathname.startsWith("/sales")) segments.push({ label: "Sales" });
  else if (pathname.startsWith("/procurement")) segments.push({ label: "Procurement" });
  else if (pathname.startsWith("/inventory")) segments.push({ label: "Inventory" });
  else if (pathname.startsWith("/service")) segments.push({ label: "Field Service" });
  else if (pathname.startsWith("/products")) segments.push({ label: "Products" });
  else if (pathname.startsWith("/customers")) segments.push({ label: "Customers" });
  else if (pathname.startsWith("/reports")) segments.push({ label: "Reports" });
  else if (pathname.startsWith("/master-data")) segments.push({ label: "Configuration" });

  if (segments.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-[12px] text-text-muted select-none">
      <LayoutDashboard className="w-3.5 h-3.5 text-text-muted/50" />
      {segments.map((s, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3 text-border" />
          <span className={i === segments.length - 1 ? "text-ink font-medium" : ""}>{s.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── AppShell ─────────────────────────────────────────────────────────────────

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activePath,
  selectedBranchId,
  onBranchChange,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);
  const [apiOnline, setApiOnline] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.ensureAuthenticated().then(() => setUser(api.getUser()));
    api.getBranches().then((res) => setBranches(res.items)).catch(() => {});
    const ping = () =>
      fetch("/api/v1/health")
        .then((r) => setApiOnline(r.ok))
        .catch(() => setApiOnline(false));
    ping();
    const t = setInterval(ping, 30000);
    return () => clearInterval(t);
  }, []);

  const navGroups: NavGroup[] = [
    {
      title: "Operations",
      items: [
        { label: "Customers", path: "/customers", icon: Users },
        { label: "Products", path: "/products", icon: Package },
        {
          label: "Sales",
          path: "/sales",
          icon: ShoppingBag,
          children: [
            { label: "Quotations", path: "/sales" },
            { label: "Orders", path: "/sales?tab=orders" },
            { label: "Projects", path: "/sales?tab=projects" },
            { label: "Challans", path: "/sales?tab=challans" },
            { label: "Invoices", path: "/sales?tab=invoices" },
            { label: "Advances", path: "/sales?tab=advances" },
            { label: "Payments", path: "/sales?tab=payments" },
            { label: "Credit Notes", path: "/sales?tab=credit-notes" },
            { label: "Returns", path: "/sales?tab=returns" },
          ],
        },
        {
          label: "Procurement",
          path: "/procurement",
          icon: Truck,
          children: [
            { label: "Purchase Requests", path: "/procurement" },
            { label: "Purchase Orders", path: "/procurement?tab=orders" },
            { label: "Goods Receipts", path: "/procurement?tab=grn" },
            { label: "Suppliers", path: "/procurement?tab=suppliers" },
            { label: "Bills", path: "/procurement?tab=bills" },
          ],
        },
        {
          label: "Inventory",
          path: "/inventory",
          icon: Warehouse,
          children: [
            { label: "Stock Balances", path: "/inventory" },
            { label: "Transfers", path: "/inventory?tab=transfers" },
            { label: "Adjustments", path: "/inventory?tab=adjustments" },
            { label: "Serial & Batch Tracking", path: "/inventory?tab=tracking" },
            { label: "Damage & Loss", path: "/inventory?tab=damage-loss" },
          ],
        },
        {
          label: "Field Service",
          path: "/service",
          icon: Wrench,
          children: [
            { label: "Tickets", path: "/service" },
            { label: "Assignments", path: "/service?tab=assignments" },
            { label: "Product Custody", path: "/service?tab=custody" },
            { label: "Site Visits", path: "/service?tab=visits" },
            { label: "Finances", path: "/service?tab=finances" },
            { label: "Warranties", path: "/service?tab=warranties" },
          ],
        },
      ],
    },
    {
      title: "Intelligence & Reports",
      items: [
        {
          label: "Reports",
          path: "/reports",
          icon: BarChart3,
          children: [
            { label: "Sales VAT Report", path: "/reports" },
            { label: "Purchase Tax Report", path: "/reports?tab=tax" },
            { label: "Warranty & Service", path: "/reports?tab=warranty" },
            { label: "Sales Summary", path: "/reports?tab=sales" },
            { label: "Purchases Summary", path: "/reports?tab=purchases" },
          ],
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        {
          label: "Master Data",
          path: "/master-data",
          icon: Layers,
          children: [
            { label: "Categories", path: "/master-data" },
            { label: "Brands", path: "/master-data?tab=brands" },
            { label: "Units", path: "/master-data?tab=units" },
            { label: "Warehouses", path: "/master-data?tab=warehouses" },
            { label: "Departments", path: "/master-data?tab=departments" },
            { label: "Tax Rates", path: "/master-data?tab=tax-rates" },
          ],
        },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Roles & Access", path: "#roles", icon: ShieldCheck },
        { label: "Staff", path: "#employees", icon: UserCheck },
        { label: "Audit Log", path: "#audit", icon: ScrollText },
      ],
    },
  ];

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const sidebarW = collapsed ? "w-16" : "w-60";

  return (
    <div className="min-h-screen bg-page-bg flex font-sans">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-sidebar-bg flex flex-col transition-all duration-200 ease-in-out
          ${sidebarW}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky`}
      >
        {/* Brand header */}
        <div
          className={`h-14 flex items-center border-b border-white/8 shrink-0 ${
            collapsed ? "justify-center" : "px-4 gap-3"
          }`}
        >
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-extrabold text-white text-[11px] tracking-tight shrink-0 select-none">
            BTS
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <p className="text-white text-[13px] font-bold leading-tight tracking-tight truncate">
                Brother&apos;s System
              </p>
              <p className="text-sidebar-text/60 text-[10px]">Enterprise ERP</p>
            </div>
          )}
        </div>

        {/* Branch selector */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-white/8 shrink-0">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/50 flex items-center gap-1.5 mb-1.5">
              <Building2 className="w-3 h-3" />
              Branch
            </label>
            <select
              value={selectedBranchId || ""}
              onChange={(e) => onBranchChange?.(e.target.value)}
              className="w-full bg-sidebar-bg-hover border border-white/10 text-white text-[12px] rounded-md px-2.5 py-1.5 outline-none focus:border-primary/70 cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <Suspense fallback={<div className="p-4 text-[11px] text-sidebar-text/50">Loading navigation...</div>}>
            <SidebarNav
              groups={navGroups}
              collapsed={collapsed}
              activePath={activePath}
              onItemClick={() => setMobileOpen(false)}
            />
          </Suspense>
        </div>

        {/* User footer */}
        <div className="shrink-0 border-t border-white/8 p-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/30 flex items-center justify-center text-white text-[11px] font-bold select-none">
                {userInitials}
              </div>
              <button
                onClick={() => { api.clearSession(); window.location.reload(); }}
                title="Sign Out"
                className="p-1.5 rounded-md text-sidebar-text/50 hover:text-danger hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/30 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] font-semibold truncate leading-tight">
                  {user?.email || "admin@bts.com"}
                </p>
                <p className="text-sidebar-text/50 text-[10px] truncate">
                  {user?.role || "SUPER_ADMIN"}
                </p>
              </div>
              <button
                onClick={() => { api.clearSession(); window.location.reload(); }}
                title="Sign Out"
                className="p-1.5 rounded-md text-sidebar-text/50 hover:text-danger hover:bg-white/10 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-[60px] w-6 h-6 rounded-full bg-surface border border-border shadow-elevation-1 items-center justify-center text-text-muted hover:text-primary transition-colors z-50"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="h-14 bg-surface border-b border-border sticky top-0 z-20 flex items-center justify-between px-5 shrink-0 shadow-elevation-1">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
              className="lg:hidden p-1.5 rounded-md text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Breadcrumb />
          </div>

          <div className="flex items-center gap-1.5">
            {/* System status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-page-bg">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    apiOnline ? "bg-success" : "bg-danger"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    apiOnline ? "bg-success" : "bg-danger"
                  }`}
                />
              </span>
              <span className={`text-[11px] font-medium ${apiOnline ? "text-text-muted" : "text-danger"}`}>
                {apiOnline ? "Connected" : "Offline"}
              </span>
            </div>

            {/* Notifications */}
            <button
              title="Notifications"
              className="relative p-2 rounded-md text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>

            {/* Settings */}
            <button
              title="Settings"
              className="p-2 rounded-md text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page children */}
        <main className="flex-1 p-6 max-w-content mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
