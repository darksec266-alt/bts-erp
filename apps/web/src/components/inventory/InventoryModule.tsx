"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Warehouse,
  ArrowLeftRight,
  SlidersHorizontal,
  Tag,
  QrCode,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  PackageCheck,
  Eye,
  AlertCircle,
  Filter,
  DollarSign,
  Package,
} from "lucide-react";
import { api } from "../../lib/api";
import type {
  StockLedgerDto,
  StockTransferDto,
  StockAdjustmentDto,
  BatchDto,
  SerialNumberDto,
  DamageLossReportDto,
  InventoryStatsDto,
  WarehouseDto,
  ProductDto,
  BranchDto,
} from "@bts/shared-types";
import { ToastContainer, type ToastMessage } from "../common/Toast";
import { CreateStockAdjustmentModal } from "./CreateStockAdjustmentModal";
import { CreateStockTransferModal } from "./CreateStockTransferModal";
import { ReceiveStockTransferModal } from "./ReceiveStockTransferModal";
import { CreateDamageLossModal } from "./CreateDamageLossModal";
import { ApproveDamageLossModal } from "./ApproveDamageLossModal";
import { SerialHistoryDrawer } from "./SerialHistoryDrawer";
import { CreateBatchModal } from "./CreateBatchModal";
import { CreateSerialModal } from "./CreateSerialModal";

type InventoryTab = "balances" | "transfers" | "adjustments" | "tracking" | "damage-loss";

export const InventoryModule: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as InventoryTab | null;
  const [activeTab, setActiveTab] = useState<InventoryTab>(
    tabParam && ["balances", "transfers", "adjustments", "tracking", "damage-loss"].includes(tabParam)
      ? tabParam
      : "balances"
  );

  useEffect(() => {
    if (tabParam && ["balances", "transfers", "adjustments", "tracking", "damage-loss"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Master lists
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);

  // Inventory data
  const [stats, setStats] = useState<InventoryStatsDto>({
    totalItemsInStock: 0,
    totalValuation: 0,
    lowStockItemsCount: 0,
    activeTransfersCount: 0,
    damageLossReportsCount: 0,
  });
  const [stockList, setStockList] = useState<StockLedgerDto[]>([]);
  const [transfers, setTransfers] = useState<StockTransferDto[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentDto[]>([]);
  const [batches, setBatches] = useState<BatchDto[]>([]);
  const [serials, setSerials] = useState<SerialNumberDto[]>([]);
  const [damageReports, setDamageReports] = useState<DamageLossReportDto[]>([]);

  // Tracking sub-tab
  const [trackingSubTab, setTrackingSubTab] = useState<"serials" | "batches">("serials");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [belowReorderOnly, setBelowReorderOnly] = useState(false);

  // Loading & Toasts
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & Drawers
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransferDto | null>(null);
  const [approvingDamageReport, setApprovingDamageReport] = useState<DamageLossReportDto | null>(null);
  const [inspectingSerial, setInspectingSerial] = useState<string | null>(null);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    setToasts((prev) => [...prev, { id: Math.random().toString(), type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load master data once
  useEffect(() => {
    Promise.all([
      api.getWarehouses({ take: 100 }),
      api.getBranches(),
      api.getProducts({ take: 200 }),
    ])
      .then(([whRes, brRes, prodRes]) => {
        setWarehouses(whRes.items);
        setBranches(brRes.items);
        setProducts(prodRes.items);
      })
      .catch((err) => {
        console.error("Failed to load inventory master data:", err);
      });
  }, []);

  // Fetch all tab data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, stockRes, transferRes, adjustRes, batchRes, serialRes, damageRes] =
        await Promise.all([
          api.getInventoryStats(),
          api.getStock({
            warehouseId: selectedWarehouseId || undefined,
            belowReorderPoint: belowReorderOnly ? true : undefined,
            search: searchTerm || undefined,
            take: 100,
          }),
          api.getStockTransfers({
            warehouseId: selectedWarehouseId || undefined,
            take: 100,
          }),
          api.getStockAdjustments({
            warehouseId: selectedWarehouseId || undefined,
            take: 100,
          }),
          api.getBatches(),
          api.getSerialNumbers({ take: 100 }),
          api.getDamageLossReports({
            warehouseId: selectedWarehouseId || undefined,
            take: 100,
          }),
        ]);

      setStats(statsRes);
      setStockList(stockRes.items);
      setTransfers(transferRes.items);
      setAdjustments(adjustRes.items);
      setBatches(batchRes);
      setSerials(serialRes.items);
      setDamageReports(damageRes.items);
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to load inventory records.");
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouseId, belowReorderOnly, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (tab: InventoryTab) => {
    setActiveTab(tab);
    router.push(`/inventory?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-ink flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-primary" />
            <span>Inventory & Warehouse Management</span>
          </h1>
          <p className="text-body text-text-muted mt-1">
            Real-time stock ledgers, inter-warehouse movements, batch/serial tracking, and loss adjustments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTransferModal(true)}
            className="h-10 px-3.5 rounded-sm bg-surface border border-border hover:bg-page-bg text-ink text-body font-medium flex items-center gap-1.5 shadow-elevation-1 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <span>Transfer Stock</span>
          </button>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="h-10 px-3.5 rounded-sm bg-surface border border-border hover:bg-page-bg text-ink text-body font-medium flex items-center gap-1.5 shadow-elevation-1 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span>Stock Adjustment</span>
          </button>
          <button
            onClick={() => setShowDamageModal(true)}
            className="h-10 px-3.5 rounded-sm bg-surface border border-border hover:bg-page-bg text-danger text-body font-medium flex items-center gap-1.5 shadow-elevation-1 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span>Report Loss/Damage</span>
          </button>
          <button
            onClick={loadData}
            title="Refresh records"
            className="h-10 w-10 flex items-center justify-center rounded-sm border border-border bg-surface hover:bg-page-bg text-text-muted hover:text-ink transition-colors shadow-elevation-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-md bg-surface border border-border shadow-elevation-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-muted">Total Stock Units</p>
            <p className="text-h3 font-bold text-ink">{stats.totalItemsInStock.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-md bg-surface border border-border shadow-elevation-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-muted">Inventory Valuation</p>
            <p className="text-h3 font-bold text-ink">৳{stats.totalValuation.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-md bg-surface border border-border shadow-elevation-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-muted">Low Stock Alerts</p>
            <p className="text-h3 font-bold text-rose-600">{stats.lowStockItemsCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-md bg-surface border border-border shadow-elevation-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-muted">In-Transit Transfers</p>
            <p className="text-h3 font-bold text-ink">{stats.activeTransfersCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-md bg-surface border border-border shadow-elevation-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-caption font-medium text-text-muted">Open Loss Reports</p>
            <p className="text-h3 font-bold text-amber-600">{stats.damageLossReportsCount}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border gap-6 text-body font-medium">
        <button
          onClick={() => handleTabChange("balances")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "balances"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-text-muted hover:text-ink"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Stock Balances</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-page-bg text-text-muted">
            {stockList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("transfers")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "transfers"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-text-muted hover:text-ink"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Stock Transfers</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-page-bg text-text-muted">
            {transfers.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("adjustments")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "adjustments"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-text-muted hover:text-ink"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Adjustments</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-page-bg text-text-muted">
            {adjustments.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("tracking")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "tracking"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-text-muted hover:text-ink"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Batch & Serial Tracking</span>
        </button>

        <button
          onClick={() => handleTabChange("damage-loss")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "damage-loss"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-text-muted hover:text-ink"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Damage & Loss (Module 74)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-page-bg text-text-muted">
            {damageReports.length}
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3.5 rounded-md border border-border shadow-elevation-1">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-sm border border-border bg-page-bg text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="h-9 px-3 rounded-sm border border-border bg-page-bg text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {activeTab === "balances" && (
            <label className="flex items-center gap-2 text-caption text-ink font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={belowReorderOnly}
                onChange={(e) => setBelowReorderOnly(e.target.checked)}
                className="rounded-xs border-border text-primary focus:ring-primary/20"
              />
              <span>Low Stock Only</span>
            </label>
          )}
        </div>
      </div>

      {/* Tab 1: Stock Balances & Ledger */}
      {activeTab === "balances" && (
        <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-body-sm">
                {stockList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <Warehouse className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                      <p className="font-medium">No stock ledger balances recorded</p>
                      <p className="text-caption mt-1">Receive a GRN or make a stock adjustment to add stock.</p>
                    </td>
                  </tr>
                ) : (
                  stockList.map((item) => {
                    const isLow =
                      item.product?.reorderLevel &&
                      item.quantityOnHand <= Number(item.product.reorderLevel);
                    const unitCost = Number(item.product?.costPrice || 0);
                    const totalVal = item.quantityOnHand * unitCost;

                    return (
                      <tr key={item.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-ink">
                          <div>{item.product?.name || "Unknown Product"}</div>
                          <span className="text-caption font-mono text-text-muted">
                            {item.product?.sku || item.productId}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-muted">
                          {item.product?.category?.name || "General"}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          {item.warehouse?.name || item.warehouseId}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-ink">
                          {item.quantityOnHand.toLocaleString()} {item.product?.unit?.code || "units"}
                        </td>
                        <td className="py-3 px-4 text-right text-text-muted">
                          ৳{unitCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-ink">
                          ৳{totalVal.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Adequate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Transfers */}
      {activeTab === "transfers" && (
        <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                  <th className="py-3 px-4">Transfer ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">From Warehouse</th>
                  <th className="py-3 px-4">To Warehouse</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-body">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                      <p className="font-medium">No stock transfers recorded</p>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="mt-3 text-caption font-semibold text-primary hover:underline"
                      >
                        + Create First Transfer
                      </button>
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {t.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        <div>{t.product?.name}</div>
                        <span className="text-caption font-mono text-text-muted">{t.product?.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-text-muted">{t.fromWarehouse?.name || t.fromWarehouseId}</td>
                      <td className="py-3 px-4 font-medium text-ink">{t.toWarehouse?.name || t.toWarehouseId}</td>
                      <td className="py-3 px-4 text-right font-bold text-ink">
                        {Number(t.quantity).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-caption text-text-muted">
                        {new Date(t.dispatchedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                            t.status === "RECEIVED"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : t.status === "DISPATCHED"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {t.status === "DISPATCHED" && (
                          <button
                            onClick={() => setReceivingTransfer(t)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-success hover:bg-success/90 text-white rounded text-caption font-medium shadow-2xs transition-colors"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Adjustments */}
      {activeTab === "adjustments" && (
        <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Adjustment</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-body">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                      <p className="font-medium">No stock adjustments recorded</p>
                      <button
                        onClick={() => setShowAdjustmentModal(true)}
                        className="mt-3 text-caption font-semibold text-primary hover:underline"
                      >
                        + Create Stock Adjustment
                      </button>
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 text-caption text-text-muted">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">{a.warehouse?.name || a.warehouseId}</td>
                      <td className="py-3 px-4 font-medium text-ink">
                        <div>{a.product?.name}</div>
                        <span className="text-caption font-mono text-text-muted">{a.product?.sku}</span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          a.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {a.quantityDelta > 0 ? `+${a.quantityDelta}` : a.quantityDelta}
                      </td>
                      <td className="py-3 px-4 text-text-muted">{a.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-caption font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          {a.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Batch & Serial Tracking */}
      {activeTab === "tracking" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-sm border border-border overflow-hidden p-1 bg-surface">
              <button
                type="button"
                onClick={() => setTrackingSubTab("serials")}
                className={`px-4 py-1.5 rounded-xs text-body font-medium transition-colors ${
                  trackingSubTab === "serials"
                    ? "bg-primary text-surface"
                    : "text-text-muted hover:text-ink"
                }`}
              >
                Serial Numbers ({serials.length})
              </button>
              <button
                type="button"
                onClick={() => setTrackingSubTab("batches")}
                className={`px-4 py-1.5 rounded-xs text-body font-medium transition-colors ${
                  trackingSubTab === "batches"
                    ? "bg-primary text-surface"
                    : "text-text-muted hover:text-ink"
                }`}
              >
                Batches & Lots ({batches.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {trackingSubTab === "serials" ? (
                <button
                  onClick={() => setShowSerialModal(true)}
                  className="h-8 px-3 rounded-sm bg-primary hover:bg-primary-hover text-surface text-caption font-medium flex items-center gap-1.5 shadow-elevation-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Serial</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="h-8 px-3 rounded-sm bg-primary hover:bg-primary-hover text-surface text-caption font-medium flex items-center gap-1.5 shadow-elevation-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Batch</span>
                </button>
              )}
            </div>
          </div>

          {trackingSubTab === "serials" ? (
            <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Product Item</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body">
                  {serials.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-text-muted">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                        <p className="font-medium">No serial numbers registered yet</p>
                      </td>
                    </tr>
                  ) : (
                    serials.map((s) => (
                      <tr key={s.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-ink">{s.serial}</td>
                        <td className="py-3 px-4 font-medium text-ink">
                          <div>{s.product?.name}</div>
                          <span className="text-caption font-mono text-text-muted">{s.product?.sku}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-caption font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            {s.currentStage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setInspectingSerial(s.serial)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-surface hover:bg-page-bg border border-border rounded-sm text-caption font-medium text-ink shadow-elevation-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Audit Trail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                    <th className="py-3 px-4">Batch / Lot Code</th>
                    <th className="py-3 px-4">Product Item</th>
                    <th className="py-3 px-4">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-text-muted">
                        <Tag className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                        <p className="font-medium">No batch codes registered yet</p>
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.id} className="hover:bg-page-bg/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-ink">{b.batchCode}</td>
                        <td className="py-3 px-4 font-medium text-ink">{b.product?.name}</td>
                        <td className="py-3 px-4 text-caption text-text-muted">
                          {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "No Expiry"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Damage & Loss Reports (Module 74) */}
      {activeTab === "damage-loss" && (
        <div className="bg-surface rounded-md border border-border shadow-elevation-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-page-bg/60 text-caption uppercase tracking-wider text-text-muted font-semibold">
                  <th className="py-3 px-4">Report Number</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Gross Loss</th>
                  <th className="py-3 px-4 text-center">Disposition</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-body">
                {damageReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-text-muted/60" />
                      <p className="font-medium">No damage or loss incidents reported</p>
                      <button
                        onClick={() => setShowDamageModal(true)}
                        className="mt-3 text-caption font-semibold text-danger hover:underline"
                      >
                        + File Damage / Loss Report
                      </button>
                    </td>
                  </tr>
                ) : (
                  damageReports.map((r) => (
                    <tr key={r.id} className="hover:bg-page-bg/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-ink">{r.reportNumber}</td>
                      <td className="py-3 px-4 font-medium text-ink">{r.warehouse?.name || r.warehouseId}</td>
                      <td className="py-3 px-4 text-text-muted max-w-xs truncate">{r.reason}</td>
                      <td className="py-3 px-4 text-right font-bold text-danger">
                        ৳{Number(r.grossLoss || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-xs text-[11px] font-semibold bg-page-bg text-text-muted border border-border">
                          {r.disposition || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-caption font-semibold border ${
                            r.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === "REPORTED" && (
                          <button
                            onClick={() => setApprovingDamageReport(r)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded text-caption font-medium shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review & Approve</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <CreateStockAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        onSuccess={(_adj) => {
          addToast("success", `Stock adjustment applied successfully.`);
          loadData();
        }}
        warehouses={warehouses}
        products={products}
      />

      <CreateStockTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={(_transfer) => {
          addToast("success", `Stock transfer dispatched successfully.`);
          loadData();
        }}
        warehouses={warehouses}
        products={products}
      />

      <ReceiveStockTransferModal
        transfer={receivingTransfer}
        isOpen={!!receivingTransfer}
        onClose={() => setReceivingTransfer(null)}
        onSuccess={(updated) => {
          addToast(
            "success",
            `Stock transfer marked as ${updated.status}. Stock balances updated!`
          );
          loadData();
        }}
      />

      <CreateDamageLossModal
        isOpen={showDamageModal}
        onClose={() => setShowDamageModal(false)}
        onSuccess={(rep) => {
          addToast("success", `Report ${rep.reportNumber} filed for manager approval.`);
          loadData();
        }}
        warehouses={warehouses}
        branches={branches}
        products={products}
      />

      <ApproveDamageLossModal
        report={approvingDamageReport}
        isOpen={!!approvingDamageReport}
        onClose={() => setApprovingDamageReport(null)}
        onSuccess={(rep) => {
          addToast("success", `Damage report ${rep.reportNumber} approved and executed.`);
          loadData();
        }}
      />

      <CreateBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSuccess={(batch) => {
          addToast("success", `Batch ${batch.batchCode} registered successfully.`);
          loadData();
        }}
        products={products}
      />

      <CreateSerialModal
        isOpen={showSerialModal}
        onClose={() => setShowSerialModal(false)}
        onSuccess={(serial) => {
          addToast("success", `Serial number ${serial.serial} registered.`);
          loadData();
        }}
        products={products}
      />

      <SerialHistoryDrawer
        serial={inspectingSerial}
        isOpen={!!inspectingSerial}
        onClose={() => setInspectingSerial(null)}
      />
    </div>
  );
};
