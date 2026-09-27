"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Building2,
  Calendar,
  MapPin,
  Truck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Receipt,
  Layers,
  Check,
  Trash2,
} from "lucide-react";
import { api } from "../../lib/api";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";
import type {
  ProjectDto,
  DeliveryChallanDto,
  InvoiceDto,
  ProjectStatus,
  ProductDto,
} from "@bts/shared-types";

interface ProjectDetailDrawerProps {
  project: ProjectDto | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated?: () => void;
  products: ProductDto[];
  onViewInvoice?: (invoice: InvoiceDto) => void;
}

export const ProjectDetailDrawer: React.FC<ProjectDetailDrawerProps> = ({
  project: initialProject,
  isOpen,
  onClose,
  onProjectUpdated,
  products,
  onViewInvoice,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [project, setProject] = useState<ProjectDto | null>(initialProject);
  const [activeTab, setActiveTab] = useState<"items" | "challans" | "invoices">("items");
  const [_loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Challans and Invoices for this project
  const [challans, setChallans] = useState<DeliveryChallanDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);

  // Dispatch Challan Sub-modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchChallanNumber, setDispatchChallanNumber] = useState("");
  const [dispatchLines, setDispatchLines] = useState<{ productId: string; quantity: number }[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Billing consolidation selection
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState<string | null>(null);
  const [billSuccess, setBillSuccess] = useState<string | null>(null);

  // Add Item inline form
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemProductId, setAddItemProductId] = useState("");
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemPrice, setAddItemPrice] = useState(0);
  const [addItemDesc, setAddItemDesc] = useState("");
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // Reload project and its child records
  const reloadProjectData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const [projData, challanRes, invoiceRes] = await Promise.all([
        api.getProject(id),
        api.getDeliveryChallans({ projectId: id, take: 100 }),
        api.getInvoices({ projectId: id, take: 100 }),
      ]);
      setProject(projData);
      setChallans(challanRes.items || []);
      setInvoices(invoiceRes.items || []);
    } catch (err) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && initialProject?.id) {
      setProject(initialProject);
      setSelectedChallanIds([]);
      setBillError(null);
      setBillSuccess(null);
      reloadProjectData(initialProject.id);
    }
  }, [isOpen, initialProject, reloadProjectData]);

  if (!isOpen || !project) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Project: ${project.name || project.projectCode}`}
        icon={<Building2 className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  // Handle status update
  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      setStatusUpdating(true);
      const updated = await api.updateProjectStatus(project.id, newStatus);
      setProject(updated);
      onProjectUpdated?.();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Add a new product item to this project
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemProductId) { setAddItemError("Please select a product."); return; }
    if (addItemQty <= 0) { setAddItemError("Quantity must be > 0."); return; }
    try {
      setAddItemLoading(true);
      setAddItemError(null);
      const updated = await api.addProjectItem(project.id, {
        productId: addItemProductId,
        plannedQty: addItemQty,
        unitPrice: addItemPrice,
        description: addItemDesc || undefined,
      });
      setProject(updated);
      setAddItemOpen(false);
      setAddItemProductId("");
      setAddItemQty(1);
      setAddItemPrice(0);
      setAddItemDesc("");
      onProjectUpdated?.();
    } catch (err) {
      setAddItemError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setAddItemLoading(false);
    }
  };

  // Remove a product item from this project
  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("Remove this item from the project?")) return;
    try {
      const updated = await api.removeProjectItem(project.id, itemId);
      setProject(updated);
      onProjectUpdated?.();
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  // Open Dispatch Modal with initialized lines from project items
  const handleOpenDispatchModal = () => {
    setDispatchChallanNumber(`CH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    if (project.items && project.items.length > 0) {
      setDispatchLines(
        project.items.map((i) => ({
          productId: i.productId,
          quantity: Math.max(1, i.plannedQty - (i.dispatchedQty ?? 0)),
        }))
      );
    } else {
      setDispatchLines([]);
    }
    setDispatchError(null);
    setDispatchModalOpen(true);
  };

  // Submit new Project Challan
  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeLines = dispatchLines.filter((l) => l.productId && l.quantity > 0);
    if (activeLines.length === 0) {
      setDispatchError("At least one product with quantity > 0 must be selected for delivery.");
      return;
    }

    try {
      setDispatchLoading(true);
      setDispatchError(null);

      await api.createProjectChallan(project.id, {
        challanNumber: dispatchChallanNumber.trim() || undefined,
        lines: activeLines,
      });

      setDispatchModalOpen(false);
      await reloadProjectData(project.id);
      onProjectUpdated?.();
      setActiveTab("challans");
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : "Failed to dispatch delivery challan.");
    } finally {
      setDispatchLoading(false);
    }
  };

  // Consolidate Selected Unbilled Challans into an Invoice
  const handleConsolidateBill = async () => {
    if (selectedChallanIds.length === 0) {
      setBillError("Please select at least one unbilled challan to generate an invoice.");
      return;
    }

    try {
      setBillLoading(true);
      setBillError(null);
      setBillSuccess(null);

      const invoice = await api.createProjectInvoice(project.id, {
        challanIds: selectedChallanIds,
      });

      setBillSuccess(`Consolidated Invoice ${invoice.invoiceNumber} created successfully!`);
      setSelectedChallanIds([]);
      await reloadProjectData(project.id);
      onProjectUpdated?.();
      setActiveTab("invoices");
    } catch (err) {
      setBillError(err instanceof Error ? err.message : "Failed to consolidate invoice.");
    } finally {
      setBillLoading(false);
    }
  };

  // Select all unbilled challans
  const handleSelectAllUnbilled = () => {
    const unbilled = challans.filter((c) => c.billingStatus === "UNBILLED").map((c) => c.id);
    setSelectedChallanIds(unbilled);
  };

  const toggleChallanSelect = (id: string) => {
    setSelectedChallanIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const unbilledChallanCount = challans.filter((c) => c.billingStatus === "UNBILLED").length;
  const progressPercent = Number(project.fulfillmentProgress || 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs animate-fadeIn">
      <div className={`bg-surface h-full shadow-elevation-2 flex flex-col border-l border-border animate-slideLeft overflow-hidden transition-all duration-200 ${
        isMaximized ? "w-full max-w-none" : "w-full max-w-4xl"
      }`}>
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-page-bg/40 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                {project.projectCode}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  project.status === "ACTIVE"
                    ? "bg-success-tint text-success border border-success/20"
                    : project.status === "COMPLETED"
                    ? "bg-primary-tint text-primary border border-primary/20"
                    : project.status === "ON_HOLD"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-surface text-text-muted border border-border"
                }`}
              >
                {project.status}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-tint text-purple">
                Long-Term Site Project
              </span>
            </div>
            <h2 className="text-h2 text-ink font-bold leading-tight">{project.name}</h2>
            {project.description && (
              <p className="text-body text-text-muted">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Switcher Dropdown */}
            <select
              value={project.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
              className="text-caption font-semibold px-2.5 py-1 rounded-sm border border-border bg-surface text-ink focus:border-primary outline-none cursor-pointer"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active Delivery</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <WindowHeaderActions
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized(!isMaximized)}
              onMinimize={() => setIsMinimized(true)}
              onClose={onClose}
            />
          </div>
        </div>

        {/* Project Metadata Banner & KPI Metrics */}
        <div className="p-6 border-b border-border bg-page-bg/20 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-caption">
            <div className="flex items-center gap-2 text-text-muted">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="block font-medium text-ink">{project.customer?.displayName || "—"}</span>
                <span>Customer</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-muted">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="block font-medium text-ink">{project.siteLocation || "—"}</span>
                <span>Delivery Site</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-muted">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="block font-medium text-ink">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
                </span>
                <span>Start Date</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-text-muted">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="block font-medium text-ink">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : "Ongoing"}
                </span>
                <span>Target Date</span>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-surface rounded-sm border border-border shadow-elevation-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Total Budget
              </span>
              <span className="text-h3 font-bold text-ink font-mono mt-1 block">
                BDT {Number(project.budgetAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>

            <div className="p-3 bg-surface rounded-sm border border-border shadow-elevation-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Dispatched Value
              </span>
              <span className="text-h3 font-bold text-primary font-mono mt-1 block">
                BDT {Number(project.totalDispatchedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>

            <div className="p-3 bg-surface rounded-sm border border-border shadow-elevation-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Invoiced Amount
              </span>
              <span className="text-h3 font-bold text-success font-mono mt-1 block">
                BDT {Number(project.totalInvoicedAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
              </span>
            </div>

            <div className="p-3 bg-surface rounded-sm border border-border shadow-elevation-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
                Unbilled Challans
              </span>
              <span className="text-h3 font-bold text-amber-600 font-mono mt-1 block">
                {unbilledChallanCount} {unbilledChallanCount === 1 ? "Challan" : "Challans"}
              </span>
            </div>
          </div>

          {/* Fulfillment Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-caption font-semibold">
              <span className="text-text-muted">Delivery Fulfillment Progress</span>
              <span className="text-primary font-mono">{progressPercent.toFixed(1)}% Completed</span>
            </div>
            <div className="w-full h-2 bg-page-bg rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-page-bg/40 px-6">
          <button
            onClick={() => setActiveTab("items")}
            className={`py-3 px-4 text-caption font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "items"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Layers className="w-4 h-4" />
            Planned Scope & Items ({project.items?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab("challans")}
            className={`py-3 px-4 text-caption font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "challans"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Truck className="w-4 h-4" />
            Delivery Challans ({challans.length})
            {unbilledChallanCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {unbilledChallanCount} Unbilled
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`py-3 px-4 text-caption font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "invoices"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-ink"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Commercial Invoices ({invoices.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PLANNED ITEMS */}
          {activeTab === "items" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h3 font-bold text-ink">Project Material Scope</h3>
                  <p className="text-caption text-text-muted">
                    Total agreed deliverables and continuous dispatch tracking.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setAddItemOpen(true); setAddItemError(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-bold text-primary border border-primary rounded-sm hover:bg-primary-tint transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product
                  </button>
                  <button
                    onClick={handleOpenDispatchModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-bold text-white bg-primary rounded-sm hover:opacity-95 shadow-elevation-1"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Dispatch Challan to Site
                  </button>
                </div>
              </div>

              {/* Add Item Inline Form */}
              {addItemOpen && (
                <form
                  onSubmit={handleAddItem}
                  className="border border-primary/30 rounded-sm bg-primary-tint/20 p-4 space-y-3"
                >
                  <p className="text-caption font-bold text-primary">Add New Product to Project Scope</p>
                  {addItemError && (
                    <div className="p-2 rounded-sm bg-danger-tint text-danger text-caption flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {addItemError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-caption font-semibold text-ink mb-1">Product</label>
                      <ProductSearchSelect
                        products={products}
                        selectedProductId={addItemProductId}
                        onSelect={(prod) => {
                          setAddItemProductId(prod ? prod.id : "");
                          if (prod) {
                            setAddItemPrice(Number(prod.sellingPrice) || 0);
                          }
                        }}
                        placeholder="Instant search by product name or SKU..."
                        priceType="selling"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-caption font-semibold text-ink mb-1">Planned Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={addItemQty}
                        onChange={(e) => setAddItemQty(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-caption font-semibold text-ink mb-1">Unit Price (BDT)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={addItemPrice}
                        onChange={(e) => setAddItemPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setAddItemOpen(false)}
                      className="px-3 py-1.5 text-caption font-semibold text-text-muted hover:text-ink rounded-sm border border-border hover:bg-page-bg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addItemLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-caption font-bold text-white bg-primary rounded-sm hover:opacity-95 disabled:opacity-50"
                    >
                      {addItemLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add Item
                    </button>
                  </div>
                </form>
              )}

              <div className="border border-border rounded-sm overflow-hidden bg-surface">
                <table className="w-full text-left text-body">
                  <thead className="bg-page-bg/80 border-b border-border text-caption font-semibold text-text-muted uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product / Material</th>
                      <th className="py-2.5 px-3 text-right">Planned Qty</th>
                      <th className="py-2.5 px-3 text-right">Dispatched Qty</th>
                      <th className="py-2.5 px-3 text-right">Remaining</th>
                      <th className="py-2.5 px-3 text-right">Unit Price (BDT)</th>
                      <th className="py-2.5 px-3 text-right">Total Budget</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {project.items?.map((item) => {
                      const dispatched = item.dispatchedQty || 0;
                      const remaining = Math.max(0, item.plannedQty - dispatched);
                      const isFullyDelivered = dispatched >= item.plannedQty;
                      return (
                        <tr key={item.id} className="hover:bg-page-bg/30">
                          <td className="p-3">
                            <span className="font-semibold text-ink block">{item.product?.name}</span>
                            <span className="font-mono text-xs text-text-muted">{item.product?.sku}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-ink">
                            {item.plannedQty}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-primary">
                            {dispatched}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-text-muted">
                            {remaining}
                          </td>
                          <td className="p-3 text-right font-mono text-ink">
                            {item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-ink">
                            {item.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            {isFullyDelivered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-tint text-success">
                                <CheckCircle2 className="w-3 h-3" /> Fulfilled
                              </span>
                            ) : dispatched > 0 ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-tint text-primary">
                                In Progress
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted border border-border">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {dispatched === 0 ? (
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item from project"
                                className="p-1 rounded text-danger/60 hover:text-danger hover:bg-danger-tint transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-text-muted italic">Dispatched</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERY CHALLANS */}
          {activeTab === "challans" && (
            <div className="space-y-4">
              {/* Actions Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-page-bg/30 rounded-sm border border-border">
                <div>
                  <h3 className="text-h3 font-bold text-ink">Site Delivery Challans</h3>
                  <p className="text-caption text-text-muted">
                    Individual vehicle shipments dispatched to the project site.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenDispatchModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-bold text-white bg-primary rounded-sm hover:opacity-95 shadow-elevation-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Site Challan
                  </button>

                  {unbilledChallanCount > 0 && (
                    <button
                      onClick={handleConsolidateBill}
                      disabled={billLoading || selectedChallanIds.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-bold text-white bg-success rounded-sm hover:opacity-95 disabled:opacity-50 shadow-elevation-1"
                    >
                      {billLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5" />
                      )}
                      Consolidate & Bill ({selectedChallanIds.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Success / Error Banners */}
              {billSuccess && (
                <div className="p-3 rounded-sm bg-success-tint border border-success/20 text-success text-body flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{billSuccess}</span>
                </div>
              )}
              {billError && (
                <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{billError}</span>
                </div>
              )}

              {/* Selection Helper */}
              {unbilledChallanCount > 0 && (
                <div className="flex items-center justify-between px-2 text-caption">
                  <span className="text-text-muted">
                    Tip: Check single or multiple unbilled challans below to generate a single consolidated commercial bill.
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllUnbilled}
                    className="text-primary font-semibold hover:underline"
                  >
                    Select All Unbilled ({unbilledChallanCount})
                  </button>
                </div>
              )}

              {/* Challans Table */}
              <div className="border border-border rounded-sm overflow-hidden bg-surface">
                {challans.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No delivery challans dispatched yet.</p>
                    <p className="text-caption mt-1">
                      Click &ldquo;New Site Challan&rdquo; above to dispatch materials to this project.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-body">
                    <thead className="bg-page-bg/80 border-b border-border text-caption font-semibold text-text-muted uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          {unbilledChallanCount > 0 && <span>Select</span>}
                        </th>
                        <th className="py-2.5 px-3">Challan #</th>
                        <th className="py-2.5 px-3">Dispatched Date</th>
                        <th className="py-2.5 px-3">Shipped Items</th>
                        <th className="py-2.5 px-3 text-center">Billing Status</th>
                        <th className="py-2.5 px-3 text-right">Commercial Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {challans.map((challan) => {
                        const isUnbilled = challan.billingStatus === "UNBILLED";
                        const isSelected = selectedChallanIds.includes(challan.id);
                        return (
                          <tr
                            key={challan.id}
                            className={`hover:bg-page-bg/30 ${isSelected ? "bg-primary-tint/20" : ""}`}
                          >
                            <td className="p-3 text-center">
                              {isUnbilled ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleChallanSelect(challan.id)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                />
                              ) : (
                                <Check className="w-4 h-4 text-success mx-auto" />
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-ink">{challan.challanNumber}</span>
                            </td>
                            <td className="p-3 text-caption text-text-muted">
                              {new Date(challan.dispatchedAt).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="space-y-1">
                                {challan.lines?.map((line) => (
                                  <div key={line.id} className="text-caption text-ink flex items-center gap-1.5">
                                    <span className="font-medium">{line.product?.name || "Item"}:</span>
                                    <span className="font-mono font-bold text-primary">{line.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {isUnbilled ? (
                                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  UNBILLED
                                </span>
                              ) : (
                                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-tint text-success border border-success/20">
                                  BILLED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {challan.invoice ? (
                                <button
                                  onClick={async () => {
                                    if (challan.invoice?.id) {
                                      const fullInv = await api.getInvoice(challan.invoice.id);
                                      onViewInvoice?.(fullInv);
                                    }
                                  }}
                                  className="font-mono text-caption text-primary font-bold hover:underline"
                                >
                                  {challan.invoice.invoiceNumber}
                                </button>
                              ) : (
                                <span className="text-caption text-text-muted italic">Pending Billing</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMMERCIAL INVOICES */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h3 font-bold text-ink">Project Commercial Invoices</h3>
                  <p className="text-caption text-text-muted">
                    Consolidated invoices issued against delivered challans for commercial payment.
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-sm overflow-hidden bg-surface">
                {invoices.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No invoices generated for this project yet.</p>
                    <p className="text-caption mt-1">
                      Go to the &ldquo;Delivery Challans&rdquo; tab and select unbilled challans to consolidate into a single bill.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-body">
                    <thead className="bg-page-bg/80 border-b border-border text-caption font-semibold text-text-muted uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Billing Date</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Consolidated Challans</th>
                        <th className="py-2.5 px-3 text-right">Grand Total (BDT)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-page-bg/30">
                          <td className="p-3">
                            <span className="font-mono font-bold text-primary block">{inv.invoiceNumber}</span>
                          </td>
                          <td className="p-3 text-caption text-text-muted">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-caption text-text-muted">
                            {inv.branch?.name || "Head Office"}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {inv.challans?.map((ch) => (
                                <span
                                  key={ch.id}
                                  className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-page-bg text-text-muted border border-border"
                                >
                                  {ch.challanNumber}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-ink">
                            {inv.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-tint text-success">
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onViewInvoice?.(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-semibold text-primary hover:bg-primary-tint rounded-sm transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              View / Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dispatch Challan Sub-Modal */}
        {dispatchModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-surface rounded-md border border-border shadow-elevation-2 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-page-bg/50">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h3 className="text-h3 font-bold text-ink">Dispatch Delivery Challan to Site</h3>
                </div>
                <button
                  onClick={() => setDispatchModalOpen(false)}
                  className="p-1 rounded text-text-muted hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitDispatch} className="p-6 space-y-4">
                {dispatchError && (
                  <div className="p-3 rounded-sm bg-danger-tint text-danger text-body flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{dispatchError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-ink mb-1">
                      Challan Number
                    </label>
                    <input
                      type="text"
                      value={dispatchChallanNumber}
                      onChange={(e) => setDispatchChallanNumber(e.target.value)}
                      className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg font-mono text-ink outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-ink mb-1">
                      Destination Site
                    </label>
                    <input
                      type="text"
                      disabled
                      value={project.siteLocation || "Customer Site"}
                      className="w-full px-3 py-1.5 text-body rounded-sm border border-border bg-page-bg text-text-muted outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-caption font-semibold text-ink">
                    Select Products & Quantities for this Shipment
                  </label>
                  <div className="border border-border rounded-sm max-h-60 overflow-y-auto divide-y divide-border">
                    {dispatchLines.map((line, idx) => {
                      const projItem = project.items?.find((i) => i.productId === line.productId);
                      const prod = products.find((p) => p.id === line.productId) || projItem?.product;
                      const shipped = projItem?.dispatchedQty || 0;
                      const remaining = projItem ? Math.max(0, projItem.plannedQty - shipped) : 0;
                      return (
                        <div key={idx} className="p-3 flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <span className="font-semibold text-ink block">{prod?.name || "Product"}</span>
                            <span className="text-caption text-text-muted">
                              Planned: {projItem?.plannedQty || 0} | Already Shipped: {shipped} | Remaining: {remaining}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 w-36">
                            <input
                              type="number"
                              min="0"
                              max={projItem ? projItem.plannedQty : 9999}
                              value={line.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setDispatchLines((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, quantity: val } : l))
                                );
                              }}
                              className="w-full px-2.5 py-1 text-body text-right rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary"
                            />
                            <span className="text-caption text-text-muted">Qty</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setDispatchModalOpen(false)}
                    className="px-4 py-2 text-body font-medium text-text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dispatchLoading}
                    className="inline-flex items-center gap-2 px-5 py-2 text-body font-semibold text-white bg-primary rounded-sm hover:opacity-95 disabled:opacity-50"
                  >
                    {dispatchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    {dispatchLoading ? "Dispatching..." : "Dispatch Challan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
