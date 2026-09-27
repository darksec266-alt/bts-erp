"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Briefcase, AlertCircle, Loader2, Calendar, MapPin, Package } from "lucide-react";
import { api } from "../../lib/api";
import type { ProjectDto, BranchDto, CustomerDto, ProductDto } from "@bts/shared-types";
import { ProductSearchSelect } from "../common/ProductSearchSelect";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: ProjectDto) => void;
  branches: BranchDto[];
  customers: CustomerDto[];
  products: ProductDto[];
  defaultBranchId?: string;
}

interface ProjectItemInput {
  productId: string;
  plannedQty: number;
  unitPrice: number;
  availableStock?: number;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branches,
  customers,
  products,
  defaultBranchId,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [projectCode, setProjectCode] = useState(
    () => `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");

  const [items, setItems] = useState<ProjectItemInput[]>([
    { productId: products[0]?.id || "", plannedQty: 10, unitPrice: Number(products[0]?.sellingPrice) || 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultBranchId) {
      setBranchId(defaultBranchId);
    } else if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, defaultBranchId, branchId]);

  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  useEffect(() => {
    if (products.length > 0 && items.length === 1 && !items[0].productId) {
      setItems([
        {
          productId: products[0].id,
          plannedQty: 10,
          unitPrice: Number(products[0].sellingPrice) || 0,
          availableStock: products[0].totalStock ?? 0,
        },
      ]);
    }
  }, [products]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title={`Project (${projectCode || name || "New"})`}
        icon={<Briefcase className="w-4 h-4" />}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleAddItem = () => {
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd?.id || "",
        plannedQty: 1,
        unitPrice: Number(firstProd?.sellingPrice) || 0,
        availableStock: firstProd?.totalStock ?? 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, selectedProductId: string) => {
    const prod = products.find((p) => p.id === selectedProductId);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          productId: selectedProductId,
          unitPrice: prod ? Number(prod.sellingPrice) || 0 : item.unitPrice,
          availableStock: prod?.totalStock ?? 0,
        };
      })
    );
  };

  const handleItemChange = (index: number, field: "plannedQty" | "unitPrice", value: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalBudget = items.reduce(
    (sum, item) => sum + (Number(item.plannedQty) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project Name is required.");
      return;
    }
    const effectiveCustomerId = customerId || customers[0]?.id;
    const effectiveBranchId = branchId || defaultBranchId || branches[0]?.id;

    if (!effectiveCustomerId) {
      setError("Customer Account is required.");
      return;
    }
    if (!effectiveBranchId) {
      setError("Operating Branch is required.");
      return;
    }
    if (items.some((i) => !i.productId || i.plannedQty <= 0)) {
      setError("All project items must have a selected product and quantity greater than zero.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const created = await api.createProject({
        projectCode: projectCode.trim() || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        customerId: effectiveCustomerId,
        branchId: effectiveBranchId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        siteLocation: siteLocation.trim() || undefined,
        budgetAmount: totalBudget > 0 ? totalBudget : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          plannedQty: Number(item.plannedQty),
          unitPrice: Number(item.unitPrice),
        })),
      });

      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${isMaximized ? "p-0" : "p-4"}`}>
      <div className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0" : "relative w-full max-w-4xl rounded-md my-8"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-page-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 text-ink font-bold leading-tight">Create Long-Term Project</h2>
              <p className="text-caption text-text-muted">
                Define a contract/project scope for phased multi-challan site deliveries and consolidated billing.
              </p>
            </div>
          </div>
          <WindowHeaderActions
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onMinimize={() => setIsMinimized(true)}
            onClose={onClose}
          />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-sm bg-danger-tint border border-danger/20 text-danger text-body flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Project Code
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink font-mono focus:border-primary focus:bg-surface outline-none"
                placeholder="PRJ-2026-XXXX"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Project Title / Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="e.g. Bashundhara R/A Villa Renovation & Material Supply"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Customer Account <span className="text-danger">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                required
              >
                {customers.length === 0 ? (
                  <option value="">No active customers</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} ({c.customerCode})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Operating Branch <span className="text-danger">*</span>
              </label>
              <select
                value={branchId || defaultBranchId || (branches[0]?.id ?? "")}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none cursor-pointer"
                required
              >
                {branches.length === 0 && (
                  <option value="">(No branch available)</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-text-muted" /> Site / Delivery Address
              </label>
              <input
                type="text"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="Plot 42, Road 11, Block C, Dhaka"
              />
            </div>
          </div>

          {/* Dates & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-text-muted" /> Expected Completion Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
              />
            </div>

            <div>
              <label className="block text-caption font-semibold text-ink mb-1.5">
                Contract Scope / Remarks
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none"
                placeholder="Phase 1 structural supply agreement"
              />
            </div>
          </div>

          {/* Planned Items / Scope of Work */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                Planned Project Scope / Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-caption font-semibold text-primary bg-primary-tint rounded-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-left text-body">
                <thead className="bg-page-bg/80 border-b border-border text-caption font-semibold text-text-muted uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Product / Material</th>
                    <th className="py-2.5 px-3 w-32">Planned Qty</th>
                    <th className="py-2.5 px-3 w-36">Unit Price (BDT)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Total (BDT)</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, index) => {
                    const lineTotal = (Number(item.plannedQty) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <tr key={index} className="hover:bg-page-bg/30">
                        <td className="p-2.5">
                          <ProductSearchSelect
                            products={products}
                            selectedProductId={item.productId}
                            onSelect={(prod) => handleProductChange(index, prod ? prod.id : "")}
                            placeholder="Instant search by product name or SKU..."
                            priceType="selling"
                            required
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.plannedQty}
                            onChange={(e) =>
                              handleItemChange(index, "plannedQty", Math.max(1, parseInt(e.target.value) || 0))
                            }
                            className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none text-right font-mono"
                            required
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(index, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="w-full px-2.5 py-1.5 text-body rounded-sm border border-border bg-page-bg text-ink focus:border-primary focus:bg-surface outline-none text-right font-mono"
                            required
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-ink">
                          {lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={items.length <= 1}
                            className="p-1 rounded-sm text-text-muted hover:text-danger hover:bg-danger-tint disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Budget Card */}
            <div className="flex justify-end p-4 bg-page-bg/40 rounded-sm border border-border">
              <div className="flex items-center gap-4">
                <span className="text-body font-semibold text-text-muted">Estimated Project Budget:</span>
                <span className="text-h2 font-bold text-primary font-mono">
                  BDT {totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-body font-medium text-text-muted hover:text-ink hover:bg-page-bg rounded-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-body font-semibold text-white bg-primary rounded-sm hover:opacity-95 disabled:opacity-50 transition-opacity shadow-elevation-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
              {loading ? "Creating Project..." : "Initialize Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
