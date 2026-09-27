"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Truck,
  FileText,
  ShoppingCart,
  FileCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  PackageCheck,
  DollarSign,
  Clock,
  Check,
  X,
  Loader2,
  Download,
  Building2,
  Package,
  Phone,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  SupplierDto,
  PurchaseRequestDto,
  PurchaseOrderDto,
  GoodsReceiptNoteDto,
  ProductDto,
  BranchDto,
  ProcurementStatsDto,
} from "@bts/shared-types";
import { ToastContainer, type ToastMessage } from "../common/Toast";
import { CreateSupplierModal } from "./CreateSupplierModal";
import { CreatePurchaseRequestModal } from "./CreatePurchaseRequestModal";
import { CreatePurchaseOrderModal } from "./CreatePurchaseOrderModal";
import { ReceiveGoodsModal } from "./ReceiveGoodsModal";
import { PurchaseOrderDetailDrawer } from "./PurchaseOrderDetailDrawer";
import { SupplierDetailDrawer } from "./SupplierDetailDrawer";
import { GrnDetailDrawer } from "./GrnDetailDrawer";

type ProcurementTab = "suppliers" | "purchase-requests" | "purchase-orders" | "grn";

export const ProcurementModule: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as ProcurementTab | null;
  const [activeTab, setActiveTab] = useState<ProcurementTab>(
    tabParam && ["suppliers", "purchase-requests", "purchase-orders", "grn"].includes(tabParam)
      ? tabParam
      : "suppliers"
  );

  useEffect(() => {
    if (tabParam && ["suppliers", "purchase-requests", "purchase-orders", "grn"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Data states
  const [stats, setStats] = useState<ProcurementStatsDto>({
    totalSpend: 0,
    totalPOs: 0,
    pendingPRs: 0,
    activeSuppliers: 0,
    totalGRNs: 0,
  });
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestDto[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptNoteDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);

  // Filter / Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [prStatusFilter, setPrStatusFilter] = useState<string>("ALL");
  const [poBranchFilter, setPoBranchFilter] = useState<string>("ALL");
  const [grnStatusFilter, setGrnStatusFilter] = useState<string>("ALL");

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals & Drawers
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [prModalOpen, setPrModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [selectedPrForPo, setSelectedPrForPo] = useState<string | undefined>(undefined);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrderDto | null>(null);

  const [selectedPoForDrawer, setSelectedPoForDrawer] = useState<PurchaseOrderDto | null>(null);
  const [poDrawerOpen, setPoDrawerOpen] = useState(false);

  const [selectedSupplierForDrawer, setSelectedSupplierForDrawer] = useState<SupplierDto | null>(null);
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);

  const [selectedGrnForDrawer, setSelectedGrnForDrawer] = useState<GoodsReceiptNoteDto | null>(null);
  const [grnDrawerOpen, setGrnDrawerOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync tab change
  const handleTabChange = (tab: ProcurementTab) => {
    setActiveTab(tab);
    setSearchTerm("");
    router.replace(`/procurement?tab=${tab}`);
  };

  // Data Fetch
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [
        statsData,
        supRes,
        prRes,
        poRes,
        grnRes,
        prodRes,
        branchRes,
      ] = await Promise.all([
        api.getProcurementStats(),
        api.getSuppliers({ take: 100 }),
        api.getPurchaseRequests({ take: 100 }),
        api.getPurchaseOrders({ take: 100 }),
        api.getGrns({ take: 100 }),
        api.getProducts({ take: 300 }),
        api.getBranches(),
      ]);

      setStats(statsData);
      setSuppliers(supRes.items);
      setPurchaseRequests(prRes.items);
      setPurchaseOrders(poRes.items);
      setGrns(grnRes.items);
      setProducts(prodRes.items);
      setBranches(branchRes.items);
      if (isRefresh) {
        addToast("info", "Procurement data refreshed");
      }
    } catch (err) {
      console.error("Failed to load procurement records:", err);
      addToast("error", "Failed to load procurement records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // PR Actions: Approve / Reject
  const handleApprovePr = async (id: string, requestNumber: string) => {
    setActionLoadingId(id);
    try {
      await api.approvePurchaseRequest(id);
      addToast("success", `Requisition ${requestNumber} APPROVED!`);
      fetchData();
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectPr = async (id: string, requestNumber: string) => {
    setActionLoadingId(id);
    try {
      await api.rejectPurchaseRequest(id);
      addToast("info", `Requisition ${requestNumber} rejected.`);
      fetchData();
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveGrnDiscrepancy = async (id: string, grnNumber: string) => {
    setActionLoadingId(id);
    try {
      await api.approveGrn(id);
      addToast("success", `GRN ${grnNumber} discrepancy marked as RESOLVED!`);
      fetchData();
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to resolve discrepancy");
    } finally {
      setActionLoadingId(null);
    }
  };

  // CSV Export handler
  const handleExportCsv = () => {
    try {
      let csvContent = "";
      const dateStr = new Date().toISOString().split("T")[0];

      if (activeTab === "suppliers") {
        const rows = [
          ["Supplier Code", "Company Name", "Contact Person", "Phone", "Status"],
          ...filteredSuppliers.map((s) => {
            const contact = s.contacts?.find((c) => c.isPrimary) || s.contacts?.[0];
            return [
              s.supplierCode,
              `"${(s.companyName || "").replace(/"/g, '""')}"`,
              `"${(contact?.name || "").replace(/"/g, '""')}"`,
              `"${(contact?.phone || "").replace(/"/g, '""')}"`,
              s.isActive ? "ACTIVE" : "INACTIVE",
            ];
          }),
        ];
        csvContent = rows.map((r) => r.join(",")).join("\n");
      } else if (activeTab === "purchase-requests") {
        const rows = [
          ["PR Number", "Branch", "Request Date", "Line Items Count", "Approval Status", "PO Status", "Linked PO Number"],
          ...filteredPrs.map((pr) => [
            pr.requestNumber,
            `"${(pr.branch?.name || pr.branchId || "").replace(/"/g, '""')}"`,
            new Date(pr.createdAt).toLocaleDateString(),
            pr.lines.length,
            pr.status,
            pr.status === "APPROVED" ? (pr.purchaseOrder ? "PO_COMPLETED" : "AWAITING_PO") : pr.status,
            pr.purchaseOrder?.poNumber || "N/A",
          ]),
        ];
        csvContent = rows.map((r) => r.join(",")).join("\n");
      } else if (activeTab === "purchase-orders") {
        const rows = [
          ["PO Number", "Supplier", "PR Reference", "Destination Branch", "Order Date", "Grand Total (BDT)"],
          ...filteredPos.map((po) => [
            po.poNumber,
            `"${(po.supplier?.companyName || "").replace(/"/g, '""')}"`,
            po.purchaseRequest?.requestNumber || "Direct",
            `"${(po.branch?.name || po.branchId || "").replace(/"/g, '""')}"`,
            new Date(po.createdAt).toLocaleDateString(),
            po.grandTotal,
          ]),
        ];
        csvContent = rows.map((r) => r.join(",")).join("\n");
      } else {
        const rows = [
          ["GRN Number", "Purchase Order", "Supplier", "Received Date", "Lines Count", "QC Status"],
          ...filteredGrns.map((grn) => [
            grn.grnNumber,
            grn.purchaseOrder?.poNumber || grn.purchaseOrderId,
            `"${(grn.purchaseOrder?.supplier?.companyName || "").replace(/"/g, '""')}"`,
            new Date(grn.receivedAt).toLocaleDateString(),
            grn.lines.length,
            grn.status,
          ]),
        ];
        csvContent = rows.map((r) => r.join(",")).join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `procurement-${activeTab}-${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addToast("info", "Exported CSV successfully");
    } catch (e) {
      console.error("Export CSV error:", e);
      addToast("error", "Failed to export CSV file");
    }
  };

  // Filtered views
  const termLower = searchTerm.toLowerCase().trim();

  const filteredSuppliers = suppliers.filter((s) => {
    if (!termLower) return true;
    const contact = s.contacts?.find((c) => c.isPrimary) || s.contacts?.[0];
    return (
      s.companyName.toLowerCase().includes(termLower) ||
      s.supplierCode.toLowerCase().includes(termLower) ||
      (contact?.name && contact.name.toLowerCase().includes(termLower)) ||
      (contact?.phone && contact.phone.toLowerCase().includes(termLower))
    );
  });

  const approvedPrs = purchaseRequests.filter((pr) => pr.status === "APPROVED");
  const approvedPendingPoCount = purchaseRequests.filter(
    (pr) => pr.status === "APPROVED" && !pr.purchaseOrder
  ).length;
  const approvedPoDoneCount = purchaseRequests.filter(
    (pr) => pr.status === "APPROVED" && !!pr.purchaseOrder
  ).length;

  const filteredPrs = purchaseRequests.filter((pr) => {
    if (prStatusFilter === "APPROVED_AWAITING_PO") {
      if (pr.status !== "APPROVED" || pr.purchaseOrder) return false;
    } else if (prStatusFilter === "APPROVED_PO_DONE") {
      if (pr.status !== "APPROVED" || !pr.purchaseOrder) return false;
    } else if (prStatusFilter !== "ALL" && pr.status !== prStatusFilter) {
      return false;
    }
    if (!termLower) return true;
    const branchName = pr.branch?.name?.toLowerCase() || "";
    const poNum = pr.purchaseOrder?.poNumber?.toLowerCase() || "";
    const hasProductMatch = pr.lines.some((l) =>
      l.product?.name?.toLowerCase().includes(termLower)
    );
    return (
      pr.requestNumber.toLowerCase().includes(termLower) ||
      branchName.includes(termLower) ||
      poNum.includes(termLower) ||
      hasProductMatch
    );
  });

  const filteredPos = purchaseOrders.filter((po) => {
    if (poBranchFilter !== "ALL" && po.branchId !== poBranchFilter) return false;
    if (!termLower) return true;
    const supplierName = po.supplier?.companyName?.toLowerCase() || "";
    const branchName = po.branch?.name?.toLowerCase() || "";
    const prNumber = po.purchaseRequest?.requestNumber?.toLowerCase() || "";
    return (
      po.poNumber.toLowerCase().includes(termLower) ||
      supplierName.includes(termLower) ||
      branchName.includes(termLower) ||
      prNumber.includes(termLower)
    );
  });

  const filteredGrns = grns.filter((grn) => {
    if (grnStatusFilter !== "ALL" && grn.status !== grnStatusFilter) return false;
    if (!termLower) return true;
    const poNumber = grn.purchaseOrder?.poNumber?.toLowerCase() || "";
    const supplierName = grn.purchaseOrder?.supplier?.companyName?.toLowerCase() || "";
    return (
      grn.grnNumber.toLowerCase().includes(termLower) ||
      poNumber.includes(termLower) ||
      supplierName.includes(termLower)
    );
  });

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink font-bold tracking-tight">Procurement</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Suppliers, purchase requests, orders, and goods receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            title="Refresh"
            className="p-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-sm border border-border bg-surface hover:bg-page-bg text-[13px] font-medium text-ink flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            Export
          </button>

          {activeTab === "suppliers" && (
            <button
              onClick={() => setSupplierModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Supplier
            </button>
          )}

          {activeTab === "purchase-requests" && (
            <button
              onClick={() => setPrModalOpen(true)}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Requisition
            </button>
          )}

          {activeTab === "purchase-orders" && (
            <button
              onClick={() => {
                setSelectedPrForPo(undefined);
                setPoModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate PO
            </button>
          )}

          {activeTab === "grn" && (
            <button
              onClick={() => {
                if (purchaseOrders.length > 0) {
                  setSelectedPoForGrn(purchaseOrders[0]);
                  setGrnModalOpen(true);
                } else {
                  addToast("info", "Please create a Purchase Order before recording Goods Receipts.");
                }
              }}
              className="px-3.5 py-2 rounded-sm bg-primary hover:bg-primary-hover text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Receive Goods
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Total Spend</p>
          <p className="text-h2 font-bold text-ink mt-1 tabular-nums font-mono">
            ৳{stats.totalSpend.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">Confirmed POs</p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Purchase Orders</p>
          <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.totalPOs}</p>
          <p className="text-[11px] text-text-muted mt-0.5">Vendor contracts</p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Requisitions</p>
          <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.pendingPRs}</p>
          <p className="text-[11px] mt-0.5">
            {stats.pendingPRs > 0 ? (
              <span className="text-warning font-medium">Awaiting approval</span>
            ) : approvedPendingPoCount > 0 ? (
              <span className="text-primary font-medium">{approvedPendingPoCount} approved, no PO</span>
            ) : (
              <span className="text-success font-medium">All completed</span>
            )}
          </p>
        </div>

        <div className="p-4 rounded-sm border border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Active Suppliers</p>
          <p className="text-h1 font-bold text-ink mt-1 tabular-nums">{stats.activeSuppliers}</p>
          <p className="text-[11px] text-success font-medium mt-0.5">Verified vendors</p>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface px-3 rounded-t-sm overflow-x-auto">
          <button
            onClick={() => handleTabChange("suppliers")}
            className={`py-2.5 px-4 text-[13px] font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "suppliers"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Suppliers</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-page-bg text-text-muted ml-0.5">
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("purchase-requests")}
            className={`py-2.5 px-4 text-[13px] font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "purchase-requests"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Requisitions</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-page-bg text-text-muted ml-0.5">
              {purchaseRequests.length}
            </span>
            {stats.pendingPRs > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-warning-tint text-warning font-semibold">
                {stats.pendingPRs}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("purchase-orders")}
            className={`py-2.5 px-4 text-[13px] font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "purchase-orders"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Purchase Orders</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-page-bg text-text-muted ml-0.5">
              {purchaseOrders.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("grn")}
            className={`py-2.5 px-4 text-[13px] font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "grn"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Goods Receipts</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-page-bg text-text-muted ml-0.5">
              {grns.length}
            </span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-b-md border border-border bg-surface shadow-elevation-1 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder={
                activeTab === "suppliers"
                  ? "Search suppliers by company name, vendor code, or contact..."
                  : activeTab === "purchase-requests"
                  ? "Search requisitions by PR number, branch, or items..."
                  : activeTab === "purchase-orders"
                  ? "Search purchase orders by PO number, supplier, or branch..."
                  : "Search goods receipt notes by GRN number, PO, or supplier..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {activeTab === "purchase-requests" && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-caption font-medium text-text-muted whitespace-nowrap">Status:</span>
              <select
                value={prStatusFilter}
                onChange={(e) => setPrStatusFilter(e.target.value)}
                className="px-3 py-2 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary outline-none font-medium min-w-[210px]"
              >
                <option value="ALL">All Statuses ({purchaseRequests.length})</option>
                <option value="PENDING">Pending Approval ({stats.pendingPRs})</option>
                <option value="APPROVED_AWAITING_PO">⚡ Approved — Awaiting PO ({approvedPendingPoCount})</option>
                <option value="APPROVED_PO_DONE">✅ Approved — PO Completed ({approvedPoDoneCount})</option>
                <option value="APPROVED">All Approved ({approvedPrs.length})</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}

          {activeTab === "purchase-orders" && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-caption font-medium text-text-muted whitespace-nowrap">Branch:</span>
              <select
                value={poBranchFilter}
                onChange={(e) => setPoBranchFilter(e.target.value)}
                className="px-3 py-2 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary outline-none font-medium min-w-[150px]"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "grn" && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-caption font-medium text-text-muted whitespace-nowrap">QC Status:</span>
              <select
                value={grnStatusFilter}
                onChange={(e) => setGrnStatusFilter(e.target.value)}
                className="px-3 py-2 text-caption rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary outline-none font-medium min-w-[160px]"
              >
                <option value="ALL">All Receipts</option>
                <option value="COMPLETE">Complete (Passed QC)</option>
                <option value="PARTIAL">Partial Receipt</option>
                <option value="DISCREPANT">Discrepant (Short / Damaged)</option>
              </select>
            </div>
          )}

          {(searchTerm || prStatusFilter !== "ALL" || poBranchFilter !== "ALL" || grnStatusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setPrStatusFilter("ALL");
                setPoBranchFilter("ALL");
                setGrnStatusFilter("ALL");
              }}
              className="px-3 py-2 text-caption font-medium text-text-muted hover:text-ink whitespace-nowrap transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Suppliers */}
      {activeTab === "suppliers" && (
        <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/80 text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor Code</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Phone / Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-body">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-text-muted/40" />
                        <p className="text-body font-medium text-ink">No suppliers found</p>
                        <p className="text-caption text-text-muted">
                          {searchTerm ? "Try adjusting your search criteria" : "Click 'New Supplier' to register one"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const primaryContact = s.contacts?.find((c) => c.isPrimary) || s.contacts?.[0];
                    return (
                      <tr key={s.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                          {s.supplierCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink">
                          {s.companyName}
                        </td>
                        <td className="py-3.5 px-4 text-body text-ink">
                          {primaryContact?.name ? (
                            <span className="font-medium">{primaryContact.name}</span>
                          ) : (
                            <span className="text-text-muted italic text-caption">No contact listed</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-caption text-text-muted font-mono">
                          {primaryContact?.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-text-muted" /> {primaryContact.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label font-medium ${
                              s.isActive
                                ? "bg-success-tint text-success"
                                : "bg-danger-tint text-danger"
                            }`}
                          >
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplierForDrawer(s);
                              setSupplierDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium rounded-sm border border-border bg-surface hover:bg-page-bg text-ink transition-colors shadow-elevation-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-text-muted" />
                            <span>View / Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
            <span>
              Showing <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> supplier records
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Purchase Requisitions (PR) */}
      {activeTab === "purchase-requests" && (
        <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/80 text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">PR Number</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Requisition Items</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">PO Fulfillment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-body">
                {filteredPrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="w-8 h-8 text-text-muted/40" />
                        <p className="text-body font-medium text-ink">No purchase requisitions found</p>
                        <p className="text-caption text-text-muted">
                          {searchTerm || prStatusFilter !== "ALL"
                            ? "Try adjusting your filter or search query"
                            : "Click 'New Requisition' to submit a requisition"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPrs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                        {pr.requestNumber}
                      </td>
                      <td className="py-3.5 px-4 text-body text-ink font-medium">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {pr.branch ? `${pr.branch.name} (${pr.branch.code})` : pr.branchId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-caption text-text-muted">
                        <span className="font-semibold text-ink">{pr.lines.length} items</span>
                        {pr.lines[0]?.product && (
                          <span className="text-[11px] text-text-muted block truncate max-w-xs">
                            e.g. {pr.lines[0].product.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-caption text-text-muted">
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label font-medium ${
                            pr.status === "APPROVED"
                              ? "bg-success-tint text-success"
                              : pr.status === "PENDING"
                              ? "bg-warning-tint text-warning"
                              : "bg-danger-tint text-danger"
                          }`}
                        >
                          {pr.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {pr.status === "APPROVED" ? (
                          pr.purchaseOrder ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-medium bg-purple/10 text-purple border border-purple/20">
                                <CheckCircle2 className="w-3 h-3 text-purple" />
                                <span>PO Completed</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const po = purchaseOrders.find(
                                    (p) => p.id === pr.purchaseOrder?.id || p.poNumber === pr.purchaseOrder?.poNumber
                                  );
                                  if (po) {
                                    setSelectedPoForDrawer(po);
                                    setPoDrawerOpen(true);
                                  } else {
                                    handleTabChange("purchase-orders");
                                  }
                                }}
                                className="text-[11px] font-mono font-medium text-primary hover:underline flex items-center gap-1"
                                title="View linked Purchase Order"
                              >
                                <span>{pr.purchaseOrder.poNumber}</span>
                                <Eye className="w-3 h-3 text-text-muted" />
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Awaiting PO</span>
                            </span>
                          )
                        ) : pr.status === "PENDING" ? (
                          <span className="text-caption text-text-muted italic">Pending approval</span>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {pr.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoadingId === pr.id}
                              onClick={() => handleApprovePr(pr.id, pr.requestNumber)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-success hover:bg-success/90 text-white rounded-sm text-caption font-semibold transition-all shadow-sm disabled:opacity-50"
                              title="Approve Requisition"
                            >
                              {actionLoadingId === pr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === pr.id}
                              onClick={() => handleRejectPr(pr.id, pr.requestNumber)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-danger/30 text-danger hover:bg-danger/10 rounded-sm text-caption font-semibold transition-all shadow-sm disabled:opacity-50"
                              title="Reject Requisition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : pr.status === "APPROVED" && !pr.purchaseOrder ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPrForPo(pr.id);
                                setPoModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-sm text-caption font-semibold transition-all shadow-sm"
                              title="Create Purchase Order from this requisition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Create PO</span>
                            </button>
                          </div>
                        ) : pr.status === "APPROVED" && pr.purchaseOrder ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const po = purchaseOrders.find(
                                  (p) => p.id === pr.purchaseOrder?.id || p.poNumber === pr.purchaseOrder?.poNumber
                                );
                                if (po) {
                                  setSelectedPoForDrawer(po);
                                  setPoDrawerOpen(true);
                                } else {
                                  handleTabChange("purchase-orders");
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-sm text-caption font-medium text-ink hover:bg-page-bg transition-colors shadow-elevation-1"
                              title="View linked Purchase Order details"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              <span>View PO</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-caption text-danger font-medium inline-flex items-center justify-end gap-1">
                            <XCircle className="w-4 h-4" />
                            <span>Declined</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
            <span>
              Showing <strong>{filteredPrs.length}</strong> of <strong>{purchaseRequests.length}</strong> requisition records
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Purchase Orders (PO) */}
      {activeTab === "purchase-orders" && (
        <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/80 text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Destination Branch</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4">Receiving Progress</th>
                  <th className="py-3 px-4 text-right">Grand Total (BDT)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-body">
                {filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-text-muted/40" />
                        <p className="text-body font-medium text-ink">No purchase orders found</p>
                        <p className="text-caption text-text-muted">
                          {searchTerm || poBranchFilter !== "ALL"
                            ? "Try adjusting your filter or search query"
                            : "Click 'Generate PO' to issue an order"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPos.map((po) => {
                    const totalOrdered = po.totalOrderedQuantity ?? po.lines.reduce((s, l) => s + Number(l.quantity || 0), 0);
                    const totalReceived = po.totalReceivedQuantity ?? po.lines.reduce((s, l) => s + Number(l.receivedQuantity || 0), 0);
                    const percent = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;
                    const isCancelled = po.fulfillmentStatus === "CANCELLED" || (po as any).status === "CANCELLED";
                    const isFullyReceived = !isCancelled && (po.fulfillmentStatus === "FULLY_RECEIVED" || (totalOrdered > 0 && totalReceived >= totalOrdered));
                    const isPartial = !isCancelled && (po.fulfillmentStatus === "PARTIALLY_RECEIVED" || (totalReceived > 0 && !isFullyReceived));

                    return (
                      <tr key={po.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-xs text-primary block">
                            {po.poNumber}
                          </span>
                          {po.purchaseRequest && (
                            <span className="text-[11px] text-purple block font-sans">
                              via {po.purchaseRequest.requestNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink">
                          {po.supplier?.companyName || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-body text-ink font-medium">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-text-muted" />
                            {po.branch?.name || po.branchId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                              isCancelled
                                ? "bg-red-500/10 text-red-700 border-red-500/20"
                                : isFullyReceived
                                ? "bg-success-tint text-success border-success/30"
                                : isPartial
                                ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            }`}
                          >
                            {isCancelled ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>Cancelled</span>
                              </>
                            ) : isFullyReceived ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Fully Received</span>
                              </>
                            ) : isPartial ? (
                              <>
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Partially Received</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending Receipt</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="font-bold text-ink">{totalReceived} / {totalOrdered}</span>
                              <span className="text-text-muted">{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCancelled ? "bg-danger" : isFullyReceived ? "bg-success" : isPartial ? "bg-primary" : "bg-amber-500"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ink text-body">
                          ৳{Number(po.grandTotal).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPoForDrawer(po);
                                setPoDrawerOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium border border-border rounded-sm bg-surface text-ink hover:bg-page-bg transition-colors shadow-elevation-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              <span>Details</span>
                            </button>
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-caption font-semibold text-text-muted bg-page-bg border border-border rounded-sm cursor-not-allowed">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                <span>Cancelled</span>
                              </span>
                            ) : isFullyReceived ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-caption font-semibold text-text-muted bg-page-bg border border-border rounded-sm cursor-not-allowed">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPoForGrn(po);
                                  setGrnModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-semibold bg-success-tint text-success border border-success/30 rounded-sm hover:bg-success/20 transition-colors shadow-elevation-1"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Receive GRN</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
            <span>
              Showing <strong>{filteredPos.length}</strong> of <strong>{purchaseOrders.length}</strong> purchase orders
            </span>
          </div>
        </div>
      )}

      {/* Tab 4: Goods Receipt Notes (GRN) */}
      {activeTab === "grn" && (
        <div className="rounded-md border border-border bg-surface shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/80 text-caption font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">Purchase Order</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Verified Items & Shortage</th>
                  <th className="py-3 px-4">Consignment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-body">
                {filteredGrns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="w-8 h-8 text-text-muted/40" />
                        <p className="text-body font-medium text-ink">No Goods Receipt Notes found</p>
                        <p className="text-caption text-text-muted">
                          Select a PO under &quot;Purchase Orders&quot; and click &quot;Receive GRN&quot; to inspect goods
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGrns.map((grn) => {
                    const linkedPo = purchaseOrders.find(
                      (p) => p.id === grn.purchaseOrderId || p.poNumber === grn.purchaseOrder?.poNumber
                    );
                    const totalRcvd = grn.lines.reduce((sum, l) => sum + Number(l.quantityReceived || 0), 0);
                    const hasDefects = grn.lines.some((l) => l.condition === "DAMAGED" || l.condition === "WRONG_SKU");
                    const hasShortage =
                      grn.status === "PARTIAL" ||
                      grn.lines.some(
                        (l) =>
                          l.condition === "SHORT" ||
                          (l.purchaseOrderLine && Number(l.purchaseOrderLine.quantity) > Number(l.quantityReceived))
                      );

                    return (
                      <tr key={grn.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGrnForDrawer(grn);
                              setGrnDrawerOpen(true);
                            }}
                            className="font-mono font-bold text-xs text-primary hover:underline text-left block"
                            title="View GRN details"
                          >
                            {grn.grnNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-caption text-purple font-medium">
                          {linkedPo ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPoForDrawer(linkedPo);
                                setPoDrawerOpen(true);
                              }}
                              className="hover:underline flex items-center gap-1"
                              title="View linked Purchase Order"
                            >
                              <span>{linkedPo.poNumber}</span>
                              <Eye className="w-3 h-3 text-text-muted" />
                            </button>
                          ) : (
                            grn.purchaseOrder?.poNumber || grn.purchaseOrderId
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-body font-semibold text-ink">
                          {grn.purchaseOrder?.supplier?.companyName || linkedPo?.supplier?.companyName || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-caption text-text-muted">
                          {new Date(grn.receivedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-caption text-text-muted">
                          <span className="font-semibold text-ink">{totalRcvd} units received</span>
                          <span className="text-[11px] text-text-muted block">
                            across {grn.lines.length} PO lines
                          </span>
                          {hasDefects && (
                            <span className="text-[11px] text-danger font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Defective / Mismatched items flagged</span>
                            </span>
                          )}
                          {hasShortage && !hasDefects && (
                            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Short delivered (partial items)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label font-medium ${
                              grn.status === "COMPLETE"
                                ? "bg-success-tint text-success"
                                : grn.status === "PARTIAL"
                                ? "bg-warning-tint text-warning"
                                : "bg-danger-tint text-danger"
                            }`}
                          >
                            {grn.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGrnForDrawer(grn);
                                setGrnDrawerOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-sm bg-surface hover:bg-page-bg text-ink text-caption font-medium transition-colors shadow-elevation-1"
                              title="View full receipt details and line shortage"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              <span>Details</span>
                            </button>

                            {grn.status === "PARTIAL" && linkedPo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPoForGrn(linkedPo);
                                  setGrnModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-warning-tint text-warning border border-warning/30 hover:bg-warning/20 rounded-sm text-caption font-semibold transition-colors shadow-elevation-1"
                                title="Receive next delivery batch for this PO"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Receive Remaining</span>
                              </button>
                            )}

                            {grn.status === "DISCREPANT" && (
                              <button
                                type="button"
                                disabled={actionLoadingId === grn.id}
                                onClick={() => handleResolveGrnDiscrepancy(grn.id, grn.grnNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-danger-tint text-danger border border-danger/30 hover:bg-danger/20 rounded-sm text-caption font-semibold transition-colors shadow-elevation-1 disabled:opacity-50"
                                title="Approve & resolve discrepancy"
                              >
                                {actionLoadingId === grn.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Resolve</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border bg-page-bg/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption text-text-muted">
            <span>
              Showing <strong>{filteredGrns.length}</strong> of <strong>{grns.length}</strong> goods receipts
            </span>
          </div>
        </div>
      )}

      {/* Modals & Slide-over Drawers */}
      <CreateSupplierModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSuccess={(created) => {
          addToast("success", `Supplier ${created.companyName} created!`);
          fetchData();
        }}
      />

      <CreatePurchaseRequestModal
        isOpen={prModalOpen}
        onClose={() => setPrModalOpen(false)}
        onSuccess={(created) => {
          if (created.status === "APPROVED") {
            addToast("success", `Requisition ${created.requestNumber} created and auto-approved!`);
          } else {
            addToast("success", `Requisition ${created.requestNumber} submitted for approval!`);
          }
          fetchData();
        }}
        products={products}
        branches={branches}
      />

      <CreatePurchaseOrderModal
        isOpen={poModalOpen}
        onClose={() => {
          setPoModalOpen(false);
          setSelectedPrForPo(undefined);
        }}
        onSuccess={(created) => {
          addToast("success", `Purchase Order ${created.poNumber} issued successfully!`);
          fetchData();
        }}
        approvedPrs={approvedPrs}
        suppliers={suppliers}
        products={products}
        branches={branches}
        initialPrId={selectedPrForPo}
      />

      {selectedPoForGrn && (
        <ReceiveGoodsModal
          isOpen={grnModalOpen}
          onClose={() => {
            setGrnModalOpen(false);
            setSelectedPoForGrn(null);
          }}
          onSuccess={(created) => {
            addToast("success", `Goods Receipt ${created.grnNumber} recorded!`);
            fetchData();
          }}
          purchaseOrder={selectedPoForGrn}
          existingGrns={grns}
        />
      )}

      <PurchaseOrderDetailDrawer
        isOpen={poDrawerOpen}
        onClose={() => {
          setPoDrawerOpen(false);
          setSelectedPoForDrawer(null);
        }}
        purchaseOrder={selectedPoForDrawer}
        onRecordGrn={(po) => {
          setSelectedPoForGrn(po);
          setGrnModalOpen(true);
        }}
      />

      <SupplierDetailDrawer
        isOpen={supplierDrawerOpen}
        onClose={() => {
          setSupplierDrawerOpen(false);
          setSelectedSupplierForDrawer(null);
        }}
        supplier={selectedSupplierForDrawer}
        onUpdate={(updated) => {
          addToast("success", `Supplier ${updated.companyName} updated!`);
          fetchData();
        }}
        onDelete={(_id) => {
          addToast("info", "Supplier deleted");
          fetchData();
        }}
      />

      <GrnDetailDrawer
        isOpen={grnDrawerOpen}
        onClose={() => {
          setGrnDrawerOpen(false);
          setSelectedGrnForDrawer(null);
        }}
        grn={selectedGrnForDrawer}
        purchaseOrders={purchaseOrders}
        onViewPo={(po) => {
          setSelectedPoForDrawer(po);
          setPoDrawerOpen(true);
        }}
        onReceiveRemaining={(po) => {
          setSelectedPoForGrn(po);
          setGrnModalOpen(true);
        }}
        onRefresh={fetchData}
        addToast={addToast}
      />
    </div>
  );
};
