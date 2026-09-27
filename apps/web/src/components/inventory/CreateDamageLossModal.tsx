"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { WarehouseDto, ProductDto, BranchDto, DamageLossReportDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateDamageLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: DamageLossReportDto) => void;
  warehouses: WarehouseDto[];
  branches: BranchDto[];
  products: ProductDto[];
}

interface DamageLineItem {
  productId: string;
  quantity: number;
  costBasis: number;
}

export const CreateDamageLossModal: React.FC<CreateDamageLossModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  branches,
  products,
}) => {
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceFileId, setEvidenceFileId] = useState("");
  const [lines, setLines] = useState<DamageLineItem[]>([
    { productId: "", quantity: 1, costBasis: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State sync on modal open
  useEffect(() => {
    if (isOpen) {
      if (!branchId && branches.length > 0) setBranchId(branches[0].id);
      if (!warehouseId && warehouses.length > 0) setWarehouseId(warehouses[0].id);
      setError(null);
    }
  }, [isOpen, branches, warehouses, branchId, warehouseId]);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Damage & Loss Report"
        icon={AlertTriangle}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleAddLine = () => {
    setLines([...lines, { productId: "", quantity: 1, costBasis: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    const updated = [...lines];
    updated[index].productId = productId;
    if (selectedProd && selectedProd.costPrice) {
      updated[index].costBasis = Number(selectedProd.costPrice);
    }
    setLines(updated);
  };

  const handleLineChange = (index: number, field: "quantity" | "costBasis", value: number) => {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  };

  const totalGrossLoss = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.costBasis) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBranchId = branchId || branches[0]?.id;
    const effectiveWarehouseId = warehouseId || warehouses[0]?.id;

    if (!effectiveBranchId || !effectiveWarehouseId || !reason.trim()) {
      setError("Please select branch, warehouse, and provide a detailed reason.");
      return;
    }

    const invalidLine = lines.find((l) => !l.productId || l.quantity <= 0 || l.costBasis < 0);
    if (invalidLine) {
      setError("Please ensure all line items have a selected product and valid quantity.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createDamageLossReport({
        branchId: effectiveBranchId,
        warehouseId: effectiveWarehouseId,
        reason: reason.trim(),
        evidenceFileId: evidenceFileId.trim() || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          costBasis: Number(l.costBasis),
        })),
      });
      onSuccess(res);
      onClose();
      // Reset form
      setReason("");
      setEvidenceFileId("");
      setLines([{ productId: "", quantity: 1, costBasis: 0 }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit damage and loss report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs animate-fadeIn overflow-y-auto ${
        isMaximized ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-surface border border-border shadow-elevation-2 flex flex-col overflow-hidden transition-all duration-200 ${
          isMaximized
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0"
            : "relative w-full max-w-2xl rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border bg-page-bg/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-danger/10 text-danger flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">File Damage & Loss Report</h2>
              <p className="text-caption text-text-muted mt-0.5">Module 74: Document damaged, expired, or written-off inventory</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm text-danger text-body flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Branch <span className="text-danger">*</span>
              </label>
              <select
                value={branchId || (branches[0]?.id ?? "")}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Warehouse Location <span className="text-danger">*</span>
              </label>
              <select
                value={warehouseId || (warehouses[0]?.id ?? "")}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select warehouse...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Incident Reason / Explanation <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Water leakage from ceiling during rainfall in aisle 3"
              className="w-full h-10 px-3 border border-border rounded-sm bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-body font-semibold text-ink">Damaged Products & Quantities</label>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:text-primary-hover"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 border border-border rounded-sm p-3 bg-page-bg/40">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={line.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full h-9 px-2.5 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.sku}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Qty"
                      value={line.quantity || ""}
                      onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-sm border border-border bg-surface text-ink text-body font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Unit Cost"
                      value={line.costBasis || ""}
                      onChange={(e) => handleLineChange(idx, "costBasis", Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-sm border border-border bg-surface text-ink text-body font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>

                  <div className="w-24 text-right font-medium text-caption text-ink font-mono">
                    ৳{((line.quantity || 0) * (line.costBasis || 0)).toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={lines.length === 1}
                    className="p-1 rounded-sm text-text-muted hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 border-t border-border text-body font-semibold">
                <span className="text-text-muted">Total Estimated Gross Loss:</span>
                <span className="text-danger text-body-strong font-bold font-mono">৳{totalGrossLoss.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-sm border border-border bg-surface text-ink text-body font-medium hover:bg-page-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-sm bg-danger text-surface text-body font-medium hover:opacity-90 flex items-center gap-2 shadow-xs transition-opacity disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Submitting..." : "Submit for Manager Review"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
