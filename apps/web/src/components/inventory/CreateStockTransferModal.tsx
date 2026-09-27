"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { WarehouseDto, ProductDto, StockTransferDto } from "@bts/shared-types";
import { WindowHeaderActions, WindowMinimizedPill } from "../common/WindowContainer";

interface CreateStockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: StockTransferDto) => void;
  warehouses: WarehouseDto[];
  products: ProductDto[];
}

export const CreateStockTransferModal: React.FC<CreateStockTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  products,
}) => {
  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Window management states
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <WindowMinimizedPill
        title="Inter-Warehouse Transfer"
        icon={ArrowLeftRight}
        onRestore={() => setIsMinimized(false)}
        onClose={onClose}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity || Number(quantity) <= 0) {
      setError("Please fill out all fields with valid values.");
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      setError("Source and destination warehouses cannot be the same.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createStockTransfer({
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity: Number(quantity),
      });
      onSuccess(res);
      onClose();
      // Reset form
      setProductId("");
      setFromWarehouseId("");
      setToWarehouseId("");
      setQuantity("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch stock transfer.");
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
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-h2 font-semibold text-ink">New Stock Transfer</h2>
              <p className="text-caption text-text-muted mt-0.5">Dispatch stock between internal company warehouses</p>
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
              Product / Item <span className="text-danger">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            >
              <option value="">Select product to transfer...</option>
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
                Source Warehouse <span className="text-danger">*</span>
              </label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select source...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} disabled={wh.id === toWarehouseId}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-text-muted mb-1">
                Destination Warehouse <span className="text-danger">*</span>
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">Select destination...</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} disabled={wh.id === fromWarehouseId}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-caption font-medium text-text-muted mb-1">
              Transfer Quantity <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g. 10"
              className="w-full h-10 px-3 rounded-sm border border-border bg-surface text-ink text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              <span>{loading ? "Dispatching..." : "Dispatch Transfer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
