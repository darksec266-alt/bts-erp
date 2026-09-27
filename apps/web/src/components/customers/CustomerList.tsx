"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Wrench,
  Building2,
  Search,
  Download,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Phone,
  MapPin,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "../../lib/api";
import type { CustomerDto, BranchDto } from "@bts/shared-types";
import { CreateCustomerModal } from "./CreateCustomerModal";
import { CustomerDetailDrawer } from "./CustomerDetailDrawer";
import { ToastContainer, type ToastMessage } from "../common/Toast";

interface CustomerListProps {
  selectedBranchId?: string;
}

export const CustomerList: React.FC<CustomerListProps> = ({ selectedBranchId }) => {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(selectedBranchId || "");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "STANDARD" | "SERVICE_ONLY">("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync parent branch filter if changed
  useEffect(() => {
    if (selectedBranchId !== undefined) {
      setBranchFilter(selectedBranchId);
      setPage(1);
    }
  }, [selectedBranchId]);

  // Load branches
  useEffect(() => {
    api.getBranches()
      .then((res) => setBranches(res.items))
      .catch((err) => console.error("Failed to load branches:", err));
  }, []);

  // Fetch customers
  const fetchCustomers = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const skip = (page - 1) * pageSize;
      const res = await api.getCustomers({
        search: search.trim() || undefined,
        branchId: branchFilter || undefined,
        isActive:
          statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined,
        isServiceOnly:
          typeFilter === "SERVICE_ONLY" ? true : typeFilter === "STANDARD" ? false : undefined,
        skip,
        take: pageSize,
      });

      setCustomers(res.items);
      setTotalCount(res.total);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [search, branchFilter, statusFilter, typeFilter, page, pageSize]);

  // Calculated Stats directly from real database records
  const stats = useMemo(() => {
    const total = totalCount;
    const active = customers.filter((c) => c.isActive).length;
    const serviceOnly = customers.filter((c) => c.isServiceOnly).length;
    const branchSet = new Set(customers.map((c) => c.branchId));
    return {
      total,
      active,
      serviceOnly,
      branchCount: branchSet.size,
    };
  }, [customers, totalCount]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (customers.length === 0) {
      addToast("info", "No customer records available to export.");
      return;
    }

    const headers = ["Customer Code", "Display Name", "Phone", "Branch", "Type", "Status", "Total Addresses"];
    const rows = customers.map((c) => [
      c.customerCode,
      `"${c.displayName.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.branch?.name || c.branchId}"`,
      c.isServiceOnly ? "Service Only" : "Standard",
      c.isActive ? "Active" : "Inactive",
      c.addresses?.length || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BTS_Customers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast("success", "Customer records exported to CSV.");
  };

  const handleOpenDetail = (customer: CustomerDto) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  };

  const handleCustomerCreated = (newCust: CustomerDto) => {
    addToast("success", `Customer ${newCust.displayName} registered successfully.`);
    setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
    setTotalCount((prev) => prev + 1);
    setPage(1);
    fetchCustomers();
  };

  const handleCustomerUpdated = (updatedCust: CustomerDto) => {
    addToast("success", `Customer ${updatedCust.displayName} updated.`);
    setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    if (selectedCustomer?.id === updatedCust.id) {
      setSelectedCustomer(updatedCust);
    }
  };

  const handleCustomerDeleted = (id: string) => {
    addToast("success", "Customer account deactivated.");
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const resetFilters = () => {
    setSearch("");
    setBranchFilter("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">Customers</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Client accounts, address books, and service scopes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCustomers(true)}
            disabled={refreshing}
            title="Refresh"
            className="p-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            Export
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Customer
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Clients</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.total}</p>
            <p className="text-[11px] text-text-muted mt-0.5">Registered</p>
          </div>
          <Users className="w-5 h-5 text-primary shrink-0" />
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Active</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.total > 0 ? stats.active : 0}</p>
            <p className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </p>
          </div>
          <UserCheck className="w-5 h-5 text-success shrink-0" />
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Service-Only</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.serviceOnly}</p>
            <p className="text-[11px] text-teal font-medium mt-0.5">Field Maintenance</p>
          </div>
          <Wrench className="w-5 h-5 text-teal shrink-0" />
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Branches</p>
            <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{branches.length}</p>
            <p className="text-[11px] text-purple font-medium mt-0.5">Operating Hubs</p>
          </div>
          <Building2 className="w-5 h-5 text-purple shrink-0" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-md border border-border bg-surface shadow-elevation-1 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              id="customer-search-input"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by customer name, phone number, or code..."
              className="w-full pl-9 pr-8 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Branch Filter */}
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "ALL" | "STANDARD" | "SERVICE_ONLY");
                setPage(1);
              }}
              className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
            >
              <option value="ALL">All Account Types</option>
              <option value="STANDARD">Standard (Hardware & Service)</option>
              <option value="SERVICE_ONLY">Service-Only Customer</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
                setPage(1);
              }}
              className="px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink hover:border-primary/50 outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="INACTIVE">Inactive Accounts</option>
            </select>

            {/* Reset Filter Button */}
            {(search || branchFilter || statusFilter !== "ALL" || typeFilter !== "ALL") && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-caption font-medium rounded-sm border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Customers Data Table */}
      <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 mx-auto text-primary animate-spin" />
            <p className="text-[13px] text-text-muted">Loading...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <Users className="w-10 h-10 mx-auto text-text-muted/30" />
            <h3 className="text-[15px] font-semibold text-ink">No customers found</h3>
            <p className="text-[13px] text-text-muted">
              {search || branchFilter || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "No results match your filters. Try adjusting your search."
                : "No customers registered yet. Add the first one to get started."}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {(search || branchFilter || statusFilter !== "ALL" || typeFilter !== "ALL") && (
                <button
                  onClick={resetFilters}
                  className="px-3.5 py-2 rounded-sm border border-border text-[13px] font-medium text-ink hover:bg-page-bg"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Customer
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-page-bg/60 text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Addresses</th>
                  <th className="py-3 px-4 text-right">Wallet Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => {
                  const branchDisplay =
                    c.branch?.name || branches.find((b) => b.id === c.branchId)?.name || "Head Office";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-page-bg/50 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(c)}
                    >
                      {/* Customer Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        {c.customerCode}
                      </td>

                      {/* Display Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink leading-tight">{c.displayName}</div>
                        <span className="text-caption text-text-muted">
                          Registered:{" "}
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString()
                            : "Verified"}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-medium text-ink">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-text-muted" /> {c.phone}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-4 text-text-muted">
                        <span className="flex items-center gap-1.5 text-body">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" /> {branchDisplay}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        {c.isServiceOnly ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-medium bg-teal-tint text-teal">
                            <Wrench className="w-3 h-3" /> Service Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-label font-medium bg-primary-tint text-primary">
                            Commercial
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-label font-medium ${
                            c.isActive
                              ? "bg-success-tint text-success"
                              : "bg-danger-tint text-danger"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Addresses */}
                      <td className="py-3.5 px-4">
                        {c.addresses && c.addresses.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-page-bg text-caption text-text-muted border border-border">
                            <MapPin className="w-3 h-3 text-primary" />
                            {c.addresses.length} location{c.addresses.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-caption text-text-muted">None</span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        ৳{Number(c.walletBalance || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(c)}
                            title="Open Customer Profile & Ledger"
                            className="px-2.5 py-1 text-caption font-semibold rounded bg-primary-tint text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setDrawerOpen(true);
                            }}
                            title="Edit Customer"
                            className="p-1.5 rounded text-text-muted hover:text-primary hover:bg-primary-tint transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(page * pageSize, totalCount)}</strong> of{" "}
                <strong>{totalCount}</strong> customer records
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-caption text-ink-muted">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded border border-border bg-surface text-ink text-caption outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-border bg-surface text-ink hover:bg-page-bg disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="px-2 font-medium text-ink">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-border bg-surface text-ink hover:bg-page-bg disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCustomerCreated}
        branches={branches}
      />

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        onUpdate={handleCustomerUpdated}
        onDelete={handleCustomerDeleted}
        branches={branches}
      />
    </div>
  );
};
