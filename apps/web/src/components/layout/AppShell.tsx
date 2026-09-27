"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  Layers,
  Warehouse,
  Truck,
  ShieldCheck,
  UserCheck,
  ScrollText,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Wrench,
  Building2,
} from "lucide-react";
import { api, type AuthUser } from "../../lib/api";

interface AppShellProps {
  children: React.ReactNode;
  activePath?: string;
  selectedBranchId?: string;
  onBranchChange?: (branchId: string) => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarNavProps {
  navGroups: NavGroup[];
  activePath?: string;
  onItemClick: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ navGroups, activePath, onItemClick }) => {
  const pathname = usePathname();
  const [_currentTab, setCurrentTab] = useState<string | null>(null);

  useEffect(() => {
    const updateTab = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        setCurrentTab(params.get("tab"));
      }
    };
    updateTab();
    const interval = setInterval(updateTab, 250);
    window.addEventListener("popstate", updateTab);
    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", updateTab);
    };
  }, [pathname]);

  const isItemActive = (itemPath: string) => {
    if (activePath) {
      if (activePath === itemPath) return true;
      if (activePath.startsWith(itemPath + "/") || activePath.startsWith(itemPath + "?")) return true;
    }

    const [itemBasePath] = itemPath.split("?");
    if (pathname === itemBasePath) return true;
    if (itemBasePath !== "/" && pathname.startsWith(itemBasePath)) return true;

    return false;
  };

  return (
    <div className="space-y-6">
      {navGroups.map((group, idx) => (
        <div key={idx}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-text/70 mb-2">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = isItemActive(item.path);
              return (
                <Link
                  key={itemIdx}
                  href={item.path}
                  onClick={onItemClick}
                  className={`group flex items-center justify-between px-3 py-2 rounded-sm text-body transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white font-medium shadow-sm"
                      : "text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? "text-white" : "text-sidebar-text group-hover:text-white"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="text-[10px] text-sidebar-text/60 bg-white/5 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activePath,
  selectedBranchId,
  onBranchChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [branches, setBranches] = useState<{ id: string; code: string; name: string }[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  useEffect(() => {
    // Initial fetch user & branches
    api.ensureAuthenticated().then(() => {
      setUser(api.getUser());
    });

    api.getBranches().then((res) => {
      setBranches(res.items);
    }).catch(() => {});

    // Periodic health check ping
    const checkHealth = () => {
      fetch("/api/v1/health")
        .then((res) => setApiOnline(res.ok))
        .catch(() => setApiOnline(false));
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "Core Operations",
      items: [
        { label: "Customers", path: "/customers", icon: Users },
        { label: "Products & SKUs", path: "/products", icon: Package },
        { label: "Sales & Orders", path: "/sales", icon: ShoppingBag },
        { label: "Procurement", path: "/procurement", icon: Truck },
        { label: "Inventory", path: "/inventory", icon: Warehouse },
        { label: "Field Service & Tickets", path: "/service", icon: Wrench },
        { label: "Master Data", path: "/master-data", icon: Layers },
      ],
    },
    {
      title: "Administration",
      items: [
        { label: "Roles & RBAC", path: "#roles", icon: ShieldCheck },
        { label: "Staff & Employees", path: "#employees", icon: UserCheck },
        { label: "System Audit Logs", path: "#audit", icon: ScrollText },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-page-bg flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-sidebar-bg text-white px-4 py-3 flex items-center justify-between border-b border-sidebar-bg-hover">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center font-bold text-white shadow-sm">
            BTS
          </div>
          <span className="font-semibold text-h3 tracking-tight">Brother&apos;s ERP</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-sm text-sidebar-text hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile drawer) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar-bg flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center font-extrabold text-white text-base shadow-sm">
                BTS
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight tracking-tight">
                  Brother&apos;s System
                </h1>
                <p className="text-sidebar-text text-caption font-medium">Enterprise ERP Platform</p>
              </div>
            </div>
          </div>

          {/* Active Branch Selector Chip */}
          <div className="px-4 py-3 border-b border-white/10 bg-sidebar-bg-hover/40">
            <div className="flex items-center justify-between text-sidebar-text text-caption mb-1 font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Active Branch
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-white">
                Live
              </span>
            </div>
            <select
              value={selectedBranchId || ""}
              onChange={(e) => onBranchChange?.(e.target.value)}
              className="w-full bg-sidebar-bg border border-white/15 text-white text-caption rounded-sm px-2 py-1.5 outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="">All Branches (Enterprise)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
            <SidebarNav
              navGroups={navGroups}
              activePath={activePath}
              onItemClick={() => setMobileMenuOpen(false)}
            />
          </div>

          {/* User profile & session footer */}
          <div className="p-3 border-t border-white/10 bg-sidebar-bg">
            <div className="flex items-center justify-between p-2 rounded-sm bg-sidebar-bg-hover/60 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple flex items-center justify-center font-bold text-white text-xs shadow-sm">
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : "AD"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-caption font-semibold truncate leading-tight">
                      {user?.email || "admin@bts.com"}
                    </span>
                    <span className="bg-primary/25 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-primary/40 uppercase tracking-wider">
                      ROOT
                    </span>
                  </div>
                  <span className="text-sidebar-text text-[11px] truncate">
                    {user?.role || "SUPER_ADMIN"} Profile
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  api.clearSession();
                  window.location.reload();
                }}
                title="Sign Out"
                className="p-1.5 rounded text-sidebar-text hover:text-danger hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-surface border-b border-border sticky top-0 z-20 flex items-center justify-between px-6 shadow-elevation-1">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-2 text-body">
            <span className="text-text-muted font-medium">
              {pathname?.startsWith("/sales")
                ? "Sales & Orders"
                : pathname?.startsWith("/procurement")
                ? "Procurement & SCM"
                : "Master Data"}
            </span>
            <span className="text-border">/</span>
            <span className="text-ink font-semibold">
              {pathname === "/sales"
                ? "Quotations & Orders"
                : pathname === "/products"
                ? "Products & SKUs"
                : pathname?.startsWith("/master-data")
                ? "Configuration"
                : pathname?.startsWith("/procurement")
                ? "Procurement Workspace"
                : "Customers"}
            </span>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Live System Health Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-page-bg border border-border text-caption">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    apiOnline ? "bg-success" : "bg-danger"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    apiOnline ? "bg-success" : "bg-danger"
                  }`}
                />
              </span>
              <span className="font-medium text-ink">
                API {apiOnline ? "Live :4000" : "Offline"}
              </span>
            </div>

            {/* Quick Search Shortcut */}
            <button
              onClick={() => {
                const searchInput = document.getElementById("customer-search-input");
                searchInput?.focus();
              }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-page-bg text-text-muted hover:text-ink hover:border-primary/50 text-caption transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search customers...</span>
              <kbd className="bg-surface px-1.5 py-0.5 rounded border border-border text-[10px] font-mono">
                /
              </kbd>
            </button>

            {/* Notifications Bell */}
            <button
              title="System Notifications"
              className="relative p-2 rounded-sm text-text-muted hover:text-ink hover:bg-page-bg transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        {/* Page Children */}
        <main className="flex-1 p-6 md:p-8 max-w-content mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
