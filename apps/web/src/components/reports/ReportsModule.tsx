"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  InvoiceDto,
  PurchaseOrderDto,
  WarrantyDto,
  CustomerDto,
  SupplierDto,
  BranchDto,
} from "@bts/shared-types";
import { ToastContainer, type ToastMessage } from "../common/Toast";

export type ReportTab = "vat" | "tax" | "warranty" | "sales" | "purchases";

interface ReportsModuleProps {
  selectedBranchId?: string;
  initialTab?: ReportTab;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  selectedBranchId,
  initialTab = "vat",
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Data states
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([]);
  const [warranties, setWarranties] = useState<WarrantyDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);

  // Filter states
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [warrantyStatusFilter, setWarrantyStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [invRes, poRes, warRes, custRes, supRes, brRes] = await Promise.all([
        api.getInvoices({ branchId: selectedBranchId || undefined, take: 300 }).catch(() => ({ items: [], total: 0 })),
        api.getPurchaseOrders({ take: 300 }).catch(() => ({ items: [], total: 0 })),
        api.getWarranties().catch(() => []),
        api.getCustomers({ take: 300 }).catch(() => ({ items: [], total: 0 })),
        api.getSuppliers({ take: 300 }).catch(() => ({ items: [], total: 0 })),
        api.getBranches().catch(() => ({ items: [] })),
      ]);

      setInvoices(invRes.items || []);
      setPurchaseOrders(poRes.items || []);
      setWarranties(warRes || []);
      setCustomers(custRes.items || []);
      setSuppliers(supRes.items || []);
      setBranches(brRes.items || []);

      if (isRefresh) {
        addToast("success", "Reports data refreshed successfully.");
      }
    } catch (err: unknown) {
      console.error("Reports data fetch failed:", err);
      addToast("error", "Failed to load reports data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // VAT calculations (Sales VAT / Output Tax)
  const vatRate = 0.15; // 15% standard NBR rate
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !search.trim() ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer?.displayName?.toLowerCase().includes(search.toLowerCase());

      const matchesCustomer = !customerFilter || inv.customerId === customerFilter;

      let matchesDate = true;
      const invDate = new Date(inv.createdAt);
      if (dateFrom) {
        matchesDate = matchesDate && invDate >= new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && invDate <= to;
      }

      return matchesSearch && matchesCustomer && matchesDate;
    });
  }, [invoices, search, customerFilter, dateFrom, dateTo]);

  const vatSummary = useMemo(() => {
    let totalSales = 0;
    let taxableSales = 0;
    let totalVat = 0;

    filteredInvoices.forEach((inv) => {
      const grand = Number(inv.grandTotal) || 0;
      totalSales += grand;
      // Taxable amount is base before VAT (standard 15% inclusive or exclusive formula)
      const baseAmount = Math.round((grand / (1 + vatRate)) * 100) / 100;
      taxableSales += baseAmount;
      totalVat += grand - baseAmount;
    });

    return {
      totalSales: Number(totalSales.toFixed(2)),
      taxableSales: Number(taxableSales.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      count: filteredInvoices.length,
    };
  }, [filteredInvoices, vatRate]);

  // Purchase Tax calculations (Purchase Tax / Input Tax)
  const purchaseTaxRate = 0.05; // 5% default advance tax / input VAT
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        !search.trim() ||
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.supplier?.companyName?.toLowerCase().includes(search.toLowerCase());

      const matchesSupplier = !supplierFilter || po.supplierId === supplierFilter;

      let matchesDate = true;
      const poDate = new Date(po.createdAt);
      if (dateFrom) {
        matchesDate = matchesDate && poDate >= new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && poDate <= to;
      }

      return matchesSearch && matchesSupplier && matchesDate;
    });
  }, [purchaseOrders, search, supplierFilter, dateFrom, dateTo]);

  const purchaseTaxSummary = useMemo(() => {
    let totalPurchases = 0;
    let taxablePurchases = 0;
    let totalTax = 0;

    filteredPurchaseOrders.forEach((po) => {
      const grand = Number(po.grandTotal) || 0;
      totalPurchases += grand;
      const base = Math.round((grand / (1 + purchaseTaxRate)) * 100) / 100;
      taxablePurchases += base;
      totalTax += grand - base;
    });

    return {
      totalPurchases: Number(totalPurchases.toFixed(2)),
      taxablePurchases: Number(taxablePurchases.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      count: filteredPurchaseOrders.length,
    };
  }, [filteredPurchaseOrders, purchaseTaxRate]);

  // Warranty Status summary
  const now = new Date();
  const thirtyDaysAhead = new Date();
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const matchesSearch =
        !search.trim() ||
        w.serialNumber?.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        w.serialNumber?.product?.name?.toLowerCase().includes(search.toLowerCase());

      let matchesStatus = true;
      const end = new Date(w.endDate);
      if (warrantyStatusFilter === "ACTIVE") {
        matchesStatus = end > now && w.status === "ACTIVE";
      } else if (warrantyStatusFilter === "EXPIRING_SOON") {
        matchesStatus = end > now && end <= thirtyDaysAhead;
      } else if (warrantyStatusFilter === "EXPIRED") {
        matchesStatus = end <= now || w.status === "EXPIRED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [warranties, search, warrantyStatusFilter, now, thirtyDaysAhead]);

  const warrantySummary = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;

    warranties.forEach((w) => {
      const end = new Date(w.endDate);
      if (end <= now || w.status === "EXPIRED") {
        expired++;
      } else if (end <= thirtyDaysAhead) {
        expiringSoon++;
        active++;
      } else {
        active++;
      }
    });

    return {
      total: warranties.length,
      active,
      expiringSoon,
      expired,
    };
  }, [warranties, now, thirtyDaysAhead]);

  // CSV Exporters
  const handleExportVatCsv = () => {
    const filename = `vat-sales-report-${new Date().toISOString().split("T")[0]}.csv`;
    const headers = [
      "Date",
      "Invoice Number",
      "Customer",
      "Sales Amount (BDT)",
      "Taxable Amount (BDT)",
      "VAT Rate (%)",
      "VAT Amount (BDT)",
      "Grand Total (BDT)",
      "Status",
    ];
    const rows = filteredInvoices.map((inv) => {
      const grand = Number(inv.grandTotal) || 0;
      const taxable = Math.round((grand / (1 + vatRate)) * 100) / 100;
      const vat = Number((grand - taxable).toFixed(2));
      return [
        new Date(inv.createdAt).toLocaleDateString(),
        inv.invoiceNumber,
        `"${inv.customer?.displayName || "N/A"}"`,
        grand,
        taxable,
        "15%",
        vat,
        grand,
        inv.status,
      ];
    });

    if (rows.length === 0) {
      addToast("info", "No records to export.");
      return;
    }

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", `Exported ${rows.length} VAT records to CSV.`);
  };

  const handleExportPurchaseTaxCsv = () => {
    const filename = `purchase-tax-report-${new Date().toISOString().split("T")[0]}.csv`;
    const headers = [
      "Date",
      "Purchase Order #",
      "Supplier",
      "Total Amount (BDT)",
      "Taxable Amount (BDT)",
      "Tax Rate (%)",
      "Tax Amount (BDT)",
      "Grand Total (BDT)",
    ];
    const rows = filteredPurchaseOrders.map((po) => {
      const grand = Number(po.grandTotal) || 0;
      const taxable = Math.round((grand / (1 + purchaseTaxRate)) * 100) / 100;
      const tax = Number((grand - taxable).toFixed(2));
      return [
        new Date(po.createdAt).toLocaleDateString(),
        po.poNumber,
        `"${po.supplier?.companyName || "N/A"}"`,
        grand,
        taxable,
        "5%",
        tax,
        grand,
      ];
    });

    if (rows.length === 0) {
      addToast("info", "No records to export.");
      return;
    }

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", `Exported ${rows.length} purchase tax records.`);
  };

  const handleExportWarrantyCsv = () => {
    const filename = `warranty-report-${new Date().toISOString().split("T")[0]}.csv`;
    const headers = [
      "Warranty ID",
      "Product Name",
      "SKU",
      "Serial Number",
      "Start Date",
      "End Date",
      "Term (Months)",
      "Status",
    ];
    const rows = filteredWarranties.map((w) => [
      w.id,
      `"${w.serialNumber?.product?.name || "N/A"}"`,
      w.serialNumber?.product?.sku || "N/A",
      w.serialNumber?.serialNumber || "N/A",
      new Date(w.startDate).toLocaleDateString(),
      new Date(w.endDate).toLocaleDateString(),
      w.termMonths,
      w.status,
    ]);

    if (rows.length === 0) {
      addToast("info", "No records to export.");
      return;
    }

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("success", `Exported ${rows.length} warranty records.`);
  };

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">
            {activeTab === "vat"
              ? "Sales VAT Report"
              : activeTab === "tax"
              ? "Purchase Tax Report"
              : activeTab === "warranty"
              ? "Warranty & Service Report"
              : activeTab === "sales"
              ? "Sales Revenue Summary"
              : "Procurement Summary"}
          </h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            {activeTab === "vat"
              ? "Output VAT collection register, tax invoice traceability, and auditable taxable amounts."
              : activeTab === "tax"
              ? "Input Tax on procurement, supplier invoices, and advance tax deductions."
              : activeTab === "warranty"
              ? "Warranty lifecycle registry, expiring coverages, and claim traceability."
              : "Financial and operational analytics dashboard."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh"
            className="p-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          {activeTab === "vat" && (
            <button
              onClick={handleExportVatCsv}
              className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-text-muted" />
              Export VAT CSV
            </button>
          )}

          {activeTab === "tax" && (
            <button
              onClick={handleExportPurchaseTaxCsv}
              className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-text-muted" />
              Export Tax CSV
            </button>
          )}

          {activeTab === "warranty" && (
            <button
              onClick={handleExportWarrantyCsv}
              className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-text-muted" />
              Export Warranty CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards with restored icons */}
      {activeTab === "vat" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Sales</p>
              <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
                ৳{vatSummary.totalSales.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">{vatSummary.count} Commercial Invoices</p>
            </div>
            <Receipt className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Taxable Sales</p>
              <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
                ৳{vatSummary.taxableSales.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-primary font-medium mt-0.5">Base Net of VAT</p>
            </div>
            <DollarSign className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Output VAT (15%)</p>
              <p className="text-h2 font-bold text-success mt-1 tabular-nums font-mono">
                ৳{vatSummary.totalVat.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Collected from Customers
              </p>
            </div>
            <Percent className="w-5 h-5 text-success shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Net Tax Position</p>
              <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
                ৳{Math.max(0, vatSummary.totalVat - purchaseTaxSummary.totalTax).toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Output VAT minus Input Tax</p>
            </div>
            <TrendingUp className="w-5 h-5 text-text-muted shrink-0" />
          </div>
        </div>
      )}

      {activeTab === "tax" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Purchases</p>
              <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
                ৳{purchaseTaxSummary.totalPurchases.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">{purchaseTaxSummary.count} Purchase Orders</p>
            </div>
            <Truck className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Taxable Purchases</p>
              <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
                ৳{purchaseTaxSummary.taxablePurchases.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-primary font-medium mt-0.5">Base Purchase Amount</p>
            </div>
            <DollarSign className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Input Tax (5%)</p>
              <p className="text-h2 font-bold text-amber-600 mt-1 tabular-nums font-mono">
                ৳{purchaseTaxSummary.totalTax.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Paid to Suppliers</p>
            </div>
            <Percent className="w-5 h-5 text-amber-600 shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Separation Rule</p>
              <p className="text-[13px] font-semibold text-ink mt-1">Independent Ledgers</p>
              <p className="text-[11px] text-text-muted mt-0.5">Sales VAT & Purchase Tax separated</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-teal shrink-0" />
          </div>
        </div>
      )}

      {activeTab === "warranty" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Warranties</p>
              <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{warrantySummary.total}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Issued units</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Active Coverage</p>
              <p className="text-h1 font-bold text-success mt-1 tabular-nums">{warrantySummary.active}</p>
              <p className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Valid warranty
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Expiring Soon</p>
              <p className="text-h1 font-bold text-warning mt-1 tabular-nums">{warrantySummary.expiringSoon}</p>
              <p className="text-[11px] text-warning font-medium mt-0.5">Within 30 Days</p>
            </div>
            <Clock className="w-5 h-5 text-warning shrink-0" />
          </div>

          <div className="p-4 rounded-sm border border-border bg-surface flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Expired</p>
              <p className="text-h1 font-bold text-danger mt-1 tabular-nums">{warrantySummary.expired}</p>
              <p className="text-[11px] text-danger font-medium mt-0.5">Out of Warranty</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-md border border-border bg-surface shadow-elevation-1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or name..."
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
            />
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-medium shrink-0">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-medium shrink-0">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
            />
          </div>

          {/* Contextual filter */}
          {activeTab === "vat" && (
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          )}

          {activeTab === "tax" && (
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
          )}

          {activeTab === "warranty" && (
            <select
              value={warrantyStatusFilter}
              onChange={(e) => setWarrantyStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Warranty Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring Soon (30 Days)</option>
              <option value="EXPIRED">Expired</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Report Table */}
      <div className="border border-border rounded-md bg-surface shadow-elevation-1 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-text-muted">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            Loading report records...
          </div>
        ) : activeTab === "vat" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-page-bg/60 border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Sales Amount</th>
                  <th className="px-4 py-3 text-right">Taxable Amount</th>
                  <th className="px-4 py-3 text-center">VAT Rate</th>
                  <th className="px-4 py-3 text-right">VAT Collected</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-text-muted">
                      No commercial sales invoices found for the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const grand = Number(inv.grandTotal) || 0;
                    const taxable = Math.round((grand / (1 + vatRate)) * 100) / 100;
                    const vat = Number((grand - taxable).toFixed(2));

                    return (
                      <tr key={inv.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-ink">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {inv.customer?.displayName || "Standard Customer"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ৳{grand.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted">
                          ৳{taxable.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-primary">
                          15%
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-success">
                          ৳{vat.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-ink">
                          ৳{grand.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              inv.status === "POSTED"
                                ? "bg-success/15 text-success"
                                : inv.status === "DRAFT"
                                ? "bg-warning/15 text-warning"
                                : "bg-danger/15 text-danger"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === "tax" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-page-bg/60 border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">PO Reference</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">Taxable Amount</th>
                  <th className="px-4 py-3 text-center">Tax Rate</th>
                  <th className="px-4 py-3 text-right">Input Tax Paid</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-muted">
                      No procurement orders found for the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseOrders.map((po) => {
                    const grand = Number(po.grandTotal) || 0;
                    const taxable = Math.round((grand / (1 + purchaseTaxRate)) * 100) / 100;
                    const tax = Number((grand - taxable).toFixed(2));

                    return (
                      <tr key={po.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-ink">
                          {po.poNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {po.supplier?.companyName || "Vendor"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          ৳{grand.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-text-muted">
                          ৳{taxable.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-amber-600">
                          5%
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-amber-600">
                          ৳{tax.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-ink">
                          ৳{grand.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-page-bg/60 border-b border-border text-text-muted font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Warranty ID</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Serial Number</th>
                  <th className="px-4 py-3">Activation Date</th>
                  <th className="px-4 py-3">Expiration Date</th>
                  <th className="px-4 py-3 text-center">Period</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWarranties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-muted">
                      No warranty equipment records found for the specified criteria.
                    </td>
                  </tr>
                ) : (
                  filteredWarranties.map((w) => {
                    const end = new Date(w.endDate);
                    const isExp = end <= now;
                    const isSoon = !isExp && end <= thirtyDaysAhead;

                    return (
                      <tr key={w.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-ink">
                          WARR-{w.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          {w.serialNumber?.product?.name || "Equipment Unit"}
                        </td>
                        <td className="px-4 py-3 font-mono text-text-muted">
                          {w.serialNumber?.product?.sku || "SKU-N/A"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-primary">
                          {w.serialNumber?.serialNumber || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {new Date(w.startDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {new Date(w.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center text-text-muted">
                          {w.termMonths} Months
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isExp
                                ? "bg-danger/15 text-danger"
                                : isSoon
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                            }`}
                          >
                            {isExp ? "EXPIRED" : isSoon ? "EXPIRING SOON" : "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
