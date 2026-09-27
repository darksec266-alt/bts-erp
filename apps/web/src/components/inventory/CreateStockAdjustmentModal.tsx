"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { WarehouseDto, ProductDto, StockAdjustmentDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adjustment: StockAdjustmentDto) => void;
  warehouses: WarehouseDto[];
  products: ProductDto[];
}

export const CreateStockAdjustmentModal: React.FC<CreateStockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
}) => {
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="New Stock Adjustment"
        icon={SlidersHorizontal}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId || !productId || !quantity || Number(quantity) <= 0 || !reason.trim()) {
      setError("Please fill out all required fields with valid values.");
      return;
    }

    setLoading(true);
    setError(null);

    const delta = type === "INCREASE" ? Number(quantity) : -Number(quantity);

    try {
      const res = await api.createStockAdjustment({
        warehouseId,
        productId,
        quantityDelta: delta,
        reason: reason.trim(),
      });
      onSuccess(res);
      onClose();
      // Reset form
      setWarehouseId("");
      setProductId("");
      setQuantity("");
      setReason("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record stock adjustment.");
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
            ? "fixed inset-0 w-full h-full max-w-none max-h-none rounded-none m-0 my-0"
            : "relative w-full max-w-lg rounded-md max-h-[90vh] my-8"
        }`}
      >
        {/* Header with window controls */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-page-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary-tint text-primary flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">New Stock Adjustment</h2>
              <p className="text-caption text-text-muted mt-0.5">Reconcile physical stock discrepancies</p>
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
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-sm flex items-center gap-2 text-danger text-body">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Warehouse <span className="text-danger">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select a warehouse...</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Product / Item <span className="text-danger">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select product to adjust...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Adjustment Type <span className="text-danger">*</span>
              </label>
              <div className="flex rounded-sm border border-border overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => setType("INCREASE")}
                  className={`flex-1 text-body font-medium transition-colors ${
                    type === "INCREASE" ? "bg-primary text-surface" : "bg-surface text-text-muted hover:text-ink"
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setType("DECREASE")}
                  className={`flex-1 text-body font-medium transition-colors ${
                    type === "DECREASE" ? "bg-danger text-surface" : "bg-surface text-text-muted hover:text-ink"
                  }`}
                >
                  - Deduct Stock
                </button>
              </div>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Quantity <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 5"
                className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Reason for Adjustment <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory count discrepancy audit reconciliation"
              className="w-full p-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3 mt-auto">
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
              className="h-10 px-5 rounded-sm bg-primary hover:bg-primary-hover text-surface text-body font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Recording..." : "Apply Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
